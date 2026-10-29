import type Item from "../../../Items/Item";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import type IPlayerContext from "../IPlayerContext";
import ItemFactory from "../../../Items/ItemFactory";
import type { ItemSaveData } from "../../../../ports/ISaveRepository";

export default class PlayerInventory {
  public backpack: Item[] = [];
  public coins: number = 0;

  constructor(private player: IPlayerContext, private eventManager: IEventManager) {}

  public addItem(item: Item): boolean {
    if (!item) return false;
    this.backpack.push(item);
    this.eventManager.dispatch('itemAddedToBackpack', { item });
    return true;
  }

  public serialize(): ItemSaveData[] {
    return this.backpack.map(item => ItemFactory.serializeItem(item));
  }

  public restore(savedItems: ItemSaveData[]): void {
    this.backpack.length = 0;
    if (!Array.isArray(savedItems)) return;

    for (const saved of savedItems) {
      if (!saved || typeof saved.itemId !== 'number') continue;
      const item = ItemFactory.createItem(saved.itemId, saved);
      if (item) {
        this.backpack.push(item);
      }
    }
  }

  public consumeItem(backpackIndex: number): void {
    const item = this.backpack[backpackIndex];
    if (!item) return;

    if ('use' in item && typeof (item as any).use === 'function') {
      (item as any).use(this.player);
      
      this.backpack.splice(backpackIndex, 1);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Consumed ${item.name}`, params: [] });
      
      const centerX = this.player.coordinates.x + this.player.size.width / 2;
      const centerY = this.player.coordinates.y + this.player.size.height / 2;
      this.eventManager.dispatch('particle', { effect: 'magicAura', x: centerX, y: centerY, color: '#32CD32' });
    } else {
      this.eventManager.dispatch('log', { channel: 'error', message: `O item ${item.name} não é consumível.`, params: [] });
    }
  }

  public deleteItem(backpackIndex: number): void {
    const item = this.backpack[backpackIndex];
    if (item) {
      this.backpack.splice(backpackIndex, 1);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Deleted item: ${item.name}`, params: [] });
    }
  }
}
