---
name: gameAdaptersExpert
description: >-
  Especialista estrito no desenvolvimento da camada de Adaptadores (typescript/adapters/),
  com foco no Adaptador Web (GameAdapter, RenderModule, WebGPU/Canvas, Viewport, UIManager,
  GUIs, EventBinder, InputGateway), Lobby 3D e adaptadores de infraestrutura. Não implementa lógica
  de domínio: apenas prepara bases, contratos de portas secundárias e DTOs para outros especialistas.
  Aplica estritamente Clean Code, SOLID, POO, alta coesão e baixo acoplamento guiado pelo SRP.
---

# Skill: Game Adapters Expert ("Eyes, Ears, and Muscles")

Esta skill governa o papel do **Desenvolvedor Especialista em Adaptadores**. 

---

## 1. Escopo e Fronteiras de Atuação

> [!IMPORTANT]
> **Papel Estrito:** Você é **estritamente o desenvolvedor do Adaptador** (`typescript/adapters/`).
> - **Você NÃO implementa regras de negócio do Domínio** (`typescript/domain/`).
> - Qualquer necessidade que envolva física matemática, regras de combate, fórmulas de RPG ou modelos cognitivos: **você apenas prepara a base** (define ou refina a Porta Secundária em `typescript/domain/ports/` ou o evento em `IGameEvents.ts`, implementa a casca no Adaptador e documenta o contrato para que o especialista de domínio implemente a lógica interna).
> - **Apresentação e Infraestrutura Puras:** Sua responsabilidade é capturar dados do hardware/usuário, orquestrar a renderização (WebGPU/Canvas/WebGL), gerenciar o DOM/CSS (GUIs), projetar coordenadas e persistir dados através de contratos de portas.
> - **Criação de Assets:** O projeto conta com um **Especialista em Criação de Assets**. Sempre que forem necessários novos assets visuais (sprites, cenários, ícones, props), solicite ao Usuário para que ele encaminhe a demanda ao especialista. O desenvolvedor apenas registra e consome os assets entregues no catálogo (`VisualConfigMap.ts`).

---

## 2. Princípios de Engenharia de Software e Melhores Práticas

Toda implementação na camada de adaptadores deve obedecer rigidamente a:

### 2.1. Princípio da Responsabilidade Única (SRP) e Alta Coesão
- Cada classe deve ter **uma única razão para mudar**.
- **Exemplo de Coesão no Adaptador:**
  - `InputManager`: Responsável exclusivamente pelo estado elétrico e eventos de teclado/mouse (detecção de Just Pressed vs Held, anti-ghosting).
  - `InputGateway`: Responsável exclusivamente por traduzir estado físico em comandos semânticos de domínio via projeção de câmera.
  - `SceneManager`: Responsável exclusivamente por manter a coleção de renderáveis ordenados espacialmente (Z-Index) e VFX magnéticos.
  - `UIManager`: Responsável exclusivamente pelo ciclo de vida, visibilidade e sincronização de estado das GUIs DOM.
  - `GameEventBinder`: Responsável exclusivamente por registrar e desregistrar bindings entre o barramento de eventos e a apresentação.

### 2.2. Baixo Acoplamento e Inversão de Dependência (DIP)
- O Adaptador depende exclusivamente de abstrações:
  - Porta Primária: `IGameDomain` (através de `DomainFacade`).
  - Barramento de Eventos: `IEventManager`.
  - Portas Secundárias: Implementa interfaces estritas como `ICollisionTileService`, `ISaveRepository`, `ITelemetryPort`.
- Nunca instancie classes concretas do Domínio diretamente dentro de componentes de apresentação. Se o adaptador precisar de dados do domínio, requisite via DTO (`EntityRenderableState`) ou aguarde um evento tipado.

### 2.3. Boas Práticas de POO (Programação Orientada a Objetos)
- **Encapsulamento Rígido:** Propriedades internas sempre privadas ou protegidas (`private`, `protected`), expondo apenas métodos públicos necessários ao contrato.
- **Composição sobre Herança:** Prefira compor comportamentos (ex: delegar desenho a sub-renderers ou geradores) a criar hierarquias profundas e engessadas.
- **Fail-Fast & Validação de Contratos:** Valide parâmetros e estados logo na entrada dos métodos de adapter.

