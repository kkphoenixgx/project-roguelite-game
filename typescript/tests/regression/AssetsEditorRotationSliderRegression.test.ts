// @vitest-environment jsdom
/**
 * @file AssetsEditorRotationSliderRegression.test.ts
 * Testes de regressão para a interface de rotação (select, slider e botões em graus)
 * no PropertiesPanel do Assets Editor, além de atalhos de teclado (R / Shift+R),
 * proteção contra digitação em inputs e Undo/Redo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../../typescript/adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorRotationSliderRegression (Regression Test)', () => {
    let mockMap: any;
    let canvas: MapCanvas;
    let propertiesPanel: PropertiesPanel;
    let windmill: PlacedAssetModel;
    let crate: PlacedAssetModel;

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

        windmill = {
            uid: 'windmill_test',
            presetId: 'windmill_wood',
            name: 'Wooden Windmill',
            x: 500,
            y: 500,
            width: 140,
            height: 180,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/windmill.png',
            selected: false,
            isSprite: false
        };

        crate = {
            uid: 'crate_test',
            presetId: 'wooden_crate',
            name: 'Wooden Crate',
            x: 700,
            y: 500,
            width: 40,
            height: 40,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/crate.png',
            selected: false,
            isSprite: false
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        canvas.placedAssets = [windmill, crate];
        canvas.saveState();

        propertiesPanel = new PropertiesPanel(
            'properties-panel-container',
            canvas,
            undefined,
            undefined
        );
    });

    it('1. Selecionar ângulo no <select> de rotação deve girar o asset e atualizar o input numérico', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill];
        propertiesPanel.render();

        const rotSelect = document.getElementById('prop-rotation-select') as HTMLSelectElement;
        expect(rotSelect).not.toBeNull();

        rotSelect.value = '90';
        rotSelect.dispatchEvent(new Event('change'));

        expect(windmill.rotation).toBe(90);

        const rotInput = document.getElementById('prop-rot-input') as HTMLInputElement;
        expect(rotInput.value).toBe('90');
    });

    it('2. Deslizar o slider de rotação deve atualizar o ângulo live no asset e na badge de graus', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill];
        propertiesPanel.render();

        const slider = document.getElementById('prop-rotation-slider') as HTMLInputElement;
        const badge = document.getElementById('rotation-slider-value') as HTMLElement;
        expect(slider).not.toBeNull();
        expect(badge).not.toBeNull();

        slider.value = '180';
        slider.dispatchEvent(new Event('input'));

        expect(badge.textContent).toBe('180°');
        expect(windmill.rotation).toBe(180);

        slider.dispatchEvent(new Event('change'));
        expect(windmill.rotation).toBe(180);
    });

    it('3. Botões de giro rápido (+90°, -90°, +45°, -45°) e reset devem operar com precisão', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill];
        propertiesPanel.render();

        const btnPlus90 = document.getElementById('btn-rot-plus-90') as HTMLButtonElement;
        btnPlus90.click();
        expect(windmill.rotation).toBe(90);

        const btnPlus45 = document.getElementById('btn-rot-plus-45') as HTMLButtonElement;
        btnPlus45.click();
        expect(windmill.rotation).toBe(135);

        const btnMinus90 = document.getElementById('btn-rot-minus-90') as HTMLButtonElement;
        btnMinus90.click();
        expect(windmill.rotation).toBe(45);

        const btnReset = document.getElementById('btn-reset-rotation') as HTMLButtonElement;
        btnReset.click();
        expect(windmill.rotation).toBe(0);
    });

    it('4. Atalho de teclado R deve girar +90° e Shift+R deve girar -90°', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill];

        // Tecla R pura: +90°
        const rEvent = new KeyboardEvent('keydown', { key: 'r', shiftKey: false, bubbles: true });
        window.dispatchEvent(rEvent);
        expect(windmill.rotation).toBe(90);

        // Tecla Shift + R: -90°
        const shiftREvent = new KeyboardEvent('keydown', { key: 'r', shiftKey: true, bubbles: true });
        window.dispatchEvent(shiftREvent);
        expect(windmill.rotation).toBe(0);
    });

    it('5. Digitar tecla "r" dentro de um <input> NÃO deve rotacionar o asset selecionado', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill];

        const textInput = document.createElement('input');
        textInput.type = 'text';
        document.body.appendChild(textInput);
        textInput.focus();

        const event = new KeyboardEvent('keydown', { key: 'r', bubbles: true });
        window.dispatchEvent(event);

        expect(windmill.rotation).toBe(0);
    });

    it('6. Histórico: Desfazer (Ctrl+Z) deve reverter a rotação para o valor anterior', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill];
        propertiesPanel.render();

        const originalRot = windmill.rotation;

        const rotSelect = document.getElementById('prop-rotation-select') as HTMLSelectElement;
        rotSelect.value = '90';
        rotSelect.dispatchEvent(new Event('change'));
        expect(windmill.rotation).toBe(90);

        // Desfazer (Ctrl+Z)
        const undoEvent = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
        window.dispatchEvent(undoEvent);

        const restored = canvas.placedAssets.find(a => a.uid === windmill.uid);
        expect(restored?.rotation).toBe(originalRot);
    });

    it('7. Rotação em seleção múltipla: slider e select em grupo devem rotacionar todos os assets selecionados', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill, crate];
        propertiesPanel.render();

        const multiSlider = document.getElementById('btn-group-rotation-slider') as HTMLInputElement;
        expect(multiSlider).not.toBeNull();

        multiSlider.value = '180';
        multiSlider.dispatchEvent(new Event('change'));

        expect(windmill.rotation).toBe(180);
        expect(crate.rotation).toBe(180);
    });
});
