import type { IEventManager } from "../eventDispacher/IGameEvents";
import type { WorldState, WorldBoundsDTO } from "../ports/domain-contracts";
import type ObjectElement from "./ObjectElement";
import { HitboxParser } from "../hitBox/HitboxParser";
import { getPortalLinksForMap } from "./Maps/PortalLinks/portalLinksMap";
import { ChunkBoundaryHelper, type ChunkBoundaryHitbox } from "./Maps/ChunkBoundaryHelper";

export default abstract class GameWorld {
    public abstract readonly mapId: string;
    public abstract readonly width: number;
    public abstract readonly height: number;
    public readonly minX: number = 0;
    public readonly minY: number = 0;
    public readonly maxX: number = 0;
    public readonly maxY: number = 0;
    public readonly originChunk: { cx: number; cy: number } = { cx: 0, cy: 0 };
    public readonly defaultSpawn?: { x: number; y: number } | undefined;
    public readonly chunks?: (string | undefined | null)[][] | undefined;
    public readonly chunkSize: number = 1024;

    public isChunkValid(cx: number, cy: number): boolean {
        if (this.chunks && this.chunks.length > 0) {
            return ChunkBoundaryHelper.isChunkValid(this.chunks, this.originChunk, cx, cy);
        }
        const minCx = Math.floor(this.minX / this.chunkSize);
        const maxCx = Math.floor((this.maxX - 1) / this.chunkSize);
        const minCy = Math.floor(this.minY / this.chunkSize);
        const maxCy = Math.floor((this.maxY - 1) / this.chunkSize);
        return cx >= minCx && cx <= maxCx && cy >= minCy && cy <= maxCy;
    }