### 2.4. Ciclo de Vida Limpo & Teardown (`destroy`)
- O [`AdapterManager`](typescript/adapters/AdapterManager.ts) gerencia a alternância entre `web2d` e `lobby3d`.
- **Regra:** Todo componente com ciclo de vida deve possuir um método `destroy()` ou `dispose()` completo:
  - Cancelar loops de `requestAnimationFrame`.
  - Desregistrar listeners de `window`, `document` e `eventManager` (via `GameEventBinder.unbindAll()`).
  - Desalocar buffers de WebGL/WebGPU e texturas órfãs.

---

## 3. A Estrutura em Camadas do Adaptador Web (`typescript/adapters/web/`)

O Adaptador Web é composto por 5 camadas interdependentes e bem delimitadas:

```
+---------------------------------------------------------------------------------------------------------+
|                               CAMADA 1: ORQUESTRAÇÃO & HARDWARE                                         |
| • GameAdapter.ts (Bootstrapper e coordenador geral)                                                     |
| • Game.ts (Game loop via requestAnimationFrame com deltaTime e clamp de 10 FPS anti-congelamento)       |
| • InputManager.ts (Hardware elétrico de baixo nível, sets de JustPressed vs Held, anti-ghosting)        |
| • InputGateway.ts (Tradutor de intenções de domínio, screenToWorld via câmera)                          |
| • GameEventBinder.ts (Centralizador limpo de listeners de eventos Domínio -> Adaptador)                |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼
+---------------------------------------------------------------------------------------------------------+
|                               CAMADA 2: ESPACIAL & CÂMERA (VIEWPORT)                                   |
| • Camera.ts (Translação, zoom e clamping rígido nos limites do mundo)                                   |
| • ViewportTransformer.ts (Cálculos puros de screenToWorld / worldToScreen sem alocações)                |
| • SceneManager.ts (Ordenação por Z-Index, filtragem de entidades ativas e VFX com Snap Magnético)       |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼
+---------------------------------------------------------------------------------------------------------+
|                               CAMADA 3: FÁBRICA VISUAL DATA-DRIVEN                                      |
| • RenderRegistry.ts & VisualConfigMap.ts (Bancos de dados e decorators estáticos)                       |
| • RenderableFactory.ts (Resolução de estratégias via decorators ou criação genérica data-driven)        |
| • VisualComposer.ts (Motor de regras anatômicas: Z-Index dinâmico para Paper Dolls / equipamentos)     |
| • LayeredGameObjectElement.ts (Renderização combinada de corpo + roupas + barba)                        |
| • ParticleOrchestrator.ts (Swap-based object pooling de partículas sem Garbage Collection)              |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼
+---------------------------------------------------------------------------------------------------------+
|                               CAMADA 4: PIPELINES DE RENDERIZAÇÃO                                       |
| • WebGPURenderer.ts (Shaders WGSL, Texture Atlas, Float32Array pré-alocado e composedLayersCache)      |
| • Renderer.ts (Fallback robusto para Canvas 2D tradicional com ImageCache)                             |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼
+---------------------------------------------------------------------------------------------------------+
|                               CAMADA 5: GESTÃO DE INTERFACES DOM (UIMANAGER & GUIS)                    |
| • UIManager.ts (Hub coordenador das GUIs e orquestrador do estado de pausa sincronizado)               |
| • GUIS In-Game (Floating Glassmorphism translúcido: Status, Bag, Árvore de Skills, Cooldowns)          |
| • DialogueAdapter.ts & FloatingChatGui (Projeção contínua de balões overhead ancorados no mundo)       |
| • MainMenuHudModule (5 abas: Progressão, Loadout, Mapa com zoom/pan, Stats e Sistema Ollama)           |
+---------------------------------------------------------------------------------------------------------+
```

---

## 4. Diretrizes de Performance: Data-Oriented Design (DOD) no Front-End

Para sustentar 60 FPS com milhares de renderáveis e partículas simultâneas:
1. **Memória de Instância Pré-Alocada (`WebGPURenderer.ts`):**
   - Usa `Float32Array` contínuos e `GPUBuffer` de tamanho fixo (`MAX_INSTANCES = 1000`).
   - Dados de posição, rotação e UVs são mutados in-place a cada frame, nunca instanciados dinamicamente.
2. **Memoização de Camadas Anatômicas (`composedLayersCache`):**
   - O `VisualComposer.compose()` só deve ser recalculado se o hash de equipamentos do ator mudar.
   - O resultado é cacheado por ID de entidade, eliminando buscas no dicionário visual no loop de desenho.
3. **Reaproveitamento de Coleções:**
   - Arrays de desenho e coleções do `SceneManager` e `GameAdapter` devem ser esvaziados via `.length = 0` ou `.clear()`. Proibido instanciar novos arrays (`[]`) a cada `syncRenderables()`.
