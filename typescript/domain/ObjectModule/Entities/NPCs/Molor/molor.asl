llm_ctx(2048).
llm_timeout(600).
llm_stateless(true).
llm_temperature(0.7).
llm_max_tokens(80).
introduced(false).
state(idle).

// Sincroniza crença do modelo evitando duplicatas
+current_llm_model(NewM) : current_llm_model(OldM) & NewM \== OldM <-
  -current_llm_model(OldM).

// Configurações cognitivas do Athena BDI
athena_config(action_guard, false).
athena_config(auto_reflexion, true).
athena_config(include_plans, ["seguir_jogador", "parar_de_seguir"]).

!start.

+!start <- .wait(game_started); !routine.

+!routine : state(idle) <- 
  .wait(6000);
  .random(X);
  !molor_action(X);
  !routine
.

+!routine : not state(idle) <- 
  .wait(6000);
  !routine
.

+player_spoke("[Aproximou-se para conversar]") : athena_started & incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("Saudações, aprendiz. O que você busca aprender?").

+player_spoke("[Aproximou-se para conversar]") : athena_started & not incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("*(Organizando pensamentos arcanos...)*");
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("Saudações, aprendiz. O que você busca aprender?").

+player_spoke("[Aproximou-se para conversar]") : not athena_started & current_llm_model(M) <-
  -player_spoke("[Aproximou-se para conversar]");
  +athena_started;
  !start_athena_session(M).

+!start_athena_session(M) <-
  +session_active;
  addPersona("Você é Molor, Diretor sábio da Academia Mágica em um RPG de fantasia. Converse em português com dignidade arcana.");
  reflectPlans;

  ?llm_ctx(Ctx);
  ?llm_timeout(Timeout);
  ?llm_stateless(Stateless);
  startThink(M, [keep_alive(-1), num_thread(4), timeout(Timeout), num_ctx(Ctx), stateless(Stateless)]);
  dialog("*(Sintonizando essência mágica...)*");
  -incorporated;
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("Saudações, aprendiz. O que você busca aprender?").

-!start_athena_session(M) <-
  -athena_started;
  dialog("*(O fluxo de mana foi severamente rompido...)*");
  speak("Minha conexão com a Teia Arcana foi interrompida bruscamente. O fluxo está obstruído.").

// Entrada da percepção de fala do jogador (pura cognição semântica BDI)
+player_spoke(Msg) : athena_started & incorporated & current_llm_model(M) <- 
  -player_spoke(Msg);
  !chat_athena(M, Msg).

+player_spoke(Msg) : not athena_started & current_llm_model(M) <-
  -player_spoke(Msg);
  +athena_started;
  !start_athena_session(M);
  !chat_athena(M, Msg).

+player_spoke(Msg) : athena_started & not incorporated <- 
  -player_spoke(Msg);
  dialog("*(Ainda estou sintonizando minhas memórias arcanas... Aguarde um instante.)*").

+!chat_athena(M, Msg) <-
  ?llm_ctx(Ctx);
  ?llm_timeout(Timeout);
  ?llm_temperature(Temp);
  ?llm_max_tokens(MaxTokens);
  ?llm_stateless(Stateless);
  syllabus("dialogo", "Você é Molor, Diretor sábio da Academia Mágica em um RPG. Analise a intenção do jogador: se o jogador pedir para você acompanhá-lo, segui-lo ou vir junto, responda apenas: !seguir_jogador. Se o jogador pedir para parar, esperar ou ficar, responda apenas: !parar_de_seguir. Para qualquer outra pergunta, conversa ou cumprimento, responda diretamente em português como Molor com uma frase curta sábia. Não use comandos técnicos nem 'respond'.", M, Msg, [stream(true), num_predict(MaxTokens), num_ctx(Ctx), temperature(Temp), timeout(Timeout), stateless(Stateless), repeat_penalty(1.2), num_thread(4)]).

-!chat_athena(M, Msg) <-
  dialog("*(Fios da teia mental se embaraçam...)*");
  speak("A estática mágica impede minha clarividência. Reformule sua sentença, aprendiz.").

// --- PLANOS BDI EXECUTADOS POR INFERÊNCIA COGNITIVA DO ATHENA / PRAXIS ---
+!seguir_jogador : true <-
  -+state(following);
  dialog("Com prazer, aprendiz. Mostre-me o caminho.");
  speak("Mostre o caminho.").

+!parar_de_seguir : true <-
  -+state(idle);
  stop;
  dialog("Permanecerei aqui meditando.");
  speak("Parando por ora.").

+falar_com_jogador(Texto)  <- dialog(Texto); -falar_com_jogador(Texto).
+!falar_com_jogador(Texto) <- dialog(Texto).

+!clear_player_spoke <- .abolish(player_spoke(_)).


+player_distance(D) : state(following) & D > 60 <- 
  move_to("player")
.

+enemy_spotted(Id) : not game_paused(true) <- 
  mcp_domain_use_skill_on_target("m_t5_blackhole");
  attack
.


+player_distance(D) : D < 150 & introduced(false) & game_started <-
  -+introduced(true); 
  speak("Saudações. Sou Molor, Diretor da Academia Mágica.");
  .print("Molor se apresentou.")
.

+hp_percentage(HP) : HP < 25 & game_started <- 
  speak("Sua essência vital está instável!")
.


+intend(follow_player) <- -intend(follow_player); -+state(following); speak("Mostre o caminho.").
+intend(attack)        <- -intend(attack);        -+state(attacking); speak("Contemple a feitiçaria!").
+intend(stop)          <- -intend(stop);          -+state(idle);      speak("Parando por ora."); stop.


+!molor_action(X) : X < 0.2 & not game_paused(true) <- move_to("random").
+!molor_action(X) : X >= 0.2 & X < 0.3 & not game_paused(true) <- 
  mcp_draw_rune("arcane", 400, 300, "gold");
  mcp_ambient_tint("rgba(255, 215, 0, 0.2)", 2000);
  speak("A magia flui através da disciplina e do estudo.").
+!molor_action(X) : X >= 0.3 & X < 0.4 & not game_paused(true) <- 
  mcp_spell_aura("wisdom", "blue");
  speak("Inspecionando os arredores..."); 
  move_to("random").
+!molor_action(X) : X >= 0.4 & X < 0.5 & not game_paused(true) <- 
  mcp_draw_text("ECLIPSE ARCANO!", 400, 250, "purple", 30, 2000);
  mcp_flash_screen("white", 500);
  mcp_domain_use_skill_on_target("m_t5_blackhole");
  speak("Contemple o ápice da magia!").
+!molor_action(_) <- true.





+~game_paused(true) <-
  .abolish(game_paused(true));
  .abolish(~game_paused(true)).


+player_distance(D) : D > 150 & athena_started & session_active <- 
  -session_active;
  clear_session; 
  .print("O jogador se afastou. Memória episódica apagada para economizar tokens.")
.

+player_distance(D) : D <= 150 & athena_started & not session_active <-
  +session_active
.


+!update_settings(Ctx, Timeout, Stateless, Temp, MaxTokens) <-
  -+llm_ctx(Ctx);
  -+llm_timeout(Timeout);
  -+llm_stateless(Stateless);
  -+llm_temperature(Temp);
  -+llm_max_tokens(MaxTokens).

+!update_settings(Ctx, Timeout, Stateless) <-
  -+llm_ctx(Ctx);
  -+llm_timeout(Timeout);
  -+llm_stateless(Stateless).
