import { logger } from "../../shared/Logger";
import { RenderRegistry } from "../../shared/RenderRegistry";
import html from './dialogue.html?raw';
import css from './dialogue.css?raw';

export default class DialogueGui {
    private container!: HTMLElement;
    private nameEl!: HTMLElement;
    private textEl!: HTMLElement;
    private inputEl!: HTMLInputElement;
    private portraitEl!: HTMLElement;
    private portraitCanvas!: HTMLCanvasElement;
    private portraitCtx!: CanvasRenderingContext2D;
    private isVisible: boolean = false;
    private isTyping: boolean = false;
    private fullTextToType: string = '';
    private typingInterval: number | null = null;
    private currentNpcId: number | undefined;

    private portraitImage: HTMLImageElement | null = null;
    private portraitConfig: { frameCount: number; frameWidth: number; frameHeight: number; animationSpeed: number } | null = null;
    private portraitFrame: number = 0;
    private portraitFrameCounter: number = 0;
    private portraitAnimId: number | null = null;
    private isTalking: boolean = false;

    constructor(
        private onPlayerReply: (message: string, npcId?: number) => void,
        private onTogglePause: () => void
    ) {
        this.injectUI();
        this.setupInput();
        logger.log('init', 'DialogueGui instantiated.');
    }

    private injectUI(): void {
        const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
        const div = document.createElement('div'); div.innerHTML = html;
        this.container = div.firstElementChild as HTMLElement;
        document.body.appendChild(this.container);
        
        this.nameEl = this.container.querySelector('#dialogue-name') as HTMLElement;
        this.textEl = this.container.querySelector('#dialogue-text') as HTMLElement;
        this.inputEl = this.container.querySelector('#dialogue-input') as HTMLInputElement;
        this.portraitEl = this.container.querySelector('#dialogue-portrait') as HTMLElement;
        this.portraitCanvas = this.container.querySelector('#portrait-canvas') as HTMLCanvasElement;
        this.portraitCtx = this.portraitCanvas.getContext('2d')!;

        //? Permite clicar no texto para pular imediatamente a animação de máquina de escrever
        this.textEl.addEventListener('click', () => {
            if (this.isTyping) {
                this.finishTypingImmediately();
            }
        });
    }

    public get isOpen(): boolean { return this.isVisible; }

