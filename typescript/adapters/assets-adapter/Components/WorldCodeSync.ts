/**
 * @file WorldCodeSync.ts
 * Gerencia a sincronização automática e bidirecional entre o código TypeScript do Domínio (VilgemWorld.ts)
 * e o Assets Adapter. Lê os elementos reais no início e grava automaticamente ao fazer qualquer alteração,
 * sem requerer nenhuma exportação manual.
 */

import { AssetScanner, CLASS_TO_ITEM_KEY } from "./AssetScanner";
import type { PlacedAssetModel } from "../Models/PlacedAssetModel";
import type { SelectedMapConfig } from "./MapSelectorModal";
import rawVilgemWorldCode from "../../../domain/ObjectModule/Maps/VilgemWorld.ts?raw";
import { getPortalLinksForMap } from "../../../domain/ObjectModule/Maps/PortalLinks/portalLinksMap";
import { InnerMapManager } from "./InnerMapManager";
import ItemFactory from "../../../domain/ObjectModule/Items/ItemFactory";

export class WorldCodeSync {
    public static readonly START_DELIMITER = '// <!-- ASSETS_ADAPTER_SCENERY_START -->';
    public static readonly END_DELIMITER = '// <!-- ASSETS_ADAPTER_SCENERY_END -->';

    private saveTimer: any = null;

    /**
     * Extrai a lista de PlacedAssetModel a partir do código-fonte do arquivo do mundo.
     */
    public parseSceneryFromCode(fileContent: string, scanner: AssetScanner): PlacedAssetModel[] {
        let contentToParse = fileContent;

        const startIndex = fileContent.indexOf(WorldCodeSync.START_DELIMITER);
        const endIndex = fileContent.indexOf(WorldCodeSync.END_DELIMITER);

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            contentToParse = fileContent.substring(startIndex + WorldCodeSync.START_DELIMITER.length, endIndex);
        }

        const assets: PlacedAssetModel[] = [];
        // Regex para capturar chamadas de spawn de cenário (com ou sem size explícito)
        const spawnRegex = /this\.eventManager\.dispatch\('spawn',\s*\{\s*type:\s*'scenery',\s*coordinates:\s*\{\s*x:\s*(-?\d+),\s*y:\s*(-?\d+)\s*\}([\s\S]*?)\}\);/g;

        let match: RegExpExecArray | null;
        let count = 0;

