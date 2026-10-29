// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageAdapter } from '../../../adapters/infrastructure/LocalStorageAdapter';
import type { GlobalProgressData } from '../../../domain/ports/ISaveRepository';

describe('LocalStorageAdapter', () => {
    let adapter: LocalStorageAdapter;

    beforeEach(() => {
        localStorage.clear();
        adapter = new LocalStorageAdapter();
    });

    it('deve salvar e carregar o progresso global com sucesso', async () => {
        const dummyProgress: GlobalProgressData = {
            globalLevel: 3,
            globalXp: 1500,
            achievements: ['feat_first_blood', 'feat_boss_slain'],
            unlockedBrooches: ['brooch_fire', 'brooch_light']
        };

        await adapter.saveProgress(dummyProgress);
        const loaded = await adapter.loadProgress();

        expect(loaded).toEqual(dummyProgress);
        expect(localStorage.getItem('geppetto_dream_save')).toBe(JSON.stringify(dummyProgress));
    });

    it('deve retornar null se não houver dados salvos no LocalStorage', async () => {
        const loaded = await adapter.loadProgress();
        expect(loaded).toBeNull();
    });

    it('deve retornar null e logar erro se os dados salvos estiverem corrompidos (JSON inválido)', async () => {
        localStorage.setItem('geppetto_dream_save', 'INVALID_JSON_%%%');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const loaded = await adapter.loadProgress();

        expect(loaded).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
            'Failed to load progress from LocalStorage',
            expect.any(Error)
        );
        consoleSpy.mockRestore();
    });

    it('deve capturar e logar erro se localStorage.setItem lançar exceção (ex: QuotaExceededError)', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
            throw new Error('QuotaExceededError');
        });

        const dummyProgress: GlobalProgressData = {
            globalLevel: 1,
            globalXp: 10,
            achievements: [],
            unlockedBrooches: []
        };


        await expect(adapter.saveProgress(dummyProgress)).resolves.not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(
            'Failed to save progress to LocalStorage',
            expect.any(Error)
        );

        consoleSpy.mockRestore();
        vi.restoreAllMocks();
    });
});
