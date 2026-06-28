import { describe, it, expect, vi, beforeEach } from 'vitest';
import AlunWorld from '../../../../domain/ObjectModule/Maps/AlunWorld';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };

describe('AlunWorld', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com as fronteiras espaciais e o mapId corretos', () => {
    const world = new AlunWorld(mockEventManager);
    expect(world.mapId).toBe('alun');
    expect(world.width).toBe(4000);
    expect(world.height).toBe(4000);
  });

  it('deve despachar logs de início e fim durante a geração do mundo', () => {
    const world = new AlunWorld(mockEventManager);
    world.generate();
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({ message: expect.stringContaining('Gerando o mundo de alun') }));
  });
});