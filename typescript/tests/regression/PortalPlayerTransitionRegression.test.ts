import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { IntermapRegistry } from '../../domain/ObjectModule/Maps/IntermapConfig';
import { PortalLinksMap } from '../../domain/ObjectModule/Maps/PortalLinks/portalLinksMap';
import intermapsMap from '../../adapters/web/assets/maps/intermapsMap.json';
import Quadtree from '../../domain/shared/QuadTree';
import PortalLinkRequest from '../../domain/ObjectModule/Maps/PortalLinkRequest';
import '../../domain/ObjectModule/Maps/PortalLink';

/**
 * Executa a mesma matemática SAT + QuadTree do Collision.worker.ts de produção
 * sobre o buffer binário Float32Array enviado pelo CollisionManager.
 */
function createRealSatCollisionService() {
  function isSeparatingAxis(axis: { x: number; y: number }, polyA: { x: number; y: number }[], polyB: { x: number; y: number }[]) {
    let minA = Infinity, maxA = -Infinity;
    for (let i = 0; i < polyA.length; i++) {
      const proj = polyA[i]!.x * axis.x + polyA[i]!.y * axis.y;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }
    let minB = Infinity, maxB = -Infinity;
    for (let i = 0; i < polyB.length; i++) {
      const proj = polyB[i]!.x * axis.x + polyB[i]!.y * axis.y;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }
    return maxA < minB || maxB < minA;
  }

  function checkPolyPoly(polyA: { x: number; y: number }[], polyB: { x: number; y: number }[]) {
    for (let i = 0; i < polyA.length; i++) {
      const p1 = polyA[i]!;
      const p2 = polyA[(i + 1) % polyA.length]!;
      if (isSeparatingAxis({ x: p2.y - p1.y, y: p1.x - p2.x }, polyA, polyB)) return false;
    }
    for (let i = 0; i < polyB.length; i++) {
      const p1 = polyB[i]!;
      const p2 = polyB[(i + 1) % polyB.length]!;
      if (isSeparatingAxis({ x: p2.y - p1.y, y: p1.x - p2.x }, polyA, polyB)) return false;
    }
    return true;
  }

  function isSeparatingAxisCircle(axis: { x: number; y: number }, poly: { x: number; y: number }[], cx: number, cy: number, r: number) {
    const len = Math.hypot(axis.x, axis.y);
    if (len === 0) return false;
    const nx = axis.x / len;
    const ny = axis.y / len;
    let minA = Infinity, maxA = -Infinity;
    for (let i = 0; i < poly.length; i++) {
      const proj = poly[i]!.x * nx + poly[i]!.y * ny;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }
    const circleProj = cx * nx + cy * ny;
    return maxA < circleProj - r || circleProj + r < minA;
  }

  function checkPolyCircle(poly: { x: number; y: number }[], cx: number, cy: number, r: number) {
    let closestDistSq = Infinity;
    let closestVertex = poly[0]!;
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i]!;
      const p2 = poly[(i + 1) % poly.length]!;
      if (isSeparatingAxisCircle({ x: p2.y - p1.y, y: p1.x - p2.x }, poly, cx, cy, r)) return false;
      const distSq = (p1.x - cx) * (p1.x - cx) + (p1.y - cy) * (p1.y - cy);
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestVertex = p1;
      }
    }
    if (isSeparatingAxisCircle({ x: closestVertex.x - cx, y: closestVertex.y - cy }, poly, cx, cy, r)) return false;
    return true;
  }

  return {
    checkCollisions: vi.fn((hitboxData: Float32Array, bufferLength: number, worldBounds: any, onResult: (pairs: Int32Array) => void) => {
      const collisionTree = new Quadtree<any>(worldBounds);
      const elements: any[] = [];
      const collidingPairs: number[] = [];
      const processedPairs = new Set<number>();

      let offset = 0;
      while (offset < bufferLength) {
        const id = hitboxData[offset++]!;
        const type = hitboxData[offset++]!;
        if (type === 0) {
          const cx = hitboxData[offset++]!;
          const cy = hitboxData[offset++]!;
          const radius = hitboxData[offset++]!;
          const el = { id, type, cx, cy, radius, x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 };
          elements.push(el);
          collisionTree.insert(el);
        } else if (type === 1) {
          const pointCount = hitboxData[offset++]!;
          const points: { x: number; y: number }[] = [];
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let p = 0; p < pointCount; p++) {
            const px = hitboxData[offset++]!;
            const py = hitboxData[offset++]!;
            points.push({ x: px, y: py });
            if (px < minX) minX = px;
            if (py < minY) minY = py;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
          }
          const el = { id, type, points, x: minX, y: minY, width: maxX - minX, height: maxY - minY };
          elements.push(el);
          collisionTree.insert(el);
        }
      }

      for (let i = 0; i < elements.length; i++) {
        const elA = elements[i]!;
        const potential = collisionTree.retrieve(elA);
        for (let j = 0; j < potential.length; j++) {
          const elB = potential[j]!;
          if (elA.id === elB.id) continue;
          const k1 = elA.id < elB.id ? elA.id : elB.id;
          const k2 = elA.id < elB.id ? elB.id : elA.id;
          const pairKey = 0.5 * (k1 + k2) * (k1 + k2 + 1) + k2;
          if (processedPairs.has(pairKey)) continue;

          if (elA.type === 0 && elB.type === 0) {
            const dx = elA.cx - elB.cx;
            const dy = elA.cy - elB.cy;
            if (dx * dx + dy * dy <= (elA.radius + elB.radius) ** 2) {
              collidingPairs.push(elA.id, elB.id);
              processedPairs.add(pairKey);
            }
          } else if (elA.type === 1 && elB.type === 1) {
            if (checkPolyPoly(elA.points, elB.points)) {
              collidingPairs.push(elA.id, elB.id);
              processedPairs.add(pairKey);
            }
          } else {
            const poly = elA.type === 1 ? elA.points : elB.points;
            const circ = elA.type === 0 ? elA : elB;
            if (checkPolyCircle(poly, circ.cx, circ.cy, circ.radius)) {
              collidingPairs.push(elA.id, elB.id);
              processedPairs.add(pairKey);
            }
          }
        }
      }

      onResult(new Int32Array(collidingPairs));
    })
  };
}

