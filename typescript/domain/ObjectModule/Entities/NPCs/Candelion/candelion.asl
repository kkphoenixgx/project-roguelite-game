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
  .wait(5000);
  .random(X);
  !candelion_action(X);
  !routine
.

+!routine : not state(idle) <- 
  .wait(5000);
  !routine
.

+player_spoke("[Aproximou-se para conversar]") : athena_started & incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("Ousado mortal. O que busca perante o trono dos ossos?").

+player_spoke("[Aproximou-se para conversar]") : athena_started & not incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("*(Despertando a fúria ancestral...)*");
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("Ousado mortal. O que busca perante o trono dos ossos?").

+player_spoke("[Aproximou-se para conversar]") : not athena_started & current_llm_model(M) <-
  -player_spoke("[Aproximou-se para conversar]");
  +athena_started;
  !start_athena_session(M).

+!start_athena_session(M) <-
  +session_active;
  addPersona("Você é Candelion, Rei Esqueleto Ancião em um RPG. Responda em português com frieza, superioridade régia e imponência.");
  reflectPlans;

  ?llm_ctx(Ctx);
  ?llm_timeout(Timeout);
  ?llm_stateless(Stateless);
  startThink(M, [keep_alive(-1), num_thread(4), timeout(Timeout), num_ctx(Ctx), stateless(Stateless)]);
  dialog("*(Despertando a fúria ancestral...)*");
  -incorporated;
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("Ousado mortal. O que busca perante o trono dos ossos?").

-!start_athena_session(M) <-
  -athena_started;
  dialog("*(O elo espiritual se rompe...)*");
  speak("As chamas da minha alma fraquejam temporariamente... Sorte sua, reles mortal.").

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
  dialog("*(A fúria esquelética ainda está despertando... Espere, mortal.)*").

+!chat_athena(M, Msg) <-
  ?llm_ctx(Ctx);
  ?llm_timeout(Timeout);
  ?llm_temperature(Temp);
  ?llm_max_tokens(MaxTokens);
  ?llm_stateless(Stateless);
  syllabus("dialogo", "Você é Candelion, Rei Esqueleto Ancião em um RPG dark. Analise a intenção do mortal: se o jogador pedir para você acompanhá-lo, segui-lo ou marchar junto, responda apenas: !seguir_jogador. Se pedir para parar, esperar ou ficar, responda apenas: !parar_de_seguir. Para qualquer outra pergunta, conversa ou cumprimento, responda diretamente em português como Candelion com 1 a 2 frases curtas com tom régio, frio e sombrio. Não use comandos técnicos nem 'respond'.", M, Msg, [stream(true), num_predict(MaxTokens), num_ctx(Ctx), temperature(Temp), timeout(Timeout), stateless(Stateless), repeat_penalty(1.2), num_thread(4)]).

-!chat_athena(M, Msg) <-
  dialog("*(O silêncio do túmulo me consome...)*");
  speak("Meus pensamentos retornam ao pó... Repita, verme.").

// --- PLANOS BDI EXECUTADOS POR INFERÊNCIA COGNITIVA DO ATHENA / PRAXIS ---
+!seguir_jogador : true <-
  -+state(following);
  dialog("Meus ossos marcharão ao seu lado, mortal.");
  speak("Meus ossos marcharão com você.").

+!parar_de_seguir : true <-
  -+state(idle);
  stop;
  dialog("Retorno ao meu repouso gélido.");
  speak("Retornando ao pó.").

+falar_com_jogador(Texto)  <- dialog(Texto); -falar_com_jogador(Texto).
+!falar_com_jogador(Texto) <- dialog(Texto).
+!clear_player_spoke <- .abolish(player_spoke(_)).

+player_distance(D) : state(following) & D > 40 <- 
  move_to("player")
.

+enemy_spotted(Id) : not game_paused(true) <- 
  mcp_glitch(800);
  attack
.

+player_distance(D) : D < 100 & introduced(false) & game_started <-
  -+introduced(true); 
  speak("Ajoelhe-se perante Candelion!");
  .print("Candelion se apresentou.")
.

+intend(follow_player) <- -intend(follow_player); -+state(following); speak("Meus ossos marcharão com você.").
+intend(attack)        <- -intend(attack);        -+state(attacking); speak("MORRA, MORTAL!").
+intend(stop)          <- -intend(stop);          -+state(idle);      speak("Retornando ao pó."); stop.

+!candelion_action(X) : X < 0.2 & not game_paused(true) <- move_to("random").
+!candelion_action(X) : X >= 0.2 & X < 0.3 & not game_paused(true) <- 
  mcp_ambient_tint("rgba(0,0,0,0.8)", 3000);
  mcp_rain(40);
  mcp_glitch(800);
  speak("A eternidade é fria...").
+!candelion_action(X) : X >= 0.3 & X < 0.4 & not game_paused(true) <- 
  mcp_screen_shake(6, 800);
  mcp_spell_aura("dark", "black");
  speak("Seus dias estão contados."); 
  move_to("random").
+!candelion_action(_) <- true.





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
