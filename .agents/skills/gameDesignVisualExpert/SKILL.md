---
name: gameDesignVisualExpert
description: >-
  Especialista na identidade visual, design system, arte, Grease Pencil e colisão/hitboxes do rpg-roguelite-game.
  Abrange a filosofia dos Dois Mundos (Grimdark vs. Glassmorphism), a anatomia do Boneco de Trapos, paleta V2,
  morfologia dos 5 poderes (40px x 40px), criação 2D no Blender via MCP, o PolygonWebEditor (ferramenta visual
  de hitboxes), o modelo HitBox (polígonos e círculos) e a arquitetura de colisão Zero-GC do domínio.
---

# Skill: Game Design & Visual Identity Expert ("A Alma e a Estética do Jogo")

Esta skill consolida toda a identidade visual, filosofia estética, tokens de cores, design system e especificações de arte do **rpg-roguelite-game**. Utilize sempre que for criar, avaliar, desenhar, refatorar ou discutir interfaces (UI), HUDs, sprites, animações, efeitos visuais (VFX) ou a direção de arte do projeto.

---

## 1. Filosofia Fundamental: Os Dois Mundos Visuais

A interface e a ambientação do jogo são deliberadamente divididas em **dois domínios estéticos complementares**:

```
+--------------------------------------------------------------------------------------------------+
| DOMÍNIO A: TELAS FORA DO JOGO (MENU PRINCIPAL / META-PROGRESSÃO / LOBBY / SISTEMA)               |
| • Estética: Grimdark Fantasy / Arcane Codex / Cartografia Antiga                                 |
| • Sensação: Ancestral, cósmica, pesada e rústica                                                |
| • Paleta: Púrpura ancestral (#38146a), abismo (#1a0f2e), madeira (#3a192a) e ouro (#FFD700)     |
| • Escala: Imponente, tipografia grande (14px–26px), botões sólidos retrô (.btn-retro-primary)    |
| • Borda Wavy / Rasgada: Pseudo-elementos com radial-gradient simulando pergaminho orgânico       |
+--------------------------------------------------------------------------------------------------+
                                                │
                                                ▼ [ Transição de Nuvem / "Sonhar" ]
+--------------------------------------------------------------------------------------------------+
| DOMÍNIO B: TELAS DENTRO DO JOGO (IN-GAME HUD / CHARACTER MENU / DIÁLOGOS / STATUS)               |
| • Estética: Floating Glassmorphism translúcido (backdrop-filter: blur(12px))                     |
| • Sensação: Leve, imersiva, moderna e limpa                                                      |
| • Objetivo: Zero obstrução da tela de ação e foco absoluto no combate em tempo real             |
| • Dimensões Rigorosamente Pares: Ex: 720px × 500px, 40px × 40px (anti-subpixel blurring)       |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. O Mandato Sagrado: 100% Pixel Art & O Boneco de Trapos

> [!IMPORTANT]
> **O JOGO É E SEMPRE FOI 100% PIXEL ART NATIVO:**
> - Todo o universo visual de gameplay (herói, inimigos, NPCs, armas, projéteis, VFX, tilesets, estradas, construções e cenários) é estritamente **Pixel Art**.
> - **Proibição Absoluta de Mixels:** É proibido misturar resoluções de pixel ou introduzir ilustrações em alta resolução, traços vetoriais suaves, gradientes fotográficos ou render 3D plástico.
> - **A Referência Canônica de Ouro:** ***The Legend of Zelda: The Minish Cap*** (a maior referência de top-down 3/4 pixel art: legibilidade absoluta de tiles, contraste de cores nítido, silhuetas expressivas e grid perfeito).

---

## 3. Paleta de Cores Oficial (Paleta Normativa V2)

Baseada em `docs/Plata de cores (inicial) V2.pdf` e `typescript/adapters/web/GUIS/mainMenuHudModule/styles/global-layout.css`:

### 3.1. Tokens de Base e Interface dos Menus
| Token CSS | Hex / Valor | Significado e Aplicação |
| :--- | :--- | :--- |
| `--ui-bg-darkest` | `#1a0f2e` | Roxo abissal ultra-escuro (fundo de telas e loading). |
| `--ui-bg-dark` | `#38146a` | Púrpura ancestral (containers de abas e nanquim arcano). |
| `--ui-bg-medium` | `#3a192a` | Marrom-vinho terroso (barras de navegação e divisórias). |
| `--ui-border-primary`| `#855cc7` | Roxo luminoso (bordas de 2px de painéis e cards). |
| `--accent-gold` | `#FFD700` | Dourado clássico (títulos, botões de ação e broches ativos). |
| `--accent-gold-shadow`| `#552200` | Sombra dura retrô (`2px 2px 0`) para contraste de títulos. |
| `--ui-text-primary` | `#f1c6aa` | Tom de areia/pele quente para textos corridos (alta legibilidade). |
| `--ui-text-secondary`| `#b2eca3`| Verde suave vegetal para subtítulos, tags ativas e status. |

