/**
 * @file InnerMapManager.ts
 * Gerencia os InnerMaps (interiores/salas/masmorras) e implementa o double-bind
 * automático entre PortalLinks e InnerMaps diretamente no Assets Editor.
 */

import type { IntermapDefinition, IntermapPortalConfig, IntermapSceneryConfig, IntermapItemConfig } from "../../../domain/ObjectModule/Maps/IntermapConfig";
import type { SelectedMapConfig } from "./MapSelectorModal";
import type { PlacedAssetModel } from "../Models/PlacedAssetModel";
import defaultIntermapsJson from "../../web/assets/maps/intermapsMap.json";
import ItemFactory from "../../../domain/ObjectModule/Items/ItemFactory";

export class InnerMapManager {
    private static instance: InnerMapManager;
    private intermaps: Map<string, IntermapDefinition> = new Map();
    public static readonly ROOT_WORLDS = new Set(['vilgem', 'alun', 'cemii', 'blank_project']);
    private isLoaded: boolean = false;

    private constructor() {
        this.loadInitialData();
    }

    public static getInstance(): InnerMapManager {
        if (!InnerMapManager.instance) {
            InnerMapManager.instance = new InnerMapManager();
        }
        return InnerMapManager.instance;
    }

    private loadInitialData(): void {
        // 1. Carrega do JSON estático importado
        for (const [id, raw] of Object.entries(defaultIntermapsJson)) {
            if (InnerMapManager.ROOT_WORLDS.has(id)) continue;
            const def = raw as any;
            this.intermaps.set(id, {
                id: def.id,
                name: def.name || id,
                parentWorldId: def.parentWorldId || 'vilgem',
                width: def.width || 1024,
                height: def.height || 1024,
                backgroundColor: def.backgroundColor || '#000000',
                chunks: def.chunks,
                chunkSize: def.chunkSize || 1024,
                defaultSpawn: def.defaultSpawn || { x: 512, y: 700 },
                portals: def.portals || [],
                scenery: def.scenery || []
            });
        }

        // 2. Carrega do localStorage se houver dados em cache e expurga contaminações de mundos raiz
        try {
            const cached = localStorage.getItem('rpg_assets_adapter_intermaps');
            if (cached) {
                const parsed = JSON.parse(cached);
                let cleaned = false;
                for (const rootId of InnerMapManager.ROOT_WORLDS) {
                    if (parsed[rootId]) {
                        delete parsed[rootId];
                        cleaned = true;
                    }
                }
                for (const [id, def] of Object.entries(parsed as Record<string, IntermapDefinition>)) {
                    if (!InnerMapManager.ROOT_WORLDS.has(id)) {
                        this.intermaps.set(id, def);
                    }
                }
                if (cleaned) {
                    localStorage.setItem('rpg_assets_adapter_intermaps', JSON.stringify(parsed));
                }
            }
        } catch {}

        for (const rootId of InnerMapManager.ROOT_WORLDS) {
            this.intermaps.delete(rootId);
        }

        this.syncFromDisk();
    }

    /**
     * Sincroniza os intermaps com o arquivo em disco via API do Vite.
     */
    public async syncFromDisk(): Promise<void> {
        try {
            const res = await fetch('/api/assets-adapter?target=intermaps');
            if (res.ok) {
                const data = await res.json();
                if (data.intermaps) {
                    for (const [id, def] of Object.entries(data.intermaps as Record<string, IntermapDefinition>)) {
                        if (!InnerMapManager.ROOT_WORLDS.has(id)) {
                            this.intermaps.set(id, def);
                        }
                    }
                    for (const rootId of InnerMapManager.ROOT_WORLDS) {
                        this.intermaps.delete(rootId);
                    }
                    this.saveToCache();
                }
            }
        } catch {}
        this.isLoaded = true;
    }

