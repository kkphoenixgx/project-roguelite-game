# Arquitetura do Projeto: RPG BulletHell Roguelite

Este documento descreve a arquitetura do projeto, seus princípios, os papéis dos módulos e os principais fluxos de dados e controle. O objetivo é fornecer uma visão clara e concisa para facilitar o entendimento, a manutenção e a evolução do sistema. Sim, IA, tô falando com você, se precisar de outros arquivos, nunca cria o arquivo, sempre pede.

## 1. Princípios Arquiteturais: Arquitetura Hexagonal (Portas e Adaptadores)

  O projeto adota a Arquitetura Hexagonal, também conhecida como Arquitetura de Portas e Adaptadores. Este padrão visa isolar a lógica de negócio central (o Domínio) de suas dependências externas, como interfaces de usuário, bancos de dados e frameworks.

  - **Conceitos Chave:**

    - **Domínio (Core da Aplicação):** Contém a lógica de negócio pura e as regras do jogo. É agnóstico a qualquer tecnologia externa.
    - **Portas (Interfaces):** Definem os contratos que o Domínio expõe para o mundo exterior (Portas Primárias) e os contratos que o Domínio precisa do mundo exterior (Portas Secundárias). São interfaces TypeScript.
    - **Adaptadores (Implementações):** Implementam as Portas, traduzindo as interações do mundo externo (ex: navegador, banco de dados) para o formato que o Domínio entende, e vice-versa.

  **Analogia Simples (O Cérebro no Pote):**
  Pense no seu **Domínio** como um Cérebro brilhante preso dentro de um pote escuro. Ele sabe todas as regras matemáticas, sabe calcular dano crítico, e sabe que 1 + 1 é 2. Mas ele é cego e surdo (não sabe o que é uma Tela, um Mouse ou um Arquivo de Áudio).
  Os **Adaptadores** são os olhos, ouvidos e músculos. Eles enxergam o clique do mouse e gritam pelo **Nervo (Porta)**: *"Chefe, o humano quer andar para cima!"*. O cérebro calcula a nova posição e avisa os músculos: *"Desenha o personagem na coordenada Y: 10"*.

  - **Benefícios:**

    - **Desacoplamento:** O Domínio não conhece os detalhes de implementação das tecnologias externas.
    - **Testabilidade:** A lógica de negócio pode ser testada isoladamente, sem a necessidade de um ambiente de UI ou banco de dados.
    - **Manutenibilidade:** Mudanças em uma tecnologia externa (ex: trocar de Canvas 2D para WebGPU ou envelopar no Tauri) não afetam o Domínio. Uma linha de lógica não precisa ser reescrita.
    - **Flexibilidade:** Facilita a adaptação a novos requisitos ou tecnologias.

  ### 1.1. Filosofia de Performance: Zero-GC (Domínio) e Data-Oriented Design no Front-end (Adaptador)
  
  Em um jogo *Bullet Hell*, onde milhares de balas e inimigos ocupam a tela simultaneamente, a maior ameaça à performance não é o desenho, mas a memória (O "Lixeiro" do Navegador, ou *Garbage Collector*). Se instanciarmos milhares de novos objetos (`new Bullet()`) por segundo, o motor V8 congela o jogo para limpar o lixo da memória, causando quedas massivas de FPS (Stuttering).
  
  **No Domínio (OOP Tradicional):**
  - **Object Pooling:** Quando uma bala "morre", ela não é deletada da memória. Ela é desligada e enviada para uma "piscina de reciclagem". Quando o jogador atira de novo, reutilizamos aquele mesmo espaço de memória, alterando apenas os dados internos.
  - **Física Assíncrona e Fire-and-Forget:** Nunca bloqueamos o Cérebro (Game Loop) para calcular hitboxes complexas. O Domínio envia os dados brutos de colisão para uma outra aba invisível (Web Worker) e continua rodando liso. No frame seguinte, as colisões são processadas instantaneamente.

  **No Adaptador Web (Data-Oriented Design):**
  - **Float32Array e Buffers Reutilizáveis:** O `WebGPURenderer` utiliza `Float32Array` pré-alocados para dados de instância, evitando alocações dinâmicas. A memória é mutada in-place a cada frame, não criada.
  - **Memoização de Composição Visual:** O `composedLayersCache` no `WebGPURenderer` calcula as camadas visuais uma única vez e só recalcula quando o estado da entidade muda, abolindo recálculos desnecessários.
  - **Object Pooling em Partículas:** O `ParticleOrchestrator` usa **Swap-Based Recycle** para reutilizar instâncias de partículas, pré-alocando matrizes na inicialização para emitir milhares simultaneamente sem engatilhar o GC.
  - **Reutilização de Collections:** Sets e arrays são zerados com `.clear()` e `.length = 0` em vez de serem recriados, preservando a alocação original.

