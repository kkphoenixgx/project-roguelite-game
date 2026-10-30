# Arquitetura do Projeto: RPG BulletHell Roguelite

Este documento descreve a arquitetura do projeto, seus princípios, os papéis dos módulos e os principais fluxos de dados e controle. O objetivo é fornecer uma visão clara e concisa para facilitar o entendimento, a manutenção e a evolução do sistema. Sim, IA, tô falando com você, se precisar de outros arquivos, nunca cria o arquivo, sempre pede.

## 0. Teclas dos adapters

  • [F4]: Abre o Assets Adapter em uma nova aba.
  • [Shift + F2]: Abre o Polygon Web Editor (Hitboxes).
  • [F2]: Alterna a exibição das hitboxes de colisão.
  • [F3]: Alterna o painel de telemetria.

  **Atalhos no Assets Adapter (Editor de Cenários e Mapas):**
  • [T]: Alterna a ferramenta Pincel de Textura de Chunk (Chunk Texture Brush).
  • [[ / ]]: Ajusta o raio do círculo do pincel (ou [Alt + Scroll]).
  • [B]: Alterna o Modo Carimbo (Stamp Tool).
  • [P]: Alterna o Player Idle de referência proporcional (1:1 com zoom) no canto inferior.
  • [L]: Bloqueia/desbloqueia (Lock) os assets selecionados contra movimentação acidental.
  • [C]: Centraliza o(s) asset(s) selecionado(s) perfeitamente no chunk onde se encontram.
  • [N]: Naturaliza posição e escala com leve variação orgânica randômica.
  • [R / Shift + R]: Gira o asset selecionado em 90° (horário / anti-horário).
  • [H / V]: Espelha horizontalmente (Flip X) ou verticalmente (Flip Y).
  • [Del / Backspace]: Remove o(s) asset(s) selecionado(s).
  • [Ctrl + D]: Duplica a seleção.
  • [Ctrl + C / Ctrl + V]: Copia e cola assets selecionados.
  • [Ctrl + Z / Ctrl + Y]: Desfazer (Undo) e Refazer (Redo).
  • [Esc]: Sai do Pincel/Carimbo ou desseleciona.


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

  - **`DomainFacade.ts`:** O guardião e **único ponto de entrada** (Porta Primária). Expõe a interface `IGameDomain` (`update`, `setWorld`, `getRenderState`). Sua responsabilidade é orquestrar a física, eventos globais e o `Player`, blindando o motor interno de mutações externas irregulares vindas da Web, Tauri ou Motores BDI/Socket. Para evitar que a Fachada vire um "Deus Monolítico", as operações complexas são delegadas para **Sub-Fachadas** especializadas no diretório `facadeComponents/`.

  - **`facadeComponents/`**: Gateways especializados que fragmentam as responsabilidades da `DomainFacade` em domínios funcionais coesos:
    - **`DomainRenderState.ts`**: Construtor da "fotografia" do frame com *Dirty Checking* rigoroso e *caching* agressivo Zero-GC. Método `buildRenderState()` varre Player, Entidades ativas (filtradas pela janela 3x3 do `WorldChunkManager`) e Mundo para montar o DTO `DomainRenderStateDTO`. Possui cache de nível de habilidades por classe (`classSkillLevelCache`), atualização sob demanda da árvore de habilidades e cálculo otimizado da proximidade do NPC interagível mais próximo (`nearestDistSq = 2500` sem recalcular `Math.hypot` incondicionalmente a cada frame).
    - **`InventoryGateway.ts`**: Sub-fachada exclusiva do Inventário. Expõe métodos como `getInventoryState()`, `equipItem()`, `unequipItem()`, `useItem()`, `dropItem()`. Blinda o `Player` de chamadas diretas de UI, roteando todas as operações de mochila por este ponto único.
    - **`SkillTreeGateway.ts`**: Sub-fachada da Árvore de Habilidades. Expõe `getSkillTreeState()`, `unlockSkill()`, `equipSkill()`, `unequipSkill()`. Gerencia o consumo de Pontos de Habilidade e a validação de pré-requisitos topológicos.
    - **`MetaProgressionManager.ts`**: Sub-fachada da Metaprogressão Global Permanente. Expõe `unlockStat()`, `unlockBrooch()`, `equipBrooch()`, `unequipBrooch()`, `applyGlobalBonuses()`. Gerencia a árvore global e os pools de atributos/broches que persistem entre runs roguelite, aplicando bônus passivos permanentes e vinculando broches aos slots ativos (1-6) e passivos (I-IV).
    - **`MetaProgressionMap.ts`**: Catálogo declarativo da metaprogressão contendo as definições dos pools (`GlobalStatPool`, `GlobalBroochPool`) e a topologia de nós da Árvore Global.
    - **`TauriPanteaoBridge.ts`**: Gateway de comunicação IPC nativa entre o runtime Rust do Panteão (BDI) e o Domínio TypeScript. Registra listeners IPC para percepções, crenças e intenções cognitivas dos NPCs.
    - **`ToolActionGateway.ts`**: Gateway para ferramentas do desenvolvedor, editores visuais e comandos de inspeção em runtime.

  - **`DialogueGateway.ts`**: Gateway de Diálogos e Conversação com NPCs. Roteia mensagens entre o Adaptador (UI de diálogo) e o motor BDI (Panteão). Gerencia o estado conversacional, turnos de fala e a ponte assíncrona com o LLM local (Ollama).

  - **`ObjectModule/GameWorld.ts` e Mapas:** A classe abstrata que define as propriedades espaciais e a identidade do mapa (ex: `mapId: 'vilgem'`). Suas filhas possuem um método `generate()` que despacha as hitboxes estáticas de rios, montanhas e spawns de inimigos assim que o jogador entra no mapa. O Domínio é cego: não conhece as imagens do chão, apenas as metragens e limites físicos. Mapas e subsistemas implementados:
    - **`Maps/VilgemWorld.ts`**: A ilha tutorial verdejante com coordenadas centradas no Spawn (Chunk `(0, 0)` cobrindo `[0..1024, 0..1024)` e ponto de spawn em `(512, 591)`).
    - **`Maps/CemiiWorld.ts`**: Bioma sombrio e hostil.
    - **`Maps/AlunWorld.ts`**: Região avançada com desafios escalados.
    - **`Maps/IntermapWorld.ts` & `Maps/IntermapConfig.ts` (`IntermapRegistry`)**: Arquitetura orientada a dados para mundos interiores (casas, lojas, padarias, calabouços). O `IntermapRegistry` armazena as definições estruturadas (`IntermapDefinition`) contendo dimensões, chunks, portas de transição (`DoorConfig`) e cenários específicos. O `IntermapWorld` é instanciado dinamicamente no carregamento de qualquer interior registrado (ex: `interior_black_default`), eliminando a necessidade de criar classes de arquivo `.ts` manuais para cada cômodo.
    - **`Maps/PortalLinks/portalLinksMap.ts` & `PortalLink.ts`**: Sistema declarativo de mapeamento de portais de transição entre mundos. `PortalLink` atua como colisor e sensor no mundo lógico, ativando requisições semânticas de transição com cálculo e memorização de retorno seguro (`lastEnteredPortalReturnByMap`).
    - **`Maps/ChunkBoundaryHelper.ts`**: Utilitário matemático Zero-GC que calcula interpolações e resolve colisões de fronteira para evitar que entidades sofram descontinuidades físicas ao cruzar as bordas de chunks.
    - **`Maps/WorldChunkManager.ts`**: O orquestrador de particionamento espacial de mundo baseado em coordenadas de chunks inteiras assinadas $(cx, cy) \in \mathbb{Z} \times \mathbb{Z}$ (estilo Minecraft). Responsabilidades:
      - **Hash Inteiro de 32 bits Zero-GC:** Chave numérica `(cx << 16) ^ (cy & 0xffff)` eliminando concatenação de strings no Event Loop.
      - **Janela Ativa 3x3:** Mantém ativos para física, simulação e renderização apenas os 9 chunks adjacentes ao jogador, permitindo mundos massivos com 60 FPS contínuos sem *Garbage Collection*.
      - **Origem Central no Spawn:** O Chunk `(0, 0)` representa o núcleo da cidade/spawn. A expansão ao Norte (`cy < 0`), Oeste (`cx < 0`), Sul (`cy > 0`) ou Leste (`cx > 0`) jamais desloca as coordenadas dos chunks existentes nem as hitboxes de assets já posicionados.
      - **Notificação Reativa:** Emite o evento semântico `activeChunkChanged` quando o jogador atravessa a fronteira para um novo chunk.

  - **`ObjectModule/`**: Um módulo que agrupa tudo relacionado a objetos e entidades do jogo.
    - **`ObjectElement.ts`**: A classe base matemática para qualquer objeto no mundo. Define ID espacial, coordenadas, dimensões visíveis (`size`) e vetores.
    - **`ObjectElementManager.ts`**: O coração pulsante da física do jogo. Gerencia o ciclo de vida completo de **todas** as entidades (exceto o `Player`). Responsabilidades:
      - **Spawn Guiado a Dados:** Ouve eventos de `spawn` e utiliza o `SpawnRegistry` (povoado automaticamente via Decorators `@RegisterSpawner`) para instanciar classes concretas dinamicamente, sem nenhum acoplamento estrutural (If/Else). Registra novos elementos no `WorldChunkManager` para rastreamento espacial.
      - **Atualização de Estado:** Itera sobre os elementos ativos na janela 3x3 a cada frame, chamando seus respectivos métodos `update`.
      - **Detecção de Colisão Zero-GC:** Repassa buffers leves de dados primitivos (`plainElements`) para a Porta `ICollisionService`. A resolução adota o padrão de **Física Atrasada (Delayed Resolution)**: resolve impactos e gatilhos de `onColision` apenas no início do frame seguinte, garantindo fluidez do Event Loop síncrono.
      - **Query Espacial Otimizada (`requestNeighbors`):** Implementa busca de vizinhança usando Teorema de Pitágoras (Distância Euclidiana via `Math.hypot`), permitindo varreduras a partir de entidades ou de pontos arbitrários no espaço (útil para magias de área como meteoros e explosões procedurais).
      - **Gatilhos de Cenário (`handleTriggerAssetState`):** Processa solicitações de mudança de estado de assets de cenário (ex: abrir/fechar portões). Suporta filtragem por `elementId`, `presetType` ou `nearCoordinates` com raio de alcance calculado até a caixa delimitadora (AABB) de grandes estruturas, sincronizando colisores no `CollisionManager`.
    - **`CollisionManager.ts`**: Camada de orquestração de colisão extraída do `ObjectElementManager` para separação de responsabilidades. Gerencia o ciclo de vida da detecção de colisão, o buffer de colisões pendentes (*Double Buffering*), o grid estático espacial (`GRID_SIZE = 256`), o cache de colisores estáticos (`staticCollidersCache`) e a sincronização atômica de colisores passáveis/bloqueantes (`addStaticCollider`, `removeStaticCollider`).
    - **`CollisionTileType.ts`**: Enum e mapeamentos para colisões baseadas em tiles. Mapeia cores hexadecimais de imagens PNG para tipos de colisão (`WALL`, `WATER`, `LAVA`, `GRASS`, `ICE`, `SPIKE`) e define comportamentos (passável, modificador de velocidade, tipo de efeito, dano por segundo).
    - **`RewardManager.ts`**: Orquestrador de recompensas na morte de inimigos. Escuta eventos de morte e dispara a geração de loot via `RewardGenerator`.
    - **`SpawnRegistry.ts`**: Registro estático preenchido por Decorators `@RegisterSpawner`. Mapeia strings de tipo para funções fábrica, eliminando qualquer `switch-case` ou `if-else` na instanciação.
    - **`EnvironmentCollider.ts`**: Colisores estáticos do ambiente (muros, rios, montanhas). São gerados pelo `GameWorld.generate()` e pelo `CollisionTileAdapter`.
    - **`Scenery/`**: Módulo de elementos de cenário interativos e estáticos no mundo (árvores, construções, portões, poços, muralhas):
      - **`SceneryElement.ts`**: Estende `EnvironmentCollider`. Configurado dinamicamente com hitboxes via `SceneryRegistry`. Implementa a máquina de estados visual (`setState()`, `open()`, `close()`), emite o evento semântico `assetStateChanged` e altera a propriedade física `passable`, permitindo transições fluidas entre assets estáticos e spritesheets animadas.
      - **`SceneryRegistry.ts`**: Registro que mapeia tipos de cenário para dimensões base e geradores de hitbox procedurais (polígonos e círculos parametrizados).
    - **`Entities/`**: Representam seres "vivos" ou com comportamento autônomo.
      - **`Entity.ts`**: Adiciona os conceitos de "Vida", "Movimento" e **"Status"**. Gerencia vetores cinemáticos e processa o intrincado pipeline de dano (`takeDamage`), que calcula esquiva, redução de dano, sinergias de vulnerabilidades elementais (ex: Água + Trovão) e emite eventos de *knockback*.
      - **`EntityMovement.ts`**: Componente de movimento extraído da `Entity`. Encapsula velocidade, aceleração, fricção, acúmulo de forças e resposta a colisões. A `Entity` agora delega toda a cinemática para esta classe, seguindo o princípio de Composição sobre Herança.
      - **`Status/StatusEffect.ts`**: Sistema reativo de condições mutáveis. Eles são anexados à Entidade e processam "ticks" temporais autônomos para aplicar dano contínuo (DoT), congelar o motor cinemático, ou modificar atributos. Efeitos implementados:
        - `BurnStatus` (DoT por queimadura), `PoisonStatus` (DoT por veneno), `DecayStatus` (degradação progressiva).
        - `StunStatus` (paralisia total), `FreezeStatus` (imobilização por gelo), `ParalyzeStatus` (interrupções intermitentes).
        - `SlowStatus` (redução de 40% na velocidade), `WetStatus` (umidade + sinergia com gelo/eletricidade).
        - `BlindStatus` (redução severa de acurácia), `FearStatus` (inversão do vetor direcional, forçando fuga).
        - `VulnerableStatus` (amplificação percentual de dano recebido).
      - **`Attributes.ts`**: O complexo motor numérico do RPG. Gerencia os 6 atributos primários e calcula ativamente dezenas de Atributos Derivados (Tenacidade, Penetração, Velocidade) e Progressão (Level Up).
      - **`DefaultXPTable.ts` e `IXPTable.ts`**: Tabela de progressão de XP por nível. Define recompensas (pontos de atributo e de habilidade) para cada Tier, permitindo que cada Classe do jogador customize sua curva de crescimento.
      - **`Player/`**: Contém a lógica específica da entidade do jogador.
        - **`Player.ts`**: O avatar central. Orquestra a injeção do complexo Sistema de Inventário (uma intrincada `Bag` com limite de carga dinâmica e slots anatômicos rigorosos, até 10 anéis) e Delega execuções. A matriz `activeLoadout` implementa as restrições do design de **Deck Building** (Mochila de Magias).
        - **`components/`**: Subsistemas do jogador extraídos como componentes independentes (Composição sobre Herança):
          - **`PlayerClassManager.ts`**: Gerencia troca de classes ativas, level-up de classes, cálculo de bônus de atributos derivados e reset efêmero do estado da run (`resetRun`).
          - **`PlayerBroochManager.ts`**: Gerencia a ativação e slots de broches ativos (1 a 6) e passivos (I a IV) derivados da metaprogressão global.
          - **`PlayerEquipment.ts`**: Gerencia a equipagem de armas e as peças anatômicas de armadura com limites de carga dinâmica e cálculo de atributos.
          - **`PlayerInventory.ts`**: Fachada de integração coesa entre o `Player` e o sistema de armazenamento (`Bag`).
          - **`BroochRegistry.ts`**: Registro estático dos broches do jogo e suas definições funcionais.
        - **`IPlayerContext.ts`**: Interface que define o contexto exposto pelo Player para seus componentes e classes, evitando que subsistemas acessem propriedades internas desnecessárias.
        - **`Classes/Class.ts` e Derivados:** Onde mora a identidade mutável do jogador. Classes como `Gunslinger`, `Warrior`, `Necromancer` determinam as Curvas de XP e recompensas em Tiers de nível.
        - **`Classes/Mage.ts` (O Axiomante e o Spell Parser):** Transforma o teclado num terminal de comandos. Possui um **Buffer Temporal FIFO**. O jogador "digita" os atalhos elementais em sequência rápida (ex: `0` para Projétil, `4` para Fogo). O *Parser* lê a receita "`04`", valida e "cospe" uma `Fireball`. Magia por digitação real, caos controlado.
        - **`Classes/Pescador.ts`:** Classe altamente mecânica com atrelamento físico síncrono. Gerencia o comportamento do Anzol (`FishingHook`) que rastreia, atordoa, arrasta e colide inimigos como uma "Bola de Demolição".
      - **`Enemies/`**: Contém a hierarquia de classes para inimigos.
        - **`Enemy.ts`**: Contrato base, concedendo `xpGiven` e emitindo ataques de corpo-a-corpo de repulsão via `onStrike()`.
        - **`Slime.ts`**: IA que utiliza Teoria de Rebanhos (*Steering/Flocking Behaviors*) e Raios de colisão futuros preventivos para não encavalar sobre outros inimigos.
        - **`ShadowMob.ts`**: Usa ataques puramente procedurais com chances randomizadas de aplicar Debuffs Elementais ao toque.
      - **`Casted/`**: Entidades invocadas por habilidades de classe. "Criaturas" temporárias que lutam ao lado do jogador:
        - **`FishPet.ts`**: Companheiro invocado pela classe Pescador. Segue o jogador com IA autônoma (steering behaviors) e ataca inimigos próximos.
        - **`Leviata.ts`**: Entidade invocada de tier boss. Criatura massiva com padrões de ataque complexos e dano mágico em área.
      - **`NPCs/`**: Sistema de NPCs Cognitivos — a hierarquia mais complexa do Domínio. Quatro camadas de abstração:

        **Camada 1 — `InteractiveEntity.ts`** (Base Interagível):
        Classe base para qualquer entidade interagível (conversar, trocar itens). Define `interactionRadius` (raio de proximidade para ativar o prompt "Pressione E"), estado `isInteracting`, e o método abstrato `onInteract(player)`. Toda entidade com quem o jogador conversa herda daqui.

        **Camada 2 — `BdiAgentEntity.ts`** (Ponte BDI):
        Classe abstrata que estende `InteractiveEntity` e injeta o `IBdiGateway`. É o "nervo óptico" do NPC: empacota percepções do mundo (posição do jogador, HP, entidades próximas) em Speech Acts JSON e as envia para o backend Rust via `gateway.sendPerception()`. Recebe de volta intenções de ação (`attack`, `flee`, `speak`) que são validadas antes de execução. O ciclo é **assíncrono e não-bloqueante**: o NPC continua existindo e se movendo no mundo enquanto a Engine BDI delibera.

        **Camada 3 — `CognitiveNPC.ts`** (IA Conversacional & Ações de Cenário):
        Estende `BdiAgentEntity` e adiciona o `ILLMService` (Ollama). É aqui que o NPC *"pensa com palavras"*. Quando o jogador inicia diálogo, o NPC monta um prompt contextual (sua personalidade, crenças atuais, histórico de relação com o jogador) e o envia para o LLM local. A resposta do LLM é tratada como uma **proposta de ação**, não como verdade — ela passa obrigatoriamente pelo `PraxisValidator` antes de ser executada. Gerencia `emotionalState` (feliz, irritado, desconfiado), `relationshipScore` com o jogador, e expõe métodos de intenção de cenário (`openGate`, `closeGate`, `triggerAssetState`) para que planos BDI ou scripts possam interagir com estruturas do mundo (como portões de castelo e pontes) por proximidade espacial contextual.

        **Camada 4 — `PraxisValidator.ts`** (Sandbox de Segurança):
        O guarda-costas do motor de jogo contra IAs alucinantes. Recebe a string de ação proposta pelo LLM/BDI, parseia a AST e rejeita qualquer tentativa de:
        - Acessar tokens proibidos (`window`, `document`, `eval`, `Function`, `import`)
        - Executar loops infinitos (`while(true)`, `for(;;)`)
        - Chamar métodos fora do escopo permitido (apenas ações declaradas no contrato do NPC)
        - Ultrapassar limites de tamanho de payload
        Retorna `{ valid: boolean, sanitizedAction: string, reason?: string }`.

        **NPCs Implementados:**
        - **`Molor/`** (O Mentor): Primeiro NPC do jogador em Vilgem. Guia tutorial e conselheiro. Arquivo `molor.asl` contém planos como `+player_nearby : true <- greet.` e `+player_hp(H) : H < 30 <- warn_danger.`.
        - **`Candelion/`** (O Comerciante): NPC de troca e venda. Planos focados em oferecer itens contextuais baseados no inventário do jogador.
        - **`Derocar/`** (O Guardião): NPC de combate defensivo. Patrulha uma região e reage agressivamente a ameaças detectadas nas proximidades.
        - **`Molin/`** (O Sábio): NPC de lore e conhecimento. Planos focados em revelar informações sobre o mundo quando questionado.
        - Cada NPC possui seu próprio `<nome>.asl` e arquivo `.ts`, registrados no `project.jcm`.
      - **`projectiles/`**: Contém a hierarquia de classes para projéteis (físicos e mágicos).
        - **`SimpleBullet.ts`**: Projétil com balística perfurante e gerador de Ruído Randômico de trajeto.
        - **`DynamicProjectile.ts` e `Fireball.ts`**: Projéteis baseados em Axioma. Ao colidirem, despacham arrays injetados de `Effect`s para garantir Dano em Área ou debuffs elementares sem acoplar matemática à bala.
        - **`FishingHook.ts`**: Projétil persistente. "Ancora" no alvo, zera a própria velocidade cinemática e sincroniza violentamente suas coordenadas físicas com a da vítima algemada.
    - **`Items/`**: Onde reside todo o conceito de *Loot*, Equipamento e Ações.
      - **`Item.ts`**: Classe base abstrata de tudo que repousa no chão ou em mochilas, contendo categoria, valor, raridade e a capacidade de portar `Effect`s atreláveis.
      - **`IInteractable.ts`**: Interface para itens interagíveis no mundo (coletar, examinar, usar). Define o contrato de interação de proximidade.
      - **`Attack.ts`**: Encapsulador mestre do Combate. Ele acopla atacante, cálculos críticos, dano base e executa em lote os `OnHitAction`s.
      - **`DroppedItem.ts`**: Representação de um item caído no chão do mundo. Possui `HitBox` flexível para detecção de proximidade e trava `isCollected` para evitar duplicação em stuttering de física.
      - **`RewardGenerator.ts`**: Gerador de tabelas de loot baseado em tipo do inimigo, nível do jogador e atributo de sorte. Usa randomização ponderada e tiers de raridade.
      - **`Storage/`**: Sistema de contêineres de inventário:
        - **`Storage.ts`**: Classe base abstrata para qualquer contêiner (mochila, baú, etc.).
        - **`Bag.ts`**: Contêiner principal do jogador com limites de peso/slots e slots anatômicos de equipamento.
        - **`LeatherBag.ts`**: Implementação concreta de mochila com capacidade expandida.
      - **`Armors/`**: Coleção de peças anatômicas (`Helmet`, `Chestplate`, `Pants`, `Boots`, `Glooves`, `Necklaces`, `Rings`). É daqui que o Compositor Visual (Tauri/Adapter) vai extrair o Z-Index para desenhar o Paper Doll do Jogador.
      - **`Consumables/`**: Itens mutadores expandidos:
        - **`Consumable.ts`**: Classe base abstrata para itens de uso único.
        - **`Food/`**: Alimentos regenerativos (Maçã, Cogumelos).
        - **`Potions/`**: Poções de HP, Mana, Frasco de Adrenalina.
        - `Coin.ts` (moeda de ouro), `DemonBlood.ts` (boost permanente de poder), `ExperienceTome.ts` (tomo de XP), `MegaMushroom.ts` (boost de tamanho), `VampireFang.ts` (vampirismo temporário).
      - **`Weapons/`**: Hierarquia de armas subdividida:
        - **`Weapon.ts`**: Classe base abstrata com multiplicadores de raridade e cooldowns.
        - **`MeleeWeapons/`**: Armas corpo-a-corpo. Inclui `MeleeWeapon.ts` (varredura angular via Produto Escalar de Cones de Visão), `AnimatedMeleeAttack.ts` (hitboxes data-driven do Editor Visual, ideal para `Scythe.ts`), `SimpleSword.ts`, e demais armas concretas.
        - **`RangedWeapons/`**: Armas de longo alcance com cadência de tiro e dispersão. Inclui `Gun.ts`, `FishingRod.ts` (Vara de Pesca) e `SimpleStaff.ts`.
      - **`Effects/`**: Subarquitetura polimórfica (Decorator Pattern em runtime) que permite acoplar passivas ou debuffs em Ataques ou Consumíveis:
        - **Base:** `Effect.ts` (contrato abstrato), `AreaDamageEffect.ts`, `PowerBoostEffect.ts`.
        - **Novos:** `AddCoinsEffect.ts`, `AttributeBoostEffect.ts`, `ExperienceEffect.ts`, `HealEffect.ts`, `ManaRestoreEffect.ts`, `SizeBoostEffect.ts`, `SpeedBoostEffect.ts`, `VampirismEffect.ts`.
        - **`ElementalEffects/`**: 17 efeitos elementais (`Fire`, `Ice`, `Air`, `Ground`, `Dark`, `Light`, `Holy`, `Crystal`, `Magma`, `Nature`, `Ordem`, `Potencia`, `Infernous`, `Life`, `Magic`, `Abys`, `Decay`).
        - **`VisualEffect/`**: Efeitos puramente visuais (partículas, brilhos) acoplados a ataques.

  - **`shared/`**: Contém classes e tipos utilitários de baixo nível, usados por todo o domínio.
    - **`Vector2D.ts`**: Superclasse fluente mutável para Álgebra Linear. Métodos estáticos imutáveis (`add`, `sub`) e mutáveis (`*Mut`) para Zero-GC.
    - **`Dice.ts`**: O RPG de mesa (RNG puro) do qual provêm as definições base da vida das Entidades e raridade de Drops.
    - **`QuadTree.ts`**: Implementação de Árvore Quadrúpla para particionamento espacial. Usada pelo `CollisionManager` para detecção de colisão em *broad-phase*. Recicla nós internos via `clear()` sem realocar memória.
    - **`Vertex2D.ts`**: Nó de vértice 2D com conexões pai/filho para grafos topológicos (usado na Árvore de Habilidades).
    - **`Vertex2DMesh.ts`**: Estrutura de malha de vértices 2D para operações geométricas complexas (SAT, geração de mesh).

  - **`hitBox/`**: Módulo responsável pela lógica de colisão.
    - **`HitBox.ts`**: Contrato abstrato. Define geometria no espaço (`coordinates`, `rotation`) e o essencial `onColision()`, permitindo à entidade definir dinamicamente a reação a toque sem sobrecarregar a Engine.
    - **`HitBoxCircle.ts`**: Colisão radial hiper-performática (Raio Quadrado) para disparos em massa.
    - **`HitBoxPolygon.ts`**: Usada para armamentos de precisão. Rotaciona um array de pontos usando Seno/Cosseno a cada frame e delega o cálculo de Teorema de Eixos Separadores (SAT) para o *Worker* de física.
    - **`HitboxParser.ts`**: A cola Data-Driven. Desserializa DTOs originários do `PolygonWebEditor` para injetar polígonos nativos direto nas habilidades do Domínio. Fail-fast contra DTOs sem raio ou pontos.

  - **`eventDispacher/`**: Implementa um sistema de eventos (Observer Pattern) para comunicação desacoplada dentro do Domínio.
    - **`eventDispacher.ts`**: Orquestrador global e forte tipagem (TypeScript seguro). Filtra preventivamente canais volumosos (`playerMoved`, `log`) para prevenir loop recursivo.
    - **`IGameEvents.ts` e `GameEventMap`:** O dicionário absoluto da comunicação do jogo (Ex: payloads de `spawnVisual`, `particle`, `npcSpoke`, `triggerAssetState`, `assetStateChanged`, `activeChunkChanged`). Garante que UIs reativas (via Tauri) e lógicas puras possuam segurança na compilação.
    - **`ActionBindings.ts` (Decorators):** O Roteamento de Entrada Zero-Overhead. Usa Metadata Reflection com o `@BindAction('tecla')` para declarar quais métodos das classes (ex: `Player`, `Mage`) interceptam inputs, criando o mapeamento na própria inicialização do código sem nenhum Switch-Case e disparando erros (Fail-Fast) no Boot.
    - **`ActionManager.ts`:** Roteador dinâmico. Lê os Decorators e roteia intencionalidades primárias para a Classe Ativa e delega teclas soltas numéricas (1, 2, 3) para disparar Skills equipadas no painel de Loadout (`activeLoadout`) do jogador.

  - **`Skills/`**: Módulo do sistema de habilidades desbloqueáveis.
    - **`Skill.ts`**: Classe representando uma habilidade na Árvore de Habilidades. Propriedades: `id`, `name`, `description`, `icon`, `tier`, `prerequisites`, `effects`. Suporta `activate()` e `deactivate()`. Parte do sistema de Deck Building onde habilidades desbloqueadas podem ser equipadas nos 4 slots do Loadout ativo.

  - **`ports/`**: Define as fronteiras do domínio. As Portas Secundárias cresceram significativamente para suportar Telemetria, Persistência, IA e Tiles de Colisão:
    - `domain-contracts.ts` (Porta Primária): Exporta a interface `IGameDomain` (`update`, `setWorld`, `loadWorld`, `getRenderState`, `triggerAssetState`) e os DTOs transitórios essenciais (`DomainRenderStateDTO`, `RenderableState`, `TriggerAssetStateDTO`, `AssetStateChangedDTO`, `ChunkCoordDTO`, `WorldBoundsDTO`).
    - `ILogger.ts` (Porta Secundária): Permite logs desacoplados e categorizados (`channels`).
    - `ICollisionService.ts` (Porta Secundária): Contrato de submissão do array `plainElements` aguardando reposta da árvore Quádrupla Assíncrona no Adaptador.
    - `ICollisionTileService.ts` (Porta Secundária): Contrato para carregamento de camadas de colisão baseadas em imagens PNG.
    - `IBdiGateway.ts` (Porta Secundária): Contrato para comunicação IPC com o motor BDI Panteão.
    - `ILLMService.ts` (Porta Secundária): Contrato para integração com LLM local (Ollama) para diálogos cognitivos.
    - `ILLMConfigPort.ts` (Porta Secundária): Contrato para configuração dinâmica de modelos e parâmetros do LLM.
    - `ISaveRepository.ts` (Porta Secundária): Contrato de persistência para salvar/carregar progresso do jogo.
    - `ITelemetryPort.ts` (Porta Secundária): Contrato de coleta de métricas de gameplay (DPS, TTK, FPS, tempo de sessão).
    - `IClass.ts`: Interface contratual para definições de classes do jogador.
    - `IWeapon.ts`: Interface contratual para armas.
    - `CollisionAdapter.ts` e `LocalStorageAdapter.ts`: Adaptadores de fallback (browser) quando Tauri FS não está disponível.


