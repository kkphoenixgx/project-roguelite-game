import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainFacade from '../../../../domain/DomainFacade';
import DroppedItem from '../../../../domain/ObjectModule/Items/DroppedItem';

describe('Item Persistence On Portal Transition & Save Integration', () => {
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
          initialPos: { x: 1470, y: 1536 }
        }
      } as any,
      mockLogger,
      mockEventManager,
      mockCollision
    );

    await domain.loadWorld('vilgem');
  });

  it('deve spawnar itens de mapa inicialmente com pickupId determinístico', () => {
    const objectManager = (domain as any).objectManager;
    const entities = objectManager.getEntities();
    const droppedItems = entities.filter((e: any) => e.objectId === 'droppedItem') as DroppedItem[];

    expect(droppedItems.length).toBeGreaterThan(0);
    const swordDrop = droppedItems.find(d => d.pickupId.includes('SimpleSword'));
    expect(swordDrop).toBeDefined();
    expect(swordDrop?.pickupId).toMatch(/^vilgem_item_\d+_\d+_SimpleSword$/);
  });

  it('não deve respawnar itens coletados após transição por portalLink e retorno ao mapa', async () => {
    const objectManager = (domain as any).objectManager;
    const player = (domain as any).player;

    // Localiza a Espada Simples no mapa
    let entities = objectManager.getEntities();
    let swordDrop = entities.find((e: any) => e.objectId === 'droppedItem' && e.pickupId?.includes('SimpleSword'));
    expect(swordDrop).toBeDefined();
    const swordPickupId = swordDrop.pickupId;

    // Simula a coleta pelo jogador
    swordDrop.hitboxes[0].onColision(player);

    expect(player.hasCollectedWorldItem(swordPickupId)).toBe(true);
    expect(player.backpack.length).toBe(1);
    expect(player.backpack[0].name).toContain('Espada de Madeira');

    // Transiciona para um intermap
    await domain.transitionWorld('interior_black_default', { x: 512, y: 700 });
    expect(domain.getRenderState().world.mapId).toBe('interior_black_default');

    // Retorna para Vilgem
    await domain.transitionWorld('vilgem', { x: 1470, y: 1536 });
    expect(domain.getRenderState().world.mapId).toBe('vilgem');

    // Verifica que a espada NÃO reapareceu no chão
    entities = objectManager.getEntities();
    swordDrop = entities.find((e: any) => e.objectId === 'droppedItem' && e.pickupId === swordPickupId);
    expect(swordDrop).toBeUndefined();

    // Mas itens NÃO coletados ainda existem no mapa
    const gunDrop = entities.find((e: any) => e.objectId === 'droppedItem' && e.pickupId?.includes('Gun'));
    expect(gunDrop).toBeDefined();
  });

  it('deve persistir itens coletados no serializeState e restaurar sem respawn no restoreGameState', async () => {
    const objectManager = (domain as any).objectManager;
    const player = (domain as any).player;

    // Coleta a Pistola
    let entities = objectManager.getEntities();
    const gunDrop = entities.find((e: any) => e.objectId === 'droppedItem' && e.pickupId?.includes('Gun'));
    expect(gunDrop).toBeDefined();
    const gunPickupId = gunDrop.pickupId;

    gunDrop.hitboxes[0].onColision(player);
    expect(player.hasCollectedWorldItem(gunPickupId)).toBe(true);

    // Serializa o estado do jogador
    const savedState = player.serializeState();
    expect(savedState.collectedWorldItems).toContain(gunPickupId);

    // Cria uma nova instância de domínio e carrega o mapa
    const freshDomain = new DomainFacade(
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
    await freshDomain.loadWorld('vilgem');

    const freshManager = (freshDomain as any).objectManager;
    let freshGun = freshManager.getEntities().find((e: any) => e.objectId === 'droppedItem' && e.pickupId === gunPickupId);
    expect(freshGun).toBeDefined();

    // Restaura o save contendo os itens coletados
    freshDomain.restoreGameState({ playerState: savedState });

    // Verifica que a arma foi expurgada do mapa imediatamente
    freshGun = freshManager.getEntities().find((e: any) => e.objectId === 'droppedItem' && e.pickupId === gunPickupId);
    expect(freshGun).toBeUndefined();
  });
});