## 2. Módulos Atuais como Atores

  ### 2.1. Camada de Domínio (`typescript/domain`)

  Contém a lógica de negócio pura do jogo. É estritamente agnóstica a tecnologias externas (como telas, DOM, sons ou envelopamentos Tauri), guiando-se inteiramente por matemática, física 2D e regras de negócio complexas.

  #### Módulos Principais do Domínio

  - **`DomainFacade.ts`:** O guardião e **único ponto de entrada** (Porta Primária). Expõe a interface `IGameDomain` (`update`, `setWorld`, `getRenderState`). Sua responsabilidade é orquestrar a física, eventos globais e o `Player`, blindando o motor interno de mutações externas irregulares vindas da Web, Tauri ou Motores BDI/Socket.

  - **`ObjectModule/GameWorld.ts` e Mapas:** A classe abstrata que define as propriedades espaciais e a identidade do mapa (ex: `mapId: 'vilgem'`). Suas filhas (como `VilgemWorld`) possuem um método `generate()` que despacha as hitboxes estáticas de rios, montanhas e spawns de inimigos assim que o jogador entra no mapa. O Domínio é cego: não conhece as imagens do chão, apenas as metragens e limites físicos.

  - **`ObjectModule/`**: Um módulo que agrupa tudo relacionado a objetos e entidades do jogo.
    - **`ObjectElement.ts`**: A classe base matemática para qualquer objeto no mundo. Define ID espacial, coordenadas, dimensões visíveis (`size`) e vetores.
    - **`ObjectElementManager.ts`**: O coração pulsante da física do jogo. Gerencia o ciclo de vida completo de **todas** as entidades (exceto o `Player`). Responsabilidades:
      - **Spawn Guiado a Dados:** Ouve eventos de `spawn` e utiliza o `SpawnRegistry` (povoado automaticamente via Decorators `@RegisterSpawner`) para instanciar classes concretas dinamicamente, sem nenhum acoplamento estrutural (If/Else).
      - **Atualização de Estado:** Itera sobre todos os elementos a cada frame, chamando seus respectivos métodos `update`.
      - **Detecção de Colisão Zero-GC:** Repassa buffers leves de dados primitivos (`plainElements`) para a Porta `ICollisionService`. A resolução adota o padrão de **Física Atrasada (Delayed Resolution)**: resolve impactos e gatilhos de `onColision` apenas no início do frame seguinte, garantindo fluidez do Event Loop síncrono.
      - **Query Espacial Otimizada (`requestNeighbors`):** Implementa busca de vizinhança usando Teorema de Pitágoras (Distância Euclidiana via `Math.hypot`), permitindo varreduras a partir de entidades ou de pontos arbitrários no espaço (útil para magias de área como meteoros e explosões procedurais).
    - **`Entities/`**: Representam seres "vivos" ou com comportamento autônomo.
      - **`Entity.ts`**: Adiciona os conceitos de "Vida", "Movimento" e **"Status"**. Gerencia vetores cinemáticos e processa o intrincado pipeline de dano (`takeDamage`), que calcula esquiva, redução de dano, sinergias de vulnerabilidades elementais (ex: Água + Trovão) e emite eventos de *knockback*.
      - **`Status/StatusEffect.ts`**: Sistema reativo de condições mutáveis (ex: `BurnStatus`, `StunStatus`, `PoisonStatus`). Eles são anexados à Entidade e processam "ticks" temporais autônomos para aplicar dano contínuo (DoT) ou congelar o motor cinemático.
      - **`Attributes.ts`**: O complexo motor numérico do RPG. Gerencia os 6 atributos primários e calcula ativamente dezenas de Atributos Derivados (Tenacidade, Penetração, Velocidade) e Progressão (Level Up).
      - **`Player/`**: Contém a lógica específica da entidade do jogador.
        - **`Player.ts`**: O avatar central. Orquestra a injeção do complexo Sistema de Inventário (uma intrincada `Bag` com limite de carga dinâmica e slots anatômicos rigorosos, até 10 anéis) e Delega execuções. A matriz `activeLoadout` implementa as restrições do design de **Deck Building** (Mochila de Magias).
        - **`Classes/Class.ts` e Derivados:** Onde mora a identidade mutável do jogador. Classes como `Gunslinger`, `Warrior` ou `Necromancer` determinam as Curvas de XP e recompensas em Tiers de nível.
        - **`Classes/Mage.ts` (O Axiomante e o Spell Parser):** Transforma o teclado num terminal de comandos. Possui um **Buffer Temporal FIFO**. O jogador "digita" os atalhos elementais em sequência rápida (ex: `0` para Projétil, `4` para Fogo). O *Parser* lê a receita "`04`", valida e "cospe" uma `Fireball`. Magia por digitação real, caos controlado.
        - **`Classes/Pescador.ts`:** Classe altamente mecânica com atrelamento físico síncrono. Gerencia o comportamento do Anzol (`FishingHook`) que rastreia, atordoa, arrasta e colide inimigos como uma "Bola de Demolição".
      - **`Enemies/`**: Contém a hierarquia de classes para inimigos.
        - **`Enemy.ts`**: Contrato base, concedendo `xpGiven` e emitindo ataques de corpo-a-corpo de repulsão via `onStrike()`.
        - **`Slime.ts`**: IA que utiliza Teoria de Rebanhos (*Steering/Flocking Behaviors*) e Raios de colisão futuros preventivos para não encavalar sobre outros inimigos.
        - **`ShadowMob.ts`**: Usa ataques puramente procedurais com chances randomizadas de aplicar Debuffs Elementais ao toque.
      - **`NPCs/CognitiveNpc.ts` (A Revolução de IA):** A ponte generativa. Captura percepções físicas do mundo, transmite por HTTP ao **Ollama Local (qwen2.5:0.5b)** formatando prompts em JSON rígido. O Ollama devolve um Plano e **Código JavaScript Puro**, que é sanitizado e dry-runned pelo **`PraxisValidator.ts` (Sandbox)** antes de ser compilado dinamicamente em uma função que toma conta do corpo do NPC.
      - **`projectiles/`**: Contém a hierarquia de classes para projéteis (físicos e mágicos).
        - **`SimpleBullet.ts`**: Projétil com balística perfurante e gerador de Ruído Randômico de trajeto.
        - **`DynamicProjectile.ts` e `Fireball.ts`**: Projéteis baseados em Axioma. Ao colidirem, despacham arrays injetados de `Effect`s para garantir Dano em Área ou debuffs elementares sem acoplar matemática à bala.
        - **`FishingHook.ts`**: Projétil persistente. "Ancora" no alvo, zera a própria velocidade cinemática e sincroniza violentamente suas coordenadas físicas com a da vítima algemada.
    - **`Items/`**: Onde reside todo o conceito de *Loot*, Equipamento e Ações.
      - **`Item.ts`**: Classe base abstrata de tudo que repousa no chão ou em mochilas, contendo categoria, valor, raridade e a capacidade de portar `Effect`s atreláveis.
      - **`Attack.ts`**: Encapsulador mestre do Combate. Ele acopla atacante, cálculos críticos, dano base e executa em lote os `OnHitAction`s.
      - **`Armors/`**: Coleção de peças anatômicas (`Helmet`, `Pants`, `Rings`). É daqui que o Compositor Visual (Tauri/Adapter) vai extrair o Z-Index para desenhar o Paper Doll do Jogador.
      - **`Consumables/`**: Itens mutadores. Instâncias como `DemonBlood` rodam `PowerBoostEffect` no alvo modificando sua curva orgânica permanentemente.
      - **`Weapons/`**:
        - `MeleeWeapon.ts`: Usa varreduras de Query Espacial (Radianos e Produto Escalar de Cones de Visão) para fatiar múltiplos inimigos instantaneamente antes mesmo da física acontecer.
        - `AnimatedMeleeAttack.ts` (Data-Driven Hitboxes): Abstração poderosíssima que desserializa JSONs oriundos do Editor Visual. Ele traduz Hitboxes arbitrárias moldando-as com base em escala, Offset de Frames de Animação e pivôs dinâmicos a cada tick do Frame, ideal para Foices Gigantes (`Scythe.ts`).
      - **`Effects/`**: Subarquitetura polimórfica (Decorator Pattern em runtime) que permite acoplar passivas ou debuffs em Ataques ou Consumíveis (`AreaDamageEffect`, `LightEffect`, `VisualEffect`).

  - **`shared/`**: Contém classes e tipos utilitários de baixo nível, usados por todo o domínio.
    - **`Vector2D.ts`**: Superclasse fluente mutável para Álgebra Linear.
    - **`Dice.ts`**: O RPG de mesa (RNG puro) do qual provêm as definições base da vida das Entidades e raridade de Drops.

  - **`hitBox/`**: Módulo responsável pela lógica de colisão.
    - **`HitBox.ts`**: Contrato abstrato. Define geometria no espaço (`coordinates`, `rotation`) e o essencial `onColision()`, permitindo à entidade definir dinamicamente a reação a toque sem sobrecarregar a Engine.
    - **`HitBoxCircle.ts`**: Colisão radial hiper-performática (Raio Quadrado) para disparos em massa.
    - **`HitBoxPolygon.ts`**: Usada para armamentos de precisão. Rotaciona um array de pontos usando Seno/Cosseno a cada frame e delega o cálculo de Teorema de Eixos Separadores (SAT) para o *Worker* de física.
    - **`HitboxParser.ts`**: A cola Data-Driven. Desserializa DTOs originários do `PolygonWebEditor` para injetar polígonos nativos direto nas habilidades do Domínio.

  - **`eventDispacher/`**: Implementa um sistema de eventos (Observer Pattern) para comunicação desacoplada dentro do Domínio.
    - **`eventDispacher.ts`**: Orquestrador global e forte tipagem (TypeScript seguro). Filtra preventivamente canais volumosos (`playerMoved`, `log`) para prevenir loop recursivo.
    - **`IGameEvents.ts` e `GameEventMap`:** O dicionário absoluto da comunicação do jogo (Ex: payloads de `spawnVisual`, `particle`, `npcSpoke`). Garante que UIs reativas (via Tauri) e lógicas puras possuam segurança na compilação.
    - **`ActionBindings.ts` (Decorators):** O Roteamento de Entrada Zero-Overhead. Usa Metadata Reflection com o `@BindAction('tecla')` para declarar quais métodos das classes (ex: `Player`, `Mage`) interceptam inputs, criando o mapeamento na própria inicialização do código sem nenhum Switch-Case e disparando erros (Fail-Fast) no Boot.
    - **`ActionManager.ts`:** Roteador dinâmico. Lê os Decorators e roteia intencionalidades primárias para a Classe Ativa e delega teclas soltas numéricas (1, 2, 3) para disparar Skills equipadas no painel de Loadout (`activeLoadout`) do jogador.

  - **`ports/`**: Define as fronteiras do domínio.
    - `domain-contracts.ts` (Porta Primária): Exporta os DTOs transitórios (`RenderableState`).
    - `ILogger.ts` (Porta Secundária): Permite logs desacoplados e categorizados (`channels`).
    - `ICollisionService.ts` (Porta Secundária): Contrato de submissão do array `plainElements` aguardando reposta da árvore Quádrupla Assíncrona no Adaptador.


