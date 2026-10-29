import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { IntermapRegistry } from '../../domain/ObjectModule/Maps/IntermapConfig';
import { Exporter } from '../../adapters/assets-adapter/Components/Exporter';
import { WorldCodeSync } from '../../adapters/assets-adapter/Components/WorldCodeSync';
import { InnerMapManager } from '../../adapters/assets-adapter/Components/InnerMapManager';
import { AssetScanner } from '../../adapters/assets-adapter/Components/AssetScanner';
import type { PlacedAssetModel } from '../../adapters/assets-adapter/Models/PlacedAssetModel';
import type { SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';
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
 * TESTE DE INTEGRAÇÃO & REGRESSÃO:
 * FLUXO COMPLETO: CRIAÇÃO DE DOIS PORTAIS NO ASSETS EDITOR -> EXECUÇÃO DO JOGO
 * ==============================================================================
 * Cenário simulado:
 * 1. Um desenvolvedor/designer abre o Assets Editor e posiciona dois portais interligados:
 *    - Portal A (em Vilgem): tipo 'request' [E] em (800, 600), com destino para 'interior_black_default' em (512, 700).
 *    - Portal B (no Interior 'interior_black_default'): tipo 'request' [E] em (1936, 3) (dimensões 106x1011),
 *      com destino de retorno para fora da casa em 'vilgem' (850, 620).
 * 2. O Assets Editor persiste ambos os portais usando WorldCodeSync e InnerMapManager.saveInnerMapElements,
 *    e sincroniza a definição do InnerMap no IntermapRegistry.
 * 3. O jogo inicia no Domínio e gera os elementos no mundo.
 * 4. O jogador caminha até o Portal A, o motor físico SAT detecta a colisão, exibe o prompt e ao apertar [E]
 *    ('interact' via ActionManager) o player entra no interior saindo exatamente em (512, 700).
 * 5. Dentro do interior, o jogador anda até o Portal B em (1950, 700), o motor físico SAT detecta a colisão,
 *    e ao apertar [E] o jogo transiciona de volta para Vilgem, saindo exatamente em (850, 620) fora da casa.
 * ==============================================================================
 */
describe('Integração Assets Editor & Runtime: Criação de Dois Portais e Verificação de Saída Exata', () => {
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

  it('deve simular criação de 2 portais no Assets Editor (WorldCodeSync + InnerMapManager), rodar a física SAT real e validar saída exata de ida e volta', async () => {
    const codeSync = new WorldCodeSync();
    const scanner = new AssetScanner();
    const innerMapMgr = InnerMapManager.getInstance();

    // -------------------------------------------------------------------------
    // PASSO 1: Criação dos dois portais como modelos no Assets Editor
    // -------------------------------------------------------------------------
    const portalA_Vilgem: PlacedAssetModel = {
      uid: 'portal_custom_vilgem_to_interior',
      presetId: 'portal_link_circle',
      name: 'Portal Link -> interior_black_default',
      x: 800,
      y: 600,
      width: 64,
      height: 64,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      imageSrc: 'portal_circle.png',
      zIndex: 100,
      isPortal: true,
      portalType: 'request',
      targetMapId: 'interior_black_default',
      targetSpawnX: 512,
      targetSpawnY: 700,
      promptText: 'Entrar na Casa',
      actionKey: 'E',
      cooldownMs: 500
    };

    const portalB_Interior: PlacedAssetModel = {
      uid: 'portal_custom_interior_to_vilgem',
      presetId: 'portal_link_circle',
      name: 'Portal Link -> vilgem',
      x: 1936,
      y: 3,
      width: 106,
      height: 1011,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      imageSrc: 'portal_door.png',
      zIndex: 100,
      isPortal: true,
      portalType: 'request',
      targetMapId: 'vilgem',
      targetSpawnX: 850,
      targetSpawnY: 620,
      promptText: 'Sair para Vilgem',
      actionKey: 'E',
      cooldownMs: 500
    };

    // -------------------------------------------------------------------------
    // PASSO 2: Persistência e geração pelo Assets Editor (WorldCodeSync + InnerMapManager)
    // -------------------------------------------------------------------------
    const mapConfigVilgem: SelectedMapConfig = {
      id: 'vilgem',
      name: 'Alvorada de Vilgem',
      description: 'Mapa de teste para integração de portais',
      width: 3072,
      height: 4096,
      chunkSize: 1024
    };

    const mapConfigInterior: SelectedMapConfig = {
      id: 'interior_black_default',
      name: 'Interior Escuro',
      description: 'InnerMap editado no Assets Editor',
      width: 2048,
      height: 1024,
      chunkSize: 1024,
      isInnerMap: true,
      parentWorldId: 'vilgem'
    };

    // Gera e faz round-trip do código de Vilgem via WorldCodeSync + Exporter
    const generatedSceneryCode = codeSync.generateSceneryCode([portalA_Vilgem], mapConfigVilgem);
    const exportedTs = Exporter.generateTypeScript(mapConfigVilgem, [portalA_Vilgem]);
    expect(exportedTs).toContain("this.eventManager.dispatch('spawn'");
    expect(generatedSceneryCode).toContain("type: 'portalLinkRequest'");
    expect(generatedSceneryCode).toContain("targetMapId: 'interior_black_default'");
    expect(generatedSceneryCode).toContain("x: 512, y: 700");

    const parsedVilgemAssets = codeSync.parseSceneryFromCode(
      `${WorldCodeSync.START_DELIMITER}\n${generatedSceneryCode}\n${WorldCodeSync.END_DELIMITER}`,
      scanner
    );
    expect(parsedVilgemAssets.length).toBe(1);
    const parsedPortalA = parsedVilgemAssets[0]!;
    expect(parsedPortalA.targetMapId).toBe('interior_black_default');
    expect(parsedPortalA.targetSpawnX).toBe(512);
    expect(parsedPortalA.targetSpawnY).toBe(700);

    // Salva o Portal B no InnerMapManager (como o Assets Editor faz ao editar o InnerMap)
    await innerMapMgr.saveInnerMapElements('interior_black_default', [portalB_Interior], mapConfigInterior);
    const updatedInnerMapDef = innerMapMgr.getInnerMap('interior_black_default');
    expect(updatedInnerMapDef).toBeDefined();
    expect(updatedInnerMapDef!.portals?.length).toBe(1);
    expect(updatedInnerMapDef!.portals![0]!.targetMapId).toBe('vilgem');
    expect(updatedInnerMapDef!.portals![0]!.targetSpawnCoords).toEqual({ x: 850, y: 620 });

    // Registra a definição atualizada no IntermapRegistry para o runtime do Domínio
    IntermapRegistry.register(structuredClone(updatedInnerMapDef!) as any);

    // -------------------------------------------------------------------------
    // PASSO 3: Inicialização do Domínio e carregamento do mundo
    // -------------------------------------------------------------------------
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 700, y: 600 } } } as any,
      mockLogger,
      eventManager,
      realCollisionService as any,
      mockTelemetry
    );

    await domain.loadWorld('vilgem');

    // Spawna o Portal A recém-parseado do código gerado pelo Assets Editor
    eventManager.dispatch('spawn', {
      type: parsedPortalA.portalType === 'direct' ? 'portalLink' : 'portalLinkRequest',
      coordinates: { x: parsedPortalA.x, y: parsedPortalA.y },
      size: { width: parsedPortalA.width, height: parsedPortalA.height },
      metadata: {
        targetMapId: parsedPortalA.targetMapId,
        targetSpawnCoords: { x: parsedPortalA.targetSpawnX!, y: parsedPortalA.targetSpawnY! },
        promptText: parsedPortalA.promptText,
        actionKey: parsedPortalA.actionKey,
        cooldownMs: parsedPortalA.cooldownMs
      }
    });

    const transitions: Array<{ mapId: string; coordinates: { x: number; y: number } }> = [];
    eventManager.on('mapTransitionCompleted', (payload) => {
      transitions.push(payload);
    });

    // -------------------------------------------------------------------------
    // PASSO 4: O jogador caminha até o Portal A (800, 600) e aperta [E]
    // -------------------------------------------------------------------------
    const player = domain.player;
    player.coordinates.x = 810;
    player.coordinates.y = 610;

    // Roda 2 ticks reais para que o CollisionManager envie o buffer para o SAT e aplique a colisão
    domain.update(1 / 60);
    domain.update(1 / 60);

    // Jogador aperta [E] ('interact')
    domain.handlePlayerInteractions({ actions: ['interact'] }, { x: 0, y: 0 });
    await new Promise(resolve => setTimeout(resolve, 40));

    // Asserção: O jogador entrou em interior_black_default e saiu EXATAMENTE em (512, 700)
    expect(transitions.length).toBe(1);
    expect(transitions[0]).toEqual({
      mapId: 'interior_black_default',
      coordinates: { x: 512, y: 700 }
    });
    expect(player.coordinates).toEqual({ x: 512, y: 700 });

    // -------------------------------------------------------------------------
    // PASSO 5: Dentro do Interior, o Portal B já foi carregado automaticamente pelo IntermapWorld!
    // O jogador anda até o Portal B em (1950, 700) e aperta [E] para sair para fora da casa.
    // -------------------------------------------------------------------------
    const innerEntities = (domain as any).objectManager.getEntities();
    const portalEntityB = innerEntities.find(
      (el: any) => el.targetMapId === 'vilgem' && el.coordinates.x === 1936
    );
    expect(portalEntityB, 'Portal B salvo no InnerMapManager deve ser instanciado pelo IntermapWorld').toBeDefined();

    // Move o jogador até a área do Portal B (em y = 700) e roda o motor físico SAT
    player.coordinates.x = 1950;
    player.coordinates.y = 700;

    domain.update(1 / 60);
    domain.update(1 / 60);

    // Aperta [E] ('interact') pelo fluxo real do ActionManager
    domain.handlePlayerInteractions({ actions: ['interact'] }, { x: 0, y: 0 });
    await new Promise(resolve => setTimeout(resolve, 40));

    // Asserção final: O jogador retorna para Vilgem e sai EXATAMENTE em (850, 620), fora da casa
    expect(transitions.length).toBe(2);
    expect(transitions[1]).toEqual({
      mapId: 'vilgem',
      coordinates: { x: 850, y: 620 }
    });
    expect(player.coordinates).toEqual({ x: 850, y: 620 });
    expect(player.coordinates).not.toEqual({ x: 1536, y: 1615 });
  });
});

