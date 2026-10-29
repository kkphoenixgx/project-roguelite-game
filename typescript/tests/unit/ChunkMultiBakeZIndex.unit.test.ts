/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapCanvas } from '../../adapters/assets-adapter/Components/MapCanvas';
import type { SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';
import type { PlacedAssetModel } from '../../adapters/assets-adapter/Models/PlacedAssetModel';

describe('ChunkMultiBakeZIndex (Unit Tests)', () => {
    let mockVilgemConfig: SelectedMapConfig;
    let drawCalls: string[];

    beforeEach(() => {
        drawCalls = [];

        HTMLCanvasElement.prototype.getContext = (() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            drawImage: vi.fn((img: any) => {
                const src = img?.src || 'unknown_src';
                drawCalls.push(src);
            }),
            arc: vi.fn(),
            fill: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn(() => ({ width: 80 })),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
        } as unknown as CanvasRenderingContext2D)) as any;

        HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockBakedDataUrl');

        document.body.innerHTML = '<div id="canvas-container" style="width: 1024px; height: 768px;"></div>';

        mockVilgemConfig = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            chunks: [
                ['chunk_0_0.png', 'chunk_1_0.png', 'chunk_2_0.png'],
                ['chunk_0_1.png', 'chunk_1_1.png', 'chunk_2_1.png'],
                ['chunk_0_2.png', 'chunk_1_2.png', 'chunk_2_2.png']
            ],
            originChunk: { cx: 1, cy: 1 }
        };
    });

    it('deve retornar falha amigável se nenhum asset for fornecido para bake', async () => {
        const canvas = new MapCanvas('canvas-container', mockVilgemConfig);
        const result = await canvas.bakeMultipleAssetsToChunkBackground([]);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Nenhum asset selecionado');
    });

    it('deve renderizar múltiplos assets selecionados respeitando rigorosamente a ordem crescente de Z-Index', async () => {
        const canvas = new MapCanvas('canvas-container', mockVilgemConfig);

        // Três trechos de estrada sobrepostos na mesma área
        const roadLayerBottom: PlacedAssetModel = {
            uid: 'road_bottom',
            presetId: 'road_dirt_base',
            name: 'Estrada Base',
            x: 100,
            y: 100,
            width: 80,
            height: 80,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: -50,
            imageSrc: '/assets/scenery/roads/dirt_base.png'
        };

        const roadLayerMiddle: PlacedAssetModel = {
            uid: 'road_middle',
            presetId: 'road_dirt_cross',
            name: 'Cruzamento de Estrada',
            x: 100,
            y: 100,
            width: 80,
            height: 80,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: 10,
            imageSrc: '/assets/scenery/roads/dirt_cross.png'
        };

        const roadLayerTop: PlacedAssetModel = {
            uid: 'road_top',
            presetId: 'road_dirt_stones',
            name: 'Pedregulhos de Estrada',
            x: 100,
            y: 100,
            width: 80,
            height: 80,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: 100,
            imageSrc: '/assets/scenery/roads/dirt_stones.png'
        };

        canvas.setPlacedAssets([roadLayerTop, roadLayerBottom, roadLayerMiddle]);
        canvas.selectMultipleAssets([roadLayerTop, roadLayerBottom, roadLayerMiddle]);

        // Executa o bake passando o array fora de ordem propositalmente
        const result = await canvas.bakeMultipleAssetsToChunkBackground([
            roadLayerTop,
            roadLayerBottom,
            roadLayerMiddle
        ]);

        expect(result.success).toBe(true);
        expect(result.bakedCount).toBe(3);

        // O primeiro drawImage é o fundo original do chunk (chunk_1_1.png)
        // Os próximos 3 drawImages DEVEM ser em ordem estrita de Z-Index: bottom (-50) -> middle (10) -> top (100)
        const assetDraws = drawCalls
            .filter(src => !src.includes('chunk_1_1.png'))
            .map(src => src.replace(/^https?:\/\/[^/]+/, ''));
        expect(assetDraws).toEqual([
            '/assets/scenery/roads/dirt_base.png',
            '/assets/scenery/roads/dirt_cross.png',
            '/assets/scenery/roads/dirt_stones.png'
        ]);

        // Todos os 3 assets devem ter sido removidos do canvas
        expect(canvas.placedAssets.length).toBe(0);
        expect(canvas.selectedAssets.length).toBe(0);
    });

    it('deve usar Y-Sort (y + height) quando zIndex não for especificado explicitamente', async () => {
        const canvas = new MapCanvas('canvas-container', mockVilgemConfig);

        const assetBack: PlacedAssetModel = {
            uid: 'asset_back',
            presetId: 'bush',
            name: 'Arbusto de Fundo',
            x: 100,
            y: 50,
            width: 50,
            height: 50, // y + height = 100
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/assets/scenery/nature/bush_back.png'
        };

        const assetFront: PlacedAssetModel = {
            uid: 'asset_front',
            presetId: 'bush',
            name: 'Arbusto de Frente',
            x: 100,
            y: 150,
            width: 50,
            height: 50, // y + height = 200
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/assets/scenery/nature/bush_front.png'
        };

        canvas.setPlacedAssets([assetFront, assetBack]);

        const result = await canvas.bakeMultipleAssetsToChunkBackground([assetFront, assetBack]);

        expect(result.success).toBe(true);
        const assetDraws = drawCalls
            .filter(src => !src.includes('chunk_1_1.png'))
            .map(src => src.replace(/^https?:\/\/[^/]+/, ''));
        expect(assetDraws).toEqual([
            '/assets/scenery/nature/bush_back.png',
            '/assets/scenery/nature/bush_front.png'
        ]);
    });
});