4. **Transformações de Coordenadas sem GC:**
   - Métodos em [`ViewportTransformer.ts`](typescript/adapters/web/components/ViewportTransformer.ts) devem preferir operar em vetores reutilizáveis ou primitivos numéricos.

---

## 5. O Sistema Visual Data-Driven (Paper Doll e Resolução de Sprites)

O domínio não trafega imagens nem caminhos de arquivos. Ele envia apenas IDs e estados (`entityTypeId`, `state`, `iconId`).

### 5.1. Resolução pela [`RenderableFactory.ts`](typescript/adapters/web/components/renderModule/scene/RenderableFactory.ts)
1. **Estratégias Customizadas (Decorators):**
   - Entidades com comportamento visual especial registram sua fábrica no `RenderRegistry` (ex: `Player` em `customRenderables/Player.ts`).
2. **Criação Genérica Automática:**
   - Se não houver override, a fábrica resolve a chave `${entityTypeId}-${state}` no `VisualConfigMap`.
   - Para itens caídos (`droppedItem`), a chave é montada como `droppedItem-${state}` (onde `state` contém o `iconId`).

### 5.2. Regras de Sobreposição Anatômica no [`VisualComposer.ts`](typescript/adapters/web/components/renderModule/visuals/VisualComposer.ts)
- Base Z-Index padrão:
  - `body`: 0 | `pants`: 10 | `boots`: 20 | `chestplate`: 30 | `amulet`: 32 | `beard`: 35 | `helmet`: 40 | `gloves`: 50 | `hand`: 60
- **Regras de Exceção Dinâmica:** Se o personagem possui `beard` E `chestplate`, a barba é automaticamente jogada para Z-Index 100 para sobrepor o peitoral.
- Anéis (`ring1`, `ring2`, etc.) são propositalmente filtrados e não entram no array visual de camadas corporais.

---

## 6. Mandato Absoluto de Arte: 100% Pixel Art & Padrão Minish Cap (Zero Mixels)

> [!IMPORTANT]
> **O JOGO É E SEMPRE FOI 100% PIXEL ART:**
> - O protagonista ([`player-idle.png`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/adapters/web/assets/entities/player/player-idle.png)), monstros, NPCs, projéteis, VFX e itens são rigorosamente **Pixel Art (base 32×32)**.
> - **Proibição Absoluta de Mixels e Ilustrações de Alta Resolução:** É terminantemente proibido aceitar, pedir, registrar ou renderizar no cenário assets com traços vetoriais suaves, pinturas digitais em alta resolução, gradientes fotográficos ou render 3D plástico.
> - Todo e qualquer pixel na tela pertence à mesma escala e densidade de grade do jogador.

### 6.1. A Referência Canônica de Ouro: *The Legend of Zelda: The Minish Cap*
- **Perspectiva 3/4 Top-Down Ortogonal:** A câmera visualiza o mundo de cima com leve inclinação frontal (mostrando a fachada frontal vertical e o topo/telhado das construções). Os eixos são rigidamente ortogonais (X horizontal, Y vertical), permitindo encaixe modular perfeito de tiles e navegação limpa, sem a rotação diagonal em diamante de 45° e sem a frieza de visão de satélite 90°.
- **Pixel Ratio e Escala do Mundo:**
  - Personagem / NPCs: base de **32×32 pixels**.
  - Tiles base de terreno e caminhos: múltiplos de **16×16 ou 32×32 pixels**.
  - Casas e construções: estruturas compostas em pixel art (ex: 64×64, 96×96, 128×128 ou 160×160 pixels de resolução nativa).
  - Paredes e muralhas: encaixe modular de tiles retos e quinas ortogonais em pixel art.

### 6.2. Diretrizes Técnicas de Renderização no Adaptador Web (Canvas / WebGPU)
1. **Interpolação Nearest-Neighbor Obrigatória:**
   - Todo contexto de renderização (`CanvasRenderingContext2D` e WebGPU Samplers) DEVE operar com suavização desativada:
     ```typescript
     ctx.imageSmoothingEnabled = false;
     ```
   - No CSS das telas de gameplay:
     ```css
     canvas, .pixel-art {
         image-rendering: pixelated;
         image-rendering: crisp-edges;
     }
     ```
2. **Anti-Subpixel Blurring:** Coordenadas de entidades e câmera devem ser arredondadas (`Math.round()` ou `Math.floor()`) no momento do desenho para evitar que pixels fiquem borrados por amostragem fracionária.
3. **Y-Sorting Rigoroso:** A profundidade visual 2.5D de pixel art é garantida pela ordenação estrita da coordenada Y da base (pés) do sprite.

