/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapCanvas } from '../../adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../adapters/assets-adapter/Components/PropertiesPanel';
import { ChunkManagerModal } from '../../adapters/assets-adapter/Components/ChunkManagerModal';
import { ChunkSync } from '../../adapters/assets-adapter/Components/ChunkSync';
import { MapSelectorModal, type SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';
import type { PlacedAssetModel } from '../../adapters/assets-adapter/Models/PlacedAssetModel';

describe('ChunkBakeAssetRegression (Bake de Assets no Fundo & Troca de Fundo em Outros Mapas)', () => {
    let mockVilgemConfig: SelectedMapConfig;
    let mockAlunConfig: SelectedMapConfig;
    let container: HTMLDivElement;

    beforeEach(() => {
        HTMLCanvasElement.prototype.getContext = (() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            drawImage: vi.fn(),
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

        HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockCleanGroundDataUrl');

        document.body.innerHTML = '';
        container = document.createElement('div');
        container.id = 'canvas-container';
        container.style.width = '1024px';
        container.style.height = '768px';
        document.body.appendChild(container);

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

        mockAlunConfig = {
            id: 'alun',
            name: 'Torre de Alun',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            chunks: [
                ['', '', ''],
                ['', '', ''],
                ['', '', '']
            ],
            originChunk: { cx: 0, cy: 0 }
        };
    });

    it('deve fixar (bake) um asset no fundo do chunk correspondente e removê-lo da lista de elementos', async () => {
        const onAssetChanged = vi.fn();
        const canvas = new MapCanvas('canvas-container', mockVilgemConfig, undefined, onAssetChanged);

        const assetToBake: PlacedAssetModel = {
            uid: 'test_asset_fountain_1',
            presetId: 'fountain',
            name: 'Fonte da Praça',
            x: 200,
            y: 300,
            width: 100,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '/assets/scenery/fountain/fountain.png'
        };

        canvas.setPlacedAssets([assetToBake]);
        canvas.selectAsset(assetToBake);

        expect(canvas.placedAssets.length).toBe(1);
        expect(canvas.selectedAsset).toBe(assetToBake);

        // Centro do asset: (250, 350).
        // Em Vilgem com originChunk (1, 1):
        // col = Math.floor(250 / 1024) + 1 = 1
        // row = Math.floor(350 / 1024) + 1 = 1
        const initialChunkTexture = mockVilgemConfig.chunks![1]![1];
        expect(initialChunkTexture).toBe('chunk_1_1.png');

        const result = await canvas.bakeAssetToChunkBackground(assetToBake);

        expect(result.success).toBe(true);
        expect(result.chunkCoords).toEqual({ row: 1, col: 1 });

        // O chunk (1, 1) deve ter sido atualizado com a nova textura gerada
        expect(mockVilgemConfig.chunks![1]![1]).not.toBe('chunk_1_1.png');
        expect(mockVilgemConfig.chunks![1]![1]).toBeTruthy();

        // O asset deve ter sido removido dos placedAssets
        expect(canvas.placedAssets.length).toBe(0);
        expect(canvas.selectedAsset).toBeNull();

        // Callback de alteração deve ter sido chamado para auto-save
        expect(onAssetChanged).toHaveBeenCalled();
    });

    it('deve retornar falha amigável se tentar fixar um asset em posição fora da grade de chunks', async () => {
        const canvas = new MapCanvas('canvas-container', mockVilgemConfig, () => {});

        const outOfBoundsAsset: PlacedAssetModel = {
            uid: 'asset_far_away',
            presetId: 'tree',
            name: 'Árvore no Vazio',
            x: 99999,
            y: 99999,
            width: 50,
            height: 50,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'tree.png'
        };

        canvas.setPlacedAssets([outOfBoundsAsset]);

        const result = await canvas.bakeAssetToChunkBackground(outOfBoundsAsset);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Não há um chunk válido');
        // Asset não deve ser removido caso o bake falhe
        expect(canvas.placedAssets.length).toBe(1);
    });

    it('deve permitir trocar o fundo do chunk em mapas secundários como Alun e Cemii', async () => {
        let updatedMap: SelectedMapConfig | null = null;
        const modal = new ChunkManagerModal(
            mockAlunConfig,
            (newConfig) => {
                updatedMap = newConfig;
            }
        );

        // Define a célula [row: 0, col: 1] selecionada
        modal['selectedCell'] = { row: 0, col: 1 };

        const newTexture = '/assets/maps/alun/arcane_tiles.png';
        modal.setChunkBackground(0, 1, newTexture);

        expect(mockAlunConfig.chunks![0]![1]).toBe(newTexture);
        expect(updatedMap).not.toBeNull();
        expect((updatedMap as unknown as SelectedMapConfig).chunks![0]![1]).toBe(newTexture);

        // Valida que o ChunkSync gera código TS válido com identificadores de alun
        const sync = new ChunkSync();
        const code = sync.generateChunksCode('alun', mockAlunConfig.chunks!);
        expect(code).toContain('const alunChunks: string[][] = [');
        expect(code).toContain('arcane_tiles.png');
    });

    it('deve garantir que MapSelectorModal liste Alun e Cemii com chunkSize 1024 consistente', () => {
        const selector = new MapSelectorModal(() => {});
        const maps = selector['availableMaps'];

        const alun = maps.find(m => m.id === 'alun');
        const cemii = maps.find(m => m.id === 'cemii');

        expect(alun).toBeDefined();
        expect(alun!.chunkSize).toBe(1024);

        expect(cemii).toBeDefined();
        expect(cemii!.chunkSize).toBe(1024);
    });

    it('deve blindar o bake de múltiplos assets selecionados respeitando o Z-Index e atualizando múltiplos chunks', async () => {
        const canvas = new MapCanvas('canvas-container', mockVilgemConfig);

        // Asset 1 no Chunk (1, 1): x: 200, y: 200, zIndex: -10
        const roadBase: PlacedAssetModel = {
            uid: 'road_base_chunk11',
            presetId: 'road_dirt',
            name: 'Estrada de Terra',
            x: 200,
            y: 200,
            width: 100,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: -10,
            imageSrc: '/assets/scenery/roads/dirt.png'
        };

        // Asset 2 no Chunk (1, 1): x: 200, y: 200, zIndex: 20 (sobreposto ao Asset 1)
        const roadCrossing: PlacedAssetModel = {
            uid: 'road_cross_chunk11',
            presetId: 'road_crossing',
            name: 'Cruzamento',
            x: 200,
            y: 200,
            width: 100,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: 20,
            imageSrc: '/assets/scenery/roads/crossing.png'
        };

        // Asset 3 no Chunk (1, 2) (coluna 2, linha 1):
        // col = Math.floor(1200 / 1024) + 1 = 2
        // row = Math.floor(200 / 1024) + 1 = 1
        const roadChunk12: PlacedAssetModel = {
            uid: 'road_chunk12',
            presetId: 'road_dirt',
            name: 'Estrada Chunk Vizinho',
            x: 1200,
            y: 200,
            width: 100,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: 0,
            imageSrc: '/assets/scenery/roads/dirt2.png'
        };

        canvas.setPlacedAssets([roadCrossing, roadBase, roadChunk12]);
        canvas.selectMultipleAssets([roadCrossing, roadBase, roadChunk12]);

        const prevChunk11 = mockVilgemConfig.chunks![1]![1];
        const prevChunk12 = mockVilgemConfig.chunks![1]![2];

        const result = await canvas.bakeMultipleAssetsToChunkBackground([
            roadCrossing,
            roadBase,
            roadChunk12
        ]);

        expect(result.success).toBe(true);
        expect(result.bakedCount).toBe(3);
        expect(result.affectedChunks?.length).toBe(2);

        // Chunks afetados devem ter novas URLs
        expect(mockVilgemConfig.chunks![1]![1]).not.toBe(prevChunk11);
        expect(mockVilgemConfig.chunks![1]![2]).not.toBe(prevChunk12);

        // Todos os 3 assets devem ter sido removidos do canvas
        expect(canvas.placedAssets.length).toBe(0);
        expect(canvas.selectedAssets.length).toBe(0);
    });

    it('deve renderizar o botão de Bake no PropertiesPanel em seleção múltipla e acionar bakeMultipleAssetsToChunkBackground', async () => {
        const propDiv = document.createElement('div');
        propDiv.id = 'prop-container';
        document.body.appendChild(propDiv);

        const canvas = new MapCanvas('canvas-container', mockVilgemConfig);
        const bakeSpy = vi.spyOn(canvas, 'bakeMultipleAssetsToChunkBackground').mockResolvedValue({
            success: true,
            bakedCount: 2,
            chunkCoords: { row: 1, col: 1 },
            newUrl: 'data:image/png;base64,baked',
            affectedChunks: [{ row: 1, col: 1, newUrl: 'data:image/png;base64,baked' }]
        });

        const asset1: PlacedAssetModel = {
            uid: 'a1',
            presetId: 'road',
            name: 'R1',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'r1.png'
        };
        const asset2: PlacedAssetModel = {
            uid: 'a2',
            presetId: 'road',
            name: 'R2',
            x: 150,
            y: 100,
            width: 50,
            height: 50,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'r2.png'
        };

        canvas.setPlacedAssets([asset1, asset2]);
        canvas.selectMultipleAssets([asset1, asset2]);

        const panel = new PropertiesPanel('prop-container', canvas);
        panel.render();

        const btnBakeGroup = propDiv.querySelector('#btn-group-bake') as HTMLButtonElement;
        expect(btnBakeGroup).not.toBeNull();
        expect(btnBakeGroup.textContent).toContain('Fixar Selecionados no Fundo (2) (Bake)');

        btnBakeGroup.click();

        expect(bakeSpy).toHaveBeenCalledWith([asset1, asset2]);
    });
});
