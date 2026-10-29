// @vitest-environment jsdom
/**
 * @file AssetsEditorSelectionStability.unit.test.ts
 * Testes unitários para garantir a estabilidade da seleção de assets no MapCanvas do Assets Editor.
 * Assegura que selecionar um asset seja uma operação pura, sem efeitos colaterais em dimensões,
 * coordenadas ou na pilha de transformações gráficas (save/restore) do Canvas 2D.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorSelectionStability - Testes Unitários de Seleção e Renderização', () => {
    let mockMap: any;
    let placed1: PlacedAssetModel;
    let placed2: PlacedAssetModel;
    let placed3: PlacedAssetModel;

    beforeEach(() => {
        // Setup do DOM para Canvas
        document.body.innerHTML = '<div id="canvas-container"></div>';

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 5120,
            height: 5120,
            chunkSize: 1024,
            originChunk: { cx: 2, cy: 2 }
        };

        placed1 = {
            uid: 'asset_1',
            presetId: 'house_red_boro',
            name: 'House Red Boro',
            x: 100,
            y: 200,
            width: 305,
            height: 354,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/house_red_boro_anim.png',
            selected: false,
            isSprite: true,
            frameWidth: 305,
            frameHeight: 354,
            frameCount: 6
        };

        placed2 = {
            uid: 'asset_2',
            presetId: 'tree_pine',
            name: 'Tree Pine',
            x: -904,
            y: -874,
            width: 80,
            height: 128,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/tree_pine_anim.png',
            selected: false,
            isSprite: true,
            frameWidth: 80,
            frameHeight: 128,
            frameCount: 4
        };

        placed3 = {
            uid: 'asset_3',
            presetId: 'stone_wall_corner',
            name: 'Stone Wall Corner',
            x: -1100,
            y: -1501,
            width: 208,
            height: 167,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/stone_wall_corner.png',
            selected: false,
            isSprite: false
        };
    });

    it('1. selectAsset deve ser estritamente pura e manter 100% inalteradas as propriedades de todos os assets', () => {
        const onAssetChanged = vi.fn();
        const onAssetSelected = vi.fn();

        const canvas = new MapCanvas(
            'canvas-container',
            mockMap,
            onAssetSelected,
            onAssetChanged
        );

        canvas.setPlacedAssets([placed1, placed2, placed3]);

        // Guarda snapshot dos valores antes da seleção
        const snapshot1 = { ...placed1 };
        const snapshot2 = { ...placed2 };
        const snapshot3 = { ...placed3 };

        // Seleciona o asset 2 (Tree Pine)
        canvas.selectAsset(placed2);

        expect(canvas.selectedAsset).toBe(placed2);
        expect(placed2.selected).toBe(true);
        expect(placed1.selected).toBe(false);
        expect(placed3.selected).toBe(false);

        // Verifica que NENHUMA dimensão ou coordenada foi mutada
        expect(placed1.x).toBe(snapshot1.x);
        expect(placed1.y).toBe(snapshot1.y);
        expect(placed1.width).toBe(snapshot1.width);
        expect(placed1.height).toBe(snapshot1.height);

        expect(placed2.x).toBe(snapshot2.x);
        expect(placed2.y).toBe(snapshot2.y);
        expect(placed2.width).toBe(snapshot2.width);
        expect(placed2.height).toBe(snapshot2.height);

        expect(placed3.x).toBe(snapshot3.x);
        expect(placed3.y).toBe(snapshot3.y);
        expect(placed3.width).toBe(snapshot3.width);
        expect(placed3.height).toBe(snapshot3.height);

        // Deve invocar onAssetSelectedCallback, mas NUNCA onAssetChangedCallback (sem autosave colateral)
        expect(onAssetSelected).toHaveBeenCalledWith(placed2);
        expect(onAssetChanged).not.toHaveBeenCalled();
    });

    it('2. drawSelectedBoundingBox deve balancear perfeitamente ctx.save() e ctx.restore()', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([placed1, placed2]);
        canvas.selectAsset(placed2);

        let saveCount = 0;
        let restoreCount = 0;

        const mockCtx = {
            save: vi.fn(() => { saveCount++; }),
            restore: vi.fn(() => { restoreCount++; }),
            strokeStyle: '',
            lineWidth: 1,
            setLineDash: vi.fn(),
            strokeRect: vi.fn(),
            fillStyle: '',
            fillRect: vi.fn(),
            font: '',
            measureText: vi.fn(() => ({ width: 100 })),
            fillText: vi.fn()
        } as unknown as CanvasRenderingContext2D;

        (canvas as any).drawSelectedBoundingBox(mockCtx, placed2);

        expect(mockCtx.save).toHaveBeenCalledTimes(1);
        expect(mockCtx.restore).toHaveBeenCalledTimes(1);
        expect(saveCount).toBe(restoreCount);
    });

    it('3. syncPlacedAssetsWithNaturalImage não deve inflar sprites para a largura total da spritesheet', () => {
        const onAssetChanged = vi.fn();
        const canvas = new MapCanvas('canvas-container', mockMap, undefined, onAssetChanged);
        canvas.setPlacedAssets([placed1]);

        // Simula o carregamento da imagem completa do sprite house_red_boro (6 frames * 305 = 1830px)
        const mockImg = {
            complete: true,
            naturalWidth: 1830,
            naturalHeight: 354
        } as HTMLImageElement;

        (canvas as any).syncPlacedAssetsWithNaturalImage(placed1.imageSrc, mockImg);

        // Deve calcular 1830 / 6 = 305px e NÃO 1830px!
        expect(placed1.width).toBe(305);
        expect(placed1.height).toBe(354);
        expect(placed1.x).toBe(100);
        expect(placed1.y).toBe(200);
        // Como as dimensões já eram 305x354, não deve disparar callback de alteração desnecessária
        expect(onAssetChanged).not.toHaveBeenCalled();
    });
});
