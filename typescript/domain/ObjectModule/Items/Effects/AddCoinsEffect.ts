import Effect from "./Effect";
import type Entity from "../../Entities/Entity";

export default class AddCoinsEffect extends Effect {
    constructor(private amount: number) {
        super('Add Coins', `Adiciona ${amount} moedas de ouro.`);
    }

    public apply(target: Entity): void {
    //? Apenas entidades do tipo Player possuem carteira de moedas
        if ('coins' in target) (target as any).coins += this.amount;
    }
}