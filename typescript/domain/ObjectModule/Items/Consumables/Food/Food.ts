import Consumable from "../Consumable";
import type { ItemRarity } from "../../Item";
import type Effect from "../../Effects/Effect";

export default abstract class Food extends Consumable {
    constructor(name: string, description: string, itemId: number, rarity: ItemRarity, iconId: number, price: number, effects: Effect[]) {
        super(name, description, itemId, rarity, 'food', iconId, price, effects);
    }
}