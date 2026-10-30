/**
 * @file AssetScanner.ts
 * Varre dinamicamente a pasta de assets usando os recursos do Vite (import.meta.glob)
 * e enriquece os sprites com os metadados do VisualConfigMap e SCENERY_PRESETS.
 */

import { ASSET_CATEGORIES_CATALOG, type AssetDefinition, type AssetCategory, type AssetCategoryMeta } from "../Models/AssetDefinition";
import { VisualConfigMap, type AnyVisualConfig, type BaseVisualConfig } from "../../web/shared/VisualConfigMap";
import { SCENERY_PRESETS } from "../../../domain/ObjectModule/Scenery/SceneryRegistry";
import { KNOWN_ASSET_DIMENSIONS } from "./AssetDimensions";

export const ITEM_KEY_TO_CLASS: Record<string, string> = {
    'gun': 'Gun',
    'gun-design-1': 'Gun',
    'scythe': 'Scythe',
    'scythe-design-1': 'Scythe',
    'simple-sword': 'SimpleSword',
    'staff': 'SimpleStaff',
    'staff-design-1': 'SimpleStaff',
    'fishing-rod': 'FishingRod',
    'vara-de-pesca': 'FishingRod',
    'iron-helmet': 'IronHelmet',
    'iron-chestplate': 'IronChestplate',
    'iron-pants': 'IronPants',
    'iron-boots': 'IronBoots',
    'iron-gloves': 'IronGloves',
    'simple-amulet': 'SimpleAmulet',
    'simple-ring': 'SimpleRing',
    'health-potion': 'HealthPotion',
    'life-potion': 'HealthPotion',
    'mana-potion': 'ManaPotion',
    'apple': 'Apple',
    'coin': 'Coin',
    'experience-tome': 'ExperienceTome',
    'leather-bag': 'LeatherBag',
    'bag': 'LeatherBag',
    'leather-belt': 'LeatherBelt',
    'vampire-fang': 'VampireFang',
    'mega-mushroom': 'MegaMushroom',
    'adrenaline-flask': 'AdrenalineFlask',
    'adranaline-flask': 'AdrenalineFlask',
    'demon-blood': 'DemonBlood',
    'hoe': 'Hoe',
    'watering-can': 'WateringCan',
    'axe': 'Axe',
    'hammer': 'Hammer'
};

export const CLASS_TO_ITEM_KEY: Record<string, string> = {
    'Gun': 'gun',
    'Scythe': 'scythe',
    'SimpleSword': 'simple-sword',
    'SimpleStaff': 'staff',
    'FishingRod': 'fishing-rod',
    'IronHelmet': 'iron-helmet',
    'IronChestplate': 'iron-chestplate',
    'IronPants': 'iron-pants',
    'IronBoots': 'iron-boots',
    'IronGloves': 'iron-gloves',
    'SimpleAmulet': 'simple-amulet',
    'SimpleRing': 'simple-ring',
    'HealthPotion': 'health-potion',
    'ManaPotion': 'mana-potion',
    'Apple': 'apple',
    'Coin': 'coin',
    'ExperienceTome': 'experience-tome',
    'LeatherBag': 'leather-bag',
    'LeatherBelt': 'leather-belt',
    'VampireFang': 'vampire-fang',
    'MegaMushroom': 'mega-mushroom',
    'AdrenalineFlask': 'adrenaline-flask',
    'DemonBlood': 'demon-blood',
    'Hoe': 'hoe',
    'WateringCan': 'watering-can',
    'Axe': 'axe',
    'Hammer': 'hammer'
};

export class AssetScanner {
    private assets: AssetDefinition[] = [];
    private customAssets: AssetDefinition[] = [];

    constructor() {
        this.scanAssets();
    }

