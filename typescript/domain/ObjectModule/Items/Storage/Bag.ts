import Storage from "./Storage";
import type Item from "../Item";
import { type ItemRarity } from "../Item";
import type Effect from "../Effects/Effect";

export default abstract class Bag extends Storage {
    public storedItems: Item[] = [];

    constructor(
        public capacityBonus: number,
        name: string,
        description: string,
        itemId: number,
        rarity: ItemRarity,
        iconId: number,
        price: number,
        effects: Effect[] = []
    ) {
        super(name, description, itemId, rarity, iconId, price, effects, 'storage');
    }

    /**
     * Guarda itens no interior da bolsa quando ela é desequipada ou armazenada.
     */
    public storeItems(items: Item[]): void {
        this.storedItems.push(...items);
    }

    /**
     * Retira e descarrega todos os itens guardados dentro da bolsa para o inventário expandido do jogador.
     */
    public retrieveItems(): Item[] {
        const items = [...this.storedItems];
        this.storedItems = [];
        return items;
    }

    /**
     * Quantidade de itens atualmente guardados no interior da bolsa.
     */
    public get itemCount(): number {
        return this.storedItems.length;
    }

    /**
     * Capacidade máxima de itens adicionais que a bolsa concede / armazena.
     */
    public get capacity(): number {
        return this.capacityBonus;
    }
}