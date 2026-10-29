/**
 * @vitest-environment jsdom
 * @file HitboxEditorRectangleToolRegression.test.ts
 * Teste de regressao para a integracao da ferramenta RectangleTool no Hitbox Editor (PolygonEditorApp).
 * Blinda o sistema contra falhas no chaveamento de ferramentas, geracao de poligonos perfeitamente
 * ortogonais (anti-slanting AABB) e historico de Undo/Redo.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Hitbox Editor — Ferramenta de Criacao de Retangulo (Regression)', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="toolbar">
                <div id="active-asset-banner" style="display: none;">
                    <span id="active-asset-id"></span>
                </div>
                <button id="btn-save-code" style="display: none;">Salvar</button>
                <button id="btn-load-image">Sprite</button>
                <input type="file" id="file-input" style="display: none;">
                <button id="btn-tool-select" class="active">Selecionar</button>
                <button id="btn-tool-rectangle">Criar Retângulo</button>
                <button id="btn-tool-polygon">Criar Polígono</button>
                <button id="btn-tool-circle">Criar Círculo</button>
                <button id="btn-delete-selected" style="display: none;">Apagar Hitbox</button>
                <button id="btn-export">Exportar</button>
                <button id="btn-import">Importar</button>
                <input type="file" id="file-import-input" style="display: none;">
                <button id="btn-clear">Limpar</button>
            </div>
            <div id="canvas-container" style="width: 800px; height: 600px;">
                <canvas id="editor-canvas"></canvas>
            </div>
            <div id="controls-help" class="closed">
                <div id="controls-help-header">
                    <button id="btn-toggle-help"></button>
                </div>
            </div>
        `;

        HTMLCanvasElement.prototype.getContext = (() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            drawImage: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            resetTransform: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            setLineDash: vi.fn(),
        } as unknown as CanvasRenderingContext2D)) as any;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('1. Deve registrar a ferramenta RectangleTool e permitir selecao via clique no botao', async () => {
        const { PolygonEditorApp } = await import('../../adapters/polygonWebEditor/EditorApp');
        const app = new PolygonEditorApp();

        expect(app.currentTool).toBe('select');

        const btnRect = document.getElementById('btn-tool-rectangle')!;
        btnRect.click();

        expect(app.currentTool).toBe('rectangle');
        expect(btnRect.classList.contains('active')).toBe(true);
        expect(document.getElementById('btn-tool-select')!.classList.contains('active')).toBe(false);
    });

    it('2. Deve permitir alternar para RectangleTool atraves do atalho de teclado R', async () => {
        const { PolygonEditorApp } = await import('../../adapters/polygonWebEditor/EditorApp');
        const app = new PolygonEditorApp();

        expect(app.currentTool).toBe('select');

        // Dispara tecla 'r'
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));

        expect(app.currentTool).toBe('rectangle');
        expect(document.getElementById('btn-tool-rectangle')!.classList.contains('active')).toBe(true);
    });

    it('3. Deve criar retangulo ortogonal perfeito sem inclinacao AABB ao interagir com o canvas', async () => {
        const { PolygonEditorApp } = await import('../../adapters/polygonWebEditor/EditorApp');
        const app = new PolygonEditorApp();

        const btnRect = document.getElementById('btn-tool-rectangle')!;
        btnRect.click();

        const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;

        // Simula evento mousedown em (100, 100)
        canvas.dispatchEvent(new MouseEvent('mousedown', {
            button: 0,
            clientX: 100,
            clientY: 100,
            bubbles: true
        }));

        // Simula mousemove para (350, 220)
        canvas.dispatchEvent(new MouseEvent('mousemove', {
            clientX: 350,
            clientY: 220,
            bubbles: true
        }));

        // Simula mouseup em (350, 220)
        canvas.dispatchEvent(new MouseEvent('mouseup', {
            button: 0,
            clientX: 350,
            clientY: 220,
            bubbles: true
        }));

        const hitboxes = (app as any).hitboxes;
        expect(hitboxes.length).toBe(1);

        const hb = hitboxes[0];
        expect(hb.type).toBe('polygon');
        expect(hb.points.length).toBe(4);

        // Verifica ortogonalidade rigorosa (arestas perfeitamente paralelas aos eixos X e Y)
        const [p0, p1, p2, p3] = hb.points;
        expect(p0.y).toBe(p1.y); // Aresta superior estritamente horizontal (sem slant)
        expect(p3.y).toBe(p2.y); // Aresta inferior estritamente horizontal (sem slant)
        expect(p0.x).toBe(p3.x); // Aresta esquerda estritamente vertical
        expect(p1.x).toBe(p2.x); // Aresta direita estritamente vertical
    });

    it('4. Deve salvar a criacao do retangulo no historico e suportar Desfazer (Ctrl+Z)', async () => {
        const { PolygonEditorApp } = await import('../../adapters/polygonWebEditor/EditorApp');
        const app = new PolygonEditorApp();

        document.getElementById('btn-tool-rectangle')!.click();
        const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;

        canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 50, clientY: 50, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 150, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mouseup', { button: 0, clientX: 150, clientY: 150, bubbles: true }));

        expect((app as any).hitboxes.length).toBe(1);

        // Desfazer (Ctrl+Z)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));

        expect((app as any).hitboxes.length).toBe(0);

        // Refazer (Ctrl+Y)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }));

        expect((app as any).hitboxes.length).toBe(1);
    });
});
