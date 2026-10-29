// @vitest-environment jsdom
/**
 * @file AssetsEditorMarqueeSelectionClipboard.unit.test.ts
 * Testes unitários para a ferramenta de seleção em área estilo desktop (Marquee Selection),
 * seleção múltipla, clipboard (Ctrl+C, Ctrl+V) e operações em lote no Assets Editor.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorMarqueeSelectionClipboard (Unit Test)', () => {
    let mockMap: any;
    let assetA: PlacedAssetModel;
    let assetB: PlacedAssetModel;
    let assetC: PlacedAssetModel;

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

        assetA = {
            uid: 'asset_a',
            presetId: 'house_small_cottage',
            name: 'Cottage A',
            x: 100,
            y: 100,
            width: 240,
            height: 238,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/house_small_cottage_clean.png',
            selected: false,
            isSprite: false
        };

        assetB = {
            uid: 'asset_b',
            presetId: 'stone_well',
            name: 'Well B',
            x: 400,
            y: 100,
            width: 60,
            height: 66,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/stone_well_clean.png',
            selected: false,
            isSprite: false
        };

        assetC = {
            uid: 'asset_c',
            presetId: 'tree_pine',
            name: 'Tree C',
            x: 1500,
            y: 1500,
            width: 80,
            height: 128,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/tree_pine_clean.png',
            selected: false,
            isSprite: false
        };
    });

    it('1. deve selecionar múltiplos assets contidos ou intersectados pela caixa de seleção em área (Marquee Selection)', () => {
        const onAssetSelected = vi.fn();
        const canvas = new MapCanvas('canvas-container', mockMap, onAssetSelected);
        canvas.panX = 0;
        canvas.panY = 0;
        canvas.zoom = 1;
        canvas.setPlacedAssets([assetA, assetB, assetC]);

        // Define caixa de seleção abrangendo assetA (100, 100, 240, 238) e assetB (400, 100, 60, 66)
        canvas.boxSelectStartScreenX = 50;
        canvas.boxSelectStartScreenY = 50;
        canvas.boxSelectCurrentScreenX = 500;
        canvas.boxSelectCurrentScreenY = 400;

        canvas.updateBoxSelection(false);

        expect(canvas.selectedAssets.length).toBe(2);
        expect(canvas.selectedAssets.map(a => a.uid)).toContain('asset_a');
        expect(canvas.selectedAssets.map(a => a.uid)).toContain('asset_b');
        expect(canvas.selectedAssets.map(a => a.uid)).not.toContain('asset_c');

        expect(assetA.selected).toBe(true);
        expect(assetB.selected).toBe(true);
        expect(assetC.selected).toBe(false);
    });

    it('2. deve suportar seleção aditiva com isAdditive=true preservando seleções anteriores', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.panX = 0;
        canvas.panY = 0;
        canvas.zoom = 1;
        canvas.setPlacedAssets([assetA, assetB, assetC]);

        // Primeira seleção: apenas assetA
        canvas.selectAsset(assetA);
        expect(canvas.selectedAssets.length).toBe(1);

        // Segunda seleção em área cobrindo assetC com shift/aditivo
        canvas.boxSelectStartScreenX = 1450;
        canvas.boxSelectStartScreenY = 1450;
        canvas.boxSelectCurrentScreenX = 1600;
        canvas.boxSelectCurrentScreenY = 1650;

        canvas.updateBoxSelection(true);

        expect(canvas.selectedAssets.length).toBe(2);
        expect(canvas.selectedAssets.some(a => a.uid === 'asset_a')).toBe(true);
        expect(canvas.selectedAssets.some(a => a.uid === 'asset_c')).toBe(true);
    });

    it('3. deve copiar (Ctrl+C) e colar (Ctrl+V) o grupo de assets selecionados preservando posições relativas', () => {
        const onAssetChanged = vi.fn();
        const canvas = new MapCanvas('canvas-container', mockMap, undefined, onAssetChanged);
        canvas.panX = 0;
        canvas.panY = 0;
        canvas.zoom = 1;
        canvas.setPlacedAssets([assetA, assetB, assetC]);

        // Seleciona assetA e assetB
        canvas.boxSelectStartScreenX = 50;
        canvas.boxSelectStartScreenY = 50;
        canvas.boxSelectCurrentScreenX = 500;
        canvas.boxSelectCurrentScreenY = 400;
        canvas.updateBoxSelection(false);

        // Executa Copiar (Ctrl+C)
        canvas.copySelected();
        expect(canvas.clipboardAssets.length).toBe(2);
        expect(canvas.clipboardAssets[0]!.uid).toBe(assetA.uid);
        expect(canvas.clipboardAssets[1]!.uid).toBe(assetB.uid);

        // Define posição do cursor do mouse no mundo
        canvas.lastMouseWorldPos = { x: 800, y: 800 };

        // Executa Colar (Ctrl+V)
        canvas.paste();

        // O total de assets deve ter passado de 3 para 5
        expect(canvas.placedAssets.length).toBe(5);

        // Os novos assets colados devem estar selecionados
        expect(canvas.selectedAssets.length).toBe(2);
        const pastedA = canvas.selectedAssets.find(a => a.presetId === 'house_small_cottage')!;
        const pastedB = canvas.selectedAssets.find(a => a.presetId === 'stone_well')!;

        expect(pastedA).toBeDefined();
        expect(pastedB).toBeDefined();

        // Devem possuir novos UIDs únicos
        expect(pastedA.uid).not.toBe(assetA.uid);
        expect(pastedB.uid).not.toBe(assetB.uid);

        // Distância relativa original entre A e B: (400 - 100) = 300px em X
        expect(pastedB.x - pastedA.x).toBe(assetB.x - assetA.x);
        expect(pastedB.y - pastedA.y).toBe(assetB.y - assetA.y);

        expect(onAssetChanged).toHaveBeenCalled();
    });

    it('4. deve apagar em lote (Delete/Backspace) todos os assets atualmente selecionados', () => {
        const onAssetChanged = vi.fn();
        const canvas = new MapCanvas('canvas-container', mockMap, undefined, onAssetChanged);
        canvas.panX = 0;
        canvas.panY = 0;
        canvas.zoom = 1;
        canvas.setPlacedAssets([assetA, assetB, assetC]);

        // Seleciona A e B
        canvas.boxSelectStartScreenX = 50;
        canvas.boxSelectStartScreenY = 50;
        canvas.boxSelectCurrentScreenX = 500;
        canvas.boxSelectCurrentScreenY = 400;
        canvas.updateBoxSelection(false);

        canvas.deleteSelected();

        expect(canvas.placedAssets.length).toBe(1);
        expect(canvas.placedAssets[0]!.uid).toBe('asset_c');
        expect(canvas.selectedAssets.length).toBe(0);
        expect(canvas.selectedAsset).toBeNull();
        expect(onAssetChanged).toHaveBeenCalled();
    });

    it('5. deve duplicar em lote (Ctrl+D) múltiplos assets com offset de 32px', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([assetA, assetB]);

        canvas.selectAll();
        expect(canvas.selectedAssets.length).toBe(2);

        canvas.duplicateSelected();

        expect(canvas.placedAssets.length).toBe(4);
        expect(canvas.selectedAssets.length).toBe(2);

        const dupA = canvas.selectedAssets.find(a => a.presetId === 'house_small_cottage')!;
        expect(dupA.x).toBe(assetA.x + 32);
        expect(dupA.y).toBe(assetA.y + 32);
    });

    it('6. deve alternar espelhamento (Flip X / Flip Y) em lote para todos os assets selecionados', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([assetA, assetB]);

        canvas.selectAll();
        canvas.flipSelectedX();

        expect(assetA.flipX).toBe(true);
        expect(assetB.flipX).toBe(true);

        canvas.flipSelectedY();
        expect(assetA.flipY).toBe(true);
        expect(assetB.flipY).toBe(true);
    });
});