    private setupInput(): void {
        this.inputEl.addEventListener('keydown', (e) => {
            e.stopPropagation(); 
            
            if (e.key === 'Enter') {
                if (this.isTyping) {
                    this.finishTypingImmediately();
                    return;
                }

                const msg = this.inputEl.value.trim();
                if (msg) {
                    this.onPlayerReply(msg, this.currentNpcId);
                    this.inputEl.value = '';
                    this.inputEl.disabled = true;
                    this.showWaitingState();
                }
            }
        });

        window.addEventListener('keydown', (e) => {
            if (this.isVisible && e.key === 'Escape') {
                this.hide();
            }
        });

        const closeBtn = this.container.querySelector('#dialogue-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
    }

    /* --- Portrait Sprite System --- */

    private loadPortrait(entityTypeId?: string): void {
        if (!entityTypeId) {
            console.warn('[DialogueGui Portrait] entityTypeId is undefined/null, no portrait.');
            this.portraitImage = null;
            this.portraitConfig = null;
            this.clearPortrait();
            return;
        }

        //? Busca sprite 'idle' como prioridade e recorre a 'walking' como fallback visual
        const idleConfig = RenderRegistry.spriteConfigs.get(`${entityTypeId}-idle`);
        const walkConfig = RenderRegistry.spriteConfigs.get(`${entityTypeId}-walking`);
        
        console.log(`[DialogueGui Portrait] entityTypeId="${entityTypeId}", idleConfig=${!!idleConfig}, walkConfig=${!!walkConfig}, registeredKeys:`, Array.from(RenderRegistry.spriteConfigs.keys()).filter(k => k.startsWith(entityTypeId)));
        
        if (!idleConfig) {
            console.warn(`[DialogueGui Portrait] No idle config found for "${entityTypeId}-idle"`);
            this.portraitImage = null;
            this.portraitConfig = null;
            this.clearPortrait();
            return;
        }

        this.portraitConfig = {
            frameCount: idleConfig.frameCount,
            frameWidth: idleConfig.frameWidth,
            frameHeight: idleConfig.frameHeight,
            animationSpeed: idleConfig.animationSpeed,
        };

        const img = new Image();
        img.src = idleConfig.imageSrc;
        console.log(`[DialogueGui Portrait] Loading idle sprite: "${idleConfig.imageSrc}"`);
        img.onload = () => {
            console.log(`[DialogueGui Portrait] ✅ Idle sprite loaded successfully.`);
            this.portraitImage = img;
            this.portraitFrame = 0;
            this.portraitFrameCounter = 0;
            this.drawPortraitFrame();
            this.startPortraitLoop();
        };
        img.onerror = (e) => {
            console.error(`[DialogueGui Portrait] ❌ Failed to load idle sprite: "${idleConfig.imageSrc}"`, e);
        };

        //? Pré-armazena em cache a sprite de fala/walking para alternância durante o diálogo
        if (walkConfig) {
            const walkImg = new Image();
            walkImg.src = walkConfig.imageSrc;
            walkImg.onload = () => {
                (this as any)._walkImage = walkImg;
                (this as any)._walkConfig = {
                    frameCount: walkConfig.frameCount,
                    frameWidth: walkConfig.frameWidth,
                    frameHeight: walkConfig.frameHeight,
                    animationSpeed: walkConfig.animationSpeed,
                };
            };
        }
    }

    private clearPortrait(): void {
        this.portraitCtx.clearRect(0, 0, 64, 64);
    }

    private drawPortraitFrame(): void {
        if (!this.portraitImage || !this.portraitConfig) return;
        
        const ctx = this.portraitCtx;
        const config = this.portraitConfig;
        const img = this.portraitImage;
        
        ctx.clearRect(0, 0, 64, 64);
        ctx.imageSmoothingEnabled = false;
        
        const columns = Math.max(1, Math.floor(img.width / config.frameWidth));
        const col = this.portraitFrame % columns;
        const row = Math.floor(this.portraitFrame / columns);
        
        //? Renderiza o sprite centralizado e escalonado no quadro 64x64 do retrato
        const scale = Math.min(64 / config.frameWidth, 64 / config.frameHeight);
        const dw = config.frameWidth * scale;
        const dh = config.frameHeight * scale;
        const dx = (64 - dw) / 2;
        const dy = (64 - dh) / 2;
        
        ctx.drawImage(
            img,
            col * config.frameWidth, row * config.frameHeight,
            config.frameWidth, config.frameHeight,
            dx, dy, dw, dh
        );
    }

    private startPortraitLoop(): void {
        if (this.portraitAnimId !== null) return;

        const animate = () => {
            if (!this.isVisible) {
                this.portraitAnimId = null;
                return;
            }

            //? Alterna dinamicamente entre animação de fala ('walking') e repouso ('idle')
            let activeImage = this.portraitImage;
            let activeConfig = this.portraitConfig;

            if (this.isTalking && (this as any)._walkImage && (this as any)._walkConfig) {
                activeImage = (this as any)._walkImage;
                activeConfig = (this as any)._walkConfig;
            }

            if (activeImage && activeConfig) {
                this.portraitFrameCounter++;
                if (this.portraitFrameCounter >= activeConfig.animationSpeed) {
                    this.portraitFrameCounter = 0;
                    this.portraitFrame = (this.portraitFrame + 1) % activeConfig.frameCount;
                }
                
                const ctx = this.portraitCtx;
                const img = activeImage;
                const config = activeConfig;
                
                ctx.clearRect(0, 0, 64, 64);
                ctx.imageSmoothingEnabled = false;
                
                const columns = Math.max(1, Math.floor(img.width / config.frameWidth));
                const col = this.portraitFrame % columns;
                const row = Math.floor(this.portraitFrame / columns);
                
                const scale = Math.min(64 / config.frameWidth, 64 / config.frameHeight);
                const dw = config.frameWidth * scale;
                const dh = config.frameHeight * scale;
                const dx = (64 - dw) / 2;
                const dy = (64 - dh) / 2;
                
                ctx.drawImage(
                    img,
                    col * config.frameWidth, row * config.frameHeight,
                    config.frameWidth, config.frameHeight,
                    dx, dy, dw, dh
                );
            }

            this.portraitAnimId = requestAnimationFrame(animate);
        };

        this.portraitAnimId = requestAnimationFrame(animate);
    }

    private stopPortraitLoop(): void {
        if (this.portraitAnimId !== null) {
            cancelAnimationFrame(this.portraitAnimId);
            this.portraitAnimId = null;
        }
    }

    private setTalking(talking: boolean): void {
        this.isTalking = talking;
        if (talking) {
            this.portraitEl.classList.add('talking');
            this.portraitFrame = 0;
            this.portraitFrameCounter = 0;
        } else {
            this.portraitEl.classList.remove('talking');
            this.portraitFrame = 0;
            this.portraitFrameCounter = 0;
        }
    }

    /* --- End Portrait --- */

    private showWaitingState(customMessage?: string): void {
        this.inputEl.disabled = true;
        this.setTalking(false);
        const msg = customMessage || `Aguardando pensamentos de ${this.nameEl.textContent || 'NPC'}...`;
        this.textEl.innerHTML = `<div class="waiting-indicator"><div class="waiting-spinner"></div><span>${msg}</span></div>`;
    }

    private finishTypingImmediately(): void {
        if (this.typingInterval !== null) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }
        this.isTyping = false;
        this.setTalking(false);
        this.textEl.textContent = this.fullTextToType;
        this.inputEl.disabled = false;
        this.inputEl.focus();
    }

