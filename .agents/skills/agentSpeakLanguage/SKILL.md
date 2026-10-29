---
name: agentSpeakLanguage
description: >-
  Enforces AgentSpeak (Jason / Athena / Panteão) syntax conventions, architectural patterns,
  and coding style specific to this repository. Use whenever creating, reviewing, or editing
  .asl files, NPC cognitive behaviors, or AgentSpeak plans.
---

# Skill: AgentSpeak Language & NPC Architecture

Esta skill define as boas práticas normativas, regras sintáticas e o padrão estilístico estrito para escrita de agentes **AgentSpeak (`.asl`)** no ecossistema do **RPG Roguelite Game** (integrado ao **Panteão BDI** e **Jason-Athena**).

---

> [!IMPORTANT]
> ### 💖 Nossa Escolha e Paixão: Framework Athena
> **Neste projeto, PREFERIMOS E PRIORIZAMOS o uso do Jason-Athena em relação a qualquer abordagem tradicional.**
>
> **Amamos a ideia, a elegância arquitetural e a filosofia do Athena:**
> 1. **Soberania BDI com Criatividade Generativa:** Acreditamos que a inteligência artificial para jogos deve unir o rigor lógico e a determinística das crenças, desejos e intenções (BDI) à espontaneidade e raciocínio contextual de LLMs locais.
> 2. **A Tríade Filosófica (Logos, Syllabus, Praxis):** A divisão entre a observação não-bloqueante (*Logos*), o roteamento semântico ético e seguro (*Syllabus*) e a materialização/higienização de novos planos com sono REM e curva de esquecimento (*Praxis*) é a base do nosso design de NPCs autônomos.
> 3. **Auto-evolução e Resiliência (`auto_reflexion`):** NPCs que aprendem com o fracasso e reescrevem seus próprios planos (`athena_evolve` em `-!G`) trazem uma profundidade viva de narrativa emergente ao RPG.
>
> Por essa razão, **todo novo NPC ou refinamento de comportamento cognitivo deve abraçar o Athena como motor primário de cognição**.

---

## 1. Padrão de Estilo e Assinatura Visual (Code Style)

Todos os agentes no projeto (`Molor`, `Candelion`, `Derocar`, `Molin`) seguem um estilo coeso. Qualquer novo agente deve seguir estritamente este layout:

### 1.1. Cabeçalho de Estado Mental (Header)
Todo arquivo `.asl` deve iniciar com os predicados de configuração de LLM e estado inicial do agente:
```agentspeak
llm_ctx(768).
llm_timeout(600).
llm_stateless(true).
introduced(false).
state(idle).

!start.
```

### 1.2. Loop de Vida Autônomo e Sincronia de Jogo
O loop principal deve aguardar o sinal `game_started` do domínio e respeitar o estado cinemático `state(idle)` e de pausa `game_paused(true)`:
```agentspeak
+!start <- .wait(game_started); !routine.

+!routine : state(idle) <- 
  .wait(4000); // 3000 a 6000ms dependendo do dinamismo do NPC
  .random(X);
  !npc_action(X);
  !routine
.

+!routine : not state(idle) <- 
  .wait(4000);
  !routine
.
```

> **Atenção à Pontuação:**
> - Fechamento de planos com ponto final em linha separada (`.` ou `\n.`) ou imediatamente após o último comando.
> - Separadores de ação em ponto e vírgula (`;`).
> - Ações condicionadas por `.random(X)` distribuídas em intervalos determinísticos (`X < 0.2`, `X >= 0.2 & X < 0.3`, etc.).

---

## 2. Padrão Obrigatório de Integração Cognitiva (Athena + LLM)

### 2.1. Handshake de Diálogo com Lazy Loading (3 Cenários)
Quando o jogador se aproxima para interagir, o agente deve tratar 3 estados lógicos para evitar travamentos. **IMPORTANTE:** Sempre remova imediatamente a crença `-player_spoke("[Aproximou-se para conversar]");` no início do plano para permitir que o jogador se reaproxime e seja saudado novamente:

