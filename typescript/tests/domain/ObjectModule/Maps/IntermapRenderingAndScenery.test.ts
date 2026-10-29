// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IntermapWorld from '../../../../domain/ObjectModule/Maps/IntermapWorld';
import { IntermapRegistry } from '../../../../domain/ObjectModule/Maps/IntermapConfig';
import GameMap from '../../../../adapters/web/components/renderModule/scene/Map';

describe('Intermap Rendering, Chunks & Scenery Assets Integration', () => {
  let eventDispatched: { key: string; payload: any }[] = [];
  let mockEventManager: any;

  beforeEach(() => {
    eventDispatched = [];
    mockEventManager = {
      dispatch: vi.fn((key: string, payload: any) => {
        eventDispatched.push({ key, payload });
      }),
      on: vi.fn(),
      off: vi.fn()
    };
  });

  it('deve possuir scenery e chunks registrados no IntermapRegistry para interior_black_default', () => {
    const def = IntermapRegistry.get('interior_black_default');
    expect(def).toBeDefined();
    expect(def?.scenery).toBeDefined();
    expect(def?.scenery!.length).toBeGreaterThanOrEqual(2);

    const pond = def?.scenery!.find(s => s.presetId === 'pond_nature_clearing');
    const river = def?.scenery!.find(s => s.presetId === 'river_straight_horizontal');

    expect(pond).toBeDefined();
    expect(pond?.x).toBe(595);
    expect(pond?.y).toBe(34);

    expect(river).toBeDefined();
    expect(river?.x).toBe(554);
    expect(river?.y).toBe(565);

    expect(def?.chunks).toBeDefined();
    expect(def?.chunks!.length).toBeGreaterThan(0);
  });

  it('deve spawnar os assets cenográficos (scenery) ao gerar o IntermapWorld', async () => {
    const def = IntermapRegistry.get('interior_black_default')!;
    const world = new IntermapWorld(def, mockEventManager);

    await world.generate();

    const scenerySpawns = eventDispatched.filter(e => e.key === 'spawn' && e.payload.type === 'scenery');
    expect(scenerySpawns.length).toBeGreaterThanOrEqual(2);

    const pondSpawn = scenerySpawns.find(s => s.payload.metadata?.preset === 'pond_nature_clearing');
    expect(pondSpawn).toBeDefined();
    expect(pondSpawn?.payload.coordinates).toEqual({ x: 595, y: 34 });

    const riverSpawn = scenerySpawns.find(s => s.payload.metadata?.preset === 'river_straight_horizontal');
    expect(riverSpawn).toBeDefined();
    expect(riverSpawn?.payload.coordinates).toEqual({ x: 554, y: 565 });
  });

  it('deve inicializar GameMap com chunks e desenhar fundo sólido e chunks para o intermap', () => {
    const map = new GameMap('interior_black_default');
    expect(map.isIntermap).toBe(true);
    expect(map.width).toBe(2048);
    expect(map.height).toBe(1024);
    expect(map.backgroundColor).toBe('#000000');

    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D;

    // Desenha na posição do jogador (512, 700)
    map.draw(mockCtx, 512, 700);

    // Valida que o fundo sólido foi preenchido
    expect(mockCtx.fillStyle).toBe('#000000');
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 2048, 1024);

    // Valida que a janela de chunks foi ativada
    expect(map.getActiveChunksCount()).toBeGreaterThan(0);
    expect(map.getActiveChunkKeys()).toContain('0,0');
  });
});
