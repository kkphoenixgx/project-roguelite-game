/** * @file Abstrai o `requestAnimationFrame` do navegador para criar um game loop clássico, separando a lógica de `update` e `draw` e calculando o `deltaTime`. */
import { logger } from "../shared/Logger"; 
import { reportFatalCrash } from "../shared/CrashHandler";

let lastTime = 0; /** @private Armazena o timestamp do último frame para calcular o `deltaTime`. */
let updateCallback: ((deltaTime: number) => void) = () => {}; /** @private O callback para a função de atualização da lógica do jogo. */
let drawCallback: (() => Promise<void>) = async () => {}; /** @private O callback para a função de desenho do estado do jogo. */

let isPaused = true;
export const isGamePaused = () => isPaused;
export const setPauseGame = (paused: boolean) => { isPaused = paused; };


/** Configura e inicia o game loop. @param updateFn A função que atualiza a lógica do jogo, chamada primeiro em cada frame. @param drawFn A função que desenha o estado do jogo na tela, chamada após `updateFn`. */
export function initializeGame(
  updateFn: (deltaTime: number) => void,
  drawFn: () => Promise<void>
) {
  updateCallback = updateFn;
  drawCallback = drawFn;
  lastTime = performance.now();
  window.requestAnimationFrame(gameLoop);
}

/** A função interna que é executada a cada frame pelo navegador. Calcula o deltaTime e chama os callbacks de update e draw. @private @param currentTime O timestamp atual fornecido pelo navegador. */
async function gameLoop(currentTime: number) {
  // Agenda o próximo frame imediatamente no início para garantir sincronia constante de 60 FPS com o VSync
  window.requestAnimationFrame(gameLoop);

  // debugger; // Descomente esta linha para pausar a execução a cada frame e inspecionar o estado.
  let deltaTime = (currentTime - lastTime) / 1000; // Calcula o tempo decorrido desde o último frame em segundos.
  if (deltaTime > 0.1) deltaTime = 0.1; // Trava de segurança (10 FPS) para evitar explosão da física se a janela do SO travar
  lastTime = currentTime; // Atualiza o timestamp do último frame.
  logger.log('loop', `New frame. DeltaTime: ${deltaTime.toFixed(4)}`);
  try {
    updateCallback(deltaTime); // Chama a função de atualização da lógica do jogo.
    await drawCallback(); // Chama a função de desenho do estado do jogo.
  } catch (error) {
    console.error("[Game Loop Panic Recuperado]:", error);
    reportFatalCrash("Game Loop (Update/Draw)", error);
  }
}