    private startTypewriter(text: string): void {
        if (this.typingInterval !== null) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }

        this.fullTextToType = text;
        this.isTyping = true;
        this.setTalking(true);
        this.inputEl.disabled = false;
        this.textEl.textContent = '';
        
        let charIndex = 0;
        //? Cadência da máquina de escrever em ms por caractere
        const speed = 18;
        
        this.typingInterval = window.setInterval(() => {
            if (charIndex < text.length) {
                this.textEl.textContent += text.charAt(charIndex);
                charIndex++;
            } else {
                if (this.typingInterval !== null) {
                    clearInterval(this.typingInterval);
                    this.typingInterval = null;
                }
                this.isTyping = false;
                this.setTalking(false);
                this.inputEl.focus();
            }
        }, speed);
    }

    public show(npcName: string, text: string, npcId?: number, entityTypeId?: string): void {
        this.currentNpcId = npcId;
        this.nameEl.textContent = npcName;
        
        if (!this.isVisible) {
            this.isVisible = true;
            this.container.style.display = 'flex';
            this.onTogglePause();
            this.loadPortrait(entityTypeId);
        }
        
        if (text === "..." || text.startsWith("*(Conectando") || text.startsWith("*(Organizando") || text.startsWith("*(Sincronizando") || text.startsWith("*(Consultando") || text.startsWith("*(Despertando") || text.startsWith("*(Sintonizando")) {
            this.showWaitingState(text !== "..." ? text.replace(/^\*\(/, '').replace(/\)\*$/, '') : undefined);
        } else if (text.startsWith("*(") && text.endsWith(")*")) {
            //? Intervalo curto para pensamentos internos sem fala vocalizada
            this.inputEl.disabled = false;
            this.setTalking(false);
            this.textEl.innerHTML = `<span class="internal-thought">${text}</span>`;
            this.inputEl.focus();
        } else {
            this.startTypewriter(text);
        }
    }

    public showSystemMessage(message: string): void {
        if (!this.isVisible) return;
        this.finishTypingImmediately();
        this.setTalking(false);
        this.inputEl.disabled = false;
        this.textEl.innerHTML = `<span style="color: #ff4444; font-weight: bold;">[Erro no Sistema Cognitivo]</span><br><span style="color: #ff9999;">${message}</span>`;
    }

    public hide(): void {
        if (this.typingInterval !== null) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }
        this.isTyping = false;
        this.setTalking(false);
        this.stopPortraitLoop();
        if (this.isVisible) {
            this.isVisible = false;
            this.container.style.display = 'none';
            this.onTogglePause();
        }
    }
}