Documento de Requisitos de UI Detalhado - Main Menu (Roguelite Bullet Hell)

Diretriz Geral de Estilo:
A interface deve ser renderizada inteiramente em pixel art. O layout baseia-se em uma tela com navegação por uma barra inferior contendo 5 abas. As descrições a seguir detalham o conteúdo de cada tela correspondente às abas, exatamente como rascunhado nos wireframes fornecidos.
ABA 1: Árvore de Habilidades / Progressão Global (Baseado na Imagem de Árvore)

Esta tela representa uma árvore de progressão vertical ou de baixo para cima, conectando nós de habilidades/broches por caminhos.

    Estrutura de Fundo e Linhas de Nível:

        A tela é cortada por linhas horizontais finas e retas, que delimitam "Tiers" ou camadas de progressão.

        Na extremidade esquerda da linha horizontal superior, há o número "3" em tamanho grande, indicando possivelmente o Tier 3.

        Na base inferior da tela, há um eixo horizontal com pequenas marcações verticais (como uma régua). No lado esquerdo deste eixo basal, há o numeral romano "VI" acompanhado de um ícone que parece um pequeno "check" estilizado ou estrela riscada.

    Os Nós (Nodes) e Conexões:

        Nó Principal Superior (Centro-Alto): Um círculo grande contendo um triângulo detalhado com bordas texturizadas. No centro do triângulo, há um ícone de raio (\lightning). Ao lado direito do triângulo (ainda dentro da área de influência), há um símbolo de "check" (✓) e o valor "500".

        Nó Central (Caminho Principal): Conectado ao nó superior por uma linha grossa, tortuosa e bem definida, descendo para a direita. No meio deste caminho, há uma pequena bifurcação com um símbolo de faísca/estrela de quatro pontas, acompanhado de um "check" (✓) e o número "25".

        Nó Inferior (Centro-Baixo): O caminho tortuoso grosso desce até um círculo que se assemelha a uma moeda, com bordas em relevo (serrilhadas). Dentro deste círculo, há o desenho de uma flor ou rosa. Ao lado direito, possui um "check" (✓). Abaixo do círculo, há dois traços curvos indicando uma sombra ou pedestal.

        Nós Secundários (Esquerda): A partir do caminho principal, uma linha pontilhada fina desce para a esquerda até um círculo duplo (um círculo dentro do outro) contendo um símbolo de estrela ou cruz torcida. Ao lado, o número "202". Mais abaixo e à direita deste, há um pequeno nó solto com formato de lâmina crescente ou lua estilizada.

        Nós Secundários (Direita): No topo, à direita do Nó Principal Superior, há um círculo simples e vazio. Desse círculo, linhas pontilhadas descem e se ramificam para a direita até outro nó circular que contém um anel interno (círculo duplo estilo alvo).

    Elementos Flutuantes: No canto inferior direito da tela, desconectado de nós, o número "1000" está escrito de forma flutuante.

ABA 2: Equipamentos / Loadout (Baseado na Imagem Dividida Verticalmente)

A tela é explicitamente dividida por uma linha vertical central desenhada à mão, separando a área de slots equipados (esquerda) do inventário de itens disponíveis (direita).

    Taxonomia das 4 Categorias de Habilidades e Formatos Geométricos Semânticos:
    - 1. Ativas da Árvore de Classes: 1 a 4 slots com botão (teclas 1 a 4). Formato visual: **Quadrados** (`square-slot`).
    - 2. Ativas Primordiais / Essenciais de Classe: Habilidade central da classe com botão dedicado (ex: peixe do pescador). Formato visual: **Estrelas SVG** (`primordial-slot`).
    - 3. Broches Ativos da Árvore Global: 1 a 6 slots com botão (teclas de atalho). Formato visual: **Círculo com espinhos em volta tipo Sol SVG** (`sun-brooch-slot`).
    - 4. Broches Passivos da Árvore Global: 1 a 4 slots sem botão (numerais romanos I a IV). Formato visual: **Triângulo Truncado SVG** (`triangle-passive-slot`).
    - 5. Atributos Acumulativos da Árvore Global: **Círculos / Orbes** (`cumulative-attr-orb`) com container de rolagem fluida para suportar crescimento infinito.

    *Nota de Design:* Não existe aba separada de "Broches Relicários". Os broches são os broches ativos (1-6) e passivos (I-IV) equipados e vinculados à meta-progressão global.

    Coluna da Esquerda (Slots de Equipamento - Teclas 1, 2, 3 e 4):

        Existem quatro botões em formato de "pílula" (retângulos com as bordas direitas fortemente arredondadas), encostados na margem esquerda da tela.

        Primeiro Slot (Topo): Está desbloqueado. Contém o desenho de uma cruz ou sinal de "mais" grosso. Há uma palavra rabiscada de forma cursiva à esquerda (que se assemelha a "outon" ou "cuton"). Uma seta longa desenhada à mão vem do inventário na direita e aponta diretamente para dentro deste slot, indicando a ação de equipar ("drag and drop").

        Segundo Slot: Contém o desenho claro de um cadeado fechado. No canto inferior direito do cadeado, o texto "L10".

        Terceiro Slot: Contém um cadeado fechado. No canto inferior direito do cadeado, o texto "L30".

        Quarto Slot (Base): Contém um cadeado fechado, sem texto indicativo visível.

    Coluna da Direita (Inventário de Broches):

        Topo: Apresenta três nós arredondados alinhados horizontalmente (como abas ou filtros, ou apenas os primeiros itens da lista).

            Item 1 (Esquerda): Um círculo com borda texturizada (tipo moeda) contendo uma lua crescente no centro. Deste item sai a seta que aponta para o primeiro slot da coluna da esquerda.

            Item 2 (Centro): Um círculo liso contendo o ícone de um raio (\lightning). Há um círculo bem pequeno anexado ao canto inferior direito deste item contendo as letras "Lv". Uma seta curva aponta de baixo para cima indicando este item, junto à palavra "Ativo".

            Item 3 (Direita): Um círculo liso completamente vazio.

        Centro: Uma forma geométrica grande de uma estrela poligonal irregular, com aproximadamente 10 a 12 pontas afiadas (semelhante a uma explosão / broche ativo em sol).

        Centro-Direita: Um triângulo truncado de cantos arredondados, preenchido com linhas paralelas de sombreamento/textura (insígnia de broche passivo). Uma seta aponta para ele vinda da palavra "Passivo", localizada logo acima e à direita.

