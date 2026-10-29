// @vitest-environment jsdom
/**
 * @file AssetsEditorProportionalScaleSlider.unit.test.ts
 * Testes unitários para o redimensionamento proporcional via slider, select e botões
 * de multiplicador (-2x, -1.5x, 1.5x, 2x) no Assets Editor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorProportionalScaleSlider (Unit Test)', () => {
    let mockMap: any;
    let canvas: MapCanvas;
    let house: PlacedAssetModel;
    let fountain: PlacedAssetModel;
    let lockedProp: PlacedAssetModel;

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

        house = {
            uid: 'house_scale_test',
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

        fountain = {
            uid: 'fountain_scale_test',
            presetId: 'fountain_stone',
            name: 'Stone Fountain',
            x: 400,
            y: 300,
            width: 80,
            height: 80,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/fountain.png',
            selected: false,
            isSprite: false
        };

        lockedProp = {
            uid: 'locked_barrel',
            presetId: 'wooden_barrel',
            name: 'Locked Barrel',
            x: 50,
            y: 50,
            width: 40,
            height: 40,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/barrel.png',
            selected: false,
            locked: true,
            isSprite: false
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        canvas.placedAssets = [house, fountain, lockedProp];
    });

    it('1. Deve aumentar a proporção para 2x preservando estritamente o aspect ratio e o centro do asset', () => {
        canvas.selectedAsset = house;
        canvas.selectedAssets = [house];

        const initialCenterX = house.x + house.width / 2; // 200 + 50 = 250
        const initialCenterY = house.y + house.height / 2; // 300 + 75 = 375
        const initialAspect = house.width / house.height; // 100 / 150 = 0.6667

        canvas.setScaleSelected(2.0);

        expect(house.width).toBe(200);
        expect(house.height).toBe(300);
        expect(house.width / house.height).toBeCloseTo(initialAspect, 3);
        // O centro do asset no mundo não deve mudar
        expect(house.x + house.width / 2).toBe(initialCenterX);
        expect(house.y + house.height / 2).toBe(initialCenterY);
        expect(house.x).toBe(150);
        expect(house.y).toBe(225);
    });

    it('2. Deve reduzir a proporção para -2x (0.5x / metade) preservando aspect ratio e centro', () => {
        canvas.selectedAsset = house;
        canvas.selectedAssets = [house];

        const initialCenterX = house.x + house.width / 2; // 250
        const initialCenterY = house.y + house.height / 2; // 375

        canvas.setScaleSelected(0.5);

        expect(house.width).toBe(50);
        expect(house.height).toBe(75);
        expect(house.x + house.width / 2).toBe(initialCenterX);
        expect(Math.abs((house.y + house.height / 2) - initialCenterY)).toBeLessThanOrEqual(0.5);
        expect(house.x).toBe(225);
        expect(house.y).toBe(338); // Math.round(375 - 75/2) = 338
    });

    it('3. Deve aplicar escala 1.5x e -1.5x (0.667x) com consistência proporcional', () => {
        canvas.selectedAsset = house;
        canvas.selectedAssets = [house];

        // 1.5x
        canvas.setScaleSelected(1.5);
        expect(house.width).toBe(150);
        expect(house.height).toBe(225);

        // -1.5x (divisão por 1.5 ~= 0.667)
        canvas.setScaleSelected(1 / 1.5);
        expect(house.width).toBe(67);
        expect(house.height).toBe(101); // Math.round(67 / (100/150)) = 101
    });

    it('4. Deve escalar múltiplos assets mantendo a integridade do grupo e centro coletivo', () => {
        canvas.selectedAsset = house;
        canvas.selectedAssets = [house, fountain];

        const minX = Math.min(house.x, fountain.x);
        const maxX = Math.max(house.x + house.width, fountain.x + fountain.width);
        const groupCenterX = (minX + maxX) / 2;

        canvas.setScaleSelected(2.0);

        expect(house.width).toBe(200);
        expect(house.height).toBe(300);
        expect(fountain.width).toBe(160);
        expect(fountain.height).toBe(160);

        const newMinX = Math.min(house.x, fountain.x);
        const newMaxX = Math.max(house.x + house.width, fountain.x + fountain.width);
        expect((newMinX + newMaxX) / 2).toBe(groupCenterX);
    });

    it('5. Não deve modificar assets travados (locked: true)', () => {
        canvas.selectedAsset = lockedProp;
        canvas.selectedAssets = [lockedProp];

        canvas.setScaleSelected(2.0);

        expect(lockedProp.width).toBe(40);
        expect(lockedProp.height).toBe(40);
        expect(lockedProp.x).toBe(50);
        expect(lockedProp.y).toBe(50);
    });
});
