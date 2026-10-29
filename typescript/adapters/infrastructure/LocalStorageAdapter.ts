import type { ISaveRepository, GlobalProgressData } from "../../domain/ports/ISaveRepository";

/**
 * Implementação concreta da Porta ISaveRepository usando o LocalStorage do navegador.
 */
export class LocalStorageAdapter implements ISaveRepository {
    private readonly SAVE_KEY = 'geppetto_dream_save';

    public async saveProgress(data: GlobalProgressData): Promise<void> {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(this.SAVE_KEY, serialized);
        } catch (error) {
            console.error("Failed to save progress to LocalStorage", error);
        }
    }

    public async loadProgress(): Promise<GlobalProgressData | null> {
        try {
            const serialized = localStorage.getItem(this.SAVE_KEY);
            if (!serialized) return null;
            return JSON.parse(serialized) as GlobalProgressData;
        } catch (error) {
            console.error("Failed to load progress from LocalStorage", error);
            return null;
        }
    }
}