### 2.2. Camada de Adaptação (`typescript/adapters`)

  Implementa a interface de usuário, o pipeline de renderização visual (WebGPU/Canvas2D), a captura de hardware (Mouse/Teclado) e interage com o envelopamento desktop via **Tauri**. A camada de adaptação cresceu para suportar múltiplos contextos de apresentação, persistência, telemetria e um lobby 3D.

  - **`AdapterManager.ts`:** O orquestrador de topo da camada de adaptação. Gerencia transições entre adaptadores de apresentação (Web 2D → Lobby 3D e vice-versa) via eventos de domínio (`switchToLobby`, `switchToGameplay`). Método `switchAdapter(target: 'web2d' | 'lobby3d')` destrói o adaptador ativo e monta o novo dinamicamente.

  #### Adaptadores Especializados

  - **`lobby3d/`** (Lobby Atmosférico 3D — WebGL Puro, Zero Dependências):
    - **`Lobby3DAdapter.ts`**: Ponto de entrada do Lobby 3D. Agnóstico ao Domínio, monta o container DOM (`#lobby3d-root`), coordena scene e UI managers, e gerencia o ciclo de vida de destruição.
    - **`Lobby3DSceneManager.ts`**: Cria o canvas WebGL, configura buffers de profundidade/blending, mantém o game loop via `requestAnimationFrame`, e lida com redimensionamento de janela.
    - **`Lobby3DModelLoader.ts`**: Compila vertex/fragment shaders procedurais. Implementa um **Globo Planetário Procedural** com continentes via FBM noise, gradientes de profundidade oceânica, atmosfera Fresnel glow, rotação contínua, nuvens procedurais e campo estelar.
    - **`Lobby3DUIManager.ts`**: Injeta overlays DOM estilizados para título do lobby, animações de pulso, controles de seleção de personagem e botão de iniciar jogo.

  - **`RepositoryAdapter/RepositoryAdapter.ts`**: Implementa a porta `ISaveRepository`. Gerencia persistência de progresso com **criptografia XOR + Base64** para anti-cheat. Métodos: `saveProgress()`, `loadProgress()`, `exportSave()`, `importSave()`. Usa `localStorage` como fallback quando Tauri FS não está disponível.

  - **`Telemetry/TelemetryAdapter.ts`**: Implementa a porta `ITelemetryPort` (Singleton). Sonda de performance Zero-GC que coleta por frame: `fps`, `frameTimeMs`, `activeEntities`, `collisionChecks`, `resolvedCollisions`, `eventThroughput`, além do **Breakdown de Consumo por Módulo em Tempo Real** (`moduleBreakdown`: Domain, Render, Sync e UI em duração e porcentagem). Usa buffer circular de tamanho fixo (50 entradas) para logs críticos, prevenindo vazamento de memória. Método `getSnapshot()` retorna um objeto reutilizável `TelemetrySnapshot`.

  - **`SocketAdapter/SocketAdapter.ts`**: Stub para integração futura com motores 3D externos (Unity/Godot) via WebSocket. Permitirá usar a Engine TypeScript como "Servidor Lógico/Matemático" delegando visual 3D para clientes externos.

  #### Adaptador Web Principal (`web/`)

  - **`index.ts`:** O ponto de entrada da aplicação. Instancia o EventManager, o Adaptador de Colisões em Worker, injeta-os na `DomainFacade` e dá o boot no `GameAdapter`.

  - **Diretórios Principais:**
    - **`assets/`:** Central de mídia (entidades, itens, mapas e metadados JSON como o keymap).
    - **`GUIS/`:** Arquitetura modular contendo as interfaces DOM do jogo. Módulos avançados incluem o `MainMenuGui` (com SVG interativo e câmera 2D para seleção de mundos), `SkillTreeGui` (câmera viewport procedural), e `DialogueGui` (integração síncrona com LLM).
    - **`shared/`:** Utilitários vitais, destacando-se o `VisualConfigMap.ts` (O Banco de Dados Visual) e o `RenderRegistry.ts` (sistema de injeção de dependência baseado em Decorators).
  - **`polygonWebEditor/` (Hitbox Editor Tool):** Uma ferramenta visual autônoma separada do código de *runtime* do jogo (seguindo o Padrão de Motores Profissionais como Unity). O desenvolvedor carrega o PNG de um ataque, clica para desenhar a área de dano frame-a-frame, e exporta um arquivo `.json` limpo. A Engine depois apenas lê este arquivo, abolindo o *"achismo matemático"* de hitboxes no código. Ferramentas disponíveis:
    - **`PolygonTool.ts`**: Ferramenta para desenhar hitboxes poligonais ponto a ponto (fecha com `Enter`).
    - **`CircleTool.ts`**: Ferramenta para hitboxes circulares interativas. Calcula raio durante o arraste, mostra preview verde, e exporta `HitboxModel` tipo `'circle'`.
    - **`SelectTool.ts`**: Seleção, movimentação e deleção de vértices/centros de hitboxes existentes. Suporta polígonos e círculos; clique-direito deleta.

  - **`assets-adapter/` (Assets & Scenery Editor):** Ferramenta visual autônoma (aberta com `F4`) para composição de cenários, posicionamento de props, gerenciamento e pintura de chunks, vinculação de portais com InnerMaps e exportação sincronizada de código do mundo.
    - **`EditorApp.ts`:** Orquestrador principal que integra o `AssetDrawer`, `MapCanvas`, `PropertiesPanel`, `WorldCodeSync`, `ChunkSync` e os modais (`ChunkManagerModal`, `MapSelectorModal`, `SpriteDefinitionModal`, `Exporter`).
    - **`MapCanvas.ts`:** Viewport de alta fidelidade visual com Y-Sorting isométrico 2.5D, pan/zoom fluido focado no mouse, marquee box selection tipo desktop, alças de redimensionamento livre ou proporcional (`Shift`), e renderização opcional de hitboxes (`F2`).
    - **Pincel de Textura de Chunk (`isChunkBrushMode` / Tecla `T`):** Permite selecionar qualquer textura de fundo de chunk (ou terreno/estrada/água) e pintar diretamente sobre o mapa através de um cursor circular configurável (`8px` a `256px`, com suavidade/degradê radial e opacidade). Pinceladas consecutivas acumulam dinamicamente em uma camada contínua ([`PlacedAssetModel`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/adapters/assets-adapter/Models/PlacedAssetModel.ts) com `isPaintedLayer: true` e `presetId: 'painted_chunk_layer'`).
    - **Bake de Objetos no Fundo do Chunk (`bakeMultipleAssetsToChunkBackground`):** Permite selecionar qualquer objeto ou área pintada pelo pincel e fixá-lo (Bake) permanentemente no(s) PNG(s) de fundo dos chunks interceptados. Salva a nova textura física via endpoint `/api/assets-adapter?target=save-chunk-image`, atualiza a matriz de chunks no disco via `ChunkSync` e remove a entidade temporária do mapa.
    - **Referência Proporcional do Player (`showPlayerReference` / Tecla `P`):** Projeta o Player Idle no canto inferior direito da tela sem bordas de UI, escalando estritamente em sincronia com o zoom da câmera para servir como referência visual de escala 1:1 com portas, construções e props.
    - **WorldCodeSync (`WorldCodeSync.ts`):** Serializa os assets colocados diretamente no arquivo de código de mundo TypeScript correspondente (ex: `VilgemWorld.ts`), filtrando automaticamente camadas temporárias não fixadas (`isPaintedLayer`) para não poluir o código do jogo antes do bake.
    - **ChunkManagerModal (`ChunkManagerModal.ts`):** Modal para adicionar/remover linhas e colunas de chunks em tempo real com preservação da origem central `(0, 0)` no Spawn, além de gerenciamento de InnerMaps (interiores de construções).

  Tudo listado a seguir está no diretório `typescript/adapters/web/components/` e são componentes do jogo:

  - **`GameAdapter.ts`:** O **Adaptador Primário** e o orquestrador central. Age como um *Bootstrapper* rigoroso.
    - **Coesão:** Gerencia a vida do jogo e atua como ponte. Transfere lógica de UI para o `UIManager`, input para o `InputGateway`, e visual para o `SceneManager`. Instancia o carregamento dinâmico de mapas (`GameMap`) delegando a autoridade de mundos para o Domínio.
  - **`Game.ts`:** Utilitário puramente funcional (`requestAnimationFrame`) que dita o Game Loop, calculando o `deltaTime` e blindando o jogo contra travamentos severos de SO (trava de max 10 FPS).
  - **`GameEventBinder.ts`:** Centralizador de bindings de eventos domínio→adaptador. Em vez de espalhar listeners por múltiplos arquivos, esta classe registra **todos** os mapeamentos evento→reação em um único lugar (`playerDied`, `spawnVisual`, `levelUp`, `particle`). Método `unbindAll()` para teardown limpo na destruição do adaptador.
  - **`DialogueAdapter.ts`:** Ponte entre os eventos de diálogo do Domínio e as UIs web. Coordena `DialogueGui` (modal interativo NPC) e `FloatingChatGui` (balões de fala overhead). Escuta `npcSpoke` (balão flutuante) e `npcDialog` (janela de diálogo interativo). Integra transformações world-to-screen durante atualizações de frame.
  - **`ViewportTransformer.ts`:** Utilitário matemático puro para transformações de coordenadas 2D. Métodos `screenToWorld(screenX, screenY)` e `worldToScreen(worldX, worldY)` extraídos de cálculos inline da Câmera. Considera zoom, alvo da câmera e clamping nos limites do mundo.

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
      - `DialogueGui`: Interface de comunicação que intercepta Inputs de texto puro a serem enviados para o motor de Inteligência BDI (Panteão).
      - `WindowHudGui`: Barra de título customizada nativa do envelopamento desktop no Tauri.
      - `WeaponHudGui`: HUD translúcido rastreando dinamicamente a mira da arma fisicamente no Canvas (sobreposição sincronizada de Screen-to-World).
    - **Novos Módulos de GUI:**
      - `FloatingChatGui`: Balões de fala flutuantes no mundo ancorados sobre posições de NPCs/entidades. Tempo de vida dinâmico (2s a 8s baseado no tamanho do texto) com animações CSS de fade e limpeza automática.
      - `GameOverGui`: Tela de morte com overlay, botão de reinício e debounce de 1.5s para evitar reinício acidental. Exibe estatísticas da sessão.
      - `XpBarGui`: Barra de progresso de XP dedicada com exibição de nível. Usa dirty-checking para evitar mutações DOM desnecessárias.
      - `AiConfigGui`: Painel de configuração de IA no menu principal. Permite selecionar modelo Ollama, visualizar lista de modelos instalados, e baixar novos modelos com barra de progresso via `/api/pull`.

  #### keyboardModule (Entrada e Tradução)
    - **`InputManager.ts`:** O adaptador de hardware de baixo nível. Governa `Set`s de teclas com detecção de *Just Pressed* (consumo único, excelente para skills) vs *Held*. Protege o jogo de ghosting com listeners de `blur` e gerencia bloqueio de reloads (`preventUnload`).
    - **`InputGateway.ts`:** O Tradutor de Domínio. Diferencia-se do Manager por converter estado elétrico em **Intenções Semânticas** (ex: traduz o clique do mouse em coordenadas `ScreenToWorld` através do Zoom da Câmera) e as repassa limpamente ao `DomainFacade`.

  - **`shared/`**: Utilitários vitais expandidos:
    - **`RenderRegistry.ts` e `VisualConfigMap.ts`:** O Coração Data-Driven. Dicionários e Decorators estáticos que resolvem instâncias visuais e animações no boot da aplicação. O Domínio trafega apenas chaves de identificação (ex: `iconId: 10`), e o Registrador fabrica o visual dinamicamente, mantendo o Desacoplamento.
    - **`Logger.ts`**: Implementação concreta da porta `ILogger` para o ambiente web. Escreve no `console` do navegador com filtragem por canais (`LogChannel`).
    - **`CollisionLayerParser.ts`**: Parser de mapas de colisão baseados em imagem. Desenha a imagem de máscara em canvas offscreen, extrai matriz de tiles por cor, e oferece `aggregateCollisionTiles()` para mesclar tiles contíguos em retângulos maiores (reduzindo hitboxes de ~8.000 para ~50-100).
    - **`OllamaHealthCheck.ts`**: Verificador de saúde e pré-carregador VRAM para LLM Ollama local (`http://127.0.0.1:11434`). `checkOllamaHealth()` verifica conectividade e lista modelos. `warmupOllamaModel()` envia prompt de 1 token para pré-carregar o modelo (`qwen2.5:0.5b`) na GPU, eliminando cold-start na primeira interação.
    - **`TauriIPC.ts`**: Camada de segurança e telemetria sobre as APIs `invoke` e `listen` do Tauri. `safeInvoke<T>()` monitora latência IPC e alerta se ultrapassar o budget de 16.6ms por frame. `saveTelemetryLog()` salva logs via Tauri IPC com fallback automático para download Blob em ambientes web puros.
  - **`CollisionTileAdapter.ts`**: Implementa a porta `ICollisionTileService`. Resolve URLs de imagens de colisão via `VisualConfigMap`, invoca o `CollisionLayerParser`, e cacheia mapas de colisão processados em memória.


