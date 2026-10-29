import { describe, it, expect, vi } from 'vitest';
import Molor from '../../../../../domain/ObjectModule/Entities/NPCs/Molor/Molor';
import Attributes from '../../../../../domain/ObjectModule/Entities/Attributes';
import type { IEventManager } from '../../../../../domain/eventDispacher/IGameEvents';
import type { SpawnPayload } from '../../../../../domain/ObjectModule/SpawnRegistry';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };
const mockLlmService = { generatePlan: vi.fn() };

describe('Molor', () => {
  it('deve ser criado corretamente via createSpawn', () => {
    const payload: SpawnPayload = {
      type: 'molor',
      coordinates: { x: 100, y: 100 },
      llmService: mockLlmService,
    };

    const molor = Molor.createSpawn(101, payload, mockEventManager);

    expect(molor).toBeInstanceOf(Molor);
    expect(molor.id).toBe(101);
    expect(molor.objectId).toBe('molor');
    expect((molor as any).npcName).toBe('Diretor Molor');
    // expect((molor as any).llmService).toBe(mockLlmService);
    
    // Valida os atributos padrão de Molor
    expect(molor.attributes.intelligence).toBe(99);
    expect(molor.attributes.wisdom).toBe(99);
  });

  it('deve usar os atributos do payload se fornecidos', () => {
    const customAttributes = new Attributes(1, 1, 1, 1, 50, 50, 50, 50);
    const payload: SpawnPayload = {
      type: 'molor',
      coordinates: { x: 100, y: 100 },
      attributes: customAttributes,
    };

    const molor = Molor.createSpawn(102, payload, mockEventManager);

    expect(molor.attributes.intelligence).toBe(50);
    expect(molor.attributes).toBe(customAttributes);
  });
});