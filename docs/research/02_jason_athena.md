# Pesquisa: Jason-Athena Framework (Córtex Generativo BDI + LLM)

**Caminho de Origem:** `/home/kkphoenix/Documents/Workspace/1. Pesquisa/jason-athena`  
**Conexão com o Jogo:** Direta (`typescript/domain/ObjectModule/Entities/NPCs/PraxisValidator.ts`, arquitetura cognitiva dos NPCs)

---

## 1. O que é o Jason-Athena

O **Athena** é um framework de extensão para o **Jason (BDI)** que integra **Modelos de Linguagem de Larga Escala (LLMs locais via Ollama)** para conferir **Autonomia Generativa** a sistemas multiagentes.

Tradicionalmente, agentes BDI são rigorosos e determinísticos, mas limitados a bibliotecas de planos pré-escritas por desenvolvedores. O Athena introduz um "Córtex Generativo" que permite ao agente:
- Identificar lacunas de conhecimento (*Knowledge Gaps*).
- Sintetizar novos planos em AgentSpeak em tempo de execução quando não houver planos estáticos correspondentes.
- Avaliar instruções externas mantendo senso crítico e resistência a prompt injection.

---

## 2. Componentes Fundamentais do Framework

A arquitetura estende a classe `AgArch` do Jason, interceptando o ciclo de raciocínio BDI:

```
[Reasoning Cycle] ➔ Logos (Observer) ➔ Cognitive Locks ➔ Syllabus (Cortex)
                                                                │
                                                        Ollama (Local LLM)
                                                                │
[Belief Base / Plans]  Praxis (Injector & Janitor) ───────────┘
```

1. **Logos (The Observer):** Monitor autônomo que detecta inatividade do agente (*Idle Time*) ou disparo de crenças críticas (`athena_logos`), ativando o raciocínio generativo sem travar a thread de execução do MAS.
2. **Syllabus (The Cortex):** Responsável pelo roteamento semântico, contexto de persona e envio de prompts para o Ollama via canal isolado (`syllabus`). Aplica filtragem estrita via Regex para garantir que a LLM retorne unicamente comandos Jason / KQML válidos.
3. **Praxis (The Injector & Janitor):**
   - **Injeção com Rastreabilidade (XAI):** Valida a sintaxe do código gerado e injeta novos planos anotados com metadados explicativos: `[source(athena), rationale("...")]`.
   - **Memory GC (Nap Mode / REM Sleep):** Monitora a RAM do sistema (`/proc/meminfo`). Se houver pressão excessiva de memória, executa um "sono REM" descartando planos temporários gerados por IA.
   - **Collector Mode:** Mantém apenas os $N$ planos gerados por IA mais frequentes/úteis.
4. **MemoryManager:** Preserva memória episódica, erros de execução (`athena_remember`) e realimenta o contexto.

---

## 3. Diretivas e Ações Internas (.asl)

O framework Athena disponibiliza um conjunto completo de 18 diretivas operacionais expostas para os arquivos `.asl`:

| Diretiva / Ação | Assinatura | Descrição Operacional |
| :--- | :--- | :--- |
| `startThink` | `startThink(Model, [URL], [Options])` | Inicia sessão com LLM (Ollama/remoto), injeta hooks de auto-reflexão (`-!G`) e adiciona crença `incorporated`. |
| `stopThink` | `stopThink` | Encerra sessão, libera VRAM/KV-cache, desliga threads e remove `incorporated`. |
| `addPersona` | `addPersona(Content)` | Configura persona/system prompt (via string literal ou arquivo de texto). |
| `reflectPlans` / `reflectSelf` | `reflectPlans` ou `reflectSelf` | Extrai e reflete capacidades do próprio agente (`[CAPABILITY] Achieve Goal: !g`). |
| `reflectAll` | `reflectAll` | Reflete capacidades de todos os agentes do MAS via `RunCentralisedMAS`. |
| `syllabus` | `syllabus(Canal, Prompt, Persona, Goal, [Options])` | Roteamento semântico assíncrono via `CognitiveScheduler`, não bloqueante, com trava cognitiva por canal. |
| `ask_llm` | `ask_llm(Prompt, VarResult)` | Consulta síncrona direta com unificação da resposta em `VarResult`. |
| `athena_logos` | `athena_logos(TimeoutMs, [Triggers], [CriticalTriggers], [PostPlans], [EnableLog])` | Observador de inatividade em background. `CriticalTriggers` preemptam pensamentos em andamento. |
| `athena_praxis` | `athena_praxis(PlanString)` | Injeção manual direta de planos/crenças AgentSpeak com validação sintática. |
| `athena_praxis_nap` | `athena_praxis_nap(ItemsToKeep, RamThresholdPercentage)` | Sono REM. Descarta planos IA quando a RAM do SO ultrapassa o limiar percentual. |
| `athena_praxis_counter_collector` | `athena_praxis_counter_collector(ItemsToKeep, IntervalMinutes)` | GC periódico de planos baseado na curva de esquecimento de Ebbinghaus. |
| `athena_evolve` | `athena_evolve(Goal, Reason, [Model])` | Dispara auto-cura/evolução em falha de meta (`-!G`) quando `auto_reflexion` está ativo. |
| `athena_remember` | `athena_remember(Goal, Outcome, Details)` | Registra episódio na memória de longo prazo (`MemoryManager`). |
| `clear_session` / `athena_clear_session` | `clear_session` ou `athena_clear_session` | Limpa histórico de diálogo e contexto episódico da sessão no Ollama. |
| `clear_context` | `clear_context(Canal)` | Limpa o contexto acumulado em canal específico do `Syllabus`. |
| `addContext` | `addContext(Type, Content)` | Adiciona contexto multimodal (`"mas"`, `"persona"`, `"image"`, `"video"`, `"audio"`). |
| `removeContext` | `removeContext(Type)` | Remove contextos pendentes por tipo. |
| `athena_log_level` | `athena_log_level(Level)` | Define nível de log (`"OFF"`, `"SEVERE"`, `"WARNING"`, `"INFO"`, `"FINE"`, `"ALL"`). |

### 3.1. Opções Dinâmicas Suportadas (`parseDynamicOptions`)
Suportadas em `startThink` e `syllabus`:
`temperature(F)`, `num_predict(I)`, `num_ctx(I)`, `num_thread(I)`, `top_k(I)`, `top_p(F)`, `min_p(F)`, `memory_k(I)`, `repeat_penalty(F)`, `seed(I)`, `timeout(I)`, `attention_focus(S)`, `stream(B)`, `keep_alive(I)`, `format(S)`, `stop(List)`.

---

## 4. Relação com o `rpg-roguelite-game`
- Os conceitos de **`Praxis`** serviram de base direta para o [`PraxisValidator.ts`](file:///home/kkphoenix/Documents/Workspace/rpg-roguelite-game/typescript/domain/ObjectModule/Entities/NPCs/PraxisValidator.ts) do jogo, que funciona como a sandbox que valida, higieniza e rejeita payloads maliciosos ou alucinados gerados pelos NPCs cognitivos.
- O gerenciamento do ciclo de vida do Ollama (`warmup`, pinning de modelo e detecção de health) em `OllamaHealthCheck.ts` e `ollama_manager.rs` reflete as práticas de otimização de latência do Athena.
