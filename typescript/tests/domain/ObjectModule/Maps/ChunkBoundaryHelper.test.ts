import { describe, it, expect } from 'vitest';
import { ChunkBoundaryHelper } from '../../../../domain/ObjectModule/Maps/ChunkBoundaryHelper';

describe('ChunkBoundaryHelper (Cálculo Dinâmico de Barreiras de Chunks)', () => {
  it('deve gerar 4 paredes perimetrais para um mapa retangular regular 3x3', () => {
    const regular3x3 = [
      ['nw', 'n', 'ne'],
      ['w', 'c', 'e'],
      ['sw', 's', 'se']
    ];
    const origin = { cx: 1, cy: 1 };
    const boundaries = ChunkBoundaryHelper.computeBoundaries(regular3x3, origin, 1024, 32);

    expect(boundaries.length).toBe(4);
    const north = boundaries.find(b => b.metadata?.side === 'north');
    const south = boundaries.find(b => b.metadata?.side === 'south');
    const west = boundaries.find(b => b.metadata?.side === 'west');
    const east = boundaries.find(b => b.metadata?.side === 'east');

    expect(north).toBeDefined();
    expect(south).toBeDefined();
    expect(west).toBeDefined();
    expect(east).toBeDefined();

    // Com origin cx:1, cy:1: x vai de -1024 a 2048, y vai de -1024 a 2048
    expect(north!.points[2]!.y).toBe(-1024);
    expect(south!.points[0]!.y).toBe(2048);
    expect(west!.points[1]!.x).toBe(-1024);
    expect(east!.points[0]!.x).toBe(2048);
  });

  it('deve gerar paredes dinâmicas corretas para o layout de Vilgem (3 linhas x 4 colunas com chunk extra a oeste)', () => {
    const vilgemMatrix = [
      ['', 'nw', 'n', 'ne'],
      ['fungal', 'w', 'ground', 'e'],
      ['', 'sw', 's', 'se']
    ];
    const origin = { cx: 2, cy: 1 };
    const boundaries = ChunkBoundaryHelper.computeBoundaries(vilgemMatrix, origin, 1024, 32);

    // Valida que o chunk extra (-2, 0) é acessível e não possui barreira entre (-2, 0) e (-1, 0)
    // A fronteira entre (-2, 0) e (-1, 0) é x = -1024 entre y = 0 e 1024.
    // Nenhuma parede deve existir em x = -1024 para o intervalo [0..1024]!
    const westWalls = boundaries.filter(b => b.metadata?.side === 'west');
    for (const wall of westWalls) {
      const topY = wall.points[1]!.y;
      const bottomY = wall.points[2]!.y;
      const wallX = wall.points[1]!.x;

      if (wallX === -1024) {
        // As paredes em x = -1024 devem ser apenas para o chunk (-1, -1) [y: -1024..0]
        // ou chunk (-1, 1) [y: 1024..2048]. NUNCA no intervalo [0..1024]!
        const spansPassage = (topY <= 0 && bottomY >= 1024);
        expect(spansPassage).toBe(false);
      }
    }

    // O chunk (-2, 0) deve ter parede a oeste em x = -2048
    const fungalWestWall = westWalls.find(w => w.points[1]!.x === -2048);
    expect(fungalWestWall).toBeDefined();

    // O chunk (-2, 0) deve ter parede ao norte em y = 0 (pois (-2, -1) é vazio)
    const northWalls = boundaries.filter(b => b.metadata?.side === 'north');
    const fungalNorthWall = northWalls.find(w => w.points[2]!.y === 0);
    expect(fungalNorthWall).toBeDefined();

    // O chunk (-2, 0) deve ter parede ao sul em y = 1024 (pois (-2, 1) é vazio)
    const southWalls = boundaries.filter(b => b.metadata?.side === 'south');
    const fungalSouthWall = southWalls.find(w => w.points[0]!.y === 1024);
    expect(fungalSouthWall).toBeDefined();
  });

  it('deve validar corretamente isChunkValid()', () => {
    const vilgemMatrix = [
      ['', 'nw', 'n', 'ne'],
      ['fungal', 'w', 'ground', 'e'],
      ['', 'sw', 's', 'se']
    ];
    const origin = { cx: 2, cy: 1 };

    // Válidos
    expect(ChunkBoundaryHelper.isChunkValid(vilgemMatrix, origin, -2, 0)).toBe(true);
    expect(ChunkBoundaryHelper.isChunkValid(vilgemMatrix, origin, -1, -1)).toBe(true);
    expect(ChunkBoundaryHelper.isChunkValid(vilgemMatrix, origin, 0, 0)).toBe(true);
    expect(ChunkBoundaryHelper.isChunkValid(vilgemMatrix, origin, 1, 1)).toBe(true);

    // Vazios / Fora dos limites
    expect(ChunkBoundaryHelper.isChunkValid(vilgemMatrix, origin, -2, -1)).toBe(false); // vazio ""
    expect(ChunkBoundaryHelper.isChunkValid(vilgemMatrix, origin, -2, 1)).toBe(false); // vazio ""
    expect(ChunkBoundaryHelper.isChunkValid(vilgemMatrix, origin, -3, 0)).toBe(false); // fora do mapa
    expect(ChunkBoundaryHelper.isChunkValid(vilgemMatrix, origin, 2, 0)).toBe(false); // fora do mapa
    expect(ChunkBoundaryHelper.isChunkValid(vilgemMatrix, origin, 0, -2)).toBe(false); // fora do mapa
  });
});
