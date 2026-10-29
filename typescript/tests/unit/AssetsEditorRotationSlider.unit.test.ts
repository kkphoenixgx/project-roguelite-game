// @vitest-environment jsdom
/**
 * @file AssetsEditorRotationSlider.unit.test.ts
 * Testes unitários para o controle de rotação com slider, select e botões em graus
 * no Assets Editor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorRotationSlider (Unit Test)', () => {
    let mockMap: any;
    let canvas: MapCanvas;
    let tree: PlacedAssetModel;
    let torch: PlacedAssetModel;
    let lockedSign: PlacedAssetModel;

    beforeEach(() => {
        document.body.innerHTML = '<div id="canvas-container"></div>';

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            originChunk: { cx: 1, cy: 1 }
        };

        tree = {
            uid: 'tree_rot_test',
            presetId: 'tree_oak',
            name: 'Oak Tree',
            x: 200,
            y: 200,
            width: 80,
            height: 120,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/tree.png',
            selected: false,
            isSprite: false
        };

        torch = {
            uid: 'torch_rot_test',
            presetId: 'torch_wall',
            name: 'Wall Torch',
            x: 350,
            y: 200,
            width: 32,
            height: 64,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/torch.png',
            selected: false,
            isSprite: false
        };

        lockedSign = {
            uid: 'sign_locked',
            presetId: 'signpost_wood',
            name: 'Locked Signpost',
            x: 100,
            y: 100,
            width: 48,
            height: 48,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/sign.png',
            selected: false,
            locked: true,
            isSprite: false
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        canvas.placedAssets = [tree, torch, lockedSign];
    });

    it('1. Deve definir ângulos absolutos específicos em graus (45°, 90°, 180°, 270°)', () => {
        canvas.selectedAsset = tree;
        canvas.selectedAssets = [tree];

        canvas.setRotationSelected(90);
        expect(tree.rotation).toBe(90);

        canvas.setRotationSelected(180);
        expect(tree.rotation).toBe(180);

        canvas.setRotationSelected(270);
        expect(tree.rotation).toBe(270);

        canvas.setRotationSelected(45);
        expect(tree.rotation).toBe(45);
    });

    it('2. Deve girar por incremento e decremento relativo (+90°, -90°, +45°, -45°)', () => {
        canvas.selectedAsset = tree;
        canvas.selectedAssets = [tree];
        tree.rotation = 0;

        canvas.rotateSelectedBy(90);
        expect(tree.rotation).toBe(90);

        canvas.rotateSelectedBy(45);
        expect(tree.rotation).toBe(135);

        canvas.rotateSelectedBy(-90);
        expect(tree.rotation).toBe(45);

        // Giro negativo cruzando o 0° deve voltar para 315°
        canvas.rotateSelectedBy(-90);
        expect(tree.rotation).toBe(315);
    });

    it('3. Deve aplicar rotação a múltiplos assets selecionados', () => {
        canvas.selectedAsset = tree;
        canvas.selectedAssets = [tree, torch];

        canvas.setRotationSelected(180);

        expect(tree.rotation).toBe(180);
        expect(torch.rotation).toBe(180);

        canvas.rotateSelectedBy(90);
        expect(tree.rotation).toBe(270);
        expect(torch.rotation).toBe(270);
    });

    it('4. Não deve rotacionar assets travados (locked: true)', () => {
        canvas.selectedAsset = lockedSign;
        canvas.selectedAssets = [lockedSign];

        canvas.setRotationSelected(90);
        expect(lockedSign.rotation).toBe(0);

        canvas.rotateSelectedBy(45);
        expect(lockedSign.rotation).toBe(0);
    });
});
