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
  //? Agenda o próximo frame no início da função para garantir sincronia com VSync do display
  window.requestAnimationFrame(gameLoop);

  let deltaTime = (currentTime - lastTime) / 1000;
  //? Clamping de deltaTime em no máximo 100ms (10 FPS) para evitar explosão de física em congelamentos
  if (deltaTime > 0.1) deltaTime = 0.1;
  lastTime = currentTime;
  logger.log('loop', `New frame. DeltaTime: ${deltaTime.toFixed(4)}`);
  try {
    updateCallback(deltaTime);
    await drawCallback();
  } catch (error) {
    console.error("[Game Loop Panic Recuperado]:", error);
    reportFatalCrash("Game Loop (Update/Draw)", error);
  }
}
