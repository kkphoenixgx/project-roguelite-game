import Item, { type ItemRarity } from "../Item";
import type Effect from "../Effects/Effect";

export type ToolType = 'hoe' | 'watering_can' | 'axe' | 'hammer';

export default abstract class Tool extends Item {
    constructor(
        public readonly toolType: ToolType,
        public readonly tier: number, //? Tier da ferramenta (1: Madeira, 2: Pedra, 3: Ferro, 4: Ouro, 5: Mithril)
        public readonly efficiency: number, //? Multiplicador de velocidade da ação (1.0 = normal)
        public readonly staminaCost: number, //? Custo de vigor por uso da ferramenta
        name: string,
        description: string,
        itemId: number,
        rarity: ItemRarity,
        iconId: number,
        price: number,
        durability: number = 100,
        effects: Effect[] = []
    ) {
        super(name, description, itemId, rarity, 'tool', iconId, price, false, 1, durability, effects, 1, {}, false, true);
    }

    /**
     * Valida se a ferramenta pode ser utilizada na zona especificada do jogo.
     * Diretriz de Design:
     * - O jogo NÃO é sandbox livre;
     * - 'city': Construção e personalização (ex: Martelo);
     * - 'farmland' / 'wilderness': Ações de solo (Enxada, Regador) e extração de árvores (Machado).
     */
    public abstract canUseInZone(zoneType: 'city' | 'wilderness' | 'farmland'): boolean;
}
