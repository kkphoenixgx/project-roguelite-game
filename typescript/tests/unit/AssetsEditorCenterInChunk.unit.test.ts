// @vitest-environment jsdom
/**
 * @file AssetsEditorCenterInChunk.unit.test.ts
 * Testes unitários para o botão e funcionalidade de Centralizar com o Chunk
 * para seleção individual e múltipla no Assets Editor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorCenterInChunk (Unit Test)', () => {
    let mockMap: any;
    let canvas: MapCanvas;
    let house: PlacedAssetModel;
    let well: PlacedAssetModel;
    let lockedBench: PlacedAssetModel;

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
            uid: 'house_1',
            presetId: 'cottage_wood',
            name: 'Cottage Wood',
            x: 100,
            y: 200,
            width: 200,
            height: 150,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/cottage.png',
            selected: false,
            isSprite: false
        };

        well = {
            uid: 'well_1',
            presetId: 'stone_well',
            name: 'Stone Well',
            x: 350,
            y: 200,
            width: 50,
            height: 50,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/well.png',
            selected: false,
            isSprite: false
        };

        lockedBench = {
            uid: 'bench_locked',
            presetId: 'wooden_bench',
            name: 'Locked Bench',
            x: 80,
            y: 80,
            width: 60,
            height: 30,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/bench.png',
            selected: false,
            locked: true,
            isSprite: false
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        canvas.placedAssets = [house, well, lockedBench];
    });

    it('1. Deve centralizar um asset individual com precisão no centro exato do seu chunk', () => {
        // Asset no chunk [0..1024, 0..1024]
        house.x = 100;
        house.y = 200;
        house.width = 200;
        house.height = 100;
        canvas.selectedAsset = house;
        canvas.selectedAssets = [house];

        canvas.centerSelectedInChunk();

        // Centro do chunk é (512, 512).
        // Centro do asset deve ser 512, 512.
        // house.x = 512 - 200/2 = 412
        // house.y = 512 - 100/2 = 462
        expect(house.x).toBe(412);
        expect(house.y).toBe(462);
        expect(house.x + house.width / 2).toBe(512);
        expect(house.y + house.height / 2).toBe(512);
    });

    it('2. Deve centralizar corretamente em chunks com coordenadas de mundo negativas', () => {
        // Posicionado no chunk Oeste ([-1024..0, 0..1024])
        // Centro do chunk Oeste: X = -512, Y = 512
        house.x = -850;
        house.y = 120;
        house.width = 120;
        house.height = 80;
        canvas.selectedAsset = house;
        canvas.selectedAssets = [house];

        canvas.centerSelectedInChunk();

        expect(house.x + house.width / 2).toBe(-512);
        expect(house.y + house.height / 2).toBe(512);
        expect(house.x).toBe(-572);
        expect(house.y).toBe(472);
    });

    it('3. Deve centralizar uma seleção múltipla no chunk mantendo o espaçamento relativo entre os objetos', () => {
        // Seleção múltipla de house e well
        house.x = 100;
        house.y = 100;
        house.width = 100;
        house.height = 100; // bounds: [100..200, 100..200]

        well.x = 300;
        well.y = 200;
        well.width = 100;
        well.height = 100; // bounds: [300..400, 200..300]

        // Bounding box coletiva:
        // minX = 100, maxX = 400 -> groupCenterX = 250, groupWidth = 300
        // minY = 100, maxY = 300 -> groupCenterY = 200, groupHeight = 200
        // Chunk alvo: [0..1024, 0..1024] -> targetCenter = (512, 512)
        // dx = 512 - 250 = 262
        // dy = 512 - 200 = 312
        canvas.selectedAssets = [house, well];
        canvas.selectedAsset = house;

        const initialRelativeDistanceX = well.x - house.x; // 200
        const initialRelativeDistanceY = well.y - house.y; // 100

        canvas.centerSelectedInChunk();

        expect(house.x).toBe(100 + 262); // 362
        expect(house.y).toBe(100 + 312); // 412
        expect(well.x).toBe(300 + 262); // 562
        expect(well.y).toBe(200 + 312); // 512

        // A distância relativa entre eles deve ser idêntica
        expect(well.x - house.x).toBe(initialRelativeDistanceX);
        expect(well.y - house.y).toBe(initialRelativeDistanceY);

        // O centro da nova bounding box deve ser exatamente (512, 512)
        const newMinX = house.x;
        const newMaxX = well.x + well.width;
        const newMinY = house.y;
        const newMaxY = well.y + well.height;
        expect((newMinX + newMaxX) / 2).toBe(512);
        expect((newMinY + newMaxY) / 2).toBe(512);
    });

    it('4. Não deve movimentar assets com propriedade locked ativada', () => {
        canvas.selectedAsset = lockedBench;
        canvas.selectedAssets = [lockedBench];

        const initialX = lockedBench.x;
        const initialY = lockedBench.y;

        canvas.centerSelectedInChunk();

        expect(lockedBench.x).toBe(initialX);
        expect(lockedBench.y).toBe(initialY);
    });
});
