/**
 * @file ChunkBoundaryHelper.ts
 * Utilitário puro de Domínio para cálculo dinâmico de barreiras físicas (hitboxes)
 * e validação de trânsito em malhas de chunks (1024px x 1024px).
 *
 * Garante que:
 * 1. Todos os chunks válidos (não-vazios) sejam acessíveis sem paredes internas invisíveis.
 * 2. As fronteiras externas e adjacências a vácuo (chunks vazios "") tenham paredes sólidas infalíveis.
 * 3. O jogador nunca saia dos chunks ou atravesse para o vazio.
 */

export interface ChunkBoundaryHitbox {
  id: string;
  type: 'polygon';
  coordinates: { x: number; y: number };
  rotation: number;
  points: { x: number; y: number }[];
  metadata?: {
    tileType: 'wall';
    passable: false;
    isMapBoundary: true;
    side: 'north' | 'south' | 'west' | 'east';
  };
}

export class ChunkBoundaryHelper {
  public static readonly DEFAULT_CHUNK_SIZE = 1024;
  public static readonly DEFAULT_WALL_THICKNESS = 32;

  /**
   * Determina se um chunk nas coordenadas inteiras assinadas (cx, cy) é válido (possui asset/chão).
   */
  public static isChunkValid(
    chunks: (string | undefined | null)[][] | undefined,
    originChunk: { cx: number; cy: number },
    cx: number,
    cy: number
  ): boolean {
    if (!chunks || chunks.length === 0) {
      return false;
    }
    const col = cx + originChunk.cx;
    const row = cy + originChunk.cy;

    if (row < 0 || row >= chunks.length) {
      return false;
    }
    const rowData = chunks[row];
    if (!rowData || col < 0 || col >= rowData.length) {
      return false;
    }
    const cell = rowData[col];
    return typeof cell === 'string' && cell.trim() !== '';
  }

  /**
   * Gera todas as hitboxes de barreira física externa para a malha de chunks fornecida.
   * Conecta segmentos colineares adjacentes para otimização Zero-GC e performance física.
   */
  public static computeBoundaries(
    chunks: (string | undefined | null)[][],
    originChunk: { cx: number; cy: number },
    chunkSize: number = ChunkBoundaryHelper.DEFAULT_CHUNK_SIZE,
    wallThickness: number = ChunkBoundaryHelper.DEFAULT_WALL_THICKNESS
  ): ChunkBoundaryHitbox[] {
    if (!chunks || chunks.length === 0) {
      return [];
    }

    // 1. Mapeia todos os chunks válidos (cx, cy)
    const validChunks = new Set<string>();
    for (let r = 0; r < chunks.length; r++) {
      const row = chunks[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell && cell.trim() !== '') {
          const cx = c - originChunk.cx;
          const cy = r - originChunk.cy;
          validChunks.add(`${cx},${cy}`);
        }
      }
    }

    if (validChunks.size === 0) {
      return [];
    }

    const hasChunk = (cx: number, cy: number): boolean => validChunks.has(`${cx},${cy}`);

    // 2. Coleta segmentos de borda por face
    // Horizontal (Norte / Sul): chave y -> lista de intervalos [x1, x2]
    const northSegments = new Map<number, { x1: number; x2: number }[]>();
    const southSegments = new Map<number, { x1: number; x2: number }[]>();

    // Vertical (Oeste / Leste): chave x -> lista de intervalos [y1, y2]
    const westSegments = new Map<number, { y1: number; y2: number }[]>();
    const eastSegments = new Map<number, { y1: number; y2: number }[]>();

    for (const key of validChunks) {
      const parts = key.split(',');
      const cx = parseInt(parts[0]!, 10);
      const cy = parseInt(parts[1]!, 10);

      const chunkMinX = cx * chunkSize;
      const chunkMaxX = (cx + 1) * chunkSize;
      const chunkMinY = cy * chunkSize;
      const chunkMaxY = (cy + 1) * chunkSize;

      // Face Norte: vizinho (cx, cy - 1)
      if (!hasChunk(cx, cy - 1)) {
        if (!northSegments.has(chunkMinY)) northSegments.set(chunkMinY, []);
        northSegments.get(chunkMinY)!.push({ x1: chunkMinX, x2: chunkMaxX });
      }

      // Face Sul: vizinho (cx, cy + 1)
      if (!hasChunk(cx, cy + 1)) {
        if (!southSegments.has(chunkMaxY)) southSegments.set(chunkMaxY, []);
        southSegments.get(chunkMaxY)!.push({ x1: chunkMinX, x2: chunkMaxX });
      }

      // Face Oeste: vizinho (cx - 1, cy)
      if (!hasChunk(cx - 1, cy)) {
        if (!westSegments.has(chunkMinX)) westSegments.set(chunkMinX, []);
        westSegments.get(chunkMinX)!.push({ y1: chunkMinY, y2: chunkMaxY });
      }

      // Face Leste: vizinho (cx + 1, cy)
      if (!hasChunk(cx + 1, cy)) {
        if (!eastSegments.has(chunkMaxX)) eastSegments.set(chunkMaxX, []);
        eastSegments.get(chunkMaxX)!.push({ y1: chunkMinY, y2: chunkMaxY });
      }
    }

