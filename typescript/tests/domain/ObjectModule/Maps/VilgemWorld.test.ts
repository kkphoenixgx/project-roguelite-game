import { describe, it, expect, vi, beforeEach } from 'vitest';
import VilgemWorld from '../../../../domain/ObjectModule/Maps/VilgemWorld';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';
import HitBoxPolygon from '../../../../domain/hitBox/HitBoxPolygon';
import ExperienceTome from '../../../../domain/ObjectModule/Items/Consumables/ExperienceTome';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };

describe('VilgemWorld', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com as dimensões e limites assinados de Alvorada de Vilgem (5120x6144 com origem central)', () => {
    const world = new VilgemWorld(mockEventManager);
    expect(world.mapId).toBe('vilgem');
    expect(world.width).toBe(5120);
    expect(world.height).toBe(6144);
    expect(world.minX).toBe(-2048);
    expect(world.minY).toBe(-3072);
    expect(world.maxX).toBe(3072);
    expect(world.maxY).toBe(3072);
    expect(world.originChunk).toEqual({ cx: 2, cy: 3 });
    expect(world.defaultSpawn).toEqual({ x: 512, y: 591 });
    expect(world.bounds).toMatchObject({
      minX: -2048,
      minY: -3072,
      maxX: 3072,
      maxY: 3072,
      width: 5120,
      height: 6144,
      originChunk: { cx: 2, cy: 3 }
    });
  });

  it('deve orquestrar a injeção do Ambiente e de Entidades durante a geração', () => {
    const world = new VilgemWorld(mockEventManager);
    const dispatchSpy = vi.spyOn(mockEventManager, 'dispatch');
    
    world.generate();

    // Valida a injeção do NPC Diretor Molor no Chunk Central (0,0)
    expect(dispatchSpy).toHaveBeenCalledWith('spawn', expect.objectContaining({ type: 'molor', coordinates: { x: 340, y: 380 } }));
  });

  it('deve permitir spawnar itens dropados incluindo ExperienceTome via spawnDroppedItem sem erros de escopo', () => {
    const world = new VilgemWorld(mockEventManager);
    const dispatchSpy = vi.spyOn(mockEventManager, 'dispatch');
    const tome = new ExperienceTome();

    (world as any).spawnDroppedItem({ x: 497, y: 601 }, tome);

    expect(dispatchSpy).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: 'droppedItem',
      coordinates: { x: 497, y: 601 },
      item: expect.objectContaining({
        name: 'Tomo do Conhecimento Perdido'
      })
    }));
  });
});