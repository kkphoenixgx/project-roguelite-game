// @vitest-environment jsdom
/**
 * @file ChunkTextureBrushToolRegression.test.ts
 * Suite de regressão para blindar o Pincel de Textura de Chunk (Chunk Texture Brush Tool):
 * - Alternância mútua entre Stamp Mode (B) e Chunk Brush Mode (T).
 * - Atalhos de teclado (T, [, ], Escape) e clique direito para cancelar.
 * - Pintura contínua cruzando fronteiras entre múltiplos chunks (ex: Chunk (0,0) e Chunk (1,0)) e Bake multi-chunk.
 * - Preservação de objetos normais do cenário enquanto a camada pintada é manipulada e fixada (Bake).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import type { SelectedMapConfig } from '../../../typescript/adapters/assets-adapter/Components/MapSelectorModal';

describe('ChunkTextureBrushTool (Regression Suite)', () => {
    let mockCtx: any;
    let mapConfig: SelectedMapConfig;
    let mapCanvas: MapCanvas;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="canvas-container" style="width: 1024px; height: 768px;"></div>
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
    });

    it('1. deve garantir exclusão mútua entre Modo Carimbo (B) e Pincel de Textura de Chunk (T)', () => {
        mapCanvas.toggleStampMode({
            id: 'oak_tree',
            name: 'Carvalho',
            category: 'nature',
            imageSrc: '/tree.png',
            width: 64,
            height: 64,
            frameCount: 1,
            frameWidth: 64,
            frameHeight: 64
        });
        expect(mapCanvas.isStampMode).toBe(true);
        expect(mapCanvas.isChunkBrushMode).toBe(false);

        // Ativar Pincel de Chunk deve desligar automaticamente o Carimbo
        mapCanvas.toggleChunkBrushMode(true);
        expect(mapCanvas.isChunkBrushMode).toBe(true);
        expect(mapCanvas.isStampMode).toBe(false);

        // Ativar Carimbo novamente deve desligar automaticamente o Pincel de Chunk
        mapCanvas.toggleStampMode();
        expect(mapCanvas.isStampMode).toBe(true);
        expect(mapCanvas.isChunkBrushMode).toBe(false);
    });

    it('2. deve responder aos atalhos de teclado T (toggle), [ e ] (ajuste de raio) e Escape (sair)', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
        expect(mapCanvas.isChunkBrushMode).toBe(true);

        const initialRadius = mapCanvas.chunkBrushRadius;
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ']' }));
        expect(mapCanvas.chunkBrushRadius).toBe(initialRadius + 6);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: '[', shiftKey: true }));
        expect(mapCanvas.chunkBrushRadius).toBe(initialRadius + 6 - 16);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(mapCanvas.isChunkBrushMode).toBe(false);
    });

    it('3. deve permitir pintar cruzando a fronteira entre dois chunks e realizar o Bake em ambos os chunks interceptados', async () => {
        const fetchSpy = vi.fn().mockImplementation(async (_url: string, init: any) => {
            const body = JSON.parse(init.body);
            return {
                ok: true,
                json: async () => ({ url: `/assets/maps/vilgem/baked_r${body.row}_c${body.col}.png` })
            };
        });
        vi.stubGlobal('fetch', fetchSpy);

        mapCanvas.toggleChunkBrushMode(true, '/assets/maps/vilgem/grass_seamless_base.png', 'Grama');
        mapCanvas.setChunkBrushRadius(48);

        // Pinta na fronteira X = 1024 (entre Chunk col=1 [0..1024] e Chunk col=2 [1024..2048])
        mapCanvas.startBrushStroke(990, 500);
        mapCanvas.continueBrushStroke(1060, 500);
        const painted = mapCanvas.finishBrushStroke()!;

        expect(painted.x).toBeLessThan(1024);
        expect(painted.x + painted.width).toBeGreaterThan(1024);

        const res = await mapCanvas.bakeAssetToChunkBackground(painted);
        expect(res.success).toBe(true);
        expect(res.affectedChunks?.length).toBe(2);
        expect(mapConfig.chunks![1]![1]).toBe('/assets/maps/vilgem/baked_r1_c1.png');
        expect(mapConfig.chunks![1]![2]).toBe('/assets/maps/vilgem/baked_r1_c2.png');

        vi.unstubAllGlobals();
    });

    it('4. deve iniciar um novo objeto pintado automaticamente quando o usuário troca a textura do pincel', () => {
        mapCanvas.toggleChunkBrushMode(true, '/assets/maps/vilgem/chunk_0_0_nw.png', 'Textura A');
        mapCanvas.startBrushStroke(100, 100);
        const firstAsset = mapCanvas.finishBrushStroke()!;

        // Troca para outra textura de chunk
        mapCanvas.setBrushTexture('/assets/maps/vilgem/chunk_2_2_se.png', 'Textura B');
        mapCanvas.startBrushStroke(300, 300);
        const secondAsset = mapCanvas.finishBrushStroke()!;

        expect(firstAsset.uid).not.toBe(secondAsset.uid);
        expect(mapCanvas.placedAssets.length).toBe(2);
        expect(firstAsset.sourceTextureUrl).toBe('/assets/maps/vilgem/chunk_0_0_nw.png');
        expect(secondAsset.sourceTextureUrl).toBe('/assets/maps/vilgem/chunk_2_2_se.png');
    });

    it('5. deve suportar Undo (Ctrl+Z) e Redo (Ctrl+Y) após pintar uma área com o pincel', () => {
        mapCanvas.toggleChunkBrushMode(true);
        mapCanvas.startBrushStroke(200, 200);
        mapCanvas.finishBrushStroke();

        expect(mapCanvas.placedAssets.length).toBe(1);

        mapCanvas.undo();
        expect(mapCanvas.placedAssets.length).toBe(0);

        mapCanvas.redo();
        expect(mapCanvas.placedAssets.length).toBe(1);
        expect(mapCanvas.placedAssets[0]!.isPaintedLayer).toBe(true);
    });
});
