import Effect from "./Effect";
import type Entity from "../../Entities/Entity";
import type { baseAttributes } from "../../Entities/Attributes";

export default class AttributeBoostEffect extends Effect {
    constructor(private attribute: keyof baseAttributes, private amount: number) {
        super('Attribute Boost', `Aumenta permanentemente o atributo ${attribute} em ${amount}.`);
    }

    public apply(target: Entity): void {
        if (this.attribute in target.attributes) {
    //? Modifica atributos base do personagem de forma persistente durante a run
            (target.attributes as any)[this.attribute] += this.amount;
        }
    }
}