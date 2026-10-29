// @vitest-environment jsdom
/**
 * @file AssetsEditorScrollPreservationRegression.test.ts
 * Testes de regressão para certificar que a rolagem do menu lateral (scrollTop de .prop-scroll-body)
 * permanece inalterada quando o usuário interage com sliders de escala, rotação e botões rápidos.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../../typescript/adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorScrollPreservationRegression (Regression Test)', () => {
    let mockMap: any;
    let canvas: MapCanvas;
    let panel: PropertiesPanel;
    let windmill: PlacedAssetModel;

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
            uid: 'windmill_scroll_test',
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

        canvas = new MapCanvas('canvas-container', mockMap);
        canvas.placedAssets = [windmill];
        canvas.saveState();

        panel = new PropertiesPanel(
            'properties-panel-container',
            canvas,
            undefined,
            undefined
        );

        // Conecta o callback do canvas para re-renderizar o painel, reproduzindo fielmente o EditorApp
        canvas['onAssetChangedCallback'] = () => {
            panel.render();
        };
    });

    it('1. Alterar o slider de escala (change) NÃO deve resetar o scrollTop para 0', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill];
        panel.render();

        const scrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        expect(scrollBody).not.toBeNull();

        // Usuário rolou para baixo para alcançar os controles
        scrollBody.scrollTop = 320;

        const scaleSlider = document.getElementById('prop-scale-slider') as HTMLInputElement;
        expect(scaleSlider).not.toBeNull();

        scaleSlider.value = '1.5';
        scaleSlider.dispatchEvent(new Event('input'));
        scaleSlider.dispatchEvent(new Event('change'));

        const updatedScrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        expect(updatedScrollBody.scrollTop).toBe(320);
    });

    it('2. Alterar o slider de rotação (change) NÃO deve resetar o scrollTop para 0', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill];
        panel.render();

        const scrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        scrollBody.scrollTop = 410;

        const rotSlider = document.getElementById('prop-rotation-slider') as HTMLInputElement;
        expect(rotSlider).not.toBeNull();

        rotSlider.value = '90';
        rotSlider.dispatchEvent(new Event('input'));
        rotSlider.dispatchEvent(new Event('change'));

        const updatedScrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        expect(updatedScrollBody.scrollTop).toBe(410);
    });

    it('3. Clicar em botões de ajuste de escala e rotação deve preservar o scroll', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill];
        panel.render();

        const scrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        scrollBody.scrollTop = 275;

        // Clica no botão +90°
        const btnPlus90 = document.getElementById('btn-rot-plus-90') as HTMLButtonElement;
        btnPlus90.click();

        let updatedScrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        expect(updatedScrollBody.scrollTop).toBe(275);

        // Clica no botão 2x
        const btnDouble = document.getElementById('btn-scale-double') as HTMLButtonElement;
        btnDouble.click();

        updatedScrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        expect(updatedScrollBody.scrollTop).toBe(275);
    });

    it('4. Seleção múltipla: alterar slider de grupo deve preservar a rolagem', () => {
        canvas.selectedAsset = windmill;
        canvas.selectedAssets = [windmill, { ...windmill, uid: 'other_asset' }];
        panel.render();

        const scrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        scrollBody.scrollTop = 150;

        const multiSlider = document.getElementById('btn-group-scale-slider') as HTMLInputElement;
        expect(multiSlider).not.toBeNull();

        multiSlider.value = '2.0';
        multiSlider.dispatchEvent(new Event('change'));

        const updatedScrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        expect(updatedScrollBody.scrollTop).toBe(150);
    });
});