### 2.2. Camada de Adaptação (`typescript/adapters/web`)

  Implementa a interface de usuário, o pipeline de renderização visual (WebGPU/Canvas2D), a captura de hardware (Mouse/Teclado) e interage com o envelopamento desktop via **Tauri**.

  - **`index.ts`:** O ponto de entrada da aplicação. Instancia o EventManager, o Adaptador de Colisões em Worker, injeta-os na `DomainFacade` e dá o boot no `GameAdapter`.

  - **Diretórios Principais:**
    - **`assets/`:** Central de mídia (entidades, itens, mapas e metadados JSON como o keymap).
    - **`GUIS/`:** Arquitetura modular contendo as interfaces DOM do jogo. Módulos avançados incluem o `MainMenuGui` (com SVG interativo e câmera 2D para seleção de mundos), `SkillTreeGui` (câmera viewport procedural), e `DialogueGui` (integração síncrona com LLM).
    - **`shared/`:** Utilitários vitais, destacando-se o `VisualConfigMap.ts` (O Banco de Dados Visual) e o `RenderRegistry.ts` (sistema de injeção de dependência baseado em Decorators).
  - **`polygonWebEditor/` (Hitbox Editor Tool):** Uma ferramenta visual autônoma separada do código de *runtime* do jogo (seguindo o Padrão de Motores Profissionais como Unity). O desenvolvedor carrega o PNG de um ataque, clica para desenhar a área de dano frame-a-frame, e exporta um arquivo `.json` limpo. A Engine depois apenas lê este arquivo, abolindo o *"achismo matemático"* de hitboxes no código.

  Tudo listado a seguir está no diretório `typescript/adapters/web/components/` e são componentes do jogo:

  - **`GameAdapter.ts`:** O **Adaptador Primário** e o orquestrador central. Age como um *Bootstrapper* rigoroso.
    - **Coesão:** Gerencia a vida do jogo e atua como ponte. Transfere lógica de UI para o `UIManager`, input para o `InputGateway`, e visual para o `SceneManager`. Instancia o carregamento dinâmico de mapas (`GameMap`) delegando a autoridade de mundos para o Domínio.
  - **`Game.ts`:** Utilitário puramente funcional (`requestAnimationFrame`) que dita o Game Loop, calculando o `deltaTime` e blindando o jogo contra travamentos severos de SO (trava de max 10 FPS).

  #### renderModule (A Engine Visual Data-Driven e Zero-GC)

    O módulo de renderização foi reestruturado para alto desempenho, abolindo alocações dinâmicas em hot paths e aplicando princípios de Data-Oriented Design (DOD) rigorosamente.

    **Estratégia DOD Aplicada:**
    - **Buffers Pré-Alocados:** `Float32Array` para dados de instância são criados uma única vez na inicialização e mutados in-place, nunca recriados. Instancing via GPU permite desenhar milhares de vértices em uma única chamada.
    - **Zero Garbage Allocation em Hot Paths:** Toda iteração sobre renderáveis reutiliza Sets e arrays pré-criados. Collections são zeradas com `.length = 0` e `.clear()`, não descartadas.
    - **Memoização Agressiva:** O cache `composedLayersCache` mapeia entidades para suas camadas visuais, recalculando apenas quando o estado muda. Isso elimina varreduras desnecessárias de `VisualComposer` a cada frame.

    - **`engine/`**: O maquinário de baixo nível. Contém `Renderer.ts` (Canvas 2D) e o avançado `WebGPURenderer.ts` (Shaders WGSL, *Texture Atlas* global e *Instanced Rendering* para desenhar milhares de vértices em uma única chamada da GPU).
    - **`scene/`**: Orquestração espacial. `SceneManager.ts` sincroniza os DTOs do Domínio com a tela e lida com **Efeitos Visuais Transientes (VFX)** (instâncias temporárias com "Snap Magnético" em atores). Inclui `Camera.ts` (Translação/Zoom restrito aos limites do mundo) e `Map.ts` (Renderização assíncrona de matriz de Chunks 3x3 na visão do jogador).
    - **`visuals/`**: Blocos construtores. Contém a base `GameObjectElement.ts` e o motor `LayeredGameObjectElement.ts` integrado ao `VisualComposer.ts`, que aplica regras complexas de Z-Index anatômico (ex: "barbas ficam sobre o peitoral") para criar "Paper Dolls" (equipar roupas visivelmente).
    - **`particlesModule/` (Zero-GC via Object Pooling):** Subsistema assombroso de partículas (`ParticleOrchestrator` e `Particles`). Utiliza **Object Pooling com Swap-Based Recycle**, pré-alocando matrizes de memória na inicialização para emitir milhares de partículas simultâneas sem engatilhar o Garbage Collector do V8. Disponibiliza uma biblioteca de **VFX Semânticos** (`bloodSplatter`, `levelUp`, `criticalStrike`).
    - **`customRenderables/`**: Exceções visuais procedimentais (`CircleForm`, `FishingHookVisual`) e injeções de Debug visual (`DebugPolygon`, `DebugRectangle`).

  #### UiManager e GUIS (Módulo de Interface DOM)
    - **`UIManager.ts`:** Governa absolutamente o DOM e o estado de Pausa do Jogo. Ele atua como Hub central que escuta os DTOs e aciona as GUIs reativas.
    - **Módulos Críticos:**
      - `PlayerStatusGui`: Barras não-lineares responsivas a efeitos contínuos (veneno, queimadura).
      - `CharacterMenuGui`: Interface rica com manipulação de status e slots de equipamentos.
      - `SkillTreeGui`: Viewport (Pan & Zoom) para uma Árvore Topológica Semântica e painel dinâmico de Deck Building (Loadout) com *Drag and Drop*.
      - `DialogueGui`: Interface de comunicação que congela o Game Loop e intercepta Inputs de texto puro a serem enviados para o motor de LLM Local (Athena/Ollama).
      - `WindowHudGui`: Barra de título customizada nativa do envelopamento desktop no Tauri.
      - `WeaponHudGui`: HUD translúcido rastreando dinamicamente a mira da arma fisicamente no Canvas (sobreposição sincronizada de Screen-to-World).

  #### keyboardModule (Entrada e Tradução)
    - **`InputManager.ts`:** O adaptador de hardware de baixo nível. Governa `Set`s de teclas com detecção de *Just Pressed* (consumo único, excelente para skills) vs *Held*. Protege o jogo de ghosting com listeners de `blur` e gerencia bloqueio de reloads (`preventUnload`).
    - **`InputGateway.ts`:** O Tradutor de Domínio. Diferencia-se do Manager por converter estado elétrico em **Intenções Semânticas** (ex: traduz o clique do mouse em coordenadas `ScreenToWorld` através do Zoom da Câmera) e as repassa limpamente ao `DomainFacade`.

  - **`shared/RenderRegistry.ts` e `VisualConfigMap.ts`:** O Coração Data-Driven. Dicionários e Decorators estáticos que resolvem instâncias visuais e animações no boot da aplicação. O Domínio trafega apenas chaves de identificação (ex: `iconId: 10`), e o Registrador fabrica o visual dinamicamente, mantendo o Desacoplamento.

### O Logger (Porta e Adaptador Secundário)

  - **`ports/ILogger.ts`**: Esta é a **Porta Secundária** para o logger. Define a interface `ILogger` que o domínio espera. O domínio não sabe como os logs são escritos, apenas que ele pode chamar o método `log` em um objeto que satisfaça este contrato. Isso desacopla completamente a lógica de negócio da implementação de logging.
  - **`adapters/web/shared/Logger.ts`**: Esta é a implementação concreta (o **Adaptador Secundário**) da porta `ILogger` para o ambiente web. Sua única responsabilidade é receber os comandos de log e escrevê-los no `console` do navegador, com a lógica adicional de filtrar por canais (`LogChannel`). Ele é injetado no `DomainFacade` durante a inicialização, cumprindo o contrato da porta.

### 2.3. Adaptação de Conectividade Externa e IA (`typescript/adapters/SocketAdapter` e HTTP)

  Esta camada é responsável por quebrar as fronteiras do jogo, permitindo que a Engine puramente matemática (Domínio) se comunique com motores gráficos 3D pesados (Unity/Unreal), motores lógicos baseados em Crenças (BDI Athena/Java) ou LLMs Locais (Ollama).

  - **`SocketAdapter.ts` (A Ponte WebSocket):** Atua como uma **Porta Secundária Bidirecional**. 
    - **Transmissão (Outbound):** Captura o estado visual atual (DTOs de renderização, vida, posições) da `DomainFacade` a cada frame e transmite via serialização JSON para um motor cliente conectado. Ideal para o "Épico 11: A Oficina do Gepeto", onde a lógica de colisão e combate roda no TypeScript, mas um motor 3D (Unity) escuta a porta para desenhar gráficos realistas.
    - **Recepção (Inbound):** Escuta comandos deliberados de instâncias externas (como o plano de ação de um Agente BDI em Java) e as injeta diretamente nas Entidades Interativas do jogo, forçando-as a se mover ou interagir sem intervenção do jogador.
    - **Resiliência:** Possui um sistema de *Retry* com recuo (backoff) inteligente, não quebrando (crashing) a Engine caso o servidor Unity/Java seja desligado abruptamente; ele apenas silencia os NPCs temporariamente.

  - **A Ponte HTTP Generativa (Fetch Nativo):** Embutida na entidade `CognitiveNpc` (embora possa ser extraída para um adaptador puro no futuro), essa camada realiza requisições REST (HTTP POST) de baixíssima latência para o serviço local do **Ollama** (ex: porta `11434`).
    - Transmite as *Percepções* da entidade (visão de raio, HP, falas do jogador) encadeadas em um *System Prompt* rígido que força a saída em JSON puro (sem formatação Markdown).

