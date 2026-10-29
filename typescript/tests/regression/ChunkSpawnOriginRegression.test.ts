/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkManagerModal } from '../../adapters/assets-adapter/Components/ChunkManagerModal';
import { WorldCodeSync } from '../../adapters/assets-adapter/Components/WorldCodeSync';
import type { SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';
import type { PlacedAssetModel } from '../../adapters/assets-adapter/Models/PlacedAssetModel';

describe('ChunkSpawnOriginRegression - Procedural Chunk Expansion & Origin Preservation', () => {
    let mockMap: SelectedMapConfig;
    let placedAssets: PlacedAssetModel[];

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

        document.body.innerHTML = `
            <div id="top-navbar">
                <span class="top-navbar-title-badge"></span>
                <h1>Editor de Assets</h1>
            </div>
            <div id="canvas-container" style="width: 800px; height: 600px;"></div>
            <div id="properties-panel" style="width: 300px;"></div>
        `;

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({})
        } as any);

        placedAssets = [
            {
                uid: 'fountain_1',
                name: 'Fonte do Despertar',
                presetId: 'fountain_awakening',
                x: 448,
                y: 448,
                width: 128,
                height: 128,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc: 'fountain.png'
            },
            {
                uid: 'bench_1',
                name: 'Banco de Madeira',
                presetId: 'wooden_bench',
                x: 383,
                y: 327,
                width: 64,
                height: 32,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc: 'bench.png'
            }
        ];

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            description: 'Vila central',
            chunks: [
                ['nw.png', 'n.png', 'ne.png'],
                ['w.png', 'center.png', 'e.png'],
                ['sw.png', 's.png', 'se.png']
            ],
            originChunk: { cx: 1, cy: 1 }
        };
    });

    it('ao expandir para o Norte, as coordenadas mundiais dos assets ja posicionados NAO devem ser alteradas', () => {
        const modal = new ChunkManagerModal(
            mockMap,
            () => {},
            undefined,
            undefined,
            () => placedAssets
        );

        const initialX = placedAssets[0]!.x;
        const initialY = placedAssets[0]!.y;

        // Expande Norte
        modal.expandNorth();

        // O originChunk.cy deve incrementar (uma nova linha foi adicionada no topo)
        expect(mockMap.originChunk?.cy).toBe(2);

        // A posicao mundial dos assets NÃO deve se mover (deve permanecer 448, 448)
        expect(placedAssets[0]!.x).toBe(initialX);
        expect(placedAssets[0]!.y).toBe(initialY);
    });

    it('ao expandir para o Oeste, as coordenadas mundiais dos assets ja posicionados NAO devem ser alteradas', () => {
        const modal = new ChunkManagerModal(
            mockMap,
            () => {},
            undefined,
            undefined,
            () => placedAssets
        );

        const initialX = placedAssets[0]!.x;
        const initialY = placedAssets[0]!.y;

        // Expande Oeste
        modal.expandWest();

        // O originChunk.cx deve incrementar (uma nova coluna foi adicionada a esquerda)
        expect(mockMap.originChunk?.cx).toBe(2);

        // A posicao mundial dos assets NÃO deve se mover
        expect(placedAssets[0]!.x).toBe(initialX);
        expect(placedAssets[0]!.y).toBe(initialY);
    });

    it('WorldCodeSync deve gerar codigo agrupando assets no CHUNK (0,0) e nao em CHUNK (1,1)', () => {
        const sync = new WorldCodeSync();
        const code = sync.generateSceneryCode(placedAssets, mockMap);

        // Deve conter CHUNK (0,0) com a Fonte
        expect(code).toContain('CHUNK (0,0) [0..1024, 0..1024]');
        expect(code).toContain('fountain_awakening');
        expect(code).toContain('wooden_bench');

        // Não deve conter a fonte sob CHUNK (1,1)
        const chunk11Index = code.indexOf('CHUNK (1,1)');
        if (chunk11Index !== -1) {
            const codeAfter11 = code.slice(chunk11Index);
            expect(codeAfter11).not.toContain('fountain_awakening');
        }
    });
});
