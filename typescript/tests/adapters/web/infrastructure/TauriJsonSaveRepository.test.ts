import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { TauriJsonSaveRepository } from '../../../../adapters/web/infrastructure/TauriJsonSaveRepository';
import { safeInvoke } from '../../../../adapters/web/shared/TauriIPC';
import type { SaveSlotDataDTO, GlobalProgressData } from '../../../../domain/ports/ISaveRepository';

vi.mock('../../../../adapters/web/shared/TauriIPC', () => ({
  safeInvoke: vi.fn(),
  logger: { log: vi.fn() }
}));

describe('TauriJsonSaveRepository (Infraestrutura de Persistência)', () => {
  let repository: TauriJsonSaveRepository;
  const mockSafeInvoke = safeInvoke as unknown as Mock;

  const sampleSlotData: SaveSlotDataDTO = {
    saveId: 'run-alpha-42',
    slot: 1,
    timestamp: 1700000000000,
    characterName: 'Aventureiro Teste',
    mapId: 'vilgem',
    cycle: 1,
    playerState: {
      attributes: {
        level: 5,
        currentXp: 120,
        availablePoints: 2,
        maxHp: 100,
        hp: 95,
        mana: 50,
        strength: 12,
        constitution: 14,
        dexterity: 10,
        intelligence: 8,
        wisdom: 9,
        charisma: 7
      },
      coins: 250,
      backpack: [{ itemId: 1, name: 'Espada de Ferro', amount: 1 }],
      equipment: {},
      classes: {
        unlockedClasses: ['Warrior'],
        activeClass: 'Warrior',
        unlockedSkills: ['slash'],
        activeLoadout: ['slash', null, null, null],
        passiveLoadout: [null, null, null, null],
        globalActiveLoadout: [null, null, null, null]
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new TauriJsonSaveRepository();
  });

  describe('Operações de Slot (saveSlot / loadSlot / deleteSlot)', () => {
    it('deve chamar safeInvoke com save_game_slot e payload serializado em JSON', async () => {
      mockSafeInvoke.mockResolvedValue('Slot 1 gravado com sucesso!');

      await repository.saveSlot(1, sampleSlotData);

      expect(mockSafeInvoke).toHaveBeenCalledWith('save_game_slot', {
        slot: 1,
        payload: JSON.stringify(sampleSlotData)
      });
    });

    it('deve carregar e desserializar o JSON retornado por load_game_slot', async () => {
      mockSafeInvoke.mockResolvedValue(JSON.stringify(sampleSlotData));

      const loaded = await repository.loadSlot(1);

      expect(mockSafeInvoke).toHaveBeenCalledWith('load_game_slot', { slot: 1 });
      expect(loaded).toEqual(sampleSlotData);
      expect(loaded?.saveId).toBe('run-alpha-42');
      expect(loaded?.playerState.coins).toBe(250);
    });

    it('deve retornar null se load_game_slot retornar vazio ou nulo', async () => {
      mockSafeInvoke.mockResolvedValue(null);

      const loaded = await repository.loadSlot(3);

      expect(mockSafeInvoke).toHaveBeenCalledWith('load_game_slot', { slot: 3 });
      expect(loaded).toBeNull();
    });

    it('deve chamar delete_game_slot ao deletar um slot', async () => {
      mockSafeInvoke.mockResolvedValue('Slot 2 apagado com sucesso!');

      await repository.deleteSlot(2);

      expect(mockSafeInvoke).toHaveBeenCalledWith('delete_game_slot', { slot: 2 });
    });
  });

  describe('Consulta de Múltiplos Slots (getAllSlots)', () => {
    it('deve iterar de 1 a 5 e retornar um Map com os slots preenchidos e vazios', async () => {
      mockSafeInvoke.mockImplementation(async (command: string, args: any) => {
        if (command === 'load_game_slot') {
          if (args.slot === 1) return JSON.stringify({ ...sampleSlotData, slot: 1 });
          if (args.slot === 3) return JSON.stringify({ ...sampleSlotData, slot: 3, saveId: 'run-beta-99' });
          return null; // Slots 2, 4 e 5 vazios
        }
        return null;
      });

      const allSlots = await repository.getAllSlots();

      expect(allSlots.size).toBe(5);
      expect(allSlots.get(1)?.saveId).toBe('run-alpha-42');
      expect(allSlots.get(2)).toBeNull();
      expect(allSlots.get(3)?.saveId).toBe('run-beta-99');
      expect(allSlots.get(4)).toBeNull();
      expect(allSlots.get(5)).toBeNull();
    });
  });

  describe('Fallback em Memória (Ambiente sem Tauri / Web Puro)', () => {
    it('deve persistir e recuperar dados em memória se safeInvoke falhar', async () => {
      mockSafeInvoke.mockRejectedValue(new Error('IPC não disponível fora do Tauri'));

      // Salva no slot 4 com fallback
      await repository.saveSlot(4, sampleSlotData);

      // Carrega do slot 4
      const loaded = await repository.loadSlot(4);
      expect(loaded).toEqual(sampleSlotData);

      // Deleta do slot 4
      await repository.deleteSlot(4);
      const afterDelete = await repository.loadSlot(4);
      expect(afterDelete).toBeNull();
    });
  });

  describe('Progresso Global (Slot 0)', () => {
    it('deve salvar e carregar progresso global com saveProgress e loadProgress', async () => {
      const globalData: GlobalProgressData = {
        globalLevel: 10,
        globalXp: 1500,
        unlockedBrooches: ['brooch_fire', 'brooch_shadow'],
        achievements: ['first_blood', 'dungeon_master']
      };

      mockSafeInvoke.mockResolvedValue(JSON.stringify(globalData));

      await repository.saveProgress(globalData);
      expect(mockSafeInvoke).toHaveBeenCalledWith('save_game_slot', {
        slot: 0,
        payload: JSON.stringify(globalData)
      });

      const loaded = await repository.loadProgress();
      expect(mockSafeInvoke).toHaveBeenCalledWith('load_game_slot', { slot: 0 });
      expect(loaded).toEqual(globalData);
    });
  });
});
