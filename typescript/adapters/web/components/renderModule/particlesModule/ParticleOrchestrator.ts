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
    // Propriedades de IRenderable ignoradas matematicamente, usadas apenas para satisfazer o contrato com a Engine visual
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

    // ============================================================================
    // BIBLIOTECA DE EFEITOS VISUAIS (VFX) SEMÂNTICOS
    // ============================================================================

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
            colors: ['#8a0303', '#bf0000', '#ff2a2a'], // Gradiente rico para dar noção de volume
            speedMin: 80, speedMax: 250,
            sizeMin: 2, sizeMax: 6,
            lifeMin: 0.3, lifeMax: 0.8,
            angle: 0, spread: Math.PI * 2,
            gravity: 600,
            friction: 0.92, // Trajetória de queda mais fluida
            isCircle: true // Gotas biológicas redondas ao invés de pixels quadrados
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
            count: 10, // Baixíssima alocação
            colors: ['#3a0000', '#5e0000', '#8a0303', '#222222'], // Sangue coagulado e resquícios de fumaça escura
            speedMin: 40, speedMax: 150,
            sizeMin: 2, sizeMax: 5,
            lifeMin: 0.2, lifeMax: 0.4, // Limpa da tela e do Pool quase instantaneamente
            angle: 0, spread: Math.PI * 2,
            gravity: 100, // Queda suave
            friction: 0.88,
            fade: true,
            isCircle: false // Renderização primitiva em bloco: Otimização máxima para a GPU/CPU
        });
    }

    /** Fogo intenso que se expande e sobe aos céus, desaparecendo rápido. Ideal para a Fireball. */
    public fireExplosion(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 45,
            colors: ['#FFF7CC', '#FFD700', '#FF4500', '#8B0000'], // Perfil térmico realístico (núcleo branco/amarelo esfriando para vermelho)
            speedMin: 60, speedMax: 320,
            sizeMin: 4, sizeMax: 12, // Variação maior de tamanho gera sensação de profundidade
            lifeMin: 0.4, lifeMax: 0.9,
            angle: 0, spread: Math.PI * 2, // 360 graus
            gravity: -80, // Ascensão termal mais orgânica
            friction: 0.88, // Vira uma "nuvem" suspensa no final da vida
            isCircle: true
        });
    }

    /** Uma energia suave que orbita ou sobe a partir de uma entidade. */
    public magicAura(x: number, y: number, hexColor: string = '#00FFFF'): void {
        this.particles.emit({
            x, y,
            count: 12,
            colors: [hexColor, '#FFFFFF', '#E0FFFF'], // Cores análogas harmoniosas
            speedMin: 5, speedMax: 35,
            sizeMin: 2, sizeMax: 6,
            lifeMin: 1.0, lifeMax: 2.5, // Vida bem longa (sensação de paz / buff)
            angle: -Math.PI / 2, spread: Math.PI, // Espalha pra cima
            gravity: -20, // Flutuação etérea e graciosa
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
            speedMin: 300, speedMax: 700, // Violência mecânica
            sizeMin: 1, sizeMax: 4,
            lifeMin: 0.1, lifeMax: 0.35,
            angle: angle, spread: Math.PI / 4, // Cone pontiagudo acompanhando o corte
            gravity: 100,
            friction: 0.85,
            isCircle: false // MANTEMOS QUADRADO! O contraste cognitivo de lascas pontiagudas realça os impactos!
        });
    }

    /** Explosão de água com física de gotas que caem redondas. */
    public waterSplash(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 35,
            colors: ['#E0FFFF', '#87CEFA', '#1E90FF', '#0000CD'], // Gradiente do raso ao oceano profundo
            speedMin: 100, speedMax: 300,
            sizeMin: 3, sizeMax: 7,
            lifeMin: 0.4, lifeMax: 0.9,
            angle: -Math.PI / 2, spread: Math.PI * 1.5, // Jorra majoritariamente pra cima
            gravity: 700,
            friction: 0.96, // A inércia suave da água resistindo ao ar
            isCircle: true // Gotículas visivelmente polidas
        });
    }

    /** Fumaça ou gás venenoso que desacelera muito rápido e se dissipa no lugar. */
    public poisonCloud(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 45,
            colors: ['#ADFF2F', '#32CD32', '#228B22', '#556B2F'], // Musgos e tons orgânicos
            speedMin: 10, speedMax: 80,
            sizeMin: 8, sizeMax: 16, // Círculos muito grandes sobrepostos geram a ilusão de uma "nuvem" vetorial coesa
            lifeMin: 1.0, lifeMax: 2.5,
            angle: 0, spread: Math.PI * 2,
            gravity: -10, 
            friction: 0.80, // Densidade do gás (freia quase de imediato)
            fade: true,
            isCircle: true
        });
    }

    /** Explosão majestosa e azulada com vida longa, para celebrar a subida de nível! */
    public levelUp(x: number, y: number, hexColor?: string): void {
        // Um ápice de satisfação: Brancos ofuscantes, Dourados e tons do Céu.
        const colors = hexColor ? [hexColor, '#FFFFFF', '#FFF8DC'] : ['#87CEFA', '#FFFFFF', '#FFD700', '#FFFACD'];
        this.particles.emit({
            x, y,
            count: 80,
            colors: colors,
            speedMin: 50, speedMax: 250,
            sizeMin: 3, sizeMax: 9,
            lifeMin: 1.5, lifeMax: 3.5, // Extremamente duradouro, ancora o estado de flow e recompensa
            angle: -Math.PI / 2, spread: Math.PI * 2, // Em todas as direções
            gravity: -60, // Ascensão majestosa constante
            friction: 0.94,
            isCircle: true // Suavidade absoluta na tela
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
            count: 3 * elements.length, // Volume visual superior
            colors: activeColors,
            speedMin: 10, speedMax: 30,
            sizeMin: 2, sizeMax: 6,
            lifeMin: 0.2, lifeMax: 0.6,
            angle: 0, spread: Math.PI * 2, // Orbitando ao redor
            gravity: 0,
            friction: 0.90,
            fade: true,
            isCircle: true // Magias em estado puro tendem à esfericidade
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
            colors: ['#FFFFFF', '#FFD700', '#FFA500', '#FFFFE0'], // Branco ofuscante e Dourado
            speedMin: 400, speedMax: 900, // Explosão inicial quase instantânea
            sizeMin: 2, sizeMax: 6,
            lifeMin: 0.2, lifeMax: 0.5, // Vive muito pouco, é um "flash"
            angle: 0, spread: Math.PI * 2,
            gravity: 0,
            friction: 0.80, // Freia de soco, criando uma "coroa" ou "nova" geométrica ao redor do impacto
            fade: true,
            isCircle: false // Mantemos blocos duros (Pixels) para maximizar o estresse visual do acerto brutal.
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
            colors: ['#FFD700', '#FF8C00', '#FF1493', '#00FFFF'], // Ouro, Rosa Épico e Ciano Puro
            speedMin: 20, speedMax: 150,
            sizeMin: 3, sizeMax: 8,
            lifeMin: 1.5, lifeMax: 4.0, // Vida muito longa
            angle: -Math.PI / 2, spread: Math.PI / 4, // Jorra num cone reto para cima como um farol
            gravity: -30, // Flutua lentamente contra a gravidade (sensação etérea)
            friction: 0.96,
            fade: true,
            isCircle: true // Círculos transmitem a ideia de orbes divinos e itens preciosos.
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
            count: 100, // Quantidade obscena de partículas (Como o Pool suporta até 3000, isso é super seguro)
            colors: ['#00FFFF', '#FF00FF', '#FFFFFF', '#00BFFF', '#9400D3'], // Cyberpunk / Pura Magia
            speedMin: 100, speedMax: 650,
            sizeMin: 2, sizeMax: 10,
            lifeMin: 0.4, lifeMax: 1.2,
            angle: 0, spread: Math.PI * 2,
            gravity: 200, // Partículas pesadas caindo em arco parabólico
            friction: 0.92,
            fade: true,
            isCircle: false // Entidade despedaçada em cacos irregulares!
        });
    }

    /** Explosão rápida, brilhante e caótica. Ideal para o elemento Thunder (Trovão). */
    public thunderStrike(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 35,
            colors: ['#FFFF00', '#FFFFFF', '#FFD700', '#E0FFFF'], // Elétrico, branco e dourado
            speedMin: 200, speedMax: 800, // Altíssima velocidade inicial
            sizeMin: 1, sizeMax: 4,
            lifeMin: 0.1, lifeMax: 0.3, // Curta duração (pisca como um raio)
            angle: 0, spread: Math.PI * 2,
            gravity: 0,
            friction: 0.75, // Frenagem brusca para imitar faíscas elétricas quebrando
            fade: true,
            isCircle: false // Formas pontiagudas e ásperas
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
            lifeMin: 0.15, lifeMax: 0.25, // Dissipação rápida em 0.25s
            angle: angle, spread: Math.PI / 6, // Cone estreito acompanhando o golpe
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
            colors: ['#FFFFFF', '#FFFACD', '#FFD700', '#FAFAD2', '#FFF8DC'], // Branco puro e dourado radiante
            speedMin: 80, speedMax: 420,
            sizeMin: 5, sizeMax: 14,
            lifeMin: 0.1, lifeMax: 0.2, // Fade-out suave em 0.2s
            angle: 0, spread: Math.PI * 2,
            gravity: 0,
            friction: 0.85,
            fade: true,
            isCircle: true // Esferas perfeitas de luz divina
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
            colors: ['#8A2BE2', '#9400D3', '#DA70D6', '#4B0082'], // Tons roxos, violetas e arcanos
            speedMin: 20, speedMax: 200,
            sizeMin: 2, sizeMax: 7,
            lifeMin: 0.5, lifeMax: 1.2, // Fica bastante tempo na tela pulsando
            angle: 0, spread: Math.PI * 2,
            gravity: 0, // Gravidade zero, energia pura
            friction: 0.94, // Espalha e para devagar
            fade: true,
            isCircle: true
        });
    }

    /** Explosão de folhas e terra. Ideal para o elemento Nature (Natureza). */
    public natureBurst(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 40,
            colors: ['#228B22', '#32CD32', '#00FF00', '#8B4513'], // Folhas verdes e pedaços de terra marrom
            speedMin: 40, speedMax: 250,
            sizeMin: 3, sizeMax: 7,
            lifeMin: 0.5, lifeMax: 1.2,
            angle: -Math.PI / 2, spread: Math.PI * 1.5, // Estoura pra cima igual terra/mato sendo chutado
            gravity: 300, // Gravidade puxa de volta pra terra
            friction: 0.95,
            fade: true,
            isCircle: false // Formas quadradas para simular folhas/terra picada
        });
    }

    /** Explosão pesada de pedregulhos e terra. Ideal para o elemento Ground (Terra). */
    public rockShatter(x: number, y: number): void {
        this.particles.emit({
            x, y,
            count: 45,
            colors: ['#4A4A4A', '#696969', '#8B4513', '#A0522D', '#2F4F4F'], // Cinzas de pedra e marrons de terra
            speedMin: 100, speedMax: 400, // Estouro forte inicial
            sizeMin: 4, sizeMax: 10, // Pedaços graúdos
            lifeMin: 0.5, lifeMax: 1.2,
            angle: -Math.PI / 2, spread: Math.PI * 1.5, // Maior parte dos detritos sobe antes de cair
            gravity: 800, // Gravidade extrema, pedras são muito pesadas
            friction: 0.95,
            fade: true,
            isCircle: false // Quadrados afiados para simular pedras irregulares
        });
    }

    /** Pulso de energia sombria e corrompida que consome a luz. Ideal para o elemento Dark (Trevas). */
    public darkPulse(x: number, y: number, color?: string, count: number = 20): void {
        const isDense = count > 5;
        this.particles.emit({
            x, y,
            count,
            colors: color ? [color, '#1A0033', '#2E0854'] : ['#1A0033', '#2E0854', '#4B0082', '#000000', '#483D8B'], // Tons de roxo abissal e preto
            speedMin: isDense ? 10 : 8, speedMax: isDense ? 90 : 45, // Expansão sutil para manter o formato de estrela nítido
            sizeMin: isDense ? 3 : 2, sizeMax: isDense ? 7 : 4, // Partículas menores e delicadas que não cobrem os sprites
            lifeMin: isDense ? 0.35 : 0.2, lifeMax: isDense ? 0.75 : 0.4, // Dissipação rápida para revelar o sprite
            angle: 0, spread: Math.PI * 2,
            gravity: -10, // Flutua levemente como um miasma
            friction: 0.90, // Freia rapidamente e fica pairando
            fade: true,
            isCircle: true // Bordas suaves para simular energia escura e vazios
        });
    }

    /**
     * Permite emitir um efeito totalmente sob demanda customizado.
     */
    public customEmit(config: ParticleEmitterConfig): void {
        this.particles.emit(config);
    }
}