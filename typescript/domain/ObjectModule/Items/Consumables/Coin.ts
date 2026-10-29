import Consumable from "./Consumable";
import AddCoinsEffect from "../Effects/AddCoinsEffect";

export default class Coin extends Consumable {
    constructor(amount: number = 10) {
    //? Moeda auto-consumível somada diretamente à carteira do jogador
        super('Moedas de Ouro', 'Pedaços de ouro puro. São pesados, brilhantes e a linguagem universal.', 33, 'common', 'currency', 33, amount, [new AddCoinsEffect(amount)]);
    }
}