    /**
     * Varre dinamicamente todas as imagens da pasta assets através do glob do Vite.
     */
    private scanAssets(): void {
        const imageModules: Record<string, string> = (import.meta as any).glob(
            '../../web/assets/**/*.{png,jpg,jpeg,webp}',
            { eager: true, query: '?url', import: 'default' }
        ) || {};

        const discovered: AssetDefinition[] = [];
        const seenIds = new Set<string>();
        const seenFileNames = new Set<string>();

        /* 1. Primeiro: Cruza com os itens já configurados no VisualConfigMap */
        for (const [key, rawConfig] of Object.entries(VisualConfigMap)) {
            const config = rawConfig as AnyVisualConfig;
            if (config.category === 'map') continue;

            const baseConfig = config as BaseVisualConfig;
            const animState = baseConfig.animations ? (baseConfig.animations['static'] || baseConfig.animations['idle'] || Object.values(baseConfig.animations)[0]) : undefined;
            const isItemCategory = (config.category as string) === 'weapon' || (config.category as string) === 'equipment' || (config.category as string) === 'consumable' || (config.category as string) === 'storage';
            const droppedConfig = (config as any).droppedConfig;
            const imgSrc = animState?.imageSrc || droppedConfig?.imageSrc || (config as any).uiIconUrl;
            if (!imgSrc) continue;

            const isItem = isItemCategory;
            const itemClass = isItem ? (ITEM_KEY_TO_CLASS[key] || this.formatClassName(key)) : undefined;
            const detectedCategory = this.detectCategoryFromPathOrKey(imgSrc, key);
            let category: AssetCategory;
            if (isItem) {
                category = 'items';
            } else if (detectedCategory === 'portals' || key.includes('portal')) {
                category = 'portals';
            } else if (config.category === 'vfx') {
                category = 'vfx';
            } else if (['houses', 'fortifications', 'roads', 'water', 'bridges', 'fences', 'camp', 'fountain', 'market', 'nature', 'props'].includes(detectedCategory)) {
                category = detectedCategory;
            } else if (config.category === 'entity') {
                category = 'entities';
            } else {
                category = detectedCategory;
            }
            const presetInfo = SCENERY_PRESETS[key];
            const isSprite = !isItem && Boolean(
                (animState?.frameCount && animState.frameCount > 1) ||
                imgSrc.includes('/sprites/') ||
                imgSrc.includes('/entities/')
            );

            const name = this.formatName(key);
            const w = isItem ? 32 : (presetInfo?.width || animState?.spriteSize?.width || animState?.frameWidth || 64);
            const h = isItem ? 32 : (presetInfo?.height || animState?.spriteSize?.height || animState?.frameHeight || 64);
            const itemCat = isItem ? config.category : undefined;
            const tags = this.detectTagsForAsset(imgSrc, key, category, isItem, itemClass, itemCat);

            discovered.push({
                id: key,
                name: name,
                category: category,
                tags: tags,
                imageSrc: imgSrc,
                width: w,
                height: h,
                frameWidth: animState?.frameWidth || w,
                frameHeight: animState?.frameHeight || h,
                frameCount: animState?.frameCount || 1,
                animationSpeed: animState?.animationSpeed || 10,
                atlasOffset: animState?.atlasOffset || { x: 0, y: 0 },
                anchor: animState?.anchor || 'bottom-center',
                isSprite: isSprite,
                isItem: isItem,
                itemClass: itemClass,
                itemCategory: itemCat
            });

            seenIds.add(key);
            seenFileNames.add(key);

            const fileFromSrc = imgSrc.split('/').pop()?.split('?')[0]?.replace(/\.[^/.]+$/, '');
            if (fileFromSrc) {
                seenFileNames.add(fileFromSrc);
            }
        }

        /* 2. Segundo: Adiciona imagens que estão na pasta mas que não estão no VisualConfigMap (descoberta de pares, cenários e chunks) */
        for (const [filePath, url] of Object.entries(imageModules)) {
            //? Descarta ícones de UI, SVGs e arquivos de colisão da gaveta de assets
            if (filePath.includes('/svgs/') || filePath.includes('/icons/') || filePath.includes('/collision-layers/')) {
                continue;
            }

            //? Para o diretório /maps/, aceita apenas texturas de terreno e chunks de chão
            const isMapFile = filePath.includes('/maps/');
            if (isMapFile && !filePath.includes('chunk_') && !filePath.includes('grass_')) {
                continue;
            }

            const fileName = filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'asset';
            const isSprite = filePath.includes('/sprites/') || filePath.includes('/entities/') || fileName.endsWith('_anim');

            if (seenFileNames.has(fileName) || seenIds.has(fileName)) {
                continue;
            }

            const category: AssetCategory = isMapFile ? 'chunks' : this.detectCategoryFromPathOrKey(filePath, fileName);
            const isItem = category === 'items' || filePath.includes('/itens/');
            const itemClass = isItem ? (ITEM_KEY_TO_CLASS[fileName] || this.formatClassName(fileName)) : undefined;
            const name = this.formatName(fileName);

            //? Herda dimensões pré-calibradas de VisualConfigMap ou SCENERY_PRESETS
            const basePresetKey = fileName.replace(/_clean$|_anim$/, '');
            const visualConfigEntry = (VisualConfigMap as any)[fileName] || (VisualConfigMap as any)[basePresetKey];
            const visualAnim = visualConfigEntry?.animations?.['static'] || visualConfigEntry?.animations?.['idle'] || (visualConfigEntry?.animations ? Object.values(visualConfigEntry.animations)[0] as any : undefined);
            const presetInfo = SCENERY_PRESETS[fileName] || SCENERY_PRESETS[basePresetKey];
            const knownDim = KNOWN_ASSET_DIMENSIONS[fileName] || KNOWN_ASSET_DIMENSIONS[basePresetKey];

            const defaultW = this.estimateDefaultWidth(category);
            const defaultH = this.estimateDefaultHeight(category);

            const resolvedW = isItem ? 32 : (visualAnim?.spriteSize?.width || visualAnim?.frameWidth || presetInfo?.width || knownDim?.width || defaultW);
            const resolvedH = isItem ? 32 : (visualAnim?.spriteSize?.height || visualAnim?.frameHeight || presetInfo?.height || knownDim?.height || defaultH);
            const frameW = isItem ? 32 : (visualAnim?.frameWidth || presetInfo?.width || knownDim?.width || resolvedW);
            const frameH = isItem ? 32 : (visualAnim?.frameHeight || presetInfo?.height || knownDim?.height || resolvedH);
            const frameCount = isItem ? 1 : (visualAnim?.frameCount || (isSprite && fileName.endsWith('_anim') ? 4 : 1));
            const animSpeed = visualAnim?.animationSpeed || 10;
            const atlasOffset = visualAnim?.atlasOffset || { x: 0, y: 0 };
            const tags = this.detectTagsForAsset(filePath, fileName, category, isItem, itemClass, visualConfigEntry?.category);

            discovered.push({
                id: fileName,
                name: name,
                category: category,
                tags: tags,
                imageSrc: url,
                width: resolvedW,
                height: resolvedH,
                frameWidth: frameW,
                frameHeight: frameH,
                frameCount: frameCount,
                animationSpeed: animSpeed,
                atlasOffset: atlasOffset,
                isSprite: !isItem && (isSprite || frameCount > 1),
                isItem: isItem,
                itemClass: itemClass
            });

            seenIds.add(fileName);
            seenFileNames.add(fileName);
        }

        this.assets = discovered;
    }

