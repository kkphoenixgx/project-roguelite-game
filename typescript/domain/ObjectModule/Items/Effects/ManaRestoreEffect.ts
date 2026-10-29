import Effect from "./Effect";
import type Entity from "../../Entities/Entity";

export default class ManaRestoreEffect extends Effect {
    constructor(private amount: number) {
        super('Mana Restore', `Restaura ${amount} pontos de mana.`);
    }

    public apply(target: Entity): void {
        target.attributes.mana += this.amount; //? Setter em Attributes limita restauração ao teto maxMana
    }
}