```agentspeak
// 1. Já inicializado e sintonizado (incorporated)
+player_spoke("[Aproximou-se para conversar]") : athena_started & incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("Texto curto de saudação contextual do NPC.").

// 2. Inicializado mas ainda carregando contexto
+player_spoke("[Aproximou-se para conversar]") : athena_started & not incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("*(Pensamento/animação de preparação...)*");
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("Texto curto de saudação contextual do NPC.").

// 3. Primeira aproximação (Lazy Load da LLM)
+player_spoke("[Aproximou-se para conversar]") : not athena_started & current_llm_model(M) <-
  -player_spoke("[Aproximou-se para conversar]");
  +athena_started;
  !start_athena_session(M).
```

### 2.2. Sessão Athena e Limpeza de Memória (Praxis & Nap)
> **Atenção à Ordem:** Configure `athena_config(exclude_plans, ...)` **ANTES** de `reflectPlans;`, caso contrário os planos internos (`start`, `routine`, etc.) vazarão para o contexto cognitivo da LLM.

```agentspeak
+!start_athena_session(M) <-
  athena_config(action_guard, false);
  athena_config(auto_reflexion, true);
  athena_config(exclude_plans, ["start", "routine", "start_athena_session", "chat_athena", "update_settings", "clear_player_spoke", "npc_action"]);
  addPersona("Você é [Nome], [Descrição do Arquétipo]. Responda em português.");
  reflectPlans;

  ?llm_ctx(Ctx);
  ?llm_timeout(Timeout);
  ?llm_stateless(Stateless);
  startThink(M, [keep_alive(-1), num_thread(4), timeout(Timeout), num_ctx(Ctx), stateless(Stateless)]);
  dialog("*(Preparando essência...)*");
  -incorporated;
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("Texto de boas-vindas.").

// Plano de contingência se a LLM falhar:
-!start_athena_session(M) <-
  -athena_started;
  dialog("*(Falha no elo de mana...)*");
  speak("Minha conexão foi temporariamente interrompida.").
```

### 2.3. Roteamento Assíncrono com `syllabus`
A geração de respostas deve sempre usar `syllabus` em canal isolado para não bloquear o ciclo BDI.
> **Assinatura Estrita:** `syllabus(Canal, Persona, Modelo, Mensagem, [Opcoes])`
> **Paridade de Contexto:** Sempre passe `num_ctx(Ctx)` na lista de opções para evitar que o Ollama descarregue o modelo da memória por incompatibilidade de tamanho de janela.
> O Praxis envelopa texto puro gerado pela IA no predicado `+falar_com_jogador("...")`. Portanto, declare **tanto** o gatilho de crença `+` quanto o de meta `+!` para garantir que a fala do NPC chegue à UI.

```agentspeak
// Comandos diretos de ação pelo jogador (semântica BDI instantânea)
+player_spoke(Msg) : (.substring("segue", Msg) | .substring("vem", Msg) | .substring("acompanha", Msg)) <-
  -player_spoke(Msg);
  -+state(following);
  dialog("Estou te acompanhando!");
  speak("Mostre o caminho.").

+player_spoke(Msg) : (.substring("pare", Msg) | .substring("para", Msg) | .substring("espera", Msg)) <-
  -player_spoke(Msg);
  -+state(idle);
  stop;
  dialog("Aguardando aqui.");
  speak("Parando por ora.").

+player_spoke(Msg) : athena_started & incorporated & current_llm_model(M) <- 
  -player_spoke(Msg);
  !chat_athena(M, Msg).

+!chat_athena(M, Msg) <-
  ?llm_ctx(Ctx);
  syllabus("dialogo", "Você é [Nome], [Persona]. Responda em português em no máximo 2 frases curtas. Não use comandos técnicos.", M, Msg, 
           [stream(true), num_predict(80), num_ctx(Ctx), temperature(0.7), stateless(true), repeat_penalty(1.2), num_thread(4)]).

-!chat_athena(M, Msg) <-
  dialog("*(A mente divaga...)*");
  speak("A estática mágica interrompeu minha resposta.").

+player_spoke(Msg) : athena_started & not incorporated <- 
  -player_spoke(Msg);
  dialog("*(Ainda estou sintonizando minhas memórias... Aguarde um instante.)*").

// Handler bidirecional (Crença do Praxis + Meta padrão)
+falar_com_jogador(Texto)  <- dialog(Texto); -falar_com_jogador(Texto).
+!falar_com_jogador(Texto) <- dialog(Texto).
```