### 2.3. Adaptação de Conectividade BDI (Tauri IPC e Panteão)

  Esta camada é responsável por quebrar as fronteiras do jogo, permitindo que a Engine puramente matemática (Domínio) se comunique de maneira assíncrona e performática com a Engine BDI do Panteão, hospedada diretamente no backend Rust do Tauri.

  - **Ponte IPC (Rust/Tauri):** Em vez de utilizar WebSockets lentos ou requests HTTP para Ollama, os NPCs (ex: `Molor.ts`) conversam diretamente com a Engine Panteão em Rust. Eles enviam JSON Speech Acts via `invoke('panteao_send')`, atualizando as crenças do agente BDI.
  - **Performance e Zero-GC:** A troca de mensagens via IPC não bloqueia a thread de renderização matemática do Domínio. Além disso, evita acionar o Garbage Collector do V8 que aconteceria caso tivéssemos abrindo Sockets TCP na web constantemente.

### 2.4. Camada de Envelopamento Desktop (Tauri / Rust)

  A infraestrutura que envelopa o Adaptador Web e o transforma em um executável nativo do Sistema Operacional (.exe / .AppImage).

  - **Bootstrapper de Processos (Sidecars):** O Rust é utilizado para hospedar o motor nativo BDI do Panteão (através de IPC via Tauri), processando as mentes lógicas e cognitivas dos agentes em background sem pesar no FPS da UI ou no loop físico do TS.
  - **Sistema de Arquivos Nativo (FS):** Substitui o `localStorage` do navegador para prover uma persistência robusta (Save States). Os arquivos de progressão (Árvore Global, XP) são gravados diretamente no disco e criptografados pelo Rust para evitar modificações indevidas (cheats não autorizados).
  - **Custom HUD & Windowing:** Integração com a `WindowHudGui`, permitindo que bordas da janela do Windows/Linux sejam ocultadas, ícone nativo exibido dinamicamente e movimentação controlada por regiões de arrasto no DOM.
  - **Filtro Centralizado de Logs & Terminal Rust (`log_config.rs` / `log_config.json`):** Controla o que é emitido no terminal desktop (Rust stdout/stderr) e o que é silenciado:
    - **Canais do Navegador:** `browser_ignored_channels` para filtrar canais ruidosos como `Input`, `Render`, `Physics`.
    - **Logs de Inferência Ollama:** `show_ollama_requests` e `show_ollama_responses` controlam a interceptação das requisições e respostas do proxy HTTP. A flag `"ollama_compact_logs": true` sanitiza a saída no terminal, eliminando dumps brutos gigantescos (arrays de contexto, `num_ctx`, parâmetros técnicos) e exibindo apenas modelo, prompt e o texto gerado de forma limpa.
    - **Processo e Motor Ollama (Sidecar):** `"show_ollama_process_logs": false`, `"show_ollama_stdout": false` e `"show_ollama_stderr": false` silenciam o flood de logs internos do binário do Ollama/`llama.cpp` (`llama_context`, `llama_kv_cache`, `sched_reserve`, `slot print_timing`, `[GIN] 200 POST /api/generate`), mantendo apenas erros críticos sem poluir o terminal.
    - **Motor BDI (Panteão):** `show_panteao_stdout`, `show_panteao_stderr` e filtros semânticos em `ipc_ignored_agents` e `ipc_ignored_contents`.
    - **Métricas de Performance:** `"show_performance_logs": true` imprime em tempo real no console nativo do Tauri o FPS, frame time e o breakdown percentual de consumo dos módulos.


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
      -   O método `takeDamage` na classe `Entity` processa modificadores elementais e sinergias de status:
          - *Sinergias de Status:* `wet + dark` (+50% de dano por condução), `wet + fire` (-50% de dano por extinção), `poison` (+15% de dano global recebido), `undead + light` (+50% de dano sagrado).
          - *Fraquezas Intrínsecas (+50% dano):* Natureza fraca a Fogo; Fogo fraco a Água; Água fraca a Trevas.
          - *Resistências Intrínsecas (-50% dano):* Natureza resiste a Terra; Fogo resiste a Fogo; Trevas resistem a Luz; dano do mesmo elemento do alvo também é resistido.
      -   A defesa (`this.attributes.defence`) atenua o dano restante e o resultado é subtraído do HP da entidade.

  5.  **Verificação de Morte (Domain - Entity):**
      -   Após aplicar o dano, `takeDamage` verifica se `this.attributes.hp <= 0`.
      -   Se o HP for zero ou menos, a entidade muda seu estado para `'dead'` e dispara um evento `despawn` para si mesma.

  6.  **Remoção da Entidade (Domain - `ObjectElementManager`):**
      -   O `ObjectElementManager`, que ouve o evento `'despawn'`, recebe o ID do inimigo e o remove de seu mapa `elements`. A partir do próximo frame, o inimigo não existe mais no domínio.