        while ((match = spawnRegex.exec(contentToParse)) !== null) {
            const x = parseInt(match[1] || '0', 10);
            const y = parseInt(match[2] || '0', 10);
            const restBody = match[3] || '';
            const presetMatch = /preset:\s*'([^']+)'/.exec(restBody);
            const presetId = presetMatch ? (presetMatch[1] || '') : '';
            const flipX = /flipX:\s*true/.test(restBody);
            const flipY = /flipY:\s*true/.test(restBody);

            count++;
            const assetDef = scanner.getAssetById(presetId);

            const sizeMatch = /size:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/.exec(restBody);
            const width = sizeMatch ? parseInt(sizeMatch[1] || '64', 10) : (assetDef?.width || 64);
            const height = sizeMatch ? parseInt(sizeMatch[2] || '64', 10) : (assetDef?.height || 64);
            const isCustomScaled = Boolean(sizeMatch);
            const name = assetDef?.name || presetId;
            const imageSrc = assetDef?.imageSrc || '';

            assets.push({
                uid: `spawn_${count}_${presetId}_${x}_${y}`,
                presetId,
                name,
                x,
                y,
                width,
                height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                flipX: flipX || undefined,
                flipY: flipY || undefined,
                imageSrc,
                zIndex: 0,
                isCustomScaled,
                isSprite: assetDef?.isSprite || false,
                frameWidth: assetDef?.frameWidth || width,
                frameHeight: assetDef?.frameHeight || height,
                frameCount: assetDef?.frameCount || 1,
                animationSpeed: assetDef?.animationSpeed || 10,
                atlasOffset: assetDef?.atlasOffset || { x: 0, y: 0 }
            });
        }

        // 2. Parser para PortalLinks (diretos e com confirmação [E]):
        const portalRegex = /this\.eventManager\.dispatch\('spawn',\s*\{\s*type:\s*'(portalLinkRequest|portalLink)',\s*coordinates:\s*\{\s*x:\s*(-?\d+),\s*y:\s*(-?\d+)\s*\}([\s\S]*?)\}\);/g;

        let portalMatch: RegExpExecArray | null;
        while ((portalMatch = portalRegex.exec(contentToParse)) !== null) {
            count++;
            const portalTypeStr = portalMatch[1] || 'portalLinkRequest';
            const x = parseInt(portalMatch[2] || '0', 10);
            const y = parseInt(portalMatch[3] || '0', 10);
            const restBody = portalMatch[4] || '';

            const sizeMatch = /size:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/.exec(restBody);
            const width = sizeMatch ? parseInt(sizeMatch[1] || '64', 10) : 64;
            const height = sizeMatch ? parseInt(sizeMatch[2] || '48', 10) : 48;

            const targetMapMatch = /targetMapId:\s*'([^']+)'/.exec(restBody);
            const targetMapId = targetMapMatch ? targetMapMatch[1] : 'interior_black_default';

            const spawnCoordsMatch = /targetSpawnCoords:\s*\{\s*x:\s*(-?\d+),\s*y:\s*(-?\d+)\s*\}/.exec(restBody);
            const targetSpawnX = spawnCoordsMatch ? parseInt(spawnCoordsMatch[1] || '512', 10) : 512;
            const targetSpawnY = spawnCoordsMatch ? parseInt(spawnCoordsMatch[2] || '700', 10) : 700;

            const promptMatch = /promptText:\s*'([^']+)'/.exec(restBody);
            const promptText = promptMatch ? promptMatch[1] : 'Entrar';

            const actionKeyMatch = /actionKey:\s*'([^']+)'/.exec(restBody);
            const actionKey = actionKeyMatch ? actionKeyMatch[1] : 'E';

            const cooldownMatch = /cooldownMs:\s*(\d+)/.exec(restBody);
            const cooldownMs = cooldownMatch ? parseInt(cooldownMatch[1] || '1000', 10) : 1000;

            const portalDef = scanner.getAssetById('portal_link_circle') || scanner.getAssetById('portal_link');
            const imageSrc = portalDef?.imageSrc || '';

            assets.push({
                uid: `portal_${count}_${x}_${y}`,
                presetId: 'portal_link_circle',
                name: `Portal Link -> ${targetMapId}`,
                x,
                y,
                width,
                height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc,
                zIndex: 100,
                isPortal: true,
                portalType: portalTypeStr === 'portalLink' ? 'direct' : 'request',
                targetMapId,
                targetSpawnX,
                targetSpawnY,
                promptText,
                actionKey,
                cooldownMs
            });
        }

        // 3. Parser para Dropped Items (armas, armaduras, consumiveis caidos no mapa):
        const itemRegex = /(?:this\.eventManager\.dispatch\('spawn',\s*\{\s*type:\s*'droppedItem',\s*coordinates:\s*\{\s*x:\s*(-?\d+),\s*y:\s*(-?\d+)\s*\},\s*item:\s*([\s\S]*?)(?:,\s*pickupId:\s*['"][^'"]*['"])?\s*\}\)|this\.spawnDroppedItem\(\s*\{\s*x:\s*(-?\d+),\s*y:\s*(-?\d+)\s*\},\s*([\s\S]*?)(?:,\s*['"][^'"]*['"])?\s*\));/g;
        let itemMatch: RegExpExecArray | null;
        while ((itemMatch = itemRegex.exec(contentToParse)) !== null) {
            count++;
            const x = parseInt(itemMatch[1] || itemMatch[4] || '0', 10);
            const y = parseInt(itemMatch[2] || itemMatch[5] || '0', 10);
            const itemCode = (itemMatch[3] || itemMatch[6] || '').trim();

            let itemClass = 'SimpleSword';
            const customOptions: Record<string, any> = {};

            // Caso A: new ClassName(args)
            const newClassMatch = /^new\s+([A-Za-z0-9_]+)\(([^)]*)\)/.exec(itemCode);
            if (newClassMatch) {
                itemClass = newClassMatch[1] || 'SimpleSword';
                const args = (newClassMatch[2] || '').trim();
                if (args) {
                    const num = parseInt(args, 10);
                    if (!isNaN(num)) {
                        customOptions.amount = num;
                    }
                }
            }

            // Caso B: ItemFactory.createItem(idOrClass, options)
            const factoryMatch = /^ItemFactory\.createItem\(\s*(['"][^'"]+['"]|\d+)(?:,\s*(\{[\s\S]*?\}))?\s*\)/.exec(itemCode);
            if (factoryMatch) {
                const rawIdOrClass = factoryMatch[1]?.replace(/['"]/g, '').trim() || 'SimpleSword';
                const num = parseInt(rawIdOrClass, 10);
                if (!isNaN(num)) {
                    itemClass = ItemFactory.getClassNameById(num) || rawIdOrClass;
                } else {
                    itemClass = rawIdOrClass;
                }

                const optionsStr = factoryMatch[2];
                if (optionsStr) {
                    const nameM = /name:\s*'([^']+)'/.exec(optionsStr);
                    if (nameM) customOptions.name = nameM[1];

                    const descM = /description:\s*'([^']+)'/.exec(optionsStr);
                    if (descM) customOptions.description = descM[1];

                    const rarityM = /rarity:\s*'([^']+)'/.exec(optionsStr);
                    if (rarityM) customOptions.rarity = rarityM[1];

                    const amountM = /amount:\s*(\d+)/.exec(optionsStr);
                    if (amountM) customOptions.amount = parseInt(amountM[1]!, 10);

                    const priceM = /price:\s*(\d+)/.exec(optionsStr);
                    if (priceM) customOptions.price = parseInt(priceM[1]!, 10);

                    const durM = /durability:\s*(\d+)/.exec(optionsStr);
                    if (durM) customOptions.durability = parseInt(durM[1]!, 10);

                    const dmgM = /baseDamage:\s*(\d+)/.exec(optionsStr);
                    if (dmgM) customOptions.baseDamage = parseInt(dmgM[1]!, 10);

                    const atkSpdM = /attackSpeed:\s*([\d.]+)/.exec(optionsStr);
                    if (atkSpdM) customOptions.attackSpeed = parseFloat(atkSpdM[1]!);

                    const defM = /damageReductionPercent:\s*(\d+)/.exec(optionsStr);
                    if (defM) customOptions.damageReductionPercent = parseInt(defM[1]!, 10);

                    const dodgeM = /dodgePercent:\s*(\d+)/.exec(optionsStr);
                    if (dodgeM) customOptions.dodgePercent = parseInt(dodgeM[1]!, 10);

                    const reqLvlM = /requiredLevel:\s*(\d+)/.exec(optionsStr);
                    if (reqLvlM) customOptions.requiredLevel = parseInt(reqLvlM[1]!, 10);
                }
            }

            const presetId = CLASS_TO_ITEM_KEY[itemClass] || itemClass.toLowerCase();
            const assetDef = scanner.getAssetById(presetId) || scanner.getAssets('items').find(a => a.itemClass === itemClass || a.id.toLowerCase() === presetId.toLowerCase());
            const imageSrc = assetDef?.imageSrc || '';

            const defaults = ItemFactory.getItemDefaults(itemClass);
            const finalName = customOptions.name || defaults?.name || assetDef?.name || itemClass;

            assets.push({
                uid: `item_${count}_${itemClass}_${x}_${y}`,
                presetId: assetDef?.id || presetId,
                name: finalName,
                x,
                y,
                width: assetDef?.width || 32,
                height: assetDef?.height || 32,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc,
                zIndex: 10,
                isItem: true,
                itemClass,
                itemId: defaults?.itemId,
                itemName: customOptions.name || defaults?.name,
                itemDescription: customOptions.description || defaults?.description,
                itemRarity: customOptions.rarity || defaults?.rarity,
                itemAmount: customOptions.amount !== undefined ? customOptions.amount : (defaults?.amount || 1),
                itemPrice: customOptions.price !== undefined ? customOptions.price : defaults?.price,
                itemDurability: customOptions.durability !== undefined ? customOptions.durability : defaults?.durability,
                itemBaseDamage: customOptions.baseDamage !== undefined ? customOptions.baseDamage : defaults?.baseDamage,
                itemAttackSpeed: customOptions.attackSpeed !== undefined ? customOptions.attackSpeed : defaults?.attackSpeed,
                itemDamageReduction: customOptions.damageReductionPercent !== undefined ? customOptions.damageReductionPercent : defaults?.damageReductionPercent,
                itemDodge: customOptions.dodgePercent !== undefined ? customOptions.dodgePercent : defaults?.dodgePercent,
                itemRequiredLevel: customOptions.requiredLevel !== undefined ? customOptions.requiredLevel : defaults?.requiredLevel,
                itemCategory: defaults?.category || assetDef?.itemCategory
            });
        }

        return assets;
    }

    /**
     * Gera o código TypeScript formatado organizado por chunks para salvar entre os delimitadores.
     */
    public generateSceneryCode(placedAssets: PlacedAssetModel[], mapConfig: SelectedMapConfig): string {
        const chunkSize = mapConfig.chunkSize || 1024;
        const chunkCols = Math.ceil(mapConfig.width / chunkSize);
        const chunkRows = Math.ceil(mapConfig.height / chunkSize);
        const originCx = mapConfig.originChunk?.cx ?? (mapConfig.id === 'vilgem' ? 1 : 0);
        const originCy = mapConfig.originChunk?.cy ?? (mapConfig.id === 'vilgem' ? 1 : 0);

        const chunksMap = new Map<string, PlacedAssetModel[]>();

        const minSignedCx = -originCx;
        const maxSignedCx = chunkCols - 1 - originCx;
        const minSignedCy = -originCy;
        const maxSignedCy = chunkRows - 1 - originCy;

        for (let r = minSignedCy; r <= maxSignedCy; r++) {
            for (let c = minSignedCx; c <= maxSignedCx; c++) {
                chunksMap.set(`${c},${r}`, []);
            }
        }

        // Agrupa cada asset em seu respectivo chunk (pela coordenada central/base)
        placedAssets.forEach(asset => {
            if (asset.isPaintedLayer) return;
            const chunkX = Math.floor(asset.x / chunkSize);
            const chunkY = Math.floor(asset.y / chunkSize);
            const key = `${chunkX},${chunkY}`;

            if (chunksMap.has(key)) {
                chunksMap.get(key)!.push(asset);
            } else {
                chunksMap.set(key, [asset]);
            }
        });

        const lines: string[] = [];
        let chunkIndex = 1;

        chunksMap.forEach((assetsInChunk, key) => {
            const [cx, cy] = key.split(',').map(Number);
            const minX = (cx ?? 0) * chunkSize;
            const minY = (cy ?? 0) * chunkSize;
            const maxX = minX + chunkSize;
            const maxY = minY + chunkSize;

            // Só gera bloco no código se o chunk tiver assets OU se for o chunk central (0, 0)
            if (assetsInChunk.length === 0 && (cx !== 0 || cy !== 0)) {
                return;
            }

            lines.push(`        //* =========================================================================`);
            lines.push(`        //* ${chunkIndex++}. CHUNK (${cx},${cy}) [${minX}..${maxX}, ${minY}..${maxY}]${cx === 0 && cy === 0 ? ' - Alvorada de Vilgem (Praça Central / Spawn)' : ''}`);
            lines.push(`        //* =========================================================================`);

            if (assetsInChunk.length === 0) {
                lines.push(`        // (Chunk livre de elementos cenográficos estáticos)`);
            } else {
                // Ordena por Y crescente para coerência espacial no código
                assetsInChunk.sort((a, b) => a.y - b.y);

                assetsInChunk.forEach(asset => {
                    if (asset.isPortal || asset.presetId.includes('portal')) {
                        const portalType = asset.portalType === 'direct' ? 'portalLink' : 'portalLinkRequest';
                        const targetMap = asset.targetMapId || 'interior_black_default';
                        const targetX = asset.targetSpawnX ?? 512;
                        const targetY = asset.targetSpawnY ?? 700;
                        const prompt = asset.promptText || 'Entrar';
                        const key = asset.actionKey || 'E';
                        const cooldown = asset.cooldownMs ?? 1000;

                        lines.push(`        // Portal Link -> ${targetMap}`);
                        lines.push(`        this.eventManager.dispatch('spawn', { type: '${portalType}', coordinates: { x: ${Math.round(asset.x)}, y: ${Math.round(asset.y)} }, size: { width: ${asset.width}, height: ${asset.height} }, metadata: { targetMapId: '${targetMap}', targetSpawnCoords: { x: ${targetX}, y: ${targetY} }, promptText: '${prompt}', actionKey: '${key}', cooldownMs: ${cooldown} } });`);
                    } else if (asset.isItem) {
                        const itemClass = asset.itemClass || 'SimpleSword';
                        const defaults = ItemFactory.getItemDefaults(itemClass);
                        const customOpts: string[] = [];

                        if (asset.itemName && asset.itemName !== defaults?.name) {
                            customOpts.push(`name: '${asset.itemName.replace(/'/g, "\\'")}'`);
                        }
                        if (asset.itemDescription && asset.itemDescription !== defaults?.description) {
                            customOpts.push(`description: '${asset.itemDescription.replace(/'/g, "\\'")}'`);
                        }
                        if (asset.itemRarity && asset.itemRarity !== defaults?.rarity) {
                            customOpts.push(`rarity: '${asset.itemRarity}'`);
                        }
                        if (asset.itemAmount !== undefined && asset.itemAmount !== defaults?.amount) {
                            customOpts.push(`amount: ${asset.itemAmount}`);
                        }
                        if (asset.itemPrice !== undefined && asset.itemPrice !== defaults?.price) {
                            customOpts.push(`price: ${asset.itemPrice}`);
                        }
                        if (asset.itemDurability !== undefined && asset.itemDurability !== defaults?.durability) {
                            customOpts.push(`durability: ${asset.itemDurability}`);
                        }
                        if (asset.itemBaseDamage !== undefined && asset.itemBaseDamage !== defaults?.baseDamage) {
                            customOpts.push(`baseDamage: ${asset.itemBaseDamage}`);
                        }
                        if (asset.itemAttackSpeed !== undefined && asset.itemAttackSpeed !== defaults?.attackSpeed) {
                            customOpts.push(`attackSpeed: ${asset.itemAttackSpeed}`);
                        }
                        if (asset.itemDamageReduction !== undefined && asset.itemDamageReduction !== defaults?.damageReductionPercent) {
                            customOpts.push(`damageReductionPercent: ${asset.itemDamageReduction}`);
                        }
                        if (asset.itemDodge !== undefined && asset.itemDodge !== defaults?.dodgePercent) {
                            customOpts.push(`dodgePercent: ${asset.itemDodge}`);
                        }
                        if (asset.itemRequiredLevel !== undefined && asset.itemRequiredLevel !== defaults?.requiredLevel) {
                            customOpts.push(`requiredLevel: ${asset.itemRequiredLevel}`);
                        }

                        let itemCode: string;
                        if (customOpts.length > 0) {
                            itemCode = `ItemFactory.createItem('${itemClass}', { ${customOpts.join(', ')} })`;
                        } else {
                            itemCode = `new ${itemClass}()`;
                        }

                        lines.push(`        // Item: ${asset.name}`);
                        lines.push(`        this.spawnDroppedItem({ x: ${Math.round(asset.x)}, y: ${Math.round(asset.y)} }, ${itemCode});`);
                    } else {
                        lines.push(`        // ${asset.name}`);
                        let meta = `preset: '${asset.presetId}'`;
                        if (asset.flipX) meta += `, flipX: true`;
                        if (asset.flipY) meta += `, flipY: true`;
                        const isScaled = asset.isCustomScaled && Boolean(asset.frameWidth && asset.frameHeight && (Math.round(asset.width) !== Math.round(asset.frameWidth) || Math.round(asset.height) !== Math.round(asset.frameHeight)));
                        const sizePart = isScaled ? `, size: { width: ${Math.round(asset.width)}, height: ${Math.round(asset.height)} }` : '';
                        lines.push(`        this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: ${Math.round(asset.x)}, y: ${Math.round(asset.y)} }${sizePart}, metadata: { ${meta} } });`);
                    }
                });
            }

            lines.push(``);
            chunkIndex++;
        });

        return lines.join('\n').trimEnd();
    }

    /**
     * Carrega os assets do mundo diretamente do arquivo em disco (via API do Vite)
     * com fallback transparente para o código estático importado ou InnerMapManager.
     */
    public async loadWorldAssets(mapId: string, scanner: AssetScanner, mapConfig?: SelectedMapConfig): Promise<PlacedAssetModel[]> {
        const innerMapMgr = InnerMapManager.getInstance();
        const isRootWorld = InnerMapManager.ROOT_WORLDS.has(mapId);

        // Se for um InnerMap e NÃO um mundo raiz conhecido, carrega suas entidades do InnerMapManager
        if (!isRootWorld && (mapConfig?.isInnerMap || innerMapMgr.hasInnerMap(mapId))) {
            const def = innerMapMgr.getInnerMap(mapId);
            if (def) {
                const assets: PlacedAssetModel[] = [];
                // 1. Scenery
                if (def.scenery) {
                    def.scenery.forEach((sc, idx) => {
                        const assetDef = scanner.getAssetById(sc.presetId);
                        assets.push({
                            uid: `inner_scenery_${idx}_${sc.presetId}_${sc.x}_${sc.y}`,
                            presetId: sc.presetId,
                            name: assetDef?.name || sc.presetId,
                            x: sc.x,
                            y: sc.y,
                            width: assetDef?.width || 64,
                            height: assetDef?.height || 64,
                            rotation: 0,
                            scaleX: 1,
                            scaleY: 1,
                            flipX: sc.flipX,
                            flipY: sc.flipY,
                            imageSrc: assetDef?.imageSrc || '',
                            zIndex: 0,
                            isSprite: assetDef?.isSprite || false
                        });
                    });
                }
                // 2. Portais
                if (def.portals) {
                    def.portals.forEach((p, idx) => {
                        const portalDef = scanner.getAssetById('portal_link_circle') || scanner.getAssetById('portal_link');
                        assets.push({
                            uid: `inner_portal_${idx}_${p.x}_${p.y}`,
                            presetId: 'portal_link_circle',
                            name: `Portal Link -> ${p.targetMapId}`,
                            x: p.x,
                            y: p.y,
                            width: p.width,
                            height: p.height,
                            rotation: 0,
                            scaleX: 1,
                            scaleY: 1,
                            imageSrc: portalDef?.imageSrc || '',
                            zIndex: 100,
                            isPortal: true,
                            portalType: p.type || 'direct',
                            targetMapId: p.targetMapId,
                            targetSpawnX: p.targetSpawnCoords?.x,
                            targetSpawnY: p.targetSpawnCoords?.y,
                            promptText: p.promptText || 'Entrar',
                            actionKey: p.actionKey || 'E',
                            cooldownMs: p.cooldownMs ?? 1000
                        });
                    });
                }
                // 3. Itens
                if (def.items) {
                    def.items.forEach((it, idx) => {
                        const itemClass = it.itemClass || 'SimpleSword';
                        const presetId = CLASS_TO_ITEM_KEY[itemClass] || itemClass.toLowerCase();
                        const assetDef = scanner.getAssetById(presetId) || scanner.getAssets('items').find(a => a.itemClass === itemClass || a.id.toLowerCase() === presetId.toLowerCase());
                        const defaults = ItemFactory.getItemDefaults(itemClass);
                        const finalName = it.name || defaults?.name || assetDef?.name || itemClass;

                        assets.push({
                            uid: `inner_item_${idx}_${itemClass}_${it.x}_${it.y}`,
                            presetId: assetDef?.id || presetId,
                            name: finalName,
                            x: it.x,
                            y: it.y,
                            width: assetDef?.width || 32,
                            height: assetDef?.height || 32,
                            rotation: 0,
                            scaleX: 1,
                            scaleY: 1,
                            imageSrc: assetDef?.imageSrc || '',
                            zIndex: 10,
                            isItem: true,
                            itemClass,
                            itemId: it.itemId ?? defaults?.itemId,
                            itemName: it.name ?? defaults?.name,
                            itemDescription: it.description ?? defaults?.description,
                            itemRarity: (it.rarity as any) ?? defaults?.rarity,
                            itemAmount: it.amount !== undefined ? it.amount : (defaults?.amount || 1),
                            itemPrice: it.price !== undefined ? it.price : defaults?.price,
                            itemDurability: it.durability !== undefined ? it.durability : defaults?.durability,
                            itemBaseDamage: it.baseDamage !== undefined ? it.baseDamage : defaults?.baseDamage,
                            itemAttackSpeed: it.attackSpeed !== undefined ? it.attackSpeed : defaults?.attackSpeed,
                            itemDamageReduction: it.damageReductionPercent !== undefined ? it.damageReductionPercent : defaults?.damageReductionPercent,
                            itemDodge: it.dodgePercent !== undefined ? it.dodgePercent : defaults?.dodgePercent,
                            itemRequiredLevel: it.requiredLevel !== undefined ? it.requiredLevel : defaults?.requiredLevel,
                            itemCategory: defaults?.category || assetDef?.itemCategory
                        });
                    });
                }
                return assets;
            }
        }

        let assets: PlacedAssetModel[] = [];
        try {
            const res = await fetch(`/api/assets-adapter?mapId=${encodeURIComponent(mapId)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.content) {
                    console.log(`%c[Assets Adapter] %cCarregado com sucesso do disco via /api/assets-adapter (${mapId})`, 'color: #10b981', 'color: white');
                    assets = this.parseSceneryFromCode(data.content, scanner);
                }
            }
        } catch {
            // Em testes ou ambientes offline, utiliza o fallback estático
        }

        if (assets.length === 0 && mapId === 'vilgem') {
            console.log(`%c[Assets Adapter] %cUsando fonte de código estática para ${mapId}`, 'color: #3b82f6', 'color: white');
            assets = this.parseSceneryFromCode(rawVilgemWorldCode, scanner);
        }

        // Se o arquivo ainda não contém os portais cadastrados no catálogo PortalLinksMap, mescla-os para visualização e edição imediata
        const catalogPortals = getPortalLinksForMap(mapId);
        catalogPortals.forEach((p, idx) => {
            const alreadyInAssets = assets.some(a => a.isPortal && a.targetMapId === p.targetMapId);
            if (!alreadyInAssets) {
                const portalDef = scanner.getAssetById('portal_link_circle') || scanner.getAssetById('portal_link');
                assets.push({
                    uid: `portal_catalog_${idx}_${p.coordinates.x}_${p.coordinates.y}`,
                    presetId: 'portal_link_circle',
                    name: `Portal Link -> ${p.targetMapId}`,
                    x: p.coordinates.x,
                    y: p.coordinates.y,
                    width: p.size.width || 64,
                    height: p.size.height || 48,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    imageSrc: portalDef?.imageSrc || '',
                    zIndex: 100,
                    isPortal: true,
                    portalType: p.type,
                    targetMapId: p.targetMapId,
                    targetSpawnX: p.targetSpawnCoords?.x ?? 512,
                    targetSpawnY: p.targetSpawnCoords?.y ?? 700,
                    promptText: p.promptText || 'Entrar',
                    actionKey: p.actionKey || 'E',
                    cooldownMs: p.cooldownMs ?? 1000
                });
            }
        });

        return assets;
    }

    /**
     * Salva automaticamente com debounce no arquivo do mundo em disco ou InnerMapManager.
     */
    public autoSave(
        mapId: string,
        placedAssets: PlacedAssetModel[],
        mapConfig: SelectedMapConfig,
        onStatusChange?: (status: 'saving' | 'saved' | 'error', message?: string) => void
    ): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }

        onStatusChange?.('saving', 'Gravando alterações...');

        this.saveTimer = setTimeout(async () => {
            try {
                const isRootWorld = InnerMapManager.ROOT_WORLDS.has(mapId);
                // Se for um InnerMap e NÃO um mundo raiz conhecido, salva via InnerMapManager
                if (!isRootWorld && (mapConfig.isInnerMap || InnerMapManager.getInstance().hasInnerMap(mapId))) {
                    await InnerMapManager.getInstance().saveInnerMapElements(mapId, placedAssets, mapConfig);
                    onStatusChange?.('saved', `Sincronizado automaticamente com InnerMap ${mapConfig.name}`);
                    return;
                }

                const sceneryCode = this.generateSceneryCode(placedAssets, mapConfig);
                const res = await fetch(`/api/assets-adapter?mapId=${encodeURIComponent(mapId)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mapId, sceneryCode })
                });

                if (res.ok) {
                    onStatusChange?.('saved', `Sincronizado automaticamente com ${mapId === 'vilgem' ? 'VilgemWorld.ts' : mapId}`);
                } else {
                    const err = await res.json().catch(() => ({}));
                    onStatusChange?.('error', err.error || 'Falha ao sincronizar com arquivo.');
                }
            } catch (e: any) {
                onStatusChange?.('error', `Falha de rede/servidor ao salvar: ${e.message}`);
            }
        }, 350);
    }
}