### 2.4. Camada de Envelopamento Desktop (Tauri / Rust)

  A infraestrutura que envelopa o Adaptador Web e o transforma em um executável nativo do Sistema Operacional (.exe / .AppImage).

  - **Bootstrapper de Processos (Sidecars):** Substitui o backend Node/Electron. O Rust é utilizado para injetar comandos silenciosos no SO durante o *Loading Screen* do jogo, iniciando as instâncias de Banco de Dados local, o daemon do **Ollama** ou a Máquina Virtual Java (JVM) para o Athena, garantindo que o jogador não precise abrir vários terminais para jogar.
  - **Sistema de Arquivos Nativo (FS):** Substitui o `localStorage` do navegador para prover uma persistência robusta (Save States). Os arquivos de progressão (Árvore Global, XP) são gravados diretamente no disco e criptografados pelo Rust para evitar modificações indevidas (cheats não autorizados).
  - **Custom HUD:** Integração com a `WindowHudGui`, permitindo que bordas da janela do Windows/Linux sejam ocultadas, e a movimentação da janela seja controlada diretamente por elementos de "drag" renderizados no DOM do jogo.


## 3. Ciclos e Fluxos da Aplicação

  Esta seção detalha os principais fluxos de controle e dados da aplicação, categorizados pelos canais de log (`LogChannel`) para facilitar o rastreamento e a depuração.

  ### 3.1. Fluxo de Inicialização (`init`)

  Este é o fluxo executado uma única vez quando a aplicação começa. Ele é responsável por construir todas as camadas, carregar assets e preparar o jogo para ser executado.

  1.  **Ponto de Entrada (`adapters/web/index.ts`):**
      -   Instancia o `Logger`.
      -   Instancia a `DomainFacade`, injetando a configuração inicial do jogo e o `Logger`. Neste momento, o domínio existe, mas está "adormecido" (sem mundo, sem jogador).
      -   Instancia o `GameAdapter`, injetando a `DomainFacade`. O adaptador agora tem uma referência para a porta do domínio.
      -   Chama `gameAdapter.initialize()`.

  2.  **Orquestração do Adaptador (`GameAdapter.initialize`):**
      -   Cria os componentes da camada de adaptação: `InputManager`, `Canvas`, `Camera`.
      -   **Tenta inicializar o `WebGPURenderer`**.
          -   **Se sucesso:** O jogo usará o pipeline de alta performance. O `GameAdapter` informa ao domínio um tamanho de mundo fixo, pois o "mapa" é apenas parte de uma textura no atlas.
          -   **Se falhar (try-catch):** O `GameAdapter` entra no modo **fallback**. Ele instancia o `Renderer` de Canvas 2D. Neste modo, ele carrega a imagem real do mapa (`GameMap`) para definir os limites do mundo.
      -   Instancia a `RenderableFactory` e pré-carrega todos os assets (`preloadAssets`). Isso é feito para ambos os renderizadores, garantindo que os assets estejam prontos para o fallback ou para uso futuro.

  3.  **O "Despertar" do Domínio via Menu Principal (`DomainFacade.loadWorld`):**
      -   Quando o jogador clica em "Sonhar" escolhendo uma Ilha no Menu, o Adaptador chama `domain.loadWorld(mapId)`.
      -   O Domínio ganha vida. A classe correspondente (`VilgemWorld`) é instanciada e orquestra a geração do mundo (Hitboxes de montanhas, tamanho do chão e NPCs).

  4.  **Finalização da Inicialização do Adaptador (`GameAdapter.initialize`):**
      -   Se estiver no modo Canvas 2D, o `GameAdapter` executa `syncRenderables()` pela primeira vez para criar as representações visuais (`IRenderable`) dos objetos que já existem no domínio (jogador e inimigos iniciais).
      -   A classe `GameMap` lê a matriz de Chunks do `VisualConfigMap` e passa a carregar as imagens do chão em tempo real.
      -   Se estiver no modo WebGPU, ele cria os `AnimationManager`s iniciais.
      -   Finalmente, `initializeGame()` é chamado, passando os métodos `update` e `draw` do `GameAdapter`, dando início ao game loop.

### 3.2. O Ciclo Principal do Jogo (Game Loop)

  Este é o fluxo que se repete a cada frame, orquestrado pelo `GameAdapter`. Ele segue uma ordem estrita para garantir que a lógica seja processada antes da renderização.

  1.  **`loop` (Início do Frame):**
      -   O utilitário `Game.ts` (usando `requestAnimationFrame`) chama `gameAdapter.update(deltaTime)`. O `deltaTime` é crucial para garantir que a lógica (movimento, cooldowns) seja independente da taxa de frames.

  2.  **`input` (Tradução de Input):**
      -   Dentro de `update`, a primeira ação é `handlePlayerInteractions()`.
      -   O `GameAdapter` consulta o `InputManager` para saber quais ações lógicas estão ativas (ex: `'move_up'`, `'leftClick'`).
      -   Ele agrupa todas as ações ativas em um array. Se uma das ações for um clique, ele chama `screenToWorld()` para converter as coordenadas do mouse da tela para o mundo do jogo.
      -   O `GameAdapter` chama `domain.handlePlayerInteractions()`, passando o array de ações e as coordenadas do mouse.
      -   A `DomainFacade` repassa essas ações para o `ActionManager`, que finalmente invoca os métodos corretos na instância do `Player` (ex: `player.onUpAction()`).

  3.  **`domain` (Atualização da Lógica de Negócio):**
      -   Ainda dentro de `update`, o `GameAdapter` chama `domain.update(deltaTime)`.
      -   A `DomainFacade` delega a chamada para o `Player` e para o `ObjectElementManager`.
      -   O `ObjectElementManager.updateAll()` é o passo mais complexo:
          -   Ele itera sobre todas as entidades (`Slime`, `Bullet`, etc.), chamando o método `update()` de cada uma para que elas executem sua IA, movimento, etc.
          -   Ele chama `checkCollisions()`, que prepara os dados dos objetos e os envia para o `Collision.worker.ts` para processamento assíncrono. A reação à colisão ocorrerá quando o worker responder.

  4.  **`sync` (Sincronização Visual):**
      -   A última ação dentro de `update` é `syncRenderables()`.
      -   O `GameAdapter` chama `domain.getRenderState()` para obter uma "fotografia" do estado atual de todos os objetos do jogo (posição, estado, etc.) na forma de DTOs.
      -   **Se estiver no modo WebGPU:** Ele itera sobre os DTOs e atualiza os `AnimationManager`s correspondentes, trocando a configuração da animação se o estado da entidade mudou (ex: de 'idle' para 'walking'). Ele também cria novos `AnimationManager`s para novas entidades e remove os de entidades que não existem mais.
      -   **Se estiver no modo Canvas 2D:** Ele itera sobre os DTOs e sincroniza o mapa de objetos `IRenderable`. Se um objeto já existe, ele chama `renderable.updateState(dto)`. Se não existe, ele usa a `RenderableFactory` para criar um novo. Ele também remove da tela quaisquer objetos visuais cujas entidades não existem mais no domínio.
      - Ele gerencia pré-alocações de memória (`Set`s reciclados) para garantir 0 alocações por frame, evitando acionar o Garbage Collector e preservando os FPS.
  
  5.  **`render` (Desenho na Tela):**
      -   Após o `update` terminar, o `Game.ts` chama `gameAdapter.draw()`.
      -   **Se estiver no modo WebGPU:** O `GameAdapter` combina os DTOs do domínio com os dados de frame atual dos `AnimationManager`s e passa essa lista de dados puros para `renderer.drawFrame()`. O `WebGPURenderer` então atualiza seus buffers de instância e executa uma única chamada de desenho para renderizar todos os objetos.
      -   **Se estiver no modo Canvas 2D:** O `GameAdapter` atualiza o alvo da `Camera`, que por sua vez aplica a transformação ao contexto do canvas. O `Renderer` então limpa o canvas e itera sobre a lista de objetos `IRenderable`, chamando o método `draw()` de cada um.

