// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import hitboxesData from '../../adapters/web/assets/maps/collision-layers/vilgem_hitboxes.json';
import SceneManager from '../../adapters/web/components/renderModule/scene/SceneManager';
import Renderer from '../../adapters/web/components/renderModule/engine/Renderer';
import Camera from '../../adapters/web/components/renderModule/scene/Camera';
import Canvas from '../../adapters/web/components/renderModule/engine/Canvas';
import { RenderableFactory } from '../../adapters/web/components/renderModule/scene/RenderableFactory';
import DebugPolygon from '../../adapters/web/components/renderModule/customRenderables/DebugPolygon';
import DebugCircle from '../../adapters/web/components/renderModule/customRenderables/DebugCircle';

describe('Hitbox F2 Debug Mode & Frustum Culling Resilience', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn()
    } as any);
  });

  it('deve expor todos os colliders de mapa, portais, NPCs e cenários em getRenderState().renderables', async () => {
    const eventListeners = new Map<string, Array<(payload: any) => void>>();
    const mockEventManager: any = {
      dispatch: (key: string, payload: any) => {
        const listeners = eventListeners.get(key) || [];
        listeners.forEach(cb => cb(payload));
      },
      on: (key: string, cb: (payload: any) => void) => {
        if (!eventListeners.has(key)) {
          eventListeners.set(key, []);
        }
        eventListeners.get(key)!.push(cb);
      }
    };
    const domain = new DomainFacade(
      {
        player: {
          id: 1,
          level: 1,
          initialPos: { x: 100, y: 100 }
        }
      } as any,
      { log: () => {} } as any,
      mockEventManager,
      { checkCollisions: () => {} } as any
    );
    await domain.loadWorld('vilgem', hitboxesData.hitboxes);
    const state = domain.getRenderState();

    // Valida que environmentColliders e portalLinkRequest (1) estão presentes com hitboxes
    const envColliders = state.renderables.filter(r => r.entityTypeId === 'environmentCollider');
    expect(envColliders.length).toBe(hitboxesData.hitboxes.length);
    envColliders.forEach(c => {
      expect(c.hitboxes).toBeDefined();
      expect(c.hitboxes!.length).toBeGreaterThan(0);
    });

    const portals = state.renderables.filter(r => r.entityTypeId === 'portalLinkRequest');
    expect(portals.length).toBeGreaterThanOrEqual(1);
    portals.forEach(p => {
      expect(p.hitboxes).toBeDefined();
      expect(p.hitboxes!.length).toBeGreaterThan(0);
    });

    // Valida que NPCs cognitivos possuem hitboxes físicas
    const npcs = state.renderables.filter(r => r.entityTypeId === 'molor' || r.entityTypeId === 'candelion');
    expect(npcs.length).toBeGreaterThanOrEqual(2);
    npcs.forEach(npc => {
      expect(npc.hitboxes).toBeDefined();
      expect(npc.hitboxes!.length).toBeGreaterThan(0);
    });
  });

  it('deve gerar instâncias de DebugPolygon e DebugCircle no SceneManager com AABB válido (evitando culling indevido)', async () => {
    const eventListeners = new Map<string, Array<(payload: any) => void>>();
    const mockEventManager: any = {
      dispatch: (key: string, payload: any) => {
        const listeners = eventListeners.get(key) || [];
        listeners.forEach(cb => cb(payload));
      },
      on: (key: string, cb: (payload: any) => void) => {
        if (!eventListeners.has(key)) {
          eventListeners.set(key, []);
        }
        eventListeners.get(key)!.push(cb);
      }
    };
    const domain = new DomainFacade(
      {
        player: {
          id: 1,
          level: 1,
          initialPos: { x: 100, y: 100 }
        }
      } as any,
      { log: () => {} } as any,
      mockEventManager,
      { checkCollisions: () => {} } as any
    );
    await domain.loadWorld('vilgem', hitboxesData.hitboxes);
    const state = domain.getRenderState();

    const canvas = new Canvas(document.body, 800, 600);
    const camera = new Camera(canvas, 1);
    const renderer = new Renderer(canvas, camera);
    const sceneManager = new SceneManager(renderer, true);

    sceneManager.syncRenderables(state.renderables);

    expect(sceneManager.debugRenderables.size).toBeGreaterThanOrEqual(135);

    // Nenhuma hitbox debug pode ter dimensão 0x0 se tiver pontos/raio válidos
    for (const d of sceneManager.debugRenderables.values()) {
      expect(d.size.width).toBeGreaterThan(0);
      expect(d.size.height).toBeGreaterThan(0);
      expect(Number.isFinite(d.coordinates.x)).toBe(true);
      expect(Number.isFinite(d.coordinates.y)).toBe(true);
    }
  });

  it('deve garantir que RenderableFactory retorna null para colliders lógicos, evitando caixas pretas na tela', () => {
    const factory = new RenderableFactory();

    const colliderState: any = {
      id: 999,
      entityTypeId: 'environmentCollider',
      coordinates: { x: 100, y: 100 },
      size: { width: 50, height: 50 },
      rotation: 0
    };
    const portalState: any = {
      id: 1000,
      entityTypeId: 'portalLinkRequest',
      coordinates: { x: 200, y: 200 },
      size: { width: 64, height: 64 },
      rotation: 0
    };

    expect(factory.create(colliderState)).toBeNull();
    expect(factory.create(portalState)).toBeNull();
  });

  it('deve calcular o bounding box correto em DebugPolygon para pontos mundiais arbitrários', () => {
    const polygonState = {
      type: 'polygon' as const,
      coordinates: { x: 0, y: 0 },
      points: [
        { x: 500, y: 400 },
        { x: 800, y: 400 },
        { x: 800, y: 700 },
        { x: 500, y: 700 }
      ],
      rotation: 0
    };

    const debugPoly = new DebugPolygon(1, polygonState);
    expect(debugPoly.coordinates.x).toBe(500);
    expect(debugPoly.coordinates.y).toBe(400);
    expect(debugPoly.size.width).toBe(300);
    expect(debugPoly.size.height).toBe(300);
  });

  it('deve calcular o bounding box correto em DebugCircle com coordenadas no canto superior esquerdo', () => {
    const circleState = {
      type: 'circle' as const,
      coordinates: { x: 500, y: 500 },
      radius: 30,
      rotation: 0
    };

    const debugCircle = new DebugCircle(1, circleState);
    expect(debugCircle.coordinates.x).toBe(470);
    expect(debugCircle.coordinates.y).toBe(470);
    expect(debugCircle.size.width).toBe(60);
    expect(debugCircle.size.height).toBe(60);
  });
});
