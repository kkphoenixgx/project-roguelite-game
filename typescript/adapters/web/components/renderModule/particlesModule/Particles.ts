import Particle from "./Particle";
import type { ParticleEmitterConfig } from "./ParticleEmitterConfig";

/**
 * @class Particles
 * @description
 * Módulo de Renderização e Geração de Partículas de Alta Performance para o Canvas.
 * 
 * Requisitos do Módulo:
 * - **Encapsulamento Extremo**: A complexidade de pooling, reciclagens matemáticas e 
 *   iterações fica 100% oculta. O mundo exterior apenas invoca o método `.emit()`.
 * - **Altamente Dinâmico**: O uso de `ParticleEmitterConfig` permite injetar partículas
 *   para Morte (sangue), Magias do Axiomante (fogo, água) e Efeitos de Colisão.
 * - **Extremamente Leve (Zero-GC)**: Utiliza a arquitetura *Swap-Based Object Pooling*.
 *   O módulo pré-aloca a memória de todas as partículas na inicialização. Nenhuma
 *   instância nova é gerada durante a partida, protegendo a Engine de gargalos de memória.
 * - **Renderização Agnóstica**: Requer apenas o `CanvasRenderingContext2D` e o `deltaTime`
 *   do Game Loop para viver no `SceneManager`.
 */
export default class Particles {
    private pool: Particle[];
    private maxParticles: number;
    
    /**
     * O truque de performance: Este ponteiro divide o Array em duas metades.
     * Do índice `0` ao `activeCount - 1` estão as partículas VIVAS.
     * Do índice `activeCount` ao final estão as MORTAS (prontas para uso).
     */
    private activeCount: number = 0;

    public get activeParticlesCount(): number {
        return this.activeCount;
    }

    constructor(maxParticles: number = 1000) {
        this.maxParticles = maxParticles;
        this.pool = new Array(maxParticles);
        
        // Pré-aloca toda a memória de partículas instantaneamente
        for (let i = 0; i < maxParticles; i++) {
            this.pool[i] = new Particle();
        }
    }

    /**
     * Dispara um feixe ou explosão de partículas com base na configuração.
     * Operação extremamente barata `O(1)` por partícula emitida.
     */
    public emit(config: ParticleEmitterConfig): void {
        const safeCount = Math.ceil(config.count * 0.35); // Reduz a emissão bruta em 65% para não estourar a GPU
        for (let i = 0; i < safeCount; i++) {
            if (this.activeCount >= this.maxParticles) break; // Proteção: Pool lotado

            // Resgata uma partícula "Morta" do final do array
            const p = this.pool[this.activeCount]!;

            // Matemática do Caos: Gera ângulos e velocidades aleatórias dentro do limite do cone
            const randomAngle = config.angle + (Math.random() - 0.5) * config.spread;
            const randomSpeed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);

            p.x = config.x;
            p.y = config.y;
            p.vx = Math.cos(randomAngle) * randomSpeed;
            p.vy = Math.sin(randomAngle) * randomSpeed;
            p.life = config.lifeMin + Math.random() * (config.lifeMax - config.lifeMin);
            p.maxLife = p.life;
            p.color = config.colors[Math.floor(Math.random() * config.colors.length)] || '#FFF';
            p.size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
            p.gravity = config.gravity || 0;
            p.friction = config.friction !== undefined ? config.friction : 1;
            p.fade = config.fade !== undefined ? config.fade : true;
            p.isCircle = config.isCircle !== undefined ? config.isCircle : false;

            // Move o ponteiro, tornando-a "Viva"
            this.activeCount++;
        }
    }

    /** Avança a física (movimento, gravidade, atrito e tempo de vida) das partículas. */
    public update(deltaTime: number): void {
        for (let i = 0; i < this.activeCount; i++) {
            const p = this.pool[i]!;
            p.life -= deltaTime;

            if (p.life <= 0) {
                // MÁGICA ZERO-GC: A partícula morreu. Troca ela de lugar com a última partícula viva!
                this.activeCount--;
                const temp = this.pool[this.activeCount]!;
                this.pool[this.activeCount] = p;
                this.pool[i] = temp;
                i--; // Re-avalia o índice atual no próximo loop já que ele agora abriga outra partícula
            } else {
                p.vx *= p.friction;
                p.vy *= p.friction;
                p.vy += p.gravity * deltaTime;
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
            }
        }
    }

    /** Fase final do GameLoop: Desenha todas as partículas vivas na tela com alto desempenho (Zero-GC). */
    public draw(ctx: CanvasRenderingContext2D): void {
        if (this.activeCount === 0) return;

        let lastColor = '';
        let lastAlpha = -1;

        for (let i = 0; i < this.activeCount; i++) {
            const p = this.pool[i]!;
            const alpha = p.fade ? Math.max(0, p.life / p.maxLife) : 1.0;
            
            if (alpha !== lastAlpha) {
                ctx.globalAlpha = alpha;
                lastAlpha = alpha;
            }
            if (p.color !== lastColor) {
                ctx.fillStyle = p.color;
                lastColor = p.color;
            }
            
            // fillRect é até 50x mais rápido que beginPath + arc + fill por software no Canvas 2D
            if (p.isCircle && p.size > 6) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
        }
        ctx.globalAlpha = 1.0; // Reseta a transparência para não manchar outras instâncias visuais do jogo
    }

    /** Reseta todas as partículas vivas do pool sem realocações de memória (Zero-GC). */
    public clear(): void {
        this.activeCount = 0;
    }
}