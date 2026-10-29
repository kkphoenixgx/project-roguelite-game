import Effect from "./Effect";
import type Entity from "../../Entities/Entity";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import type Attack from "../Attack";
import Vector2D from "../../../shared/Vector2D";

export default class AreaDamageEffect extends Effect {
    constructor(
        private eventManager: IEventManager,
        private radius: number,
        private originalAttack: Attack
    ) {
        super('Area Damage', `Causa dano em área num raio de ${radius}px.`);
    }

    public apply(target: Entity): void {
        this.eventManager.dispatch('requestNeighbors', {
            requester: target,
            radius: this.radius,
            callback: (neighbors) => {
                neighbors.forEach(neighbor => {
                    if (neighbor !== target && 'takeDamage' in neighbor && neighbor.id !== this.originalAttack.attacker.id) {
    //? Dano em área radial escalando com Inteligência do conjurador e bônus de splash
                        const baseMagicalDamage = this.originalAttack.attacker.attributes.intelligence * 1.5;
                        const splashDamage = Math.floor(baseMagicalDamage + (this.originalAttack.attacker.attributes.splashDamage || 0));
                                (neighbor as Entity).takeDamage({ totalDamage: splashDamage || 10, damageType: 'magical', isCritical: false, direction: new Vector2D(0, 0), attacker: this.originalAttack.attacker });
                    }
                });
            }
        });
    }
}