    /**
     * Detecta a categoria principal com base no caminho da pasta ou no nome do arquivo.
     */
    private detectCategoryFromPathOrKey(path: string, key: string): AssetCategory {
        const lower = (path + ' ' + key).toLowerCase();
        if (lower.includes('/maps/') || lower.includes('chunk_') || lower.includes('chunk') || lower.includes('grass_seamless') || lower.includes('grass_wildflower') || lower.includes('grass_swamp')) {
            return 'chunks';
        }
        if (lower.includes('/itens/') || lower.includes('/items/') || lower.includes('/consumables/') || lower.includes('/weapons/') || lower.includes('/armors/') || lower.includes('potion') || lower.includes('sword') || lower.includes('boots') || lower.includes('helmet') || lower.includes('chestplate') || lower.includes('pants') || lower.includes('gloves') || lower.includes('amulet') || lower.includes('ring') || lower.includes('mushroom') || lower.includes('flask')) {
            return 'items';
        }
        if (lower.includes('/vfx/') || lower.includes('/spells/') || lower.includes('/effects/') || lower.includes('/projectiles/') || lower.includes('spritesheet') || lower.includes('projectile') || lower.includes('explosion') || lower.includes('blink') || lower.includes('slash')) {
            return 'vfx';
        }
        if (lower.includes('portal_link') || lower.includes('portal')) {
            return 'portals';
        }
        if (lower.includes('/roads/') || lower.includes('road_')) {
            return 'roads';
        }
        if (lower.includes('/water/') || lower.includes('river_') || lower.includes('pond_')) {
            return 'water';
        }
        if (lower.includes('bridge_') || lower.includes('pier_')) {
            return 'bridges';
        }
        if (lower.includes('fence_') || lower.includes('wooden_fence') || lower.includes('stone_murette') || lower.includes('murette')) {
            return 'fences';
        }
        if (
            lower.includes('camp_') ||
            lower.includes('weapon_rack') ||
            lower.includes('training_dummy') ||
            lower.includes('transport_cart') ||
            lower.includes('spike_barricade') ||
            lower.includes('alarm_bell') ||
            lower.includes('arcane_obelisk') ||
            lower.includes('graveyard') ||
            lower.includes('crypt_entrance')
        ) {
            return 'camp';
        }
        if (
            !lower.includes('/props/') &&
            (lower.includes('/houses/') || lower.includes('/house/') || lower.includes('house_') || lower.includes('house') || lower.includes('chalet') || lower.includes('cottage') || lower.includes('tavern') || lower.includes('inn') || lower.includes('bakery') || lower.includes('forge') || lower.includes('chapel') || lower.includes('hall') || lower.includes('sawmill') || lower.includes('windmill') || lower.includes('tower')) &&
            !lower.includes('watchtower') &&
            !lower.includes('alarm_bell_tower') &&
            !lower.includes('gatehouse')
        ) {
            return 'houses';
        }
        if (lower.includes('/fortifications/') || lower.includes('/fortification/') || lower.includes('fort') || lower.includes('wall') || lower.includes('gate') || lower.includes('watchtower')) {
            return 'fortifications';
        }
        if (lower.includes('/fountain/') || lower.includes('fountain') || lower.includes('monument')) {
            return 'fountain';
        }
        if (lower.includes('/market/') || lower.includes('market') || lower.includes('stall') || lower.includes('tent') || lower.includes('crate')) {
            return 'market';
        }
        if (lower.includes('/nature/') || lower.includes('tree') || lower.includes('bush') || lower.includes('rock') || lower.includes('flower') || lower.includes('boulder') || lower.includes('pebble') || lower.includes('stump') || lower.includes('fallen_log') || lower.includes('reeds') || lower.includes('grass')) {
            return 'nature';
        }
        if (lower.includes('/entities/') || lower.includes('/npc/') || lower.includes('/enemies/') || lower.includes('/pets/') || lower.includes('/player/')) {
            return 'entities';
        }
        if (lower.includes('/props/') || lower.includes('bench') || lower.includes('lantern') || lower.includes('lamp') || lower.includes('well') || lower.includes('barrel')) {
            return 'props';
        }
        return 'props';
    }

