import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import type { baseAttributes } from "../../../Entities/Attributes";
import { type ItemRarity } from "../../Item";
import Weapon from "../Weapon";
import Attack from "../../Attack";
import type Vector2D from "../../../../shared/Vector2D";
import type Entity from "../../../Entities/Entity";
import type Effect from "../../Effects/Effect";

export default abstract class MeleeWeapon extends Weapon {
    public attackRange: number = 32; //? Alcance do golpe em pixels
    public attackAngle: number = 120; //? Ângulo de abertura do golpe em graus (Cone)

    constructor(
        baseDamage: number,
        attackSpeed: number,
        name: string,
        description: string,
        itemId: number,
        rarity: ItemRarity,
        iconId: number,
        price: number,
        durability: number,
        effects: Effect[],
        requiredLevel: number = 1,
        requiredAttributes: Partial<baseAttributes> = {},
        isUnique: boolean = false,
        isTradable: boolean = true,
        unlocksClass?: string
    ) {
        super(baseDamage, attackSpeed, name, description, itemId, rarity, iconId, price, durability, effects, requiredLevel, requiredAttributes, isUnique, isTradable, unlocksClass);
        this.weaponType = 'melee';
    }

    public attack(attacker: Entity, direction: Vector2D, eventManager: IEventManager): void {
    //? Dano de armas corpo a corpo escala primariamente com Força
        const scaledDamage = this.baseDamage + Math.floor(attacker.attributes.strength);
        const weaponAttack = new Attack(attacker, scaledDamage, 'physical', this.onHitActions);
        const areaMult = (attacker.attributes as any).areaMultiplier || 1;
        const currentRange = this.attackRange * areaMult;

        const attackDir = direction.clone().normalizeMut();

        eventManager.dispatch('requestNeighbors', {
            requester: attacker,
            radius: currentRange,
            callback: (neighbors) => {
                neighbors.forEach(neighbor => {
                    const isFriendly = neighbor === attacker || 
                        neighbor.objectId === 'player' || 
                        neighbor.objectId === 'spawn-leviatã' || 
                        neighbor.objectId === 'spawn-leviata' || 
                        neighbor.objectId === 'fishPet';

                    if (!isFriendly && 'takeDamage' in neighbor) {
                        const toNeighborX = (neighbor.coordinates.x + neighbor.size.width / 2) - (attacker.coordinates.x + attacker.size.width / 2);
                        const toNeighborY = (neighbor.coordinates.y + neighbor.size.height / 2) - (attacker.coordinates.y + attacker.size.height / 2);
                        const distance = Math.sqrt(toNeighborX * toNeighborX + toNeighborY * toNeighborY);
                        
                        if (distance > 0) {
      //? Produto escalar verifica se o alvo está no cone angular do corte
                            const dot = attackDir.x * (toNeighborX / distance) + attackDir.y * (toNeighborY / distance);
                            const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);

                            if (angle <= this.attackAngle / 2) {
                                weaponAttack.execute(neighbor as Entity, attackDir);
                            }
                        }
                    }
                });
            }
        });

        const visualDistance = currentRange / 2;
        const visualX = attacker.coordinates.x + attacker.size.width / 2 + attackDir.x * visualDistance;
        const visualY = attacker.coordinates.y + attacker.size.height / 2 + attackDir.y * visualDistance;

        eventManager.dispatch('spawnVisual', {
            type: 'slash',
            coordinates: { x: visualX - (16 * areaMult), y: visualY - (16 * areaMult) },
            duration: 0.15,
            size: { width: 32 * areaMult, height: 32 * areaMult },
            rotation: Math.atan2(attackDir.y, attackDir.x) + Math.PI / 4
        });

        eventManager.dispatch('particle', {
            effect: 'slashSparks',
            x: visualX,
            y: visualY,
            angle: Math.atan2(attackDir.y, attackDir.x)
        });
    }
}