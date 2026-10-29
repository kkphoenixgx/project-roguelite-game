import Storage from "./Storage";
import type Tool from "../Tools/Tool";
import type { ItemRarity } from "../Item";
import type Effect from "../Effects/Effect";

export default class Belt extends Storage {
    public readonly toolSlots: (Tool | null)[];
    public activeToolIndex: number = 0;

    constructor(
        public readonly capacity: number = 4,
        name: string = 'Cinto de Utilidades',
        description: string = 'Cinto com compartimentos dedicados para equipar ferramentas.',
        itemId: number = 200,
        rarity: ItemRarity = 'common',
        iconId: number = 200,
        price: number = 80,
        effects: Effect[] = []
    ) {
        super(name, description, itemId, rarity, iconId, price, effects, 'belt');
        this.toolSlots = new Array(capacity).fill(null);
    }

    /**
     * Equipa uma ferramenta em um slot do cinto.
     * @param tool A ferramenta a ser equipada.
     * @param slotIndex Índice opcional do slot (0 a capacity - 1). Se omitido, usa o primeiro slot livre.
     * @returns A ferramenta que estava previamente equipada no slot, ou null se estava vazio.
     */
    public equipTool(tool: Tool, slotIndex?: number): Tool | null {
        let targetIndex = slotIndex;
        if (targetIndex === undefined || targetIndex < 0 || targetIndex >= this.capacity) {
            targetIndex = this.toolSlots.findIndex(s => s === null);
            if (targetIndex === -1) {
                targetIndex = (this.activeToolIndex >= 0 && this.activeToolIndex < this.capacity) ? this.activeToolIndex : 0;
            }
        }
        const previous = this.toolSlots[targetIndex] ?? null;
        this.toolSlots[targetIndex] = tool;
        return previous;
    }

    /**
     * Desequipa a ferramenta de um determinado slot do cinto.
     * @param slotIndex Índice do slot.
     * @returns A ferramenta removida, ou null se o slot estava vazio ou o índice for inválido.
     */
    public unequipTool(slotIndex: number): Tool | null {
        if (slotIndex < 0 || slotIndex >= this.capacity) return null;
        const tool = this.toolSlots[slotIndex] ?? null;
        this.toolSlots[slotIndex] = null;
        return tool;
    }

    /**
     * Retorna a ferramenta atualmente ativa/selecionada para uso rápido.
     */
    public getActiveTool(): Tool | null {
        if (this.activeToolIndex < 0 || this.activeToolIndex >= this.capacity) return null;
        return this.toolSlots[this.activeToolIndex] || null;
    }

    /**
     * Altera o índice da ferramenta ativa no cinto.
     */
    public setActiveToolIndex(index: number): boolean {
        if (index >= 0 && index < this.capacity) {
            this.activeToolIndex = index;
            return true;
        }
        return false;
    }

    /**
     * Verifica se todos os compartimentos de ferramentas estão ocupados.
     */
    public isFull(): boolean {
        return this.toolSlots.every(s => s !== null);
    }

    /**
     * Retorna a contagem de ferramentas atualmente equipadas no cinto.
     */
    public get equippedToolsCount(): number {
        return this.toolSlots.filter(s => s !== null).length;
    }
}
