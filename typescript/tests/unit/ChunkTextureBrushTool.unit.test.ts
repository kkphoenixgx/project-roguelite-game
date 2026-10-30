// @vitest-environment jsdom
/**
 * @file ChunkTextureBrushTool.unit.test.ts
 * Testes unitários para a ferramenta Pincel de Textura de Chunk (Chunk Texture Brush Tool - Tecla T)
 * no Assets Editor (`MapCanvas`, `PropertiesPanel`, `WorldCodeSync`).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../../typescript/adapters/assets-adapter/Components/PropertiesPanel';
import { WorldCodeSync } from '../../../typescript/adapters/assets-adapter/Components/WorldCodeSync';
import type { SelectedMapConfig } from '../../../typescript/adapters/assets-adapter/Components/MapSelectorModal';

describe('ChunkTextureBrushTool (Unit Tests)', () => {
    let mockCtx: any;
    let mapConfig: SelectedMapConfig;
    let mapCanvas: MapCanvas;
    let propsPanel: PropertiesPanel;

    beforeEach(() => {
        vi.stubGlobal('requestAnimationFrame', vi.fn());
        document.body.innerHTML = `
            <div id="canvas-container" style="width: 1024px; height: 768px;"></div>
            <div id="properties-panel"></div>
        `;

        mockCtx = {
            clearRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            rotate: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            drawImage: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            ellipse: vi.fn(),
            clip: vi.fn(),
            setLineDash: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn(() => ({ width: 80 })),
            createRadialGradient: vi.fn(() => ({
                addColorStop: vi.fn()
            })),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            font: '',
            globalAlpha: 1,
            globalCompositeOperation: 'source-over',
            imageSmoothingEnabled: true
        };

        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

        mapConfig = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 4096,
            chunkSize: 1024,
            originChunk: { cx: 1, cy: 1 },
            chunks: [
                ['/assets/maps/vilgem/chunk_0_0_nw.png', '/assets/maps/vilgem/chunk_1_0_n.png', '/assets/maps/vilgem/chunk_2_0_ne.png'],
                ['/assets/maps/vilgem/chunk_0_1_w.png', '/assets/maps/vilgem/chunk_1_1_ground.png', '/assets/maps/vilgem/chunk_2_1_e.png'],
                ['/assets/maps/vilgem/chunk_0_2_sw.png', '/assets/maps/vilgem/chunk_1_2_s.png', '/assets/maps/vilgem/chunk_2_2_se.png'],
                ['/assets/maps/vilgem/grass_seamless_base.png', '/assets/maps/vilgem/grass_seamless_base.png', '/assets/maps/vilgem/grass_seamless_base.png']
            ],
            description: 'Mapa de teste'
        };

        mapCanvas = new MapCanvas('canvas-container', mapConfig);
        propsPanel = new PropertiesPanel('properties-panel', mapCanvas);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('1. deve ativar e desativar o modo Pincel de Textura de Chunk via toggleChunkBrushMode()', () => {
        expect(mapCanvas.isChunkBrushMode).toBe(false);

        mapCanvas.toggleChunkBrushMode(true, '/assets/maps/vilgem/chunk_1_1_ground.png', 'Grama Central');
        expect(mapCanvas.isChunkBrushMode).toBe(true);
        expect(mapCanvas.activeBrushTextureUrl).toBe('/assets/maps/vilgem/chunk_1_1_ground.png');
        expect(mapCanvas.activeBrushTextureName).toBe('Grama Central');

        mapCanvas.toggleChunkBrushMode(false);
        expect(mapCanvas.isChunkBrushMode).toBe(false);
    });

    it('2. deve desenhar o círculo indicador em volta do mouse no canvas quando o Pincel de Chunk está ativo', () => {
        mapCanvas.toggleChunkBrushMode(true);
        mapCanvas.setChunkBrushRadius(64);
        mapCanvas.lastMouseWorldPos = { x: 250, y: 300 };

        mockCtx.arc.mockClear();
        mapCanvas.render();

        // Verifica que ctx.arc foi chamado com as coordenadas mundiais do mouse (250, 300) e raio 64
        const hasBrushCircle = mockCtx.arc.mock.calls.some(
            (call: any[]) => call[0] === 250 && call[1] === 300 && call[2] === 64
        );
        expect(hasBrushCircle).toBe(true);
    });

    it('3. deve gerar um objeto (PlacedAssetModel) com a área pintada ao pintar com o pincel no mapa', () => {
        mapCanvas.toggleChunkBrushMode(true, '/assets/maps/vilgem/grass_seamless_base.png', 'Grama Sem Emendas');
        mapCanvas.setChunkBrushRadius(40);

        const initialCount = mapCanvas.placedAssets.length;
        const paintedAsset = mapCanvas.startBrushStroke(100, 100);
        mapCanvas.continueBrushStroke(180, 140);
        const finished = mapCanvas.finishBrushStroke();

        expect(mapCanvas.placedAssets.length).toBe(initialCount + 1);
        expect(finished).not.toBeNull();
        expect(finished?.uid).toBe(paintedAsset.uid);
        expect(finished?.isPaintedLayer).toBe(true);
        expect(finished?.presetId).toBe('painted_chunk_layer');
        expect(finished?.sourceTextureUrl).toBe('/assets/maps/vilgem/grass_seamless_base.png');
        // A caixa delimitadora deve cobrir de (100 - 40, 100 - 40) até (180 + 40, 140 + 40)
        expect(finished?.x).toBe(60);
        expect(finished?.y).toBe(60);
        expect(finished?.width).toBe(160); // 220 - 60
        expect(finished?.height).toBe(120); // 180 - 60
        expect(finished?.imageSrc.startsWith('data:image/png')).toBe(true);
    });

    it('4. deve acumular múltiplas pinceladas no mesmo objeto quando mergeBrushStrokes = true e separar quando startNewPaintedLayer() é chamado', () => {
        mapCanvas.toggleChunkBrushMode(true);
        mapCanvas.mergeBrushStrokes = true;
        mapCanvas.setChunkBrushRadius(32);

        mapCanvas.startBrushStroke(0, 0);
        mapCanvas.finishBrushStroke();
        expect(mapCanvas.placedAssets.length).toBe(1);

        // Segunda pincelada com mesma textura acumula no mesmo objeto e expande suas dimensões
        mapCanvas.startBrushStroke(100, 100);
        mapCanvas.finishBrushStroke();
        expect(mapCanvas.placedAssets.length).toBe(1);
        expect(mapCanvas.placedAssets[0]!.width).toBeGreaterThanOrEqual(164);

        // Solicitar nova área pintada separa o próximo traço em outro objeto
        mapCanvas.startNewPaintedLayer();
        mapCanvas.startBrushStroke(300, 300);
        mapCanvas.finishBrushStroke();
        expect(mapCanvas.placedAssets.length).toBe(2);
    });

    it('5. deve permitir dar Bake no objeto gerado pelo pincel diretamente no fundo do chunk', async () => {
        const fetchSpy = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ url: '/assets/maps/vilgem/chunk_r1_c1_baked_brush.png' })
        });
        vi.stubGlobal('fetch', fetchSpy);

        mapCanvas.toggleChunkBrushMode(true, '/assets/maps/vilgem/chunk_0_0_nw.png', 'Borda NW');
        mapCanvas.setChunkBrushRadius(50);

        mapCanvas.startBrushStroke(200, 200);
        mapCanvas.continueBrushStroke(260, 240);
        const paintedObj = mapCanvas.finishBrushStroke()!;

        expect(mapCanvas.placedAssets).toContain(paintedObj);

        const bakeResult = await mapCanvas.bakeAssetToChunkBackground(paintedObj);

        expect(bakeResult.success).toBe(true);
        expect(bakeResult.bakedCount).toBe(1);
        expect(bakeResult.chunkCoords).toEqual({ row: 1, col: 1 });
        // O objeto pintado deve ser incorporado ao chunk e removido da lista de objetos dinâmicos
        expect(mapCanvas.placedAssets.find(a => a.uid === paintedObj.uid)).toBeUndefined();

        vi.unstubAllGlobals();
    });

    it('6. deve renderizar os controles do Pincel de Textura de Chunk no PropertiesPanel e permitir trocar textura e raio', () => {
        propsPanel.render();

        const toggleBtn = document.querySelector('#btn-prop-toggle-chunk-brush') as HTMLButtonElement;
        const radiusSlider = document.querySelector('#slider-chunk-brush-radius') as HTMLInputElement;
        const texSelect = document.querySelector('#select-chunk-brush-texture') as HTMLSelectElement;

        expect(toggleBtn).not.toBeNull();
        expect(radiusSlider).not.toBeNull();
        expect(texSelect).not.toBeNull();

        toggleBtn.click();
        expect(mapCanvas.isChunkBrushMode).toBe(true);

        radiusSlider.value = '96';
        radiusSlider.dispatchEvent(new Event('input'));
        expect(mapCanvas.chunkBrushRadius).toBe(96);
    });

    it('7. não deve exportar camadas temporárias pintadas ainda não fixadas (isPaintedLayer) como spawns inválidos no WorldCodeSync', () => {
        mapCanvas.toggleChunkBrushMode(true);
        mapCanvas.startBrushStroke(120, 120);
        mapCanvas.finishBrushStroke();

        const sync = new WorldCodeSync();
        const code = sync.generateSceneryCode(mapCanvas.placedAssets, mapConfig);

        expect(code).not.toContain('painted_chunk_layer');
    });
});
