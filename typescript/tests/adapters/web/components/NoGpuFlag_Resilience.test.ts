// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GameAdapter from '../../../../adapters/web/components/GameAdapter';

describe('No-GPU Flag & Fallback Resilience', () => {
  let originalLocation: Location;

  beforeEach(() => {
    delete (globalThis as any).__NO_GPU__;
    localStorage.clear();
  });

  afterEach(() => {
    delete (globalThis as any).__NO_GPU__;
    localStorage.clear();
  });

  it('deve detectar --no-gpu via URL search param ?no-gpu', async () => {
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/?no-gpu') as any;

    const mockDomain = { getRenderState: vi.fn(), on: vi.fn(), off: vi.fn() } as any;
    const mockEvents = { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any;
    const mockTelemetry = { setSpatialInfo: vi.fn(), setActiveEntities: vi.fn(), endFrame: vi.fn() } as any;

    const adapter = new GameAdapter(mockDomain, mockEvents, mockTelemetry);
    const isNoGpu = await (adapter as any).checkIsNoGpuRequested();

    expect(isNoGpu).toBe(true);
  });

  it('deve detectar --no-gpu via URL search param ?nogpu e ?gpu=false', async () => {
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/?nogpu') as any;

    const mockDomain = { getRenderState: vi.fn(), on: vi.fn(), off: vi.fn() } as any;
    const mockEvents = { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any;
    const mockTelemetry = { setSpatialInfo: vi.fn(), setActiveEntities: vi.fn(), endFrame: vi.fn() } as any;

    const adapter1 = new GameAdapter(mockDomain, mockEvents, mockTelemetry);
    expect(await (adapter1 as any).checkIsNoGpuRequested()).toBe(true);

    window.location = new URL('http://localhost:5173/?gpu=false') as any;
    const adapter2 = new GameAdapter(mockDomain, mockEvents, mockTelemetry);
    expect(await (adapter2 as any).checkIsNoGpuRequested()).toBe(true);
  });

  it('deve detectar --no-gpu via localStorage rpg_no_gpu=true', async () => {
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/') as any;
    localStorage.setItem('rpg_no_gpu', 'true');

    const mockDomain = { getRenderState: vi.fn(), on: vi.fn(), off: vi.fn() } as any;
    const mockEvents = { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any;
    const mockTelemetry = { setSpatialInfo: vi.fn(), setActiveEntities: vi.fn(), endFrame: vi.fn() } as any;

    const adapter = new GameAdapter(mockDomain, mockEvents, mockTelemetry);
    expect(await (adapter as any).checkIsNoGpuRequested()).toBe(true);
  });

  it('deve detectar --no-gpu via globalThis.__NO_GPU__', async () => {
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/') as any;
    (globalThis as any).__NO_GPU__ = true;

    const mockDomain = { getRenderState: vi.fn(), on: vi.fn(), off: vi.fn() } as any;
    const mockEvents = { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any;
    const mockTelemetry = { setSpatialInfo: vi.fn(), setActiveEntities: vi.fn(), endFrame: vi.fn() } as any;

    const adapter = new GameAdapter(mockDomain, mockEvents, mockTelemetry);
    expect(await (adapter as any).checkIsNoGpuRequested()).toBe(true);
  });

  it('deve retornar falso quando nenhuma flag for informada', async () => {
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/') as any;

    const mockDomain = { getRenderState: vi.fn(), on: vi.fn(), off: vi.fn() } as any;
    const mockEvents = { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any;
    const mockTelemetry = { setSpatialInfo: vi.fn(), setActiveEntities: vi.fn(), endFrame: vi.fn() } as any;

    const adapter = new GameAdapter(mockDomain, mockEvents, mockTelemetry);
    expect(await (adapter as any).checkIsNoGpuRequested()).toBe(false);
  });
});