---

## 7. Protocolo Obrigatório para Especificação e Registro de Assets de Pixel Art

Sempre que o desenvolvedor de adaptadores precisar de novos assets para compor o cenário, caminhos ou entidades, ele deve fornecer ao Usuário (para repasse ao Especialista de Assets) um **Briefing Técnico de Pixel Art Estrito**:

1. **Especificação de Grade e Resolução Nativa:**
   - Informar a resolução nativa em pixels exatos (ex: `32x32`, `64x64`, `96x96`, etc.), calculada com base no jogador de 32×32.
2. **Projeção 3/4 Top-Down (Minish Cap):**
   - Fachada frontal visível com volume vertical e topo em escorço.
3. **Paleta de Cores Normativa V2:**
   - Paleta controlada e indexada: Roxo abissal (`#1A1025`), Púrpura ancestral (`#38146a`), Marrom-madeira terroso (`#3A192A` / `#8A4B29`), Dourado (`#FFD700`), Verde vegetal (`#4CAF50` / `#519760`) e Ciano arcano (`#00E5FF` / `#2DD4BF`).
4. **Acabamento do Sprite:**
   - Fundo 100% transparente (`RGBA`).
   - Contorno de 1 pixel escuro (*dark pixel outline* em `#1A1025`) para destacar do terreno.
   - Zero anti-aliasing borrado, zero gradientes contínuos de Photoshop, zero mixels.

---

## 8. Design System e Interface DOM

A interface do jogo é rigorosamente segregada em dois domínios visuais:

### 8.1. Fora do Jogo (Menu Principal, Lobby, Meta-Progressão)
- **Tema:** *Grimdark Fantasy / Arcane Codex*.
- **Cores Oficiais V2:** Púrpura ancestral (`--ui-bg-dark: #38146a`), fundo escuro (`--ui-bg-darkest: #1a0f2e`), marrom arroxeado (`--ui-bg-medium: #3a192a`), bordas 2px sólidas (`--ui-border-primary: #855cc7`), dourado clássico (`--accent-gold: #FFD700`).
- **Escala:** Títulos monumentais (22px–26px), botões retrô pesados (`.btn-retro-primary`, `.btn-sonhar`), tipografia grande e legível.

### 8.2. Dentro do Jogo (HUDs, Mochila, Diálogos)
- **Tema:** *Floating Glassmorphism*.
- **Efeitos:** `backdrop-filter: blur(12px)`, fundos escurecidos `rgba(10, 10, 15, 0.85)`, bordas sutis.
- **Morfologia Rigorosa dos 5 Poderes (Slots 40px × 40px):**
  - **Ativa da Classe:** Quadrado ciano (`[1]` a `[4]`).
  - **Ativa Primordial:** Estrela de 8 pontas magenta.
  - **Broches Ativos (Global):** Sol dourado com espinhos (`1` a `6`).
  - **Broches Passivos (Global):** Triângulo truncado âmbar (`I` a `IV`).
  - **Atributos Acumulativos:** Orbe circular verde (apenas se bônus real `totalValue > 0`).

---

## 9. Procedimento Padrão para Criação e Modificação nos Adaptadores

> [!TIP]
> **Use o Kit Corporativo de Templates (`typescript/adapters/web/templates/`):**
> Nunca crie componentes de interface, partículas, renderáveis ou stories do Storybook do zero.
> Sempre consulte e utilize os builders e gabaritos canônicos:
> - `BaseGuiTemplate` & `GuiBuilder`: Criação de telas DOM, HUDs e janelas glassmorphism com ciclo de vida seguro.
> - `ParticleConfigBuilder` & `ParticleVfxPresets`: Criação declarativa de partículas e efeitos seratoninérgicos.
> - `SpriteVisualBuilder`: Criação fluente de configs de animações, frames, pivôs e atlas WebGPU.
> - `EventBindingBuilder`: Conexão limpa de listeners `IEventManager -> UI` com `unbindAll()` automático.
> - `VisualElementTemplate`: Gabarito para renderáveis no Canvas 2D / WebGPU herdando de `GameObjectElement`.
> - `StorybookGuiBuilder`: Padronização de arquivos `.stories.ts` para isolamento de visualização de GUIs.

