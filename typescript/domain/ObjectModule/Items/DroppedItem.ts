import type { IEventManager } from "../../eventDispacher/IGameEvents";
import { HitBoxCircle } from "../../hitBox/HitBoxCircle";
import type { objectTypeId } from "../objectType.type";
import ObjectElement from "../ObjectElement";
import type Item from "./Item";
import Player from "../Entities/Player/Player";
import { RegisterSpawner, type SpawnPayload } from "../SpawnRegistry";

@RegisterSpawner('droppedItem')
export default class DroppedItem extends ObjectElement {
    public item: Item;
    public readonly pickupId: string;
    private isCollected: boolean = false;

    constructor(
        id: number,
        coordinates: { x: number; y: number },
        item: Item,
        eventManager: IEventManager,
        objectId: objectTypeId = 'droppedItem',
        pickupId: string = ''
    ) {
        const size = { width: 16, height: 16 };
        const iconIdStr = item?.iconId !== undefined && item?.iconId !== null ? item.iconId.toString() : '4';
        super(size, coordinates, id, objectId, eventManager, iconIdStr);
        this.item = item;
        this.pickupId = pickupId;
        
        if (!this.item) {
            this.hitboxes = [];
            return;
        }

        // A ANTECIPAÇÃO (Pavlov): Dispara o farol dopaminérgico visual se o item for de alta raridade!
        if (this.item.rarity && ['rare', 'epic', 'legendary'].includes(this.item.rarity)) {
            setTimeout(() => {
                this.eventManager.dispatch('particle', { 
                    effect: 'legendaryLootBeacon', 
                    x: this.coordinates.x + this.size.width / 2, 
                    y: this.coordinates.y + this.size.height / 2 
                });
            }, 0);
        }

        this.hitboxes = [
            new HitBoxCircle(
                { x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 },
                0,
                12, // Radius um pouco maior (12px) para facilitar a coleta ao passar perto
                (otherElement: ObjectElement) => {
                    if (this.isCollected || !this.item) return; // Trava de Idempotência

                    if (otherElement instanceof Player) {
                        if (this.item.category === 'currency' && 'use' in this.item) {
                            // Ouro auto-coletado! Não ocupa espaço na mochila.
                            (this.item as any).use(otherElement);
                            if (this.pickupId) {
                                otherElement.collectWorldItem(this.pickupId);
                                this.eventManager.dispatch('worldItemCollected', { pickupId: this.pickupId });
                            }
                            // Um estalo visual dopaminérgico amarelo
                            this.eventManager.dispatch('particle', { effect: 'magicAura', x: this.coordinates.x, y: this.coordinates.y, color: '#FFD700' });
                            this.eventManager.dispatch('log', { channel: 'domain', message: `Collected item: ${this.item.name}`, params: [] });
                            this.isCollected = true;
                            super.destroy(); // Despawna a cápsula do mapa
                        } else {
                            if (otherElement.backpack.length < otherElement.maxBackpackSize) {
                                otherElement.addItem(this.item);
                                if (this.pickupId) {
                                    otherElement.collectWorldItem(this.pickupId);
                                    this.eventManager.dispatch('worldItemCollected', { pickupId: this.pickupId });
                                }
                                this.isCollected = true;
                                this.eventManager.dispatch('log', { channel: 'domain', message: `Collected item: ${this.item.name}`, params: [] });
                                super.destroy(); // Despawna a cápsula do mapa
                            } else {
                                this.eventManager.dispatch('log', { channel: 'error', message: `Mochila cheia! Não é possível coletar ${this.item.name}.`, params: [] });
                            }
                        }
                    }
                }
            )
        ];
    }

    public override update(_deltaTime: number): void { }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): DroppedItem {
        return new DroppedItem(id, payload.coordinates, payload.item, eventManager, 'droppedItem', payload.pickupId || '');
    }
}