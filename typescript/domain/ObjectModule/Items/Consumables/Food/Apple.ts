import Food from "./Food";
import HealEffect from "../../Effects/HealEffect";
import ManaRestoreEffect from "../../Effects/ManaRestoreEffect";

export default class Apple extends Food {
    constructor() {
        super('Maçã Silvestre', 'Uma fruta suculenta colhida nas florestas. Restaura vida e mana leves.', 32, 'common', 32, 5, [new HealEffect(15), new ManaRestoreEffect(5)]);
    }
}