import { describe, it, expect, vi, beforeEach } from 'vitest';
import PortalLinkRequest from '../../../../domain/ObjectModule/Maps/PortalLinkRequest';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';

describe('PortalLinkRequest', () => {
  let mockEventManager: IEventManager;
  let eventListeners: Record<string, Function[]> = {};

  beforeEach(() => {
    eventListeners = {};
    mockEventManager = {
      on: vi.fn((event: string, callback: Function) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event]!.push(callback);
      }),
      dispatch: vi.fn(),
      off: vi.fn((event: string, callback: Function) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event]!.filter(cb => cb !== callback);
        }
      })
    };
  });

  it('deve inicializar com propriedades corretas, prompt default e registrar ouvinte portalInteract', () => {
    const portal = new PortalLinkRequest(
      15,
      { x: 300, y: 400 },
      { width: 64, height: 48 },
      mockEventManager,
      'interior_black_default',
      { x: 512, y: 700 }
    );

    expect(portal.id).toBe(15);
    expect(portal.objectId).toBe('portalLinkRequest');
    expect(portal.targetMapId).toBe('interior_black_default');
    expect(portal.targetSpawnCoords).toEqual({ x: 512, y: 700 });
    expect(portal.promptText).toBe('Entrar');
    expect(portal.actionKey).toBe('E');
    expect(portal.isPlayerInside).toBe(false);
    expect(portal.isTriggerActive).toBe(true);
    expect(mockEventManager.on).toHaveBeenCalledWith('portalInteract', expect.any(Function));
  });

  it('não deve disparar portalPromptShow ao colidir com entidade que não é o player', () => {
    const portal = new PortalLinkRequest(
      15,
      { x: 300, y: 400 },
      { width: 64, height: 48 },
      mockEventManager,
      'interior_black_default'
    );

    const monster = { id: 88, objectId: 'goblin' };
    portal.handleCollision(monster);

    expect(mockEventManager.dispatch).not.toHaveBeenCalled();
    expect(portal.isPlayerInside).toBe(false);
  });

  it('deve emitir portalPromptShow quando o player entra na hitbox', () => {
    const portal = new PortalLinkRequest(
      15,
      { x: 300, y: 400 },
      { width: 64, height: 48 },
      mockEventManager,
      'interior_black_default',
      { x: 512, y: 700 },
      null,
      1000,
      'Entrar na Taverna',
      'E'
    );

    const player = { id: 1, objectId: 'player' };
    portal.handleCollision(player);

    expect(portal.isPlayerInside).toBe(true);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('portalPromptShow', {
      portalId: 15,
      targetMapId: 'interior_black_default',
      text: 'Entrar na Taverna',
      actionKey: 'E',
      coordinates: { x: 300, y: 400 }
    });
  });

  it('não deve reenviar portalPromptShow se o player já estiver dentro', () => {
    const portal = new PortalLinkRequest(
      15,
      { x: 300, y: 400 },
      { width: 64, height: 48 },
      mockEventManager,
      'interior_black_default'
    );

    const player = { id: 1, objectId: 'player' };
    portal.handleCollision(player);
    portal.handleCollision(player);

    expect(mockEventManager.dispatch).toHaveBeenCalledTimes(1);
  });

  it('deve emitir portalPromptHide quando o player sai da hitbox (sem colisão no update)', () => {
    const portal = new PortalLinkRequest(
      15,
      { x: 300, y: 400 },
      { width: 64, height: 48 },
      mockEventManager,
      'interior_black_default'
    );

    const player = { id: 1, objectId: 'player' };
    portal.handleCollision(player);
    expect(portal.isPlayerInside).toBe(true);

    // No mesmo tick em que colidiu, o update não limpa
    portal.update(0.016);
    expect(portal.isPlayerInside).toBe(true);

    // No tick seguinte, sem colisão registrada, o jogador saiu
    portal.update(0.3);
    expect(portal.isPlayerInside).toBe(false);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('portalPromptHide', { portalId: 15 });
  });

  it('deve efetuar transição quando recebe evento portalInteract e o player está dentro', () => {
    const portal = new PortalLinkRequest(
      15,
      { x: 300, y: 400 },
      { width: 64, height: 48 },
      mockEventManager,
      'interior_black_default',
      { x: 512, y: 700 }
    );

    const player = { id: 1, objectId: 'player' };
    portal.handleCollision(player);

    // O jogador aperta 'E' -> adapter dispara 'portalInteract'
    portal.onInteract({ portalId: 15 });

    // Deve ter fechado o prompt
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('portalPromptHide', { portalId: 15 });
    // Deve ter disparado a transição
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('mapTransitionRequested', {
      targetMapId: 'interior_black_default',
      targetCoordinates: { x: 512, y: 700 }
    });
    expect(portal.isTriggerActive).toBe(false);
  });

  it('NÃO deve efetuar transição se o player NÃO estiver dentro ao apertar interact', () => {
    const portal = new PortalLinkRequest(
      15,
      { x: 300, y: 400 },
      { width: 64, height: 48 },
      mockEventManager,
      'interior_black_default'
    );

    portal.onInteract({ portalId: 15 });

    expect(mockEventManager.dispatch).not.toHaveBeenCalledWith('mapTransitionRequested', expect.any(Object));
  });

  it('NÃO deve efetuar transição se portalId não corresponder a este portal', () => {
    const portal = new PortalLinkRequest(
      15,
      { x: 300, y: 400 },
      { width: 64, height: 48 },
      mockEventManager,
      'interior_black_default'
    );

    const player = { id: 1, objectId: 'player' };
    portal.handleCollision(player);

    portal.onInteract({ portalId: 999 });

    expect(mockEventManager.dispatch).not.toHaveBeenCalledWith('mapTransitionRequested', expect.any(Object));
  });

  it('deve desinscrever listener e fechar prompt no destroy', () => {
    const portal = new PortalLinkRequest(
      15,
      { x: 300, y: 400 },
      { width: 64, height: 48 },
      mockEventManager,
      'interior_black_default'
    );

    const player = { id: 1, objectId: 'player' };
    portal.handleCollision(player);
    expect(portal.isPlayerInside).toBe(true);

    portal.destroy();

    expect(portal.isPlayerInside).toBe(false);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('portalPromptHide', { portalId: 15 });
    expect(mockEventManager.off).toHaveBeenCalledWith('portalInteract', expect.any(Function));
  });

  it('deve criar instância via createSpawn com metadados e hitboxes JSON', () => {
    const spawnPayload = {
      type: 'portalLinkRequest',
      coordinates: { x: 100, y: 150 },
      size: { width: 40, height: 40 },
      metadata: {
        targetMapId: 'vilgem',
        targetSpawnCoords: { x: 200, y: 200 },
        promptText: 'Sair',
        actionKey: 'E',
        cooldownMs: 2000
      },
      hitboxes: [
        {
          id: 'door_hitbox',
          type: 'polygon' as const,
          coordinates: { x: 0, y: 0 },
          rotation: 0,
          points: [
            { x: 0, y: 0 },
            { x: 40, y: 0 },
            { x: 40, y: 40 },
            { x: 0, y: 40 }
          ]
        }
      ]
    };

    const portal = PortalLinkRequest.createSpawn(25, spawnPayload, mockEventManager);

    expect(portal.id).toBe(25);
    expect(portal.objectId).toBe('portalLinkRequest');
    expect(portal.targetMapId).toBe('vilgem');
    expect(portal.promptText).toBe('Sair');
    expect(portal.transitionCooldownMs).toBe(2000);
    expect(portal.hitboxes?.length).toBe(1);
  });

  it('deve desambiguar atomicamente múltiplos portais sobrepostos quando payload for vazio {}', () => {
    const portalA = new PortalLinkRequest(
      10,
      { x: 100, y: 100 },
      { width: 32, height: 32 },
      mockEventManager,
      'map_a'
    );
    const portalB = new PortalLinkRequest(
      20,
      { x: 100, y: 100 },
      { width: 32, height: 32 },
      mockEventManager,
      'map_b'
    );

    const player = { id: 1, objectId: 'player' };
    portalA.handleCollision(player);
    portalB.handleCollision(player); // Portal B é o mais recente / focado

    expect(portalA.isPlayerInside).toBe(true);
    expect(portalB.isPlayerInside).toBe(true);
    expect(PortalLinkRequest.focusedPortalId).toBe(20);

    // Jogador aperta 'E' gerando evento portalInteract com payload vazio {}
    portalA.onInteract({});
    portalB.onInteract({});

    // Apenas o portal B (focado) deve disparar mapTransitionRequested
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('mapTransitionRequested', {
      targetMapId: 'map_b'
    });
    expect(mockEventManager.dispatch).not.toHaveBeenCalledWith('mapTransitionRequested', {
      targetMapId: 'map_a'
    });
  });
});