1. **Quando o Requisito Exige Nova Capacidade de Domínio:**
   - **NÃO implemente a lógica de domínio.**
   - Adicione ou proponha a assinatura da **Porta Secundária** em `typescript/domain/ports/` ou o tipo de evento em `typescript/domain/eventDispacher/IGameEvents.ts`.
   - Implemente o Adaptador consumindo essa abstração.
   - Deixe o contrato pronto e desacoplado para o especialista do Domínio preencher a inteligência interna.
2. **Adicionar Nova Interface (GUI):**
   - Criar diretório coeso em `typescript/adapters/web/GUIS/<Nome>HudModule/`.
   - Arquivos coesos: `<nome>.html`, `<nome>.css`, `<Nome>Gui.ts` e `<Nome>Gui.stories.ts`.
   - Estender `BaseGuiTemplate` ou instanciar via `GuiBuilder`.
   - Criar a Story utilizando `StorybookGuiBuilder`.
   - Registrar e instanciar no [`UIManager.ts`](typescript/adapters/web/components/UiManager/UIManager.ts).
   - Se a tela requer pausa, conectar ao callback `togglePauseGameCallback`.
3. **Adicionar Sprite ou Asset Visual:**
   - Adicionar entrada estruturada no [`VisualConfigMap.ts`](typescript/adapters/web/shared/VisualConfigMap.ts) com o auxílio do `SpriteVisualBuilder`.
   - Se for item/equipamento, garantir que o campo `iconId` bata rigorosamente com o `iconId` numérico do Domínio.
4. **Bindings de Eventos:**
   - Centralizar sempre no [`GameEventBinder.ts`](typescript/adapters/web/components/GameEventBinder.ts) ou utilizar `EventBindingBuilder`.
   - Registrar no método `bindEvents()` e incluir a remoção correspondente no método `unbindAll()`.
5. **Segurança e Regras Anti-Desperdício:**
   - Nunca crie arquivos novos sem estrita necessidade. Prefira estender o catálogo data-driven e os componentes existentes respeitando POO e SRP.

---

## 10. Mandato Obrigatório de Testes: Testes Unitários e Testes de Regressão a Cada Execução

> [!IMPORTANT]
> **DIRETRIZ MANDATÓRIA DE EXECUÇÃO:**
> **Toda e qualquer execução, modificação de lógica de adaptadores, nova GUI, refatoração de renderização ou correção de bug DEVE OBRIGATORIAMENTE vir acompanhada de novos testes unitários e testes de regressão.**
> 
> 1. **Testes Unitários Obrigatórios (`typescript/tests/adapters/`):**
>    - Cada nova GUI, módulo de renderização, gateway ou transformer deve possuir testes unitários isolados cobrindo:
>      - Ciclo de vida (`injectUI`, montagem, desmontagem e `destroy`/`unbindAll`).
>      - Reação a eventos e mutações de DTOs (`EntityRenderableState`).
>      - Tratamento de exceções e entradas nulas/indefinidas.
> 2. **Testes de Regressão Obrigatórios:**
>    - Para qualquer bug de visualização, quebra de layout, sobreposição indevida, vazamento de listener ou falha de input corrigido, criar um teste de regressão específico reproduzindo o cenário para blindar a camada contra reincidência.
> 3. **Execução Obrigatória da Switch de Regressão e Validação Contínua:**
>    - **SEMPRE executar a switch de regressão (`npm run test:regression`)** no encerramento de toda e qualquer tarefa, além dos testes unitários e `npx tsc --noEmit`.

---

## 11. Checklist de Qualidade do Especialista em Adaptadores

Antes de finalizar qualquer modificação em `typescript/adapters/`:
- [ ] **Fronteira Arquitetural:** O código pertence exclusivamente à camada de apresentação/infraestrutura? Nenhuma fórmula de RPG ou regra de negócio foi embutida no adapter?
- [ ] **Teardown & Memória:** Todo listener DOM, evento do `eventManager` e timer possui limpeza explícita em `destroy()` ou `unbindAll()`?
- [ ] **Zero Forced Reflow:** Evitou leituras sincronizadas de layout (`getBoundingClientRect`) em loops ou hot paths de alta frequência?
- [ ] **Testes Unitários:** Foram criados testes unitários validando o comportamento e ciclo de vida dos adaptadores novos/modificados?
- [ ] **Testes de Regressão:** Foi criado teste de regressão específico prevenindo o retorno de qualquer falha corrigida?
- [ ] **Switch de Regressão & Suíte Verde:** A switch de regressão (`npm run test:regression`), os testes unitários e a checagem de tipos (`npx tsc --noEmit`) foram executados e passam com 100% de sucesso?