    /**
     * Persiste todos os intermaps em disco e cache local.
     */
    public async saveToDisk(): Promise<void> {
        this.saveToCache();
        try {
            const obj: Record<string, IntermapDefinition> = {};
            this.intermaps.forEach((def, id) => {
                if (!InnerMapManager.ROOT_WORLDS.has(id)) {
                    obj[id] = def;
                }
            });

            await fetch('/api/assets-adapter?target=intermaps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intermaps: obj })
            });
        } catch {}
    }

    private saveToCache(): void {
        try {
            const obj: Record<string, IntermapDefinition> = {};
            this.intermaps.forEach((def, id) => {
                if (!InnerMapManager.ROOT_WORLDS.has(id)) {
                    obj[id] = def;
                }
            });
            localStorage.setItem('rpg_assets_adapter_intermaps', JSON.stringify(obj));
        } catch {}
    }

    public getAll(): IntermapDefinition[] {
        return Array.from(this.intermaps.values()).filter(m => !InnerMapManager.ROOT_WORLDS.has(m.id));
    }

    /**
     * Retorna todos os InnerMaps estritamente derivados de um mundo ou innerMap pai.
     */
    public getInnerMapsForWorld(parentWorldId: string): IntermapDefinition[] {
        return Array.from(this.intermaps.values()).filter(m => m.parentWorldId === parentWorldId && !InnerMapManager.ROOT_WORLDS.has(m.id));
    }

    public getInnerMap(id: string): IntermapDefinition | undefined {
        if (InnerMapManager.ROOT_WORLDS.has(id)) return undefined;
        return this.intermaps.get(id);
    }

    public hasInnerMap(id: string): boolean {
        if (InnerMapManager.ROOT_WORLDS.has(id)) return false;
        return this.intermaps.has(id);
    }

    /**
     * Cria um novo InnerMap com validações padrão e double bind.
     */
    public async createInnerMap(config: {
        id: string;
        name?: string | undefined;
        parentWorldId: string;
        width?: number | undefined;
        height?: number | undefined;
        backgroundColor?: string | undefined;
        chunks?: string[][] | undefined;
        chunkSize?: number | undefined;
        defaultSpawn?: { x: number; y: number } | undefined;
        returnPortalCoords?: { x: number; y: number } | undefined;
    }): Promise<IntermapDefinition> {
        const id = config.id.trim();
        if (InnerMapManager.ROOT_WORLDS.has(id)) {
            throw new Error(`Não é permitido criar um InnerMap com o ID de mundo raiz: "${id}"`);
        }
        const width = config.width || 1024;
        const height = config.height || 1024;
        const backgroundColor = config.backgroundColor || '#000000';
        const defaultSpawn = config.defaultSpawn || { x: Math.round(width / 2), y: Math.round(height * 0.7) };

        // Cria o portal de retorno automático para o mundo pai (Double Bind)
        const returnPortal: IntermapPortalConfig = {
            x: Math.round(width / 2),
            y: Math.round(height * 0.75),
            width: 64,
            height: 32,
            targetMapId: config.parentWorldId,
            targetSpawnCoords: config.returnPortalCoords || (config.parentWorldId === 'vilgem' ? { x: 1536, y: 1615 } : { x: 500, y: 500 }),
            type: 'direct',
            cooldownMs: 1000
        };

        const newDef: IntermapDefinition = {
            id,
            name: config.name || this.formatInnerMapName(id),
            parentWorldId: config.parentWorldId,
            width,
            height,
            backgroundColor,
            chunks: config.chunks,
            chunkSize: config.chunkSize || 1024,
            defaultSpawn,
            portals: [returnPortal],
            scenery: []
        };

        this.intermaps.set(id, newDef);
        await this.saveToDisk();
        return newDef;
    }

    /**
     * Atualiza propriedades de um InnerMap (dimensões, cor de fundo, nome...).
     */
    public async updateInnerMap(id: string, updates: Partial<IntermapDefinition>): Promise<IntermapDefinition | undefined> {
        const existing = this.intermaps.get(id);
        if (!existing) return undefined;

        const updated: IntermapDefinition = {
            ...existing,
            ...updates,
            id: existing.id // ID é imutável para não quebrar links existentes
        };

        this.intermaps.set(id, updated);
        await this.saveToDisk();
        return updated;
    }

    public async deleteInnerMap(id: string): Promise<boolean> {
        if (!this.intermaps.has(id)) return false;
        this.intermaps.delete(id);
        await this.saveToDisk();
        return true;
    }

    /**
     * Executa o Double Bind Automático entre um PortalLink colocado no editor e o InnerMap de destino.
     * Garante que:
     * 1. O InnerMap de destino exista no catálogo com `parentWorldId = currentMap.id`.
     * 2. O InnerMap tenha um portal de retorno apontando de volta para `currentMap.id`.
     * 3. O ponto de retorno no mundo de origem aponte exatamente para a frente da porta/portal do mundo de origem.
     */
    public async syncDoubleBind(portalAsset: PlacedAssetModel, currentMap: SelectedMapConfig): Promise<void> {
        if (!portalAsset.targetMapId) return;
        const targetId = portalAsset.targetMapId.trim();

        // Mundos raiz nunca são criados como InnerMaps
        if (InnerMapManager.ROOT_WORLDS.has(targetId)) {
            return;
        }

        const safeReturnCoords = {
            x: Math.round(portalAsset.x),
            y: Math.round(portalAsset.y + Math.max(48, portalAsset.height + 15))
        };

        let innerMap = this.intermaps.get(targetId);

        if (!innerMap) {
            // Cria o InnerMap automaticamente com Double Bind
            innerMap = await this.createInnerMap({
                id: targetId,
                name: portalAsset.name.startsWith('Portal Link') ? this.formatInnerMapName(targetId) : portalAsset.name,
                parentWorldId: currentMap.id,
                defaultSpawn: {
                    x: portalAsset.targetSpawnX ?? 512,
                    y: portalAsset.targetSpawnY ?? 700
                },
                returnPortalCoords: safeReturnCoords
            });
        } else {
            // Atualiza o Double Bind no InnerMap existente
            if (!innerMap.portals) innerMap.portals = [];
            const returnPortal = innerMap.portals.find(p => p.targetMapId === currentMap.id);

            if (returnPortal) {
                // Preserva as coordenadas de retorno customizadas pelo usuário caso já existam
                if (!returnPortal.targetSpawnCoords) {
                    returnPortal.targetSpawnCoords = safeReturnCoords;
                    await this.saveToDisk();
                }
            } else {
                innerMap.portals.push({
                    x: Math.round(innerMap.width / 2),
                    y: Math.round(innerMap.height * 0.75),
                    width: 64,
                    height: 32,
                    targetMapId: currentMap.id,
                    targetSpawnCoords: safeReturnCoords,
                    type: 'direct',
                    cooldownMs: 1000
                });
                await this.saveToDisk();
            }
        }
    }

    /**
     * Salva os assets e portais colocados dentro de um InnerMap.
     */
    public async saveInnerMapElements(
        innerMapId: string,
        placedAssets: PlacedAssetModel[],
        mapConfig: SelectedMapConfig
    ): Promise<void> {
        const innerMap = this.intermaps.get(innerMapId);
        if (!innerMap) return;

        const scenery: IntermapSceneryConfig[] = [];
        const portals: IntermapPortalConfig[] = [];
        const items: IntermapItemConfig[] = [];

        placedAssets.forEach(asset => {
            if (asset.isPortal || asset.presetId.includes('portal')) {
                portals.push({
                    x: Math.round(asset.x),
                    y: Math.round(asset.y),
                    width: asset.width,
                    height: asset.height,
                    targetMapId: asset.targetMapId || innerMap.parentWorldId,
                    targetSpawnCoords: {
                        x: asset.targetSpawnX ?? 512,
                        y: asset.targetSpawnY ?? 700
                    },
                    type: asset.portalType || 'direct',
                    promptText: asset.promptText || 'Entrar',
                    actionKey: asset.actionKey || 'E',
                    cooldownMs: asset.cooldownMs ?? 1000
                });
            } else if (asset.isItem) {
                const itemClass = asset.itemClass || 'SimpleSword';
                const defaults = ItemFactory.getItemDefaults(itemClass);
                const itConfig: IntermapItemConfig = {
                    x: Math.round(asset.x),
                    y: Math.round(asset.y),
                    itemClass
                };

                if (asset.itemId !== undefined && asset.itemId !== defaults?.itemId) itConfig.itemId = asset.itemId;
                if (asset.itemName && asset.itemName !== defaults?.name) itConfig.name = asset.itemName;
                if (asset.itemDescription && asset.itemDescription !== defaults?.description) itConfig.description = asset.itemDescription;
                if (asset.itemRarity && asset.itemRarity !== defaults?.rarity) itConfig.rarity = asset.itemRarity;
                if (asset.itemAmount !== undefined && asset.itemAmount !== defaults?.amount) itConfig.amount = asset.itemAmount;
                if (asset.itemPrice !== undefined && asset.itemPrice !== defaults?.price) itConfig.price = asset.itemPrice;
                if (asset.itemDurability !== undefined && asset.itemDurability !== defaults?.durability) itConfig.durability = asset.itemDurability;
                if (asset.itemBaseDamage !== undefined && asset.itemBaseDamage !== defaults?.baseDamage) itConfig.baseDamage = asset.itemBaseDamage;
                if (asset.itemAttackSpeed !== undefined && asset.itemAttackSpeed !== defaults?.attackSpeed) itConfig.attackSpeed = asset.itemAttackSpeed;
                if (asset.itemDamageReduction !== undefined && asset.itemDamageReduction !== defaults?.damageReductionPercent) itConfig.damageReductionPercent = asset.itemDamageReduction;
                if (asset.itemDodge !== undefined && asset.itemDodge !== defaults?.dodgePercent) itConfig.dodgePercent = asset.itemDodge;
                if (asset.itemRequiredLevel !== undefined && asset.itemRequiredLevel !== defaults?.requiredLevel) itConfig.requiredLevel = asset.itemRequiredLevel;

                items.push(itConfig);
            } else {
                scenery.push({
                    x: Math.round(asset.x),
                    y: Math.round(asset.y),
                    presetId: asset.presetId,
                    flipX: asset.flipX || undefined,
                    flipY: asset.flipY || undefined
                });
            }
        });

        innerMap.scenery = scenery;
        innerMap.portals = portals.length > 0 ? portals : undefined;
        innerMap.items = items.length > 0 ? items : undefined;
        if (mapConfig.backgroundColor) {
            innerMap.backgroundColor = mapConfig.backgroundColor;
        }
        if (mapConfig.chunks) {
            innerMap.chunks = mapConfig.chunks;
        }
        innerMap.width = mapConfig.width;
        innerMap.height = mapConfig.height;

        this.intermaps.set(innerMapId, innerMap);
        await this.saveToDisk();
    }

    /**
     * Converte uma definição de InnerMap para a configuração de mapa usada pelo MapCanvas e EditorApp.
     */
    public toSelectedMapConfig(innerMap: IntermapDefinition): SelectedMapConfig {
        return {
            id: innerMap.id,
            name: innerMap.name || this.formatInnerMapName(innerMap.id),
            width: innerMap.width,
            height: innerMap.height,
            chunkSize: innerMap.chunkSize || 1024,
            chunks: innerMap.chunks,
            backgroundColor: innerMap.backgroundColor || '#000000',
            isInnerMap: true,
            parentWorldId: innerMap.parentWorldId,
            description: `InnerMap interior derivado de ${innerMap.parentWorldId}`
        };
    }

    private formatInnerMapName(id: string): string {
        return id
            .replace(/^interior_/, 'Interior ')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}