### 3.2. Semântica Estrita de Cores dos Poderes
| Cor / Efeito | Hex | Uso Estrito |
| :--- | :--- | :--- |
| **Dourado Ancestral** | `#FFD700` | Meta-progressão global, broches solares ativos, moedas de ouro. |
| **Ciano Arcano** | `#00e5ff` | Habilidades ativas de classe (quadrados), mana, efeitos congelantes. |
| **Magenta Primordial**| `#ff50dc` | Habilidade de identidade essencial da classe (estrela). |
| **Âmbar Solar** | `#ffaa00` | Broches passivos permanentes (triângulos truncados). |
| **Verde Esmeralda** | `#4CAF50` | Orbes de atributos cumulativos, regeneração, switches ativos. |
| **Vermelho Carmesim** | `#ff3344` / `#ff4d4d` | Pontos de vida (HP), perigo, dano sofrido e alertas críticos. |

---

## 4. Morfologia Geométrica dos 5 Poderes (Slots 40px × 40px)

Para garantir clareza cognitiva imediata durante a batalha e no inventário:

```
+---------------------------------------------------------------------------------------+
|  1. ATIVA DA CLASSE       2. ATIVA PRIMORDIAL       3. BROCHE ATIVO                   |
|     (Quadrado Ciano)         (Estrela Magenta)         (Sol c/ Espinhos Dourado)      |
|     Teclas [1] a [4]         Tecla Única Classe        Slots [1] a [6]                |
|                                                                                       |
|        +-------+                    /\                        * * *                   |
|        | [ 1 ] |                   /  \                     *   /\  *                 |
|        |  FIRE |               <--[ * ]-->                 * < [1] > *                |
|        |       |                   \  /                     *   \/  *                 |
|        +-------+                    \/                        * * *                   |
|                                                                                       |
|  4. BROCHE PASSIVO        5. ATRIBUTO CUMULATIVO                                      |
|     (Triângulo Truncado)     (Orbe Circular Verde)                                    |
|     Passivas [I] a [IV]      Escala Infinita Global                                   |
|                                                                                       |
|          _---_                      ( + )                                             |
|         / [I] \                  Vitalidade                                           |
|        / PHOEN \                   +40                                                |
|       +---------+                                                                     |
+---------------------------------------------------------------------------------------+
```

1. **Ativas da Classe (Quadrado Ciano):** Borda dashed quando vazio, glow ciano quando equipado. Acionadas pelas teclas `1` a `4`.
2. **Ativa Primordial (Estrela Magenta):** Ícone SVG de 8 pontas em `SlotSvgAssets.ts`. Habilidade central da classe.
3. **Broches Ativos (Sol Dourado com Espinhos):** Habilidades ativas da meta-progressão permanente.
4. **Broches Passivos (Triângulo Truncado Âmbar):** Passivas contínuas sem gatilho manual, identificadas por numerais romanos `I` a `IV`.
5. **Orbes de Atributos Cumulativos (Círculos Verdes com Pílula):**
   - **Regra de Ouro:** **Apenas atributos com bônus real (`totalValue > 0`) são renderizados.** Valores `+0` são estritamente ocultados para suportar listas infinitas sem poluição visual.

---

## 5. Diretrizes para Sprites, Animações e VFX

1. **Tamanhos e Resoluções Padrão:**
   - Personagens e NPCs: `32px × 32px` (spritesheet horizontal contínuo).
   - Projéteis básicos: `16px × 16px`.
   - VFX de Impacto/Slash: `64px × 64px` ou `128px × 128px` (ex: explosão em 16 frames).
   - Mapa Chunks: `1024px × 1024px`.
