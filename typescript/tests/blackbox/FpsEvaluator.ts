/**
 * ============================================================================
 * CLASSIFICADOR DE FPS & FRAME BUDGET (QA HELPER)
 * ============================================================================
 * Regra de Negócio:
 * - Se FPS >= 60        -> 'perfeito'
 * - Se FPS >= 30 e < 60 -> 'ok'
 * - Se FPS < 30         -> 'insuficiente'
 */
export type FpsRating = 'perfeito' | 'ok' | 'insuficiente';

export function evaluateFps(fps: number): FpsRating {
  if (fps >= 60) {
    return 'perfeito';
  }
  if (fps >= 30) {
    return 'ok';
  }
  return 'insuficiente';
}
