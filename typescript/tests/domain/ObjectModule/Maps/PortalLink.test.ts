import { describe, it, expect, vi, beforeEach } from 'vitest';
import PortalLink from '../../../../domain/ObjectModule/Maps/PortalLink';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';

describe('PortalLink', () => {
  let mockEventManager: IEventManager;

  beforeEach(() => {
    mockEventManager = {
      on: vi.fn(),
      dispatch: vi.fn()
    };
  });

  it('deve inicializar com propriedades corretas e hitbox padrão', () => {
    const portal = new PortalLink(
      10,
      { x: 100, y: 200 },
      { width: 48, height: 32 },
      mockEventManager,
      'interior_black_default',
      { x: 512, y: 700 }
    );

    expect(portal.id).toBe(10);
    expect(portal.objectId).toBe('portalLink');
    expect(portal.targetMapId).toBe('interior_black_default');
    expect(portal.targetSpawnCoords).toEqual({ x: 512, y: 700 });
    expect(portal.hitboxes).toBeDefined();
    expect(portal.hitboxes?.length).toBe(1);
    expect(portal.isTriggerActive).toBe(true);
  });

  it('não deve disparar transição ao colidir com entidade que não é o player', () => {
    const portal = new PortalLink(
      10,
      { x: 100, y: 200 },
      { width: 48, height: 32 },
      mockEventManager,
      'interior_black_default'
    );

    const enemy = { id: 99, objectId: 'enemy' };
    portal.handleCollision(enemy);

    expect(mockEventManager.dispatch).not.toHaveBeenCalled();
    expect(portal.isTriggerActive).toBe(true);
  });

  it('deve disparar mapTransitionRequested ao colidir com o player', () => {
    const portal = new PortalLink(
      10,
      { x: 100, y: 200 },
      { width: 48, height: 32 },
      mockEventManager,
      'interior_black_default',
      { x: 512, y: 700 }
    );

    const player = { id: 1, objectId: 'player' };
    portal.handleCollision(player);

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('mapTransitionRequested', {
      targetMapId: 'interior_black_default',
      targetCoordinates: { x: 512, y: 700 }
    });
    expect(portal.isTriggerActive).toBe(false);
  });

  it('deve respeitar o cooldown e reativar o gatilho após o tempo transcorrido', () => {
    const portal = new PortalLink(
      10,
      { x: 100, y: 200 },
      { width: 48, height: 32 },
      mockEventManager,
      'vilgem',
      undefined,
      null,
      1000 // 1 segundo
    );

    const player = { id: 1, objectId: 'player' };
    portal.handleCollision(player);
    expect(portal.isTriggerActive).toBe(false);

    // Tentativa durante o cooldown
    portal.handleCollision(player);
    expect(mockEventManager.dispatch).toHaveBeenCalledTimes(1);

    // Passa meio segundo (500ms)
    portal.update(0.5);
    expect(portal.isTriggerActive).toBe(false);

    // Passa mais 0.6s (totalizando 1.1s)
    portal.update(0.6);
    expect(portal.isTriggerActive).toBe(true);

    // Agora deve disparar novamente
    portal.handleCollision(player);
    expect(mockEventManager.dispatch).toHaveBeenCalledTimes(2);
  });

  it('deve ser instanciável via createSpawn', () => {
    const portal = PortalLink.createSpawn(
      50,
      {
        type: 'portalLink',
        coordinates: { x: 300, y: 400 },
        size: { width: 64, height: 48 },
        metadata: {
          targetMapId: 'interior_black_default',
          targetSpawnCoords: { x: 120, y: 150 },
          cooldownMs: 2000
        }
      },
      mockEventManager
    );

    expect(portal.id).toBe(50);
    expect(portal.targetMapId).toBe('interior_black_default');
    expect(portal.targetSpawnCoords).toEqual({ x: 120, y: 150 });
    expect(portal.transitionCooldownMs).toBe(2000);
  });
});
