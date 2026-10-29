// @vitest-environment jsdom
/**
 * @file AssetsEditorScrollPreservation.unit.test.ts
 * Testes unitários para garantir a preservação do scrollTop do painel de propriedades
 * durante ajustes de sliders, selects e atualizações de modelo no Assets Editor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../../typescript/adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorScrollPreservation (Unit Test)', () => {
    let mockMap: any;
    let canvas: MapCanvas;
    let panel: PropertiesPanel;
    let asset1: PlacedAssetModel;
    let asset2: PlacedAssetModel;

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

        asset1 = {
            uid: 'asset_scroll_1',
            presetId: 'house_wood_boro',
            name: 'Wood Cottage',
            x: 200,
            y: 300,
            width: 100,
            height: 150,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/house.png',
            selected: false,
            isSprite: false
        };

        asset2 = {
            uid: 'asset_scroll_2',
            presetId: 'stone_well',
            name: 'Stone Well',
            x: 500,
            y: 500,
            width: 60,
            height: 60,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/well.png',
            selected: false,
            isSprite: false
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        canvas.placedAssets = [asset1, asset2];

        panel = new PropertiesPanel(
            'properties-panel-container',
            canvas,
            undefined,
            undefined
        );
    });

    it('1. Deve preservar o scrollTop de .prop-scroll-body quando render() for invocado para o mesmo asset', () => {
        canvas.selectedAsset = asset1;
        canvas.selectedAssets = [asset1];
        panel.render();

        const scrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        expect(scrollBody).not.toBeNull();

        // Simula o usuário rolando o painel para baixo até 180px
        scrollBody.scrollTop = 180;

        // Renderiza novamente (ex: após commit de alteração)
        panel.render();

        const newScrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        expect(newScrollBody.scrollTop).toBe(180);
    });

    it('2. Live Dragging: setScaleSelected com commitToHistory=false não deve disparar onAssetChangedCallback', () => {
        let callbackFired = false;
        canvas['onAssetChangedCallback'] = () => {
            callbackFired = true;
        };

        canvas.selectedAsset = asset1;
        canvas.selectedAssets = [asset1];

        // Simulando arrasto live do slider
        canvas.setScaleSelected(1.5, false);

        expect(callbackFired).toBe(false);
        expect(asset1.width).toBe(150);

        // Ao soltar o slider (commitToHistory=true) o callback deve disparar
        canvas.setScaleSelected(1.5, true);
        expect(callbackFired).toBe(true);
    });

    it('3. Live Dragging: setRotationSelected com commitToHistory=false não deve disparar onAssetChangedCallback', () => {
        let callbackFired = false;
        canvas['onAssetChangedCallback'] = () => {
            callbackFired = true;
        };

        canvas.selectedAsset = asset1;
        canvas.selectedAssets = [asset1];

        // Simulando arrasto live do slider de rotação
        canvas.setRotationSelected(90, false);

        expect(callbackFired).toBe(false);
        expect(asset1.rotation).toBe(90);

        // Ao soltar o slider (commitToHistory=true) o callback deve disparar
        canvas.setRotationSelected(90, true);
        expect(callbackFired).toBe(true);
    });

    it('4. Deve resetar o scrollTop ao alternar para um asset diferente', () => {
        canvas.selectedAsset = asset1;
        canvas.selectedAssets = [asset1];
        panel.render();

        let scrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        scrollBody.scrollTop = 220;

        // Seleciona um asset diferente
        canvas.selectedAsset = asset2;
        canvas.selectedAssets = [asset2];
        panel.render();

        scrollBody = document.querySelector('.prop-scroll-body') as HTMLElement;
        expect(scrollBody.scrollTop).toBe(0);
    });
});
