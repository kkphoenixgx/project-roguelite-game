import type { IEventManager } from "../eventDispacher/IGameEvents";
import RewardGenerator from "./Items/RewardGenerator";
import { SpawnRegistry } from "./SpawnRegistry";

export default class RewardManager {
  constructor(private eventManager: IEventManager, private getPlayer?: () => any) {}

  public setupEventListeners(): void {
    this.eventManager.on('entityDied', payload => {
      if (payload.objectId !== 'player' && payload.objectId !== 'bdiAgent') {
         if (SpawnRegistry.strategies.has('xpOrb')) {
             this.eventManager.dispatch('spawn', { type: 'xpOrb', coordinates: { x: payload.coordinates.x, y: payload.coordinates.y }, metadata: { value: 50 } });
         }
         const player = this.getPlayer ? this.getPlayer() : undefined;
         const hasLuckCharm = player && typeof player.hasPassiveBrooch === 'function' && player.hasPassiveBrooch('brooch_luck_charm');
         const dropChance = hasLuckCharm ? 0.30 : 0.15;
         if (Math.random() < dropChance) {
             RewardGenerator.generateDrop({ x: payload.coordinates.x, y: payload.coordinates.y }, this.eventManager, Boolean(hasLuckCharm));
         }
      }
    });
  }
}
