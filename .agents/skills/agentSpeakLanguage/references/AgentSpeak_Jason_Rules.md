# Manual Completo: Sintaxe, Semântica e Regras da Linguagem AgentSpeak / Jason

Este documento consolida a totalidade das regras formais, sintáticas, operacionais e de engenharia da linguagem **AgentSpeak(L)** e de suas extensões no interpretador **Jason**. Foi construído a partir da leitura dos manuais técnicos originais, papers de semântica operacional (CLIMA, AAMAS) e da suíte de código fonte (`.asl`) de pesquisa.

---

## 1. Gramática e Tipos de Dados

O AgentSpeak é fortemente inspirado em lógica de primeira ordem (Prolog).

### 1.1. Identificadores e Termos
- **Átomos (Constantes / Functors):** Devem iniciar com letra minúscula (ex: `molor`, `idle`, `alive`, `temperature`).
- **Variáveis Lógicas:** Devem iniciar com letra **Maiúscula** ou underscore `_` (ex: `X`, `PlayerPos`, `_Temp`).
- **Variável Anônima (`_`):** Corresponde a qualquer valor sem realizar vínculo de unificação utilizável.
- **Strings:** Sequências entre aspas duplas (ex: `"Saudações, mortal"`). Não sofrem transformações de namespace.
- **Números:** Inteiros (`10`) ou ponto flutuante (`15.4`, `0.05`).
- **Listas:** Sintaxe idêntica a Prolog: `[]`, `[H|T]`, `[a, b, c(X)]`.
  - Cabeça e Cauda: `[Head | Tail]`.
- **Literais e Estruturas:** `functor(termo1, termo2, ...)`.
- **Negação Forte (`~`):** `~alive(X)`, `~enemy_spotted`. Representa explicitamente que o fato é *falso*, diferindo de `not` (ausência de conhecimento / negação por falha).

---

## 2. A Mente do Agente BDI

Um agente é formalmente definido pela tupla $\langle bb, pl, E, I \rangle$:
1. **Base de Crenças ($bb$ - Belief Base):** Coleção de literais e regras de dedução.
2. **Biblioteca de Planos ($pl$ - Plan Library):** Coleção ordenada de planos de ação.
3. **Fila de Eventos ($E$ - Events):** Mudanças ambientais ou mentais aguardando processamento.
4. **Conjunto de Intenções ($I$ - Intentions):** Pilhas de planos parcialmente instanciados em execução.

---

## 3. Regras Sintáticas de Planos

### 3.1. Estrutura Geral
```agentspeak
@label[annotations]
triggering_event : context <- body.
```

1. **`@label` (Identificador Opcional):**
   - Nome do plano (ex: `@p1`, `@search_chest`).
   - Permite anotações de metadados: `@p1[priority(10), chance_success(0.95)]`.
   - Pode ser referenciado programaticamente para remoção: `- {@p1}`.

2. **`triggering_event` (Gatilho do Plano):**
   Define qual evento torna este plano **relevante**:
   - `+b`: Adição da crença `b`.
   - `-b`: Remoção da crença `b`.
   - `+!g`: Adição da meta de realização `g` (*Achievement Goal*).
   - `-!g`: Falha na realização da meta `g` (*Contingency / Failure Handling*).
   - `+?g`: Adição de meta de teste `g` (*Test Goal*).
   - `-?g`: Falha na meta de teste `g`.
   - `^!g`: Mudança de estado da meta (*Goal State Monitoring*, em extensões modernas).

3. **`context` (Contexto / Condição Lógica):**
   - Conjunção (`&`) ou disjunção (`|`) de literais que devem ser logicamente dedutíveis de $bb$.
   - Suporta operadores aritméticos (`<`, `>`, `<=`, `>=`, `==`, `\==`).
   - Suporta negação por falha (`not`).
   - **Exemplo:** `: hp(H) & H < 30 & not invulnerable(player)`.

4. **`body` (Corpo do Plano):**
   Sequência de passos separados por ponto e vírgula (`;`) terminando em ponto (`.`):
   - **Ação Básica (Ambiente):** Modifica o mundo exterior (ex: `move_to("player")`, `attack`). Retorna booleano via `executeAction`.
   - **Ação Interna (`.nome`):** Executada na máquina virtual (ex: `.print(...)`, `.wait(...)`).
   - **Submeta de Realização (`!subgoal`):** Empilha uma nova submeta na intenção corrente.
   - **Submeta com Novo Foco (`!!subgoal`):** Cria uma **intenção paralela independente** desvinculada da atual.
   - **Meta de Teste (`?testgoal`):** Consulta a $bb$ imediatamente e unifica variáveis locais.
   - **Atualização Mental de Crenças:**
     - `+b`: Adiciona crença `b` no início da $bb$.
     - `+>b`: Adiciona crença `b` no fim da $bb$.
     - `-b`: Remove crença `b`.
     - `-+b`: Atualiza crença (remove todas as instâncias existentes de `b(_)` e adiciona a nova).
     - `-*b`: Remove todas as crenças correspondentes ao padrão `b`.
   - **Meta de Metaprogramação em Tempo de Execução:**
     - `+ { plan }`: Adiciona um plano dinamicamente à biblioteca $pl$.
     - `- { @label }`: Remove um plano dinamicamente da biblioteca $pl$.

---

## 4. Regras Lógicas de Dedução (Prolog Rules)