2. **Estilo de Linhas e Sombra:**
   - Contorno preto sólido de 1 pixel (*black outline*) para destacar entidades sobre o cenário detalhado.
   - Sombra projetada circular elíptica cinza-translúcida sob os pés de entidades e slimes.
   - Squash and stretch expressivo em animações de pulo (ex: o slime verde de 8 frames).
3. **Fórmulas Elementares e Cores de Magias (Mago / Axiomante):**
   - *Potência:* `#FF4500` (Fogo + Magia)
   - *Gelo (Ice):* `#D6FFFA` (Água + Magia)
   - *Vida (Life):* `#FF2C2C` (Terra + Magia)
   - *Caos (Chaos):* `#4A0080` (Trevas + Magia)
   - *Ordem (Order):* `#FFFFFF` (Luz + Magia)
   - *Morte (Death):* `#000000` (Vida + Trevas)
   - *Espírito (Spirit):* `#E0F8FF` (Morte + Vida)

---

## 6. Checklist de Qualidade Visual

Antes de aprovar qualquer alteração de tela ou adição de arte:
- [ ] **Contexto Adequado:** A tela segue o Domínio correto? (Fora do jogo = Grimdark/Ouro/Púrpura; In-game = Glassmorphism/Blur 12px).
- [ ] **Legibilidade e Escala:** Títulos têm entre `22px` e `26px`? Textos corridos têm no mínimo `14px`? (Evitar fontes minúsculas ilegíveis).
- [ ] **Dimensões Pares:** Janelas e slots possuem larguras e alturas estritamente pares para não borrar pixels na centralização?
- [ ] **Morfologia Sagrada:** Os slots de skills respeitam os SVGs oficiais de `SlotSvgAssets.ts` e o padrão de 40×40px?
- [ ] **Filtragem de Zeros:** Telas de atributos ocultam valores `+0`?
- [ ] **Feedback Tátil:** Todos os botões possuem estados visíveis de `:hover` (glow/scale), `:active` e `:disabled`?

---

## 7. Criação de Assets 2D com Grease Pencil no Blender (Melhores Práticas)

Utilize o Blender via MCP (`execute_blender_code`) para desenhar, esculpir, animar e renderizar sprites 2D e texturas (Boneco de Pano, Remendos, Broches, Slimes, Armas e VFX).

### 7.1. Princípios Fundamentais do Grease Pencil para o Jogo
1. **Linguagem de Desenho (Artesanato/Grimdark):**
   - Traços orgânicos imperfeitos que remetem a tecidos costurados, barbantes e papelão rasgado.
   - Contorno escuro expressivo (*Black Outline* de 1-2px no render final) para manter o contraste do personagem contra o mapa detalhado.
   - Separação de camadas (*Layers*):
     - `Lines` (Traço/Contorno)
     - `Color_Base` (Cores sólidas terrosas / juta / trapos)
     - `Patches_Stitches` (Remendos roxos, costuras em X, botões)
     - `Shadows_Highlights` (Sombreamento ocluso e realce dourado)
2. **Cores de Acordo com a Paleta V2:**
   - Paleta de tons terrosos (`#a07a4b`, `#3a192a`), trapos roxos (`#38146a`), dourado antigo (`#FFD700`) e verde vegetal (`#519760`).

### 7.2. Melhores Práticas com Blender MCP
1. **Protocolo e Inspeção Prévia:**
   - Sempre verifique a versão do Blender e a cena com `get_addon_status()` e `get_scene_info()` antes de executar scripts.
   - Confirme os resultados visuais com `get_viewport_screenshot()`.
2. **Grease Pencil V3 (Blender 4.3 / 5.x):**
   - **Nunca use APIs legadas:** Métodos antigos como `gpencil.data.layers[0].frames[0].strokes.new()` foram substituídos no GPv3.
   - O GPv3 opera sobre o sistema de **Curvas e Atributos Genéricos**:
     - `drawing = layer.current_frame().drawing`
     - Estrutura baseada em atributos (`drawing.attributes['position']`, `drawing.attributes['radius']`, etc.).
   - Alternativamente, use primitivas e operadores contextuais robustos (`bpy.ops.grease_pencil.*`).
