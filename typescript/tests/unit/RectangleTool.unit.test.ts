/**
 * @file RectangleTool.unit.test.ts
 * Testes unitarios para a ferramenta RectangleTool do Hitbox Editor (PolygonWebEditor).
 * Valida a criacao de hitboxes retangulares perfeitas (AABB), ordem de vertices em sentido horario,
 * suporte a trava de proporcao 1:1 (Shift), modos de interacao (arraste e 2 cliques) e cancelamento.
 */

import { describe, it, expect, vi } from 'vitest';
import { RectangleTool } from '../../adapters/polygonWebEditor/Tools/RectangleTool';
import type { HitboxModel } from '../../adapters/polygonWebEditor/Models/HitboxModel';

describe('RectangleTool - Ferramenta de Criacao de Retangulos (Unit)', () => {
    it('1. Deve criar uma hitbox retangular com 4 vertices em ordem horaria via clique e arraste', () => {
        let createdHitbox: HitboxModel | null = null;
        const tool = new RectangleTool((hb) => {
            createdHitbox = hb;
        });

        // Clique inicial em (10, 20)
        tool.onMouseDown({ button: 0 } as MouseEvent, { x: 10, y: 20 }, 1);

        // Movimento ate (110, 70)
        tool.onMouseMove({ button: 0, shiftKey: false } as MouseEvent, { x: 110, y: 70 }, 1);

        // Soltura do mouse em (110, 70)
        tool.onMouseUp({ button: 0, shiftKey: false } as MouseEvent, { x: 110, y: 70 }, 1);

        expect(createdHitbox).not.toBeNull();
        expect(createdHitbox!.type).toBe('polygon');
        expect(createdHitbox!.id).toMatch(/^rect_\d+/);
        expect(createdHitbox!.coordinates).toEqual({ x: 10, y: 20 });

        // Vertices: Top-Left, Top-Right, Bottom-Right, Bottom-Left
        expect(createdHitbox!.points).toEqual([
            { x: 10, y: 20 },
            { x: 110, y: 20 },
            { x: 110, y: 70 },
            { x: 10, y: 70 }
        ]);
    });

    it('2. Deve normalizar os vertices corretamente ao arrastar de baixo para cima e da direita para a esquerda', () => {
        let createdHitbox: HitboxModel | null = null;
        const tool = new RectangleTool((hb) => {
            createdHitbox = hb;
        });

        // Clique inicial no canto inferior direito (200, 150)
        tool.onMouseDown({ button: 0 } as MouseEvent, { x: 200, y: 150 }, 1);

        // Arraste para o canto superior esquerdo (50, 40)
        tool.onMouseMove({ button: 0, shiftKey: false } as MouseEvent, { x: 50, y: 40 }, 1);
        tool.onMouseUp({ button: 0, shiftKey: false } as MouseEvent, { x: 50, y: 40 }, 1);

        expect(createdHitbox).not.toBeNull();
        expect(createdHitbox!.coordinates).toEqual({ x: 50, y: 40 });
        expect(createdHitbox!.points).toEqual([
            { x: 50, y: 40 },
            { x: 200, y: 40 },
            { x: 200, y: 150 },
            { x: 50, y: 150 }
        ]);
    });

    it('3. Deve forcar proporcao quadrada (1:1) quando a tecla Shift estiver pressionada', () => {
        let createdHitbox: HitboxModel | null = null;
        const tool = new RectangleTool((hb) => {
            createdHitbox = hb;
        });

        // Clique em (10, 10), arraste para (70, 40) com Shift
        tool.onMouseDown({ button: 0 } as MouseEvent, { x: 10, y: 10 }, 1);
        tool.onMouseMove({ button: 0, shiftKey: true } as MouseEvent, { x: 70, y: 40 }, 1);
        tool.onMouseUp({ button: 0, shiftKey: true } as MouseEvent, { x: 70, y: 40 }, 1);

        expect(createdHitbox).not.toBeNull();
        // Maior lado foi dx = 60, entao largura = 60 e altura = 60
        expect(createdHitbox!.points).toEqual([
            { x: 10, y: 10 },
            { x: 70, y: 10 },
            { x: 70, y: 70 },
            { x: 10, y: 70 }
        ]);
    });

    it('4. Deve suportar modo dois cliques (clicar no ponto A e depois clicar no ponto B)', () => {
        let createdHitbox: HitboxModel | null = null;
        const tool = new RectangleTool((hb) => {
            createdHitbox = hb;
        });

        // 1º Clique sem arrasto significativo (solta na mesma coordenada)
        tool.onMouseDown({ button: 0 } as MouseEvent, { x: 30, y: 30 }, 1);
        tool.onMouseUp({ button: 0 } as MouseEvent, { x: 30, y: 30 }, 1);
        expect(createdHitbox).toBeNull(); // Nao finalizou ainda

        // Movimento do mouse
        tool.onMouseMove({ button: 0, shiftKey: false } as MouseEvent, { x: 80, y: 60 }, 1);

        // 2º Clique confirma
        tool.onMouseDown({ button: 0, shiftKey: false } as MouseEvent, { x: 80, y: 60 }, 1);

        expect(createdHitbox).not.toBeNull();
        expect(createdHitbox!.points).toEqual([
            { x: 30, y: 30 },
            { x: 80, y: 30 },
            { x: 80, y: 60 },
            { x: 30, y: 60 }
        ]);
    });

    it('5. Deve descartar retangulos degenerados menores que 2x2 pixels', () => {
        let createdHitbox: HitboxModel | null = null;
        const tool = new RectangleTool((hb) => {
            createdHitbox = hb;
        });

        tool.onMouseDown({ button: 0 } as MouseEvent, { x: 10, y: 10 }, 1);
        tool.onMouseMove({ button: 0, shiftKey: false } as MouseEvent, { x: 11, y: 10 }, 1);
        tool.onMouseUp({ button: 0, shiftKey: false } as MouseEvent, { x: 11, y: 10 }, 1);

        expect(createdHitbox).toBeNull();
    });

    it('6. Deve cancelar a criacao em andamento via tecla Escape ou clique direito', () => {
        let createdHitbox: HitboxModel | null = null;
        const tool = new RectangleTool((hb) => {
            createdHitbox = hb;
        });

        // Cancelamento via Escape
        tool.onMouseDown({ button: 0 } as MouseEvent, { x: 10, y: 10 }, 1);
        tool.onKeyDown({ key: 'Escape' } as KeyboardEvent);
        tool.onMouseUp({ button: 0 } as MouseEvent, { x: 100, y: 100 }, 1);
        expect(createdHitbox).toBeNull();

        // Cancelamento via clique direito (button 2)
        tool.onMouseDown({ button: 0 } as MouseEvent, { x: 10, y: 10 }, 1);
        tool.onMouseDown({ button: 2 } as MouseEvent, { x: 50, y: 50 }, 1);
        tool.onMouseUp({ button: 0 } as MouseEvent, { x: 100, y: 100 }, 1);
        expect(createdHitbox).toBeNull();
    });

    it('7. Deve desenhar o preview visual com preenchimento, borda e vertices nos 4 cantos', () => {
        const tool = new RectangleTool(() => {});
        const ctxMock = {
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            fillText: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            font: ''
        } as unknown as CanvasRenderingContext2D;

        tool.onMouseDown({ button: 0 } as MouseEvent, { x: 10, y: 10 }, 1);
        tool.onMouseMove({ button: 0, shiftKey: false } as MouseEvent, { x: 50, y: 30 }, 1);

        tool.draw(ctxMock, 0, 0, 1);

        expect(ctxMock.fillRect).toHaveBeenCalledWith(10, 10, 40, 20);
        expect(ctxMock.strokeRect).toHaveBeenCalledWith(10, 10, 40, 20);
        expect(ctxMock.arc).toHaveBeenCalledTimes(4); // 4 vertices
        expect(ctxMock.fillText).toHaveBeenCalledWith('40x20 px', 10, 4);
    });
});