ABA 3: Seleção de Mapa (Baseado na Imagem das Ilhas)

A tela exibe um mapa topográfico conceitual no centro, cercado por elementos de interface clássicos de navegação.

    O Mapa Central:

        Três massas de terra (ilhas ou regiões) em formato orgânico e irregular, posicionadas juntas no centro da tela.

        Ilha da Esquerda: Contém o desenho de uma árvore com copa arredondada. O nome da região está escrito abaixo como "Cem" ou "Cemii".

        Ilha Central: Está levemente sobreposta pela ilha da esquerda e direita. Contém o desenho de uma pequena casa de teto triangular. Abaixo, o nome "Vilgem".

        Ilha da Direita: Contém o desenho de uma estrutura que parece uma torre ou farol (cilindro com teto pontiagudo) e um quadrado/retângulo acima da área. O nome abaixo é "Alun" ou "Hum".

        Conexões: Linhas sinuosas (parecendo rios ou estradas) conectam as ilhas. Há um símbolo de "M" (ondas/montanhas) perto da casa central. Uma seta explícita sai da ilha central em direção à ilha da esquerda, com o texto "tp" (teleport) escrito logo acima da ponta da seta.

    Elementos de Fundo: O fundo atrás das ilhas está preenchido com linhas rápidas em zigue-zague (rabiscos angulares), que devem representar uma neblina de guerra, mar revolto, nuvens ou energia mística ao redor das regiões jogáveis.

    UI do Mapa:

        Canto Superior Direito: Um botão circular perfeito contendo um grande "X" desenhado no centro, que serve como botão de fechar ou voltar para a tela anterior.

        Canto Inferior Direito: Uma Rosa dos Ventos. Composta por um círculo transpassado por uma estrela de quatro pontas finas, com pequenos triângulos entre as pontas principais. As marcações direcionais são "N" (Norte) no topo, "S" (Sul) na base, "L" (Leste) à direita e "O" (Oeste) à esquerda.

        Centro Inferior: Um botão grande e retangular com as bordas laterais inclinadas para dentro (formato de trapézio truncado invertido ou pedestal). Dentro dele, o texto "TELEtrans..".

ABA 4: Colecionáveis, Aprendizados e Stats (Baseado na Imagem "Stats")

Uma tela de visualização de texto e dados estruturados, com um layout de listagem limpa.

    Cabeçalho Superior Esquerdo: O título "Stats" escrito em tamanho grande.

    Listagem de Atributos:

        Linha 1: Um ícone minimalista de uma estrela de quatro pontas curvadas para dentro (estilo brilho/sparkle). Ao lado, escrito "DANO + 1.024%".

        Linha 2: O mesmo ícone de brilho/estrela. Ao lado, escrito "MAGIA + 9%".

    Divisória: Uma única linha horizontal contínua é traçada atravessando a tela inteira da esquerda para a direita, separando os status exibidos acima da seção abaixo.

    Seção Inferior: Logo abaixo da linha divisória, alinhado à esquerda, está o título "upgrades". O espaço abaixo desta palavra está vazio no rascunho, reservado para a interface de habilidades das classes, troféus e os presets de builds mencionados nos seus requisitos funcionais.