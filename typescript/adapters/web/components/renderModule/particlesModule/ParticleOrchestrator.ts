import type IRenderable from "../visuals/IRenderable";
import Particles from "./Particles";
import type { ParticleEmitterConfig } from "./ParticleEmitterConfig";

/**
 * @class ParticleOrchestrator
 * Fachada (Facade) de alto nível para o sistema de partículas.
 * Fornece métodos semânticos e pré-configurados para a criação rápida de efeitos visuais complexos.
 * Implementa `IRenderable` para se integrar nativamente ao pipeline de renderização existente.
 */
export default class ParticleOrchestrator implements IRenderable {
  //? Propriedades de IRenderable para satisfazer contrato com a engine visual
    public id: number = -999999;
    public readonly coordinates = { x: 0, y: 0 };
    public readonly size = { width: 0, height: 0 };
    public readonly rotation: number = 0;

    private particles: Particles;

    constructor(maxParticles: number = 3000) {
        this.particles = new Particles(maxParticles);
    }

    public get activeParticlesCount(): number {
        return this.particles.activeParticlesCount;
    }

    /** 
     * Integração com o Game Loop.
     * Avança a física de todas as milhares de partículas vivas.
     */
    public updateAnimations(deltaTime: number): void {
        this.particles.update(deltaTime);
    }

    /** Satisfaz o contrato IRenderable. Não faz nada pois partículas são dirigidas por eventos e não por DTOs contínuos. */
    public updateState(newState: any): void {}

    /** 
     * Integração com a Engine Visual.
     * Desenha a nuvem de partículas no mundo, já com a translação da Câmera aplicada pelo Renderer!
     */
    public draw(ctx: CanvasRenderingContext2D): void {
        this.particles.draw(ctx);
    }

    /** Limpa todas as partículas ativas da tela. */
    public clear(): void {
        this.particles.clear();
    }

  /* ============================================================================
     BIBLIOTECA DE EFEITOS VISUAIS (VFX) SEMÂNTICOS
  ============================================================================ */

    /**
     * Roteador central de efeitos de partículas. 
     * Encapsula o conhecimento de quais efeitos requerem parâmetros específicos (como angle ou color),
     * blindando o Adapter de saber detalhes de implementação.
     */
    public executeEffect(payload: { effect: string, x: number, y: number, color?: string, angle?: number, count?: number }): void {
        switch (payload.effect) {
            case 'slashSparks':
                this.slashSparks(payload.x, payload.y, payload.angle || 0);
                break;
            case 'windGust':
                this.windGust(payload.x, payload.y, payload.angle || 0);
                break;
            case 'demonTransformation':
                this.demonTransformation(payload.x, payload.y);
                break;
            case 'magicAura':
                this.magicAura(payload.x, payload.y, payload.color);
                break;
            case 'levelUp':
                this.levelUp(payload.x, payload.y, payload.color);
                break;
            default:
                const effectFn = (this as any)[payload.effect];
                if (typeof effectFn === 'function') {
                    effectFn.call(this, payload.x, payload.y, payload.color, payload.count);
                } else {
                    console.warn(`[ParticleOrchestrator] Efeito de partícula desconhecido requisitado: ${payload.effect}`);
                }
                break;
        }
    }