---

## 3. Gestão de Memória, Recursos e Telemetria

1. **Descarte de Memória Episódica por Proximidade:**
   Se o jogador se afastar mais de 150px, limpar a sessão para evitar desperdício de tokens na GPU/CPU:
   ```agentspeak
   +player_distance(D) : D > 150 & athena_started <- 
     .clear_session; 
     .print("O jogador se afastou. Memória episódica apagada para economizar tokens.")
   .
   ```
2. **Atualização Dinâmica de Configurações:**
   ```agentspeak
   +!update_settings(Ctx, Timeout, Stateless) <- 
     -+llm_ctx(Ctx); 
     -+llm_timeout(Timeout); 
     -+llm_stateless(Stateless).
   ```
3. **Pausa e Despausa do Jogo:**
   ```agentspeak
   +~game_paused(true) <-
     .abolish(game_paused(true));
     .abolish(~game_paused(true)).
   ```

---

## 4. Reatividade Física, Combate e Ações Especiais (MCP)

### 4.1. Transições de Intenção e Movimento
```agentspeak
+player_distance(D) : state(following) & D > 40 <- move_to("player").

+intend(follow_player) <- -intend(follow_player); -+state(following); speak("Mostre o caminho.").
+intend(attack)        <- -intend(attack);        -+state(attacking); speak("Atacando!").
+intend(stop)          <- -intend(stop);          -+state(idle);      speak("Parando por ora."); stop.
```

### 4.2. Efeitos Visuais e Habilidades MCP
Integração com os efeitos da engine do jogo através de ações prefixadas com `mcp_`:
- `mcp_domain_use_skill_on_target("id_skill")`
- `mcp_draw_rune("tipo", x, y, "cor")`
- `mcp_ambient_tint("rgba(...)", duracaoMs)`
- `mcp_spell_aura("tipo", "cor")`
- `mcp_glitch(duracaoMs)`
- `mcp_flash_screen("cor", duracaoMs)`

---

---

## 5. Diretivas e Ações Internas do Framework Athena

O **Jason-Athena** adiciona um córtex cognitivo generativo estendendo a arquitetura do Jason (`AgArch`). Todas as chamadas de controle cognitivo e LLM utilizam as seguintes diretivas (ações internas):

### 5.1. Tabela Completa de Diretivas do Athena

