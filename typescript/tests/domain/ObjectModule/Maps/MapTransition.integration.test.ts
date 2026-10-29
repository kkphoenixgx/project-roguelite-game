import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainFacade from '../../../../domain/DomainFacade';

describe('Map Transition & Intermaps Integration', () => {
  let domain: DomainFacade;
  let eventListeners: Map<string, Array<(payload: any) => void>>;
  let mockEventManager: any;
  let mockLogger: any;
  let mockCollision: any;

  beforeEach(async () => {
    eventListeners = new Map();
    mockEventManager = {
      dispatch: vi.fn((key: string, payload: any) => {
        const listeners = eventListeners.get(key) || [];
        listeners.forEach(cb => cb(payload));
      }),
      on: vi.fn((key: string, cb: (payload: any) => void) => {
        if (!eventListeners.has(key)) {
          eventListeners.set(key, []);
        }
        eventListeners.get(key)!.push(cb);
      })
    };
    mockLogger = { log: vi.fn() };
    mockCollision = {
      checkCollisions: vi.fn(),
      getPossibleCollisions: vi.fn(),
      updateEntityPosition: vi.fn(),
      removeEntity: vi.fn(),
      clear: vi.fn()
    };

    domain = new DomainFacade(
      {
        player: {
          id: 1,
          level: 1,
          initialPos: { x: 100, y: 100 }
        }
      } as any,
      mockLogger,
      mockEventManager,
      mockCollision
    );

    await domain.loadWorld('vilgem');
  });

  it('deve carregar o mundo inicial de Vilgem com o jogador posicionado', () => {
    const renderState = domain.getRenderState();
    expect(renderState.world.mapId).toBe('vilgem');
    expect(renderState.world.width).toBeGreaterThan(0);
    expect(renderState.world.height).toBeGreaterThan(0);

    const player = (domain as any).player;
    expect(player).toBeDefined();
    expect(player.coordinates.x).toBe(100);
    expect(player.coordinates.y).toBe(100);
  });

  it('deve transicionar para um intermap preservando vida, moedas e atributos do jogador', async () => {
    const player = (domain as any).player;
    player.coins = 150;
    player.attributes.hp = 7;

    await domain.transitionWorld('interior_black_default', { x: 512, y: 700 });

    const renderState = domain.getRenderState();
    expect(renderState.world.mapId).toBe('interior_black_default');
    expect(renderState.world.width).toBe(2048);
    expect(renderState.world.height).toBe(1024);

    // Jogador preservado na nova posição
    expect(player.coordinates.x).toBe(512);
    expect(player.coordinates.y).toBe(700);
    expect(player.coins).toBe(150);
    expect(player.attributes.hp).toBe(7);

    // Evento de transição concluída disparado
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('mapTransitionCompleted', {
      mapId: 'interior_black_default',
      coordinates: { x: 512, y: 700 }
    });
  });

  it('deve disparar a transição automaticamente via evento mapTransitionRequested', async () => {
    const player = (domain as any).player;
    player.coins = 999;

    mockEventManager.dispatch('mapTransitionRequested', {
      targetMapId: 'interior_black_default',
      targetCoordinates: { x: 400, y: 600 }
    });

    // Aguarda a resolução assíncrona da transição
    await new Promise(resolve => setTimeout(resolve, 50));

    const renderState = domain.getRenderState();
    expect(renderState.world.mapId).toBe('interior_black_default');
    expect(player.coordinates.x).toBe(400);
    expect(player.coordinates.y).toBe(600);
    expect(player.coins).toBe(999);
  });

  it('deve permitir retorno do intermap para o mapa principal de Vilgem', async () => {
    const player = (domain as any).player;

    // Entra no intermap
    await domain.transitionWorld('interior_black_default', { x: 512, y: 700 });
    expect(domain.getRenderState().world.mapId).toBe('interior_black_default');

    // Sai de volta para Vilgem
    await domain.transitionWorld('vilgem', { x: 2048, y: 2080 });
    const renderState = domain.getRenderState();
    expect(renderState.world.mapId).toBe('vilgem');
    expect(renderState.world.width).toBeGreaterThan(0);
    expect(renderState.world.height).toBeGreaterThan(0);
    expect(player.coordinates.x).toBe(2048);
    expect(player.coordinates.y).toBe(2080);
  });
});
