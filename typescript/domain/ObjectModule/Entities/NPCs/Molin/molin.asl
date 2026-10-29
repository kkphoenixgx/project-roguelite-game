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
  .wait(4000);
  .random(X);
  !molin_action(X);
  !routine
.

+!routine : not state(idle) <- 
  .wait(4000);
  !routine
.

+player_spoke("[Aproximou-se para conversar]") : athena_started & incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("Oh, um visitante! Olá! Como posso te ajudar?").

+player_spoke("[Aproximou-se para conversar]") : athena_started & not incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("*(Sincronizando com a floresta...)*");
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("Oh, um visitante! Olá! Como posso te ajudar?").

+player_spoke("[Aproximou-se para conversar]") : not athena_started & current_llm_model(M) <-
  -player_spoke("[Aproximou-se para conversar]");
  +athena_started;
  !start_athena_session(M).

+!start_athena_session(M) <-
  +session_active;
  addPersona("Você é Molin, criatura fofa e gentil da floresta em um RPG. Responda com doçura e simpatia em português.");
  reflectPlans;

  ?llm_ctx(Ctx);
  ?llm_timeout(Timeout);
  ?llm_stateless(Stateless);
  startThink(M, [keep_alive(-1), num_thread(4), timeout(Timeout), num_ctx(Ctx), stateless(Stateless)]);
  dialog("*(Sincronizando com a floresta...)*");
  -incorporated;
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("Oh, um visitante! Olá! Como posso te ajudar?").

-!start_athena_session(M) <-
  -athena_started;
  dialog("*(Zzz... Ronc... A ligação caiu...)*");
  speak("Ahhh, acho que bebi muita poção de inteligência de uma vez... Dói a cabeça.").

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
  dialog("*(Piscando os olhinhos enquanto a floresta me responde...)*").

+!chat_athena(M, Msg) <-
  ?llm_ctx(Ctx);
  ?llm_timeout(Timeout);
  ?llm_temperature(Temp);
  ?llm_max_tokens(MaxTokens);
  ?llm_stateless(Stateless);
  syllabus("dialogo", "Você é Molin, criatura fofa e meiga da floresta em um RPG. Analise a intenção do jogador: se o jogador pedir para você acompanhá-lo, segui-lo ou passear junto, responda apenas: !seguir_jogador. Se o jogador pedir para parar, esperar, descansar ou tirar uma soneca, responda apenas: !parar_de_seguir. Para qualquer outra pergunta, conversa ou carinho, responda diretamente em português como Molin com uma frase fofa e curta. Não use comandos técnicos nem 'respond'.", M, Msg, [stream(true), num_predict(MaxTokens), num_ctx(Ctx), temperature(Temp), timeout(Timeout), stateless(Stateless), repeat_penalty(1.2), num_thread(4)]).

-!chat_athena(M, Msg) <-
  dialog("*(Zzz... O quê?)*");
  speak("Deu branco total, acho que vou tirar uma soneca aqui mesmo.").

// --- PLANOS BDI EXECUTADOS POR INFERÊNCIA COGNITIVA DO ATHENA / PRAXIS ---
+!seguir_jogador : true <-
  -+state(following);
  dialog("Eba! Vou passear com você pela floresta!");
  speak("Vou passear com você!").

+!parar_de_seguir : true <-
  -+state(idle);
  stop;
  dialog("Tudo bem, vou descansar aqui entre as plantinhas.");
  speak("Hora da soneca.").

+falar_com_jogador(Texto)  <- dialog(Texto); -falar_com_jogador(Texto).
+!falar_com_jogador(Texto) <- dialog(Texto).

+!clear_player_spoke <- .abolish(player_spoke(_)).

+player_distance(D) : state(following) & D > 30 <- 
  move_to("player")
.

+enemy_spotted(Id) : not game_paused(true) <- 
  mcp_spell_aura("heal", "green");
  attack
.

+player_distance(D) : D < 80 & introduced(false) & game_started <-
  -+introduced(true); 
  speak("Muuuu-ito prazer. Eu sou Molin.");
  .print("Molin se apresentou.")
.

+hp_percentage(HP) : HP < 20 & game_started <- 
  speak("Você precisa de ervas curativas urgentes!")
.

+item_picked_up(Item) : game_started <- 
  speak("A grama é melhor.")
.

+intend(follow_player) <- -intend(follow_player); -+state(following); speak("Vou passear com você!").
+intend(attack)        <- -intend(attack);        -+state(attacking); speak("Saiam de perto das flores!").
+intend(stop)          <- -intend(stop);          -+state(idle);      speak("Hora da soneca."); stop.

+!molin_action(X) : X < 0.3 & not game_paused(true) <- move_to("random").
+!molin_action(X) : X >= 0.3 & X < 0.4 & not game_paused(true) <- 
  mcp_draw_rune("star", 400, 300, "green");
  speak("Olha que flor bonita! Zzz...").
+!molin_action(X) : X >= 0.4 & X < 0.5 & not game_paused(true) <- 
  mcp_spell_aura("heal", "green");
  stop; 
  speak("Acho que vou tirar uma soneca aqui mesmo.").
+!molin_action(_) <- true.





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
