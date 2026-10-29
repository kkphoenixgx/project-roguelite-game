import GameAdapter from "./web/components/GameAdapter";
import Web3D from "./lobby3d/Lobby3DAdapter";
import type { IEventManager } from "../domain/eventDispacher/IGameEvents";
import type { IGameDomain } from "../domain/ports/domain-contracts";

import type { ITelemetryAdapter } from "./TelemetryAdapter/ITelemetryAdapter";

/**
 * AdapterManager
 * 
 * Responsável por gerenciar a troca de adaptadores de apresentação (ex: 2D WebGPU -> 3D WebGL).
 * Respeita a Arquitetura Hexagonal, isolando completamente as tecnologias de apresentação.
 */
export default class AdapterManager {
    private currentAdapter: any = null;

    constructor(
        private domain: IGameDomain,
        private eventManager: IEventManager,
        private telemetryAdapter: ITelemetryAdapter
    ) {
        this.setupListeners();
    }

    private setupListeners(): void {

        this.eventManager.on('switchToLobby', async () => {
            console.log('[AdapterManager] Transição para o Lobby 3D iniciada.');
            await this.switchAdapter('lobby3d');
        });

        this.eventManager.on('switchToGameplay', async () => {
            console.log('[AdapterManager] Transição para o Gameplay 2D iniciada.');
            await this.switchAdapter('web2d');
        });
    }

    public async start(): Promise<void> {
        await this.switchAdapter('web2d');
    }

    private async switchAdapter(target: 'web2d' | 'lobby3d'): Promise<void> {

        if (this.currentAdapter) {
            if (typeof this.currentAdapter.destroy === 'function') this.currentAdapter.destroy();

            this.currentAdapter = null;
        }

        if (target === 'web2d') {
            this.currentAdapter = new GameAdapter(this.domain, this.eventManager, this.telemetryAdapter);
            try {
                await this.currentAdapter.initialize();
            } 
            catch (error) {
                console.error("Falha ao inicializar o GameAdapter (2D):", error);
            }
        } 
        else if (target === 'lobby3d') {
            this.currentAdapter = new Web3D(this.eventManager);
            try {
                await this.currentAdapter.initialize();
            } catch (error) {
                console.error("Falha ao inicializar o Lobby3DAdapter:", error);
            }
        }
    }
}