#### 3.6.1. AttackBuilder e Composição Fluente de Ataques (`AttackBuilder.ts`)

  Para evitar construtores telescópicos e acoplamento rígido em armas, magias e classes, o `AttackBuilder` provê uma interface fluente para parametrizar instâncias de `Attack`:
  - **Escalonamento Multifatorial:** Suporte a escalonamento de múltiplos atributos primários (`strength`, `dexterity`, `intelligence`, `wisdom`, `constitution`).
  - **Fórmulas de Crítico e Execução:** Configuração de chance extra de crítico, multiplicador de dano crítico, crítico garantido e limite percentual de vida para Coup de Grâce / Execução (`withExecuteThreshold`).
  - **Bônus Situacionais de Arquétipo:** Multiplicadores dedicados contra mortos-vivos (`withUndeadBonus`) e chefes (`withBossBonus`).
  - **Interceptadores de Recursos e Efeitos:** Vampirismo percentual (`withExtraLifestealPercent`), drenagem de mana (`withManaLeechAmount`), física de repulsão (`withKnockback`) ou sucção (`withVacuum`), e injeção probabilística de status (`withBurn`, `withFreeze`, `withStun`, `withPoison`, etc.).
  - **Dano em Área e Ricochete:** Suporte nativo a dispersão radial (`withRadialAoE`) e ricochete entre alvos (`withChainRicochet`).

