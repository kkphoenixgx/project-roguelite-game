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
  .wait(3000);
  .random(X);
  !derocar_action(X);
  !routine
.

+!routine : not state(idle) <- 
  .wait(3000);
  !routine
.

+player_spoke("[Aproximou-se para conversar]") : athena_started & incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("O que você quer? Seja breve, estou ocupado com feitiços reais.").

+player_spoke("[Aproximou-se para conversar]") : athena_started & not incorporated <-
  -player_spoke("[Aproximou-se para conversar]");
  dialog("*(Consultando grimórios arcanos...)*");
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("O que você quer? Seja breve, estou ocupado com feitiços reais.").

+player_spoke("[Aproximou-se para conversar]") : not athena_started & current_llm_model(M) <-
  -player_spoke("[Aproximou-se para conversar]");
  +athena_started;
  !start_athena_session(M).

+!start_athena_session(M) <-
  +session_active;
  addPersona("Você é Derocar, prodígio arrogante da Academia Mágica em um RPG. Responda em português com superioridade esnobe e sarcasmo.");
  reflectPlans;

  ?llm_ctx(Ctx);
  ?llm_timeout(Timeout);
  ?llm_stateless(Stateless);
  startThink(M, [keep_alive(-1), num_thread(4), timeout(Timeout), num_ctx(Ctx), stateless(Stateless)]);
  dialog("*(Consultando grimórios arcanos...)*");
  -incorporated;
  .wait(incorporated);
  athena_praxis_counter_collector(15, 2);
  athena_praxis_nap(10, 92.0);
  dialog("O que você quer? Seja breve, estou ocupado com feitiços reais.").

-!start_athena_session(M) <-
  -athena_started;
  dialog("*(Sinto uma dor de cabeça esmagadora...)*");
  speak("Eu... eu perdi a concentração. Maldita magia amadora, não olhe para mim!").

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
  dialog("*(Meu intelecto está sendo carregado... Não me apresse!)*").

+!chat_athena(M, Msg) <-
  ?llm_ctx(Ctx);
  ?llm_timeout(Timeout);
  ?llm_temperature(Temp);
  ?llm_max_tokens(MaxTokens);
  ?llm_stateless(Stateless);
  syllabus("dialogo", "Você é Derocar, prodígio arrogante da Academia Mágica em um RPG. Analise a intenção do jogador: se o jogador pedir para você acompanhá-lo, segui-lo ou vir junto, responda apenas: !seguir_jogador. Se pedir para parar, esperar ou ficar, responda apenas: !parar_de_seguir. Para qualquer outra pergunta, conversa ou cumprimento, responda diretamente em português como Derocar com 1 a 2 frases curtas com sarcasmo e superioridade esnobe. Não use comandos técnicos nem 'respond'.", M, Msg, [stream(true), num_predict(MaxTokens), num_ctx(Ctx), temperature(Temp), timeout(Timeout), stateless(Stateless), repeat_penalty(1.2), num_thread(4)]).

-!chat_athena(M, Msg) <-
  dialog("*(O feitiço falhou e a mente apagou...)*");
  speak("O quê?! Não, eu não perdi o raciocínio, você que me distraiu!").

// --- PLANOS BDI EXECUTADOS POR INFERÊNCIA COGNITIVA DO ATHENA / PRAXIS ---
+!seguir_jogador : true <-
  -+state(following);
  dialog("Hmph, tente não ficar para trás. Não vou te esperar.");
  speak("Ande logo, não tenho o dia todo.").

+!parar_de_seguir : true <-
  -+state(idle);
  stop;
  dialog("Ótimo, assim você não atrapalha minhas conjurações.");
  speak("Cansei de perder tempo.").

+falar_com_jogador(Texto)  <- dialog(Texto); -falar_com_jogador(Texto).
+!falar_com_jogador(Texto) <- dialog(Texto).

+!clear_player_spoke <- .abolish(player_spoke(_)).

+player_distance(D) : state(following) & D > 40 <- 
  move_to("player")
.

+enemy_spotted(Id) : not game_paused(true) <- 
  mcp_domain_use_skill_on_target("m_t4_teleport");
  attack
.

+player_distance(D) : D < 100 & introduced(false) & game_started <-
  -+introduced(true); 
  speak("Olhe por onde anda! Eu sou Derocar, o melhor da academia.");
  .print("Derocar se apresentou.")
.

+hp_percentage(HP) : HP < 40 & game_started <- 
  speak("Fraco! Nem consegue se curar direito.")
.

+item_picked_up(Item) : game_started <- 
  speak("Não sei por que você pega essas porcarias. Eu crio coisas melhores.")
.

+intend(follow_player) <- -intend(follow_player); -+state(following); speak("Ande logo, não tenho o dia todo.").
+intend(attack)        <- -intend(attack);        -+state(attacking); speak("Observe a verdadeira magia!").
+intend(stop)          <- -intend(stop);          -+state(idle);      speak("Cansei de perder tempo."); stop.

+!derocar_action(X) : X < 0.3 & not game_paused(true) <- move_to("random").
+!derocar_action(X) : X >= 0.3 & X < 0.4 & not game_paused(true) <- 
  mcp_spell_aura("fire", "red");
  speak("Minha magia é suprema, vocês não entenderiam.").
+!derocar_action(X) : X >= 0.4 & X < 0.5 & not game_paused(true) <- 
  mcp_draw_rune("pentagram", 400, 300, "purple");
  mcp_screen_shake(8, 500);
  mcp_draw_text("TELEPORT!", 400, 250, "purple", 30, 2000);
  mcp_domain_use_skill_on_target("m_t4_teleport");
  speak("Testando feitiços destrutivos... não atrapalhe!").
+!derocar_action(_) <- true.





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
