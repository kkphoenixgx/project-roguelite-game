import { safeInvoke } from "../shared/TauriIPC";
import type { ISaveRepository, GlobalProgressData, SaveSlotDataDTO } from "../../../domain/ports/ISaveRepository";

export class TauriJsonSaveRepository implements ISaveRepository {
  private inMemorySlots: Map<number, string> = new Map();

  public async saveProgress(data: GlobalProgressData): Promise<void> {
    const payload = JSON.stringify(data);
    try {
      await safeInvoke('save_game_slot', { slot: 0, payload });
    } catch {
      this.inMemorySlots.set(0, payload);
    }
  }

  public async loadProgress(): Promise<GlobalProgressData | null> {
    try {
      const raw = await safeInvoke<string>('load_game_slot', { slot: 0 });
      if (raw) return JSON.parse(raw);
    } catch {
      const mem = this.inMemorySlots.get(0);
      if (mem) return JSON.parse(mem);
    }
    return null;
  }

  public async saveSlot(slot: number, data: SaveSlotDataDTO): Promise<void> {
    const payload = JSON.stringify(data);
    try {
      await safeInvoke('save_game_slot', { slot, payload });
    } catch {
      this.inMemorySlots.set(slot, payload);
    }
  }

  public async loadSlot(slot: number): Promise<SaveSlotDataDTO | null> {
    try {
      const raw = await safeInvoke<string>('load_game_slot', { slot });
      if (raw) return JSON.parse(raw);
    } catch {
      const mem = this.inMemorySlots.get(slot);
      if (mem) return JSON.parse(mem);
    }
    return null;
  }

  public async deleteSlot(slot: number): Promise<void> {
    try {
      await safeInvoke('delete_game_slot', { slot });
    } catch {
      // Ignora erro se não estiver no ambiente Tauri
    }
    this.inMemorySlots.delete(slot);
  }

  public async getAllSlots(): Promise<Map<number, SaveSlotDataDTO | null>> {
    const result = new Map<number, SaveSlotDataDTO | null>();
    for (let slot = 1; slot <= 5; slot++) {
      const data = await this.loadSlot(slot);
      result.set(slot, data);
    }
    return result;
  }
}