#### 3.6.2. Motor Gramatical de Runas e Magias (`RuneGrammarEngine.ts` & `MageSpellCraftingRegistry.ts`)

  O sistema de magia da classe Mago e conjuradores cognitivos é fundamentado em uma gramática de runas combinatórias executadas pelo `RuneGrammarEngine`:
  - **Fusão Adjacente Canônica (Deep-2):** Glifos adjacentes no buffer de digitação do jogador são fundidos par a par segundo a matriz de elementos primários (ex: Fogo + Terra = Magma, Fogo + Ar = Relâmpago, Água + Terra = Lama, etc.).
  - **Operador Axiomático de Negação / Dispel:** A runa de Negação (`negation`) atua como anulação e purga axiomática de buffs e debuffs mágicos. Quando combinada com certas ordens materiais inválidas, gera dissipação instável de mana (*fizzle*); quando estruturada com `self + potencia + negation + magic`, conjura a Lâmina Anti-Magia com purga de status mágicos adversos.
  - **Auto-Cast por Inatividade:** O `Mage` processa um buffer circular de até 9 glifos, disparando auto-cast determinístico assim que o jogador cessa a digitação por uma janela temporal configurada, garantindo fluidez e responsividade de combate.

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

### 3.9. Fluxo de Diálogo com NPC (`dialogue`)

  Este fluxo descreve como o jogador conversa com um NPC cognitivo, desde a aproximação física até a resposta gerada por IA.

  ```mermaid
  sequenceDiagram
    participant P as Player
    participant IE as InteractiveEntity
    participant CNPC as CognitiveNPC
    participant DG as DialogueGateway
    participant LLM as Ollama (LLM)
    participant PV as PraxisValidator
    participant DA as DialogueAdapter
    participant UI as DialogueGui

    P->>IE: Colisão (interactionRadius)
    IE->>UI: dispatch('npcInteractable', prompt)
    P->>IE: Tecla "E" (onInteract)
    IE->>CNPC: onInteract(player)
    CNPC->>DG: startDialogue(npcId, context)
    DG->>LLM: prompt(personalidade + crenças + input)
    LLM-->>DG: resposta bruta
    DG->>PV: validate(rawAction)
    PV-->>DG: { valid, sanitizedAction }
    DG->>CNPC: executeAction(sanitizedAction)
    CNPC->>DA: dispatch('npcDialog', { text, options })
    DA->>UI: renderDialogue(text, options)
    UI-->>DA: playerChoice
    DA->>DG: continueDialogue(choice)
  ```

  1.  **Aproximação (Colisão):** O `Player` entra no `interactionRadius` do NPC. O `InteractiveEntity` dispara `npcInteractable` para exibir o prompt "E" na UI.
  2.  **Ativação:** O jogador pressiona "E". O `ActionManager` roteia para `onInteract(player)`.
  3.  **Deliberação Cognitiva:** O `CognitiveNPC` monta prompt contextual (personalidade + crenças BDI + histórico) e o envia via `DialogueGateway` para o Ollama local.
  4.  **Validação (PraxisValidator):** A resposta bruta do LLM é parseada e validada. Tokens perigosos são bloqueados.
  5.  **Execução e Renderização:** A ação sanitizada é executada no NPC. O evento `npcDialog` é disparado, e o `DialogueAdapter` renderiza a resposta na `DialogueGui`.
  6.  **Balão Flutuante:** Falas rápidas (não-interativas) usam o evento `npcSpoke`, que o `DialogueAdapter` renderiza como `FloatingChatGui` (balão overhead com vida de 2-8s).

