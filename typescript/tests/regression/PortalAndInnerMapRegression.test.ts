import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { IntermapRegistry } from '../../domain/ObjectModule/Maps/IntermapConfig';
import { PortalLinksMap, getPortalLinksForMap } from '../../domain/ObjectModule/Maps/PortalLinks/portalLinksMap';
import VilgemWorld from '../../domain/ObjectModule/Maps/VilgemWorld';
import IntermapWorld from '../../domain/ObjectModule/Maps/IntermapWorld';
import intermapsMap from '../../adapters/web/assets/maps/intermapsMap.json';
import '../../domain/ObjectModule/Maps/PortalLinkRequest';
import '../../domain/ObjectModule/Maps/PortalLink';

describe('Testes de Regressão - Portais, InnerMaps e World Spawn de Vilgem', () => {
  let eventManager: EventHandler;
  let mockCollision: any;
  let mockTelemetry: any;
  let mockLogger: any;
  let dispatchedEvents: Array<{ event: string; payload: any }>;

  beforeEach(() => {
    dispatchedEvents = [];
    eventManager = new EventHandler();
    eventManager.on('spawn', (payload: any) => {
      dispatchedEvents.push({ event: 'spawn', payload });
    });
    eventManager.on('mapTransitionRequested', (payload: any) => {
      dispatchedEvents.push({ event: 'mapTransitionRequested', payload });
    });

    mockCollision = {
      isPointInPolygon: vi.fn(),
      isPointInCircle: vi.fn(),
      checkCollision: vi.fn(),
      getIntersectingPoints: vi.fn()
    };

    mockTelemetry = {
      recordFrame: vi.fn(),
      recordSubsystemTime: vi.fn(),
      setSpatialInfo: vi.fn(),
      recordFileTiming: vi.fn()
    };

    mockLogger = {
      log: vi.fn()
    };

    // Sincroniza o registro do intermapsMap como feito em tempo de execucao
    for (const [id, def] of Object.entries(intermapsMap)) {
      IntermapRegistry.register(def as any);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 1: World Spawn Oficial de Vilgem na Fonte do Despertar                */
  /* -------------------------------------------------------------------------- */
  describe('Caso 1: World Spawn Oficial de Vilgem no Chunk Central (0, 0) em (512, 591)', () => {
    it('deve posicionar o jogador no Spawn Central (512, 591) dentro do Chunk (0, 0) ao carregar Vilgem sem posicao previa', async () => {
      // Arrange: instancia DomainFacade sem initialPos explicito no config
      const domain = new DomainFacade(
        {} as any,
        mockLogger,
        eventManager,
        mockCollision,
        mockTelemetry
      );

      // Act: carrega o mundo de Vilgem
      await domain.loadWorld('vilgem');

      // Assert: jogador deve estar no Spawn Central (512, 591) dentro do Chunk (0, 0)
      const renderState = domain.getRenderState();
      const playerRenderable = renderState.renderables.find((r: any) => r.id === 1);
      expect(playerRenderable).toBeDefined();
      expect(playerRenderable?.coordinates).toEqual({ x: 512, y: 591 });
      expect(domain.activeChunk).toEqual({ cx: 0, cy: 0 });
    });

    it('deve usar o fallback do Spawn Central (512, 591) dentro do Chunk (0, 0) ao transicionar para Vilgem sem spawnCoords', async () => {
      // Arrange
      const domain = new DomainFacade(
        {} as any,
        mockLogger,
        eventManager,
        mockCollision,
        mockTelemetry
      );
      await domain.loadWorld('interior_black_default');

      // Act: transiciona para Vilgem sem passar coordenadas de destino
      await domain.transitionWorld('vilgem', undefined);

      // Assert
      const renderState = domain.getRenderState();
      const playerRenderable = renderState.renderables.find((r: any) => r.id === 1);
      expect(playerRenderable?.coordinates).toEqual({ x: 512, y: 591 });
      expect(domain.activeChunk).toEqual({ cx: 0, cy: 0 });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 2: Rota da Padaria (Entrada e Retorno para -324, -574)                */
  /* -------------------------------------------------------------------------- */
  describe('Caso 2: Roteamento Estrito do Portal da Padaria (Vilgem <-> interior_black_default)', () => {
    it('deve navegar de Vilgem para interior_black_default e retornar pontualmente para a padaria em (-324, -574)', async () => {
      // Arrange
      const domain = new DomainFacade(
        { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
        mockLogger,
        eventManager,
        mockCollision,
        mockTelemetry
      );
      await domain.loadWorld('vilgem');

      // 1. Simula entrada pelo portal da padaria em (-324, -634)
      await domain.transitionWorld('interior_black_default', { x: 512, y: 700 });
      expect(domain.getRenderState().world.mapId).toBe('interior_black_default');
      expect(domain.getRenderState().renderables.find((r: any) => r.id === 1)?.coordinates).toEqual({ x: 512, y: 700 });

      // 2. Localiza o portal de retorno dentro de interior_black_default
      const renderables = domain.getRenderState().renderables;
      const returnPortalRenderable = renderables.find(
        (r: any) => (r as any).entityTypeId === 'portalLinkRequest' || (r as any).entityTypeId === 'portalLink'
      );
      expect(returnPortalRenderable).toBeDefined();

      const portalEntity = (domain as any).objectManager.getElementById(returnPortalRenderable!.id);
      expect(portalEntity).toBeDefined();
      expect(portalEntity.targetMapId).toBe('vilgem');
      expect(portalEntity.targetSpawnCoords).toEqual({ x: -324, y: -574 });

      // 3. Colisao do player com o portal e ativacao de transicao
      (domain as any).player.coordinates = { x: 1940, y: 50 };
      portalEntity.handleCollision((domain as any).player);

      let capturedTransition: any = null;
      eventManager.on('mapTransitionRequested', (payload: any) => {
        capturedTransition = payload;
      });

      eventManager.dispatch('portalInteract', { portalId: portalEntity.id });

      expect(capturedTransition).not.toBeNull();
      expect(capturedTransition.targetMapId).toBe('vilgem');
      expect(capturedTransition.targetCoordinates).toEqual({ x: -324, y: -574 });

      // 4. Executa a transicao com o payload emitido
      await domain.transitionWorld(capturedTransition.targetMapId, capturedTransition.targetCoordinates);

      // Assert: O jogador deve surgir na frente da padaria (-324, -574) e NUNCA no World Spawn da Fonte (512, 591)
      const finalPlayerPos = domain.getRenderState().renderables.find((r: any) => r.id === 1)?.coordinates;
      expect(finalPlayerPos).toEqual({ x: -324, y: -574 });
      expect(finalPlayerPos).not.toEqual({ x: 512, y: 591 });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 3: Ausencia de Portais Fantasmas ou Duplicados                         */
  /* -------------------------------------------------------------------------- */
  describe('Caso 3: Inexistencia de Portais Fantasmas ou Duplicados', () => {
    it('interior_black_default deve conter EXATAMENTE 1 portal legitimo de saida na parede direita (1936, 3)', async () => {
      const worldDef = IntermapRegistry.get('interior_black_default');
      expect(worldDef).toBeDefined();
      expect(worldDef?.portals).toHaveLength(1);

      const exitPortal = worldDef?.portals?.[0];
      expect(exitPortal?.x).toBe(1936);
      expect(exitPortal?.y).toBe(3);
      expect(exitPortal?.targetMapId).toBe('vilgem');
      expect(exitPortal?.targetSpawnCoords).toEqual({ x: -324, y: -574 });

      // Garante que o portal fantasma em (512, 768) nao existe
      const hasGhostPortal = worldDef?.portals?.some((p: any) => p.x === 512 && p.y === 768);
      expect(hasGhostPortal).toBe(false);
    });

    it('VilgemWorld deve instanciar portais sem duplicatas de mesma coordenada espacial', async () => {
      const vilgem = new VilgemWorld(eventManager);
      await vilgem.generate();

      const spawnEvents = dispatchedEvents.filter(e => e.event === 'spawn');
      const portalSpawns = spawnEvents.filter(
        e => e.payload.type === 'portalLinkRequest' || e.payload.type === 'portalLink'
      );

      // Verifica se ha duplicatas de portal na mesma posicao x, y
      const posKeys = new Set<string>();
      for (const p of portalSpawns) {
        const key = `${p.payload.coordinates.x}_${p.payload.coordinates.y}`;
        expect(posKeys.has(key)).toBe(false);
        posKeys.add(key);
      }

      // Garante que o portal da padaria em (-324, -634) foi spawnado
      expect(posKeys.has('-324_-634')).toBe(true);
    });

    it('PortalLinksMap deve catalogar separadamente os portais de Vilgem sem duplicatas', () => {
      const portals = getPortalLinksForMap('vilgem');
      expect(portals.length).toBeGreaterThanOrEqual(2);

      const bakeryPortal = portals.find((p: any) => p.id === 'vilgem_bakery_entrance');
      expect(bakeryPortal).toBeDefined();
      expect(bakeryPortal?.coordinates).toEqual({ x: -324, y: -634 });
      expect(bakeryPortal?.targetSpawnCoords).toEqual({ x: 512, y: 700 });

      const innPortal = portals.find((p: any) => p.id === 'vilgem_black_inn_entrance');
      expect(innPortal).toBeDefined();
      expect(innPortal?.coordinates).toEqual({ x: 272, y: 870 });
      expect(innPortal?.targetSpawnCoords).toEqual({ x: 512, y: 700 });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 4: Prevencao de Concorrencia Assincrona na Transicao                  */
  /* -------------------------------------------------------------------------- */
  describe('Caso 4: Prevencao de Corrida Assincrona via flag handledByAdapter', () => {
    it('DomainFacade nao deve executar fallback de transicao se o payload foi marcado com handledByAdapter', async () => {
      const domain = new DomainFacade(
        {} as any,
        mockLogger,
        eventManager,
        mockCollision,
        mockTelemetry
      );
      await domain.loadWorld('vilgem');

      const transitionWorldSpy = vi.spyOn(domain, 'transitionWorld');

      // Simula o adaptador marcando handledByAdapter = true sincronicamente
      const payload: any = {
        targetMapId: 'interior_black_default',
        targetCoordinates: { x: 512, y: 700 },
        handledByAdapter: true
      };

      eventManager.dispatch('mapTransitionRequested', payload);

      // Aguarda execucao de microtasks e timers virtuais
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert: DomainFacade NAO deve ter chamado transitionWorld autonomamente
      expect(transitionWorldSpy).not.toHaveBeenCalled();
    });

    it('DomainFacade deve executar transicao autônoma como fallback se handledByAdapter for ausente (modo headless)', async () => {
      const domain = new DomainFacade(
        {} as any,
        mockLogger,
        eventManager,
        mockCollision,
        mockTelemetry
      );
      await domain.loadWorld('vilgem');

      // Simula evento disparado sem adaptador ouvindo (modo teste headless)
      const payload: any = {
        targetMapId: 'interior_black_default',
        targetCoordinates: { x: 512, y: 700 }
      };

      eventManager.dispatch('mapTransitionRequested', payload);

      // Aguarda microtask
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert: DomainFacade executou o fallback autonomamente com sucesso
      expect(domain.getRenderState().world.mapId).toBe('interior_black_default');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 5: Integridade do IntermapWorld (Fundo, Dimensoes e Scenery)          */
  /* -------------------------------------------------------------------------- */
  describe('Caso 5: Integridade de Dados e Renderizacao de IntermapWorld', () => {
    it('deve carregar propriedades corretas de backgroundColor e dimensoes a partir de intermapsMap.json', () => {
      const def = IntermapRegistry.get('interior_black_default')!;
      const world = new IntermapWorld(def, eventManager);

      expect(world.mapId).toBe('interior_black_default');
      expect(world.parentWorldId).toBe('vilgem');
      expect(world.width).toBe(2048);
      expect(world.height).toBe(1024);
      expect(world.backgroundColor).toBe('#000000');
    });

    it('deve despachar spawn de elementos cenograficos e itens configurados no InnerMap', async () => {
      const def = IntermapRegistry.get('interior_black_default')!;
      const world = new IntermapWorld(def, eventManager);
      await world.generate();

      const spawns = dispatchedEvents.filter(e => e.event === 'spawn');
      
      // Valida presenca do camp_cooking_pot cenografico
      const scenerySpawn = spawns.find(s => s.payload.type === 'scenery' && s.payload.metadata?.preset === 'camp_cooking_pot');
      expect(scenerySpawn).toBeDefined();
      expect(scenerySpawn?.payload.coordinates).toEqual({ x: 1642, y: 289 });

      // Valida presenca de itens coletaveis do intermap
      const itemSpawns = spawns.filter(s => s.payload.type === 'droppedItem');
      expect(itemSpawns.length).toBeGreaterThanOrEqual(1);
    });
  });
});
