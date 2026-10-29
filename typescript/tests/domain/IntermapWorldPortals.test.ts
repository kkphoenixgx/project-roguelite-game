import { describe, it, expect, vi } from 'vitest';
import IntermapWorld from '../../domain/ObjectModule/Maps/IntermapWorld';
import type { IntermapDefinition } from '../../domain/ObjectModule/Maps/IntermapConfig';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';

class MockEventManager implements IEventManager {
  public listeners: Record<string, Function[]> = {};
  public dispatchedEvents: Array<{ event: string; payload: any }> = [];

  on = vi.fn((key: string, cb: Function) => {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(cb);
  });

  off = vi.fn((key: string, cb: Function) => {
    if (!this.listeners[key]) return;
    this.listeners[key] = this.listeners[key].filter(fn => fn !== cb);
  });

  dispatch = vi.fn((key: string, payload: any) => {
    this.dispatchedEvents.push({ event: key, payload });
    this.listeners[key]?.forEach(cb => cb(payload));
  });
}

describe('IntermapWorld Portal Transitions', () => {
  it('deve spawnar portal de retorno para o mundo normal configurado no definition', async () => {
    const eventManager = new MockEventManager();
    const definition: IntermapDefinition = {
      id: 'interior_test_house',
      name: 'Interior Test House',
      parentWorldId: 'vilgem',
      width: 1024,
      height: 1024,
      portals: [
        {
          x: 512,
          y: 750,
          width: 64,
          height: 32,
          targetMapId: 'vilgem',
          targetSpawnCoords: { x: 700, y: 450 },
          type: 'request',
          promptText: 'Sair',
          actionKey: 'E',
          cooldownMs: 1000
        }
      ]
    };

    const world = new IntermapWorld(definition, eventManager);
    await world.generate();

    const portalSpawns = eventManager.dispatchedEvents.filter(e => 
      e.event === 'spawn' && (e.payload.type === 'portalLinkRequest' || e.payload.type === 'portalLink')
    );

    expect(portalSpawns.length).toBeGreaterThanOrEqual(1);
    const returnPortal = portalSpawns.find(p => p.payload.metadata?.targetMapId === 'vilgem');
    expect(returnPortal).toBeDefined();
    expect(returnPortal?.payload.type).toBe('portalLinkRequest');
    expect(returnPortal?.payload.metadata.targetMapId).toBe('vilgem');
    expect(returnPortal?.payload.metadata.targetSpawnCoords).toEqual({ x: 700, y: 450 });
    expect(returnPortal?.payload.metadata.promptText).toBe('Sair');
    expect(returnPortal?.payload.metadata.actionKey).toBe('E');
  });

  it('deve spawnar múltiplos portais conectando a outros mapas', async () => {
    const eventManager = new MockEventManager();
    const definition: IntermapDefinition = {
      id: 'dungeon_hub',
      name: 'Dungeon Hub',
      parentWorldId: 'alun',
      width: 1024,
      height: 1024,
      portals: [
        {
          x: 100,
          y: 200,
          width: 64,
          height: 64,
          targetMapId: 'alun',
          targetSpawnCoords: { x: 300, y: 400 },
          type: 'direct'
        },
        {
          x: 800,
          y: 200,
          width: 64,
          height: 64,
          targetMapId: 'interior_black_default',
          targetSpawnCoords: { x: 512, y: 700 },
          type: 'request',
          promptText: 'Entrar na Sala Escura',
          actionKey: 'E'
        }
      ]
    };

    const world = new IntermapWorld(definition, eventManager);
    await world.generate();

    const portalSpawns = eventManager.dispatchedEvents.filter(e => 
      e.event === 'spawn' && (e.payload.type === 'portalLinkRequest' || e.payload.type === 'portalLink')
    );

    expect(portalSpawns.length).toBe(2);
    expect(portalSpawns[0]?.payload.metadata?.targetMapId).toBe('alun');
    expect(portalSpawns[0]?.payload.type).toBe('portalLink');
    expect(portalSpawns[1]?.payload.metadata?.targetMapId).toBe('interior_black_default');
    expect(portalSpawns[1]?.payload.type).toBe('portalLinkRequest');
  });
});
