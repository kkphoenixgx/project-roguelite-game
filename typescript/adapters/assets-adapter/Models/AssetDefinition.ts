/**
 * @file AssetDefinition.ts
 * Representa os metadados de um sprite ou asset catalogado para uso no mapa.
 */

export type AssetCategory =
    | 'all'
    | 'houses'
    | 'fortifications'
    | 'roads'
    | 'water'
    | 'bridges'
    | 'fences'
    | 'props'
    | 'camp'
    | 'market'
    | 'nature'
    | 'trees'
    | 'bushes'
    | 'rocks'
    | 'fountain'
    | 'chunks'
    | 'portals'
    | 'sprites'
    | 'items'
    | 'weapons'
    | 'equipment'
    | 'consumables'
    | 'tools'
    | 'vfx'
    | 'entities'
    | 'npcs'
    | 'enemies'
    | 'pets'
    | 'custom'
    | string;

export interface AssetCategoryMeta {
    id: AssetCategory;
    label: string;
    icon: string;
    group: 'general' | 'scenery' | 'nature' | 'items' | 'entities' | 'special';
}

export const ASSET_CATEGORIES_CATALOG: readonly AssetCategoryMeta[] = [
    { id: 'all', label: 'Todos', icon: '📦', group: 'general' },
    { id: 'chunks', label: 'Chunks', icon: '🧱', group: 'general' },
    { id: 'houses', label: 'Casas', icon: '🏠', group: 'scenery' },
    { id: 'fortifications', label: 'Fortificações', icon: '🏰', group: 'scenery' },
    { id: 'roads', label: 'Estradas', icon: '🛣️', group: 'scenery' },
    { id: 'water', label: 'Rios & Água', icon: '🌊', group: 'scenery' },
    { id: 'bridges', label: 'Pontes & Píeres', icon: '🌉', group: 'scenery' },
    { id: 'fences', label: 'Cercas & Muros', icon: '🚧', group: 'scenery' },
    { id: 'props', label: 'Props Urbanos', icon: '🪑', group: 'scenery' },
    { id: 'camp', label: 'Acampamento & Cripta', icon: '⛺', group: 'scenery' },
    { id: 'market', label: 'Mercado', icon: '🎪', group: 'scenery' },
    { id: 'fountain', label: 'Fontes', icon: '⛲', group: 'scenery' },
    { id: 'nature', label: 'Natureza', icon: '🌿', group: 'nature' },
    { id: 'trees', label: 'Árvores & Troncos', icon: '🌲', group: 'nature' },
    { id: 'bushes', label: 'Arbustos & Flores', icon: '🌸', group: 'nature' },
    { id: 'rocks', label: 'Pedras & Rochedos', icon: '🪨', group: 'nature' },
    { id: 'portals', label: 'Portais', icon: '🌀', group: 'special' },
    { id: 'items', label: 'Itens', icon: '⚔️', group: 'items' },
    { id: 'weapons', label: 'Armas', icon: '🗡️', group: 'items' },
    { id: 'equipment', label: 'Equipamentos', icon: '🛡️', group: 'items' },
    { id: 'consumables', label: 'Consumíveis', icon: '🧪', group: 'items' },
    { id: 'tools', label: 'Ferramentas', icon: '🔨', group: 'items' },
    { id: 'entities', label: 'Entidades', icon: '👾', group: 'entities' },
    { id: 'npcs', label: 'NPCs', icon: '🧙', group: 'entities' },
    { id: 'enemies', label: 'Inimigos', icon: '👹', group: 'entities' },
    { id: 'pets', label: 'Pets', icon: '🐾', group: 'entities' },
    { id: 'vfx', label: 'VFX', icon: '✨', group: 'special' },
    { id: 'sprites', label: 'Todos Sprites', icon: '🎞️', group: 'special' },
    { id: 'custom', label: 'Customizados', icon: '🎨', group: 'special' }
];

export interface AssetDefinition {
    /** Identificador único (ex: 'house_red_boro') */
    id: string;
    /** Nome legível (ex: 'Cumeeira Carmim de Boro') */
    name: string;
    /** Categoria visual ('sprites', 'houses', 'items', 'vfx', etc.) */
    category: AssetCategory;
    /** Subcategorias e tags adicionais ('trees', 'weapons', 'npcs', etc.) */
    tags?: string[] | undefined;
    /** URL do sprite carregado */
    imageSrc: string;
    /** Largura padrão no mundo (pixels) */
    width: number;
    /** Altura padrão no mundo (pixels) */
    height: number;
    /** Largura de um frame da spritesheet */
    frameWidth: number;
    /** Altura de um frame da spritesheet */
    frameHeight: number;
    /** Quantidade de frames (1 se estático, >1 se animado) */
    frameCount: number;
    /** Velocidade de animação se aplicável */
    animationSpeed?: number | undefined;
    /** Posição inicial no atlas */
    atlasOffset?: { x: number; y: number } | undefined;
    /** Ancoragem padrão ('bottom-center', etc.) */
    anchor?: string | undefined;
    /** True se for renderizado como sprite animado/fatiado */
    isSprite?: boolean | undefined;
    /** True se criado via modal do usuário */
    isCustom?: boolean | undefined;
    /** True se for um item dropável no jogo */
    isItem?: boolean | undefined;
    /** Nome da classe correspondente no domínio */
    itemClass?: string | undefined;
    /** Categoria do item ('weapon', 'equipment', 'consumable') */
    itemCategory?: string | undefined;
}