    // 3. Mescla intervalos contíguos (ex: [-1024..0] e [0..1024] -> [-1024..1024])
    const merge1DIntervals = (intervals: { a: number; b: number }[]): { a: number; b: number }[] => {
      if (intervals.length <= 1) return intervals;
      intervals.sort((i1, i2) => i1.a - i2.a);
      const merged: { a: number; b: number }[] = [];
      let current = { ...intervals[0]! };

      for (let i = 1; i < intervals.length; i++) {
        const next = intervals[i]!;
        if (next.a <= current.b) {
          current.b = Math.max(current.b, next.b);
        } else {
          merged.push(current);
          current = { ...next };
        }
      }
      merged.push(current);
      return merged;
    };

    const hitboxes: ChunkBoundaryHitbox[] = [];
    let borderSeq = 1;

    // Constrói Paredes Norte (imediatamente acima de y, com espessura para cima)
    for (const [y, segs] of northSegments.entries()) {
      const merged = merge1DIntervals(segs.map(s => ({ a: s.x1, b: s.x2 })));
      for (const seg of merged) {
        // Expande levemente nos cantos para fechar quinas com paredes perpendiculares
        const startX = seg.a - wallThickness;
        const endX = seg.b + wallThickness;
        hitboxes.push({
          id: `border_north_${borderSeq++}`,
          type: 'polygon',
          coordinates: { x: 0, y: 0 },
          rotation: 0,
          points: [
            { x: startX, y: y - wallThickness },
            { x: endX, y: y - wallThickness },
            { x: endX, y: y },
            { x: startX, y: y }
          ],
          metadata: {
            tileType: 'wall',
            passable: false,
            isMapBoundary: true,
            side: 'north'
          }
        });
      }
    }

    // Constrói Paredes Sul (imediatamente abaixo de y, com espessura para baixo)
    for (const [y, segs] of southSegments.entries()) {
      const merged = merge1DIntervals(segs.map(s => ({ a: s.x1, b: s.x2 })));
      for (const seg of merged) {
        const startX = seg.a - wallThickness;
        const endX = seg.b + wallThickness;
        hitboxes.push({
          id: `border_south_${borderSeq++}`,
          type: 'polygon',
          coordinates: { x: 0, y: 0 },
          rotation: 0,
          points: [
            { x: startX, y: y },
            { x: endX, y: y },
            { x: endX, y: y + wallThickness },
            { x: startX, y: y + wallThickness }
          ],
          metadata: {
            tileType: 'wall',
            passable: false,
            isMapBoundary: true,
            side: 'south'
          }
        });
      }
    }

    // Constrói Paredes Oeste (imediatamente à esquerda de x, com espessura para esquerda)
    for (const [x, segs] of westSegments.entries()) {
      const merged = merge1DIntervals(segs.map(s => ({ a: s.y1, b: s.y2 })));
      for (const seg of merged) {
        const startY = seg.a - wallThickness;
        const endY = seg.b + wallThickness;
        hitboxes.push({
          id: `border_west_${borderSeq++}`,
          type: 'polygon',
          coordinates: { x: 0, y: 0 },
          rotation: 0,
          points: [
            { x: x - wallThickness, y: startY },
            { x: x, y: startY },
            { x: x, y: endY },
            { x: x - wallThickness, y: endY }
          ],
          metadata: {
            tileType: 'wall',
            passable: false,
            isMapBoundary: true,
            side: 'west'
          }
        });
      }
    }

    // Constrói Paredes Leste (imediatamente à direita de x, com espessura para direita)
    for (const [x, segs] of eastSegments.entries()) {
      const merged = merge1DIntervals(segs.map(s => ({ a: s.y1, b: s.y2 })));
      for (const seg of merged) {
        const startY = seg.a - wallThickness;
        const endY = seg.b + wallThickness;
        hitboxes.push({
          id: `border_east_${borderSeq++}`,
          type: 'polygon',
          coordinates: { x: 0, y: 0 },
          rotation: 0,
          points: [
            { x: x, y: startY },
            { x: x + wallThickness, y: startY },
            { x: x + wallThickness, y: endY },
            { x: x, y: endY }
          ],
          metadata: {
            tileType: 'wall',
            passable: false,
            isMapBoundary: true,
            side: 'east'
          }
        });
      }
    }

    return hitboxes;
  }
}
