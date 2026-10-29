/**
 * @file Adaptador que implementa ICollisionTileService
 * Carrega dados de colisão a partir de imagens e passa para o Domínio
 */

import type { ICollisionTileService } from '../../domain/ports/ICollisionTileService';
import type { CollisionTileData } from '../../domain/ObjectModule/CollisionTileType';
import { parseCollisionLayerImage, aggregateCollisionTiles } from './shared/CollisionLayerParser';
import { VisualConfigMap, type MapVisualConfig } from './shared/VisualConfigMap';

export default class CollisionTileAdapter implements ICollisionTileService {
    private cache: Map<string, CollisionTileData[]> = new Map();

    public async loadCollisionTiles(mapId: string): Promise<CollisionTileData[]> {
        // Retorna do cache se já foi carregado
        if (this.cache.has(mapId)) {
            return this.cache.get(mapId)!;
        }

        const config = VisualConfigMap[mapId];
        if (!config || config.category !== 'map') {
            throw new Error(`Configuração de mapa não encontrada: ${mapId}`);
        }

        const mapConfig = config as MapVisualConfig;
        const collisionLayerUrl = (mapConfig as any).collisionLayerUrl;
        const tileSize = (mapConfig as any).collisionTileSize ?? 32;
        
        let worldWidth: number | undefined;
        let worldHeight: number | undefined;
        if (mapConfig.chunks && mapConfig.chunks.length > 0 && mapConfig.chunks[0]) {
            worldWidth = mapConfig.chunks[0].length * mapConfig.chunkSize;
            worldHeight = mapConfig.chunks.length * mapConfig.chunkSize;
        }

        if (!collisionLayerUrl) {
            // Se não houver collision layer definida, retorna vazio
            console.warn(`[CollisionTileAdapter] Mapa '${mapId}' não possui collision layer definida`);
            return [];
        }

        try {
            const collisionData = await parseCollisionLayerImage(collisionLayerUrl, tileSize, worldWidth, worldHeight);
            
            // Opcionalmente: agrupa tiles adjacentes para otimização
            const aggregated = aggregateCollisionTiles(collisionData.tiles);
            
            this.cache.set(mapId, aggregated);
            console.log(`[CollisionTileAdapter] Carregados ${aggregated.length} tiles de colisão para ${mapId}`);
            
            return aggregated;
        } catch (err) {
            console.error(`[CollisionTileAdapter] Erro ao carregar colisão para ${mapId}:`, err);
            return [];
        }
    }

    public clearCache(): void {
        this.cache.clear();
    }
}
