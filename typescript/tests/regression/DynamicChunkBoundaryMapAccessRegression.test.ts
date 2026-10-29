import { describe, it, expect, beforeEach, vi } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { NullTelemetryPort } from '../../domain/ports/ITelemetryPort';
import { ChunkBoundaryHelper } from '../../domain/ObjectModule/Maps/ChunkBoundaryHelper';
import VilgemWorld from '../../domain/ObjectModule/Maps/VilgemWorld';

describe('Regressão de Barreiras Dinâmicas e Trânsito Infalível entre Chunks (DynamicChunkBoundaryMapAccessRegression)', () => {
  let domain: DomainFacade;
  let eventManager: EventHandler;
  const mockCollisionService = { checkCollisions: vi.fn() };

  const nullLogger = {
    log: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };

  beforeEach(async () => {
    eventManager = new EventHandler();

    domain = new DomainFacade(
      {
        player: {
          id: 1,
          level: 1,
          initialPos: { x: 512, y: 591 }
        }
      },
      nullLogger as any,
      eventManager,
      mockCollisionService as any,
      NullTelemetryPort
    );

    await domain.loadWorld('vilgem');
  });

  it('1. Deve permitir ao jogador transitar livremente do chunk (-1, 0) para o novo chunk (-2, 0) sem paredes invisíveis em x = -1024', () => {
    const player = (domain as any).player;
    const objectManager = (domain as any).objectManager;

    // Posiciona o jogador a leste da fronteira, no chunk (-1, 0)
    player.coordinates.x = -950;
    player.coordinates.y = 500;
    domain.update(0.016);

    expect(player.coordinates.x).toBe(-950);

    // Caminha para o oeste, cruzando a fronteira x = -1024 em direção ao novo chunk (-2, 0)
    player.coordinates.x = -1050;
    domain.update(0.016);

    // O jogador deve estar no novo chunk com sucesso, sem ter sido empurrado para trás
    expect(player.coordinates.x).toBe(-1050);

    // Caminha mais fundo dentro do novo chunk (-2, 0)
    player.coordinates.x = -1500;
    player.coordinates.y = 500;
    domain.update(0.016);

    expect(player.coordinates.x).toBeCloseTo(-1500, 0);

    // O chunk manager deve ter registrado a posição e ativo o chunk (-2, 0)
    const chunkMgr = objectManager.getChunkManager();
    chunkMgr.updatePlayerPosition(player.coordinates.x, player.coordinates.y);
    expect(chunkMgr.getCurrentChunk()).toEqual({ cx: -2, cy: 0 });
  });

  it('2. Deve bloquear infalivelmente a saída para o norte a partir de (-2, -3) além do limite norte do mundo (y < -3072)', () => {
    const player = (domain as any).player;

    // Posiciona no chunk extremo norte (-2, -3) e tenta andar além do limite norte (y < -3072)
    player.coordinates.x = -1500;
    player.coordinates.y = -3000;
    domain.update(0.016);

    expect(player.coordinates.y).toBe(-3000);

    // Tenta forçar movimento para o vácuo (-2, -4) em y = -3150
    player.coordinates.y = -3150;
    domain.update(0.016);

    // O clamping dinâmico de chunks deve conter o jogador em y >= -3072
    expect(player.coordinates.y).toBeGreaterThanOrEqual(-3072);
  });

  it('3. Deve bloquear infalivelmente a saída para o sul a partir de (-2, 2) além do limite sul do mundo (y > 3072)', () => {
    const player = (domain as any).player;

    // Posiciona no chunk extremo sul (-2, 2) e tenta andar além do limite sul (y > 3072)
    player.coordinates.x = -1500;
    player.coordinates.y = 3000;
    domain.update(0.016);

    // Tenta forçar movimento para o vácuo (-2, 3) em y = 3150
    player.coordinates.y = 3150;
    domain.update(0.016);

    // O clamping dinâmico de chunks deve conter o jogador em y + height <= 3072
    expect(player.coordinates.y + player.size.height).toBeLessThanOrEqual(3072);
  });

  it('4. Deve bloquear infalivelmente a saída para o oeste em (-2, 0) além do limite do mundo (x < -2048)', () => {
    const player = (domain as any).player;

    // Posiciona no extremo oeste do novo chunk (-2, 0)
    player.coordinates.x = -2000;
    player.coordinates.y = 500;
    domain.update(0.016);

    // Tenta forçar movimento além do mundo em x = -2100
    player.coordinates.x = -2100;
    domain.update(0.016);

    // O clamping dinâmico deve conter o jogador em x >= -2048
    expect(player.coordinates.x).toBeGreaterThanOrEqual(-2048);
  });

  it('5. Deve permitir que o jogador no chunk (-1, -1) transite para (-2, -1) na grade 5x5 e bloqueie em x < -2048', () => {
    const player = (domain as any).player;

    // Posiciona no chunk (-1, -1) da padaria (y: -1024..0, x: -1024..0)
    player.coordinates.x = -950;
    player.coordinates.y = -500;
    domain.update(0.016);

    // Caminha para oeste em (-2, -1) e tenta ultrapassar o limite oeste do mundo (x < -2048)
    player.coordinates.x = -2100;
    domain.update(0.016);

    // Deve ser bloqueado na fronteira externa oeste x >= -2048
    expect(player.coordinates.x).toBeGreaterThanOrEqual(-2048);
  });

  it('6. Deve bloquear que o jogador no chunk (2, 1) saia para leste além do limite do mundo 5x5 (x > 3072)', () => {
    const player = (domain as any).player;

    // Posiciona no chunk leste (2, 1) (y: 1024..2048, x: 2048..3072)
    player.coordinates.x = 2950;
    player.coordinates.y = 1500;
    domain.update(0.016);

    // Tenta andar para leste além da borda 5x5 em x = 3150
    player.coordinates.x = 3150;
    domain.update(0.016);

    // Deve ser bloqueado na fronteira x + width <= 3072
    expect(player.coordinates.x + player.size.width).toBeLessThanOrEqual(3072);
  });

  it('7. Deve calcular dinamicamente as fronteiras para qualquer matriz customizada de chunks', () => {
    // Matriz em T: 3 chunks no topo, 1 chunk no meio embaixo
    const customTMatrix = [
      ['chunk_1', 'chunk_2', 'chunk_3'],
      ['', 'chunk_center_bottom', '']
    ];
    const origin = { cx: 1, cy: 0 };
    const boundaries = ChunkBoundaryHelper.computeBoundaries(customTMatrix, origin, 1024, 32);

    expect(boundaries.length).toBeGreaterThan(0);

    // Chunk (0, 1) [chunk_center_bottom] tem vizinhos Norte (0, 0) [chunk_2, válido]
    // Portanto NÃO deve ter parede Norte em y = 1024 entre x = 0 e 1024!
    const northWalls = boundaries.filter(b => b.metadata?.side === 'north');
    const innerPassageWall = northWalls.find(w => w.points[2]!.y === 1024 && w.points[0]!.x >= 0 && w.points[1]!.x <= 1024);
    expect(innerPassageWall).toBeUndefined();

    // Mas deve ter parede Oeste em x = 0 para y: [1024..2048] pois à esquerda (-1, 1) é vazio
    const westWalls = boundaries.filter(b => b.metadata?.side === 'west');
    const westEmptyWall = westWalls.find(w => w.points[1]!.x === 0);
    expect(westEmptyWall).toBeDefined();

    // E deve ter parede Leste em x = 1024 para y: [1024..2048] pois à direita (1, 1) é vazio
    const eastWalls = boundaries.filter(b => b.metadata?.side === 'east');
    const eastEmptyWall = eastWalls.find(w => w.points[0]!.x === 1024);
    expect(eastEmptyWall).toBeDefined();
  });
});
