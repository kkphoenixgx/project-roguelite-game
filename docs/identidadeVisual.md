# Manual de Identidade Visual e Design System

**Projeto:** RPG Roguelite Game  
**Versão:** 2.1 (Atualizada com Separação Menus Fora do Jogo vs. Menus Dentro do Jogo)  
**Status:** Oficial / Normativo  
**Localização:** `docs/identidadeVisual.md`

---

## 1. Visão Geral e Filosofia dos Dois Mundos Visuais

A interface do jogo é dividida intencionalmente em **dois domínios estéticos distintos**, com propósitos de gameplay e atmosferas complementares:

```
+--------------------------------------------------------------------------------------------------+
| DOMÍNIO A: TELAS FORA DO JOGO (MENU PRINCIPAL / META-PROGRESSÃO / LOBBY)                        |
| • Estética: Grimdark Fantasy / Arcane Codex / Cartografia Antiga                                 |
| • Cores: Púrpura ancestral (#38146a), madeira/marrom (#3a192a), dourado antigo (#FFD700)        |
| • Escala: Imponente, tipografia grande (14px–26px), botões retro-pesados, bordas de 2px sólidas   |
| • Componentes: Árvore Cósmica, Loadout de Broches, Mapa do Sonho, Status Geral e Sistema (Ollama)|
+--------------------------------------------------------------------------------------------------+
                                                │
                                                ▼ [ Transição de Nuvem / Sonhar ]
+--------------------------------------------------------------------------------------------------+
| DOMÍNIO B: TELAS DENTRO DO JOGO (IN-GAME HUD / CHARACTER MENU / DIÁLOGOS)                       |
| • Estética: Floating Glassmorphism translúcido com desfoque de fundo (backdrop-filter: blur)    |
| • Objetivo: Zero obstrução visual da gameplay e do combate em tempo real                        |
| • Escala: Compacta, slots rigorosos de 40px × 40px para habilidades                             |
| • Morfologia Estrita: Quadrado (Classe), Estrela (Primordial), Sol (Broche Ativo),              |
|   Triângulo Truncado (Broche Passivo), Orbe Circular (Atributos Acumulativos > 0)               |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Paleta de Cores Oficial (Paleta V2)

Baseada nas especificações normativas de `docs/Plata de cores (inicial) V2.pdf`:

### 2.1. Tokens de Base dos Menus (Telas Fora do Jogo)

| Token CSS | Hex / Valor | Amostra | Finalidade e Contexto de Aplicação |
| :--- | :--- | :---: | :--- |
| `--ui-bg-darkest` | `#1a0f2e` | 🟣 | Fundo mais profundo dos menus e tela de loading/warmup. |
| `--ui-bg-dark` | `#38146a` | 🟣 | Tinta púrpura ancestral, base de todos os containers de tabs. |
| `--ui-bg-medium` | `#3a192a` | 🟤 | Marrom arroxeado, base da barra de navegação inferior e divisões. |
| `--ui-border-primary` | `#855cc7` | 💜 | Bordas sólidas de 2px para painéis do menu (Stats, Sistema, etc.). |
| `--accent-gold` | `#FFD700` | 🟡 | Dourado clássico para títulos principais, botões de ação e broches. |
| `--accent-gold-shadow` | `#552200` | 🟤 | Sombra sólida retrô (`2px 2px 0`) para contrastar títulos dourados. |
| `--ui-text-primary` | `#f1c6aa` | 🌾 | Tom de pele/areia quente para subtítulos e textos corridos (legibilidade). |
| `--ui-text-secondary` | `#b2eca3` | 🌿 | Verde suave vegetal para cabeçalhos secundários e tags ativas. |

### 2.2. Tokens de Ação e Destaque Semântico

| Token / Cor | Hex | Aplicação Estrita |
| :--- | :--- | :--- |
| **Dourado Ancestral** | `#FFD700` | Meta-progressão, Broches Ativos (Sol), Moedas de Ouro, Aba Ativa, Destaques. |
| **Ciano Arcano** | `#00e5ff` | Habilidades Ativas da Classe (Quadrados), Mana, Status Derivados. |
| **Magenta Primordial**| `#ff50dc` | Habilidade Primordial/Essencial da Classe (Estrela), poderes de topo. |
| **Âmbar Solar** | `#ffaa00` | Broches Passivos Globais (Triângulos Truncados), alertas e efeitos térmicos. |
| **Verde Esmeralda** | `#4CAF50` | Atributos Acumulativos (Orbes Circulares), cura, status online. |
| **Vermelho Carmesim** | `#ff3344` | Vida (HP), Dano recebido, status de perigo/erro e exclusão. |

---

## 3. Diretrizes Detalhadas: Telas Fora do Jogo (Menu Principal)

Localização: `typescript/adapters/web/GUIS/mainMenuHudModule/`

### 3.1. Filosofia e Escala Visual
- **Nada de elementos minúsculos:** Textos de títulos devem ter entre `22px` e `26px`, subtítulos `14px`, textos de cards `14px` a `16px`.
- **Painéis Robustos:** Fundo `rgba(16, 8, 30, 0.75)` a `rgba(16, 8, 30, 0.85)` com borda sólida de `2px solid var(--ui-border-primary)` e sombra interna escura `box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.6)`.
- **Tipografia Coerente:** Herda a tipografia global do menu (`#main-menu-container`), evitando fontes descontextualizadas de desktop como Segoe UI fina.
- **Botões Grandes e Pesados:**
  - `.btn-retro-primary`: Fundo `rgba(40, 20, 10, 0.85)`, borda dourada `2px solid var(--accent-gold)`, texto dourado com sombra, `font-size: 15px`, padding `10px 20px`.
  - `.btn-retro-secondary`: Fundo `rgba(20, 10, 36, 0.8)`, borda de 2px roxa, hover com glow dourado.
  - `.btn-sonhar`: Botão monumental de início de run (`font-size: 24px`, padding `18px 48px`).