### 3.10. Fluxo de Inventário (`inventory`)

  Este fluxo descreve a coleta, equipamento e uso de itens.

  ```mermaid
  flowchart LR
    A[DroppedItem no Chão] -->|Colisão HitBox| B[player.backpack.add]
    B --> C[dispatch 'itemCollected']
    C --> D[CharacterMenuGui atualiza slots]
    D -->|Clique Equipar| E[InventoryGateway.equipItem]
    E --> F[Player.equipment.equip]
    F --> G[dispatch 'equipmentChanged']
    G --> H[VisualComposer recalcula layers]
    D -->|Clique Usar| I[InventoryGateway.useItem]
    I --> J[Consumable.use target]
    J --> K[Effect.apply]
  ```

  1.  **Coleta:** Colisão Player→DroppedItem empurra o `Item` para `player.backpack`. Evento `itemCollected` dispara e o `DroppedItem` faz `despawn`.
  2.  **Equipamento:** `InventoryGateway.equipItem(slotType, itemId)` valida slot anatômico e transfere da mochila para o slot. Evento `equipmentChanged` dispara recálculo do Paper Doll visual.
  3.  **Uso:** `InventoryGateway.useItem(itemId)` executa `consumable.use(player)`, aplicando efeitos (heal, boost, etc.) e removendo da mochila.

### 3.11. Fluxo de Habilidades (`skills`)

  Este fluxo descreve o desbloqueio e uso de habilidades na Árvore e no Loadout.

  ```mermaid
  flowchart TD
    A[Level Up] -->|dispatch 'levelUp'| B[Ganho de Skill Points]
    B --> C[SkillTreeGui abre]
    C -->|Clique no Nó| D[SkillTreeGateway.unlockSkill]
    D --> E{Pré-requisitos OK?}
    E -->|Sim| F[Skill.unlock - consome pontos]
    E -->|Não| G[Rejeita]
    F --> H[SkillTreeGateway.equipSkill]
    H --> I[Player.activeLoadout atualiza]
    I -->|Em combate, tecla 1-4| J[ActionManager.executeLoadoutSkill]
    J --> K[Skill.activate - dispara spawn/efeito]
  ```

  1.  **Desbloqueio:** No Level Up, o jogador ganha Skill Points. Na `SkillTreeGui`, clica em um nó para desbloqueá-lo via `SkillTreeGateway.unlockSkill()`.
  2.  **Validação Topológica:** O gateway verifica se pré-requisitos estão satisfeitos e se há pontos suficientes.
  3.  **Equipamento:** Skill desbloqueada é equipada em um dos 4 slots do `activeLoadout` via Drag & Drop.
  4.  **Execução:** Em combate, teclas 1-4 ativam o slot correspondente. O `ActionManager` roteia para `Skill.activate()`, que dispara eventos de spawn, efeitos ou buffs.

### 3.12. Fluxo de Recompensas (`reward`)

  Este fluxo descreve a geração de loot ao derrotar inimigos.

  1.  **Gatilho:** O `RewardManager` escuta o evento `despawn` de entidades do tipo `Enemy`.
  2.  **Geração:** O `RewardGenerator` calcula o loot baseado no tipo do inimigo, nível do jogador e atributo de sorte. Usa rolagens ponderadas e tiers de raridade.
  3.  **Spawn:** Para cada item gerado, dispara `spawn` com tipo `droppedItem` nas coordenadas do inimigo morto.
  4.  **Moedas:** `AddCoinsEffect` é aplicado diretamente ao `Player.coins` sem criar entidade no chão.

### 3.13. Fluxo de Troca de Adaptador (`adapterSwitch`)

  Este fluxo descreve a transição entre o Lobby 3D e o gameplay 2D.

  ```mermaid
  sequenceDiagram
    participant Menu as MainMenuGui
    participant AM as AdapterManager
    participant L3D as Lobby3DAdapter
    participant GA as GameAdapter
    participant DF as DomainFacade

    Menu->>DF: dispatch('switchToGameplay', mapId)
    DF->>AM: onSwitchToGameplay
    AM->>L3D: destroy()
    L3D-->>AM: DOM limpo
    AM->>GA: new GameAdapter(domain)
    GA->>GA: initialize()
    GA->>DF: loadWorld(mapId)
    DF-->>GA: world gerado
    GA->>GA: startGameLoop()
  ```

### 3.14. Fluxo de Telemetria (`telemetry`)

  Coleta contínua e não-intrusiva de métricas a cada frame com profiling granular e Zero-GC.

  1.  **Ativação In-Game via Tecla [F3]:** A telemetria e o profiling em tempo real são ligados/desligados ao pressionar **`[F3]`** (ou `toggleTelemetry()`). Enquanto o painel de telemetria estiver ativo, o jogo emite periodicamente no console do navegador e no terminal nativo do Tauri a análise de performance completa.
  2.  **Separação Arquitetural Estrita (Domínio vs. Adapters):** O monitoramento isola as métricas entre a camada pura de **Domínio** (`Domain / *`) e a camada de **Adapters** (`Adapters / *`). Como o Domínio é naturalmente mais leve que o pipeline gráfico, avaliar o consumo de lógica apenas como `% do frame total` mascara gargalos graves no código de regras/física. Assim, cada arquivo recebe tanto a sua fatia global (`pct` / `% Tot`) quanto seu peso relativo estrito dentro de sua própria camada (`layerPct` / `% Dom` ou `% Adap`).
  3.  **Profiling Dinâmico por Objetos Vivos (`ObjectElementManager`):** Rastreia em tempo real a execução de todas as entidades ativas do jogo (`Slime.ts`, `Goblin.ts`, `DynamicProjectile.ts`, `Derocar.ts`, `Molor.ts`, etc.) através da classe (`element.constructor.name`), acumulando tempo e quantidade de instâncias (`count`) sem alocações per-frame (Zero-GC).
  4.  **Emissão no Terminal do Tauri (Duas Tabelas ANSI Distintas):** A cada 3 segundos com o `F3` ativado, o `WebWindowManager` despacha via IPC duas tabelas estruturadas independentes:
      - `[ DOMÍNIO - Lógica, Física & Entidades ]` exibindo `#`, `Arquivo`, `Módulo`, `Qtd`, `Tempo`, `% Dom` e `% Tot`.
      - `[ ADAPTADORES - Render, UI & Infra ]` exibindo `#`, `Arquivo`, `Módulo`, `Qtd`, `Tempo`, `% Adap` e `% Tot`.
      O backend nativo Rust (`log_config.rs`) colore os cabeçalhos de Domínio em magenta e Adapters em ciano.
  5.  **HUD In-Game (`TelemetryUI`):** O painel visual renderiza dois cards separados com barras de progresso dedicadas: um para **Top Domínio (Lógica & Entidades)** e outro para **Top Adaptadores (Render & UI)** com multiplicadores de instâncias (`[xN]`).
  6.  **Buffer Circular & Exportação:** Métricas são armazenadas em um buffer fixo de 50 entradas. `saveTelemetryLog()` via `TauriIPC` salva no encerramento (`beforeunload`) os arquivos `logs/latest.log` e `logs/metrics.log` no disco (Tauri) ou dispara download Blob (web).

### 3.15. Fluxo de Save/Load (`persistence`)

  1.  **Save:** O `RepositoryAdapter` serializa o estado global (nível, XP, inventário, árvore de skills, moedas) via `saveProgress()`. Dados são criptografados com XOR cipher + Base64 e gravados em `localStorage` (web) ou filesystem nativo (Tauri).
  2.  **Load:** `loadProgress()` descriptografa e valida integridade. Injeta o estado de volta no `DomainFacade`.
  3.  **Export/Import:** `exportSave()` gera string criptografada para backup. `importSave()` valida e restaura.

### 3.16. Fluxo de Transição de Mundos e InnerMaps (`transitionWorld`)

  O ciclo de transição de mapas orquestrado pela `DomainFacade` opera em 6 fases assíncronas estritas:
  1.  **Limpeza Preservada:** `ObjectElementManager.clearWorldElements(true)` expurga todas as entidades dinâmicas do mapa anterior, preservando o estado do `Player`.
  2.  **Sincronização de Coleta:** Sincroniza o conjunto de itens coletados (`collectedWorldItems`) para não respawnar itens já obtidos.
  3.  **Instanciação Dinâmica:** `createWorldInstance(targetMapId)` resolve a classe de mapa concreta (ex: `VilgemWorld`, `InteriorBlackDefaultWorld`).
  4.  **Atualização de Limites & Chunks:** Atualiza os limites espaciais (`world.bounds`) e reinicializa o `ChunkManager` para o novo mundo.
  5.  **Resolução de Spawn e Retorno:** Reposiciona o jogador no ponto de spawn especificado ou calcula a porta de retorno segura registrada (`lastEnteredPortalReturnByMap`) quando saindo de um InnerMap para o mundo exterior.
  6.  **Geração e Notificação:** Executa `world.generate()` e despacha o evento semântico `mapTransitionCompleted` com as coordenadas finais para sincronização dos adaptadores.

### 3.17. Fluxo de Reset de Run e Ciclo Roguelite (`resetRunState`)

  Ao término de uma run (morte do jogador ou reinício de ciclo):
  1.  **Preservação Meta-Progressiva:** Os broches desbloqueados e equipados no loadout permanente (`passiveLoadout` e `globalActiveLoadout`) são clonados e preservados.
  2.  **Reset de Estado Efêmero:** Nível e atributos são resetados para o nível 1 base da run, reaplicando em seguida os bônus fixos da Árvore Global (`MetaProgressionManager.applyGlobalBonuses()`). HP e Mana voltam ao máximo base.
  3.  **Limpeza de Inventário e Equipamentos:** Mochila, moedas temporárias da run e equipamentos equipados (`mainHand`, `helmet`, `chestplate`, etc.) são completamente limpos.
  4.  **Restauração de Habilidades:** Habilidades e cooldowns da classe ativa são reinicializados para o estado inicial via `PlayerClassManager.resetRun()`.
  5.  **Reinstalação dos Broches & Cinemática:** Broches permanentes são reinstalados nos slots 1..4 de passivos e 5..8 de ativos. O jogador é revivido (`revive()`) e reposicionado nas coordenadas de spawn iniciais com hitboxes atualizadas.
  6.  **Sincronização com a UI:** Dispara `inventoryUpdated` e eventos de atributos para atualizar toda a interface gráfica.

