import { logger } from "../../shared/Logger";
import css from './floatingChat.css?raw';

interface ActiveBubble {
    id: number;
    element: HTMLElement;
    timeoutId?: ReturnType<typeof setTimeout> | undefined;
    hideTimeoutId?: ReturnType<typeof setTimeout> | undefined;
    worldCoordinates?: { x: number; y: number } | undefined;
    lastX?: number;
    lastY?: number;
    lastDisplay?: string;
}

export default class FloatingChatGui {
    private container!: HTMLElement;
    private activeBubbles: Map<number, ActiveBubble> = new Map();

    constructor() {
        this.injectUI();
        logger.log('init', 'FloatingChatGui instantiated.');
    }

    private injectUI(): void {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        this.container = document.createElement('div');
        this.container.className = 'floating-chat-container';
        document.body.appendChild(this.container);
    }

    public showBubble(entityId: number, text: string): void {
        let bubble = this.activeBubbles.get(entityId);

        if (!bubble) {
            const el = document.createElement('div');
            el.className = 'floating-bubble';
            this.container.appendChild(el);
            
            bubble = {
                id: entityId,
                element: el
            };
            this.activeBubbles.set(entityId, bubble);
        }

        if (bubble.hideTimeoutId !== undefined) {
            clearTimeout(bubble.hideTimeoutId);
            bubble.hideTimeoutId = undefined;
        }

        bubble.worldCoordinates = undefined;
        bubble.element.className = 'floating-bubble active';
        bubble.element.textContent = text;
        bubble.element.onclick = null;

        if (bubble.timeoutId !== undefined) {
            clearTimeout(bubble.timeoutId);
        }
        
        //? Duração proporcional à quantidade de caracteres (entre 2000ms e 8000ms)
        const duration = Math.min(Math.max(2000, text.length * 50), 8000);
        
        bubble.timeoutId = setTimeout(() => {
            this.hideBubble(entityId);
        }, duration);
    }

    public showPortalPrompt(
        portalId: number,
        text: string,
        actionKey: string,
        coordinates: { x: number; y: number },
        onInteract?: () => void
    ): void {
        let bubble = this.activeBubbles.get(portalId);

        if (!bubble) {
            const el = document.createElement('div');
            el.className = 'floating-bubble portal-prompt';
            this.container.appendChild(el);

            bubble = {
                id: portalId,
                element: el
            };
            this.activeBubbles.set(portalId, bubble);
        } else {
            bubble.element.className = 'floating-bubble portal-prompt';
        }

        if (bubble.hideTimeoutId !== undefined) {
            clearTimeout(bubble.hideTimeoutId);
            bubble.hideTimeoutId = undefined;
        }

        if (bubble.timeoutId !== undefined) {
            clearTimeout(bubble.timeoutId);
            bubble.timeoutId = undefined;
        }

        bubble.worldCoordinates = { x: coordinates.x, y: coordinates.y };
        bubble.element.textContent = `[${actionKey}] ${text}`;
        bubble.element.classList.add('active');
        bubble.element.style.display = 'block';
        bubble.lastDisplay = 'block';

        if (onInteract) {
            bubble.element.onclick = (e) => {
                e.stopPropagation();
                onInteract();
            };
        } else {
            bubble.element.onclick = null;
        }
    }

    public hidePortalPrompt(portalId: number): void {
        this.hideBubble(portalId);
    }

    public hasActivePortalPrompt(): boolean {
        for (const bubble of this.activeBubbles.values()) {
            if (bubble.element.classList.contains('portal-prompt') && bubble.element.classList.contains('active')) {
                return true;
            }
        }
        return false;
    }

    public hideBubble(entityId: number): void {
        const bubble = this.activeBubbles.get(entityId);
        if (bubble) {
            if (bubble.timeoutId !== undefined) {
                clearTimeout(bubble.timeoutId);
                bubble.timeoutId = undefined;
            }
            if (bubble.hideTimeoutId !== undefined) {
                clearTimeout(bubble.hideTimeoutId);
                bubble.hideTimeoutId = undefined;
            }
            bubble.element.classList.remove('active');
            bubble.hideTimeoutId = setTimeout(() => {
                bubble.hideTimeoutId = undefined;
                if (this.activeBubbles.has(entityId) && !bubble.element.classList.contains('active')) {
                    bubble.element.remove();
                    this.activeBubbles.delete(entityId);
                }
            }, 300);
        }
    }

    public update(renderables: readonly any[], worldToScreen: (wx: number, wy: number) => { x: number, y: number }): void {
        if (this.activeBubbles.size === 0) return;

        //? Projeta balões flutuantes na posição em tela da entidade vinculada ou coordenada fixa
        this.activeBubbles.forEach((bubble, entityId) => {
            if (bubble.worldCoordinates) {
                const screenPos = worldToScreen(
                    bubble.worldCoordinates.x,
                    bubble.worldCoordinates.y
                );
                if (bubble.lastX !== screenPos.x) {
                    bubble.lastX = screenPos.x;
                    bubble.element.style.left = `${screenPos.x}px`;
                }
                if (bubble.lastY !== screenPos.y) {
                    bubble.lastY = screenPos.y;
                    bubble.element.style.top = `${screenPos.y}px`;
                }
                if (bubble.lastDisplay !== 'block') {
                    bubble.lastDisplay = 'block';
                    bubble.element.style.display = 'block';
                }
            } else {
                let renderable: any = undefined;
                for (let i = 0; i < renderables.length; i++) {
                    if (renderables[i]?.id === entityId) {
                        renderable = renderables[i];
                        break;
                    }
                }
                
                if (renderable) {
                    //? Ancoragem no topo central da hitbox da entidade
                    const screenPos = worldToScreen(
                        renderable.coordinates.x + renderable.size.width / 2,
                        renderable.coordinates.y
                    );
                    
                    if (bubble.lastX !== screenPos.x) {
                        bubble.lastX = screenPos.x;
                        bubble.element.style.left = `${screenPos.x}px`;
                    }
                    if (bubble.lastY !== screenPos.y) {
                        bubble.lastY = screenPos.y;
                        bubble.element.style.top = `${screenPos.y}px`;
                    }
                    if (bubble.lastDisplay !== 'block') {
                        bubble.lastDisplay = 'block';
                        bubble.element.style.display = 'block';
                    }
                } else {
                    //? Oculta balão se a entidade não estiver visível na viewport ou descarregada
                    if (bubble.lastDisplay !== 'none') {
                        bubble.lastDisplay = 'none';
                        bubble.element.style.display = 'none';
                    }
                }
            }
        });
    }

    /** Remove e limpa todos os balões flutuantes ativos da tela. */
    public clear(): void {
        this.activeBubbles.forEach((bubble) => {
            if (bubble.timeoutId !== undefined) {
                clearTimeout(bubble.timeoutId);
                bubble.timeoutId = undefined;
            }
            if (bubble.hideTimeoutId !== undefined) {
                clearTimeout(bubble.hideTimeoutId);
                bubble.hideTimeoutId = undefined;
            }
            bubble.element.remove();
        });
        this.activeBubbles.clear();
    }
}