3. **Câmera e Configuração 2D Isométrica / Top-Down:**
   - Configurar câmera como **Ortográfica** (`camera.data.type = 'ORTHO'`).
   - Apontar de cima para baixo ou com leve inclinação top-down (`rotation_euler = (0, 0, 0)` para plano 2D frontal, ou `(math.radians(30), 0, 0)` se for perspectiva isométrica suave).
   - Resolução de saída rigorosamente travada: `32x32`, `48x48`, `64x64` ou `128x128` pixels com render transparente (`scene.render.film_transparent = True`).

### 7.3. Pipeline de Renderização e Exportação de Sprites
1. **Filtro de Pixel Art:**
   - Ao renderizar em baixa resolução (ex: 32×32), desativar o anti-aliasing excessivo configurando o filtro de pixel para Box com largura mínima:
     ```python
     bpy.context.scene.render.filter_size = 1.0
     bpy.context.scene.render.image_settings.color_mode = 'RGBA'
     bpy.context.scene.render.film_transparent = True
     ```
2. **Geração de Spritesheets:**
   - Animar cada frame em keyframes sucessivos (1 frame por ação: Idle 2 frames, Walk 4-8 frames).
   - Renderizar frames individuais (`render.filepath = "/path/frame_###"`) e costurar em spritesheet horizontal usando scripts Python/PIL.
3. **Integração com o Código:**
   - Salvar os PNGs diretamente em `typescript/adapters/web/assets/entities/` ou `assets/itens/`.
   - Registrar no [`VisualConfigMap.ts`](typescript/adapters/web/shared/VisualConfigMap.ts) com as dimensões exatas de frame (`frameWidth`, `frameHeight`, `frameCount`).

---

## 8. Arquitetura de Hitboxes e Sistema de Colisão

O ecossistema de hitboxes une uma ferramenta visual de autoria (`polygonWebEditor`) com classes de colisão de alta performance e cálculo SAT no Domínio.

### 8.1. O Editor Visual: PolygonWebEditor (`typescript/adapters/polygonWebEditor/`)
O editor é uma aplicação independente (Canvas 2D) desacoplada do runtime da engine, concebida para definir os limites físicos de entidades, itens e mapas:
1. **Ferramentas (`Tools/`):**
   - **`PolygonTool`:** Clique para adicionar vértices sequenciais; `Enter` ou clique no ponto inicial fecha o polígono; preview dinâmico de linha.
   - **`CircleTool`:** Clique central e arrasto para definir raio (`radius`).
   - **`SelectTool`:** Seleciona, arrasta vértices individuais (`drag & drop`) ou move hitboxes inteiras; `Delete` ou botão direito remove vértice/hitbox.
2. **Controles de Câmera e Canvas:**
   - `Scroll`: Zoom in / Zoom out.
   - `Space + Drag`: Pan pelo canvas.
   - `Shift`: Snap ao grid de pixels.
   - `Ctrl+Z` / `Ctrl+Y`: Histórico profundo de Undo / Redo com Deep Copy (`JSON.parse(JSON.stringify)`).
3. **Fluxo de Autoria:**
   - Carregar imagem do sprite ou chunk (`drag-and-drop` de PNG/JPG).
   - Desenhar os polígonos/círculos de colisão ao redor do corpo ou das paredes/obstáculos.
   - Exportar JSON estruturado diretamente para os diretórios do projeto (ex: `assets/maps/collision-layers/vilgem_hitboxes.json`).

### 8.2. Formato Canônico dos Dados de Hitbox (JSON)
O modelo estrutural compartilhado entre o editor e o domínio segue o contrato de [`HitboxModel.ts`](typescript/adapters/polygonWebEditor/Models/HitboxModel.ts) e [`HitboxParser.ts`](typescript/domain/hitBox/HitboxParser.ts):

```json
{
  "hitboxes": [
    {
      "id": "hitbox-1711200000-1",
      "type": "polygon",
      "coordinates": { "x": 0, "y": 0 },
      "rotation": 0,
      "points": [
        { "x": 12, "y": 30 },
        { "x": 20, "y": 30 },
        { "x": 20, "y": 32 },
        { "x": 12, "y": 32 }
      ]
    },
    {
      "id": "hitbox-1711200000-2",
      "type": "circle",
      "coordinates": { "x": 16, "y": 20 },
      "rotation": 0,
      "radius": 10
    }
  ]
}
```

