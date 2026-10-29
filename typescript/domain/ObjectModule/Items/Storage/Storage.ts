import Item, { type ItemCategory, type ItemRarity } from "../Item";
import type Effect from "../Effects/Effect";

export default abstract class Storage extends Item {
    constructor(
        name: string,
        description: string,
        itemId: number,
        rarity: ItemRarity,
        iconId: number,
        price: number,
        effects: Effect[] = [],
        category: ItemCategory = 'storage'
    ) {
        super(name, description, itemId, rarity, category, iconId, price, false, 1, 100, effects, 1, {}, false, true);
    }
}