import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { AutoSaveService, type GameStateSnapshot } from '../../domain/services/AutoSaveService';
import { TauriJsonSaveRepository } from '../../adapters/web/infrastructure/TauriJsonSaveRepository';
import { safeInvoke } from '../../adapters/web/shared/TauriIPC';
import type { SaveSlotDataDTO } from '../../domain/ports/ISaveRepository';
import type { ILogger } from '../../domain/ports/ILogger';

vi.mock('../../adapters/web/shared/TauriIPC', () => ({
  safeInvoke: vi.fn(),
  logger: { log: vi.fn() }
}));

describe('Save System - Full Flow Integration (Front-to-Back & Domain-to-Storage)', () => {
  let eventHandler: EventHandler;
  let saveRepository: TauriJsonSaveRepository;
  let autoSaveService: AutoSaveService;
  let mockLogger: ILogger;
  let currentGameState: GameStateSnapshot;
  const mockSafeInvoke = safeInvoke as unknown as ReturnType<typeof vi.fn>;

  // Simulação de armazenamento nativo de disco (emulando state_manager.rs no Rust)
  const mockDiskStorage = new Map<number, string>();

  beforeEach(() => {
    vi.useFakeTimers();
    mockDiskStorage.clear();

    // Emula chamadas nativas do Rust Tauri operando em arquivos savegame_{slot}.json
    mockSafeInvoke.mockImplementation(async (command: string, args: any) => {
      if (command === 'save_game_slot') {
        mockDiskStorage.set(args.slot, args.payload);
        return `Slot ${args.slot} gravado com sucesso em JSON!`;
      }
      if (command === 'load_game_slot') {
        return mockDiskStorage.get(args.slot) || null;
      }
      if (command === 'delete_game_slot') {
        mockDiskStorage.delete(args.slot);
        return `Slot ${args.slot} apagado!`;
      }
      return null;
    });

    eventHandler = new EventHandler();
    saveRepository = new TauriJsonSaveRepository();
    mockLogger = { log: vi.fn() };

    currentGameState = {
      playerState: {
        attributes: {
          level: 1,
          currentXp: 0,
          availablePoints: 0,
          maxHp: 100,
          hp: 100,
          mana: 50,
          strength: 10,
          constitution: 10,
          dexterity: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10
        },
        coins: 0,
        backpack: [],
        equipment: {},
        classes: {
          unlockedClasses: ['Warrior'],
          activeClass: 'Warrior',
          unlockedSkills: [],
          activeLoadout: [null, null, null, null],
          passiveLoadout: [null, null, null, null],
          globalActiveLoadout: [null, null, null, null]
        }
      },
      mapId: 'vilgem',
      characterName: 'Valente de Vilgem',
      cycle: 1,
      world: 'vilgem'
    };

    autoSaveService = new AutoSaveService(
      eventHandler,
      saveRepository,
      mockLogger,
      () => currentGameState,
      { debounceMs: 300 }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Cenário 1: Início de Partida ("Sonhar") e Coleta In-Game com Debounce', () => {
    it('deve orquestrar o início da run, agrupar múltiplos eventos com debounce e persistir no disco nativo', async () => {
      const toastNotifications: any[] = [];
      eventHandler.on('autoSaveCompleted', (payload) => {
        toastNotifications.push(payload);
      });

      // 1. Frontend dispara início da jornada
      eventHandler.dispatch('gameRunStarted', {
        saveId: 'run-alvorada-01',
        slot: 1,
        mapId: 'vilgem'
      });

      expect(autoSaveService.getActiveSaveId()).toBe('run-alvorada-01');
      expect(autoSaveService.getActiveSlot()).toBe(1);

      // 2. Jogador realiza múltiplas ações rápidas no gameplay
      currentGameState.playerState.backpack.push({ itemId: 101, name: 'Erva Curativa', amount: 3 });
      eventHandler.dispatch('itemAddedToBackpack', { item: { itemId: 101, name: 'Erva Curativa' } });

      currentGameState.playerState.attributes.level = 2;
      currentGameState.playerState.attributes.availablePoints = 1;
      eventHandler.dispatch('levelUp', { newLevel: 2, coordinates: { x: 100, y: 150 } });

      currentGameState.playerState.classes.unlockedSkills.push('slash');
      currentGameState.playerState.attributes.availablePoints = 0;
      eventHandler.dispatch('skillPointSpent', { skillId: 'slash' });

      // Nenhum salvamento deve ter ocorrido antes do debounce expirar
      expect(mockDiskStorage.has(1)).toBe(false);
      expect(toastNotifications.length).toBe(0);

      // 3. Avança o timer além do debounce de 300ms
      await vi.advanceTimersByTimeAsync(350);

      // O arquivo savegame_1.json deve ter sido gravado exatamente uma única vez
      expect(mockDiskStorage.has(1)).toBe(true);
      expect(toastNotifications.length).toBe(1);
      expect(toastNotifications[0]).toEqual(expect.objectContaining({
        slot: 1,
        saveId: 'run-alvorada-01'
      }));

      // 4. Validação do conteúdo gravado no disco
      const savedJson = mockDiskStorage.get(1)!;
      const parsed: SaveSlotDataDTO = JSON.parse(savedJson);
      expect(parsed.saveId).toBe('run-alvorada-01');
      expect(parsed.slot).toBe(1);
      expect(parsed.playerState.attributes.level).toBe(2);
      expect(parsed.playerState.backpack[0]?.name).toBe('Erva Curativa');
      expect(parsed.playerState.classes.unlockedSkills).toContain('slash');
    });
  });

  describe('Cenário 2: Salvamento de Emergência e Fechamento (gameClosing & playerDied)', () => {
    it('deve realizar flush imediato (Zero-Wait) ao fechar o jogo ou ao morrer o jogador', async () => {
      eventHandler.dispatch('gameRunStarted', {
        saveId: 'run-emergencia-99',
        slot: 2,
        mapId: 'vilgem_cemiterio'
      });

      // Modifica o estado com 500 moedas
      currentGameState.playerState.coins = 500;
      eventHandler.dispatch('itemAddedToBackpack', { item: { name: 'Moedas de Ouro' } });

      // Debounce estaria agendado para 300ms, mas a janela é fechada imediatamente (beforeunload)
      expect(mockDiskStorage.has(2)).toBe(false);

      // Dispara fechamento urgente
      eventHandler.dispatch('gameClosing', {});
      await vi.runAllTimersAsync();

      // Flush imediato deve ter gravado no disco sem necessidade de esperar pelo timer de debounce
      expect(mockDiskStorage.has(2)).toBe(true);

      const savedJson = mockDiskStorage.get(2)!;
      const parsed: SaveSlotDataDTO = JSON.parse(savedJson);
      expect(parsed.playerState.coins).toBe(500);
      expect(parsed.saveId).toBe('run-emergencia-99');
    });

    it('deve realizar flush imediato quando o jogador morre (playerDied)', async () => {
      eventHandler.dispatch('gameRunStarted', {
        saveId: 'run-morte-13',
        slot: 3,
        mapId: 'catacumbas'
      });

      currentGameState.playerState.attributes.hp = 0;
      eventHandler.dispatch('playerDied', {});
      await vi.runAllTimersAsync();

      expect(mockDiskStorage.has(3)).toBe(true);
      const savedJson = mockDiskStorage.get(3)!;
      const parsed: SaveSlotDataDTO = JSON.parse(savedJson);
      expect(parsed.playerState.attributes.hp).toBe(0);
    });
  });

  describe('Cenário 3: Resolução Determinística do Menor Slot', () => {
    it('deve priorizar e sobrescrever sempre o menor slot quando múltiplos slots compartilham o saveId', async () => {
      const duplicateSaveId = 'run-compartilhada-777';

      // Popula slots no disco emulando histórico com slots 2 e 5 contendo o mesmo saveId
      mockDiskStorage.set(2, JSON.stringify({
        saveId: duplicateSaveId,
        slot: 2,
        timestamp: 1000,
        playerState: { ...currentGameState.playerState, coins: 50 }
      }));

      mockDiskStorage.set(5, JSON.stringify({
        saveId: duplicateSaveId,
        slot: 5,
        timestamp: 2000,
        playerState: { ...currentGameState.playerState, coins: 50 }
      }));

      // Inicia com o slot ativo apontando para 5
      eventHandler.dispatch('gameRunStarted', {
        saveId: duplicateSaveId,
        slot: 5,
        mapId: 'vilgem'
      });

      // Dispara salvamento
      currentGameState.playerState.coins = 999;
      await autoSaveService.scheduleAutoSave('force_check', true);

      // Deve ter sobrescrito o Slot 2 (menor slot) e NÃO o slot 5
      const slot2Json = mockDiskStorage.get(2)!;
      const slot2Parsed: SaveSlotDataDTO = JSON.parse(slot2Json);
      expect(slot2Parsed.slot).toBe(2);
      expect(slot2Parsed.playerState.coins).toBe(999);

      // Slot 5 não deve ter sido tocado
      const slot5Json = mockDiskStorage.get(5)!;
      const slot5Parsed: SaveSlotDataDTO = JSON.parse(slot5Json);
      expect(slot5Parsed.playerState.coins).toBe(50);
    });
  });

  describe('Cenário 4: Retomada e Carregamento sem Recarregamento de Página', () => {
    it('deve carregar os dados salvos em JSON preservando a integridade para inicialização limpa em memória', async () => {
      // 1. Salva dados completos de uma jornada avançada
      const advancedSave: SaveSlotDataDTO = {
        saveId: 'run-retomada-88',
        slot: 1,
        timestamp: Date.now(),
        characterName: 'Mago das Cinzas',
        mapId: 'torre_arcana',
        cycle: 3,
        world: 'torre_arcana',
        playerState: {
          attributes: {
            level: 15,
            currentXp: 450,
            availablePoints: 0,
            maxHp: 220,
            hp: 220,
            mana: 180,
            strength: 8,
            constitution: 16,
            dexterity: 12,
            intelligence: 25,
            wisdom: 18,
            charisma: 10
          },
          coins: 1450,
          backpack: [
            { itemId: 205, name: 'Cajado Rúnico', amount: 1 },
            { itemId: 301, name: 'Poção de Mana Maior', amount: 5 }
          ],
          equipment: {},
          classes: {
            unlockedClasses: ['Mage'],
            activeClass: 'Mage',
            unlockedSkills: ['fireball', 'arcane_shield'],
            activeLoadout: ['fireball', 'arcane_shield', null, null],
            passiveLoadout: [null, null, null, null],
            globalActiveLoadout: [null, null, null, null]
          }
        }
      };

      await saveRepository.saveSlot(1, advancedSave);

      // 2. Frontend carrega o save em memória (sem reload de janela ou localStorage)
      const loadedData = await saveRepository.loadSlot(1);

      expect(loadedData).not.toBeNull();
      expect(loadedData?.saveId).toBe('run-retomada-88');
      expect(loadedData?.characterName).toBe('Mago das Cinzas');
      expect(loadedData?.playerState.attributes.intelligence).toBe(25);
      expect(loadedData?.playerState.backpack.length).toBe(2);
      expect(loadedData?.playerState.classes.activeLoadout[0]).toBe('fireball');
    });
  });
});
