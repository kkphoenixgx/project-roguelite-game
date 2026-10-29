import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';
import type { ICollisionService } from '../../domain/ports/ICollisionService';
import type { ILogger } from '../../domain/ports/ILogger';

describe('WorldChunkManager Regression Suite', () => {
  let domain: DomainFacade;
  let eventManager: IEventManager;
  let collisionService: ICollisionService;
  let logger: ILogger;

  beforeEach(async () => {
    const listeners: Record<string, ((payload: any) => void)[]> = {};
    eventManager = {
      on: vi.fn((event, cb) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event]!.push(cb);
      }),
      dispatch: vi.fn((event, payload) => {
        if (listeners[event]) {
          listeners[event]!.forEach(cb => cb(payload));
        }
      }),
      off: vi.fn((event, cb) => {
        if (listeners[event]) {
          listeners[event] = listeners[event]!.filter(c => c !== cb);
        }
      })
    };

    collisionService = {
      checkCollisions: vi.fn(),
      checkRaycast: vi.fn().mockResolvedValue(null)
    } as any;

    logger = {
      log: vi.fn()
    };
  });

  it('deve inicializar o mundo de Vilgem com Chunk (0,0) na origem central e spawn em (512, 591)', async () => {
    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    // Valida WorldBoundsDTO
    const bounds = domain.worldBounds;
    expect(bounds).toBeDefined();
    expect(bounds?.minX).toBe(-2048);
    expect(bounds?.minY).toBe(-3072);
    expect(bounds?.maxX).toBe(3072);
    expect(bounds?.maxY).toBe(3072);
    expect(bounds?.width).toBe(5120);
    expect(bounds?.height).toBe(6144);
    expect(bounds?.originChunk).toEqual({ cx: 2, cy: 3 });

    // Valida Chunk Ativo inicial
    expect(domain.activeChunk).toEqual({ cx: 0, cy: 0 });
    expect(domain.activeChunks?.length).toBe(9);

    // Valida coordenadas do jogador dentro do Chunk (0, 0)
    expect(domain.player.coordinates).toEqual({ x: 512, y: 591 });
  });

  it('deve traduzir defensivamente o spawn legado (1536, 1615) e (0, 0) para (512, 591) no Chunk (0, 0)', async () => {
    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 1536, y: 1615 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    expect(domain.player.coordinates).toEqual({ x: 512, y: 591 });
    expect(domain.activeChunk).toEqual({ cx: 0, cy: 0 });
  });

  it('deve migrar saves/checkpoints legados com coordenadas no Chunk (1, 1) (1536, 1615) durante restoreGameState para o Chunk (0, 0) (512, 591)', async () => {
    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    // Simula save antigo no localStorage que tinha coordenadas antes da mudanca de origem
    const legacySave = {
      mapId: 'vilgem',
      playerState: {
        coordinates: { x: 1536, y: 1615 }
      }
    };

    domain.restoreGameState(legacySave);

    expect(domain.player.coordinates).toEqual({ x: 512, y: 591 });
    expect(domain.activeChunk).toEqual({ cx: 0, cy: 0 });
  });

  it('deve usar o defaultSpawn do mundo atual quando restoreGameState recebe um save de outro mapa', async () => {
    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('alun');

    const vilgemSave = {
      mapId: 'vilgem',
      playerState: {
        coordinates: { x: 800, y: 900 }
      }
    };

    domain.restoreGameState(vilgemSave);

    expect(domain.player.coordinates).toEqual({ x: 500, y: 500 });
    expect(domain.activeChunk).toEqual({ cx: 0, cy: 0 });
  });

  it('deve exportar DTOs de bounds e activeChunks no getRenderState()', async () => {
    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    const renderState = domain.getRenderState();
    expect(renderState.world.bounds).toBeDefined();
    expect(renderState.world.bounds?.minX).toBe(-2048);
    expect(renderState.world.bounds?.originChunk).toEqual({ cx: 2, cy: 3 });
    expect(renderState.world.activeChunk).toEqual({ cx: 0, cy: 0 });
    expect(renderState.world.activeChunks?.length).toBe(9);
  });

  it('deve atualizar o chunk ativo e despachar activeChunkChanged quando o jogador se move entre chunks', async () => {
    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    const activeChunkChangedSpy = vi.fn();
    eventManager.on('activeChunkChanged', activeChunkChangedSpy);

    // Move jogador para o Chunk Leste (1, 0)
    domain.player.coordinates.x = 1200;
    domain.player.coordinates.y = 500;
    domain.update(0.016);

    expect(domain.activeChunk).toEqual({ cx: 1, cy: 0 });
    expect(activeChunkChangedSpy).toHaveBeenCalledWith(expect.objectContaining({
      previousChunk: { cx: 0, cy: 0 },
      currentChunk: { cx: 1, cy: 0 }
    }));
  });

  it('deve suportar movimentação em coordenadas negativas no Chunk Oeste (-1, 0) e Sul (-1, 1) sem colisão de hash', async () => {
    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    // Move jogador para o Oeste negativo
    domain.player.coordinates.x = -500;
    domain.player.coordinates.y = 200;
    domain.update(0.016);

    expect(domain.activeChunk).toEqual({ cx: -1, cy: 0 });
    expect(domain.activeChunks).toContainEqual({ cx: -2, cy: 0 });
    expect(domain.activeChunks).toContainEqual({ cx: -1, cy: 0 });
    expect(domain.activeChunks).toContainEqual({ cx: 0, cy: 0 });

    // Executa mais um tick de atualização e garante que física/colisão processam sem erro
    expect(() => domain.update(0.016)).not.toThrow();
  });

  it('deve filtrar entidades distantes fora da janela 3x3 no getRenderState() (Culling espacial)', async () => {
    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    // Spawna elemento muito distante fora do 3x3 (ex: x = 8000, y = 8000)
    eventManager.dispatch('spawn', {
      type: 'scenery',
      coordinates: { x: 8000, y: 8000 },
      size: { width: 32, height: 32 }
    });

    const renderables = domain.getRenderState().renderables;
    const farElement = renderables.find(r => r.coordinates.x === 8000);
    expect(farElement).toBeUndefined();
  });
});