### 8.3. Camada de Domínio: Classes de Hitbox (`typescript/domain/hitBox/`)
1. **`HitBox` (Classe Abstrata Base):**
   - Mantém `coordinates: { x, y }`, `rotation` (em radianos) e o callback `onColision: (otherElement) => void`.
   - Método `update(coordinates, rotation)` com atualização in-place para Zero-GC.
   - **Regra Fundamental de Domínio:** Nunca execute `console.log` no domínio ou no update de hitboxes.
2. **`HitBoxPolygon`:**
   - Armazena os pontos originais (`points`) e um ponto pivô (`pivot`, ex: `{x: 0, y: 0}` ou centro).
   - **Memoização Estrita:** `getRotatedPoints()` só recalcula seno/cosseno e translação se `this.rotation !== this.lastRot`, reutilizando o array pré-alocado `rotatedPoints`.
   - Implementa `getDebugShape()` retornando o DTO `HitboxDebugShape` para o adaptador desenhar as bordas no Canvas/WebGPU em modo debug.
3. **`HitBoxCircle`:**
   - Representação otimizada por raio (`radius`) e centro. Ideal para jogadores, slimes, projéteis circulares e áreas de efeito (AoE).
4. **`HitboxParser`:**
   - Instancia dinamicamente `HitBoxPolygon` ou `HitBoxCircle` a partir do array JSON exportado pelo editor, associando o pivô correto do sprite e o callback de impacto.

### 8.4. O Pipeline de Colisão e Física Zero-GC no Domínio
1. **`Collision.worker.ts` (Web Worker Paralelo Dedicado):**
   - Executa fora da thread principal para não travar o loop de renderização do jogo.
   - Recebe dados compactados num único `Float32Array` contínuo (`[id, type, cx, cy, r]` para círculos; `[id, type, pointCount, p1.x, p1.y, ...]` para polígonos).
   - Utiliza **QuadTree** para fase ampla (*broadphase*) e o **Teorema dos Eixos Separadores (SAT)** para fase estreita (*narrowphase*):
     - `checkPolyPoly`: SAT com eixos normais das arestas de ambos os polígonos.
     - `checkPolyCircle`: SAT testando eixos das arestas + eixo direcionado ao vértice mais próximo.
     - `checkCircleCircle`: Distância euclidiana ao quadrado (`dx² + dy² <= (r1 + r2)²`).
   - Evita alocações de string usando a **Função de Emparelhamento de Cantor** (`0.5 * (k1 + k2) * (k1 + k2 + 1) + k2`) para deduplicar pares já testados.
   - Retorna um `Int32Array` contendo apenas os pares colididos `[idA, idB, idC, idD, ...]`.
2. **`CollisionManager.ts` (Orquestrador do Domínio):**
   - **Colisão Dinâmica x Dinâmica:** Transfere os dados para o `Collision.worker` e aplica os resultados via `applyDelayedCollisions()`, disparando o `onColision()` de cada elemento participante.
   - **Colisão Estática de Cenário (`staticGrid`):**
     - Obstáculos do mapa e paredes (`EnvironmentCollider`) são indexados em uma grade espacial estática rápida baseada em células de 256px (`GRID_SIZE = 256`).
     - Entidades móveis (Player, Slimes, ShadowMobs) resolvem penetração de ambiente instantaneamente via `resolveEnvironmentCollision(env, r)`.

### 8.5. Consumo e Renderização de Hitboxes nos Adaptadores (`typescript/adapters/web/`)
Na camada de apresentação, os adaptadores conectam os dados de hitbox tanto para runtime quanto para depuração visual:
1. **Carregamento Data-Driven no [`GameAdapter.ts`](typescript/adapters/web/components/GameAdapter.ts):**
   - Ao selecionar um mapa no menu (ex: `vilgem`), o `GameAdapter` consulta o `VisualConfigMap` e faz o `fetch` assíncrono do JSON apontado por `collisionJsonUrl` (ex: `vilgem_hitboxes.json`).
   - O payload de hitboxes é enviado ao Domínio via `domain.loadWorld(mapId, collisionData)`, instanciando os `EnvironmentCollider` sem acoplar arquivos diretamente no núcleo do jogo.
