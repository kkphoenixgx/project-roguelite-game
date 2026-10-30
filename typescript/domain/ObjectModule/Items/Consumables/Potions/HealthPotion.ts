import Potion from "./Potions";
import HealEffect from "../../Effects/HealEffect";

export default class HealthPotion extends Potion {
    constructor() {
        super('Poção de Vida', 'Uma poção vermelha borbulhante que cura 50 pontos de vida.', 30, 'common', 30, 25, [new HealEffect(50)]);
    }
}