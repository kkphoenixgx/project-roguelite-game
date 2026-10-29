import Tool from "./Tool";
import type { ItemRarity } from "../Item";

export default class Hoe extends Tool {
    constructor(
        tier: number = 1,
        name: string = 'Enxada Rústica',
        description: string = 'Ferramenta agrícola usada para arar a terra em áreas de plantio fora das cidades.',
        itemId: number = 210,
        rarity: ItemRarity = 'common',
        iconId: number = 210,
        price: number = 40
    ) {
        super('hoe', tier, 1.0, 5, name, description, itemId, rarity, iconId, price, 100);
    }

    public canUseInZone(zoneType: 'city' | 'wilderness' | 'farmland'): boolean {
    //? Enxada restrita a solos aráveis ou fora do perímetro urbano
        return zoneType === 'farmland' || zoneType === 'wilderness';
    }
}
