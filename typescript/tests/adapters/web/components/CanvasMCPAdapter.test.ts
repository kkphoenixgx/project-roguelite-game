/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasMCPAdapter } from '../../../../adapters/web/components/CanvasMCPAdapter';

describe('CanvasMCPAdapter', () => {
    let adapter: CanvasMCPAdapter;
    let mockCanvas: HTMLCanvasElement;
    let mockCtx: CanvasRenderingContext2D;

    beforeEach(() => {
        // Mock do DOM e getContext do JSDOM
        HTMLCanvasElement.prototype.getContext = (() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            beginPath: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            stroke: vi.fn(),
        } as unknown as CanvasRenderingContext2D)) as any;
        
        document.body.innerHTML = '<div id="game-container"></div>';
        
        adapter = new CanvasMCPAdapter();
    });

    it('deve injetar o #fx-canvas no container do jogo', () => {
        const injectedCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
        expect(injectedCanvas).not.toBeNull();
        expect(injectedCanvas.style.pointerEvents).toBe('none'); // Sandbox garantido
    });

    it('deve processar mcp_screen_shake com valores validos', () => {
        adapter.handleMCPCommand('mcp_screen_shake(5, 1000)');
        expect(adapter.getActiveEffects().length).toBe(1);
        expect(adapter.getActiveEffects()[0]!.type).toBe('shake');
        expect(adapter.getActiveEffects()[0]!.ttl).toBe(1000);
    });

    it('deve sanitizar parametros invalidos (NaN) sem crashar', () => {
        adapter.handleMCPCommand('mcp_screen_shake(abacate, NaN)');
        // Valores padrão (fallback) definidos na classe devem ser aplicados
        expect(adapter.getActiveEffects().length).toBe(1);
        expect(adapter.getActiveEffects()[0]!.ttl).toBe(500); // Default TTL do shake
    });

    it('deve processar mcp_draw_rune com cor e runa validas', () => {
        adapter.handleMCPCommand('mcp_draw_rune("circle", 100, 200, "purple")');
        expect(adapter.getActiveEffects().length).toBe(1);
        expect(adapter.getActiveEffects()[0]!.type).toBe('rune');
    });

    it('deve limpar efeitos expirados durante updateAndRender', () => {
        adapter.handleMCPCommand('mcp_screen_shake(5, 100)');
        
        // Simula passagem do tempo (dt)
        adapter.updateAndRender(50);
        expect(adapter.getActiveEffects().length).toBe(1); // Ainda vivo
        
        adapter.updateAndRender(60); // Passou de 100ms
        expect(adapter.getActiveEffects().length).toBe(0); // Limpo
    });

    it('deve processar mcp_spell_aura e renderizar particulas', () => {
        adapter.handleMCPCommand('mcp_spell_aura("fire", "red")');
        expect(adapter.getActiveEffects().length).toBe(1);
        expect(adapter.getActiveEffects()[0]!.type).toBe('particle');
        
        // Simula o render frame
        adapter.updateAndRender(16); // 1 frame
        expect(adapter.getActiveEffects().length).toBe(1);
    });

    it('deve processar mcp_glitch e aplicar filtros CSS no canvas', () => {
        adapter.handleMCPCommand('mcp_glitch(2000)');
        expect(adapter.getActiveEffects().length).toBe(1);
        expect(adapter.getActiveEffects()[0]!.type).toBe('glitch');
        expect(adapter.getActiveEffects()[0]!.ttl).toBe(2000);
        
        const canvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
        
        // Render 1: Deve aplicar filtro (hue-rotate)
        adapter.updateAndRender(16);
        expect(canvas.style.filter).toContain('hue-rotate');
        
        // Simula expiração do glitch
        adapter.updateAndRender(2000);
        
        // O Canvas deve ter os filtros limpos ('none')
        expect(canvas.style.filter).toBe('none');
    });

    it('deve sobrepor múltiplos efeitos simultaneamente (Caos Absoluto)', () => {
        adapter.handleMCPCommand('mcp_screen_shake(10, 2000)');
        adapter.handleMCPCommand('mcp_ambient_tint("#FF0000", 3000)');
        adapter.handleMCPCommand('mcp_draw_rune("pentagram", 400, 300, "red")');
        adapter.handleMCPCommand('mcp_glitch(1500)');
        
        expect(adapter.getActiveEffects().length).toBe(4);
        
        const canvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
        
        // Renderiza com tudo ativo (dt = 1000)
        adapter.updateAndRender(1000);
        expect(adapter.getActiveEffects().length).toBe(4); // Nenhum expirou ainda
        
        // Verifica estilos aplicados (shake + glitch)
        expect(canvas.style.transform).toContain('translate');
        expect(canvas.style.filter).toContain('hue-rotate');
        
        // Avança mais 600ms (Total: 1600ms) - O Glitch (1500ms) deve expirar!
        adapter.updateAndRender(600);
        expect(adapter.getActiveEffects().length).toBe(3);
        expect(canvas.style.filter).toBe('none'); // Filtro resetou
        expect(canvas.style.transform).toContain('translate'); // Shake continua (2000ms)
        
        // Avança mais 500ms (Total: 2100ms) - Shake (2000ms) e Rune (2000ms) devem expirar!
        adapter.updateAndRender(500);
        expect(adapter.getActiveEffects().length).toBe(1); // Só sobra o Ambient (3000ms)
        expect(canvas.style.transform).toBe('translate(0px, 0px)'); // Transform resetou
        
        // Avança o resto (Total: >3000ms)
        adapter.updateAndRender(1000);
        expect(adapter.getActiveEffects().length).toBe(0); // Tela limpa
    });

    it('deve ignorar comandos nao-mcp', () => {
        adapter.handleMCPCommand('move_to(100, 200)');
        expect(adapter.getActiveEffects().length).toBe(0);
    });
});
