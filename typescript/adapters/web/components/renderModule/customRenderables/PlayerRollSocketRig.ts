/**
 * @file Tabela de Sockets Anatômicos (8 frames) para acompanhamento de equipamentos,
 * colares e barba durante a animação de rolagem (`player-roll.png`) sem exigir novos sprites.
 */

export interface RollSocketFrameTransform {
  /** Deslocamento X adicional (em pixels na grade base 32x32) a partir da posição neutra (idle F0) */
  readonly dx: number;
  /** Deslocamento Y adicional (em pixels na grade base 32x32) a partir da posição neutra (idle F0) */
  readonly dy: number;
  /** Rotação local em radianos ao redor do centro da peça recortada */
  readonly rotation: number;
  /** Escala horizontal local da peça */
  readonly scaleX: number;
  /** Escala vertical local da peça */
  readonly scaleY: number;
  /** Opacidade no frame (0 = recolhido/oculto dentro da bola de cambalhota, 1 = visível) */
  readonly alpha: number;
  /** Fração vertical do sprite original a desenhar a partir do topo (ex: 0.3125 = cúpula superior do capacete nos frames de bola) */
  readonly cropHeightRatio: number;
}

const DEG_TO_RAD = Math.PI / 180;

const f = (
  dx: number,
  dy: number,
  rotDeg: number,
  scaleX: number,
  scaleY: number,
  alpha: number,
  cropHeightRatio: number = 1.0
): RollSocketFrameTransform => ({
  dx,
  dy,
  rotation: rotDeg * DEG_TO_RAD,
  scaleX,
  scaleY,
  alpha,
  cropHeightRatio,
});

export const DEFAULT_ROLL_SOCKET_TRANSFORM: RollSocketFrameTransform = f(0, 0, 0, 1, 1, 1, 1);

/**
 * Mapeamento cinemático dos 8 frames de `player-roll.png` (32x32):
 * - Frame 0: Agachamento inicial (preparação)
 * - Frames 1..4: Fase de bola compacta em cambalhota (extremidades recolhidas, cúpula do elmo e torso/colar acompanham a esfera)
 * - Frame 5: Saída da cambalhota (agachamento baixo)
 * - Frame 6: Recuperação média
 * - Frame 7: Postura ereta final
 */
export const PLAYER_ROLL_SOCKET_RIG: Readonly<Record<string, readonly RollSocketFrameTransform[]>> = {
  helmet: [
    f(3, 3, 0, 1.0, 1.0, 1.0, 1.0),
    f(5, 12, 35, 0.75, 1.0, 1.0, 0.3125),
    f(0.5, 10, 0, 0.85, 1.0, 1.0, 0.3125),
    f(10, 18.5, 90, 0.85, 1.0, 1.0, 0.3125),
    f(0.5, 10, 0, 0.85, 1.0, 1.0, 0.3125),
    f(3, 6, 0, 1.0, 1.0, 1.0, 1.0),
    f(2, 2, 0, 1.0, 1.0, 1.0, 1.0),
    f(1, 0, 0, 1.0, 1.0, 1.0, 1.0),
  ],
  beard: [
    f(3, 3, 0, 1.0, 0.95, 1.0, 1.0),
    f(1, 3, 35, 0.75, 0.75, 1.0, 0.7),
    f(-2, 4, 0, 0.75, 0.75, 1.0, 0.7),
    f(3, 6, 90, 0.75, 0.75, 1.0, 0.7),
    f(-2, 4, 0, 0.75, 0.75, 1.0, 0.7),
    f(3, 5, 0, 1.0, 0.95, 1.0, 1.0),
    f(2, 2, 0, 1.0, 1.0, 1.0, 1.0),
    f(1, 0, 0, 1.0, 1.0, 1.0, 1.0),
  ],
  chestplate: [
    f(3, 1, 0, 1.0, 0.9, 1.0, 1.0),
    f(-5, -6, -35, 0.72, 0.7, 1.0, 0.8),
    f(3, 1, 0, 0.78, 0.75, 1.0, 0.8),
    f(-6, -2, -90, 0.78, 0.75, 1.0, 0.8),
    f(3, 1, 0, 0.78, 0.75, 1.0, 0.8),
    f(2, 2, 0, 1.0, 0.85, 1.0, 1.0),
    f(2, 1, 0, 1.0, 0.95, 1.0, 1.0),
    f(1, 0, 0, 1.0, 1.0, 1.0, 1.0),
  ],
  amulet: [
    f(3, 1, 0, 1.0, 0.9, 1.0, 1.0),
    f(-4, -5, -35, 0.8, 0.8, 1.0, 1.0),
    f(3, 1, 0, 0.85, 0.85, 1.0, 1.0),
    f(-5, -2, -90, 0.85, 0.85, 1.0, 1.0),
    f(3, 1, 0, 0.85, 0.85, 1.0, 1.0),
    f(2, 2, 0, 1.0, 0.9, 1.0, 1.0),
    f(2, 1, 0, 1.0, 0.95, 1.0, 1.0),
    f(1, 0, 0, 1.0, 1.0, 1.0, 1.0),
  ],
  gloves: [
    f(3, 1, 0, 1.0, 1.0, 1.0, 1.0),
    f(-4, -7, -35, 0.65, 0.65, 1.0, 1.0),
    f(3, 0, 0, 0.7, 0.7, 1.0, 1.0),
    f(-5, -3, -90, 0.7, 0.7, 1.0, 1.0),
    f(3, 0, 0, 0.7, 0.7, 1.0, 1.0),
    f(2, 2, 0, 1.0, 1.0, 1.0, 1.0),
    f(2, 1, 0, 1.0, 1.0, 1.0, 1.0),
    f(1, 0, 0, 1.0, 1.0, 1.0, 1.0),
  ],
  pants: [
    f(3, 1, 0, 1.0, 1.0, 1.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(2, 1, 0, 1.0, 1.0, 1.0, 1.0),
    f(2, 0, 0, 1.0, 1.0, 1.0, 1.0),
    f(1, 0, 0, 1.0, 1.0, 1.0, 1.0),
  ],
  boots: [
    f(3, 0, 0, 1.0, 1.0, 1.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(2, 0, 0, 1.0, 1.0, 1.0, 1.0),
    f(2, 0, 0, 1.0, 1.0, 1.0, 1.0),
    f(1, 0, 0, 1.0, 1.0, 1.0, 1.0),
  ],
  brooch: [
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
    f(0, 0, 0, 1.0, 1.0, 0.0, 1.0),
  ],
};

/**
 * Consulta Zero-GC da transformação anatômica do slot para o frame atual da rolagem (0..7).
 */
export function getRollSocketTransform(slotType: string | undefined, frameIndex: number): RollSocketFrameTransform {
  if (!slotType) return DEFAULT_ROLL_SOCKET_TRANSFORM;
  const track = PLAYER_ROLL_SOCKET_RIG[slotType];
  if (!track || track.length === 0) return DEFAULT_ROLL_SOCKET_TRANSFORM;
  const normalizedFrame = ((frameIndex % track.length) + track.length) % track.length;
  return track[normalizedFrame] ?? DEFAULT_ROLL_SOCKET_TRANSFORM;
}
