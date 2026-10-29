import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PortalLinksMap,
  getPortalLinksForMap,
  registerPortalLink,
  setPortalLinksForMap,
  type PortalLinkConfig
} from '../../../../domain/ObjectModule/Maps/PortalLinks/portalLinksMap';
import VilgemWorld from '../../../../domain/ObjectModule/Maps/VilgemWorld';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';

describe('PortalLinksMap & Data-Driven Portal Generation', () => {
  let mockEventManager: IEventManager;
  let dispatchedEvents: { event: string; payload: any }[] = [];

  beforeEach(() => {
    dispatchedEvents = [];
    mockEventManager = {
      on: vi.fn(),
      dispatch: vi.fn((event: string, payload: any) => {
        dispatchedEvents.push({ event, payload });
      })
    };
  });

  it('deve conter configurações válidas para vilgem e interior_black_default', () => {
    const vilgemPortals = getPortalLinksForMap('vilgem');
    expect(vilgemPortals).toBeDefined();
    expect(vilgemPortals.length).toBeGreaterThan(0);

    const bakeryPortal = vilgemPortals.find(p => p.id === 'vilgem_bakery_entrance');
    expect(bakeryPortal).toBeDefined();
    expect(bakeryPortal?.type).toBe('request');
    expect(bakeryPortal?.targetMapId).toBe('interior_black_default');
    expect(bakeryPortal?.actionKey).toBe('E');
    expect(bakeryPortal?.promptText).toBe('Entrar');
    expect(bakeryPortal?.hitboxes).toBeDefined();
  });

  it('deve permitir registrar e consultar novos portais dinamicamente', () => {
    const customPortal: PortalLinkConfig = {
      id: 'test_dungeon_portal',
      type: 'request',
      coordinates: { x: 100, y: 100 },
      size: { width: 32, height: 32 },
      targetMapId: 'dungeon_level_1',
      promptText: 'Explorar Masmorra',
      actionKey: 'E'
    };

    registerPortalLink('test_map', customPortal);
    const portals = getPortalLinksForMap('test_map');

    expect(portals.length).toBe(1);
    expect(portals[0]?.id).toBe('test_dungeon_portal');
    expect(portals[0]?.promptText).toBe('Explorar Masmorra');
  });

  it('VilgemWorld deve spawnar os portais configurados em PortalLinksMap automaticamente na geração', async () => {
    const world = new VilgemWorld(mockEventManager);
    await world.generate();

    const portalSpawns = dispatchedEvents.filter(e => e.event === 'spawn' && (e.payload.type === 'portalLink' || e.payload.type === 'portalLinkRequest'));

    expect(portalSpawns.length).toBeGreaterThan(0);
    const bakerySpawn = portalSpawns.find(s => s.payload.metadata?.targetMapId === 'interior_black_default');
    expect(bakerySpawn).toBeDefined();
    expect(bakerySpawn?.payload.type).toBe('portalLinkRequest');
    expect(bakerySpawn?.payload.metadata.promptText).toBe('Entrar');
    expect(bakerySpawn?.payload.metadata.actionKey).toBe('E');
  });
});
