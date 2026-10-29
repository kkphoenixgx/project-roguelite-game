import type { IEventManager } from "../../../domain/eventDispacher/IGameEvents";
import UIManager from "./UiManager/UIManager";
import SceneManager from "./renderModule/scene/SceneManager";
import { logger } from "../shared/Logger";
import type { IGameDomain } from "../../../domain/ports/domain-contracts";

export class GameEventBinder {
    private registeredListeners: { event: keyof import("../../../domain/eventDispacher/IGameEvents").GameEventMap, listener: any }[] = [];

    constructor(
        private eventManager: IEventManager,
        private uiManager: UIManager,
        private sceneManager: SceneManager,
        private getIsGameStarted: () => boolean,
        private onPlayerDiedCallback: () => void,
        private onMapTransitionCallback?: (targetMapId: string, targetCoordinates?: { x: number; y: number }) => Promise<void> | void
    ) {}

    private bind<K extends keyof import("../../../domain/eventDispacher/IGameEvents").GameEventMap>(event: K, listener: any): void {
        this.eventManager.on(event, listener);
        this.registeredListeners.push({ event, listener });
    }

    public bindEvents(): void {
        
        this.bind('playerDied', () => {
            this.onPlayerDiedCallback();
        });

        this.bind('mapTransitionRequested', async (payload: { targetMapId: string; targetCoordinates?: { x: number; y: number } }) => {
            if (this.onMapTransitionCallback) {
                (payload as any).handledByAdapter = true;
                await this.onMapTransitionCallback(payload.targetMapId, payload.targetCoordinates);
            }
        });

        this.bind('portalPromptShow', (payload: { portalId: number; targetMapId: string; text: string; actionKey: string; coordinates: { x: number; y: number } }) => {
            this.uiManager.showPortalPrompt(payload);
        });

        this.bind('portalPromptHide', (payload: { portalId: number }) => {
            this.uiManager.hidePortalPrompt(payload.portalId);
        });

        this.bind('spawnVisual', (payload: any) => {
            this.sceneManager.addVisualEffect(payload);
        });

        let lastLevelUpCoords: any = null;
        this.bind('levelUp', (payload: any) => {
            lastLevelUpCoords = payload.coordinates;
        });

        this.bind('showLevelUpRewards', (payload: any) => {
            this.uiManager.showLevelUpReward(lastLevelUpCoords, payload.choices);
        });

        this.bind('particle', (payload: any) => {
            this.sceneManager.particleOrchestrator.executeEffect(payload);
        });

        this.bind('log', (payload: any) => {
            if (payload?.channel === 'input' && typeof payload.message === 'string') {
                if (payload.message.includes('overflow') || payload.message.includes('broken')) {
                    this.uiManager.spellBufferHudGui.triggerShatter();
                }
            }
            if (payload?.channel === 'error' && typeof payload.message === 'string') {
                this.uiManager.showToast(payload.message, 'error');
            }
        });
    }

    public unbindAll(): void {
        for (const { event, listener } of this.registeredListeners) {
            if (this.eventManager.off) this.eventManager.off(event, listener);
        }
        this.registeredListeners = [];
    }
}