### 3.2. Estrutura das 5 Abas do Menu Principal
1. **Aba 1 (Progression):** Árvore cósmica de habilidades com nós circulares de raridade, linhas estelares douradas e desbloqueio de meta-progressão.
2. **Aba 2 (Loadout):** Seleção de broches relicários ativos (slots solares) e passivos (slots triangulares).
3. **Aba 3 (World):** Mapa de pergaminho antigo com ilhas navegáveis por pan/zoom, pontos de interesse (POIs), iluminação pontual de Vilgem e o botão monumental "SONHAR".
4. **Aba 4 (Stats):** Painéis duplos de Atributos Base, Atributos Derivados, Afinidades Elementais e Broches desbloqueados.
5. **Aba 5 (System):** Configurações do Sistema, Motor Cognitivo (Ollama) e Gerenciamento de Saves:
   - **Header:** Título `26px` dourado com ícone de engrenagem celestial e status do daemon Ollama em tempo real.
   - **Modelos Instalados:** Lista de modelos locais armazenados no computador com botão para ativar e excluir.
   - **Download Direto (Pull):** Input de 46px de altura para digitação de qualquer modelo Ollama com barra de progresso em gradiente ciano/ouro e porcentagem de download.
   - **Catálogo Oficial Ollama (`ollama.com/library`):** Busca dinâmica diretamente no repositório Ollama via comando Tauri IPC `fetch_ollama_library` (com fallback robusto), exibindo cards espaçosos (`minmax(340px, 1fr)`), badges de parâmetros (0.5b, 1b, 7b, tools), contagem de downloads/pulls, barra de pesquisa em tempo real e filtros rápidos de família (Ultraleves, Qwen, Llama, DeepSeek, Gemma, Mistral).
   - **Persistência de Saves:** Exportação em Base64 criptografado com cópia em 1 clique e importação com confirmação imediata.

---

## 4. Diretrizes Detalhadas: Telas Dentro do Jogo (In-Game Menus & HUDs)

Localização: `typescript/adapters/web/GUIS/characterMenuHudModule/`, `dialogueHudModule/`, etc.

### 4.1. Filosofia de Glassmorphism e Transparência
- **Overlay Sem Obstrução:** Aplica `backdrop-filter: blur(12px)` e fundos translúcidos escurecidos (`rgba(10, 10, 15, 0.85)`).
- **Alinhamento e Pixel Art:** Janelas flutuantes com dimensões rigorosamente pares (ex: `720px × 500px`) para evitar subpixel blurring ao centralizar.

### 4.2. A Geometria Rigorosa dos 5 Poderes (40px × 40px)
Para garantir clareza cognitiva absoluta em combate e nos inventários do personagem, cada categoria possui formato geométrico único:

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

1. **Ativas da Árvore de Classes (Quadrados Ciano):** Acionadas pelas teclas `1` a `4` no teclado.
2. **Ativa Primordial de Classe (Estrela de 8 Pontas Magenta):** Habilidade de identidade da classe (ex: peixe do pescador).
3. **Broches Ativos da Árvore Global (Sol Dourado com Espinhos):** Habilidades ativas concedidas pelo legado permanente da meta-progressão. Slots `1` a `6`.
4. **Broches Passivos da Árvore Global (Triângulo Truncado Âmbar):** Passivas contínuas identificadas com numerais romanos `I` a `IV` sem botão de gatilho manual.
5. **Atributos Acumulativos (Orbes Circulares com Pílulas Verdes):**
   - **Regra Fundamental de Escalabilidade:** **Apenas atributos com bônus real (`totalValue > 0`) são renderizados.** Estatísticas com bônus `+0` são estritamente ocultadas para suportar infinitos atributos cumulativos sem poluição de tela.

---

## 5. Checklist de Verificação de Qualidade Visual

Antes de aprovar qualquer alteração de interface:
- [ ] **Contexto Correto:** Se a tela pertence ao Menu Principal / Sistema, está utilizando a escala ampla e a paleta V2 roxo/marrom/dourado com botões `.btn-retro-*`?
- [ ] **Contexto In-Game:** Se a tela é in-game, está utilizando glassmorphism translúcido com `backdrop-filter: blur(12px)`?
- [ ] **Escala de Tipografia:** Títulos principais do menu têm `26px`, subtítulos `14px`, cards `14px–16px`? (Evitar textos minúsculos de 9px–11px).
- [ ] **Morfologia dos Poderes:** Os slots respeitam a geometria SVG oficial (`SlotSvgAssets.ts`) e o tamanho exato de `40px × 40px`?
- [ ] **Filtragem de Zeros:** Telas de atributos ocultam valores `+0` e exibem apenas bônus reais adquiridos?
- [ ] **Interatividade & Feedback:** Todos os botões possuem estados visíveis de `:hover`, `:active` e `:disabled`?