2. **Renderização de Debug no [`SceneManager.ts`](typescript/adapters/web/components/renderModule/scene/SceneManager.ts):**
   - Controlada pela flag `isDebugMode` (ativável via atalho F1 / Debug).
   - O Domínio envia DTOs `EntityRenderableState` contendo o array `hitboxes: HitboxDebugShape[]`.
   - **Deslocamento de Bits Anti-GC:** Para evitar concatenações de string no loop de 60 FPS, o identificador de depuração é gerado via bitwise: `debugId = (state.id << 4) | index`.
   - Instanciação sob demanda de classes leves de desenho:
     - [`DebugCircle.ts`](typescript/adapters/web/components/renderModule/customRenderables/DebugCircle.ts): Desenha arcos em vermelho translúcido (`rgba(255, 0, 0, 0.5)`).
     - [`DebugPolygon.ts`](typescript/adapters/web/components/renderModule/customRenderables/DebugPolygon.ts): Traça as arestas conectando os vértices em verde translúcido (`rgba(0, 255, 0, 0.6)`).
3. **Alternativa Raster: [`CollisionLayerParser.ts`](typescript/adapters/web/shared/CollisionLayerParser.ts):**
   - Permite também ler mapas de colisão a partir de imagens PNG (`colision_layer.png`), mapeando cores RGB para tipos de tiles (`WALL`, `WATER`, `LAVA`, `GRASS`, `ICE`, `SPIKE`) com otimização que agrupa retângulos contíguos para reduzir o número total de colliders.

---

## 9. Guia Prático: Como Criar Hitboxes para Novos Assets (Sem Bugs)

Sempre que desenhar ou importar um novo asset (Personagem, Inimigo, Arma, VFX, Obstáculo de Mapa), siga estas regras essenciais para garantir precisão e compatibilidade com o motor de física.

### 9.1. Decisão: Círculo vs. Polígono
- **Use Círculo (`HitBoxCircle`):**
  - Jogador, Slimes, NPCs humanoides e projéteis simples (balas, bolas de fogo).
  - *Vantagem:* Cálculo mais leve do motor (`dx² + dy² <= r²`), evita agarrar em cantos e paredes ao deslizar.
  - *Dica de Raio:* Em um sprite de `32x32`, use raio de `6` a `8` pixels centrado nos pés/quadris do personagem (nunca pegando a cabeça inteira), permitindo que o boneco passe por trás de árvores e telhados sem colidir com a copa.
- **Use Polígono (`HitBoxPolygon`):**
  - Paredes, casas, pontes, árvores, feixes de corte de espada/foice (`AnimatedMeleeAttack`) e áreas mágicas de impacto (`Leviata`).

### 9.2. Regras de Ouro para Polígonos (Evitando Falhas no SAT e Worker)
1. **Convexidade Estrita (Obrigatoriamente Convexos):**
   - O algoritmo SAT do `Collision.worker.ts` assume polígonos **convexos** (ângulos internos < 180°).
   - Se seu formato for côncavo (como uma igreja em "L" ou uma caverna com entrada):
     - **Nunca crie um polígono côncavo gigante.**
     - **Decomponha em múltiplos polígonos convexos simples** (exatamente como em [`SceneryRegistry.ts`](typescript/domain/ObjectModule/Scenery/SceneryRegistry.ts), que quebra a igreja em parede esquerda, parede direita, fundo e frente).
2. **Ordem dos Vértices (Sentido Horário / Clockwise):**
   - No `polygonWebEditor`, marque os pontos sequencialmente em sentido horário para manter as normais das arestas apontando para fora.
3. **Ponto de Pivô (`Pivot`) e Alinhamento com o Sprite:**
   - **Origem (0, 0):** Para objetos de cenário estáticos onde os pontos são absolutos ou relativos ao canto superior esquerdo (`top-left`).
   - **Centro (`{ x: width / 2, y: height / 2 }`):** Para entidades que giram dinamicamente (como o Leviatã em `128x128` com pivô `{ x: 64, y: 64 }`).
   - **Pivô da Arma (`bottom-left` / Base do Cabo):** Para ataques corpo a corpo com corte rotacional (`AnimatedMeleeAttack`), os pontos devem ter o pivô no ponto de rotação da mão.
4. **Tratamento de Spritesheets com Múltiplos Frames:**
   - Se a hitbox for animada quadro a quadro (ex: corte de foice de 6 frames em `384x64`):
     - No editor ou no código, subtraia o deslocamento do frame (`p.x - frameIndex * frameWidth`) para que o domínio armazene as hitboxes relativas ao frame corrente (`[0..64]`).