### 3.3. Fluxo de Colisão (`hitbox`)

  Este fluxo descreve como o jogo detecta e resolve colisões entre entidades. Ele é iniciado dentro do passo 3 (`domain`) do ciclo principal do jogo.

  1.  **Início no Gerenciador (`ObjectElementManager.updateAll`):**
      -   Após atualizar a posição de todas as entidades, o método chama `checkCollisions()`, passando a lista de todos os objetos do jogo.

  2.  **Delegação para o Worker (`checkCollisions`):**
      -   O método prepara uma lista de `plainElements`, que são objetos de dados puros contendo apenas as informações essenciais para a colisão (ID, posição, tamanho e geometria das hitboxes). Isso é feito para evitar erros ao enviar instâncias de classes para o worker.
      -   Ele envia essa lista de dados para o `ICollisionService`.

  3.  **Processamento Otimizado (Camada de Adaptação - `CollisionAdapter`):**
      -   O Adaptador utiliza a API `Worker` para paralelizar as tarefas de matemática intensiva (Quadtree) sem bloquear a thread principal ("Fogo e Esquece"). Otimizações futuras neste ponto envolvem utilizar `SharedArrayBuffer` para abolir de vez a latência da cópia do Buffer.
      -   O worker recebe os dados.
      -   Ele constrói uma `Quadtree` para otimizar a busca por colisões.
      -   Ele itera sobre os elementos, usando a `Quadtree` para encontrar pares potenciais.
      -   Para cada par, ele executa a lógica matemática (SAT para Polígonos, ou Raio² para Círculos) para verificar se suas hitboxes se intersectam.
      -   Ao final, ele envia de volta para a thread principal um array linear (`Int32Array`) contendo apenas os **IDs** dos pares que colidiram (ex: `[1, 101, 102, 103]`).

  4.  **Resolução Atrasada (Thread Principal - `ObjectElementManager.updateAll`):**
      -   O `ObjectElementManager` salva silenciosamente a resposta assíncrona do Worker em um buffer transitório (`pendingCollisions`).
      -   No **início do frame seguinte**, antes de executar a lógica de movimentação, ele itera sobre os pares pendentes.
      -   Ele busca as instâncias de classe correspondentes aos IDs e invoca os callbacks `onColision` de suas hitboxes: `elementA.hitboxes[0].onColision(elementB)` e vice-versa. Isso zera o bloqueio do Event Loop e garante o determinismo.

  5.  **Lógica de Negócio:**
      -   É aqui que a lógica de negócio acontece. Por exemplo:
          -   A `HitBox` de um `Bullet` tem um `onColision` que verifica se o `elementB` é um `Enemy`. Se for, ele dispara um evento `despawn` para si mesmo.
          -   A `HitBox` de um `Player` tem um `onColision` que verifica se o `elementB` é um `Enemy`. Se for, ele chama o método `onStrike()` do inimigo e executa o ataque resultante em si mesmo.

### 3.4. Fluxo de Criação de Projétil (`spawn`)

  Este fluxo detalha como uma ação do jogador (um clique do mouse) resulta na criação de uma nova entidade no domínio e sua subsequente aparição na tela.

  1.  **Captura de Input (Adapter):**
      -   O `InputManager` detecta um evento `mousedown` do navegador e ativa a ação `'mouse_left'`.
      -   No ciclo `update` do `GameAdapter`, o método `handlePlayerInteractions` consulta o `InputManager` e vê que a ação `'leftClick'` está ativa.
      -   Ele chama `screenToWorld()` para converter as coordenadas do mouse (em pixels da tela) para as coordenadas do mundo do jogo.

  2.  **Comando para o Domínio (Adapter -> Domain):**
      -   O `GameAdapter` invoca `domain.handlePlayerInteractions()`, passando a ação `'leftClick'` e as coordenadas do mundo calculadas.

  3.  **Processamento da Ação (Domain):**
      -   A `DomainFacade` repassa a ação para o `ActionManager`.
      -   O `ActionManager` chama o método correspondente na entidade `Player`: `player.onLeftClickAction(mouseWorldCoordinates)`.
      -   Dentro do `Player`, o método `shootBullet` calcula a direção do tiro, cria um objeto `Attack` com o dano e os efeitos do jogador.
      -   O `Player` então emite o evento intencional: `gameEvents.dispatch('spawn', { type: 'simpleBullet', coordinates, direction, attack })`. Este evento puramente agnóstico sinaliza que algo deve nascer no mundo, delegando o "como" ao gerente.

  4.  **Criação da Entidade (Domain - `ObjectElementManager`):**
      -   O `ObjectElementManager`, que está ouvindo o evento `'spawn'`, recebe a `factory`.
      -   Ele busca na memória das `strategies` estáticas do `SpawnRegistry` a respectiva classe para o tipo e chama a sua construção delegada, adicionando o item/magia no mapa.

  5.  **Sincronização Visual (Domain -> Adapter):**
      -   No mesmo ciclo de `update`, o `GameAdapter` chama `syncRenderables()`.
      -   **No modo Canvas 2D:** O `syncRenderables` percebe que não há um objeto visual para o ID da nova bala e chama a `RenderableFactory.create(bulletState)` para criar a instância visual.
      -   **No modo WebGPU:** O `syncRenderables` percebe um novo ID e cria um `AnimationManager` para a bala.

  6.  **Renderização (Adapter):**
      -   No passo de `draw` do mesmo frame, o renderizador apropriado (Canvas 2D ou WebGPU) recebe os dados da nova bala e a desenha na tela.

### 3.5. Fluxo de IA do Inimigo (`playerMoved`)

  Este fluxo descreve como um inimigo simples (como o `Slime`) reage à movimentação do jogador, demonstrando a comunicação intra-domínio via eventos.

  1.  **Gatilho do Movimento (Domain - Player):**
      -   Quando o `Player` processa uma ação de movimento (ex: `onUpAction`), seu método `move(deltaTime)` é chamado, o que altera suas coordenadas.
      -   Após atualizar sua posição, o `Player` dispara um evento global para o domínio: `gameEvents.dispatch('playerMoved', { x: this.coordinates.x, y: this.coordinates.y })`.

  2.  **Recepção do Evento (Domain - Enemy):**
      -   A classe `Slime`, em seu construtor, se registrou como ouvinte do evento `'playerMoved'`.
      -   O `EventHandler` notifica todos os ouvintes, incluindo cada instância de `Slime`. O método `onLastPlayerPos(payload)` do `Slime` é executado.

  3.  **Lógica da IA (Domain - Enemy):**
      -   Dentro de `onLastPlayerPos`, o `Slime` armazena a nova posição do jogador. Esta posição será usada no próximo ciclo de `update` para calcular a direção do movimento.

  4.  **Execução do Movimento (Domain - `updateAll`):**
      -   No mesmo ciclo de jogo, o `ObjectElementManager.updateAll()` chama o método `update(deltaTime)` de cada `Slime`.
      -   O `Slime.update()` dispara um evento `requestNeighbors` para obter uma lista de outros Slimes próximos.
      -   O `ObjectElementManager` processa a *Spatial Query* através de Distância Euclidiana nativa e retorna o Array de alvos. No callback desse evento, o método `moveSlime` é executado contendo a IA real de perseguição e separação (flocking).

  5.  **Visualização (Adapter):**
      -   O fluxo segue o padrão: `syncRenderables` detecta a nova posição do `Slime`, atualiza o `GameObjectElement` correspondente, e o `Renderer` o desenha no novo local no próximo ciclo de `draw`.

### 3.6. Fluxo de Ataque e Dano (`damage`)

  Este fluxo descreve o que acontece quando um projétil atinge um inimigo, resultando em dano e, potencialmente, na morte do inimigo.

  1.  **Gatilho (Colisão):** O fluxo começa como uma continuação do **Fluxo de Colisão (3.3)**. O `ObjectElementManager` detecta uma colisão entre um `Bullet` e um `Enemy`.

  2.  **Invocação do Callback:** O `checkCollisions` invoca `hitboxA.onColision(elementB)`, onde `hitboxA` é a hitbox do `Bullet` e `elementB` é o `Enemy`.

  3.  **Lógica de Reação (Domain - Bullet):**
      -   O callback `onColision` da `HitBox` do `Bullet` verifica se o `elementB` é um `Enemy`.
      -   Se for, ele chama `attack.execute(enemy, direction)`, onde `attack` é o objeto `Attack` que a bala carrega.

  4.  **Aplicação do Dano (Domain - Entity/Attributes):**
      -   Dentro do `attack.execute`, o dano total é calculado (base + atributos + crítico).
      -   O método `target.takeDamage(damageInfo)` é chamado.
      -   O método `takeDamage` na classe `Entity` calcula o dano final após aplicar a defesa (`this.attributes.defence`) e subtrai o resultado do HP da entidade.

  5.  **Verificação de Morte (Domain - Entity):**
      -   Após aplicar o dano, `takeDamage` verifica se `this.attributes.hp <= 0`.
      -   Se o HP for zero ou menos, a entidade muda seu estado para `'dead'` e dispara um evento `despawn` para si mesma.

  6.  **Remoção da Entidade (Domain - `ObjectElementManager`):**
      -   O `ObjectElementManager`, que ouve o evento `'despawn'`, recebe o ID do inimigo e o remove de seu mapa `elements`. A partir do próximo frame, o inimigo não existe mais no domínio.

