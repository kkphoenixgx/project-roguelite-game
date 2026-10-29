export interface IMCPVisualEffect {
    type: string;
    ttl: number; // Time to live in ms
    elapsed: number;
    render: (ctx: CanvasRenderingContext2D, deltaTime: number, canvas: HTMLCanvasElement) => boolean;
}

export class CanvasMCPAdapter {
    private activeEffects: IMCPVisualEffect[] = [];
    private fxCanvas!: HTMLCanvasElement;
    private fxCtx!: CanvasRenderingContext2D;

    constructor() {
        this.setupFxCanvasLayer();
        this.bindIPCListener();
    }

    private setupFxCanvasLayer(): void {
        const container = document.getElementById('game-container') || document.body;
        
        this.fxCanvas = document.createElement('canvas');
        this.fxCanvas.id = 'fx-canvas';
        
        // CSS Sandbox
        this.fxCanvas.style.position = 'absolute';
        this.fxCanvas.style.top = '0';
        this.fxCanvas.style.left = '0';
        this.fxCanvas.style.pointerEvents = 'none'; // Passthrough de clicks
        this.fxCanvas.style.zIndex = '999'; // Acima do jogo principal
        
        // Match container size or default
        this.fxCanvas.width = container.clientWidth || 800;
        this.fxCanvas.height = container.clientHeight || 600;
        
        this.fxCtx = this.fxCanvas.getContext('2d')!;
        
        container.appendChild(this.fxCanvas);
    }

    private bindIPCListener(): void {
        if ((window as any).__TAURI_INTERNALS__) {
            import('@tauri-apps/api/event').then(({ listen }) => {
                listen('panteao-event', (event: any) => {
                    const action = event.payload?.action;
                    if (typeof action === 'string' && action.startsWith('mcp_')) {
                        this.handleMCPCommand(action);
                    }
                });
            });
        }
    }

    public handleMCPCommand(rawAction: string): void {
        const match = rawAction.match(/^mcp_(\w+)\((.*)\)$/);
        if (!match) return;

        const command = match[1];
        const argsRaw = match[2];
        if (command) {
            this.handleCommand(command, argsRaw);
        }
    }

