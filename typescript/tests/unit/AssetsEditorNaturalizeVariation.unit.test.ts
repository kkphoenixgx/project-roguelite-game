// @vitest-environment jsdom
/**
 * @file AssetsEditorNaturalizeVariation.unit.test.ts
 * Testes unitários para o botão e funcionalidade de Naturalize (jitter/variação natural)
 * de posição em raio pequeno e leve variação proporcional de escala dos assets no Assets Editor.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorNaturalizeVariation (Unit Test)', () => {
    let mockMap: any;
    let tree1: PlacedAssetModel;
    let tree2: PlacedAssetModel;
    let rockLocked: PlacedAssetModel;
    let cottageUnselected: PlacedAssetModel;

    beforeEach(() => {
        document.body.innerHTML = '<div id="canvas-container"></div>';

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 5120,
            height: 5120,
            chunkSize: 1024,
            originChunk: { cx: 2, cy: 2 }
        };

        tree1 = {
            uid: 'tree_1',
            presetId: 'tree_pine',
            name: 'Pine Tree 1',
            x: 500,
            y: 500,
            width: 80,
            height: 128,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/tree_pine_clean.png',
            selected: false,
            isSprite: false
        };

        tree2 = {
            uid: 'tree_2',
            presetId: 'tree_pine',
            name: 'Pine Tree 2',
            x: 600,
            y: 500,
            width: 80,
            height: 128,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/tree_pine_clean.png',
            selected: false,
            isSprite: false
        };

        rockLocked = {
            uid: 'rock_locked',
            presetId: 'rock_mossy',
            name: 'Locked Rock',
            x: 700,
            y: 500,
            width: 100,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/rock_mossy_clean.png',
            selected: false,
            locked: true,
            isSprite: false
        };

        cottageUnselected = {
            uid: 'cottage_unselected',
            presetId: 'house_small_cottage',
            name: 'Unselected Cottage',
            x: 1000,
            y: 1000,
            width: 240,
            height: 238,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/house_small_cottage_clean.png',
            selected: false,
            isSprite: false
        };
    });

    it('1. deve deslocar a posição de cada asset selecionado dentro do raio máximo configurado', () => {
        const onAssetChanged = vi.fn();
        const canvas = new MapCanvas('canvas-container', mockMap, undefined, onAssetChanged);
        canvas.setPlacedAssets([tree1, tree2]);

        canvas.selectAll();

        const origX1 = tree1.x;
        const origY1 = tree1.y;
        const origX2 = tree2.x;
        const origY2 = tree2.y;

        const maxRadius = 15;
        canvas.naturalizeSelected(maxRadius, 0); // apenas deslocamento de posição

        const dist1 = Math.hypot(tree1.x - origX1, tree1.y - origY1);
        const dist2 = Math.hypot(tree2.x - origX2, tree2.y - origY2);

        // Cada asset deve ter se movido em uma distância menor ou igual a maxRadius + 1 (arredondamento)
        expect(dist1).toBeLessThanOrEqual(maxRadius + 1);
        expect(dist2).toBeLessThanOrEqual(maxRadius + 1);

        // Deve ter disparado a notificação de mudança
        expect(onAssetChanged).toHaveBeenCalled();
    });

    it('2. deve variar a escala suavemente respeitando o percentual máximo e preservando a proporção de aspecto (aspect ratio)', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([tree1]);
        canvas.selectAsset(tree1);

        const origW = tree1.width;
        const origH = tree1.height;
        const originalAspect = origW / origH;

        const maxScaleVariation = 0.12; // ±12%
        canvas.naturalizeSelected(0, maxScaleVariation); // apenas variação de escala

        // A largura e altura devem variar dentro do limite de ±15%
        expect(tree1.width).toBeGreaterThanOrEqual(Math.round(origW * (1 - maxScaleVariation - 0.02)));
        expect(tree1.width).toBeLessThanOrEqual(Math.round(origW * (1 + maxScaleVariation + 0.02)));

        // A proporção de aspecto deve ser preservada (margem mínima devido a Math.round em pixels)
        const newAspect = tree1.width / tree1.height;
        expect(Math.abs(newAspect - originalAspect)).toBeLessThan(0.05);

        // Deve marcar como custom scaled
        expect(tree1.isCustomScaled).toBe(true);
    });

    it('3. NÃO deve modificar assets marcados como locked nem assets fora da seleção', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([tree1, rockLocked, cottageUnselected]);

        // Seleciona tree1 e rockLocked
        canvas.selectedAssets = [tree1, rockLocked];
        tree1.selected = true;
        rockLocked.selected = true;

        const origRockX = rockLocked.x;
        const origRockY = rockLocked.y;
        const origRockW = rockLocked.width;

        const origCottageX = cottageUnselected.x;
        const origCottageY = cottageUnselected.y;

        canvas.naturalizeSelected(15, 0.15);

        // rockLocked deve continuar idêntico
        expect(rockLocked.x).toBe(origRockX);
        expect(rockLocked.y).toBe(origRockY);
        expect(rockLocked.width).toBe(origRockW);

        // cottageUnselected não estava selecionado, deve continuar idêntico
        expect(cottageUnselected.x).toBe(origCottageX);
        expect(cottageUnselected.y).toBe(origCottageY);
    });

    it('4. deve salvar no histórico permitindo desfazer (Undo) perfeitamente a naturalização', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([tree1]);
        canvas.selectAsset(tree1);

        const initialX = tree1.x;
        const initialY = tree1.y;
        const initialW = tree1.width;

        canvas.naturalizeSelected(16, 0.10);

        // Desfaz (Undo)
        canvas.undo();

        const revertedTree = canvas.placedAssets.find(a => a.uid === 'tree_1')!;
        expect(revertedTree.x).toBe(initialX);
        expect(revertedTree.y).toBe(initialY);
        expect(revertedTree.width).toBe(initialW);
    });
});
