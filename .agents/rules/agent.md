# AGENTS.md - Diretrizes e Papel do Agente

## 1. Atribuição de Papéis e Divisão de Trabalho

A partir desta definição, a divisão de responsabilidades entre o **Agente** e o **Usuário** para a criação de cenários, mapas e elementos de jogo é estritamente a seguinte:

| Responsabilidade | Responsável | Descrição |
| :--- | :--- | :--- |
| **Criação de Assets Visuais** | **Agente** | Criação, geração de imagens (IA / Blender / ferramentas visuais), tratamento de spritesheets, recorte de fundo transparente (PNG RGBA), otimização de resolução e entrega de assets prontos para uso. |
| **Composição de Cenário & Mapa** | **Usuário** | Posicionamento dos assets na tela, distribuição nos chunks e montagem espacial do mundo de jogo. |
| **Criação e Ajuste de Hitboxes** | **Usuário** | Desenho e definição das caixas de colisão, polígonos e círculos (via PolygonWebEditor ou arquivos de configuração). |

---

## 2. Diretrizes Técnicas para Criação de Assets

Ao criar novos assets para o projeto, o agente deve seguir rigorosamente:

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
- Manter 100% dos testes unitários e de integração passando (`npm test` com `tsc --noEmit`).
- **Mandato Obrigatório de Testes a Cada Execução:** Toda e qualquer execução de desenvolvimento, refatoração de funcionalidade ou correção de defeito DEVE vir obrigatoriamente acompanhada de novos **testes unitários** (cobrindo a nova unidade/função em isolamento) e novos **testes de regressão** (blindando o sistema contra reincidência de bugs). Nenhuma tarefa é considerada concluída sem a criação de ambos os tipos de teste.
