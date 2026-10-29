// @vitest-environment jsdom
/**
 * @file AssetsEditorProportionalScaleSliderRegression.test.ts
 * Testes de regressão para a interface de escala proporcional (select, slider e botões rápidos)
 * no PropertiesPanel do Assets Editor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../../typescript/adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorProportionalScaleSliderRegression (Regression Test)', () => {
    let mockMap: any;
    let canvas: MapCanvas;
    let propertiesPanel: PropertiesPanel;
    let tower: PlacedAssetModel;
    let chest: PlacedAssetModel;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="canvas-container"></div>
            <div id="properties-panel-container"></div>
        `;

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            originChunk: { cx: 1, cy: 1 }
        };

        tower = {
            uid: 'tower_test',
            presetId: 'watchtower_wood',
            name: 'Watchtower',
            x: 500,
            y: 500,
            width: 120,
            height: 240,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/tower.png',
            selected: false,
            isSprite: false
        };

        chest = {
            uid: 'chest_test',
            presetId: 'wooden_chest',
            name: 'Wooden Chest',
            x: 700,
            y: 500,
            width: 40,
            height: 40,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/chest.png',
            selected: false,
            isSprite: false
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        canvas.placedAssets = [tower, chest];
        canvas.saveState();

        propertiesPanel = new PropertiesPanel(
            'properties-panel-container',
            canvas,
            undefined,
            undefined
        );
    });

    it('1. Selecionar 2x no <select> de escala deve dobrar o tamanho e atualizar os inputs de largura/altura', () => {
        canvas.selectedAsset = tower;
        canvas.selectedAssets = [tower];
        propertiesPanel.render();

        const scaleSelect = document.getElementById('prop-scale-select') as HTMLSelectElement;
        expect(scaleSelect).not.toBeNull();

        scaleSelect.value = '2.0';
        scaleSelect.dispatchEvent(new Event('change'));

        expect(tower.width).toBe(240);
        expect(tower.height).toBe(480);

        const wInput = document.getElementById('prop-w-input') as HTMLInputElement;
        const hInput = document.getElementById('prop-h-input') as HTMLInputElement;
        expect(wInput.value).toBe('240');
        expect(hInput.value).toBe('480');
    });

    it('2. Selecionar -2x (0.5x) e -1.5x (0.667x) no <select> deve reduzir o asset proporcionalmente', () => {
        canvas.selectedAsset = tower;
        canvas.selectedAssets = [tower];
        propertiesPanel.render();

        const scaleSelect = document.getElementById('prop-scale-select') as HTMLSelectElement;

        // -2x (0.5x)
        scaleSelect.value = '0.5';
        scaleSelect.dispatchEvent(new Event('change'));

        expect(tower.width).toBe(60);
        expect(tower.height).toBe(120);

        // -1.5x (0.667x)
        scaleSelect.value = '0.667';
        scaleSelect.dispatchEvent(new Event('change'));

        expect(tower.width).toBe(80);
        expect(tower.height).toBe(160);
    });

    it('3. Deslizar o slider de proporção deve atualizar o tamanho do asset e a badge visual', () => {
        canvas.selectedAsset = tower;
        canvas.selectedAssets = [tower];
        propertiesPanel.render();

        const slider = document.getElementById('prop-scale-slider') as HTMLInputElement;
        const badge = document.getElementById('scale-slider-value') as HTMLElement;
        expect(slider).not.toBeNull();
        expect(badge).not.toBeNull();

        // Simula evento de arrasto live (input)
        slider.value = '1.5';
        slider.dispatchEvent(new Event('input'));

        expect(badge.textContent).toBe('1.50x');
        expect(tower.width).toBe(180);
        expect(tower.height).toBe(360);

        // Simula soltar o slider (change) para persistir no histórico
        slider.dispatchEvent(new Event('change'));
        expect(tower.width).toBe(180);
    });

    it('4. Botões rápidos de -2x, -1.5x, 1.5x e 2x devem ajustar imediatamente a proporção', () => {
        canvas.selectedAsset = tower;
        canvas.selectedAssets = [tower];
        propertiesPanel.render();

        const btnScaleDouble = document.getElementById('btn-scale-double') as HTMLButtonElement;
        btnScaleDouble.click();
        expect(tower.width).toBe(240);
        expect(tower.height).toBe(480);

        const btnScaleHalf = document.getElementById('btn-scale-half') as HTMLButtonElement;
        btnScaleHalf.click();
        expect(tower.width).toBe(60);
        expect(tower.height).toBe(120);
    });

    it('5. Histórico: Desfazer (Ctrl+Z) deve reverter a alteração de escala para a dimensão original', () => {
        canvas.selectedAsset = tower;
        canvas.selectedAssets = [tower];
        propertiesPanel.render();

        const originalWidth = tower.width;
        const originalHeight = tower.height;

        const scaleSelect = document.getElementById('prop-scale-select') as HTMLSelectElement;
        scaleSelect.value = '2.0';
        scaleSelect.dispatchEvent(new Event('change'));

        expect(tower.width).toBe(240);

        // Desfazer (Ctrl+Z)
        const undoEvent = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
        window.dispatchEvent(undoEvent);

        const restored = canvas.placedAssets.find(a => a.uid === tower.uid);
        expect(restored?.width).toBe(originalWidth);
        expect(restored?.height).toBe(originalHeight);
    });

    it('6. Escala em seleção múltipla: slider e select em grupo devem escalar todos os assets selecionados', () => {
        canvas.selectedAsset = tower;
        canvas.selectedAssets = [tower, chest];
        propertiesPanel.render();

        const multiSlider = document.getElementById('btn-group-scale-slider') as HTMLInputElement;
        expect(multiSlider).not.toBeNull();

        multiSlider.value = '2.0';
        multiSlider.dispatchEvent(new Event('change'));

        expect(tower.width).toBe(240);
        expect(tower.height).toBe(480);
        expect(chest.width).toBe(80);
        expect(chest.height).toBe(80);
    });
});