### 3.18. Fluxo de Transição de Estado de Cenário & Abertura de Portões (`triggerAssetState` & `assetStateChanged`)

  Permite que NPCs cognitivos (BDI), sistemas de quests, alavancas e scripts do mundo modifiquem dinamicamente o estado visual e a física de elementos do cenário (como um guarda abrindo ou fechando os portões de pedra do castelo):

  1.  **Gatilho de Ação:** O NPC executa ações contextuais como `guardNpc.openGate('stone_wall_gate')` ou `guardNpc.closeGate('stone_wall_gate')`, ou uma entidade/quest despacha diretamente o evento `triggerAssetState` com o DTO `TriggerAssetStateDTO`.
  2.  **Filtragem Espacial Inteligente por AABB:** O `ObjectElementManager.handleTriggerAssetState()` localiza o elemento pelo `elementId`, `presetType` ou `nearCoordinates`. Para estruturas arquitetônicas amplas (como o portão `stone_wall_gate` de 396px de largura e 250px de altura), o cálculo afere a distância euclidiana do ponto de consulta até a borda mais próxima da caixa delimitadora (AABB) do asset (`Math.max(min, Math.min(q, max))`), eliminando falsos negativos quando a entidade está nas laterais ou batentes da estrutura.
  3.  **Transição de Estado no Domínio:** Invoca `sceneryElement.setState(targetState, passable)` (ou `open()` / `close()`). O elemento atualiza seu estado semântico (`'static'`, `'open'`, `'idle'`) e sua flag de colisão física `passable`.
  4.  **Sincronização de Colisão Física:** Se `passable: true`, o `ObjectElementManager` remove a entidade dos colisores estáticos bloqueantes via `collisionManager.removeStaticCollider()`; se `passable: false`, o elemento é imediatamente re-adicionado ao grid de colisão via `collisionManager.addStaticCollider()`. Assim, jogadores e inimigos podem atravessar livremente o vão aberto sem serem barrados pela física estática.
  5.  **Notificação Semântica Tipada:** O elemento despacha o evento `assetStateChanged` com `AssetStateChangedDTO` (`elementId`, `presetType`, `previousState`, `currentState`, `passable`).
  6.  **Reação da Apresentação (RenderModule):** O `DomainRenderState` reflete o novo estado na fotografia do frame (`RenderableState.state`). O `GameObjectElement` detecta a transição e troca instantaneamente o `SpriteConfig` de `stone_wall_gate-static` (imagem limpa de 1 frame) para `stone_wall_gate-open` (spritesheet animada de 4 frames), com cache Zero-GC via `RenderRegistry`.

### 3.19. Fluxo de Particionamento Espacial e Chunks Infinitos (`WorldChunkManager & Origem Central`)

  O sistema de mundo adota o particionamento espacial contínuo por chunks inteiros assinados $(cx, cy) \in \mathbb{Z} \times \mathbb{Z}$ (estilo Minecraft) gerenciado pelo `WorldChunkManager`:

  1.  **Origem Central no Spawn:** A praça central e o ponto de spawn inicial de Vilgem residem no Chunk `(0, 0)` (dimensões `[0..1024, 0..1024)` e spawn em `(512, 591)`). Chunks circundantes usam coordenadas inteiras assinadas relativas ao centro: Norte (`cy < 0`), Oeste (`cx < 0`), Sul (`cy > 0`), Leste (`cx > 0`). Expansões modulares com muralhas e novos distritos nunca deslocam coordenadas relativas nem hitboxes existentes.
  2.  **Chave Inteira Zero-GC de 32 bits:** A indexação dos chunks em mapas usa a função hash `(cx << 16) ^ (cy & 0xffff)` sem instanciar strings temporárias (`${cx},${cy}`) no loop quente da simulação.
  3.  **Janela Ativa 3x3:** Apenas os 9 chunks adjacentes ao chunk ocupado pelo jogador são mantidos ativos a cada frame para física de colisão, simulação de IA e renderização no `DomainRenderState`. Elementos em chunks distantes ficam em repouso, garantindo 60 FPS estáveis mesmo com mapas imensos.
  4.  **Notificação de Travessia:** Sempre que o jogador cruza a fronteira para um novo chunk, o `WorldChunkManager` despacha o evento tipado `activeChunkChanged`, permitindo que os adaptadores visuais façam streaming de texturas e chunks de forma proativa.

### 3.20. Fluxo de Salvamento Obrigatório ao Quitar e Retenção de Coordenadas (`quitSave`)

  Garante a preservação estrita do progresso do jogador e a prevenção de bugs de teletransporte involuntário ao sair da sessão:

  1.  **Salvamento Obrigatório Antes de Sair:** No acionamento de encerramento (clique em `#pm-btn-quit` no menu de pausa ou fechamento do cliente), o `PauseMenuGui` e o `GameAdapter` disparam atomicamente a persistência do save slot atual antes de invocar callbacks de saída ou descarregar a cena.
  2.  **Retenção Fiel de Posição:** O DTO de persistência grava com precisão as coordenadas espaciais atuais do jogador (`coordinates.x`, `coordinates.y`) e o `currentMapId`.
  3.  **Restauração Autêntica:** Ao recarregar a partida via `loadWorld` e `loadProgress`, a `DomainFacade` inicializa o avatar exatamente na posição salva no mundo, sem reposicioná-lo arbitrariamente no spawn da cidade.

### 3.21. Desacoplamento da Facade de Domínio (Prevenção de God Class)

  Para aderir estritamente ao Princípio da Responsabilidade Única (SRP) e impedir o crescimento da `DomainFacade` como *God Class*:
  - Métodos granulares de manipulação (`manageInventory`, `manageSkillTree`, `allocateAttribute`) não residem na Facade.
  - As interfaces de apresentação (GUIs) comunicam intenções através de eventos semânticos no barramento (`EventBus`) ou via Gateways especializados (`InventoryGateway`, `SkillTreeGateway`, `DialogueGateway`, `ToolActionGateway`).
  - A Facade atua exclusivamente como orquestrador de alto nível e delegador para os subsistemas responsáveis.

### Diagrama Geral de Comunicação entre Módulos

  ```mermaid
  flowchart TB
    subgraph DOMÍNIO
      DF[DomainFacade]
      OEM[ObjectElementManager]
      CM[CollisionManager]
      WCM[WorldChunkManager]
      P[Player]
      E[Enemies]
      NPC[CognitiveNPCs]
      RM[RewardManager]
      IG[InventoryGateway]
      SG[SkillTreeGateway]
      MPM[MetaProgressionManager]
      DG[DialogueGateway]
      TPB[TauriPanteaoBridge]
      IMR["IntermapRegistry & Portals"]
      EB["EventBus (gameEvents)"]
    end

    subgraph ADAPTADORES
      AM[AdapterManager]
      GA[GameAdapter]
      GEB[GameEventBinder]
      SM[SceneManager]
      UM[UIManager]
      IM[InputManager]
      IGW[InputGateway]
      DA[DialogueAdapter]
      TA[TelemetryAdapter]
      RA[RepositoryAdapter]
    end

    subgraph EXTERNO
      LLM[Ollama LLM]
      BDI[Panteão BDI - Rust]
      GPU[WebGPU / Canvas2D]
      FS[Filesystem / localStorage]
    end

    IGW -->|ações semânticas| DF
    DF -->|update + getRenderState| GA
    GA -->|syncRenderables| SM
    SM -->|draw| GPU
    DF --> OEM
    DF --> MPM
    DF --> IMR
    OEM --> WCM
    OEM -->|plainElements| CM
    CM -->|Worker Async| CM
    P -->|playerMoved| EB
    EB -->|spawn, despawn, levelUp, triggerAssetState| OEM
    OEM -->|assetStateChanged, activeChunkChanged| EB
    EB -->|particle, spawnVisual| GEB
    GEB --> SM
    EB -->|npcSpoke, npcDialog| DA
    E -->|morte| RM
    RM -->|spawn droppedItem| EB
    NPC -->|openGate / intenções de cenário| OEM
    NPC -->|sendPerception| BDI
    NPC -->|prompt| LLM
    BDI -->|IPC Bridge| TPB
    TPB --> DF
    DG -->|PraxisValidator| NPC
    IG --> DF
    SG --> DF
    TA -->|snapshot| FS
    RA -->|save/load| FS
  ```

