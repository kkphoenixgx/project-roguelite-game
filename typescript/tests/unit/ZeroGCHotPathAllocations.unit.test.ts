import { describe, it, expect, vi } from 'vitest';
import PlayerBroochManager from '../../domain/ObjectModule/Entities/Player/components/PlayerBroochManager';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import ObjectElementManager from '../../domain/ObjectModule/ObjectElementManager';
import WorldChunkManager from '../../domain/ObjectModule/Maps/WorldChunkManager';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';

describe('Unit: Zero-GC Hot Path Allocations Isolation', () => {
  it('PlayerBroochManager: update não deve recriar objeto de contexto a cada frame', () => {
    const eventManager = new EventHandler();
    const mockPlayer = { id: 1, coordinates: { x: 0, y: 0 }, attributes: {} };
    const manager = new PlayerBroochManager(mockPlayer, eventManager);

    const firstContext = (manager as any)._cachedContext;
    expect(firstContext).toBeDefined();
    expect(firstContext.player).toBe(mockPlayer);

    manager.update(0.016);
    const secondContext = (manager as any)._cachedContext;
    expect(secondContext).toBe(firstContext);
  });

  it('ObjectElementManager: dynamicTimingsList deve reaproveitar array plano sem alocar iteradores', () => {
    const eventManager = new EventHandler();
    const mockCollision = { checkCollisions: vi.fn() } as any;
    const manager = new ObjectElementManager(eventManager, mockCollision);
    const player = new Player(1, { x: 500, y: 500 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), eventManager);

    manager.updateAll(0.016, player);
    const listRef = (manager as any).dynamicTimingsList;
    expect(Array.isArray(listRef)).toBe(true);

    manager.updateAll(0.016, player);
    expect((manager as any).dynamicTimingsList).toBe(listRef);
  });

  it('WorldChunkManager: getActiveElements deve iterar chave de chunks sem gerar SetIterators', () => {
    const manager = new WorldChunkManager();
    const keyList = (manager as any).activeChunkKeyList;
    expect(Array.isArray(keyList)).toBe(true);
    expect(keyList.length).toBe(9);

    const elements1 = manager.getActiveElements();
    const elements2 = manager.getActiveElements();
    expect(elements1).toBe(elements2);
  });
});