    public handleCommand(command: string, argsRaw?: string): void {
        const args = argsRaw ? argsRaw.split(',').map(a => a.trim().replace(/^['"]|['"]$/g, '')) : [];

        try {
            switch (`mcp_${command}`) {
                case 'mcp_screen_shake':
                    this.triggerScreenShake(parseFloat(args[0]!), parseFloat(args[1]!));
                    break;
                case 'mcp_draw_rune':
                    this.triggerRune(args[0]!, parseFloat(args[1]!), parseFloat(args[2]!), args[3]!);
                    break;
                case 'mcp_ambient_tint':
                    this.triggerAmbientTint(args[0]!, parseFloat(args[1]!));
                    break;
                case 'mcp_spell_aura':
                    this.triggerSpellAura(args[0]!, args[1]!);
                    break;
                case 'mcp_glitch':
                    this.triggerGlitch(parseFloat(args[0]!));
                    break;
                case 'mcp_draw_text':
                    this.triggerDrawText(args[0]!, parseFloat(args[1]!), parseFloat(args[2]!), args[3]!, parseFloat(args[4]!), parseFloat(args[5]!));
                    break;
                case 'mcp_flash_screen':
                    this.triggerFlash(args[0]!, parseFloat(args[1]!));
                    break;
                case 'mcp_rain':
                    this.triggerRain(parseFloat(args[0]!));
                    break;
            }
        } catch (e) {
            console.warn(`[CanvasMCPAdapter] Erro ao parsear MCP payload: mcp_${command}`, e);
        }
    }

    private triggerSpellAura(auraType: string, color: string): void {
        const safeColor = color || 'cyan';
        const numParticles = 20;
        
        this.activeEffects.push({
            type: 'particle',
            ttl: 2000,
            elapsed: 0,
            render: (ctx, dt, canvas) => {
                ctx.save();
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                
                for (let i = 0; i < numParticles; i++) {
                    const angle = (Math.PI * 2 / numParticles) * i + (Date.now() / 500);
                    const radius = 50 + Math.sin(Date.now() / 200 + i) * 20;
                    const px = cx + Math.cos(angle) * radius;
                    const py = cy + Math.sin(angle) * radius;
                    
                    ctx.fillStyle = safeColor;
                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
                return true;
            }
        });
    }

    private triggerGlitch(duration: number): void {
        const safeDuration = isNaN(duration) ? 1000 : Math.min(Math.max(duration, 100), 3000);
        
        this.activeEffects.push({
            type: 'glitch',
            ttl: safeDuration,
            elapsed: 0,
            render: (ctx, dt, canvas) => {
                ctx.save();
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
                for(let i=0; i < 5; i++) {
                    const y = Math.random() * canvas.height;
                    const h = Math.random() * 20;
                    ctx.fillRect(0, y, canvas.width, h);
                }
                
                const hue = Math.floor(Math.random() * 360);
                canvas.style.filter = `hue-rotate(${hue}deg) contrast(150%)`;
                ctx.restore();
                
                return true;
            }
        });
    }

    private triggerScreenShake(intensity: number, duration: number): void {
        const safeIntensity = isNaN(intensity) ? 5 : Math.min(Math.max(intensity, 1), 20);
        const safeDuration = isNaN(duration) ? 500 : Math.min(Math.max(duration, 100), 5000);

        this.activeEffects.push({
            type: 'shake',
            ttl: safeDuration,
            elapsed: 0,
            render: (ctx, dt, canvas) => {
                const shakeX = (Math.random() - 0.5) * safeIntensity * 2;
                const shakeY = (Math.random() - 0.5) * safeIntensity * 2;
                
                canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
                return true; 
            }
        });
    }

    private triggerRune(type: string, x: number, y: number, color: string): void {
        const safeX = isNaN(x) ? 400 : Math.max(0, x);
        const safeY = isNaN(y) ? 300 : Math.max(0, y);
        const safeColor = color || 'purple';

        this.activeEffects.push({
            type: 'rune',
            ttl: 2000,
            elapsed: 0,
            render: (ctx, dt) => {
                ctx.save();
                ctx.strokeStyle = safeColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(safeX, safeY, 40, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
                return true;
            }
        });
    }

    private triggerAmbientTint(color: string, duration: number): void {
        const safeDuration = isNaN(duration) ? 3000 : duration;
        const safeColor = color || 'rgba(0,0,0,0.5)';

        this.activeEffects.push({
            type: 'ambient',
            ttl: safeDuration,
            elapsed: 0,
            render: (ctx, dt, canvas) => {
                ctx.save();
                ctx.fillStyle = safeColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
                return true;
            }
        });
    }

    private triggerDrawText(text: string, x: number, y: number, color: string, size: number, duration: number): void {
        const safeX = isNaN(x) ? 400 : x;
        const safeY = isNaN(y) ? 300 : y;
        const safeSize = isNaN(size) ? 30 : size;
        const safeDuration = isNaN(duration) ? 2000 : duration;
        const safeColor = color || 'white';

        this.activeEffects.push({
            type: 'text',
            ttl: safeDuration,
            elapsed: 0,
            render: (ctx, dt, canvas) => {
                ctx.save();
                ctx.fillStyle = safeColor;
                ctx.font = `bold ${safeSize}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(text, safeX, safeY);
                ctx.restore();
                return true;
            }
        });
    }

    private triggerFlash(color: string, duration: number): void {
        const safeDuration = isNaN(duration) ? 500 : Math.min(duration, 3000);
        const safeColor = color || 'white';

        this.activeEffects.push({
            type: 'flash',
            ttl: safeDuration,
            elapsed: 0,
            render: (ctx, dt, canvas) => {
                ctx.save();
                ctx.fillStyle = safeColor;
                ctx.globalAlpha = 0.5;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
                return true;
            }
        });
    }

    private triggerRain(intensity: number): void {
        const safeIntensity = isNaN(intensity) ? 10 : Math.min(Math.max(intensity, 1), 50);
        
        this.activeEffects.push({
            type: 'rain',
            ttl: 5000,
            elapsed: 0,
            render: (ctx, dt, canvas) => {
                ctx.save();
                ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
                ctx.lineWidth = 1;
                for (let i = 0; i < safeIntensity * 5; i++) {
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height;
                    const len = Math.random() * 20 + 10;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + 5, y + len);
                    ctx.stroke();
                }
                ctx.restore();
                return true;
            }
        });
    }

    public updateAndRender(deltaTime: number): void {
        if (!this.fxCtx) return;

        this.fxCtx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);
        
        let hasShake = false;
        let hasGlitch = false;

        this.activeEffects = this.activeEffects.filter(effect => {
            effect.elapsed += deltaTime;
            if (effect.elapsed >= effect.ttl) {
                return false; 
            }
            
            if (effect.type === 'shake') hasShake = true;
            if (effect.type === 'glitch') hasGlitch = true;
            
            effect.render(this.fxCtx, deltaTime, this.fxCanvas);
            return true;
        });

        if (!hasShake) {
            this.fxCanvas.style.transform = 'translate(0px, 0px)';
        }
        if (!hasGlitch) {
            this.fxCanvas.style.filter = 'none';
        }
    }

    public getActiveEffects(): IMCPVisualEffect[] {
        return this.activeEffects;
    }
}
