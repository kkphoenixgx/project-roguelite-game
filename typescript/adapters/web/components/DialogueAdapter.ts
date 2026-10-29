import DialogueGui from "../GUIS/dialogueHudModule/DialogueGui";
import FloatingChatGui from "../GUIS/floatingChatHudModule/FloatingChatGui";
import type { IEventManager } from "../../../domain/eventDispacher/IGameEvents";

export default class DialogueAdapter {
    public dialogueGui: DialogueGui;
    public floatingChatGui: FloatingChatGui;

    constructor(
        private eventManager: IEventManager,
        onPlayerReply: (message: string, npcId?: number) => void,
        onTogglePause: () => void,
        private isGameStartedFn: () => boolean
    ) {
        this.dialogueGui = new DialogueGui(onPlayerReply, onTogglePause);
        this.floatingChatGui = new FloatingChatGui();

        this.eventManager.on('npcSpoke', (payload: any) => this.handleNpcSpoke(payload));
        this.eventManager.on('npcDialog', (payload: any) => this.handleNpcDialog(payload));
        this.eventManager.on('panteaoError', (payload: any) => this.handlePanteaoError(payload));
    }

    private handleNpcSpoke(payload: any): void {
        if (!this.isGameStartedFn()) return;
        
        if (typeof payload.npcId === 'number') {
            this.floatingChatGui.showBubble(payload.npcId, payload.message);
        }
    }

    private handleNpcDialog(payload: any): void {
        if (!this.isGameStartedFn()) return;
        
        const npcName = payload.npcName || "Desconhecido";
        
        if (this.dialogueGui.isOpen) {
            this.dialogueGui.show(npcName, payload.message, payload.npcId, payload.entityTypeId);
        }
    }

    private handlePanteaoError(payload: any): void {
        if (!this.isGameStartedFn()) return;
        if (this.dialogueGui.isOpen) {
            this.dialogueGui.showSystemMessage(payload.message);
        }
    }

    public update(renderables: readonly any[], worldToScreen: (wx: number, wy: number) => { x: number, y: number }): void {
        this.floatingChatGui.update(renderables, worldToScreen);
    }

    public showPortalPrompt(payload: { portalId: number; targetMapId: string; text: string; actionKey: string; coordinates: { x: number; y: number } }): void {
        this.floatingChatGui.showPortalPrompt(
            payload.portalId,
            payload.text,
            payload.actionKey,
            payload.coordinates,
            () => {
                this.eventManager.dispatch('portalInteract', { portalId: payload.portalId });
            }
        );
    }

    public hidePortalPrompt(portalId: number): void {
        this.floatingChatGui.hidePortalPrompt(portalId);
    }

    public hasActivePortalPrompt(): boolean {
        return this.floatingChatGui.hasActivePortalPrompt();
    }

    public isAnyMenuOpen(): boolean {
        return this.dialogueGui.isOpen;
    }

    /** Limpa balões flutuantes e fecha caixas de diálogo ativas. */
    public clear(): void {
        this.floatingChatGui.clear();
        if (this.dialogueGui.isOpen) {
            this.dialogueGui.hide();
        }
    }
}