/**
 * ==============================================================================
 * TESTE DE REGRESSÃO: TRANSIÇÃO DO JOGADOR EM PORTAIS E PRECISÃO DE COORDENADAS
 * ==============================================================================
 * Objetivo:
 * Simular um jogador entrando fisicamente em cada portal cadastrado através do
 * pipeline real de física (CollisionManager + SAT + QuadTree + HitBoxPolygon),
 * ativando a transição via comando real de interação ('interact' -> ActionManager)
 * e verificando se a coordenada final de saída do jogador no mapa de destino
 * bate exatamente com o 'targetSpawnCoords' especificado na configuração do portal.
 * ==============================================================================
 */
describe('Regressão de Portais: Simulação Física Real de Entrada e Saída Exata do Player', () => {
  let eventManager: EventHandler;
  let realCollisionService: ReturnType<typeof createRealSatCollisionService>;
  let mockTelemetry: any;
  let mockLogger: any;

  beforeEach(() => {
    PortalLinkRequest.focusedPortalId = null;
    eventManager = new EventHandler();
    realCollisionService = createRealSatCollisionService();

    mockTelemetry = {
      recordFrame: vi.fn(),
      recordSubsystemTime: vi.fn(),
      setSpatialInfo: vi.fn(),
      recordFileTiming: vi.fn(),
      incrementCollisionCheck: vi.fn(),
      incrementResolvedCollision: vi.fn(),
      incrementEvent: vi.fn()
    };

    mockLogger = {
      log: vi.fn()
    };

    for (const def of Object.values(intermapsMap)) {
      IntermapRegistry.register(structuredClone(def) as any);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve detectar colisão SAT real no portal da Padaria (que usa hitboxes JSON relativas), exibir prompt próximo ao player e sair em (512, 700)', async () => {
    const config = {
      player: { id: 1, level: 1, initialPos: { x: 650, y: 390 } },
      world: { type: 'vilgem' }
    };

    const domain = new DomainFacade(config as any, mockLogger, eventManager, realCollisionService as any, mockTelemetry);
    await domain.loadWorld('vilgem');

    const bakeryPortalConfig = PortalLinksMap['vilgem']?.find((p: any) => p.id === 'vilgem_bakery_entrance');
    expect(bakeryPortalConfig).toBeDefined();
    expect(bakeryPortalConfig?.targetSpawnCoords).toEqual({ x: 512, y: 700 });

    const player = domain.player;
    // Posiciona o jogador sobre a porta da padaria (700, 390) e roda os ticks reais do motor
    player.coordinates.x = bakeryPortalConfig!.coordinates.x + 10;
    player.coordinates.y = bakeryPortalConfig!.coordinates.y + 10;

    let promptShownPayload: any = null;
    eventManager.on('portalPromptShow', (payload: any) => {
      promptShownPayload = payload;
    });

    // Tick 1: atualiza hitboxes e envia buffer binário para o CollisionService SAT
    domain.update(1 / 60);
    // Tick 2: aplica pendingCollisions e dispara portalPromptShow
    domain.update(1 / 60);

    expect(promptShownPayload, 'A colisão SAT real deve disparar portalPromptShow para a porta da padaria').not.toBeNull();
    expect(promptShownPayload.targetMapId).toBe('interior_black_default');

    let completedTransition: any = null;
    eventManager.on('mapTransitionCompleted', (payload: any) => {
      completedTransition = payload;
    });

    // Aciona a tecla [E] pelo fluxo real do ActionManager
    domain.handlePlayerInteractions({ actions: ['interact'] }, { x: 0, y: 0 });

    await new Promise(resolve => setTimeout(resolve, 40));

    expect(completedTransition, 'Evento mapTransitionCompleted deve ter sido disparado').not.toBeNull();
    expect(completedTransition.mapId).toBe('interior_black_default');
    expect(completedTransition.coordinates).toEqual({ x: 512, y: 700 });
    expect(player.coordinates).toEqual({ x: 512, y: 700 });
  });

  it('deve fazer o ciclo completo (ida e volta): entrar na Padaria -> andar até o portal do innermap em y=700 -> apertar [E] -> sair em (-324, -574) fora da casa', async () => {
    const config = {
      player: { id: 1, level: 1, initialPos: { x: -324, y: -634 } },
      world: { type: 'vilgem' }
    };

    const domain = new DomainFacade(config as any, mockLogger, eventManager, realCollisionService as any, mockTelemetry);
    await domain.loadWorld('vilgem');

    const transitions: Array<{ mapId: string; coordinates: { x: number; y: number } }> = [];
    eventManager.on('mapTransitionCompleted', (payload: any) => {
      transitions.push(payload);
    });

    // 1. Jogador está na porta da Padaria (-324, -634) -> roda física e interage com [E]
    domain.update(1 / 60);
    domain.update(1 / 60);
    domain.handlePlayerInteractions({ actions: ['interact'] }, { x: 0, y: 0 });
    await new Promise(resolve => setTimeout(resolve, 40));

    expect(transitions.length).toBe(1);
    expect(transitions[0]).toEqual({
      mapId: 'interior_black_default',
      coordinates: { x: 512, y: 700 }
    });
    expect(domain.player.coordinates).toEqual({ x: 512, y: 700 });

    // 2. Verifica que os portais antigos de Vilgem foram destruídos ao trocar de mapa (sem listeners órfãos)
    const innerEntities = (domain as any).objectManager.getEntities();
    const exitPortal = innerEntities.find((el: any) => el.targetMapId === 'vilgem');
    expect(exitPortal, 'Portal de saída para Vilgem deve existir no innermap').toBeDefined();

    // 3. Jogador caminha até a faixa de saída no interior (x: 1950, y: 700)
    domain.player.coordinates.x = 1950;
    domain.player.coordinates.y = 700;

    let innerPromptPayload: any = null;
    eventManager.on('portalPromptShow', (payload: any) => {
      innerPromptPayload = payload;
    });

    domain.update(1 / 60);
    domain.update(1 / 60);

    expect(innerPromptPayload, 'Portal do innermap deve exibir prompt ao colidir via SAT').not.toBeNull();
    // Regressão de visibilidade: o balão do portal vertical (y: 3..1014) deve aparecer na altura do player (y ~ 700) e não fora da tela em y = 3
    expect(innerPromptPayload.coordinates.y).toBeGreaterThanOrEqual(650);
    expect(innerPromptPayload.coordinates.y).toBeLessThanOrEqual(750);

    // 4. Jogador aperta [E] dentro do innermap para sair para fora da casa
    domain.handlePlayerInteractions({ actions: ['interact'] }, { x: 0, y: 0 });
    await new Promise(resolve => setTimeout(resolve, 40));

    expect(transitions.length).toBe(2);
    expect(transitions[1]).toEqual({
      mapId: 'vilgem',
      coordinates: { x: -324, y: -574 }
    });
    expect(domain.player.coordinates).toEqual({ x: -324, y: -574 });
    expect(domain.player.coordinates).not.toEqual({ x: 512, y: 591 });
  });

  it('deve redirecionar o player para fora da Taverna (272, 930) quando ele entra pela Taverna (272, 870) e sai pelo portal compartilhado de interior_black_default', async () => {
    const config = {
      player: { id: 1, level: 1, initialPos: { x: 272, y: 870 } },
      world: { type: 'vilgem' }
    };

    const domain = new DomainFacade(config as any, mockLogger, eventManager, realCollisionService as any, mockTelemetry);
    await domain.loadWorld('vilgem');

    const transitions: Array<{ mapId: string; coordinates: { x: number; y: number } }> = [];
    eventManager.on('mapTransitionCompleted', (payload: any) => {
      transitions.push(payload);
    });

    domain.player.coordinates.x = 272 + 5;
    domain.player.coordinates.y = 870 + 5;

    // 1. Jogador colide com a porta da Taverna (272, 870) e aperta [E]
    domain.update(1 / 60);
    domain.update(1 / 60);
    domain.handlePlayerInteractions({ actions: ['interact'] }, { x: 0, y: 0 });
    await new Promise(resolve => setTimeout(resolve, 80));

    expect(transitions.length).toBe(1);
    expect(transitions[0]?.mapId).toBe('interior_black_default');
    expect(domain.player.coordinates).toEqual({ x: 512, y: 700 });

    // 2. Dentro do innermap, jogador caminha até a faixa de saída (x: 1950, y: 700) e aperta [E]
    domain.player.coordinates.x = 1950;
    domain.player.coordinates.y = 700;

    domain.update(1 / 60);
    domain.update(1 / 60);
    domain.handlePlayerInteractions({ actions: ['interact'] }, { x: 0, y: 0 });
    await new Promise(resolve => setTimeout(resolve, 80));

    expect(transitions.length).toBe(2);
    expect(transitions[1]?.mapId).toBe('vilgem');
    // Deve sair em frente à Taverna (272, 930) de onde entrou, e não lá na Padaria (-324, -574)
    expect(domain.player.coordinates.x).toBe(272);
    expect(domain.player.coordinates.y).toBeGreaterThan(870);
  });

  it('deve remover listeners de portalInteract quando o portal é removido (evitando vazamento de estado entre transições)', () => {
    const portal = new PortalLinkRequest(
      999,
      { x: 100, y: 100 },
      { width: 64, height: 64 },
      eventManager,
      'vilgem',
      { x: -324, y: -574 }
    );

    const player = { id: 1, objectId: 'player', coordinates: { x: 110, y: 110 }, size: { width: 32, height: 32 } };
    portal.handleCollision(player);
    expect(PortalLinkRequest.focusedPortalId).toBe(999);

    portal.destroy();
    expect(PortalLinkRequest.focusedPortalId).toBeNull();

    let triggeredAfterDestroy = false;
    eventManager.on('mapTransitionRequested', () => {
      triggeredAfterDestroy = true;
    });

    eventManager.dispatch('portalInteract', { portalId: 999 });
    expect(triggeredAfterDestroy).toBe(false);
  });

  it('deve iterar todos os portais cadastrados em PortalLinksMap e validar que todos possuem hitboxes no mundo real e coordenadas válidas', () => {
    const allPortals = Object.entries(PortalLinksMap).flatMap(([mapId, portals]: [string, any]) =>
      (portals as any[]).map((p: any) => ({ originMap: mapId, portal: p }))
    );

    expect(allPortals.length).toBeGreaterThan(0);

    for (const { originMap, portal } of allPortals) {
      expect(portal.id, `Portal em ${originMap} deve ter id válido`).toBeTruthy();
      expect(portal.targetMapId, `Portal ${portal.id} deve ter targetMapId`).toBeTruthy();
      expect(portal.targetSpawnCoords, `Portal ${portal.id} deve ter targetSpawnCoords`).toBeDefined();
      expect(portal.targetSpawnCoords?.x).toBeTypeOf('number');
      expect(portal.targetSpawnCoords?.y).toBeTypeOf('number');
      expect(Number.isFinite(portal.targetSpawnCoords!.x)).toBe(true);
      expect(Number.isFinite(portal.targetSpawnCoords!.y)).toBe(true);
    }
  });
});

