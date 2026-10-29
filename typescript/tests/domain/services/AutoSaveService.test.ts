import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AutoSaveService } from '../../../../typescript/domain/services/AutoSaveService';
import type { ISaveRepository, SaveSlotDataDTO } from '../../../../typescript/domain/ports/ISaveRepository';
import type { IEventManager, GameEventMap, EventKey } from '../../../../typescript/domain/eventDispacher/IGameEvents';
import type { ILogger } from '../../../../typescript/domain/ports/ILogger';

class MockEventManager implements IEventManager {
    private handlers: Map<string, Array<(payload: any) => void>> = new Map();

    public on<K extends EventKey>(key: K, listener: (payload: GameEventMap[K]) => void): void {
        if (!this.handlers.has(key)) {
            this.handlers.set(key, []);
        }
        this.handlers.get(key)!.push(listener);
    }

    public dispatch<K extends EventKey>(key: K, payload: GameEventMap[K]): void {
        const listeners = this.handlers.get(key);
        if (listeners) {
            listeners.forEach(fn => fn(payload));
        }
    }
}

describe('AutoSaveService (Domain Service)', () => {
    let eventManager: MockEventManager;
    let mockSaveRepository: ISaveRepository;
    let mockLogger: ILogger;
    let mockStateProvider: Mock;

    beforeEach(() => {
        vi.useFakeTimers();
        eventManager = new MockEventManager();

        mockSaveRepository = {
            saveProgress: vi.fn().mockResolvedValue(undefined),
            loadProgress: vi.fn().mockResolvedValue(null),
            saveSlot: vi.fn().mockResolvedValue(undefined),
            loadSlot: vi.fn().mockResolvedValue(null),
            deleteSlot: vi.fn().mockResolvedValue(undefined),
            getAllSlots: vi.fn().mockResolvedValue(new Map())
        };

        mockLogger = {
            log: vi.fn()
        };

        mockStateProvider = vi.fn().mockReturnValue({
            playerState: {
                attributes: { level: 5, hp: 100 },
                coins: 50,
                backpack: [],
                equipment: {},
                classes: {}
            },
            mapId: 'vilgem',
            characterName: 'Hero'
        });
    });

    it('deve registrar activeSaveId e activeSlot no evento gameRunStarted', () => {
        const service = new AutoSaveService(eventManager, mockSaveRepository, mockLogger, mockStateProvider);

        eventManager.dispatch('gameRunStarted', {
            saveId: 'run-alpha-123',
            slot: 2,
            mapId: 'vilgem'
        });

        expect(service.getActiveSaveId()).toBe('run-alpha-123');
        expect(service.getActiveSlot()).toBe(2);
    });

    it('deve resolver deterministamente o MENOR slot quando múltiplos slots contêm o mesmo saveId', async () => {
        const service = new AutoSaveService(eventManager, mockSaveRepository, mockLogger, mockStateProvider);

        const slotsMap = new Map<number, SaveSlotDataDTO | null>();
        // Slot 1 tem outro saveId
        slotsMap.set(1, { saveId: 'run-other', slot: 1, timestamp: 1000, playerState: {} as any });
        // Slot 2 e Slot 4 possuem o mesmo saveId
        slotsMap.set(2, { saveId: 'run-target', slot: 2, timestamp: 2000, playerState: {} as any });
        slotsMap.set(3, null);
        slotsMap.set(4, { saveId: 'run-target', slot: 4, timestamp: 3000, playerState: {} as any });

        (mockSaveRepository.getAllSlots as any).mockResolvedValue(slotsMap);

        const targetSlot = await service.resolveTargetSlot('run-target');
        expect(targetSlot).toBe(2); // Menor entre 2 e 4
    });

    it('deve retornar activeSlot se nenhum slot contiver o saveId pesquisado', async () => {
        const service = new AutoSaveService(eventManager, mockSaveRepository, mockLogger, mockStateProvider);
        service.setActiveSlot(3);

        const slotsMap = new Map<number, SaveSlotDataDTO | null>();
        slotsMap.set(1, { saveId: 'run-1', slot: 1, timestamp: 1000, playerState: {} as any });
        (mockSaveRepository.getAllSlots as any).mockResolvedValue(slotsMap);

        const targetSlot = await service.resolveTargetSlot('run-nonexistent');
        expect(targetSlot).toBe(3);
    });

    it('deve aplicar debounce em eventos frequentes (ex: itemAddedToBackpack, skillPointSpent)', async () => {
        new AutoSaveService(
            eventManager, 
            mockSaveRepository, 
            mockLogger, 
            mockStateProvider, 
            { debounceMs: 300 }
        );

        eventManager.dispatch('gameRunStarted', { saveId: 'run-debounce', slot: 1, mapId: 'vilgem' });

        // Dispara múltiplos eventos em rápida sucessão
        eventManager.dispatch('itemAddedToBackpack', { item: { id: 1, name: 'Poção' } });
        eventManager.dispatch('itemAddedToBackpack', { item: { id: 2, name: 'Espada' } });
        eventManager.dispatch('skillPointSpent', { skillId: 'slash' });
        eventManager.dispatch('globalNodePurchased', { nodeId: 'strength_1' });

        // Antes do timer de 300ms, saveSlot não deve ter sido invocado
        expect(mockSaveRepository.saveSlot).not.toHaveBeenCalled();

        // Avança 299ms
        vi.advanceTimersByTime(299);
        expect(mockSaveRepository.saveSlot).not.toHaveBeenCalled();

        // Avança para completar o debounce (300ms)
        await vi.advanceTimersByTimeAsync(1);

        expect(mockSaveRepository.saveSlot).toHaveBeenCalledTimes(1);
    });

    it('deve realizar flush imediato (sem debounce) em eventos críticos (playerDied, gameClosing)', async () => {
        new AutoSaveService(
            eventManager, 
            mockSaveRepository, 
            mockLogger, 
            mockStateProvider, 
            { debounceMs: 500 }
        );

        eventManager.dispatch('gameRunStarted', { saveId: 'run-urgent', slot: 1, mapId: 'vilgem' });

        // playerDied deve disparar imediatamente
        eventManager.dispatch('playerDied', {});
        await vi.runAllTimersAsync();

        expect(mockSaveRepository.saveSlot).toHaveBeenCalledTimes(1);

        // gameClosing deve disparar imediatamente
        eventManager.dispatch('gameClosing', {});
        await vi.runAllTimersAsync();

        expect(mockSaveRepository.saveSlot).toHaveBeenCalledTimes(2);
    });

    it('deve disparar autoSaveTriggered e autoSaveCompleted com os metadados corretos', async () => {
        const completedListener = vi.fn();
        const triggeredListener = vi.fn();

        eventManager.on('autoSaveCompleted', completedListener);
        eventManager.on('autoSaveTriggered', triggeredListener);

        new AutoSaveService(
            eventManager, 
            mockSaveRepository, 
            mockLogger, 
            mockStateProvider, 
            { debounceMs: 100 }
        );

        eventManager.dispatch('gameRunStarted', { saveId: 'run-events-check', slot: 2, mapId: 'vilgem' });
        eventManager.dispatch('levelUp', { newLevel: 2, coordinates: { x: 10, y: 10 } });

        await vi.advanceTimersByTimeAsync(100);

        expect(triggeredListener).toHaveBeenCalledWith(expect.objectContaining({
            reason: 'levelUp',
            saveId: 'run-events-check'
        }));

        expect(completedListener).toHaveBeenCalledWith(expect.objectContaining({
            slot: 2,
            saveId: 'run-events-check',
            timestamp: expect.any(Number)
        }));
    });

    it('não deve salvar caso o stateProvider retorne null ou sem playerState', async () => {
        mockStateProvider.mockReturnValue(null);

        new AutoSaveService(
            eventManager, 
            mockSaveRepository, 
            mockLogger, 
            mockStateProvider
        );

        eventManager.dispatch('gameClosing', {});
        await vi.runAllTimersAsync();

        expect(mockSaveRepository.saveSlot).not.toHaveBeenCalled();
    });

    it('deve lidar com erros em resolveTargetSlot e continuar com activeSlot', async () => {
        const service = new AutoSaveService(eventManager, mockSaveRepository, mockLogger, mockStateProvider);
        (mockSaveRepository.getAllSlots as any).mockRejectedValue(new Error('Storage failure'));

        const targetSlot = await service.resolveTargetSlot('any-save');
        expect(targetSlot).toBe(1); // activeSlot padrão
        expect(mockLogger.log).toHaveBeenCalledWith('error', expect.any(String), expect.any(Error));
    });

    it('deve logar erro e liberar flag isSaving caso saveRepository.saveSlot lance exceção', async () => {
        const service = new AutoSaveService(eventManager, mockSaveRepository, mockLogger, mockStateProvider);
        (mockSaveRepository.saveSlot as any).mockRejectedValue(new Error('Disk full'));

        await service.executeSave('testException');

        expect(mockLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Falha ao persistir auto-save'), expect.any(Error));
    });

    it('deve ignorar salvamentos concorrentes quando já houver um salvamento em andamento', async () => {
        const service = new AutoSaveService(eventManager, mockSaveRepository, mockLogger, mockStateProvider);
        
        let delayedResolve: () => void;
        const promise = new Promise<void>((resolve) => {
            delayedResolve = resolve;
        });
        (mockSaveRepository.saveSlot as any).mockReturnValue(promise);

        const firstSave = service.executeSave('firstSave');
        const secondSave = service.executeSave('secondSave');

        await secondSave; // Deve ser ignorado imediatamente
        expect(mockLogger.log).toHaveBeenCalledWith('domain', expect.stringContaining('Salvamento já em andamento'));

        delayedResolve!();
        await firstSave;
    });

    it('deve gerar saveId automático e preencher defaults quando activeSaveId for null', async () => {
        mockStateProvider.mockReturnValue({
            playerState: { attributes: { level: 1 } },
            // sem characterName, cycle, world
        });

        const service = new AutoSaveService(eventManager, mockSaveRepository, mockLogger, mockStateProvider);
        expect(service.getActiveSaveId()).toBeNull();

        await service.executeSave('noActiveSaveId');

        expect(service.getActiveSaveId()).toMatch(/^save_/);
        expect(mockSaveRepository.saveSlot).toHaveBeenCalledWith(1, expect.objectContaining({
            characterName: 'Aventureiro',
            cycle: 1,
            world: 'vilgem'
        }));
    });
});