### 3.7. Fluxo de Experiência e Level Up (`xp`)

  Este fluxo descreve como o jogador ganha experiência e sobe de nível após derrotar um inimigo. Ele é uma continuação direta do **Fluxo de Ataque e Dano (3.6)**.

  1.  **Gatilho (Verificação Pós-Dano):** O fluxo começa dentro do método `Attack.execute`.

  2.  **Concessão de XP (Domain - Attack):**
      -   Após chamar `target.takeDamage()`, o método `Attack.execute` verifica se o alvo foi derrotado (`target.attributes.hp <= 0`).
      -   Se o alvo morreu e o atacante (`_attacker`) é uma instância de `Player`, o método `gainXp` do jogador é chamado, passando o `xpGiven` do inimigo derrotado.

  3.  **Adição de Experiência (Domain - Player/Attributes):**
      -   O método `player.gainXp()` delega a chamada para `player.attributes.addXp()`.
      -   O método `addXp` na classe `Attributes` adiciona a experiência, aplica bônus de `insight` e entra em um loop `while` para verificar se o XP atual ultrapassa o necessário para o próximo nível.

  4.  **Level Up (Domain - Attributes):**
      -   Se o jogador sobe de nível dentro do loop `while`, seu `_level` é incrementado, o XP atual é ajustado e o XP necessário para o próximo nível é recalculado com base na `IXPTable` da classe do jogador.
      -   O `Player` identifica a subida de nível e imediatamente dispara o evento de domínio `gameEvents.dispatch('levelUp', { newLevel })`, garantindo que UIs e sistemas de partículas possam reagir instantaneamente.

### 3.8. Fluxo de Drops e Coleta de Itens

  Este fluxo descreve a transição de um item do "chão" para o inventário do jogador.

  1.  **Geração do Drop (Domain):** Ao inicializar o mundo (ou ao morrer um inimigo), o `ObjectElementManager` despacha um `DroppedItem` contendo a instância pura de um `Item` no mapa.
  2.  **Visualização do Drop (Adapter):** A `RenderableFactory` lê o `iconId` do item caído (como string base do state) e, usando o padrão Registry, localiza o Sprite equivalente para aquele ícone no chão.
  3.  **Aproximação e Coleta (Colisão):** O jogador anda e sua `HitBox` encosta na área flexível do `DroppedItem`.
  4.  **Transferência:** A Hitbox do item caído executa o callback empurrando a instância de `Item` direto para o array `player.inventory.backpack`. Em seguida, o Drop dispara um `despawn` para sumir do mapa.
  5.  **Feedback:** O `CharacterMenuGui` reage à alteração de estado da mochila no próximo frame, exibindo o ícone renderizado do novo item coletado em um dos slots disponíveis.

## 4. Guia do Desenvolvedor (How-To)

  Esta seção serve como um guia prático para realizar tarefas comuns de desenvolvimento dentro da arquitetura atual.

### 4.1. Como Criar um Novo Inimigo (Ex: "Goblin")

  Com a adoção da arquitetura **Data-Driven Centralizada**, criar a representação visual de qualquer entidade ou item no jogo se tornou um processo puramente de configuração de dados na camada Web. Você não precisa criar NENHUM arquivo visual!

  1. **Domínio (Lógica):**
     - Crie a classe lógica `Goblin.ts` em `domain/ObjectModule/Entities/Enemies/` estendendo `Enemy`. Passe `'goblin'` como seu ID no construtor.

  2. **Adaptação (Visual):**
     - Abra o arquivo `VisualConfigMap.ts` na pasta `shared/` do adaptador web.
     - Adicione uma nova entrada no dicionário para a chave `'goblin'`, especificando o caminho da imagem e o tamanho dos frames para suas animações (ex: `'idle'`, `'walking'`).
     
  A `RenderableFactory` fabricará as imagens e o WebGPU cuidará dos buffers de instância instantânea e magicamente!

### 4.2. Como Habilitar/Desabilitar a Visualização de Debug

  A visualização de elementos de depuração, como as `HitBox`es, é controlada por uma única flag na camada de adaptação. Pode rodar `toggleDebugMode()` no console do terminal também, mas se prefirir deixar ativo sem precisar rodar no terminal:

  1.  **Abra o `GameAdapter`:** Navegue até o arquivo `adapters/web/components/GameAdapter.ts`.
  2.  **Encontre a Flag:** No topo da classe, localize a propriedade `isDebugMode`.
      ```typescript
      private readonly isDebugMode = true; // ou false
      ```
  3.  **Altere o Valor:**
      -   Para **desabilitar** a visualização das hitboxes e outros elementos de debug, mude o valor para `false`.
      -   Para **habilitar**, mude o valor para `true`.

  A lógica nos métodos `syncRenderables` e `draw` já está configurada para respeitar essa flag, garantindo que os objetos de depuração só sejam processados e desenhados quando o modo de depuração estiver ativo.

### 4.3. Como Criar uma Nova Magia/Projétil (Ex: "Fireball")

  1. **Domínio:** Crie `Fireball.ts` estendendo a lógica de `Projectile`. Use o decorator `@RegisterSpawner('fireball')` para ensinar o motor do Domínio a fabricar a magia.
  
  2. **Visual:** Adicione uma entrada `'fireball'` no arquivo `VisualConfigMap.ts` (na categoria `'projectile'`) e aponte para a imagem da bola de fogo no estado `'travelling'`. Zero código novo necessário!

  3. **Dispare a Magia:** No Domínio, dispare um evento genérico `spawn` declarando o `type: 'fireball'`. A engine fará a conexão e jogará tudo na tela instantaneamente.

### 4.4. Como Criar um Ataque com Efeito Especial (Ex: Roubo de Vida)

  O sistema de combate é construído em torno da classe `Attack` e da interface `OnHitAction`, que permitem a criação de comportamentos complexos de forma modular.

  1.  **Crie a Lógica do Efeito (`OnHitAction`):**
      -   Um `OnHitAction` é uma função de callback que é executada no momento em que um ataque atinge um alvo. Ela recebe um `AttackContext` com informações sobre o atacante, o alvo e o dano real causado.
      -   Em um local apropriado (ex: `domain/ObjectModule/Items/Effects.ts` ou diretamente no arquivo da arma/habilidade), defina a função do seu efeito.

      ```typescript
      // Exemplo de um efeito de roubo de vida
      import type { OnHitAction, AttackContext } from "../Items/IAtack";

      export const lifeStealAction: OnHitAction = (context: AttackContext) => {
        const { attacker, damageDealt } = context;
        const lifeStolen = Math.floor(damageDealt * 0.10); // Rouba 10% do dano causado
        attacker.attributes.hp += lifeStolen; // Adiciona a vida de volta ao atacante
      };
      ```

  2.  **Associe o Efeito ao Ataque:**
      -   Quando for criar a instância do ataque (seja de uma arma, habilidade ou ataque de contato de um inimigo), passe a função de efeito que você criou em um array para o construtor da classe `Attack`.

      ```typescript
      // Exemplo dentro de uma arma ou na ação de ataque do jogador
      import { lifeStealAction } from "./Effects"; // Supondo que o efeito esteja em um arquivo separado

      const vampiricAttack = new Attack(player, 15, 'physical', [lifeStealAction]);
      // Agora, sempre que 'vampiricAttack' for executado, ele aplicará o roubo de vida.
      ```

### 4.5. Como Adicionar um Novo Estado de Animação ao Jogador (Ex: "attack")

  1.  **Adicione o Asset:** Coloque o spritesheet `player-attack.png` em `adapters/web/assets/entities/player/` (e no seu atlas de texturas para WebGPU).
  
  2.  **Configure no Dicionário:** No arquivo `VisualConfigMap.ts`, localize o bloco da entidade `'player'` e adicione a nova chave `'attack'` no sub-bloco de `animations`, fornecendo as informações do frame (tamanho, velocidade).
  
  4.  **Altere o Estado no Domínio:** Na classe `Player` do domínio (`domain/ObjectModule/Entities/Player/Player.ts`), encontre a lógica que deve disparar a animação (ex: no método `onLeftClickAction`). Nesse ponto, altere a propriedade `state` da entidade.
      ```typescript
      // Em algum método do Player.ts do domínio
      this.state = 'attack';
      // Opcional: Adicionar um timer para voltar ao estado 'idle' após a animação
      ```