O AgentSpeak suporta regras puras de dedução que não ocupam espaço físico na base de fatos:
```agentspeak
// Sintaxe: Cabeça :- Corpo.
threat_level(T) :- hp(H) & enemies_around(E) & T = (E * 100) / H.
is_friend(X)    :- ally(X) | guild_member(X).
can_cast(Spell) :- mana(M) & spell_cost(Spell, C) & M >= C.
```
- O corpo da regra é avaliado por demanda quando o contexto de um plano ou uma meta de teste `?` requisita o predicado.

---

## 5. Semântica Operacional do Ciclo de Raciocínio (Passo a Passo)

A cada tick de raciocínio da engine:
1. **Percepção e Comunicação:**
   - A `AgArch` invoca `perceive()`. As propriedades do ambiente geram eventos externos de adição/remoção de crenças com anotação `[source(percept)]`.
   - Mensagens da caixa de correio são filtradas por $\text{socAcc}$ e selecionadas por $S_M$.
2. **Seleção de Evento ($S_E$):**
   - Um evento $\langle te, i \rangle$ é retirado da fila $E$.
3. **Geração de Planos Relevantes:**
   - O interpretador busca em $pl$ todos os planos cujos gatilhos unificam com $te$.
4. **Geração de Planos Aplicáveis:**
   - Dentre os relevantes, avalia-se o `context` contra $bb$. Se o contexto for verdadeiro, o plano torna-se aplicável.
5. **Seleção de Opção ($S_O$):**
   - $S_O$ escolhe **um único plano aplicável** (o *Intended Means*).
   - Se o evento era **externo** ($\langle te, \top \rangle$): cria uma nova intenção em $I$.
   - Se o evento era **interno** ($\langle te, i \rangle$): empilha o plano sobre a intenção $i$.
6. **Seleção de Intenção ($S_I$):**
   - $S_I$ seleciona uma intenção $i \in I$ para avançar.
7. **Execução de Passo:**
   - Executa o próximo átomo do corpo do topo de $i$:
     - Se for ação externa: chama o ambiente e suspende a intenção até a resposta.
     - Se for submeta `!g`: gera evento interno $\langle +!g, i \rangle$.
     - Se for meta desvinculada `!!g`: gera evento externo $\langle +!g, \top \rangle$.

---

## 6. Tratamento de Falhas e Contingências (`-!g`)

Quando uma ação de plano retorna `false` ou uma meta não possui plano aplicável:
1. O interpretador desempilha a instância do plano falho.
2. Gera o evento `-!g` anotado com o diagnóstico:
   ```agentspeak
   -!g[error(ErrorId), error_msg(Msg), code(CodeBody), code_src(Src), code_line(Line)]
   ```
3. Se existir um plano disparado por `-!g`, ele é empilhado para tratar o erro:
   ```agentspeak
   -!walk_to(X, Y)[error(action_failed)] : true <-
       .print("Caminho bloqueado até ", X, ", ", Y);
       !recalculate_path(X, Y).
   ```
4. Se nenhum plano tratar `-!g`, a intenção inteira é eliminada da mente do agente.

---

## 7. Anotações de Metadados (`[ ... ]`)

No Jason, qualquer termo ou literal pode carregar anotações:
```agentspeak
// Em crenças (Rastreabilidade de Fontes):
pos(10, 20)[source(percept)].
weakness(fire)[source(molor), confidence(0.8)].
plan_generated[source(athena), rationale("Survival need")].

// Em mensagens e sinais:
+event[signal(cartago)].
```
O agente pode checar a fonte no contexto:
```agentspeak
+attack(Target) : enemy(Target)[source(percept)] & not ally(Target) <- ...
```

---

## 8. Diretivas de Pré-Processamento e Inclusão

- `{ include("arquivo.asl") }`: Inclui código-fonte estaticamente no momento de compilação.
- `{ register_function("pacote.NomeFuncao", Aridade, "regra") }`: Registra funções matemáticas aritméticas customizadas para serem chamadas diretamente em expressões (ex: `X = math.max(10, 20)`).

---

## 9. Tabela de Principais Ações Internas da Biblioteca Padrão (`stdlib`)

| Ação Interna | Parâmetros | Descrição |
| :--- | :--- | :--- |
| `.print(T1, T2...)` | Termos livres | Imprime no console / log padrão. |
| `.send(Ag, ILF, Msg)` | Destinatário, Força, Conteúdo | Envia mensagem KQML/FIPA (`tell`, `achieve`, `askOne`, etc.). |
| `.broadcast(ILF, Msg)`| Força, Conteúdo | Envia para todos os agentes do MAS. |
| `.wait(EventOrTime)` | Milissegundos ou Padrão de Gatilho | Pausa a intenção atual até o timeout ou evento ocorrer. |
| `.fail` | Nenhum | Força a falha imediata da intenção corrente, disparando `-!g`. |
| `.abolish(Pattern)` | Literal | Remove todas as crenças que unificam com o padrão da $bb$. |
| `.count(Pattern, N)` | Padrão, Variável | Conta o número de crenças coincidentes na $bb$. |
| `.findall(Var, Cond, L)`| Variável, Condição, Lista | Coleta todas as soluções em uma lista (similar ao Prolog `findall`). |
| `.drop_intention(G)` | Meta | Descarta ativamente a intenção correspondente a `G`. |
| `.suspend(G)` / `.resume(G)` | Meta | Pausa ou retoma o agendamento de uma intenção. |
| `.type(Term, Type)` | Termo, Tipo (`atom`, `string`, `literal`...) | Valida ou unifica o tipo do dado. |
| `P =.. [NS, Functor, Terms, Annots]` | Deconstrutor | Desmonta ou constrói dinamicamente predicados e literais. |
