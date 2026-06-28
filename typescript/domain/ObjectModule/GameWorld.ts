import type { IEventManager } from "../eventDispacher/IGameEvents";
import type { WorldState } from "../ports/domain-contracts";
import type ObjectElement from "./ObjectElement";
import { HitboxParser } from "../hitBox/HitboxParser";

export default abstract class GameWorld {
    public abstract readonly mapId: string;
    public abstract readonly width: number;
    public abstract readonly height: number;

    constructor(protected eventManager: IEventManager) {}

    public async generate(collisionData?: any[]): Promise<void> {
        this.eventManager.dispatch('log', { channel: 'init', message: `Gerando o mundo de ${this.mapId}...`, params: [] });

        if (collisionData) {
            for (const data of collisionData) {
                // A matemática absoluta do Editor já resolve o pivot
                const hitboxes = HitboxParser.parse([data], { x: 0, y: 0 }, () => {});
                
                // Computa o AABB (Caixa Limite) do polígono desenhado para a QuadTree/SpatialGrid do Domínio
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
                    metadata: { tileType: 'wall', passable: false }
                });
            }
        }

        // Chama implementação específica do mundo (NPCs, inimigos, etc)
        await this.generateCustomElements();

        this.eventManager.dispatch('log', { channel: 'init', message: `Mundo de ${this.mapId} gerado com sucesso.`, params: [] });
    }

    /**
     * Método abstrato que as subclasses devem implementar
     * Aqui vão os elementos customizados (NPCs, inimigos, baús, etc)
     */
    protected abstract generateCustomElements(): Promise<void>;

    public getState(): WorldState {
        return { width: this.width, height: this.height, mapId: this.mapId };
    }
}