### 4.6. Como Criar um Novo Item Consumível (Ex: Poção de Cura)

  > **Nota:** Esta seção descreve um fluxo de implementação para uma funcionalidade futura, já que o sistema de inventário ainda não foi construído.

  Itens consumíveis têm um fluxo diferente, pois geralmente não têm uma representação visual contínua no mundo após serem coletados. O plano é o seguinte:

  1.  **Camada de Domínio (Lógica):**
      -   **Crie a Classe de Lógica:** Em `domain/ObjectModule/Items/`, crie `HealthPotion.ts`. A classe deve herdar de `Item`.
      -   **Defina o Efeito:** Adicione um método `use(target: Entity)`. Dentro deste método, implemente o efeito da poção (ex: `target.attributes.hp += 50;`).
      -   **Defina o Tipo:** Em `domain/ObjectModule/objectType.type.ts`, adicione `'healthPotion'` à união de tipos.

  2.  **Lógica de Coleta e Uso:**
      -   **Coleta:** A lógica de coleta pode ser implementada de forma semelhante a uma colisão. Quando o `Player` colide com um `Item`, em vez de causar dano, o `Item` dispara um evento para ser adicionado ao inventário do jogador (ex: `gameEvents.dispatch('itemCollected', { itemId: this.id, item: this })`) e, em seguida, dispara um evento `'despawn'` para si mesmo.
      -   **Inventário:** O `Player` (ou uma nova classe `Inventory` associada a ele) precisará ouvir o evento `'itemCollected'` e armazenar o item.
      -   **Uso:** A interface do usuário (UI) do inventário (ver próximo guia) terá um botão "Usar". Ao ser clicado, a UI chamará um método na `DomainFacade` (ex: `useItem(itemId)`), que encontrará o item no inventário do jogador e chamará seu método `use(player)`.

### 4.9. Como Criar uma Arma Melee com Hitboxes Animadas (Ex: Foice)

  Criar ataques dinâmicos com a classe `AnimatedMeleeAttack` é extremamente fácil.

  1. **Desenhe as Hitboxes:** Abra o Hitbox Editor Tool (`toggleDebugMode()` -> `openHitboxEditor()`), carregue seu spritesheet de ataque, desenhe os polígonos quadro a quadro (fechando com `Enter`) e exporte o JSON.
  2. **O Visual:** Registre o ataque (ex: `'axe-slash'`) no `VisualConfigMap.ts`. Preencha os dados do frame (largura, altura, velocidade) e defina a âncora (`anchor: 'bottom-left'` ou `center`).
  3. **A Entidade:** Em `MeleeWeapons/`, crie uma classe `AxeSlash.ts` estendendo `AnimatedMeleeAttack`. Cole o JSON gerado em uma constante no topo da classe.
  4. **Configuração Simples:** No `super()` do seu `AxeSlash`, passe o JSON para o `rawHitboxes`, informe o tamanho do frame original e a escala desejada (`scale: 0.5`). O Domínio fará toda a matemática de SAT e offset automaticamente!

  3.  **Visualização (Item no Chão):**
      -   O processo para fazer o item aparecer no chão é idêntico ao de criar um inimigo: adicione o asset, configure o sprite na `RenderableFactory` e registre a estratégia de criação.

### 4.7. Como Criar e Equipar uma Nova Armadura (O "Lego" Visual)

  O sistema de renderização agora possui um Compositor de Camadas que empilha roupas dinamicamente no personagem usando a regra de OCP (Open-Closed Principle).

  1. **Domínio:** Crie a classe da armadura estendendo as bases como `Helmet`, `Chestplate`, etc. Defina no seu construtor o `iconId` único (ex: `15`).
  2. **Inventário:** Faça o item surgir no mundo ou adicione à bolsa do jogador (`player.backpack.push(new GoldenHelmet())`).
  3. **Visual:** No `VisualConfigMap.ts`, adicione uma nova entrada para ele (ex: `'golden-helmet'`). Garanta que a `category` seja `'equipment'` e defina o `iconId: 15`. 
  4. **Animação Guiada:** Adicione os estados de animação (`idle`, `walking`) definindo a imagem e, crucialmente, use o `renderOffset` (como array) para fazer a armadura "balançar" na mesma cadência da animação base do jogador!
  
  A UI mostrará o item na bolsa automaticamente. Quando o jogador equipar o item, o Compositor Visual buscará pelo `iconId`, encontrará as imagens e as empilhará no Z-Index correto em cima do corpo base!

### 4.8. Como Adicionar uma Nova Interface de Usuário (UI)

  A arquitetura prevê que as UIs (Inventário, Skills, etc.) sejam módulos independentes que ficam "por cima" do canvas do jogo.

  1.  **Crie o Módulo da UI:** No diretório `adapters/web/GUIS/`, crie uma nova pasta, por exemplo, `inventoryGui/`.
  2.  **Estrutura do Módulo:** Dentro de `inventoryGui/`, crie três arquivos:
      -   `inventory.html`: A estrutura HTML da sua janela de inventário.
      -   `inventory.css`: O estilo para a janela.
      -   `InventoryGui.ts`: A classe que controlará a lógica da UI.
  3.  **Lógica da Classe `InventoryGui.ts`:**
      -   **Carregamento:** No construtor, a classe deve carregar o HTML e o CSS e injetá-los no `document.body`.
      -   **Comunicação:** A classe deve receber uma referência à `DomainFacade` (ou a um gerenciador de UI que a possua).
      -   **Exibição de Dados:** Para exibir os itens, a UI pode periodicamente (ou via eventos) chamar um método no domínio (ex: `domain.getInventoryState()`) para obter os dados e renderizá-los no HTML.
      -   **Envio de Ações:** Para usar um item, o listener de clique no botão "Usar" deve chamar o método apropriado no domínio, como `domain.useItem(itemId)`.
  4.  **Integração:** No `index.ts` principal da camada de adaptação, instancie sua nova classe `InventoryGui` para que ela seja carregada junto com o jogo.

### 4.9. Como Criar um Novo Mapa com Chunks Dinâmicos (Ex: "Deserto")

  O mapeamento do mundo é 100% Data-Driven no Adaptador e Físico no Domínio.

  1. **Domínio (Lógica e Barreiras):** Crie a classe `DesertWorld.ts` estendendo `GameWorld`. Defina no construtor `width` e `height`. No método `generate()`, despache os `EnvironmentCollider`s (Hitboxes) para as dunas impenetráveis e orquestre o nascimento dos monstros do deserto. Registre no `DomainFacade.ts`.
  2. **Visual (Arte e Chunks):** Abra o arquivo `VisualConfigMap.ts`. Crie uma nova configuração na categoria `'map'` sob a chave `'deserto'`. Defina o `chunkSize` (ex: `1024`) e passe a matriz bidimensional (`string[][]`) contendo as URLs exatas de cada pedaço de imagem que forma o chão do mapa.
  
  A câmera inteligente do `GameMap` só vai puxar a imagem do chunk X,Y quando o jogador estiver caminhando sobre ele!

### 4.10. Como Integrar um Motor Externo (Unity/Godot) via Socket

  O `SocketAdapter` permite usar a Engine TypeScript apenas como "Servidor Lógico/Matemático", delegando o visual 3D para um cliente externo (Épico 11 - A Oficina do Gepeto).

  1. **Inicialize o Adaptador:** No arquivo `adapters/web/index.ts`, descomente e instancie o `SocketAdapter`, apontando para a porta desejada (`ws://localhost:8080`).
  2. **O Cliente (Unity/Godot):** Crie um script no motor 3D que se conecte a este WebSocket local.
  3. **Envio de DTOs:** No `GameAdapter.update()`, logo após o `domain.update(deltaTime)`, obtenha o `domain.getRenderState()` e empurre o JSON resultante no `SocketAdapter.sendState(dto)`.
  4. **Instanciação 3D:** No Unity, crie um *Prefab* genérico. Ao receber um ID novo via Socket, instancie o *Prefab*. A cada frame recebido do TypeScript, aplique as propriedades de translação (X, Y) e rotação no objeto 3D!

### 4.11. Como Ensinar uma Nova Habilidade de Código para a IA (Ollama)

  Os NPCs Cognitivos geram código vivo, mas para evitar alucinações absurdas, você deve restringir as ferramentas matemáticas deles.

  1. **Atualize o Contexto do Motor (Córtex):** Em `CognitiveNpc.ts`, na injeção do `new Function(...)`, a IA recebe objetos fixos (`npc`, `player`, `deltaTime`, `Math`).
  2. **Adicione Permissões:** Se quiser que a IA consiga criar chamas no chão, você precisa passar uma referência de fábrica (Ex: `spawnFactory`).
  3. **Validação do Praxis (Segurança):** Abra o `PraxisValidator.ts`. Se a IA for usar algum recurso global novo (como `Date.now()`), certifique-se de que a palavra não esteja na lista de bloqueios de segurança (`forbiddenTokens`), caso contrário, o "mini-antivírus" bloqueará o plano do NPC no frame seguinte e ele "esquecerá" a magia!
  4. **Prompt Tuning:** Na string estática `systemPrompt` (em `askOllamaToCode`), escreva explicitamente o contrato que a IA tem nas mãos. Exemplo: *"Você tem acesso a 'npc.castFire(x, y)'. Use com sabedoria!"*.