    /**
     * Detecta subcategorias e tags semânticas para filtros granulares no selecionador de assets.
     */
    private detectTagsForAsset(
        path: string,
        key: string,
        category: AssetCategory,
        isItem: boolean,
        itemClass?: string,
        itemCategory?: string
    ): string[] {
        const lower = (path + ' ' + key + ' ' + (itemClass || '')).toLowerCase();
        const tags = new Set<string>([category]);

        if (category === 'nature') {
            if (lower.includes('tree') || lower.includes('pine') || lower.includes('oak') || lower.includes('stump') || lower.includes('fallen_log')) {
                tags.add('trees');
            }
            if (lower.includes('bush') || lower.includes('flower') || lower.includes('lavender') || lower.includes('berry') || lower.includes('reeds') || lower.includes('cattails')) {
                tags.add('bushes');
            }
            if (lower.includes('rock') || lower.includes('boulder') || lower.includes('pebble')) {
                tags.add('rocks');
            }
        }

        if (isItem || category === 'items') {
            tags.add('items');
            const isTool = ['hoe', 'wateringcan', 'watering-can', 'axe', 'hammer', 'fishingrod', 'fishing-rod', 'vara-de-pesca', 'scythe'].some(t => lower.includes(t));
            const isWeapon = itemCategory === 'weapon' || ['gun', 'scythe', 'simplesword', 'sword', 'simplestaff', 'staff', 'fishingrod', 'fishing-rod', 'vara-de-pesca'].some(w => lower.includes(w));
            const isEquip = !isWeapon && ['helmet', 'chestplate', 'pants', 'boots', 'gloves', 'amulet', 'ring', 'bag', 'belt', 'capacete', 'peitoral', 'calça', 'botas', 'luvas', 'nackless'].some(e => lower.includes(e));
            const isConsumable = !isWeapon && !isEquip && !['hoe', 'wateringcan', 'watering-can', 'axe', 'hammer'].some(t => lower.includes(t));

            if (isTool) {
                tags.add('tools');
            }
            if (isWeapon) {
                tags.add('weapons');
            }
            if (isEquip) {
                tags.add('equipment');
            }
            if (isConsumable) {
                tags.add('consumables');
            }
        }

        if (category === 'entities') {
            tags.add('entities');
            if (lower.includes('/npc/') || ['molor', 'candelion', 'derocar', 'molin'].some(n => lower.includes(n))) {
                tags.add('npcs');
            } else if (lower.includes('/pets/') || lower.includes('pet-fish') || lower.includes('slime-pet') || lower.includes('pet')) {
                tags.add('pets');
            } else if (lower.includes('/enemies/') || ['slime', 'shadowmob', 'leviata', 'enemy', 'boss'].some(e => lower.includes(e))) {
                tags.add('enemies');
            }
        }

        return Array.from(tags);
    }

