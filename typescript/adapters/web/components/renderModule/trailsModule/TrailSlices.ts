/**
 * @file TrailSlices.ts
 * Matemática do rastro: converte o caminho (`TrailPath`) em fatias do sprite horizontal, uma (ou mais) por segmento.
 *
 * Cada fatia é desenhada num sistema local com origem no ponto do lado da CAUDA do segmento e eixo +x apontando
 * para a CABEÇA. Assim a esquerda da fatia é a cauda e a direita é a cabeça, igual à convenção do sprite.
 */
import type TrailPath from "./TrailPath";
import type { TrailVisualConfig } from "../../../shared/VisualConfigMap";

/** Uma fatia vertical do sprite posicionada ao longo do caminho. */
export interface TrailSlice {
    /** Origem da fatia no mundo (lado da cauda). */
    x: number;
    y: number;
    /** Ângulo (rad) do eixo cauda -> cabeça. */
    angle: number;
    /** Comprimento da fatia no mundo. */
    length: number;
    /** Coluna inicial e largura da fatia dentro da imagem (pixels da imagem). */
    sx: number;
    sw: number;
    /** Espessura desenhada no mundo (já com afinamento). */
    thickness: number;
    /** Opacidade (já com fade). */
    alpha: number;
}

/** Segmentos mais curtos que isso são ignorados (pontos praticamente sobrepostos). */
const MIN_SEGMENT = 0.01;

function ensureSlice(out: TrailSlice[], index: number): TrailSlice {
    let s = out[index];
    if (!s) {
        s = { x: 0, y: 0, angle: 0, length: 0, sx: 0, sw: 0, thickness: 0, alpha: 0 };
        out[index] = s;
    }
    return s;
}

/** Proteção contra laço infinito por imprecisão de ponto flutuante ao dividir segmentos. */
const MAX_PIECES_PER_SEGMENT = 1024;

/**
 * Calcula as fatias do rastro, reaproveitando os objetos de `out` (Zero-GC entre frames).
 *
 * A coluna da textura é uma função linear da distância `d` até a cabeça:
 * `tex(d) = imageWidth - d * texelsPorPx + scrollTexels` (sem rolagem, a cabeça usa a borda direita da imagem).
 * - stretch: `texelsPorPx = imageWidth / comprimentoTotal` (a imagem inteira cobre o rastro);
 * - tile: `texelsPorPx = alturaDaImagem / espessura` (1:1 na proporção do sprite, repetindo).
 * Com `textureAnchor: 'path'` (tile), a referência deixa de ser a cabeça e passa a ser a distância percorrida
 * desde o início do rastro: `tex = percorrido * texelsPorPx + scrollTexels`, então o desenho fica parado no chão.
 * Sempre que a textura cruza a borda da imagem, o segmento é dividido em mais de uma fatia.
 *
 * @param imageHeight Altura de UM quadro da imagem (em spritesheets animados).
 * @param scrollTexels Deslocamento da rolagem em pixels da imagem (positivo = flui da cabeça para a cauda).
 * @returns Quantidade de fatias válidas escritas em `out`.
 */
export function computeTrailSlices(
    path: TrailPath,
    config: TrailVisualConfig,
    imageWidth: number,
    imageHeight: number,
    out: TrailSlice[],
    scrollTexels: number = 0
): number {
    const count = path.count;
    if (count < 2 || imageWidth <= 0 || imageHeight <= 0) return 0;

    let totalLength = 0;
    for (let i = 0; i < count - 1; i++) {
        totalLength += Math.hypot(path.getX(i) - path.getX(i + 1), path.getY(i) - path.getY(i + 1));
    }
    if (totalLength < MIN_SEGMENT) return 0;

    const texelsPerWorld = config.mode === 'stretch' ? imageWidth / totalLength : imageHeight / config.width;
    //? Textura presa ao caminho: a coluna depende da distância percorrida desde o início do rastro (fixa por ponto)
    const anchoredToPath = config.mode === 'tile' && config.textureAnchor === 'path';

    let written = 0;
    let distFromHead = 0;

    for (let i = 0; i < count - 1; i++) {
        const ax = path.getX(i), ay = path.getY(i);
        const bx = path.getX(i + 1), by = path.getY(i + 1);
        const segLength = Math.hypot(ax - bx, ay - by);
        const dA = distFromHead;
        const dB = distFromHead + segLength;
        distFromHead = dB;
        if (segLength < MIN_SEGMENT) continue;

        const angle = Math.atan2(ay - by, ax - bx);
        const tMid = ((dA + dB) / 2) / totalLength;
        const thickness = config.width * (1 - config.taper * tMid);
        const ageMid = (path.getAge(i) + path.getAge(i + 1)) / 2;
        const alpha = config.fade ? Math.max(0, Math.min(1, 1 - ageMid / config.lifetime)) : 1;
        if (thickness <= 0 || alpha <= 0) continue;

        //? A partir da cauda do segmento, avança em pedaços que nunca atravessam a borda da imagem
        const cos = Math.cos(angle), sin = Math.sin(angle);
        //? Coluna da textura no lado da cauda do segmento; ao longo do segmento ela cresce em direção à cabeça
        const texAtTail = anchoredToPath
            ? path.getTravelled(i + 1) * texelsPerWorld + scrollTexels
            : imageWidth - dB * texelsPerWorld + scrollTexels;
        let localX = 0;
        let pieces = 0;
        while (localX < segLength - 1e-6 && pieces++ < MAX_PIECES_PER_SEGMENT) {
            const tex = texAtTail + localX * texelsPerWorld;
            let col = ((tex % imageWidth) + imageWidth) % imageWidth;
            if (imageWidth - col < 1e-6) col = 0;
            const pieceLength = Math.min(segLength - localX, (imageWidth - col) / texelsPerWorld);

            const s = ensureSlice(out, written++);
            s.x = bx + cos * localX;
            s.y = by + sin * localX;
            s.angle = angle;
            s.length = pieceLength;
            s.sx = col;
            s.sw = pieceLength * texelsPerWorld;
            s.thickness = thickness; s.alpha = alpha;

            localX += pieceLength;
        }
    }

    return written;
}
