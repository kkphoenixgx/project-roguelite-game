/**
 * @file Parser de Camadas de Colisão de Mapas
 * Lê uma imagem PNG de colisão e extrai os tiles baseado em cores
 */

import { COLOR_TO_COLLISION_TYPE, CollisionTileType, type CollisionTileData } from '../../../domain/ObjectModule/CollisionTileType';

// Paleta de Referência para Fuzzy Color Matching
const COLOR_TARGETS = [
    { type: CollisionTileType.WALL, r: 0, g: 0, b: 0 },
    { type: CollisionTileType.WATER, r: 0, g: 0, b: 255 },
    { type: CollisionTileType.LAVA, r: 255, g: 0, b: 0 },
    { type: CollisionTileType.GRASS, r: 0, g: 255, b: 0 },
    { type: CollisionTileType.ICE, r: 0, g: 255, b: 255 },
    { type: CollisionTileType.SPIKE, r: 255, g: 0, b: 255 },
    { type: CollisionTileType.NONE, r: 255, g: 255, b: 255 }
];

export interface CollisionMapData {
    tiles: CollisionTileData[];
    width: number;  // Dimensões em pixels
    height: number;
    tileSize: number;  // Tamanho de cada tile (ex: 32px)
}

/**
 * Carrega uma imagem de colisão e parseia os pixels baseado em cores
 * @param imageUrl - URL da imagem de colisão
 * @param tileSize - Tamanho de cada tile em pixels
 * @returns Promessa que resolve com os dados de colisão
 */
export async function parseCollisionLayerImage(
    imageUrl: string,
    tileSize: number = 32,
    targetWidth?: number,
    targetHeight?: number
): Promise<CollisionMapData> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            console.log(`[CollisionLayerParser] Imagem carregada (${img.width}x${img.height}). Iniciando varredura RGB...`);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Falha ao obter contexto 2D do canvas'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;

            const finalWidth = targetWidth || img.width;
            const finalHeight = targetHeight || img.height;

            const scaleX = img.width / finalWidth;
            const scaleY = img.height / finalHeight;

            const tiles: CollisionTileData[] = [];
            const numTilesX = Math.ceil(finalWidth / tileSize);
            const numTilesY = Math.ceil(finalHeight / tileSize);

            // Itera sobre cada tile do MUNDO e projeta na proporção da imagem carregada
            for (let tileY = 0; tileY < numTilesY; tileY++) {
                for (let tileX = 0; tileX < numTilesX; tileX++) {
                    const worldPixelX = tileX * tileSize + Math.floor(tileSize / 2);
                    const worldPixelY = tileY * tileSize + Math.floor(tileSize / 2);
                    
                    const imgPixelX = Math.min(Math.floor(worldPixelX * scaleX), img.width - 1);
                    const imgPixelY = Math.min(Math.floor(worldPixelY * scaleY), img.height - 1);
                    
                    const pixelIndex = (imgPixelY * img.width + imgPixelX) * 4;

                    // Uint8ClampedArray sempre retorna valores no intervalo [0, 255], nunca undefined
                    const r = data[pixelIndex]!;
                    const g = data[pixelIndex + 1]!;
                    const b = data[pixelIndex + 2]!;
                    const a = data[pixelIndex + 3]!;

                    // Ignora pixels totalmente transparentes
                    if (a < 128) continue;

                    let tileType = CollisionTileType.NONE;
                    let minDistance = Infinity;

                    // Fuzzy Matching: Acha a cor registrada mais próxima deste pixel
                    for (const target of COLOR_TARGETS) {
                        const dist = (r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2;
                        if (dist < minDistance) {
                            minDistance = dist;
                            tileType = target.type;
                        }
                    }

                    // Se a cor for muito suja/distante (distância RGB muito alta), ignora o ruído
                    if (minDistance > 25000) tileType = CollisionTileType.NONE;

                    if (tileType !== CollisionTileType.NONE) {
                        tiles.push({
                            type: tileType,
                            x: tileX * tileSize,
                            y: tileY * tileSize,
                            tileSize,
                        });
                    }
                }
            }

            console.log(`[CollisionLayerParser] Varredura concluída. Foram encontrados ${tiles.length} tiles sólidos antes da Agregação.`);
            resolve({
                tiles,
                width: finalWidth,
                height: finalHeight,
                tileSize,
            });
        };

        img.onerror = () => reject(new Error(`Falha ao carregar a imagem de colisão: ${imageUrl}`));
        img.src = imageUrl;
    });
}

/**
 * Agrega tiles adjacentes em retângulos maiores para otimização
 * Reduz o número de hitboxes necessárias
 */
export function aggregateCollisionTiles(tiles: CollisionTileData[]): CollisionTileData[] {
    // Agrupa por tipo
    const tilesByType = new Map<CollisionTileType, CollisionTileData[]>();

    for (const tile of tiles) {
        if (!tilesByType.has(tile.type)) {
            tilesByType.set(tile.type, []);
        }
        tilesByType.get(tile.type)!.push(tile);
    }

    const aggregated: CollisionTileData[] = [];

    for (const [_type, typeTiles] of tilesByType) {
        // Ordena da esquerda pra direita, cima para baixo
        const sorted = typeTiles.sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });

        if (sorted.length === 0) continue;

        const horizontalRuns: CollisionTileData[] = [];
        let startTile = sorted[0]!;
        let runWidth = startTile.tileSize;

        for (let i = 1; i < sorted.length; i++) {
            const curr = sorted[i]!;

            if (curr.y === startTile.y && curr.x === startTile.x + runWidth) {
                runWidth += curr.tileSize;
            } else {
                horizontalRuns.push({
                    type: startTile.type, x: startTile.x, y: startTile.y,
                    tileSize: startTile.tileSize, width: runWidth, height: startTile.tileSize
                });
                startTile = curr;
                runWidth = curr.tileSize;
            }
        }
        horizontalRuns.push({
            type: startTile.type, x: startTile.x, y: startTile.y,
            tileSize: startTile.tileSize, width: runWidth, height: startTile.tileSize
        });

        // Agrupa as runs horizontais verticalmente
        const used = new Set<number>();
        for (let i = 0; i < horizontalRuns.length; i++) {
            if (used.has(i)) continue;
            const currentRun = { ...horizontalRuns[i]! };
            used.add(i);

            let expectedY = currentRun.y + currentRun.height!;
            
            for (let j = i + 1; j < horizontalRuns.length; j++) {
                if (used.has(j)) continue;
                const nextRun = horizontalRuns[j]!;

                if (nextRun.y > expectedY) break; // Passou da altura atual

                if (nextRun.y === expectedY && nextRun.x === currentRun.x && nextRun.width === currentRun.width) {
                    currentRun.height! += nextRun.height!;
                    expectedY += nextRun.height!;
                    used.add(j);
                }
            }
            aggregated.push(currentRun);
        }
    }

    return aggregated;
}
