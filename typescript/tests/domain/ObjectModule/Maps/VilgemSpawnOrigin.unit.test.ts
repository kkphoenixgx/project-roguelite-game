import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainFacade from '../../../../domain/DomainFacade';
import VilgemWorld from '../../../../domain/ObjectModule/Maps/VilgemWorld';
import AlunWorld from '../../../../domain/ObjectModule/Maps/AlunWorld';
import CemiiWorld from '../../../../domain/ObjectModule/Maps/CemiiWorld';
import WorldChunkManager from '../../../../domain/ObjectModule/Maps/WorldChunkManager';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';
import type { ICollisionService } from '../../../../domain/ports/ICollisionService';
import type { ILogger } from '../../../../domain/ports/ILogger';

describe('VilgemSpawnOrigin Unit Test', () => {
  let eventManager: IEventManager;
  let collisionService: ICollisionService;
  let logger: ILogger;

  beforeEach(() => {
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

  it('VilgemWorld deve ter defaultSpawn no centro do Chunk (0, 0) em (512, 591) e originChunk válido', () => {
    const world = new VilgemWorld(eventManager);
    expect(world.defaultSpawn).toEqual({ x: 512, y: 591 });
    expect(world.originChunk.cx).toBeGreaterThanOrEqual(1);
    expect(world.originChunk.cy).toBeGreaterThanOrEqual(1);
    expect(WorldChunkManager.getChunkCoord(world.defaultSpawn.x, world.defaultSpawn.y)).toEqual({ cx: 0, cy: 0 });
  });

  it('VilgemWorld deve popular todos os 9 chunks da grade 3x3 (-1..1, -1..1)', () => {
    const spawned: { x: number; y: number }[] = [];
    const customEventMgr: IEventManager = {
      on: vi.fn(),
      off: vi.fn(),
      dispatch: vi.fn((event, payload: any) => {
        if (event === 'spawn' && payload?.coordinates) {
          spawned.push(payload.coordinates);
        }
      })
    };
    const world = new VilgemWorld(customEventMgr);
    world.generate();

    const populatedChunks = new Set<string>();
    for (const pos of spawned) {
      const c = WorldChunkManager.getChunkCoord(pos.x, pos.y);
      populatedChunks.add(`${c.cx},${c.cy}`);
    }

    expect(populatedChunks.has('-1,-1')).toBe(true);
    expect(populatedChunks.has('0,-1')).toBe(true);
    expect(populatedChunks.has('1,-1')).toBe(true);
    expect(populatedChunks.has('-1,0')).toBe(true);
    expect(populatedChunks.has('0,0')).toBe(true);
    expect(populatedChunks.has('1,0')).toBe(true);
    expect(populatedChunks.has('-1,1')).toBe(true);
    expect(populatedChunks.has('0,1')).toBe(true);
    expect(populatedChunks.has('1,1')).toBe(true);
    expect(populatedChunks.size).toBeGreaterThanOrEqual(9);
  });

  it('DomainFacade deve nascer o jogador dentro do Chunk (0, 0) em (512, 591) por padrao em Vilgem', async () => {
    const domain = new DomainFacade(
      {} as any,
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    expect(domain.player.coordinates).toEqual({ x: 512, y: 591 });
    expect(domain.activeChunk).toEqual({ cx: 0, cy: 0 });
    const renderState = domain.getRenderState();
    const pState = renderState.renderables.find(r => r.id === 1);
    expect(pState?.coordinates).toEqual({ x: 512, y: 591 });
  });

  it('DomainFacade deve traduzir coordenadas legadas (1536, 1615) e (0, 0) para (512, 591) no Chunk (0, 0)', async () => {
    const domain1 = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 1536, y: 1615 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain1.loadWorld('vilgem');
    expect(domain1.player.coordinates).toEqual({ x: 512, y: 591 });
    expect(domain1.activeChunk).toEqual({ cx: 0, cy: 0 });

    const domain2 = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 0, y: 0 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain2.loadWorld('vilgem');
    expect(domain2.player.coordinates).toEqual({ x: 512, y: 591 });
    expect(domain2.activeChunk).toEqual({ cx: 0, cy: 0 });
  });

  it('DomainFacade deve respeitar outros mundos (AlunWorld e CemiiWorld) com seus proprios defaultSpawn e originChunk (0, 0)', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );

    await domain.loadWorld('alun');
    expect(domain.worldBounds?.originChunk).toEqual({ cx: 0, cy: 0 });
    expect(domain.player.coordinates).toEqual({ x: 500, y: 500 });
    expect(domain.activeChunk).toEqual({ cx: 0, cy: 0 });

    await domain.loadWorld('cemii');
    expect(domain.worldBounds?.originChunk).toEqual({ cx: 0, cy: 0 });
    expect(domain.player.coordinates).toEqual({ x: 500, y: 500 });
    expect(domain.activeChunk).toEqual({ cx: 0, cy: 0 });
  });

  it('DomainFacade deve respeitar coordenadas customizadas explicitas nao-legadas', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 250, y: 350 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');
    expect(domain.player.coordinates).toEqual({ x: 250, y: 350 });
  });
});
