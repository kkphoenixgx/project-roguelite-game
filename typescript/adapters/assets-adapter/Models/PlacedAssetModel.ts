/**
 * @file PlacedAssetModel.ts
 * Representa uma instância de asset já posicionada no mapa de jogo.
 */

export interface PlacedAssetModel {
    uid: string;
    presetId: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    zIndex?: number | undefined;
    imageSrc: string;
    selected?: boolean | undefined;
    locked?: boolean | undefined;
    baseWidth?: number | undefined;
    baseHeight?: number | undefined;
    isCustomScaled?: boolean | undefined;
    isSprite?: boolean | undefined;
    frameWidth?: number | undefined;
    frameHeight?: number | undefined;
    frameCount?: number | undefined;
    animationSpeed?: number | undefined;
    atlasOffset?: { x: number; y: number } | undefined;
  /* Propriedades para PortalLinks */
    isPortal?: boolean | undefined;
    portalType?: 'request' | 'direct' | undefined;
    targetMapId?: string | undefined;
    targetSpawnX?: number | undefined;
    targetSpawnY?: number | undefined;
    promptText?: string | undefined;
    actionKey?: string | undefined;
    cooldownMs?: number | undefined;
  /* Propriedades para Itens de Jogo (droppedItem) */
    isItem?: boolean | undefined;
    itemClass?: string | undefined;
    itemCategory?: string | undefined;
    itemId?: number | undefined;
    itemName?: string | undefined;
    itemDescription?: string | undefined;
    itemRarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | undefined;
    itemAmount?: number | undefined;
    itemPrice?: number | undefined;
    itemDurability?: number | undefined;
    itemBaseDamage?: number | undefined;
    itemAttackSpeed?: number | undefined;
    itemDamageReduction?: number | undefined;
    itemDodge?: number | undefined;
    itemRequiredLevel?: number | undefined;
  /* Propriedades para Camada Pintada de Textura de Chunk */
    isPaintedLayer?: boolean | undefined;
    sourceTextureUrl?: string | undefined;
    sourceTextureName?: string | undefined;
}
