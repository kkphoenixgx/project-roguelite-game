import Effect from "./Effect";
import type Entity from "../../Entities/Entity";

export default class HealEffect extends Effect {
    constructor(private amount: number) {
        super('Heal', `Restaura ${amount} pontos de vida.`);
    }

    public apply(target: Entity): void {
        const oldHp = target.attributes.hp;
        target.attributes.hp += this.amount; //? Setter em Attributes garante que a vida não exceda maxHp
        const healedAmount = target.attributes.hp - oldHp;
        target['eventManager']?.dispatch('log', { channel: 'domain', message: `Healed for ${healedAmount} HP.`, params: [] });
    }
}