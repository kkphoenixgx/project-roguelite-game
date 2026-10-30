// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Canvas from '../../adapters/web/components/renderModule/engine/Canvas';

describe('Unidade - Inicialização e Configuração do Canvas (Adaptador Web)', () => {
    let container: HTMLDivElement;

    let mockCtx: any;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        mockCtx = {
            fillStyle: '',
            fillRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            clearRect: vi.fn()
        };
        HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string, options?: any) => {
            if (contextId === '2d') return mockCtx;
            return null;
        });
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    it('deve solicitar contexto 2D com opções de alta performance ({ alpha: false })', () => {
        const canvas = new Canvas(container, 800, 600);

        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d', { alpha: false });
        expect(canvas.element).toBeInstanceOf(HTMLCanvasElement);
        expect(canvas.element.width).toBe(800);
        expect(canvas.element.height).toBe(600);
    });

    it('deve usar dimensões da janela quando width/height fornecidos forem zero', () => {
        window.innerWidth = 1280;
        window.innerHeight = 720;

        const canvas = new Canvas(container, 0, 0);

        expect(canvas.element.width).toBe(1280);
        expect(canvas.element.height).toBe(720);
    });

    it('deve limpar toda a área com cor preta opaca na chamada de clear()', () => {
        const canvas = new Canvas(container, 800, 600);
        const fillRectSpy = vi.spyOn(canvas.ctx, 'fillRect');

        canvas.clear();

        expect(canvas.ctx.fillStyle).toBe('#000000');
        expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 800, 600);
    });
});
