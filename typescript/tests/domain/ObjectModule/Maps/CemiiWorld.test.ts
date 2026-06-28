import { describe, it, expect, vi, beforeEach } from 'vitest';
import CemiiWorld from '../../../../domain/ObjectModule/Maps/CemiiWorld';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };

describe('CemiiWorld', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com propriedades dimensionais e matriz de chunks correta', () => {
    const world = new CemiiWorld(mockEventManager);
    expect(world.mapId).toBe('cemii');
    expect(world.width).toBe(4000);
    expect(world.height).toBe(4000);
    expect(world.chunkSize).toBe(1000);
    
    // Matriz de 4x4 esperada baseada nas dimensões (4000 / 1000)
    expect(world.chunks.length).toBe(4);
    expect(world.chunks[0]?.length).toBe(4);
    expect(world.chunks[0]?.[0]).toBe('cemii-0-0');
  });

  it('deve despachar logs de início e fim durante a geração do mundo', () => {
    const world = new CemiiWorld(mockEventManager);
    world.generate();
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({ message: expect.stringContaining('Gerando o mundo de cemii') }));
  });
});