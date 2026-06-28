import { describe, it, expect, vi, beforeEach } from 'vitest';
import VilgemWorld from '../../../../domain/ObjectModule/Maps/VilgemWorld';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';
import HitBoxPolygon from '../../../../domain/hitBox/HitBoxPolygon';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };

describe('VilgemWorld', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com o escopo gigante (8192x8192)', () => {
    const world = new VilgemWorld(mockEventManager);
    expect(world.mapId).toBe('vilgem');
    expect(world.width).toBe(8192);
    expect(world.height).toBe(8192);
  });

  it('deve orquestrar a injeção do Ambiente e de Entidades durante a geração', () => {
    const world = new VilgemWorld(mockEventManager);
    const dispatchSpy = vi.spyOn(mockEventManager, 'dispatch');
    
    world.generate();

    // Valida a injeção do NPC Diretor Molor
    expect(dispatchSpy).toHaveBeenCalledWith('spawn', expect.objectContaining({ type: 'molor' }));
  });
});