    public getAvailableCategories(): readonly AssetCategoryMeta[] {
        return ASSET_CATEGORIES_CATALOG;
    }

    private formatClassName(key: string): string {
        return key
            .replace(/[-_]/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }

    private formatName(key: string): string {
        if (key.startsWith('chunk_')) {
            //? Normaliza nomenclatura de chunks: chunk_1_1_ground -> Chunk (1,1) Ground
            const parts = key.split('_');
            if (parts.length >= 3 && !isNaN(Number(parts[1])) && !isNaN(Number(parts[2]))) {
                const rest = parts.slice(3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                return `Chunk (${parts[1]},${parts[2]})${rest ? ` ${rest}` : ''}`;
            }
        }
        if (key === 'portal_link_circle' || key === 'portal_link_circle_clean') {
            return 'Portal Link (Transição)';
        }
        return key
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .replace(/clean|anim/gi, '')
            .trim()
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private estimateDefaultWidth(category: AssetCategory): number {
        switch (category) {
            case 'chunks': return 1024;
            case 'portals': return 64;
            case 'items':
            case 'weapons':
            case 'equipment':
            case 'consumables':
            case 'tools': return 32;
            case 'vfx': return 48;
            case 'houses': return 260;
            case 'fortifications': return 220;
            case 'roads': return 256;
            case 'water': return 256;
            case 'bridges': return 180;
            case 'fences': return 120;
            case 'camp': return 96;
            case 'fountain': return 160;
            case 'market': return 140;
            case 'nature':
            case 'trees':
            case 'bushes':
            case 'rocks': return 90;
            case 'entities':
            case 'npcs':
            case 'enemies':
            case 'pets': return 48;
            case 'props': default: return 48;
        }
    }

    private estimateDefaultHeight(category: AssetCategory): number {
        switch (category) {
            case 'chunks': return 1024;
            case 'portals': return 64;
            case 'items':
            case 'weapons':
            case 'equipment':
            case 'consumables':
            case 'tools': return 32;
            case 'vfx': return 48;
            case 'houses': return 280;
            case 'fortifications': return 260;
            case 'roads': return 256;
            case 'water': return 256;
            case 'bridges': return 140;
            case 'fences': return 80;
            case 'camp': return 96;
            case 'fountain': return 160;
            case 'market': return 140;
            case 'nature':
            case 'trees':
            case 'bushes':
            case 'rocks': return 100;
            case 'entities':
            case 'npcs':
            case 'enemies':
            case 'pets': return 48;
            case 'props': default: return 48;
        }
    }

    /**
     * Retorna todos os assets filtrados por categoria, termo de busca e sub-filtro de tipo opcional.
     * Quando uma tag temática é selecionada (ex: 'houses'), lista TANTO os estáticos QUANTO os sprites correspondentes.
     */
    public getAssets(category?: string, searchTerm?: string, typeFilter: 'all' | 'static' | 'sprites' = 'all'): AssetDefinition[] {
        const all = [...this.assets, ...this.customAssets];
        const SUB_TAG_CATEGORIES = new Set([
            'trees', 'bushes', 'rocks',
            'weapons', 'equipment', 'consumables', 'tools',
            'npcs', 'enemies', 'pets'
        ]);

        const filtered = all.filter(asset => {
            let matchesCategory = true;
            if (category && category !== 'all') {
                if (category === 'sprites') {
                    matchesCategory = asset.isSprite === true || asset.category === 'sprites';
                } else if (category === 'custom') {
                    matchesCategory = asset.isCustom === true || asset.category === 'custom';
                } else if (category === 'items') {
                    matchesCategory = asset.category === 'items' || asset.isItem === true;
                } else if (SUB_TAG_CATEGORIES.has(category)) {
                    matchesCategory = asset.category === category || Boolean(asset.tags?.includes(category));
                } else {
                    matchesCategory = asset.category === category;
                }
            }

            let matchesType = true;
            if (typeFilter === 'static') {
                matchesType = !asset.isSprite;
            } else if (typeFilter === 'sprites') {
                matchesType = Boolean(asset.isSprite);
            }

            const matchesSearch = !searchTerm || 
                asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (asset.category && asset.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
                Boolean(asset.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

            return matchesCategory && matchesType && matchesSearch;
        });

        //? Ordena pares de elementos idênticos (_clean e _anim) lado a lado na gaveta
        return filtered.sort((a, b) => {
            const baseA = a.id.replace(/_clean$|_anim$/, '').toLowerCase();
            const baseB = b.id.replace(/_clean$|_anim$/, '').toLowerCase();
            if (baseA === baseB) {
                //? Ordenação secundária: imagem estática primeiro, animação em seguida
                return (a.isSprite ? 1 : 0) - (b.isSprite ? 1 : 0);
            }
            return baseA.localeCompare(baseB);
        });
    }

    /**
     * Retorna um asset pelo seu ID.
     */
    public getAssetById(id: string): AssetDefinition | undefined {
        return [...this.assets, ...this.customAssets].find(a => a.id === id);
    }

    /**
     * Adiciona um novo sprite/objeto customizado cadastrado via modal.
     */
    public registerCustomAsset(asset: AssetDefinition): void {
        const computedTags = this.detectTagsForAsset(
            asset.imageSrc || '',
            asset.id,
            asset.category,
            Boolean(asset.isItem),
            asset.itemClass,
            asset.itemCategory
        );
        const mergedTags = Array.from(new Set([...(asset.tags || []), ...computedTags, 'custom']));
        this.customAssets.unshift({ ...asset, isCustom: true, tags: mergedTags });
    }
}
