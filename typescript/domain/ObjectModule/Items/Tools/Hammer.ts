import Tool from "./Tool";
import type { ItemRarity } from "../Item";

export default class Hammer extends Tool {
    constructor(
        tier: number = 1,
        name: string = 'Martelo de Construção',
        description: string = 'Ferramenta de carpintaria e alvenaria para erguer e personalizar estruturas residenciais nas cidades.',
        itemId: number = 213,
        rarity: ItemRarity = 'common',
        iconId: number = 213,
        price: number = 70
    ) {
        super('hammer', tier, 1.0, 6, name, description, itemId, rarity, iconId, price, 150);
    }

    public canUseInZone(zoneType: 'city' | 'wilderness' | 'farmland'): boolean {
        // Martelo para construção/personalização residencial só é permitido em cidades/vilas
        return zoneType === 'city';
    }
}