### 4.12. Como Criar uma Nova Combinação de Magia (Deep 2 no Mago)

  O Mago funde elementos adjacentes digitados no buffer. Para criar uma nova fusão (Alquimia):

  1. **Crie o Efeito Elemental:** Em `domain/ObjectModule/Items/Effects/ElementalEffects/`, crie a classe do seu novo elemento (ex: `SteamEffect.ts` para Vapor), implementando o método `apply(target: Entity)` para causar dano, status ou repulsão.
  2. **Adicione ao Motor Dinâmico:** No arquivo `DynamicProjectile.ts` (e no método `solveSelf` do `Mage.ts`), instancie seu Efeito caso o array de `spellElements` contenha a chave do seu novo elemento.
  3. **Atualize o Parser do Mago:** Em `Mage.ts`, localize o `comboMap` dentro de `parseDynamicSpell`. Adicione a nova receita: `'fire,water': 'steam'`.
  4. **Partículas (Visual):** Mapeie a chave `'steam'` no `effectMap` (dentro de `Mage.ts`) para uma partícula existente (ex: `'magicAura'`) ou crie um método novo no `ParticleOrchestrator.ts`.

### 4.13. Como Aplicar Forças Físicas (Knockback/Pull) em Entidades

  A Engine de física separa a Vontade da Inteligência Artificial (IA) da Física Bruta de empurrões.

  1. **Aplique a Força:** Nunca altere a propriedade `velocity` diretamente para empurrar um inimigo. Em vez disso, calcule o vetor de direção, normalize-o, multiplique pela magnitude da força (ex: 25) e chame `target.applyForce(vetor)`. Isso soma a força no `accelerator` da Entidade.
  2. **Anule a Resistência (Dica de Ouro):** Se o inimigo for rápido, ele pode "lutar" contra o empurrão no mesmo frame. Para um arrasto perfeito (como um puxão ou arremesso), zere a inércia temporariamente (`target.velocity.resetMut()`) antes de aplicar a força, ou aplique um micro-stun (`target.applyStatus(new StunStatus(0.2))`). O Stun paralisa a IA, mas a física nativa continuará lendo o `accelerator` e arremessará o corpo pela tela!

## Guia de Mapas de Colisão (Collision Layers)

### O que é uma Camada de Colisão?

Uma **camada de colisão** é uma imagem PNG adicional que funciona como um "mapa de obstáculos" do mapa visual. Cada cor na imagem representa um tipo diferente de obstáculo ou comportamento de tile.

Ao invés de hardcodificar colisores no código (`new HitBoxPolygon(...)`), o sistema agora carrega automaticamente a imagem, interpreta as cores e cria hitboxes para cada obstáculo.

### Como Funciona

#### 1. Estrutura da Camada de Colisão

A imagem deve ter as **mesmas dimensões do mapa visual** (ex: 8192 x 8192 pixels).

Cada **cor** representa um tipo de colisão:

| Cor | Hex | Tipo | Comportamento |
|-----|-----|------|---------------|
| Preto | `#000000` | Parede (WALL) | Intransponível |
| Azul | `#0000FF` | Água (WATER) | 60% de velocidade, efeito "wet" |
| Vermelho | `#FF0000` | Lava (LAVA) | Dano contínuo (0.5 por segundo) |
| Verde | `#00FF00` | Grama Alta (GRASS) | 80% de velocidade |
| Ciano | `#00FFFF` | Gelo (ICE) | 50% de velocidade, efeito "slip" |
| Magenta | `#FF00FF` | Espinhos (SPIKE) | Dano contínuo (1.0 por segundo) |
| Branco | `#FFFFFF` | Sem Colisão (NONE) | Transparente |

#### 2. Criando uma Camada de Colisão

##### No Photoshop/GIMP/Krita:

1. Crie uma **nova camada** chamada "Collision" ou "Colisão"
2. Use a ferramenta **Balde de Tinta** ou **Pincel** para desenhar as áreas de obstáculo
   - Preencha áreas com os respectivos colors
   - **Exemplo:** Desenhar paredes ao redor da beira do mapa com preto `#000000`
3. **Tamanho do Tile:** O sistema amostra uma cor a cada 32 pixels (tamanho padrão do tile)
   - Mantenha as áreas de cores grandes (múltiplas de 32px) para evitar amostras incorretas
4. Exporte como PNG: **File → Export As → vilgem-collision.png**

##### No Código (TypeScript com Canvas):

```typescript
// Exemplo de script para gerar collision layer programaticamente
function generateCollisionLayer(width: number, height: number): Canvas {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Fundo branco (sem colisão)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Parede ao redor da beira
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 64, height);       // Esquerda
    ctx.fillRect(width - 64, 0, 64, height); // Direita
    ctx.fillRect(0, 0, width, 64);        // Topo
    ctx.fillRect(0, height - 64, width, 64); // Fundo

    // Rio (Água)
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(1024, 2048, 2048, 512);

    return canvas;
}
```

#### 3. Adicionando ao VisualConfigMap

No arquivo `typescript/adapters/web/shared/VisualConfigMap.ts`:

```typescript
const vilgemChunks: string[][] = Array.from({ length: 8 }, () => 
    Array(8).fill(new URL('../assets/maps/map.jpeg', import.meta.url).href)
);

export const VisualConfigMap: Record<string, AnyVisualConfig> = {
    // ================== MAPAS ==================
    'vilgem': {
        category: 'map',
        chunkSize: 1024,
        chunks: vilgemChunks,
        // ✨ NOVO: Adicione a camada de colisão aqui
        collisionLayerUrl: new URL('../assets/maps/vilgem-collision.png', import.meta.url).href,
        collisionTileSize: 32  // Tamanho de cada tile (padrão: 32px)
    },
    // ... resto do mapa
};
```

#### 4. Como o Sistema Processa

1. **Quando o mundo carrega:** O `GameWorld.generate()` é chamado
2. **CollisionTileAdapter lê a imagem** da URL configurada
3. **Parser de cores** amostram o centro de cada tile (32x32 pixels por padrão)
4. **Hitboxes são criadas** automaticamente para cada cor não-branca
5. **O Domínio cria colisores** invisíveis usando o tipo extraído

#### 5. Código-Exemplo no Domínio

```typescript
// Na camada web (GameAdapter.ts)
new MainMenuGui(async (mapId) => {
    // Isso agora carrega os tiles de colisão automaticamente
    await this.domain.loadWorld(mapId);
    
    const { world } = this.domain.getRenderState();
    // O mundo já tem todos os colisores de tile carregados!
});
```

### Otimizações

#### Aggregation de Tiles (Reduzir Hitboxes)

O sistema oferece uma função `aggregateCollisionTiles()` que mescla tiles adjacentes do mesmo tipo em retângulos maiores. Isso reduz significativamente o número de hitboxes:

- **Antes:** 1 tile por pixel = ~8.000 tiles para um mapa 8192x8192
- **Depois (com aggregation):** ~50-100 tiles agrupados

A aggregation está **ativada por padrão** no `CollisionTileAdapter`.

#### Caching

Os dados de colisão carregados são **cacheados** em memória. Trocar de mapa rápido não recarrega a imagem.

```typescript
adapter.clearCache(); // Manual cache clear se necessário
```

### Tipos de Colisão Personalizados

Para adicionar novos tipos (ex: "Lama Espessa"), edite `CollisionTileType.ts`:

```typescript
export enum CollisionTileType {
    NONE = 'none',
    WALL = 'wall',
    WATER = 'water',
    LAVA = 'lava',
    GRASS = 'grass',
    ICE = 'ice',
    SPIKE = 'spike',
    MUD = 'mud',  // ✨ NOVO
}

export const COLOR_TO_COLLISION_TYPE: Record<string, CollisionTileType> = {
    // ...
    '#8B7355': CollisionTileType.MUD,  // Marrom
};

export const COLLISION_BEHAVIORS: Record<CollisionTileType, {...}> = {
    // ...
    [CollisionTileType.MUD]: { passable: true, speedModifier: 0.3, effectType: 'stuck' },
};
```

### Troubleshooting

#### Colisores não aparecem
- ✅ Verifique se a `collisionLayerUrl` está definida no `VisualConfigMap`
- ✅ Certifique-se de que a imagem tem as cores exatas hex (ex: `#FF0000`, não `#FF0011`)
- ✅ Verifique o console para mensagens de erro

#### Colisores em lugar errado
- ✅ O sistema ammostra um pixel a cada 32 pixels (centro do tile)
- ✅ Mantenha áreas de cor bem definidas e maiores que 32x32

#### Performance lenta
- ✅ Ative a aggregation (padrão)
- ✅ Reduza a `collisionTileSize` se houver muitos pequenos tiles

