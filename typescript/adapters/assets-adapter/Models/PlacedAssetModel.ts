/**
 * @file PlacedAssetModel.ts
 * Representa uma instância de asset já posicionada no mapa de jogo.
 */

export interface PlacedAssetModel {
    uid: string;           // Identificador único da instância no editor (ex: 'asset_1727500000000_1')
    presetId: string;      // ID do preset para exportação (ex: 'house_red_boro')
    name: string;          // Nome legível
    x: number;             // Posição mundial X (canto superior esquerdo)
    y: number;             // Posição mundial Y (canto superior esquerdo)
    width: number;         // Largura em pixels no mundo
    height: number;        // Altura em pixels no mundo
    rotation: number;      // Rotação em graus (0, 90, 180, 270 ou livre)
    scaleX: number;        // Fator de escala horizontal (padrão 1)
    scaleY: number;        // Fator de escala vertical (padrão 1)
    flipX?: boolean | undefined;       // Espelhamento horizontal
    flipY?: boolean | undefined;       // Espelhamento vertical
    zIndex?: number | undefined;       // Z-Index manual opcional (caso não use apenas Y-Sort)
    imageSrc: string;      // URL do sprite para renderização
    selected?: boolean | undefined;    // Estado de seleção visual
    locked?: boolean | undefined;      // Se bloqueado contra movimentação acidental
    baseWidth?: number | undefined;    // Largura original não escalada (para referência de proporção 1:1)
    baseHeight?: number | undefined;   // Altura original não escalada (para referência de proporção 1:1)
    isCustomScaled?: boolean | undefined; // True se o usuário redimensionou manualmente o elemento
    isSprite?: boolean | undefined;    // True se deve ser fatiado e animado como sprite
    frameWidth?: number | undefined;   // Largura de cada frame na spritesheet
    frameHeight?: number | undefined;  // Altura de cada frame na spritesheet
    frameCount?: number | undefined;   // Quantidade de frames na spritesheet
    animationSpeed?: number | undefined; // Velocidade de reprodução dos frames
    atlasOffset?: { x: number; y: number } | undefined; // Ponto de início na textura
    // Propriedades para PortalLinks
    isPortal?: boolean | undefined;     // True se for um PortalLink / PortalLinkRequest
    portalType?: 'request' | 'direct' | undefined; // Tipo de interação: 'request' ([E]) ou 'direct' (ao encostar)
    targetMapId?: string | undefined;   // ID do mapa de destino (ex: 'interior_black_default', 'vilgem')
    targetSpawnX?: number | undefined;  // X do spawn no destino
    targetSpawnY?: number | undefined;  // Y do spawn no destino
    promptText?: string | undefined;    // Texto do balão (padrão 'Entrar')
    actionKey?: string | undefined;     // Tecla do balão (padrão 'E')
    cooldownMs?: number | undefined;    // Cooldown pós-teleporte em ms
    // Propriedades para Itens de Jogo (droppedItem)
    isItem?: boolean | undefined;       // True se for um item dropavel no chao
    itemClass?: string | undefined;     // Classe instanciada (ex: 'Gun', 'SimpleSword', 'HealthPotion')
    itemCategory?: string | undefined;  // Categoria do item ('weapon', 'armor', 'potion', 'food', 'storage', 'tool', 'currency')
    itemId?: number | undefined;        // ID numerico do item
    itemName?: string | undefined;      // Nome customizado do item
    itemDescription?: string | undefined; // Descricao customizada
    itemRarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | undefined; // Raridade do item
    itemAmount?: number | undefined;    // Quantidade / stack (ex: 50 moedas, 5 macas)
    itemPrice?: number | undefined;     // Preco em ouro
    itemDurability?: number | undefined;// Durabilidade
    itemBaseDamage?: number | undefined;// Dano base (armas)
    itemAttackSpeed?: number | undefined;// Velocidade de ataque em segundos (armas)
    itemDamageReduction?: number | undefined; // Reducao de dano em % (armaduras)
    itemDodge?: number | undefined;     // Esquiva em % (armaduras)
    itemRequiredLevel?: number | undefined; // Nivel minimo requerido
    // Propriedades para Camada Pintada de Textura de Chunk (Chunk Texture Brush)
    isPaintedLayer?: boolean | undefined; // True se gerado pela ferramenta Pincel de Textura de Chunk
    sourceTextureUrl?: string | undefined; // URL da textura de fundo pintada
    sourceTextureName?: string | undefined; // Nome da textura de fundo pintada
}
