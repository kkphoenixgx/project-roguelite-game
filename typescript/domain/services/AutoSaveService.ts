import type { IEventManager } from "../eventDispacher/IGameEvents";
import type { ILogger } from "../ports/ILogger";
import type { ISaveRepository, SaveSlotDataDTO, PlayerSaveState } from "../ports/ISaveRepository";

export interface GameStateSnapshot {
    playerState: PlayerSaveState;
    mapId?: string;
    characterName?: string;
    cycle?: number;
    world?: string;
    globalMetaSummary?: any;
    [key: string]: any;
}

export type GameStateProvider = () => GameStateSnapshot | null;

export interface AutoSaveServiceConfig {
    debounceMs?: number;
}

/**
 * Domain Service responsável pela orquestração de salvamento automático do jogo.
 * Opera de forma 100% orientada a eventos (Event-Driven Architecture) e desacoplada
 * da infraestrutura de persistência concreta via porta ISaveRepository.
 */
export class AutoSaveService {
    private activeSaveId: string | null = null;
    private activeSlot: number = 1;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly debounceMs: number;
    private isSaving: boolean = false;
    private pendingSaveReason: string | null = null;

    constructor(
        private eventManager: IEventManager,
        private saveRepository: ISaveRepository,
        private logger: ILogger,
        private stateProvider: GameStateProvider,
        config: AutoSaveServiceConfig = {}
    ) {
        this.debounceMs = config.debounceMs ?? 400;
        this.registerEventSubscriptions();
    }

    public getActiveSaveId(): string | null {
        return this.activeSaveId;
    }

    public setActiveSaveId(saveId: string | null): void {
        this.activeSaveId = saveId;
    }

    public getActiveSlot(): number {
        return this.activeSlot;
    }

    public setActiveSlot(slot: number): void {
        this.activeSlot = slot;
    }

    private registerEventSubscriptions(): void {
        // Início da jornada
        this.eventManager.on('gameRunStarted', (payload) => {
            if (payload.saveId) {
                this.activeSaveId = payload.saveId;
            }
            if (payload.slot) {
                this.activeSlot = payload.slot;
            }
            this.logger.log('domain', `[AutoSaveService] Jornada iniciada: Slot ${this.activeSlot}, SaveID ${this.activeSaveId}`);
        });

        // Eventos frequentes (com debounce)
        this.eventManager.on('itemAddedToBackpack', () => {
            this.scheduleAutoSave('itemAddedToBackpack', false);
        });

        this.eventManager.on('skillPointSpent', () => {
            this.scheduleAutoSave('skillPointSpent', false);
        });

        this.eventManager.on('globalNodePurchased', () => {
            this.scheduleAutoSave('globalNodePurchased', false);
        });

        this.eventManager.on('attributeAllocated', () => {
            this.scheduleAutoSave('attributeAllocated', false);
        });

        this.eventManager.on('broochEquipped', () => {
            this.scheduleAutoSave('broochEquipped', false);
        });

        this.eventManager.on('skillTreeUpdated', () => {
            this.scheduleAutoSave('skillTreeUpdated', false);
        });

        this.eventManager.on('inventoryUpdated', () => {
            this.scheduleAutoSave('inventoryUpdated', false);
        });

        this.eventManager.on('levelUp', () => {
            this.scheduleAutoSave('levelUp', false);
        });

        this.eventManager.on('worldItemCollected', () => {
            this.scheduleAutoSave('worldItemCollected', false);
        });

        // Eventos críticos (flush imediato / urgente)
        this.eventManager.on('playerDied', () => {
            this.scheduleAutoSave('playerDied', true);
        });

        this.eventManager.on('gameClosing', () => {
            this.scheduleAutoSave('gameClosing', true);
        });
    }

    /**
     * Resolução Determinística do Slot Alvo:
     * Consulta todos os slots via ISaveRepository. Se um ou mais slots possuírem o mesmo saveId,
     * seleciona SEMPRE o slot de menor índice (regra do menor slot).
     * Se nenhum possuir o saveId, utiliza o activeSlot atual.
     */
    public async resolveTargetSlot(saveId: string): Promise<number> {
        if (!this.saveRepository.getAllSlots) {
            return this.activeSlot;
        }

        try {
            const allSlots = await this.saveRepository.getAllSlots();
            const matchingSlots: number[] = [];

            for (const [slot, data] of allSlots.entries()) {
                if (data && data.saveId === saveId) {
                    matchingSlots.push(slot);
                }
            }

            if (matchingSlots.length > 0) {
                return Math.min(...matchingSlots);
            }
        } catch (error) {
            this.logger.log('error', '[AutoSaveService] Erro ao consultar slots para resolveTargetSlot:', error);
        }

        return this.activeSlot;
    }

    /**
     * Agenda ou dispara o salvamento automático.
     * @param reason Motivo semântico do auto-save.
     * @param immediate Se verdadeiro, limpa o debounce e executa na hora.
     */
    public scheduleAutoSave(reason: string, immediate: boolean = false): Promise<void> {
        this.pendingSaveReason = reason;

        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        if (immediate) {
            return this.executeSave(reason);
        }

        return new Promise<void>((resolve) => {
            this.debounceTimer = setTimeout(async () => {
                this.debounceTimer = null;
                const activeReason = this.pendingSaveReason || reason;
                this.pendingSaveReason = null;
                await this.executeSave(activeReason);
                resolve();
            }, this.debounceMs);
        });
    }

    /**
     * Executa a coleta de snapshot, resolução de slot e delegação para a porta ISaveRepository.
     */
    public async executeSave(reason: string): Promise<void> {
        if (this.isSaving) {
            this.logger.log('domain', `[AutoSaveService] Salvamento já em andamento, ignorando chamada concorrente (${reason}).`);
            return;
        }

        const snapshot = this.stateProvider();
        if (!snapshot || !snapshot.playerState) {
            this.logger.log('domain', `[AutoSaveService] Snapshot indisponível para salvamento (${reason}).`);
            return;
        }

        this.isSaving = true;
        const currentSaveId = this.activeSaveId || `save_${Date.now()}`;
        if (!this.activeSaveId) {
            this.activeSaveId = currentSaveId;
        }

        this.eventManager.dispatch('autoSaveTriggered', {
            reason,
            saveId: currentSaveId
        });

        try {
            const targetSlot = await this.resolveTargetSlot(currentSaveId);
            this.activeSlot = targetSlot;
            const now = Date.now();

            const saveSlotData: SaveSlotDataDTO = {
                saveId: currentSaveId,
                slot: targetSlot,
                timestamp: now,
                playerState: snapshot.playerState,
                metaProgressionState: snapshot.metaProgressionState,
                mapId: snapshot.mapId,
                characterName: snapshot.characterName || 'Aventureiro',
                cycle: snapshot.cycle ?? 1,
                world: snapshot.world || snapshot.mapId || 'vilgem',
                savedAt: new Date(now).toISOString(),
                globalMetaSummary: snapshot.globalMetaSummary
            };

            if (this.saveRepository.saveSlot) {
                await this.saveRepository.saveSlot(targetSlot, saveSlotData);
            }

            this.logger.log('domain', `[AutoSaveService] Auto-save concluído com sucesso no Slot ${targetSlot} (${reason}).`);

            this.eventManager.dispatch('autoSaveCompleted', {
                slot: targetSlot,
                saveId: currentSaveId,
                timestamp: now
            });
        } catch (error) {
            this.logger.log('error', `[AutoSaveService] Falha ao persistir auto-save (${reason}):`, error);
        } finally {
            this.isSaving = false;
        }
    }
}
