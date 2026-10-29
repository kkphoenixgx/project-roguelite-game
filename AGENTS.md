# AGENTS.md - Diretrizes e Papel do Agente

## 1. Atribuição de Papéis e Divisão de Trabalho

A partir desta definição, a divisão de responsabilidades entre o **Agente**, o **Usuário** e o **Especialista em Criação de Assets** é estritamente a seguinte:

| Responsabilidade | Responsável | Descrição |
| :--- | :--- | :--- |
| **Criação de Assets Visuais** | **Especialista em Assets (via Usuário)** | Criação, desenho e geração de assets visuais (imagens, sprites, texturas, props e cenários). Sempre que novos assets forem necessários, o Agente solicita ao Usuário, que encaminha a demanda ao Especialista de Assets. |
| **Composição de Cenário & Mapa** | **Usuário** | Posicionamento dos assets na tela, distribuição nos chunks e montagem espacial do mundo de jogo. |
| **Criação e Ajuste de Hitboxes** | **Usuário** | Desenho e definição das caixas de colisão, polígonos e círculos (via PolygonWebEditor ou arquivos de configuração). |
| **Integração & Registro em Código** | **Agente** | Registro dos assets entregues nos catálogos de apresentação (`VisualConfigMap.ts`), sem gerar as imagens por conta própria. |

---

## 2. Diretrizes Técnicas para Especificação e Integração de Assets

Ao solicitar novos assets ao Especialista (via Usuário) ou registrá-los no projeto:

1. **Formato & Transparência**:
   - Salvar sempre em formato `PNG` com canal alfa (`RGBA`) limpo, sem resíduos de fundo ou bordas pretas/brancas.
   - Otimizar com interpolação de alta qualidade (Lanczos).

2. **Direção de Arte & Identidade Visual**:
   - Respeitar a identidade visual de *Alvorada de Vilgem* e a Paleta Normativa V2 (Grimdark medieval com toques arcanos).
   - Traços hand-drawn / 2.5D isométricos consistentes com os assets existentes.

3. **Escala e Proporção do Mundo (1x World Scale)**:
   - Ter como referência o tamanho base do personagem ($32\text{px} \times 32\text{px}$) e as dimensões dos chunks ($1024\text{px} \times 1024\text{px}$):
     - **Casas / Construções Pequenas**: $\approx 220\text{px} \times 240\text{px}$ a $260\text{px} \times 280\text{px}$.
     - **Construções Grandes / Torres**: $\approx 280\text{px} \times 320\text{px}$ a $320\text{px} \times 360\text{px}$.
     - **Props Médios (Barracas, Fontes, Poços)**: $\approx 60\text{px}$ a $170\text{px}$.
     - **Props Pequenos (Bancos, Postes, Barris)**: $\approx 35\text{px}$ a $60\text{px}$.
     - **Natureza (Árvores, Arbustos, Pedras)**: $\approx 55\text{px}$ a $130\text{px}$.

4. **Organização de Pastas**:
   - **Assets Estáticos (Imagens Base / Limpas)**:
     - `typescript/adapters/web/assets/scenery/houses/`: Construções, chalés, torres, moinhos.
     - `typescript/adapters/web/assets/scenery/fortifications/`: Portões fortificados, torres de vigia, muralhas.
     - `typescript/adapters/web/assets/scenery/props/`: Mobiliário urbano, postes, bancos, barris, poços.
     - `typescript/adapters/web/assets/scenery/market/`: Barracas de feira, engradados, tendas.
     - `typescript/adapters/web/assets/scenery/nature/`: Árvores, arbustos, rochedos, flores.
     - `typescript/adapters/web/assets/scenery/fountain/`: Fontes e monumentos centrais.
   - **Spritesheets Animadas**:
     - Todo arquivo de animação (`*_anim.png`) deve ficar no caminho espelho sob `typescript/adapters/web/assets/sprites/` (ex: `assets/sprites/scenery/houses/`, `assets/sprites/scenery/fortifications/`, `assets/sprites/scenery/props/`, etc.).

---

## 3. Arquitetura e Engenharia de Código

- Sempre que for necessário registrar um novo asset em código para torná-lo utilizável, registrar apenas no catálogo de apresentação ([`VisualConfigMap.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/adapters/web/shared/VisualConfigMap.ts)), sem definir posições na tela ou lógica de colisão pelo usuário.
- Para validar a integridade sintática e estrutural dos assets e mapas registrados sem rodar a suíte pesada de adaptadores, executar exclusivamente: `npm run test:maps` (ou `npm run test:maps:fast`).
- **Comutador / Switch de Testes de Regressão Automático:** Para blindar o sistema contra reincidência de bugs sem precisar passar paths manuais, executar: `npm run test:regression` (ou `npm run test:regression:fast`). Qualquer agente ou IA DEVE executar este comando no encerramento de suas tarefas para certificar que novas implementações não quebraram comportamentos preexistentes.
- Manter 100% dos testes unitários e de integração passando (`npm test` com `tsc --noEmit`).
- **Mandato Obrigatório de Testes a Cada Execução:** Toda e qualquer execução de desenvolvimento, refatoração de funcionalidade ou correção de defeito DEVE vir obrigatoriamente acompanhada de novos **testes unitários** (cobrindo a nova unidade/função em isolamento) e novos **testes de regressão** (blindando o sistema contra reincidência de bugs). Nenhuma tarefa é considerada concluída sem a criação de ambos os tipos de teste.
- **Meta Mínima de Cobertura de Testes (>= 70%):** O projeto exige no mínimo **70% de cobertura de código** (linhas, funções, branches e statements) para testes unitários e de integração em todos os módulos e fluxos. Para validar e visualizar a cobertura de todos os arquivos, executar `npm run test:coverage` e visualizar o dashboard interativo standalone gerado via `npm run coverage:report` (`coverage/dashboard.html`). A ferramenta é testada e mantida sob conformidade em `typescript/tests/compliance/CoverageDashboardCompliance.test.ts`.

---

## 4. Fronteira Estrita do Agente: Desenvolvedor do Domínio ("Cérebro no Pote")

O Agente atua estritamente como **Desenvolvedor do Domínio**:
- **Escopo Exclusivo de Implementação**:
  - Modificar, projetar, refatorar e testar exclusivamente o código sob [`typescript/domain/`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/).
  - Modelar regras puras de RPG, lógica de combate, status effects, progressão de atributos, física determinística, IA de entidades, mundos lógicos e ciclo de vida de objetos.
  - Criar e expor contratos de Portas Secundárias ([`typescript/domain/ports/`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ports/)), DTOs de transporte e eventos semânticos tipados ([`IGameEvents.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/eventDispacher/IGameEvents.ts)) para consumo externo.

- **Proibição Estrita no Frontend / Adaptadores**:
  - **NÃO implementar nem modificar a camada de adaptadores e apresentação ([`typescript/adapters/`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/adapters/))**:
    - Não alterar renderizadores visuais (Canvas 2D, WebGPU, Shaders).
    - Não alterar a lógica de desenho e ciclo de vida de [`GameAdapter.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/adapters/web/components/GameAdapter.ts) ou [`Map.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/adapters/web/components/renderModule/scene/Map.ts).
    - Não alterar nem criar componentes de interface gráfica, telas HTML/CSS ([`UIManager.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/adapters/web/components/UiManager/UIManager.ts), GUIs).
    - Não manipular DOM, eventos de tela ou bindings de frontend.
  - A responsabilidade do Agente termina na entrega da base do Domínio, dos contratos e dos testes de domínio, cabendo ao especialista de Frontend/Adaptadores a integração visual.

