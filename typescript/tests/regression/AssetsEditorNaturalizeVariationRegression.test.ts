// @vitest-environment jsdom
/**
 * @file AssetsEditorNaturalizeVariationRegression.test.ts
 * Blindagem de regressão para o botão e atalho de Naturalize (Tecla N) e sua integração
 * com o painel de propriedades e proteção contra disparos acidentais durante digitação.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../../typescript/adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorNaturalizeVariationRegression (Regression)', () => {
    let mockMap: any;
    let shrub1: PlacedAssetModel;
    let shrub2: PlacedAssetModel;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="canvas-container"></div>
            <div id="properties-panel"></div>
        `;

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 5120,
            height: 5120,
            chunkSize: 1024,
            originChunk: { cx: 2, cy: 2 }
        };

        shrub1 = {
            uid: 'shrub_1',
            presetId: 'bush_flowering',
            name: 'Flowering Bush 1',
            x: 300,
            y: 300,
            width: 70,
            height: 60,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/bush_flowering_clean.png',
            selected: false,
            isSprite: false
        };

        shrub2 = {
            uid: 'shrub_2',
            presetId: 'bush_flowering',
            name: 'Flowering Bush 2',
            x: 400,
            y: 300,
            width: 70,
            height: 60,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/bush_flowering_clean.png',
            selected: false,
            isSprite: false
        };
    });

    it('1. deve acionar a naturalização via atalho de teclado N quando houver assets selecionados', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([shrub1, shrub2]);
        canvas.selectAll();

        const origX1 = shrub1.x;
        const origY1 = shrub1.y;

        // Dispara evento keydown com tecla 'n'
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));

        // A posição ou dimensão deve ter sido modificada pela naturalização
        const movedOrScaled = shrub1.x !== origX1 || shrub1.y !== origY1 || shrub1.width !== 70;
        expect(movedOrScaled).toBe(true);
    });

    it('2. NÃO deve acionar a naturalização se o usuário estiver digitando a letra N em um campo de texto', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([shrub1]);
        canvas.selectAsset(shrub1);

        const origX = shrub1.x;
        const origY = shrub1.y;
        const origW = shrub1.width;

        // Cria input no documento e foca
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        expect(document.activeElement).toBe(input);

        // Digita 'n' no campo
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));

        // O asset NÃO deve ter sofrido nenhuma alteração
        expect(shrub1.x).toBe(origX);
        expect(shrub1.y).toBe(origY);
        expect(shrub1.width).toBe(origW);
    });

    it('3. deve disponibilizar botão de naturalizar na seleção individual do PropertiesPanel', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([shrub1]);
        canvas.selectAsset(shrub1);

        const panel = new PropertiesPanel('properties-panel', canvas);
        panel.render();

        const panelElement = document.getElementById('properties-panel')!;
        const btnNat = panelElement.querySelector('#btn-naturalize-asset') as HTMLButtonElement;
        expect(btnNat).not.toBeNull();
        expect(btnNat.textContent).toContain('Naturalizar');

        const origX = shrub1.x;
        const origY = shrub1.y;

        // Clica no botão
        btnNat.click();

        const altered = shrub1.x !== origX || shrub1.y !== origY || shrub1.width !== 70;
        expect(altered).toBe(true);
    });

    it('4. deve disponibilizar botão de naturalizar na seleção múltipla do PropertiesPanel', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([shrub1, shrub2]);
        canvas.selectAll();

        const panel = new PropertiesPanel('properties-panel', canvas);
        panel.render();

        const panelElement = document.getElementById('properties-panel')!;
        const btnGroupNat = panelElement.querySelector('#btn-group-naturalize') as HTMLButtonElement;
        expect(btnGroupNat).not.toBeNull();
        expect(btnGroupNat.textContent).toContain('Naturalizar Posição & Escala');

        const origX1 = shrub1.x;
        const origX2 = shrub2.x;

        // Clica no botão de grupo
        btnGroupNat.click();

        const altered = shrub1.x !== origX1 || shrub2.x !== origX2 || shrub1.width !== 70 || shrub2.width !== 70;
        expect(altered).toBe(true);
    });
});
