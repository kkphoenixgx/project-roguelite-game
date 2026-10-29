import type { IObjectElement } from "../ports/domain-contracts";
import type { objectTypeId } from "../ObjectModule/objectType.type";
import type { DamageType } from "../ports/domain-contracts";
import type Vector2D from "../shared/Vector2D";

export type ParticleEffectType = 'bloodSplatter' | 'enemyDeath' | 'fireExplosion' | 'magicAura' | 'slashSparks' | 'waterSplash' | 'poisonCloud' | 'levelUp' | 'dynamicSpellTrail' | 'criticalStrike' | 'legendaryLootBeacon' | 'overkillShatter' | 'customEmit' | 'thunderStrike' | 'lightFlash' | 'magicPulse' | 'natureBurst' | 'darkPulse' | 'rockShatter' | 'windGust' | 'demonTransformation';

export interface LevelUpChoice {
  id: string;
  name?: string;
  description: string;
  type: 'stat' | 'skill';
  value?: any;
  rarity?: 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
  iconSvg?: string;
}

export interface GameEventMap {
  showLevelUpRewards: { choices: LevelUpChoice[] };
  playerMoved: { x: number, y: number };
  playerDied: {};
  spawn: { type: objectTypeId, coordinates: { x: number, y: number }, direction?: Vector2D, attack?: any, spellElements?: string[], attacker?: any, item?: any, hitboxes?: any[], size?: { width: number, height: number }, metadata?: any, pickupId?: string };
  despawn: { objectId: number };
  levelUp: { newLevel: number, coordinates: { x: number, y: number } };
  requestNeighbors: { requester?: IObjectElement, coordinates?: { x: number, y: number }, radius: number, callback: (neighbors :IObjectElement[]) => void };
  log: { channel: string, message: string, params: any[] };
  spawnVisual: { type: string, coordinates: { x: number, y: number }, duration: number, size: { width: number, height: number }, rotation?: number };
  classChanged: { oldClassInstance: any, newClassInstance: any };
  particle: { effect: ParticleEffectType, x: number, y: number, color?: string, angle?: number, count?: number };
  npcSpoke: { npcId: number; message: string; npcName?: string; entityTypeId?: string };
  npcDialog: { npcId: number; message: string; npcName?: string; entityTypeId?: string };
  releaseFishingHook: { playerId: number };
  hookDestroyed: { playerId: number };
  entityDied: { entityId: number; objectId: objectTypeId; isOverkill: boolean; coordinates: { x: number; y: number; }; };
  entityDamaged: { entityId: number; damage: number; isCritical: boolean; damageType: DamageType; coordinates: { x: number; y: number; }; };

  itemPickedUp: { itemName: string; itemType?: string };
  switchToLobby: {};
  switchToGameplay: {};
  bdiAction: { agent: string; action: string; [key: string]: any };
  panteaoError: { message: string, data?: any };

  // Map & Intermap Transitions
  mapTransitionRequested: { targetMapId: string; targetCoordinates?: { x: number; y: number } };
  mapTransitionCompleted: { mapId: string; coordinates: { x: number; y: number } };
  portalPromptShow: { portalId: number; targetMapId: string; text: string; actionKey: string; coordinates: { x: number; y: number } };
  portalPromptHide: { portalId: number };
  portalInteract: { portalId?: number };

  // World & Chunk Navigation
  activeChunkChanged: {
    previousChunk: import("../ports/domain-contracts").ChunkCoordDTO;
    currentChunk: import("../ports/domain-contracts").ChunkCoordDTO;
    activeChunks: import("../ports/domain-contracts").ChunkCoordDTO[];
  };
  
  // Asset & Scenery State Triggers (Interações no Mundo, Abertura de Portões, etc.)
  triggerAssetState: import("../ports/domain-contracts").TriggerAssetStateDTO;
  assetStateChanged: import("../ports/domain-contracts").AssetStateChangedDTO;
  
  // Meta-Progression
  featAchieved: { featId: string; name: string; essenceReward: number };

  // Tools & Belt (Paperdoll Storage Secundário e Ações Sandbox)
  toolEquippedInBelt: { beltSlotIndex: number; tool: any };
  toolUnequippedFromBelt: { beltSlotIndex: number; tool: any };
  activeToolChanged: { activeIndex: number; tool: any | null };
  requestToolAction: { 
    toolType: 'hoe' | 'watering_can' | 'axe' | 'hammer' | string; 
    playerPosition?: { x: number; y: number };
    targetPosition: { x: number; y: number }; 
    targetTileType?: string; 
    zoneType?: 'city' | 'wilderness' | 'farmland' 
  };
  toolActionResult: { success: boolean; message: string; reason?: string; modifiedTile?: any };
  
  // Semantic UI Actions (Decoupled from Facade)
  inventoryAction: { 
    action: 'equip' | 'unequip' | 'consume' | 'delete' | 'equipTool' | 'unequipTool' | 'selectTool' | 'swapWeapons'; 
    payload: { index?: number; slot?: string; beltSlotIndex?: number } 
  };
  skillTreeAction: { action: 'unlock' | 'changeClass' | 'equip', payload: { className?: string; skillId?: string; slotIndex?: number } };
  attributeAction: { action: 'allocate', payload: { attribute: string } };
  rewardAction: { action: 'claimLocal', payload: { rewardId: string; amount?: number; rarity?: string } };
  
  // Cooldowns
  skillCooldownStarted: { skillId: string; totalMs: number; remainingMs: number };
  
  // State Updates for UI
  inventoryUpdated: { backpack: any[], equipment: any };
  skillTreeUpdated: { skills: any[], loadout: any, passiveLoadout?: any[], globalActiveLoadout?: any[] };
  
  // LLM / AI Modding & Preset Event
  llmPresetChanged: { preset: import("../ports/domain-contracts").CustomLLMPresetDTO };

  // Narrative & Class Evolution Events
  storyMilestoneUnlocked: { milestoneId: string; title?: string | undefined; description?: string | undefined };
  classStageAscended: { className: string; oldStage: number; newStage: number; stageTitle: string; visualTint?: string | undefined };
  classRegistered: { className: string; autoUnlocked: boolean };

  // Auto-Save Service Events
  itemAddedToBackpack: { item: any };
  skillPointSpent: { skillId: string; remainingPoints?: number };
  attributeAllocated: { attribute: string };
  broochEquipped: { broochId: string | null; slotIndex: number; type?: 'active' | 'passive' };
  globalNodePurchased: { nodeId: string };
  gameRunStarted: { saveId: string; slot: number; mapId: string };
  gameClosing: {};
  autoSaveTriggered: { reason: string; saveId: string };
  autoSaveCompleted: { slot: number; saveId: string; timestamp: number };
  worldItemCollected: { pickupId: string };
  runResetCompleted: {};
}
export type EventKey = keyof GameEventMap;

export interface IEventManager {
  on<K extends EventKey>(key: K, listener: (payload: GameEventMap[K]) => void): void;
  dispatch<K extends EventKey>(key: K, payload: GameEventMap[K]): void;
  off?<K extends EventKey>(key: K, listener: (payload: GameEventMap[K]) => void): void;
}