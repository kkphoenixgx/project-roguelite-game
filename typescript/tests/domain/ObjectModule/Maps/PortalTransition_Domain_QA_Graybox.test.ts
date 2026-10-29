import { describe, it, expect, vi, beforeEach } from 'vitest';
import PortalLinkRequest from '../../../../domain/ObjectModule/Maps/PortalLinkRequest';
import {
  getPortalLinksForMap,
  registerPortalLink,
  setPortalLinksForMap,
  type PortalLinkConfig
} from '../../../../domain/ObjectModule/Maps/PortalLinks/portalLinksMap';
import VilgemWorld from '../../../../domain/ObjectModule/Maps/VilgemWorld';
import DomainFacade from '../../../../domain/DomainFacade';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';
import ActionManager from '../../../../domain/eventDispacher/ActionManager';

/**
 * ============================================================================
 * SUÍTE DE TESTES GRAYBOX DE CONFORMIDADE DO DOMÍNIO (QA):
 * Transição de Mapas, Intermaps, Portais Interativos e Geração Automática
 * ============================================================================
 * Papel: QA Lead & Compliance Auditor (rpg-testes)
 * Foco: Validar de ponta a ponta os requisitos do Domínio sem alterar código de produção.
 */
describe('QA Graybox - Domain Map Transitions & Interactive Portals Compliance', () => {
  let mockEventManager: IEventManager;
  let eventListeners: Record<string, Function[]>;
  let dispatchedEvents: { event: string; payload: any }[];

  beforeEach(() => {
    eventListeners = {};
    dispatchedEvents = [];

    mockEventManager = {
      on: vi.fn((event: string, callback: Function) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event]!.push(callback);
      }),
      dispatch: vi.fn((event: string, payload: any) => {
        dispatchedEvents.push({ event, payload });
        const listeners = eventListeners[event];
        if (listeners) {
          listeners.forEach(cb => cb(payload));
        }
      }),
      off: vi.fn((event: string, callback: Function) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event]!.filter(cb => cb !== callback);
        }
      })
    };
  });

  /* -------------------------------------------------------------------------- */
  /* 1. PortalLinksMap: Catálogo Central e Extensibilidade Data-Driven          */
  /* -------------------------------------------------------------------------- */
  describe('1. PortalLinksMap Data Catalog & Extension', () => {
    it('deve fornecer configurações estritas para o mapa Vilgem incluindo o portal da padaria', () => {
      const portals = getPortalLinksForMap('vilgem');
      expect(portals).toBeInstanceOf(Array);
      expect(portals.length).toBeGreaterThanOrEqual(1);

      const bakery = portals.find(p => p.id === 'vilgem_bakery_entrance');
      expect(bakery).toBeDefined();
      expect(bakery?.type).toBe('request');
      expect(bakery?.targetMapId).toBe('interior_black_default');
      expect(bakery?.promptText).toBe('Entrar');
      expect(bakery?.actionKey).toBe('E');
      expect(bakery?.coordinates).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
      expect(bakery?.size).toEqual(expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }));
      expect(bakery?.hitboxes).toBeDefined();
      expect(bakery?.hitboxes?.length).toBeGreaterThan(0);
    });

    it('deve fornecer configuração de saída válida para interior_black_default', () => {
      const portals = getPortalLinksForMap('interior_black_default');
      expect(portals).toBeInstanceOf(Array);
      const exitPortal = portals.find(p => p.id === 'interior_black_default_exit');

      expect(exitPortal).toBeDefined();
      expect(['direct', 'request']).toContain(exitPortal?.type);
      expect(exitPortal?.targetMapId).toBe('vilgem');
      expect(exitPortal?.targetSpawnCoords).toBeDefined();
    });

    it('deve retornar lista vazia e segura para mapas não cadastrados', () => {
      const portals = getPortalLinksForMap('unregistered_unknown_map_id');
      expect(portals).toEqual([]);
    });

    it('deve permitir cadastro dinâmico e sobrescrita limpa via API do catálogo', () => {
      const customConfig: PortalLinkConfig = {
        id: 'qa_dynamic_portal',
        type: 'request',
        coordinates: { x: 500, y: 600 },
        size: { width: 48, height: 48 },
        targetMapId: 'target_test_realm',
        targetSpawnCoords: { x: 100, y: 120 },
        promptText: 'Acessar Reino',
        actionKey: 'F',
        cooldownMs: 1500
      };

      registerPortalLink('qa_temp_map', customConfig);
      const result = getPortalLinksForMap('qa_temp_map');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'qa_dynamic_portal',
        promptText: 'Acessar Reino',
        actionKey: 'F',
        cooldownMs: 1500
      });

      // Sobrescrevendo o mapa todo
      setPortalLinksForMap('qa_temp_map', []);
      expect(getPortalLinksForMap('qa_temp_map')).toHaveLength(0);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. PortalLinkRequest: Ciclo de Vida, Debounce, Prompt e Interação          */
  /* -------------------------------------------------------------------------- */
  describe('2. PortalLinkRequest State Machine & Lifecycle', () => {
    it('deve emitir portalPromptShow com coordenadas do portal e dados configurados ao colidir com o Player', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt',
        { x: 200, y: 200 },
        null,
        1000,
        'Descer Cripta',
        'E'
      );

      const playerEntity = { id: 1, objectId: 'player' };
      portal.handleCollision(playerEntity);

      expect(portal.isPlayerInside).toBe(true);
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('portalPromptShow', {
        portalId: 42,
        targetMapId: 'dungeon_crypt',
        text: 'Descer Cripta',
        actionKey: 'E',
        coordinates: { x: 350, y: 450 }
      });
    });

    it('NÃO deve emitir portalPromptShow ao colidir com entidades que não sejam o Player', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt'
      );

      const hostileNpc = { id: 99, objectId: 'skeleton' };
      const projectile = { id: 101, objectId: 'fireball' };

      portal.handleCollision(hostileNpc);
      portal.handleCollision(projectile);

      expect(portal.isPlayerInside).toBe(false);
      const promptShowEvents = dispatchedEvents.filter(e => e.event === 'portalPromptShow');
      expect(promptShowEvents).toHaveLength(0);
    });

    it('deve manter debounce: múltiplos contatos no mesmo frame ou frames consecutivos não devem duplicar portalPromptShow', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt'
      );

      const playerEntity = { id: 1, objectId: 'player' };

      // Frame 1: Colisão 1 e 2 (ex: duas sub-hitboxes)
      portal.handleCollision(playerEntity);
      portal.handleCollision(playerEntity);
      portal.update(0.016);

      // Frame 2: Colisão contínua
      portal.handleCollision(playerEntity);
      portal.update(0.3);

      const promptShowEvents = dispatchedEvents.filter(e => e.event === 'portalPromptShow');
      expect(promptShowEvents).toHaveLength(1);
    });

    it('deve emitir portalPromptHide quando o jogador sai da hitbox (ausência de colisão no tick subsequente)', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt'
      );

      const playerEntity = { id: 1, objectId: 'player' };

      // Tick 1: Player colide e está dentro
      portal.handleCollision(playerEntity);
      portal.update(0.016);
      expect(portal.isPlayerInside).toBe(true);

      // Tick 2: Sem colisão (jogador andou para fora da área)
      portal.update(0.3);
      expect(portal.isPlayerInside).toBe(false);
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('portalPromptHide', { portalId: 42 });

      // Tick 3: Continua fora, não deve emitir portalPromptHide novamente
      const hideCountBefore = dispatchedEvents.filter(e => e.event === 'portalPromptHide').length;
      portal.update(0.016);
      const hideCountAfter = dispatchedEvents.filter(e => e.event === 'portalPromptHide').length;
      expect(hideCountAfter).toBe(hideCountBefore);
    });

    it('deve disparar mapTransitionRequested e portalPromptHide ao receber portalInteract se o jogador estiver dentro', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt',
        { x: 120, y: 240 },
        null,
        2000
      );

      const playerEntity = { id: 1, objectId: 'player' };
      portal.handleCollision(playerEntity);
      expect(portal.isPlayerInside).toBe(true);

      // Dispara evento de interação direcionado a este portal
      mockEventManager.dispatch('portalInteract', { portalId: 42 });

      expect(mockEventManager.dispatch).toHaveBeenCalledWith('portalPromptHide', { portalId: 42 });
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('mapTransitionRequested', {
        targetMapId: 'dungeon_crypt',
        targetCoordinates: { x: 120, y: 240 }
      });
      expect(portal.isPlayerInside).toBe(false);
      expect(portal.isTriggerActive).toBe(false);
    });

    it('deve aceitar portalInteract com payload vazio {} disparado por atalho de teclado global [E]', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt'
      );

      portal.handleCollision({ id: 1, objectId: 'player' });
      expect(portal.isPlayerInside).toBe(true);

      // Payload vazio {} enviado via tecla E do teclado
      mockEventManager.dispatch('portalInteract', {});

      expect(mockEventManager.dispatch).toHaveBeenCalledWith('mapTransitionRequested', {
        targetMapId: 'dungeon_crypt'
      });
    });

    it('deve ignorar portalInteract se portalId for especificado e for diferente do deste portal', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt'
      );

      portal.handleCollision({ id: 1, objectId: 'player' });

      // Outro portal clicado
      mockEventManager.dispatch('portalInteract', { portalId: 999 });

      const transitionEvents = dispatchedEvents.filter(e => e.event === 'mapTransitionRequested');
      expect(transitionEvents).toHaveLength(0);
      expect(portal.isPlayerInside).toBe(true); // Permanece dentro
    });

    it('deve respeitar cooldown: não deve permitir nova transição enquanto cooldownTimer estiver ativo', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt',
        undefined,
        null,
        1000 // 1 segundo
      );

      portal.handleCollision({ id: 1, objectId: 'player' });
      mockEventManager.dispatch('portalInteract', { portalId: 42 });

      expect(portal.isTriggerActive).toBe(false);

      // Tentativa de interagir novamente durante o cooldown
      portal.handleCollision({ id: 1, objectId: 'player' });
      mockEventManager.dispatch('portalInteract', { portalId: 42 });

      const transitionCount = dispatchedEvents.filter(e => e.event === 'mapTransitionRequested').length;
      expect(transitionCount).toBe(1);

      // Avança metade do tempo (500ms)
      portal.update(0.5);
      expect(portal.isTriggerActive).toBe(false);

      // Avança o restante (mais 600ms)
      portal.update(0.6);
      expect(portal.isTriggerActive).toBe(true);
    });

    it('deve sanitizar listeners e desativar prompt no destroy() prevenindo memory leaks', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt'
      );

      portal.handleCollision({ id: 1, objectId: 'player' });
      expect(portal.isPlayerInside).toBe(true);

      portal.destroy();

      expect(portal.isPlayerInside).toBe(false);
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('portalPromptHide', { portalId: 42 });
      expect(mockEventManager.off).toHaveBeenCalledWith('portalInteract', expect.any(Function));

      // Após destroy, evento portalInteract não deve mais afetar o portal
      mockEventManager.dispatch('portalInteract', { portalId: 42 });
      const transitionEvents = dispatchedEvents.filter(e => e.event === 'mapTransitionRequested');
      expect(transitionEvents).toHaveLength(0);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Geração Automática em GameWorld.generate()                              */
  /* -------------------------------------------------------------------------- */
  describe('3. GameWorld Automatic Portal Spawning', () => {
    it('VilgemWorld.generate() deve despachar eventos de spawn para todos os portais de Vilgem', async () => {
      const world = new VilgemWorld(mockEventManager);
      await world.generate();

      const spawnEvents = dispatchedEvents.filter(e => e.event === 'spawn');
      const portalSpawns = spawnEvents.filter(
        e => e.payload.type === 'portalLinkRequest' || e.payload.type === 'portalLink'
      );

      expect(portalSpawns.length).toBeGreaterThanOrEqual(1);

      const bakeryPortal = portalSpawns.find(s => s.payload.type === 'portalLinkRequest');
      expect(bakeryPortal).toBeDefined();
      expect(bakeryPortal?.payload.metadata.targetMapId).toBe('interior_black_default');
      expect(bakeryPortal?.payload.metadata.promptText).toBe('Entrar');
      expect(bakeryPortal?.payload.metadata.actionKey).toBe('E');
      expect(bakeryPortal?.payload.hitboxes || bakeryPortal?.payload.size).toBeDefined();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. ActionManager & Roteamento da Ação 'interact' no Domínio                 */
  /* -------------------------------------------------------------------------- */
  describe('4. ActionManager & Domain Input Routing', () => {
    it('ActionManager deve despachar portalInteract: {} ao receber a ação interact', () => {
      const mockPlayer: any = {
        constructor: { name: 'MockPlayer' },
        activeClass: 'Warrior',
        classes: [],
        activeLoadout: [],
        globalActiveLoadout: []
      };
      const mockLogger: any = { log: vi.fn() };

      const actionManager = new ActionManager(mockPlayer, mockLogger, mockEventManager);

      actionManager.checkEvent(['interact'], { x: 100, y: 100 });

      expect(mockEventManager.dispatch).toHaveBeenCalledWith('portalInteract', {});
    });

    it('DomainFacade.handlePlayerInteractions deve propagar interact até a ativação do portal', async () => {
      const mockLogger: any = { log: vi.fn() };
      const mockCollision: any = {
        checkCollisions: vi.fn(),
        getPossibleCollisions: vi.fn(),
        updateEntityPosition: vi.fn(),
        removeEntity: vi.fn(),
        clear: vi.fn()
      };

      const domain = new DomainFacade(
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

      // Cria um portal de teste registrado no barramento
      const portal = new PortalLinkRequest(
        77,
        { x: 100, y: 100 },
        { width: 40, height: 40 },
        mockEventManager,
        'interior_black_default',
        { x: 500, y: 500 }
      );

      // Player colide com o portal
      portal.handleCollision({ id: 1, objectId: 'player' });
      expect(portal.isPlayerInside).toBe(true);

      // Acionamento pelo DomainFacade
      domain.handlePlayerInteractions({ actions: ['interact'] }, { x: 100, y: 100 });

      // O portal deve ter recebido a notificação e disparado a transição
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('mapTransitionRequested', {
        targetMapId: 'interior_black_default',
        targetCoordinates: { x: 500, y: 500 }
      });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. Performance & Zero-GC em Per-Frame Update                               */
  /* -------------------------------------------------------------------------- */
  describe('5. Zero-GC Performance in Per-Frame Update Loop', () => {
    it('PortalLinkRequest.update() não deve gerar dispatch de eventos quando o estado permanece inalterado', () => {
      const portal = new PortalLinkRequest(
        42,
        { x: 350, y: 450 },
        { width: 64, height: 64 },
        mockEventManager,
        'dungeon_crypt'
      );

      // Jogador fora, trigger ativo, sem colisões: loop de 120 frames (2 segundos a 60 FPS)
      for (let i = 0; i < 120; i++) {
        portal.update(0.016);
      }

      // Nenhum evento foi disparado durante o repouso
      expect(dispatchedEvents).toHaveLength(0);
    });
  });
});
