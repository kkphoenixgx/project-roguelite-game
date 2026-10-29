import { describe, it, expect, vi, beforeEach } from 'vitest';
import IntermapWorld from '../../../../domain/ObjectModule/Maps/IntermapWorld';
import { IntermapRegistry, type IntermapDefinition } from '../../../../domain/ObjectModule/Maps/IntermapConfig';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';

describe('IntermapWorld & IntermapConfig', () => {
  let mockEventManager: IEventManager;

  beforeEach(() => {
    mockEventManager = {
      on: vi.fn(),
      dispatch: vi.fn()
    };
  });

  it('deve registrar e recuperar definições do IntermapRegistry', () => {
    expect(IntermapRegistry.has('interior_black_default')).toBe(true);
    const def = IntermapRegistry.get('interior_black_default');
    expect(def).toBeDefined();
    expect(def?.backgroundColor).toBe('#000000');
    expect(def?.width).toBe(2048);
    expect(def?.height).toBe(1024);
    expect(def?.portals?.length).toBeGreaterThan(0);
  });

  it('deve instanciar IntermapWorld com dimensões e background corretos', () => {
    const customDef: IntermapDefinition = {
      id: 'test_black_room',
      parentWorldId: 'vilgem',
      name: 'Sala Escura de Teste',
      width: 800,
      height: 600,
      backgroundColor: '#050505',
      defaultSpawn: { x: 400, y: 300 },
      portals: [
        {
          x: 400,
          y: 550,
          width: 64,
          height: 32,
          targetMapId: 'vilgem',
          targetSpawnCoords: { x: 1500, y: 1500 }
        }
      ]
    };

    const world = new IntermapWorld(customDef, mockEventManager);
    expect(world.mapId).toBe('test_black_room');
    expect(world.width).toBe(800);
    expect(world.height).toBe(600);
    expect(world.backgroundColor).toBe('#050505');
  });

  it('deve gerar portais de saída no generate', async () => {
    const def = IntermapRegistry.get('interior_black_default')!;
    const world = new IntermapWorld(def, mockEventManager);

    await world.generate();

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: expect.stringMatching(/^portalLink/),
      metadata: expect.objectContaining({
        targetMapId: 'vilgem'
      })
    }));
  });
});
