# TODO - Synced from GitHub Issues

## Issues

- [X] Interface geral (#13)
    descrição: - [X] Seleção de broches
    - [X] Seleção de broches
    - [X] Geração dos broches
    - [X] Seleção dos broches
    - [X] Salvamento dos broches
    - [X] Telas de status gerais

- [ ] Árvore de habilidades de cada classe (#12)
    descrição: - [ ] Árvores de habilidade das 5 classes-base (guerreiro, gunslighter, arqueiro, mago e feiticeiro)
    - [ ] Árvores de habilidade das 5 classes-base (guerreiro, gunslighter, arqueiro, mago e feiticeiro)
    - [ ] Seleção de classes ao iniciar a run
    - [ ] Listagem e controle das classes desbloqueadas no player
    - [ ] Ganho de itens através de um npc

- [ ] NPCS (#11)
    descrição: - [X] Entidade npc no jogo
    - [X] Entidade npc no jogo
    - [X] Diálogo com npcs
    - [X] tecla de interação e tooltip para interação
    - [~] Hud de conversa
    - [X] Dialog Handler do hud de conversa pelo canvas
    - [ ] Opções para diálogo

- [X] Interface personagem (#10)
    descrição: 
    - [X] - Bag
    - [X]  - Itens equipados (Habilitar as classes e manter as classes atuais no personagem)
    - [X] - Status

- [~] Tela seleção de mapas (#9)
    descrição: - [ ] HUD
    - [ ] HUD
    - [ ] Composição dos mapas na tela
    - [ ] Colocar um mapa (tile)
    - [ ] Junção dos mapas (tiles)
    - [ ] Isso deve ser expansível facilmente
    - [ ] Fog
    - [ ] Seleção de mapas para jogar

- [ ] Compositor de personagem (#8)
    descrição: - [ ] Melhorar o `renderModule/Sprite` para poder juntar os sprites de partes do **personagem** 
    - [ ] Melhorar o `renderModule/Sprite` para poder juntar os sprites de partes do **personagem**
    - [X] Permitir adição de **armas**
    - [X] Adição de **armaduras**
    - [ ] Composição dos sprites de **skills**

- [~] Progressão de Habilidade Mínima (de dentro do mundo): (#6)
    descrição: - [ ] Tela da árvore podendo adicionar habilidades na árvore
    - [ ] Tela da árvore podendo adicionar habilidades na árvore
    - [ ] Nível de xp para upar habilidade
    - [ ] Abrir uma UI temporária (e simples) que oferece a escolha de 1 de 3 upgrades passivos (ex: "+5% Dano", "+10% Velocidade de Ataque", "+1 HP").

- [X] Inventário Mínimo (#5)
    descrição: - [X] Implementar apenas a UI de "Itens Equipados" (o "Paper")
    - [X] Implementar apenas a UI de "Itens Equipados" (o "Paper")

- [ ] Drop de Item Básico (#4)
    descrição: - [X] Inimigos têm X% de chance (ex: 3%) de "dropar" um item ao morrer.
    - [X] Inimigos têm X% de chance (ex: 3%) de "dropar" um item ao morrer.
    - [X] Item fica no chão se inventário cheio.
    - [X] O item é coletado ao passar por cima.
    - [ ] Item tem range de atributos (e muito menor de ter efeito)

- [ ] Paredes e colisões (#3)
    descrição: - [ ] Colisão de entidades
    - [ ] Colisão em objetos do mundo
    - [ ] Mapa de lugares que não pode andar
    - [ ] Lógica de "spawn" de inimigos em áreas.

- [ ] Player Básico (#1)
    descrição: - [x] Design inicial do personagem
    - [ ] Animação para cada uma das direções (8 direções) andando
    - [ ] Animação para cada uma das direções (8 direções) idle

---

## TODO (Organização)

- [x] HUD Modular: Desenvolver as GUIs de HP, Mana e Status
- [x] Compositor Visual (O "Lego"): Sistema modular na fábrica visual para juntar formas simples/sprites para armaduras, itens e customização de personagem.
- [x] Sistema de Drops e Inventário: Entidades droparem itens de verdade, lógica de coleta por proximidade e armazenamento.
- [x] Lógica de Classes e Desbloqueio
- [x] Mago (Spell Parser): Analisador no Domínio que traduz a sequência do buffer em ataques concretos (Lógica de Receitas).
- [x] Seleção de mapas: criação de classes extendidas de mundo que são mapas que são mandadas do domínio para poder selecionar um mapa, que contém toda a estrutura para colocar tudo de um mapa em determinado mapa
- [x] Objetos do mapa: Tem que ter um jeito do adaptador web montar o mundo, o que tem no mundo é definido pelo domínio.

- [X] Refatoração Web (God Class): Isolar o `GameAdapter` extraindo o `SceneManager` (visual), `UIManager` (DOM) e `InputGateway`.
- [X] (Buffer de Input): Implementar buffer temporal no `ActionManager` para capturar sequências de teclas (ex: 0, 1, 2).
- [x] EventManager → IEventManagable (Injeção de Dependência)
- [X] Lógica de Hp
- [X] Hitbox
- [X] Colisão
- [X] Lógica melhor de Enemy e Entity
- [X] Dois tipos de inimigo.
- [X] IA simples (ex: mover-se em direção ao jogador e bater).
- [X] Sistema de Vida (HP) e "Hitbox" (ser atingido) e xp dropado.

- [ ] Precisa de keybinds para f12, para no menu alterar as tabs

## REQUISITOS - Organização

### Mapa

    * Mapa geral contínuo, fast travel para regiões já visitadas

    * Montaria para locomoção

    * **Domínio Agnostico e Coordenadas:** O `World` define as regras do espaço contínuo. Adaptadores devem consumir coordenadas (x,y) relativas ao mapa para instanciar/desenhar blocos (chunks), enquanto o domínio apenas calcula distâncias matemáticas sem se importar com a imagem do chão.

### HUD e GUIs

    * GUI de HP e Mana na tela, lendo diretamente do estado do jogador no domínio.
    * UI modular para mostrar demais atributos de sistema em janelas sobrepostas.

### Armas e Cla    - [ ] Listagem e controle das classes desbloqueadas no player
sses

    * Habilidades passivas das classes funcionam somente com as classes ativas

    * Armas liberam classes mas as classes não são ligadas as armas, pegou o item e libera a classe, mas se tirou, tá desbloqueado

### Iniciar jogo

    * World event que favorece uma classe e outro world event que desfavorecem outras classe (Dois tigrinn na tela) - Seu dano de pistola é reduzido e o dano de pistola de inimigos é aumentado; Dano de espada é aumentado e dano de espada de inimigos é diminuido (Pode variar)

    * Primeira entrada, NPC fala com você explica as classes base (Guerreiro, Feiticeiro, Mago, Arqueiro, )

### Item Drop

    * Item fica no chão se inventário cheio.

    * Item tem range de atributos (e muito menor de ter efeito)

    * Drops são raros e caem no chão. Pega ao passar perto (3% drop rate)

### Mobs

    * Range máximo para aggro dos inimigos. Fora do range desespawna (difício escapar no início)

## Lista de tarefas a discutir

### Épico 1: Interface de Usuário (UI) - Personagem

    Tarefa: [~] Criar Moldura Principal da Interface do Personagem

    [x] Implementar o container principal com 3 abas navegáveis: "Inv" (Inventário), "Status", "Skill".

    [x] Garantir que o estado da aba selecionada seja mantido.

    Tarefa: [x] Implementar Aba "Inv" (Inventário)

    [x] Sub-tarefa: Criar a grade do inventário ("Bolsa") com slots.

    [x] Sub-tarefa: Criar a UI do "Paper Doll" (boneco de equipamento).

    [x] Sub-tarefa: Implementar os slots de equipamento específicos (ex: capacete, peitoral, arma 1, arma 2, bota, pernas, e 3 slots de acessórios/anéis, conforme image_625278.png).

    [x] Sub-tarefa: Criar lógica de "Equipar/Desequipar" via clique entre a Bolsa e o Paper Doll e refletir no Domínio.

    Tarefa: Implementar Aba "Status"

    Sub-tarefa: Criar a seção "ATRIBUTOS" (conforme image_6200bd.jpg).

    Sub-tarefa: Implementar o sistema de "PONTOS: X" para distribuição.

    Sub-tarefa: Adicionar botões de "+"/"-" para alocar pontos em cada atributo.

    Sub-tarefa: Implementar o botão de "alocação automática" (conforme nota no rodapé de image_6200bd.jpg).

    Sub-tarefa: Criar a lista de exibição de status secundários (ex: "CRIT", "Dano", "Magia").

    Sub-tarefa: Implementar o cálculo e exibição de bônus percentuais (ex: "Dano +1024%", conforme image_62525c.png).

    Sub-tarefa: Criar a seção "habilidades passivas" para exibir ícones das passivas ativas.

    Sub-tarefa: Implementar a seção "GERAL" (provavelmente para os "broches" mencionados na sua lista).

### Épico 2: Sistema de Habilidades (Skills)

    Tarefa: [~] Criar UI da "Árvore de Habilidades" (Skill Tree)

    [x] Sub-tarefa: Focar esta interface para ser a Árvore GLOBAL (Meta-Progressão). O In-Game foi movido para o CharacterMenuGui.
    [x] Sub-tarefa: Implementar o layout visual da árvore com nós (círculos, retângulos) e linhas de conexão (conforme image_62009f.jpg).

    [x] Sub-tarefa: Criar lógica de pré-requisitos visual (nó bloqueado e desbloqueado).

    [x] Sub-tarefa: Diferenciar visualmente tipos de nós: "Passiva", "Hab. ativa" (Habilidade Ativa) e "RARO".

    [x] Sub-tarefa: Implementar o sistema de "Tiers" ou seções.

    [x] Sub-tarefa: Associar visualmente cada árvore a uma Classe no topo.

    Tarefa: [x] Criar UI de Gerenciamento de Skills Ativas/Passivas

    [x] Sub-tarefa: Criar a UI para equipar skills in-game no CharacterMenuGui (conforme image_625255.jpg).

    [x] Sub-tarefa: Implementar slots de skills "Ativo" (círculos) e "Passivo" (losangos).

    [x] Sub-tarefa: Implementar sistema visual de "Nível" para skills.

    [x] Sub-tarefa: Implementar sistema visual de slots trancados.

    Tarefa: [x] [Domínio] Lógica das Classes

    [x] Implementar a estrutura: "classes não são ligadas as armas" (desbloqueio no Player é permanente).

    [x] Implementar o gatilho: "Armas liberam classes" (depende do inventário).

    [x] Implementar a separação: Árvore In-Game (reseta, tem binds dinâmicos) vs Árvore Meta-Progression (Global Account).

    [x] Implementar a lógica: "Habilidades passivas das classes rodam `apply` instantaneamente ao serem desbloqueadas".

### Épico 3: Sistema de Mapas e Progressão


    Tarefa: Criar UI e Lógica do Mapa-Múndi

    Sub-tarefa: Implementar a UI do mapa-múndi (conforme image_625293.jpg).

    Sub-tarefa: Adicionar as diferentes zonas/ilhas (ex: "Vilgen", "Aun").

    Sub-tarefa: Implementar a funcionalidade de "Teletransporte" (Fast Travel) para zonas já visitadas.

    Sub-tarefa: Mostrar visualmente os caminhos/conexões entre as zonas.

    Sub-tarefa: Adicionar bússola e botão de fechar "X".

    Tarefa: Criar UI e Lógica do Mapa de Progressão (Run)

    Requisito extraído de image_623b.png (parece um mapa de "run" estilo Slay the Spire).

    Sub-tarefa: Implementar a UI de progressão baseada em nós (nodes).

    Sub-tarefa: Criar lógica para caminhos com bifurcações.

    Sub-tarefa: Criar diferentes tipos de nós (ex: combate, evento, loja, boss).

    Sub-tarefa: Exibir informações nos nós (ex: Nível "Lv 2", Custo/Recompensa "500").

    Sub-tarefa: Implementar a lógica de "Compositor de mapas" (geração procedural ou manual desses caminhos).

### Épico 6: Sistema de Conjuração do Mago Programador (Axiomante)

    Tarefa: [x] [Domínio] Buffer de Entrada (ActionManager)

    [x] Sub-tarefa: Implementar um buffer FIFO temporal no `ActionManager` para capturar e reter sequências curtas de teclas.

    [x] Sub-tarefa: Lógica de expiração (se o jogador não completar a string a tempo, limpa o buffer).

    Tarefa: [x] [Domínio] Analisador Sintático (Spell Parser)

    [x] Sub-tarefa: Criar módulo de domínio `SpellParser` que escuta o buffer e compara com padrões de "Receitas" de magias.

    [x] Sub-tarefa: Instanciar ataques/projéteis com base nos modificadores lidos (Projectile + Fire + Damage = Fireball).

### Épico 7: Compositor Visual Dinâmico (Reutilizável)

    *Módulo de renderização agnóstico focado em sobrepor ou compor imagens/formas base, servindo tanto para as magias do Axiomante quanto para armaduras e customização de personagem.*

    Tarefa: [x] Compositor de Camadas (Layered Renderer)

    [x] Sub-tarefa: Criar módulo visual que aceita um array de `SpriteConfigs` e os desenha na mesma coordenada, respeitando uma ordem de Z-Index.

    [x] Sub-tarefa: Integrar isso ao `RenderableFactory` lendo o `VisualConfigMap` automaticamente.

    Tarefa: Visual Procedural de Magias

    Sub-tarefa: Usar o Compositor de Camadas para empilhar partículas simples (ex: base redonda vermelha + aura laranja) em magias não refinadas.


### Épico 8: Meta-Progressão (O Coração do Roguelite)
    *O sistema global de progressão que persiste entre as mortes, separando a árvore de classe (in-game) da árvore de conta (global).*

    Tarefa: Árvore de Habilidades Global (Hub/Menu)
    Sub-tarefa: Criar interface para a Árvore Global, acessível fora das runs (Hub ou Main Menu).
    Sub-tarefa: Criar `MetaProgressionManager` no Domínio (persiste além do ciclo de vida do `Player`).
    Sub-tarefa: Implementar a injeção de bônus globais: Quando um novo `Player` nasce, o `MetaProgressionManager` injeta atributos bônus nas propriedades de `_bonus` da classe `Attributes`.
    Sub-tarefa: Implementar uma moeda global de persistência (ex: "Essência" ou "Almas") que sobrevive à morte para ser gasta na Árvore Global.


### Épico 4: Sistema de Itens, Crafting e Drops


    Tarefa: [~] [Domínio] Lógica de Drop de Itens

    Implementar taxa de drop (ex: 3%).

    [x] Itens devem instanciar no chão ("caem no chão").

    [x] Implementar coleta por proximidade ("Pega ao passar perto").

    Implementar a regra: "Item fica no chão se inventário cheio".

    Implementar sistema de atributos com ranges variáveis.

    [x] Implementar chance de itens terem "efeitos" especiais.

    Tarefa: Sistema de Crafting (Criação de Itens)

    Requisito extraído de image_625255.jpg ("craftar").

    Sub-tarefa: Criar a UI de Crafting (a lista à esquerda em image_625255.jpg pode ser a lista de receitas).

    Sub-tarefa: Implementar um sistema de receitas (materiais necessários).

    Sub-tarefa: Implementar o desbloqueio de receitas (talvez os slots com cadeado "LISO"?).

    Sub-tarefa: Criar lógica para consumir materiais do inventário e criar o item.

### Épico 5: Customização e Gameplay Inicial

    Tarefa: Compositor de Sprites do Personagem

    Sub-tarefa: Criar a UI de seleção (cabelo, cor, olhos).

    [x] Sub-tarefa: Utilizar o Compositor de Camadas para "montar" o sprite do jogador visualmente.

    [x] Sub-tarefa: Integrar com o inventário: O Compositor agora lê o `iconId` do que está equipado no DTO e busca as texturas dinamicamente!

    Tarefa: Lógica de Início de Jogo (Run)

    Sub-tarefa: Implementar o sistema de "World Events" (buffs/debuffs da run).

    Sub-tarefa: Criar a UI para exibir os eventos ativos (ex: "Dois tigrinn na tela").

    Sub-tarefa: Criar o diálogo/tutorial do NPC inicial para explicar as classes base.
    
    
### Épico 6: Sistema de Conjuração do Mago (Axiomante)
	* [x] Buffer FIFO temporal no `ActionManager`.
	* [x] Spell Parser: Tradução de sequências (ex: 0-1-2) em ataques concretos.
	* [ ] Visual Procedural: Empilhar partículas para magias não listadas no `VisualConfigMap`.

### Épico 9: Sistema de NPCs Cognitivos (Ollama Local) [REVISADO]
	* [x] Abandonar o uso de Sockets e Java/JaCaMo.
	* [x] **CognitiveNpc:** Criar entidade base que se comunica via HTTP local com o Ollama (`fetch`) e compila código JS em tempo de execução.

### Épico 10: Customização e Gameplay Inicial
	* [x] Compositor de Camadas (Layered Renderer) para sprites do player e equipamentos.
	* [x] Seleção de Mapas: Classes estendidas de `World` enviadas do domínio para o adaptador web.
	* [ ] Eventos Mundiais: Buffs/Debuffs de run (ex: dano de espada aumentado para todos).

### Épico 11: A Oficina do Gepeto (Integração 3D)
	* [ ] **Ponte de Renderização Externa:** Utilizar a mesma arquitetura de Sockets para transmitir o estado (DTOs) do Domínio para um motor 3D externo (Unity/Unreal/Godot).
	* [ ] **Cenário Híbrido:** Modelar a "Oficina do Gepeto" inteiramente em 3D. A lógica de negócio, movimentação e crafting continuam no TypeScript, mas o visual roda na engine 3D.
	* [ ] **Transição Fluida 2D -> 3D:** Criar a lógica onde o jogador entra na porta da Oficina no mapa pixel art 2D e o controle visual é assumido instantaneamente pelo cliente 3D conectado.
    

### Épico Extra: Dívida Técnica & Refatoração (Camada Web)

    Tarefa: Desacoplar a "God Class" GameAdapter

        Sub-tarefa: Extrair lógica de inicialização de UI (`XpBarGui` e futuras) para um `UIManager` ou `GUIManager`.

        Sub-tarefa: Extrair a lógica pesada de iteração visual (`syncRenderables`) para um `SceneManager` responsável apenas por conectar DTOs a Factorys.

        Sub-tarefa: Deixar o `GameAdapter` ser apenas um condutor (Bootstrapper) leve que liga os módulos.

    Aqui está o seu novo `todo.md`, atualizado com a transição para **Tauri**, a integração do motor **Athena (BDI)** e o sistema de **NPCs com LLM local (Ollama)**. 

    Este documento mescla o progresso atual com os novos requisitos de infraestrutura desktop e IA.


## INFRAESTRUTURA DESKTOP (TAURI)
	* [ ] **Migração para Tauri:** Configurar o ambiente Rust e envelopar o diretório `adapters/web` atual.
	* [ ] **Instalador Nativo (.exe):** Criar script de instalação que verifica/instala a JVM (Java) e o Ollama.
	* [ ] **Gerenciador de Processos:** Implementar no backend do Tauri o "boot" silencioso do motor Athena (`.jar`) e do servidor Ollama.
	* [ ] **Persistência Criptografada:** Implementar no Rust a lógica de save/load utilizando a palavra-chave encriptada para evitar edição externa do arquivo.
	* [ ] **Tela de Loading (Handshake):** Criar tela de carregamento que aguarda a confirmação de conexão (handshake) dos processos Java e Ollama antes de liberar o menu.
	
## SISTEMA DE NPCs COGNITIVOS (BDI + LLM)
	* [x] **Ponte de Baixa Latência (Sockets):** Implementar comunicação via TCP/UDP entre o Motor TS (Domínio) e o Athena (Java).
	* [x] **InteractiveEntity (Domínio):** Criar classe base para NPCs que recebem comandos diretos de movimento e animação via socket.
	* [x] **Integração Athena-Ollama:** Configurar o Athena para despachar intenções de fala para a porta local do Ollama.
	* [x] **Interface de Diálogo (DialogueGui):** Criar UI modular para exibição de textos da LLM e captação de input (texto/voz) do jogador.

## PROGRESSO ATUAL E REVISÕES
	* [x] HUD Modular: HP, Mana e Status.
	* [x] Compositor Visual (O "Lego"): Sistema modular para armaduras e itens.
	* [x] Sistema de Drops e Inventário: Coleta por proximidade e armazenamento.
	* [x] Buffer de Input: Captura de sequências para o Mago.
	* [x] **Refatoração de Física:** Desacoplar Worker de colisão para evitar bloqueios no Game Loop (Double Buffering).
	* [x] **Limpeza de Memória:** Implementar Object Pooling para projéteis e DTOs de renderização para evitar GC Thrashing.

## 📋 REQUISITOS GERAIS

### Mundo e Navegação

    * Mapa contínuo com Fast Travel entre regiões (Vilgem, Cemii, Alun).
    * O `World` no domínio define coordenadas, enquanto o adaptador desenha chunks conforme a posição.

### Itens e Classes

    * Armas desbloqueiam classes permanentemente no `Player`, mas passivas dependem da classe ativa.
    * Drops raros (3%) com ranges de atributos variáveis.

### Pets e Companheiros

    * Itens de Invocação: Equipar um item específico (ex: "Osso") em um slot do inventário invoca um Pet (ex: Cachorro).
    * O Pet atua como uma entidade aliada no Domínio, seguindo o jogador (IA de Flocking/Steering) e auxiliando-o. Desequipar o item causa o despawn imediato do Pet.

### NPC e Interação

    * **NPC Mentor:** Tutorial inicial explicando as classes base no Hub.
    * **Axiomante (Academia):** Torre de desafios para estabilizar magias via puzzle de conexão elementar.

### Épico 12: Nova Árvore de Habilidades e Loadout (Wireframe Deck Building)
    *Refatoração da UI/UX e Domínio baseada no novo design de topologia semântica, escolhas limitadas e Deck Building.*

    Tarefa: [ ] Topologia e Semântica da Árvore (Viewport)
    > "A árvore deve permitir rolagem para cima e para baixo, além de zoom in e out, todos os elementos devem possuir uma linha para mostrar caminhos de ir de um para o outro"
    [ ] Sub-tarefa: Transformar a área central em um Canvas/Viewport interativo com Pan e Zoom.
    [ ] Sub-tarefa: Nós **Retangulares** para Habilidades Ativas comuns.
    > "Quero adicionar também a estrela que será habilidades ativas essenciais, que vão ser sobre outras teclas, mas a classe vai se basear nelas, tipo as skills do mago, o peixinho do pescador"
    [ ] Sub-tarefa: Nós em **Estrela** para Habilidades Ativas Essenciais (Core skills com atalho próprio fixo).
    [ ] Sub-tarefa: Nós em **Triângulo** para Habilidades Passivas (Buffs permanentes).
    > "Faltou o círculo também que é ponto(s) de aumento de atributos. Somente em alguns níveis que você vai poder aumentar os atributos, e será determinado"
    [ ] Sub-tarefa: Nós em **Círculo** para aumentos de Atributos predeterminados da árvore.
    > "Esse tal de raro (lozangulo) na realidade é escolha de subclasse... esse tal de raro só é raro na árvore global"
    [ ] Sub-tarefa: Nós em **Losango** para as escolhas de Subclasse (Bifurcações críticas de caminho).

    Tarefa: [ ] Sistema de Loadout Dinâmico (Dynamic Keybinding)
    > "...o player só vai poder ter 4 habilidades e escolher conforme"
    [x] Sub-tarefa: Implementar a matriz `activeLoadout: [null, null, null, null]` no Domínio (`Player`).
    [x] Sub-tarefa: Atualizar o `ActionManager` para rotear os atalhos 1, 2, 3 e 4 para as magias equipadas no Loadout.
    [x] Sub-tarefa: Criar o painel lateral esquerdo da UI com os 4 slots numéricos.
    [x] Sub-tarefa: Implementar mecânica de arrastar/clicar para equipar uma magia da árvore/mochila no slot.
    > "Esquece esse botão passivas, o unico elemento flutuante é o lozangulo mistico/mágico amarelado/dourado com o número de pontos nele, o unico botão que tem é o de abrir e fechar os slots de habilidade"
    [ ] Sub-tarefa: Adicionar o botão retrátil para abrir/fechar o painel lateral de slots de habilidade.

    Tarefa: [ ] Mochila de Magias (Pool de Escolhas)
    > "Detalhe importante, a lista das quatro habilidades de slot podem ser da futura árvore global também. O player vai ter que escolher. O que me leva a pensar que ele vai poder reescolher essa habilidade que ele tirou, então vai precisar de uma listagem de habilidades ativas globais que ele tem"
    [x] Sub-tarefa: Mesclar Habilidades Ativas da Árvore Global com as da Classe Atual no DTO (`unlockedActiveSkills`).
    [ ] Sub-tarefa: Criar interface tipo "Mochila de Magias" para o jogador visualizar, filtrar e selecionar entre todas as magias ativas já adquiridas na conta/run.
    [ ] Sub-tarefa: Cabeçalho superior com ícones (Cajado, Espada, Arco) e setas para transição dinâmica das árvores de classes.
    [ ] Sub-tarefa: Adicionar o Losango Místico Dourado flutuante exibindo os Pontos de Habilidade disponíveis para gasto.

---
**Nota de Arquitetura:** Mantenha o `DomainFacade` como o único ponto de entrada para o `SocketGateway` repassar os comandos da IA para o jogo.
