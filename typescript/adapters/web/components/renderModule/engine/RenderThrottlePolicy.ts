/**
 * @file RenderThrottlePolicy.ts
 * Implementa a estratégia de throttling e orquestração de taxa de quadros e renderização do Adaptador.
 * Encapsula as regras de throttling em menus (pausa local, multiplayer, menus com UI pesada),
 * permitindo que a tela/interface continue fluida a 60 FPS enquanto o motor de mundo/mapa
 * reduz o processamento drasticamente ou congela frames idênticos.
 */

export interface IRenderThrottlePolicy {
  /**
   * Avalia se o redesenho do mapa/mundo deve ser executado no frame atual.
   * @param isMenuOpen Indica se algum menu ou HUD interativo está aberto.
   * @param isGamePaused Indica se o jogo está pausado localmente.
   * @param isMultiplayer Indica se a sessão é multiplayer (onde o mundo continua atualizando em segundo plano).
   * @returns Retorna true se o frame do mundo deve ser desenhado; false se deve ser ignorado/reaproveitado.
   */
  shouldRenderWorldFrame(isMenuOpen: boolean, isGamePaused: boolean, isMultiplayer?: boolean): boolean;

  /**
   * Notifica a política de que o mundo sofreu mutação que exige redesenho forçado.
   */
  markWorldDirty(): void;

  /**
   * Notifica a política de que um frame de mundo foi efetivamente desenhado.
   */
  notifyFrameDrawn(): void;

  /**
   * Notifica alternância de estado de menu.
   */
  notifyMenuStateChanged(isMenuOpen: boolean): void;
}

export class RenderThrottlePolicy implements IRenderThrottlePolicy {
  private isWorldDirty: boolean = true;
  private lastWorldDrawTimestamp: number = 0;
  private readonly backgroundMenuFps: number;
  private readonly minBackgroundFrameIntervalMs: number;
  private readonly enableIdleFreeze: boolean;

  /**
   * @param backgroundMenuFps Taxa de atualização do mundo em menus (padrão: 60 FPS para manter o VSync do compositor ativo).
   * @param enableIdleFreeze Se true, congela completamente o desenho do canvas quando pausado. Padrão: false (mantém 60 FPS fluidos).
   */
  constructor(backgroundMenuFps: number = 60, enableIdleFreeze: boolean = false) {
    this.backgroundMenuFps = backgroundMenuFps;
    this.minBackgroundFrameIntervalMs = 1000 / this.backgroundMenuFps;
    this.enableIdleFreeze = enableIdleFreeze;
  }

  public shouldRenderWorldFrame(isMenuOpen: boolean, isGamePaused: boolean, isMultiplayer: boolean = false): boolean {
    // 1. Em gameplay normal (sem menus abertos), renderiza sempre a taxa total de quadros (60+ FPS)
    if (!isMenuOpen) {
      return true;
    }

    // 2. Se o congelamento forçado estiver desativado (padrão de performance), mantém o pipeline
    // gráfico alimentando o compositor a 60 FPS para evitar que compositores Linux/WebKit reduzam a taxa para 20 FPS
    if (!this.enableIdleFreeze) {
      return true;
    }

    // 3. Em Singleplayer com congelamento ativado:
    // O mundo não muda suas coordenadas ou estado físico. Desenha exatamente 1 frame estático de fundo e para completamente o canvas.
    if (!isMultiplayer && isGamePaused) {
      if (this.isWorldDirty) {
        return true;
      }
      return false; // Congela o redesenho do mapa/mundo
    }

    // 4. Em Multiplayer ou mundo ativo em segundo plano com congelamento ativado
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsedSinceLastDraw = now - this.lastWorldDrawTimestamp;

    if (this.isWorldDirty || elapsedSinceLastDraw >= this.minBackgroundFrameIntervalMs) {
      return true;
    }

    return false;
  }

  public markWorldDirty(): void {
    this.isWorldDirty = true;
  }

  public notifyFrameDrawn(): void {
    this.isWorldDirty = false;
    this.lastWorldDrawTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  public notifyMenuStateChanged(isMenuOpen: boolean): void {
    // Ao fechar ou abrir o menu, marca o mundo como sujo para garantir que o frame inicial de transição seja desenhado imediatamente
    this.isWorldDirty = true;
  }
}
