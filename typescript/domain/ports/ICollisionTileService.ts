/**
 * @file Porta secundária para carregamento de dados de colisão de mapa
 * Define o contrato entre o Domínio e o Adaptador para obtenção de dados de colisão
 */

export type CollisionTileData = any;

export interface ICollisionTileService {
    /**
     * Carrega os dados de colisão de um mapa identificado pela URL
     * @param mapId - Identificador do mapa (ex: 'vilgem')
     * @returns Promessa que resolve com os dados de colisão dos tiles
     */
    loadCollisionTiles(mapId: string): Promise<CollisionTileData[]>;
}