    public get bounds(): WorldBoundsDTO {
        const minX = this.minX !== 0 || this.maxX !== 0 ? this.minX : 0;
        const minY = this.minY !== 0 || this.maxY !== 0 ? this.minY : 0;
        const maxX = this.minX !== 0 || this.maxX !== 0 ? this.maxX : this.width;
        const maxY = this.minY !== 0 || this.maxY !== 0 ? this.maxY : this.height;
        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
            originChunk: this.originChunk,
            chunks: this.chunks,
            chunkSize: this.chunkSize
        };
    }

    constructor(protected eventManager: IEventManager) {}

    public async generate(collisionData?: any[]): Promise<void> {
        this.eventManager.dispatch('log', { channel: 'init', message: `Gerando o mundo de ${this.mapId}...`, params: [] });

        let spawnedBoundaryCount = 0;

        if (collisionData) {
            for (const data of collisionData) {
    //? Descarta bordas legadas estáticas caso o mapa possua particionamento de chunks dinâmicos configurado
                const isLegacyHardcodedBorder = this.chunks && (
                    data.id === 'border_left' ||
                    data.id === 'border_right' ||
                    data.id === 'border_top' ||
                    data.id === 'border_bottom'
                );

                if (isLegacyHardcodedBorder) {
                    continue;
                }

                if (data.metadata?.isMapBoundary || (data.id && data.id.startsWith('border_'))) {
                    spawnedBoundaryCount++;
                }

        //? A matemática absoluta do Editor já resolve o pivot das coordenadas
                const hitboxes = HitboxParser.parse([data], { x: 0, y: 0 }, () => {});
                
        //? Computa o AABB do polígono de colisão para indexação na SpatialGrid do domínio
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                if (data.type === 'polygon' && data.points) {
                    data.points.forEach((p: any) => {
                        if (p.x < minX) minX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y > maxY) maxY = p.y;
                    });
                } else if (data.type === 'circle') {
                    minX = data.coordinates.x - (data.radius || 0);
                    maxX = data.coordinates.x + (data.radius || 0);
                    minY = data.coordinates.y - (data.radius || 0);
                    maxY = data.coordinates.y + (data.radius || 0);
                }

                this.eventManager.dispatch('spawn', {
                    type: 'environmentCollider',
                    coordinates: { x: minX, y: minY },
                    size: { width: maxX - minX, height: maxY - minY },
                    hitboxes: hitboxes,
                    metadata: { tileType: 'wall', passable: false, ...(data.metadata || {}) }
                });
            }
        }

    //? Gera barreiras dinâmicas de borda automaticamente quando o mapa é baseado em chunks e sem colisão estática
        if (spawnedBoundaryCount === 0 && this.chunks && this.chunks.length > 0) {
            const dynamicBoundaries = ChunkBoundaryHelper.computeBoundaries(this.chunks, this.originChunk, this.chunkSize);
            for (const b of dynamicBoundaries) {
                const hitboxes = HitboxParser.parse([b], { x: 0, y: 0 }, () => {});
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const p of b.points) {
                    if (p.x < minX) minX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y > maxY) maxY = p.y;
                }
                this.eventManager.dispatch('spawn', {
                    type: 'environmentCollider',
                    coordinates: { x: minX, y: minY },
                    size: { width: maxX - minX, height: maxY - minY },
                    hitboxes: hitboxes,
                    metadata: { tileType: 'wall', passable: false, isMapBoundary: true, side: b.metadata?.side }
                });
            }
        }

    //? Rastreia portais gerados pelas subclasses para evitar duplicatas por coordenada
        const spawnedPortalCoords = new Set<string>();
        const portalSpawnTracker = (payload: any) => {
            if (payload && (payload.type === 'portalLink' || payload.type === 'portalLinkRequest') && payload.coordinates) {
                spawnedPortalCoords.add(`${payload.coordinates.x}_${payload.coordinates.y}`);
            }
        };
        this.eventManager.on('spawn', portalSpawnTracker);

        await this.generateCustomElements();

        if (this.eventManager.off) {
            this.eventManager.off('spawn', portalSpawnTracker);
        }

    //? Registra portais data-driven (diretos e com confirmação [E]) mapeados para este mundo
        this.generatePortalLinks(spawnedPortalCoords);

        this.eventManager.dispatch('log', { channel: 'init', message: `Mundo de ${this.mapId} gerado com sucesso.`, params: [] });
    }

    /**
     * Spawna os portais registrados no PortalLinksMap para o mapa atual.
     */
    protected generatePortalLinks(alreadySpawnedCoords?: Set<string>): void {
        const portals = getPortalLinksForMap(this.mapId);
        for (const portal of portals) {
            const coordKey = `${portal.coordinates.x}_${portal.coordinates.y}`;
            if (alreadySpawnedCoords && alreadySpawnedCoords.has(coordKey)) {
                continue;
            }
            const spawnPayload: any = {
                type: portal.type === 'request' ? 'portalLinkRequest' : 'portalLink',
                coordinates: { x: portal.coordinates.x, y: portal.coordinates.y },
                size: { width: portal.size.width, height: portal.size.height },
                metadata: {
                    targetMapId: portal.targetMapId,
                    targetSpawnCoords: portal.targetSpawnCoords,
                    cooldownMs: portal.cooldownMs,
                    promptText: portal.promptText,
                    actionKey: portal.actionKey
                }
            };
            if (portal.hitboxes) {
                spawnPayload.hitboxes = portal.hitboxes;
            }
            this.eventManager.dispatch('spawn', spawnPayload);
        }
    }

    /**
     * Spawna um item coletável no mapa com identificador determinístico de persistência.
     */
    protected spawnDroppedItem(coordinates: { x: number; y: number }, item: any, pickupId?: string): void {
        const resolvedId = pickupId || `${this.mapId}_item_${coordinates.x}_${coordinates.y}_${item.constructor?.name || item.name || 'item'}`;
        this.eventManager.dispatch('spawn', {
            type: 'droppedItem',
            coordinates,
            item,
            pickupId: resolvedId
        });
    }

    /**
     * Método abstrato que as subclasses devem implementar
     * Aqui vão os elementos customizados (NPCs, inimigos, baús, etc)
     */
    protected abstract generateCustomElements(): Promise<void>;

    public getState(): WorldState {
        const bounds = this.bounds;
        return {
            width: this.width,
            height: this.height,
            mapId: this.mapId,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            originChunk: this.originChunk,
            bounds
        };
    }
}