import Tool from "./Tool";
import type { ItemRarity } from "../Item";

export default class WateringCan extends Tool {
    public currentWater: number;
    public readonly maxWater: number;

    constructor(
        tier: number = 1,
        maxWater: number = 20,
        name: string = 'Regador Simples',
        description: string = 'Recipiente para irrigar solo arado e acelerar o desenvolvimento das plantações.',
        itemId: number = 211,
        rarity: ItemRarity = 'common',
        iconId: number = 211,
        price: number = 45
    ) {
        super('watering_can', tier, 1.0, 3, name, description, itemId, rarity, iconId, price, 100);
        this.maxWater = maxWater;
        this.currentWater = maxWater;
    }

    public canUseInZone(zoneType: 'city' | 'wilderness' | 'farmland'): boolean {
    //? Regador restrito para uso em solos cultiváveis
        return zoneType === 'farmland' || zoneType === 'wilderness';
    }

    public refill(): void {
        this.currentWater = this.maxWater;
    }
}
