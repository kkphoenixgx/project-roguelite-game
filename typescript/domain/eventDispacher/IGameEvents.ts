import type ObjectElement from "../ObjectModule/ObjectElement";
import type { objectTypeId } from "../ObjectModule/objectType.type";
import type { DamageType } from "../ObjectModule/Items/IAtack";
import type Vector2D from "../shared/Vector2D";

export type ParticleEffectType = 'bloodSplatter' | 'enemyDeath' | 'fireExplosion' | 'magicAura' | 'slashSparks' | 'waterSplash' | 'poisonCloud' | 'levelUp' | 'dynamicSpellTrail' | 'criticalStrike' | 'legendaryLootBeacon' | 'overkillShatter' | 'customEmit' | 'thunderStrike' | 'lightFlash' | 'magicPulse' | 'natureBurst' | 'darkPulse' | 'rockShatter';

export interface GameEventMap {
  playerMoved: { x: number, y: number };
  playerDied: {};
  spawn: { type: objectTypeId, coordinates: { x: number, y: number }, direction?: Vector2D, attack?: any, spellElements?: string[], attacker?: any, item?: any, hitboxes?: any[], size?: { width: number, height: number }, metadata?: any };
  despawn: { objectId: number };
  levelUp: { newLevel: number, coordinates: { x: number, y: number } };
  requestNeighbors :{ requester: ObjectElement, radius: number, callback: (neighbors :ObjectElement[]) => void };
  log: { channel: string, message: string, params: any[] };
  spawnVisual: { type: string, coordinates: { x: number, y: number }, duration: number, size: { width: number, height: number }, rotation?: number };
  classChanged: { oldClassInstance: any, newClassInstance: any };
  particle: { effect: ParticleEffectType, x: number, y: number, color?: string, angle?: number };
  npcSpoke: { npcId: number; message: string; npcName?: string };
  releaseFishingHook: { playerId: number };
  hookDestroyed: { playerId: number };
  entityDied: { entityId: number; isOverkill: boolean; coordinates: { x: number; y: number; }; };
  entityDamaged: { entityId: number; damage: number; isCritical: boolean; damageType: DamageType; coordinates: { x: number; y: number; }; };

}
export type EventKey = keyof GameEventMap;

export interface IEventManager {
  on<K extends EventKey>(key: K, listener: (payload: GameEventMap[K]) => void): void;
  dispatch<K extends EventKey>(key: K, payload: GameEventMap[K]): void;
}