    /** Sangue espirrando e caindo rapidamente com gravidade. Ideal para dano físico. */
    public bloodSplatter(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 18,
            colors: ['#8a0303', '#bf0000', '#ff2a2a'],
            speedMin: 80, speedMax: 250,
            sizeMin: 2, sizeMax: 6,
            lifeMin: 0.3, lifeMax: 0.8,
            angle: 0, spread: Math.PI * 2,
            gravity: 600,
            friction: 0.92,
            isCircle: true
        });
    }

    /** 
     * "POP" de Morte Comum (Bullet Hell Otimizado)
     * Gatilho: Morte de inimigos normais (Slimes, Goblins, etc).
     * Extremamente leve: Poucas partículas, tempo de vida curto e sem curvas (isCircle: false) 
     * para não sobrecarregar o renderizador do Canvas2D quando dezenas de inimigos morrem no mesmo frame.
     */
    public enemyDeath(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 10,
            colors: ['#3a0000', '#5e0000', '#8a0303', '#222222'],
            speedMin: 40, speedMax: 150,
            sizeMin: 2, sizeMax: 5,
            lifeMin: 0.2, lifeMax: 0.4,
            angle: 0, spread: Math.PI * 2,
            gravity: 100,
            friction: 0.88,
            fade: true,
            isCircle: false
        });
    }

    /** Fogo intenso que se expande e sobe aos céus, desaparecendo rápido. Ideal para a Fireball. */
    public fireExplosion(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 45,
            colors: ['#FFF7CC', '#FFD700', '#FF4500', '#8B0000'],
            speedMin: 60, speedMax: 320,
            sizeMin: 4, sizeMax: 12,
            lifeMin: 0.4, lifeMax: 0.9,
            angle: 0, spread: Math.PI * 2,
            gravity: -80,
            friction: 0.88,
            isCircle: true
        });
    }

    /** Uma energia suave que orbita ou sobe a partir de uma entidade. */
    public magicAura(x: number, y: number, hexColor: string = '#00FFFF'): void {
        this.particles.emit({
            x, y,
            count: 12,
            colors: [hexColor, '#FFFFFF', '#E0FFFF'],
            speedMin: 5, speedMax: 35,
            sizeMin: 2, sizeMax: 6,
            lifeMin: 1.0, lifeMax: 2.5,
            angle: -Math.PI / 2, spread: Math.PI,
            gravity: -20,
            friction: 0.96,
            isCircle: true
        });
    }

    /** Faíscas brilhantes direcionais que ricocheteiam. Ideal para impactos de espada. */
    public slashSparks(x: number, y: number, angle: number): void {
        this.particles.emit({
            x, y,
            count: 20,
            colors: ['#FFFFFF', '#FFFACD', '#FFD700'],
            speedMin: 300, speedMax: 700,
            sizeMin: 1, sizeMax: 4,
            lifeMin: 0.1, lifeMax: 0.35,
            angle: angle, spread: Math.PI / 4,
            gravity: 100,
            friction: 0.85,
            isCircle: false
        });
    }

    /** Explosão de água com física de gotas que caem redondas. */
    public waterSplash(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 35,
            colors: ['#E0FFFF', '#87CEFA', '#1E90FF', '#0000CD'],
            speedMin: 100, speedMax: 300,
            sizeMin: 3, sizeMax: 7,
            lifeMin: 0.4, lifeMax: 0.9,
            angle: -Math.PI / 2, spread: Math.PI * 1.5,
            gravity: 700,
            friction: 0.96,
            isCircle: true
        });
    }

    /** Fumaça ou gás venenoso que desacelera muito rápido e se dissipa no lugar. */
    public poisonCloud(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 45,
            colors: ['#ADFF2F', '#32CD32', '#228B22', '#556B2F'],
            speedMin: 10, speedMax: 80,
            sizeMin: 8, sizeMax: 16,
            lifeMin: 1.0, lifeMax: 2.5,
            angle: 0, spread: Math.PI * 2,
            gravity: -10, 
            friction: 0.80,
            fade: true,
            isCircle: true
        });
    }

    /** Explosão majestosa e azulada com vida longa, para celebrar a subida de nível! */
    public levelUp(x: number, y: number, hexColor?: string): void {
        const colors = hexColor ? [hexColor, '#FFFFFF', '#FFF8DC'] : ['#87CEFA', '#FFFFFF', '#FFD700', '#FFFACD'];
        this.particles.emit({
            x, y,
            count: 80,
            colors: colors,
            speedMin: 50, speedMax: 250,
            sizeMin: 3, sizeMax: 9,
            lifeMin: 1.5, lifeMax: 3.5,
            angle: -Math.PI / 2, spread: Math.PI * 2,
            gravity: -60,
            friction: 0.94,
            isCircle: true
        });
    }

    /**
     * Rastro dinâmico para as magias modulares não listadas. 
     * Ele agrupa as cores das essências da array para criar uma aura híbrida em volta da bola.
     */
    public dynamicSpellTrail(x: number, y: number, elements: string[]): void {
        const colorMap: Record<string, string[]> = {
            'abys': ['#3B0764', '#581C87', '#7E22CE'],
            'air': ['#00FFFF', '#E0FFFF', '#7DD3FC'],
            'crystal': ['#EC4899', '#F472B6', '#06B6D4'],
            'dark': ['#18181B', '#3F3F46', '#581C87'],
            'decay': ['#84CC16', '#4D7C0F', '#14532D'],
            'fire': ['#FFA500', '#FF4500', '#FF0000'],
            'ground': ['#78350F', '#B45309', '#D97706'],
            'holy': ['#FFD700', '#FDE047', '#FEF08A'],
            'ice': ['#38BDF8', '#BAE6FD', '#FFFFFF'],
            'infernous': ['#DC2626', '#991B1B', '#EA580C'],
            'life': ['#22C55E', '#16A34A', '#DC2626'],
            'light': ['#FFFFFF', '#FFF8DC', '#F0E68C'],
            'magic': ['#8A2BE2', '#9400D3', '#DA70D6'],
            'magma': ['#EA580C', '#C2410C', '#7C2D12'],
            'nature': ['#32CD32', '#228B22', '#00FF00'],
            'negation': ['#6B7280', '#9CA3AF', '#EF4444'],
            'ordem': ['#F59E0B', '#D97706', '#FEF3C7'],
            'poison': ['#10B981', '#059669', '#047857'],
            'potencia': ['#C084FC', '#A855F7', '#7E22CE'],
            'thunder': ['#FFFF00', '#FFD700', '#FFFACD'],
            'water': ['#00BFFF', '#1E90FF', '#E0FFFF']
        };

        let activeColors: string[] = [];
        for (const el of elements) {
            if (colorMap[el]) activeColors.push(...colorMap[el]);
        }
        if (activeColors.length === 0) activeColors = ['#FFFFFF'];

        this.particles.emit({
            x, y,
            count: 3 * elements.length,
            colors: activeColors,
            speedMin: 10, speedMax: 30,
            sizeMin: 2, sizeMax: 6,
            lifeMin: 0.2, lifeMax: 0.6,
            angle: 0, spread: Math.PI * 2,
            gravity: 0,
            friction: 0.90,
            fade: true,
            isCircle: true
        });
    }
    
    /** 
     * O "ESTALO" (Critical Hit / Acerto Crítico)
     * Gatilho: Alta velocidade inicial + Frenagem abrupta (Friction forte).
     * O cérebro interpreta isso como um impacto de altíssima inércia. Cores quentes reforçam a ideia de "Jackpot".
     */
    public criticalStrike(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 45,
            colors: ['#FFFFFF', '#FFD700', '#FFA500', '#FFFFE0'],
            speedMin: 400, speedMax: 900,
            sizeMin: 2, sizeMax: 6,
            lifeMin: 0.2, lifeMax: 0.5,
            angle: 0, spread: Math.PI * 2,
            gravity: 0,
            friction: 0.80,
            fade: true,
            isCircle: false
        });
    }

    /** 
     * A "ANTECIPAÇÃO" (Legendary Loot Drop / Level Up Node)
     * Gatilho: Movimento antigravidade e longevidade.
     * Sinaliza um objeto de altíssimo valor que chama (e prende) a visão periférica do jogador.
     */
    public legendaryLootBeacon(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 60,
            colors: ['#FFD700', '#FF8C00', '#FF1493', '#00FFFF'],
            speedMin: 20, speedMax: 150,
            sizeMin: 3, sizeMax: 8,
            lifeMin: 1.5, lifeMax: 4.0,
            angle: -Math.PI / 2, spread: Math.PI / 4,
            gravity: -30,
            friction: 0.96,
            fade: true,
            isCircle: true
        });
    }

    /** 
     * A "CATARSE" (Overkill / Enemy Shatter)
     * Gatilho: Exagero visual (Limpeza cognitiva). 
     * Use quando explodir um inimigo com muito mais dano do que a vida máxima dele.
     */
    public overkillShatter(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 100,
            colors: ['#00FFFF', '#FF00FF', '#FFFFFF', '#00BFFF', '#9400D3'],
            speedMin: 100, speedMax: 650,
            sizeMin: 2, sizeMax: 10,
            lifeMin: 0.4, lifeMax: 1.2,
            angle: 0, spread: Math.PI * 2,
            gravity: 200,
            friction: 0.92,
            fade: true,
            isCircle: false
        });
    }

    /** Explosão rápida, brilhante e caótica. Ideal para o elemento Thunder (Trovão). */
    public thunderStrike(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 35,
            colors: ['#FFFF00', '#FFFFFF', '#FFD700', '#E0FFFF'],
            speedMin: 200, speedMax: 800,
            sizeMin: 1, sizeMax: 4,
            lifeMin: 0.1, lifeMax: 0.3,
            angle: 0, spread: Math.PI * 2,
            gravity: 0,
            friction: 0.75,
            fade: true,
            isCircle: false
        });
    }

    /**
     * Efeito windGust (Infusão de Ar):
     * Dispara 3 a 5 lâminas de vento curvas em tons de ciano/branco que se dissipam em 0.25 segundos
     * na direção do golpe da espada.
     */
    public windGust(x: number, y: number, angle: number = 0): void {
        this.particles.emit({
            x, y,
            count: 5,
            colors: ['#FFFFFF', '#E0FFFF', '#00FFFF', '#7FFFD4', '#F0FFFF'],
            speedMin: 220, speedMax: 420,
            sizeMin: 4, sizeMax: 8,
            lifeMin: 0.15, lifeMax: 0.25,
            angle: angle, spread: Math.PI / 6,
            gravity: 0,
            friction: 0.86,
            fade: true,
            isCircle: true
        });
    }

    /**
     * Efeito lightFlash (Infusão de Luz):
     * Flash esférico radiante amarelado/dourado com fade-out suave em 0.2 segundos, enfatizando a grande área atingida.
     */
    public lightFlash(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 50,
            colors: ['#FFFFFF', '#FFFACD', '#FFD700', '#FAFAD2', '#FFF8DC'],
            speedMin: 80, speedMax: 420,
            sizeMin: 5, sizeMax: 14,
            lifeMin: 0.1, lifeMax: 0.2,
            angle: 0, spread: Math.PI * 2,
            gravity: 0,
            friction: 0.85,
            fade: true,
            isCircle: true
        });
    }

    /**
     * Transmutação Demoníaca:
     * Sobreposição simultânea de fogo vermelho e pulso negro expansivo centrada nas coordenadas do jogador.
     */
    public demonTransformation(x: number, y: number): void {
        this.fireExplosion(x, y);
        this.darkPulse(x, y);
    }

    /** Pulso de energia mística. Ideal para o elemento Magic (Magia Arcana). */
    public magicPulse(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 50,
            colors: ['#8A2BE2', '#9400D3', '#DA70D6', '#4B0082'],
            speedMin: 20, speedMax: 200,
            sizeMin: 2, sizeMax: 7,
            lifeMin: 0.5, lifeMax: 1.2,
            angle: 0, spread: Math.PI * 2,
            gravity: 0,
            friction: 0.94,
            fade: true,
            isCircle: true
        });
    }

    /** Explosão de folhas e terra. Ideal para o elemento Nature (Natureza). */
    public natureBurst(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 40,
            colors: ['#228B22', '#32CD32', '#00FF00', '#8B4513'],
            speedMin: 40, speedMax: 250,
            sizeMin: 3, sizeMax: 7,
            lifeMin: 0.5, lifeMax: 1.2,
            angle: -Math.PI / 2, spread: Math.PI * 1.5,
            gravity: 300,
            friction: 0.95,
            fade: true,
            isCircle: false
        });
    }

    /** Explosão pesada de pedregulhos e terra. Ideal para o elemento Ground (Terra). */
    public rockShatter(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 45,
            colors: ['#4A4A4A', '#696969', '#8B4513', '#A0522D', '#2F4F4F'],
            speedMin: 100, speedMax: 400,
            sizeMin: 4, sizeMax: 10,
            lifeMin: 0.5, lifeMax: 1.2,
            angle: -Math.PI / 2, spread: Math.PI * 1.5,
            gravity: 800,
            friction: 0.95,
            fade: true,
            isCircle: false
        });
    }

    /** Pulso de energia sombria e corrompida que consome a luz. Ideal para o elemento Dark (Trevas). */
    public darkPulse(x: number, y: number, color?: string, count: number = 20): void {
        const isDense = count > 5;
        this.particles.emit({
            x, y,
            count,
            colors: color ? [color, '#1A0033', '#2E0854'] : ['#1A0033', '#2E0854', '#4B0082', '#000000', '#483D8B'],
            speedMin: isDense ? 10 : 8, speedMax: isDense ? 90 : 45,
            sizeMin: isDense ? 3 : 2, sizeMax: isDense ? 7 : 4,
            lifeMin: isDense ? 0.35 : 0.2, lifeMax: isDense ? 0.75 : 0.4,
            angle: 0, spread: Math.PI * 2,
            gravity: -10,
            friction: 0.90,
            fade: true,
            isCircle: true
        });
    }

    /**
     * Permite emitir um efeito totalmente sob demanda customizado.
     */
    public customEmit(config: ParticleEmitterConfig): void {
        this.particles.emit(config);
    }
}