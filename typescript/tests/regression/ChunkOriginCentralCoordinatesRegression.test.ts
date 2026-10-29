import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkManagerModal } from '../../adapters/assets-adapter/Components/ChunkManagerModal';
import type { SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';
import type { PlacedAssetModel } from '../../adapters/assets-adapter/Models/PlacedAssetModel';

describe('ChunkOriginCentralCoordinatesRegression (Assets Adapter Coord Central (0,0))', () => {
    let mockMapConfig: SelectedMapConfig;
    let placedAssets: PlacedAssetModel[];

    beforeEach(() => {
        placedAssets = [
            {
                uid: 'asset_fountain_spawn',
                name: 'Fonte Central',
                presetId: 'fountain',
                x: 512,
                y: 591,
                width: 120,
                height: 120,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc: 'fountain.png'
            },
            {
                uid: 'asset_bakery_nw',
                name: 'Padaria Rústica',
                presetId: 'house_bakery_rustic',
                x: -324,
                y: -634,
                width: 200,
                height: 180,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc: 'bakery.png'
            }
        ];

        mockMapConfig = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            chunks: [
                ['nw.png', 'n.png', 'ne.png'],
                ['w.png', 'center.png', 'e.png'],
                ['sw.png', 's.png', 'se.png']
            ],
            originChunk: { cx: 1, cy: 1 }
        };
    });

    it('deve calcular coordenadas inteiras assinadas (cx, cy) ∈ ℤ × ℤ com origem (0, 0) no chunk central de Vilgem', () => {
        const modal = new ChunkManagerModal(
            mockMapConfig,
            () => {},
            undefined,
            undefined,
            () => placedAssets
        );

        // Chunk central [row: 1, col: 1] -> (0, 0)
        expect(modal.getSignedChunkCoords(1, 1)).toEqual({ cx: 0, cy: 0 });

        // Chunk Noroeste [row: 0, col: 0] -> (-1, -1)
        expect(modal.getSignedChunkCoords(0, 0)).toEqual({ cx: -1, cy: -1 });

        // Chunk Sudeste [row: 2, col: 2] -> (+1, +1)
        expect(modal.getSignedChunkCoords(2, 2)).toEqual({ cx: 1, cy: 1 });

        // Limites do mundo calculados
        expect(mockMapConfig.worldBounds).toEqual({
            minX: -1024,
            minY: -1024,
            maxX: 2048,
            maxY: 2048
        });
    });

    it('ao expandir para o Norte (expandNorth), deve incrementar originChunk.cy para preservar o Spawn como (0, 0)', () => {
        const modal = new ChunkManagerModal(
            mockMapConfig,
            () => {},
            undefined,
            undefined,
            () => placedAssets
        );

        expect(modal.getOriginChunk()).toEqual({ cx: 1, cy: 1 });
        expect(mockMapConfig.chunks?.length).toBe(3);

        modal.expandNorth();

        // Linha adicionada no topo -> total 4 linhas
        expect(mockMapConfig.chunks?.length).toBe(4);
        // Origem foi deslocada verticalmente no índice da matriz para linha 2
        expect(modal.getOriginChunk()).toEqual({ cx: 1, cy: 2 });

        // A linha adicionada no topo agora é cy = -2
        expect(modal.getSignedChunkCoords(0, 1)).toEqual({ cx: 0, cy: -2 });
        // O chunk antigo central (agora em row: 2, col: 1) continua sendo estritamente (0, 0)!
        expect(modal.getSignedChunkCoords(2, 1)).toEqual({ cx: 0, cy: 0 });

        // Limites do mundo atualizados: minY expandido para -2048
        expect(mockMapConfig.worldBounds?.minY).toBe(-2048);
        expect(mockMapConfig.worldBounds?.maxY).toBe(2048);
    });

    it('ao expandir para o Oeste (expandWest), deve incrementar originChunk.cx para preservar o Spawn como (0, 0)', () => {
        const modal = new ChunkManagerModal(
            mockMapConfig,
            () => {},
            undefined,
            undefined,
            () => placedAssets
        );

        expect(modal.getOriginChunk()).toEqual({ cx: 1, cy: 1 });
        expect(mockMapConfig.chunks?.[0]?.length).toBe(3);

        modal.expandWest();

        // Coluna adicionada à esquerda -> total 4 colunas
        expect(mockMapConfig.chunks?.[0]?.length).toBe(4);
        // Origem foi deslocada horizontalmente no índice da matriz para coluna 2
        expect(modal.getOriginChunk()).toEqual({ cx: 2, cy: 1 });

        // A coluna adicionada à esquerda agora é cx = -2
        expect(modal.getSignedChunkCoords(1, 0)).toEqual({ cx: -2, cy: 0 });
        // O chunk antigo central (agora em row: 1, col: 2) continua sendo estritamente (0, 0)!
        expect(modal.getSignedChunkCoords(1, 2)).toEqual({ cx: 0, cy: 0 });

        // Limites do mundo atualizados: minX expandido para -2048
        expect(mockMapConfig.worldBounds?.minX).toBe(-2048);
        expect(mockMapConfig.worldBounds?.maxX).toBe(2048);
    });

    it('expansões para o Sul ou Leste não devem alterar os índices da origem central (0, 0)', () => {
        const modal = new ChunkManagerModal(
            mockMapConfig,
            () => {},
            undefined,
            undefined,
            () => placedAssets
        );

        modal.expandSouth();
        modal.expandEast();

        expect(modal.getOriginChunk()).toEqual({ cx: 1, cy: 1 });
        expect(modal.getSignedChunkCoords(1, 1)).toEqual({ cx: 0, cy: 0 });
        // Limites positivos aumentaram
        expect(mockMapConfig.worldBounds?.maxX).toBe(3072);
        expect(mockMapConfig.worldBounds?.maxY).toBe(3072);
        expect(mockMapConfig.worldBounds?.minX).toBe(-1024);
        expect(mockMapConfig.worldBounds?.minY).toBe(-1024);
    });
});