| Diretiva / Ação | Assinatura | Descrição Operacional e Comportamento |
| :--- | :--- | :--- |
| `startThink` | `startThink(Model, [URL], [Options])` | Inicializa a sessão com a LLM local (Ollama) ou remota. Adiciona a crença `incorporated` à base de crenças quando a sincronização estiver concluída. Injeta automaticamente ganchos de auto-reflexão (`-!G`). |
| `stopThink` | `stopThink` | Finaliza a sessão ativa da LLM. Descarrega o modelo da VRAM (libera KV-cache), encerra threads de observação em background e remove a crença `incorporated`. |
| `addPersona` | `addPersona(Content)` | Define a persona do agente (System Prompt). Aceita uma string inline literal ou um caminho relativo/absoluto para arquivo de texto (`.txt`/`.md`). |
| `reflectPlans` / `reflectSelf` | `reflectPlans` ou `reflectSelf` | Inspeciona a biblioteca de planos do próprio agente e extrai assinaturas de capacidade no formato `[CAPABILITY] Achieve Goal: !g`, filtrando pelos planos incluídos/excluídos em `athena_config`. |
| `reflectAll` | `reflectAll` | Mapeia e reflete as capacidades de todos os agentes ativos no Multi-Agent System (MAS) via `RunCentralisedMAS`, permitindo colaboração e delegação inter-agentes. |
| `syllabus` | `syllabus(Canal, Prompt, Persona, Goal, [Options])` | Roteamento semântico assíncrono de alto nível via `CognitiveScheduler`. **Não bloqueia** o ciclo de raciocínio BDI. Aplica trava cognitiva (*cognitive lock*) por canal e envia o resultado diretamente para injeção via `Praxis`. |
| `ask_llm` | `ask_llm(Prompt, VarResult)` | Executa consulta síncrona direta à LLM (one-shot). Bloqueia a intenção corrente até receber a resposta textual e unificar a string na variável `VarResult`. |
| `athena_logos` | `athena_logos(TimeoutMs, [Triggers], [CriticalTriggers], [PostPlans], [EnableLog])` | Configura o observador em background (*Logos*). Dispara deliberação quando o agente fica ocioso por `TimeoutMs`. `CriticalTriggers` interrompem e preemptam pensamentos correntes de menor prioridade. |
| `athena_praxis` | `athena_praxis(PlanString)` | Injeção direta e manual de planos ou crenças em AgentSpeak na mente do agente, validando sintaxe e anotando proveniência (`[source(athena)]`). |
| `athena_praxis_nap` | `athena_praxis_nap(ItemsToKeep, RamThresholdPercentage)` | Ativa o modo de sono REM (*REM Sleep*). Monitora o uso de memória RAM do sistema operacional; se o consumo exceder `RamThresholdPercentage` (ex: `75.0`), descarta planos efêmeros gerados por IA, retendo apenas os `ItemsToKeep` mais recentes. |
| `athena_praxis_counter_collector` | `athena_praxis_counter_collector(ItemsToKeep, IntervalMinutes)` | Garbage Collector periódico baseado na curva de esquecimento de Ebbinghaus. A cada `IntervalMinutes`, expurga planos dinâmicos raramente acionados. |
| `athena_evolve` | `athena_evolve(Goal, Reason, [Model])` | Aciona o mecanismo de auto-cura/evolução do agente. Disparado automaticamente na falha de uma meta (`-!G`) quando `auto_reflexion` está ativo, solicitando que a LLM reestruture o plano com base na falha. |
| `athena_remember` | `athena_remember(Goal, Outcome, Details)` | Registra um episódio na memória de longo prazo do agente (`MemoryManager`) para alimentar aprendizado por reforço em contexto (*few-shot* episódico). |
| `clear_session` / `athena_clear_session` | `clear_session` ou `athena_clear_session` | Limpa o histórico da conversa e o contexto episódico da sessão ativa do agente no Ollama, liberando memória e reiniciando a janela de contexto. |
| `clear_context` | `clear_context(Canal)` | Esvazia a fila e os vetores de contexto acumulados em um canal de comunicação específico do `Syllabus`. |
| `addContext` | `addContext(Type, Content)` | Adiciona contexto multimodal ou situacional à mente do agente. Suporta: `"mas"`, `"persona"`, `"image"` (Base64), `"video"` (5 quadros extraídos) e `"audio"` (transcrito via pipeline que injeta `+percepcao_audio`). |
| `removeContext` | `removeContext(Type)` | Remove contextos pendentes especificados por tipo (ex: `"image"`, `"persona"`). |
| `athena_log_level` | `athena_log_level(Level)` | Ajusta dinamicamente a verbosidade de log do Java/Athena (`"OFF"`, `"SEVERE"`, `"WARNING"`, `"INFO"`, `"FINE"`, `"ALL"`). |

### 5.2. Opções Dinâmicas Suportadas (`parseDynamicOptions`)

Tanto `startThink` quanto `syllabus` aceitam uma lista de opções dinâmicas para parametrização do Ollama / runtime:

```agentspeak
[
  temperature(0.7),        // Criatividade (0.0 determinístico a 1.0 generativo)
  num_predict(80),         // Limite máximo de tokens gerados na resposta
  num_ctx(768),            // Tamanho da janela de contexto da LLM
  num_thread(4),           // Número de threads de CPU alocadas para inferência
  top_k(40),               // Top-K sampling
  top_p(0.9),              // Nucleus sampling
  min_p(0.05),             // Limiar mínimo de probabilidade de token
  memory_k(3),             // Quantidade de episódios recuperados do MemoryManager
  repeat_penalty(1.2),     // Penalidade de repetição de n-grams
  seed(42),                // Semente de aleatoriedade para reprodutibilidade
  timeout(600),            // Timeout de resposta em segundos
  attention_focus("combate"), // Foco de atenção semântico
  stream(true),            // Resposta via streaming token-a-token
  keep_alive(-1),          // Tempo de permanência do modelo na VRAM (-1 = infinito)
  format("json"),          // Força saída no formato estruturado (ex: "json")
  stop(["\n", "Human:"])   // Stop words para truncamento da inferência
]
```

