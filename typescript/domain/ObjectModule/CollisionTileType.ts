/**
 * @file Define os tipos de colisão de tiles do mapa
 * Cada cor na camada de colisão mapeia para um tipo
 */

export enum CollisionTileType {
    /** Transparente - sem colisão */
    NONE = 'none',
    /** Preto (#000000) - parede sólida */
    WALL = 'wall',
    /** Azul (#0000FF) - água (lentidão) */
    WATER = 'water',
    /** Vermelho (#FF0000) - dano contínuo */
    LAVA = 'lava',
    /** Verde (#00FF00) - grama alta (lentidão leve) */
    GRASS = 'grass',
    /** Ciano (#00FFFF) - escorregadio */
    ICE = 'ice',
    /** Magenta (#FF00FF) - espinhos (dano) */
    SPIKE = 'spike',
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
    /** Indica se a entidade pode atravessar o tile */
    passable: boolean;
    /** Dano contínuo por segundo se aplicável */
    damagePerSecond?: number;
    /** Modificador de velocidade (ex: 0.5 = 50% de velocidade) */
    speedModifier?: number;
    /** Tipo de efeito de status aplicado (ex: burn, wet, slip, bleed) */
    effectType?: string;
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
    /** Coordenada X do tile no mundo */
    x: number;
    /** Coordenada Y do tile no mundo */
    y: number;
    /** Tamanho do tile em pixels (ex: 32px) */
    tileSize: number;
    /** Largura agregada em pixels */
    width?: number;
    /** Altura agregada em pixels */
    height?: number;
}
