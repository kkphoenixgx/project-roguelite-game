/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MapCanvas } from '../../../adapters/assets-adapter/Components/MapCanvas';
import type { SelectedMapConfig } from '../../../adapters/assets-adapter/Components/MapSelectorModal';
import type { PlacedAssetModel } from '../../../adapters/assets-adapter/Models/PlacedAssetModel';

describe('Assets Adapter — Integração F2 Hitboxes e Double Click (Unit & Regression)', () => {
    let container: HTMLElement;
    let canvas: MapCanvas;
    let mockMap: SelectedMapConfig;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="canvas-container" style="width: 800px; height: 600px;"></div>
            <button id="btn-quick-toggle-hitboxes">
                <span id="hitbox-status-text">Hitboxes (F2): Off</span>
            </button>
        `;
        container = document.getElementById('canvas-container')!;

        // Mock básico de 2D context
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
            measureText: vi.fn(() => ({ width: 80 })),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
        } as unknown as CanvasRenderingContext2D)) as any;

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 4096,
            chunkSize: 1024,
            description: 'Vila central'
        };

        canvas = new MapCanvas('canvas-container', mockMap);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('1. deve inicializar com showHitboxes desativado por padrão', () => {
        expect(canvas.showHitboxes).toBe(false);
    });

    it('2. deve alternar showHitboxes ao chamar toggleHitboxes() ou pressionar F2', () => {
        const renderSpy = vi.spyOn(canvas, 'render');

        canvas.toggleHitboxes();
        expect(canvas.showHitboxes).toBe(true);
        expect(renderSpy).toHaveBeenCalled();

        canvas.toggleHitboxes();
        expect(canvas.showHitboxes).toBe(false);

        // Dispara evento de tecla F2
        const f2Event = new KeyboardEvent('keydown', { key: 'F2', cancelable: true });
        window.dispatchEvent(f2Event);
        expect(canvas.showHitboxes).toBe(true);

        // Dispara F2 novamente para desligar
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', cancelable: true }));
        expect(canvas.showHitboxes).toBe(false);
    });

    it('3. deve ignorar F2 se o foco estiver dentro de um campo de digitação (input/textarea)', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        const f2Event = new KeyboardEvent('keydown', { key: 'F2', cancelable: true });
        window.dispatchEvent(f2Event);
        expect(canvas.showHitboxes).toBe(false);

        document.body.removeChild(input);
    });

    it('4. deve desenhar hitboxes durante o render() quando showHitboxes estiver ativo', () => {
        const testAsset: PlacedAssetModel = {
            uid: 'test_house_1',
            presetId: 'house_red_boro',
            name: 'Casa do Boro',
            x: 100,
            y: 100,
            width: 305,
            height: 354,
            imageSrc: '/assets/scenery/houses/house_red_boro_clean.png',
            selected: false,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        };

        canvas.placedAssets = [testAsset];
        canvas.showHitboxes = true;

        const ctx = (canvas as any).ctx;
        canvas.render();

        // Verifica que métodos de desenho de polígono/círculo foram chamados no contexto
        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.stroke).toHaveBeenCalled();
    });

    it('5. NÃO deve abrir Hitbox Editor ao dar duplo clique se showHitboxes estiver desativado', () => {
        const openSpy = vi.spyOn(canvas, 'openHitboxEditorForAsset');
        const testAsset: PlacedAssetModel = {
            uid: 'test_house_1',
            presetId: 'house_red_boro',
            name: 'Casa do Boro',
            x: 100,
            y: 100,
            width: 305,
            height: 354,
            imageSrc: '/assets/scenery/houses/house_red_boro_clean.png',
            selected: false,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        };
        canvas.placedAssets = [testAsset];
        canvas.showHitboxes = false;

        // Simula duplo clique na posição do asset
        const canvasEl = (canvas as any).canvas as HTMLCanvasElement;
        const screenPos = canvas.worldToScreen(200, 200);
        const dblClickEvent = new MouseEvent('dblclick', {
            clientX: screenPos.x,
            clientY: screenPos.y
        });
        canvasEl.dispatchEvent(dblClickEvent);

        expect(openSpy).not.toHaveBeenCalled();
    });

    it('6. DEVE abrir Hitbox Editor ao dar duplo clique no asset com showHitboxes ativo (F2)', () => {
        const openSpy = vi.spyOn(canvas, 'openHitboxEditorForAsset');
        const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

        const testAsset: PlacedAssetModel = {
            uid: 'test_house_1',
            presetId: 'house_red_boro',
            name: 'Casa do Boro',
            x: 100,
            y: 100,
            width: 305,
            height: 354,
            imageSrc: '/assets/scenery/houses/house_red_boro_clean.png',
            selected: false,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        };
        canvas.placedAssets = [testAsset];
        canvas.showHitboxes = true;

        const canvasEl = (canvas as any).canvas as HTMLCanvasElement;
        canvasEl.getBoundingClientRect = vi.fn().mockReturnValue({
            left: 0,
            top: 0,
            width: 800,
            height: 600,
            right: 800,
            bottom: 600,
            x: 0,
            y: 0,
            toJSON: () => {}
        });
        canvas.panX = 0;
        canvas.panY = 0;
        canvas.zoom = 1;

        // Com pan=0 e zoom=1, world=200,200 é exatamente screen=200,200
        const dblClickEvent = new MouseEvent('dblclick', {
            clientX: 200,
            clientY: 200,
            bubbles: true
        });
        Object.defineProperty(dblClickEvent, 'clientX', { value: 200 });
        Object.defineProperty(dblClickEvent, 'clientY', { value: 200 });

        canvasEl.dispatchEvent(dblClickEvent);

        expect(openSpy).toHaveBeenCalledWith(testAsset);
        expect(windowOpenSpy).toHaveBeenCalledWith(
            expect.stringContaining('/typescript/adapters/polygonWebEditor/index.html?assetId=house_red_boro'),
            '_blank'
        );
    });
});