---

## 6. Regras Críticas de Semântica e Sintaxe

1. **Variáveis sempre iniciam com Maiúscula:** `X`, `Msg`, `D`, `M`, `Ctx`. Identificadores com minúscula são tratados como átomos constantes.
2. **Uso de `-+` para Atualização de Crenças:** Sempre use `-+crenca(Valor)` para substituir valores únicos (evita acúmulo de duplicatas na Base de Crenças).
3. **Plano de Contingência (`-!`) Obrigatório:** Qualquer plano que faça E/S, rede, chamada à LLM ou ações externas deve possuir um plano `-!plano` correspondente para garantir resiliência e fail-safe.
4. **Proibição Absoluta de Sintaxes Inexistentes (Não cometa este erro):**
   - **NÃO EXISTE `if` EM AGENTSPEAK!** Nunca escreva `if (...) { } else { }`. O controle de fluxo é estritamente **declarativo** e deve ser modelado no **contexto do plano** (`: condicao <- acao.` vs `: not condicao <- outra_acao.`).
   - **NÃO EXISTE `while` OU `for`!** Laços e repetições são modelados exclusivamente por **recursão de metas** (`!iterar(Resto)` com caso base e passo indutivo) ou operações sobre listas/conjuntos (`.member`, `.length`).
   - **NÃO USE** operadores de concorrência paralela (`|||`, `|&|`). Dispare metas independentes desacopladas (`!!nova_intencao`) quando desejar concorrência.
   - **NÃO USE** sintaxe de namespaces (`ns::literal`). Os predicados são literais diretos na Base de Crenças (`predicado(X)`).
5. **Registro no `project.jcm`:** Todo novo agente `.asl` criado deve ser registrado no `typescript/domain/ObjectModule/Entities/project.jcm` com a arquitetura `br.com.kkphoenix.Athena` ou `TalariaAgArch`.

---

## 7. Mandato Obrigatório de Testes: Testes Unitários e Testes de Regressão a Cada Execução

> [!IMPORTANT]
> **DIRETRIZ MANDATÓRIA DE EXECUÇÃO:**
> **Toda criação de novo comportamento, agente BDI, plano de raciocínio `.asl`, alteração em `CognitiveNPC`, `BdiGateway` ou `PraxisValidator` DEVE VIR ACOMPANHADA de novos testes unitários e testes de regressão.**
> 
> 1. **Testes Unitários Obrigatórios:**
>    - Validar invariantes lógicas, unificação, tratamento de planos de contingência (`-!`), sanitização de AST e timeouts em `typescript/tests/domain/` ou testes de BDI.
> 2. **Testes de Regressão Obrigatórios:**
>    - Para cada falha de parsing, deadlock de intenção ou loop cognitivo corrigido, implementar teste de regressão assegurando que a correção permaneça estável e determinística.

---

## 8. Documentos de Referência Obrigatórios

Antes de criar ou alterar agentes, consulte os resumos e manuais detalhados da arquitetura BDI e AgentSpeak deste repositório:
- 📖 [**Manual Canônico de Regras do AgentSpeak**](./references/AgentSpeak_Jason_Rules.md) (`docs/research/AgentSpeak_Jason_Rules.md`): Tipos, semântica SOS, unificação de variáveis, desempilhamento de intenções e ações internas padrão.
- 🏛️ [**Resumo do Motor Panteão**](../../../docs/research/01_panteao.md): Como o binário GraalVM (`panteao-engine`) gerencia o MAS em background e recebe ações via socket IPC.
- 🧠 [**Resumo do Córtex Athena**](../../../docs/research/02_jason_athena.md): O funcionamento do `Logos`, `Syllabus` e `Praxis` na integração de LLMs locais com os agentes do jogo.

