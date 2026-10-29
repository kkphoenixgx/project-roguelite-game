import Tool from "./Tool";
import type { ItemRarity } from "../Item";

export default class Axe extends Tool {
    constructor(
        tier: number = 1,
        name: string = 'Machado de Lenhador',
        description: string = 'Lâmina pesada ideal para derrubar árvores demarcadas em florestas e bosques.',
        itemId: number = 212,
        rarity: ItemRarity = 'common',
        iconId: number = 212,
        price: number = 60
    ) {
        super('axe', tier, 1.0, 8, name, description, itemId, rarity, iconId, price, 120);
    }

    public canUseInZone(zoneType: 'city' | 'wilderness' | 'farmland'): boolean {
        // Machado só pode ser usado em áreas selvagens/bosques
        return zoneType === 'wilderness';
    }
}
