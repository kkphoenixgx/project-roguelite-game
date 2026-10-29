import { describe, it, expect, vi, beforeEach } from 'vitest';
import VilgemWorld from '../../../../domain/ObjectModule/Maps/VilgemWorld';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';
import HitBoxPolygon from '../../../../domain/hitBox/HitBoxPolygon';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };

describe('VilgemWorld', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com as dimensões e limites assinados de Alvorada de Vilgem (3072x3072 com origem central)', () => {
    const world = new VilgemWorld(mockEventManager);
    expect(world.mapId).toBe('vilgem');
    expect(world.width).toBe(4096);
    expect(world.height).toBe(3072);
    expect(world.minX).toBe(-2048);
    expect(world.minY).toBe(-1024);
    expect(world.maxX).toBe(2048);
    expect(world.maxY).toBe(2048);
    expect(world.originChunk).toEqual({ cx: 2, cy: 1 });
    expect(world.defaultSpawn).toEqual({ x: 512, y: 591 });
    expect(world.bounds).toEqual({
      minX: -2048,
      minY: -1024,
      maxX: 2048,
      maxY: 2048,
      width: 4096,
      height: 3072,
      originChunk: { cx: 2, cy: 1 }
    });
  });

  it('deve orquestrar a injeção do Ambiente e de Entidades durante a geração', () => {
    const world = new VilgemWorld(mockEventManager);
    const dispatchSpy = vi.spyOn(mockEventManager, 'dispatch');
    
    world.generate();

    // Valida a injeção do NPC Diretor Molor no Chunk Central (0,0)
    expect(dispatchSpy).toHaveBeenCalledWith('spawn', expect.objectContaining({ type: 'molor', coordinates: { x: 326, y: 356 } }));
  });

  it('deve gerar itens dropados incluindo ExperienceTome sem erros de escopo', async () => {
    const world = new VilgemWorld(mockEventManager);
    const dispatchSpy = vi.spyOn(mockEventManager, 'dispatch');

    await (world as any).generateCustomElements();

    expect(dispatchSpy).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: 'droppedItem',
      coordinates: { x: 497, y: 601 },
      item: expect.objectContaining({
        name: 'Tomo do Conhecimento Perdido'
      })
    }));
  });
});