## 4. Guia do Desenvolvedor (Onde estão os arquivos?)

  Para responder à principal dor do desenvolvedor: *"Para adicionar uma coisa, em quais arquivos eu tenho que ir?"*. A arquitetura **Data-Driven Centralizada** reduziu isso para **no máximo 3 ou 4 arquivos** bem específicos, sem espalhar lógica por dezenas de lugares.

  Aqui está o mapa exato dos arquivos que você precisa tocar para expandir o jogo.

  ### 4.1. Como Criar um Novo Inimigo (Ex: "Goblin")

  Você só precisa tocar em **2 arquivos** (um no Domínio, um no Adaptador Web):

  1. **A Lógica (Domínio):**
     - **Crie o arquivo:** `typescript/domain/ObjectModule/Entities/Enemies/Goblin.ts`
     - Estenda a classe `Enemy`.
     - Use o decorator `@RegisterSpawner('goblin')` antes da classe para que a engine saiba instanciá-lo automaticamente sem if-elses.
  2. **O Visual (Adaptador Web):**
     - **Edite o arquivo:** `typescript/adapters/web/shared/VisualConfigMap.ts`
     - Vá na categoria `'enemies'` (ou adicione uma nova chave na raiz do map para entidades genéricas) e adicione a chave `'goblin'`. Aponte a URL da imagem PNG e defina os frames das animações (`idle`, `walking`, etc.). O Adaptador Web fabricará a textura dinamicamente.

  ### 4.2. Como Criar um Novo Item ou Equipamento (Armadura, Consumível, Arma)

  Você precisa tocar em **2 a 3 arquivos**, dependendo se ele tem um efeito especial novo.

  1. **A Lógica (Domínio):**
     - **Crie o arquivo:** Ex: `typescript/domain/ObjectModule/Items/Armors/GoldenHelmet.ts` (ou em `Consumables/` ou `Weapons/`).
     - Estenda a classe base adequada (`Helmet`, `Consumable`, `Weapon`).
     - No `constructor()`, defina o atributo `iconId` único do item (ex: `15`). Esse ID é a "cola" entre o Domínio cego e a Renderização visual.
  2. **O Efeito (Opcional - Domínio):**
     - Se o item tiver um efeito novo (ex: Veneno), crie a lógica em: `typescript/domain/ObjectModule/Items/Effects/PoisonEffect.ts`.
  3. **O Visual (Adaptador Web):**
     - **Edite o arquivo:** `typescript/adapters/web/shared/VisualConfigMap.ts`
     - Adicione a chave com o nome do item. É **crucial** que você defina a propriedade `iconId: 15` para bater com a lógica do Domínio. Defina os states `idle`, `walking` (se for equipamento que o player veste) ou apenas a sprite solta (se for item de chão).

  ### 4.3. Como Criar uma Magia, Projétil ou Ataque Animado (Ex: Bola de Fogo ou Corte de Foice)

  Você precisa tocar em **3 arquivos** (Lógica, Configuração Visual e Hitbox JSON).

  1. **A Hitbox Poligonal (Editor Web):**
     - **Não crie arquivos à mão.** Use a interface do jogo: abra o console e rode `toggleDebugMode()`, depois abra o **Hitbox Editor Tool**. Carregue o PNG da magia, desenhe a área de dano, e **exporte o arquivo JSON**.
     - Salve o JSON em: `assets/hitboxes/nome_da_magia.json` (ou apenas copie o conteúdo JSON).
  2. **A Lógica (Domínio):**
     - **Crie o arquivo:** `typescript/domain/ObjectModule/Entities/projectiles/Fireball.ts` (ou em `MeleeWeapons/AxeSlash.ts`).
     - Estenda `DynamicProjectile` ou `AnimatedMeleeAttack`.
     - Cole a string JSON da hitbox diretamente dentro da classe, ou use o `HitboxParser` para deserializar. Use o decorator `@RegisterSpawner('fireball')`.
  3. **O Visual (Adaptador Web):**
     - **Edite o arquivo:** `typescript/adapters/web/shared/VisualConfigMap.ts`
     - Adicione a entrada visual da magia (categoria `projectile`), apontando para a imagem png respectiva.

  ### 4.4. Como Adicionar um Novo NPC Cognitivo (IA Conversacional via Panteão/Ollama)

  Como os NPCs possuem Inteligência Artificial baseada no modelo Belief-Desire-Intention (BDI), você precisa configurar o modelo mental dele em um arquivo à parte.

  Você precisa tocar em **3 arquivos**:

  1. **A Lógica da Entidade (Domínio):**
     - **Crie o arquivo:** `typescript/domain/ObjectModule/Entities/NPCs/Molin/Molin.ts`
     - Estenda a classe `CognitiveNPC`. Configure no construtor a personalidade base e o `npcId` (ex: `'molin'`).
  2. **A Mente BDI (Motor Panteão em AgentSpeak):**
     - **Crie o arquivo:** `typescript/domain/ObjectModule/Entities/NPCs/Molin/molin.asl`
     - Este é o arquivo de código AgentSpeak. Aqui você não escreve TypeScript, mas as crenças e planos do NPC. Ex: `+player_nearby : true <- greet.`.
  3. **O Registro da Engine BDI:**
     - **Edite o arquivo:** `typescript/domain/ObjectModule/Entities/NPCs/project.jcm`
     - Este é o manifesto que diz ao motor Panteão Rust quais cérebros existem. Adicione uma linha: `agent molin : Molin/molin.asl`.

  ### 4.5. Como Adicionar ou Modificar uma Nova Interface de Usuário (GUI)

  As interfaces são dissociadas do Canvas do jogo. Ficam no adaptador web. Você precisará tocar em **3 arquivos coesos** em um mesmo diretório.

  1. **A Estrutura Visual (Adaptador Web):**
     - Vá para `typescript/adapters/web/GUIS/` e crie a pasta da sua UI, ex: `XpBarGui/`.
     - **Crie 2 arquivos visuais:** `xpbar.html` e `xpbar.css`.
  2. **A Lógica Reativa (Adaptador Web):**
     - **Crie 1 arquivo lógico:** `XpBarGui.ts` na mesma pasta.
     - Esta classe deve carregar o HTML/CSS, escutar o Event Bus do domínio (ex: `gameEvents.on('xpChanged', ...)`), e mutar os elementos DOM com as atualizações usando document.getElementById.
  3. **Injeção da GUI:**
     - **Edite o arquivo:** `typescript/adapters/web/components/UIManager.ts`.
     - Instancie sua `XpBarGui` no construtor do UIManager. O jogo cuidará do resto.
   ### 4.6. Taxonomia Semântica de Habilidades, Broches e Formas Geométricas (Design System de UI)

   O jogo divide estritamente os poderes do jogador em **4 sets funcionais de habilidades**, além dos **atributos cumulativos** da árvore global. Cada categoria possui uma forma geométrica canônica e semântica expressa na interface gráfica:

   | Categoria | Origem | Quantidade de Slots | Gatilho / Tecla | Formato Visual Canônico (SVG / CSS) |
   |---|---|---|---|---|
   | **Ativas da Classe** | Árvore de Classes | 1 a 4 slots | Teclas numéricas `[1]` a `[4]` | **Quadrado** com cantos levemente arredondados (`square-slot`) |
   | **Ativas Primordiais / Essenciais** | Habilidade central da Classe (ex: Peixe do Pescador) | 1 slot dedicado | Tecla específica de ativação | **Estrela** de 4/8 pontas estilizada em SVG (`primordial-slot`) |
   | **Broches Ativos** | Árvore Global | 1 a 6 slots | Teclas de atalho | **Círculo com espinhos em volta (Sol)** em SVG (`sun-brooch-slot`) |
   | **Broches Passivos** | Árvore Global | 1 a 4 slots | Sem botão (Numerais Romanos `I` a `IV`) | **Triângulo Truncado** em SVG (`triangle-passive-slot`) |
   | **Atributos Acumulativos** | Árvore Global | Infinitos (Escala contínua) | Passivo permanente | **Círculo / Orbe** em flex com scroll fluido (`cumulative-attr-orb`) |

   **Diretrizes Arquiteturais e de Interface:**
   - **Broches são Habilidades Globais:** Não existe aba ou lista separada de "Broches Relicários". Os broches *são* os broches ativos (1-6) e passivos (I-IV) equipados e vinculados à meta-progressão.
   - **Escalabilidade Infinita de Atributos:** Os atributos cumulativos da árvore global podem crescer indefinidamente. A interface utiliza um container com rolagem suave (`overflow-y: auto`) e tags circulares compactas com tooltips detalhados, garantindo que novos nós de meta-progressão não quebrem o layout.
   - **Consistência de Feedback Visual:** Cada formato geométrico reage ao estado de preenchimento (`.filled`) com gradientes radiais correspondentes à sua classe ou raridade, glow temático e tooltip completo.

   ### 4.7. Como Criar um Elemento de Cenário Interativo com Troca Dinâmica de Asset para Sprite (Ex: Portões de Castelo, Portas, Alavancas)

   Para criar elementos de cenário que transitam de imagem estática para spritesheet animada e alternam sua física de passagem:

   1. **A Configuração Visual e de Sprites (Adaptador Web):**
      - Em `typescript/adapters/web/shared/VisualConfigMap.ts`:
        - Defina o preset (ex: `'stone_wall_gate'`).
        - Configure o estado `'static'` apontando para o asset estático limpo (ex: `stone_wall_gate_clean.png` com `frameCount: 1`).
        - Configure os estados animados como `'open'` e `'idle'` apontando para a spritesheet com múltiplos frames (ex: `stone_wall_gate_anim.png` com `frameCount: 4`).
   2. **O Registro de Hitbox & Dimensões (Domínio):**
      - Em `typescript/domain/ObjectModule/Scenery/SceneryRegistry.ts`:
        - Registre as dimensões base do elemento em `SCENERY_ASSET_BASE_SIZES` (ex: `stone_wall_gate: { width: 396, height: 250 }`).
        - Caso possua hitboxes de colisão sólidas, registre em `SCENERY_ASSET_HITBOXES` com polígonos ou círculos que respeitam a escala do mundo.
   3. **O Ciclo de Spawn e Transição (Domínio):**
      - Instancie via spawner do domínio: `objectManager.spawn(id => new SceneryElement(id, coords, eventManager, 'stone_wall_gate'))`.
      - O elemento inicia como `'static'` com `passable: false` (bloqueando a passagem).
   4. **Gatilhos de Acionamento Cognitivo ou por Evento:**
      - **Por NPC Cognitivo:** Um guarda com cérebro BDI pode executar:
        ```typescript
        guardNpc.openGate('stone_wall_gate'); // Abre o portão mais próximo num raio de 400px
        guardNpc.closeGate('stone_wall_gate'); // Fecha o portão mais próximo
        ```
      - **Por Evento Global:** Sistemas de quests ou triggers de mapa podem emitir:
        ```typescript
        eventManager.dispatch('triggerAssetState', {
          presetType: 'stone_wall_gate',
          targetState: 'open',
          passable: true,
          nearCoordinates: { x: player.coordinates.x, y: player.coordinates.y, radius: 250 }
        });
        ```
      - O Domínio valida o alcance via proximidade da AABB, altera `passable`, sincroniza os colisores no `CollisionManager` (`removeStaticCollider`/`addStaticCollider`), emite `assetStateChanged`, e o `GameObjectElement` na apresentação comuta a imagem para a spritesheet animada.


## 5. Arquitetura de Testes e Garantias de Engenharia

  A suíte de testes é orientada por 4 pilares fundamentais e utiliza **Vitest** como framework de testes com ambiente `node` (e `jsdom` para testes de UI).

  ### 5.1. Pilares de Garantia

  1. **Determinismo & Reprodutibilidade:** Eliminação de entropia não controlada para viabilizar replays e save states consistentes. Hashing de estado SHA-256 após múltiplos frames de simulação garante zero flutuação numérica.
  2. **Zero-Garbage Collection (Zero-GC):** Prevenção de stuttering por coleta de lixo. QuadTree recicla nós (`clear`), vetores usam operações `*Mut`, e testes auditam `heapUsed` durante 60 frames sob carga.
  3. **Isolamento Hexagonal & Fitness Functions:** O Domínio é 100% puro e agnóstico de infraestrutura. Testes automatizados varrem ASTs para garantir fan-out zero para UI/Browser (`window`, `document`) e classes concretas.
  4. **Fail-Fast & Segurança de IA:** Parsers (Hitbox, Spells, Ações) estouram no boot ao receberem schemas inválidos. O `PraxisValidator` bloqueia 100% dos payloads maliciosos ou alucinações geradas pelo Ollama.

  ### 5.2. Categorias de Testes

  | Categoria | Qtd Arquivos | Foco |
  |---|---|---|
  | **Regressão Automática (Regression Suites)** | 51+ | Blindagem contra reincidência de bugs (chunks, salvamento ao quitar, triggers de sprite, colisões, broches, UI) |
  | **Arquitetura (Fitness Functions)** | 4 | Pureza hexagonal, fan-out zero, CI workflows |
  | **Performance & Benchmarking** | 5 | Estresse de colisão, Memory Leak / Zero-GC, latência IPC, Render Thrashing |
  | **Estabilidade & Determinismo** | 4 | Hashing criptográfico de estado, Chaos Monkey |
  | **Compliance de Mapas & Catálogos** | 1 | Integridade sintática e semântica de catálogos (`VisualConfigMap`, portais, efeitos, ícones) |
  | **Integração** | 10 | Loop completo do jogo, Double Buffering, UI Ollama, parser PNG |
  | **Unitários** | 75+ | Matemática vetorial, QuadTree, Chunks, Entidades, Classes, Projéteis, Status, Itens, Armas, Mapas |

  ### 5.3. Scripts de Pipeline

  ```bash
  npm test                   # tsc --noEmit + vitest run
  npm run test:regression:fast # Execução instantânea de todas as suítes de regressão
  npm run test:maps:fast       # Validação sintática e estrutural de mapas e catálogos
  npm run test:coverage        # Cobertura detalhada de código V8 (meta mínima >= 70%)
  npm run coverage:report      # Geração do dashboard interativo em coverage/dashboard.html
  npm run test:perf          # Apenas testes de performance
  npm run test:stability     # Apenas testes de estabilidade
  npm run analyze            # Análise de código + detecção de dependências circulares (madge)
  npm run pipeline           # Suite completa: analyze + test
  ```

## 6. Build e Tooling

  | Ferramenta | Função |
  |-----------|--------|
  | **Vite** | Bundler e dev server |
  | **TypeScript** (`esnext`, `strict: true`) | Tipagem estrita com `noUncheckedIndexedAccess`, `experimentalDecorators` |
  | **Vitest** | Framework de testes com cobertura V8 |
  | **Tauri** | Envelopamento desktop (Rust → .exe / .AppImage) |
  | **madge** | Detecção de dependências circulares |
  | **Three.js** | Renderização 3D para o Lobby |
