import Potion from "./Potions";
import ManaRestoreEffect from "../../Effects/ManaRestoreEffect";

export default class ManaPotion extends Potion {
    constructor() {
        super('Poção de Mana', 'Um frasco brilhante e frio que devolve 30 pontos de mana.', 31, 'common', 31, 25, [new ManaRestoreEffect(30)]);
    }
}