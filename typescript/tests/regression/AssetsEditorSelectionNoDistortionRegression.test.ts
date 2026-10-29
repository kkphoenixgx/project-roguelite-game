// @vitest-environment jsdom
/**
 * @file AssetsEditorSelectionNoDistortionRegression.test.ts
 * Teste de regressão para blindar contra o bug crítico no Assets Editor onde selecionar
 * um asset distorce, redimensiona ("ficam grandes") ou corrompe a exibição dos demais assets no canvas.
 *
 * Reproduz o cenário da issue:
 * "selecionar um assets e todos os assets bugarem e ficarem grandes (Screenshot From 2026-10-22 14-12-10.png)"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../../typescript/adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorSelectionNoDistortionRegression - Blindagem contra distorção ao selecionar asset', () => {
    let mockMap: any;

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
    });

    it('1. Selecionar um asset no canvas com zoom ativo não deve destruir o transform dos assets renderizados em seguida', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);

        // Cria múltiplos assets com diferentes Y para testar o loop com Y-Sorting
        const assetHigh = {
            uid: 'tree_1',
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
        } as PlacedAssetModel;

        const assetMid = {
            uid: 'house_1',
            presetId: 'house_bakery_rustic',
            name: 'House Bakery Rustic',
            x: -485,
            y: -465,
            width: 280,
            height: 273,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/house_bakery_rustic_anim.png',
            selected: false,
            isSprite: true,
            frameWidth: 280,
            frameHeight: 273,
            frameCount: 6
        } as PlacedAssetModel;

        const assetLow = {
            uid: 'house_2',
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
        } as PlacedAssetModel;

        canvas.setPlacedAssets([assetHigh, assetMid, assetLow]);

        // Simula zoom de 169% (exato do screenshot) e pan
        canvas.zoom = 1.69;
        canvas.panX = 350;
        canvas.panY = 400;

        // Seleciona o asset de menor Y (Tree Pine)
        canvas.selectAsset(assetHigh);
        expect(assetHigh.selected).toBe(true);

        // Mock de CanvasRenderingContext2D para inspecionar pilha de save/restore e transforms
        let stackDepth = 0;
        let minStackDepth = 0;
        const stackDepthHistory: number[] = [];

        const mockCtx = {
            canvas: canvas['canvas'],
            save: vi.fn(() => {
                stackDepth++;
                stackDepthHistory.push(stackDepth);
            }),
            restore: vi.fn(() => {
                stackDepth--;
                if (stackDepth < minStackDepth) {
                    minStackDepth = stackDepth;
                }
                stackDepthHistory.push(stackDepth);
            }),
            clearRect: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            rotate: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            setLineDash: vi.fn(),
            measureText: vi.fn(() => ({ width: 80 })),
            fillText: vi.fn(),
            drawImage: vi.fn()
        } as unknown as CanvasRenderingContext2D;

        canvas['ctx'] = mockCtx;

        // Executa a renderização completa com o asset selecionado
        canvas.render();

        // 1. A profundidade da pilha nunca deve sofrer underflow (menor que 0)
        expect(minStackDepth).toBeGreaterThanOrEqual(0);

        // 2. Ao final da renderização de um frame, a pilha deve estar exatamente balanceada (0)
        expect(stackDepth).toBe(0);

        // 3. Nenhum dos assets deve ter sofrido mutação em suas dimensões
        expect(assetHigh.width).toBe(80);
        expect(assetHigh.height).toBe(128);
        expect(assetMid.width).toBe(280);
        expect(assetMid.height).toBe(273);
        expect(assetLow.width).toBe(305);
        expect(assetLow.height).toBe(354);
    });

    it('2. Exibir e bindar o PropertiesPanel para um asset selecionado não deve disparar mutação colateral nem auto-save', () => {
        const onAssetChanged = vi.fn();
        const canvas = new MapCanvas('canvas-container', mockMap, undefined, onAssetChanged);

        const asset = {
            uid: 'boro_1',
            presetId: 'house_red_boro',
            name: 'House Red Boro',
            x: 200,
            y: 300,
            width: 305,
            height: 354,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/house_red_boro_anim.png',
            selected: true,
            isSprite: true,
            frameWidth: 305,
            frameHeight: 354,
            frameCount: 6
        } as PlacedAssetModel;

        canvas.setPlacedAssets([asset]);
        canvas.selectedAsset = asset;

        // Instancia o PropertiesPanel com o asset selecionado
        const panel = new PropertiesPanel('properties-panel', canvas);
        panel.render();

        // Nenhuma alteração deve ter sido salva apenas por abrir as propriedades
        expect(onAssetChanged).not.toHaveBeenCalled();

        // Dimensões e coordenadas devem permanecer 100% idênticas
        expect(asset.x).toBe(200);
        expect(asset.y).toBe(300);
        expect(asset.width).toBe(305);
        expect(asset.height).toBe(354);
    });

    it('3. Carregar imagem de spritesheet nunca deve inflar os assets colocados para o tamanho total da spritesheet', () => {
        const onAssetChanged = vi.fn();
        const canvas = new MapCanvas('canvas-container', mockMap, undefined, onAssetChanged);

        const boroAsset = {
            uid: 'boro_2',
            presetId: 'house_red_boro',
            name: 'House Red Boro',
            x: 100,
            y: 100,
            width: 305,
            height: 354,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/house_red_boro_anim.png',
            selected: true,
            isSprite: true,
            frameWidth: 305,
            frameHeight: 354,
            frameCount: 6
        } as PlacedAssetModel;

        canvas.setPlacedAssets([boroAsset]);

        // Simula imagem natural de 1830px (6 frames de 305px)
        const mockImg = {
            complete: true,
            naturalWidth: 1830,
            naturalHeight: 354
        } as HTMLImageElement;

        (canvas as any).syncPlacedAssetsWithNaturalImage(boroAsset.imageSrc, mockImg);

        // Largura deve continuar 305px (frame width), NUNCA 1830px!
        expect(boroAsset.width).toBe(305);
        expect(boroAsset.height).toBe(354);
        expect(boroAsset.x).toBe(100);
        expect(boroAsset.y).toBe(100);
        expect(onAssetChanged).not.toHaveBeenCalled();
    });
});