5. **Quantidade Mínima de Vértices:**
   - Para caixas de colisão, use exatamente 4 pontos.
   - Evite curvas com 20 ou 30 vértices minúsculos: use entre 4 e 8 vértices no máximo. Menos vértices = zero quedas de FPS no SAT.

### 9.3. Checklist para Não Dar Problema de Colisão
- [ ] O collider dinâmico tem centro atualizado em `cx = coords.x + width/2` e `cy = coords.y + height/2`?
- [ ] O raio da hitbox de movimento não excede os limites visuais da base do personagem?
- [ ] Os obstáculos estáticos foram registrados com `@RegisterSpawner('environmentCollider')` ou indexados no `staticGrid` do `CollisionManager`?
- [ ] Se o objeto for translúcido de colisão de mapa (`environmentCollider`), a entrada no `VisualConfigMap` possui `category: 'entity'` com pixel transparente para renderizar o modo Debug sem pesar a GPU?
- [ ] A colisão chama `resolveEnvironmentCollision(env, r)` para empurrar entidades para fora de obstáculos em vez de travá-las?

---

## 10. Conformidade e Otimização de Testes de Assets (QA)

Como diretriz de governança e otimização operacional estabelecida pela auditoria de QA, o Especialista em Assets **NÃO** deve executar a suíte pesada de adaptadores (`npx vitest run typescript/tests/adapters/`), que inicializa desnecessariamente Canvas 2D, WebGPU, Shaders, UIManager e Storybook mocks.

### 10.1. Suíte de Conformidade Sintática e Estrutural (`MapsCompliance.test.ts`)
Para validar de forma instantânea a integridade de qualquer novo asset ou mapa registrado, utilize a suíte ultrarrápida projetada sob Clean Architecture e Zero-GC:
- **`VisualConfigMap.ts`**: Valida integridade de chaves, categorias, esquemas de matriz de mapas/chunks, URLs de imagem e parâmetros de animação (`frameCount`, `animationSpeed`, `frameWidth`, `frameHeight`, `atlasOffset`, `spriteSize`).
- **`portalLinksMap.ts`**: Valida coordenadas de portais, ids únicos, tipos de transição (`direct` ou `request`) e integridade de hitboxes exportadas.
- **`IntermapConfig.ts` & `MetaProgressionMap.ts`**: Valida registry de interiores e pools globais de atributos/broches.

### 10.2. Comandos Oficiais de Validação
| Comando | Escopo | Duração | Quando Usar |
| :--- | :--- | :--- | :--- |
| `npm run test:maps:fast` | Validação pura dos dados e esquemas de Maps e Catálogos | ~400ms | Durante iterações rápidas de registro e corte de assets. |
| `npm run test:maps` | Checagem estrita de tipos (`tsc --noEmit`) + Validação de Maps | ~3 a 5s | Antes de concluir a entrega e registrar os assets no repositório. |

> [!TIP]
> Executar exclusivamente `npm run test:maps` garante 100% de conformidade técnica com tempo de resposta quase instantâneo e zero risco de falsos positivos por mocks de DOM ou WebGPU.

---

## 11. Mandato Obrigatório de Testes: Testes Unitários e Testes de Regressão a Cada Execução

> [!IMPORTANT]
> **DIRETRIZ MANDATÓRIA DE EXECUÇÃO:**
> **Qualquer alteração em ferramentas visuais (`polygonWebEditor`, `assets-adapter`), esquemas de hitbox, parsing geométrico, catálogos visuais ou helpers de renderização DEVE vir acompanhada de novos testes unitários e testes de regressão.**
> 
> 1. **Testes Unitários Obrigatórios:**
>    - Validar schemas de dados, integridade de geometrias, parsing de hitboxes (`HitBoxCircle`, `HitBoxPolygon`) e integridade de entradas no catálogo visual.
> 2. **Testes de Regressão Obrigatórios:**
>    - Para qualquer bug corrigido em hitboxes, distorções de coordenadas, quebras de exportação ou falhas em portais/intermaps, criar teste de regressão específico reproduzindo a falha e blindando o sistema.
> 3. **Validação Contínua:**
>    - Garantir `npm run test:maps` e `npm test` 100% verdes com `npx tsc --noEmit`.
