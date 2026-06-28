/**
 * @file Define os tipos de colisão de tiles do mapa
 * Cada cor na camada de colisão mapeia para um tipo
 */

export enum CollisionTileType {
    NONE = 'none',           // Transparente - sem colisão
    WALL = 'wall',           // Preto (#000000) - parede sólida
    WATER = 'water',         // Azul (#0000FF) - água (lentidão)
    LAVA = 'lava',           // Vermelho (#FF0000) - dano contínuo
    GRASS = 'grass',         // Verde (#00FF00) - grama alta (lentidão leve)
    ICE = 'ice',             // Ciano (#00FFFF) - escorregadio
    SPIKE = 'spike',         // Magenta (#FF00FF) - espinhos (dano)
}

/** Mapeia cores HEX para tipos de colisão */
export const COLOR_TO_COLLISION_TYPE: Record<string, CollisionTileType> = {
    '#000000': CollisionTileType.WALL,
    '#0000FF': CollisionTileType.WATER,
    '#FF0000': CollisionTileType.LAVA,
    '#00FF00': CollisionTileType.GRASS,
    '#00FFFF': CollisionTileType.ICE,
    '#FF00FF': CollisionTileType.SPIKE,
};

/** Mapeia tipos de colisão para cores HEX (reverso) */
export const COLLISION_TYPE_TO_COLOR: Record<CollisionTileType, string> = {
    [CollisionTileType.NONE]: '#FFFFFF',
    [CollisionTileType.WALL]: '#000000',
    [CollisionTileType.WATER]: '#0000FF',
    [CollisionTileType.LAVA]: '#FF0000',
    [CollisionTileType.GRASS]: '#00FF00',
    [CollisionTileType.ICE]: '#00FFFF',
    [CollisionTileType.SPIKE]: '#FF00FF',
};

/** Define comportamentos de colisão para cada tipo */
export const COLLISION_BEHAVIORS: Record<CollisionTileType, {
    passable: boolean;           // Pode atravessar?
    damagePerSecond?: number;    // Dano contínuo (se aplicável)
    speedModifier?: number;      // Modificador de velocidade (0.5 = 50% de velocidade)
    effectType?: string;         // Tipo de efeito (ex: 'burn', 'slow', 'chill')
}> = {
    [CollisionTileType.NONE]: { passable: true },
    [CollisionTileType.WALL]: { passable: false },
    [CollisionTileType.WATER]: { passable: true, speedModifier: 0.6, effectType: 'wet' },
    [CollisionTileType.LAVA]: { passable: true, damagePerSecond: 0.5, effectType: 'burn' },
    [CollisionTileType.GRASS]: { passable: true, speedModifier: 0.8 },
    [CollisionTileType.ICE]: { passable: true, speedModifier: 0.5, effectType: 'slip' },
    [CollisionTileType.SPIKE]: { passable: true, damagePerSecond: 1.0, effectType: 'bleed' },
};

export interface CollisionTileData {
    type: CollisionTileType;
    x: number;                  // Coordenada X do tile
    y: number;                  // Coordenada Y do tile
    tileSize: number;           // Tamanho do tile em pixels (ex: 32px)
    width?: number;             // Largura agregada
    height?: number;            // Altura agregada
}
