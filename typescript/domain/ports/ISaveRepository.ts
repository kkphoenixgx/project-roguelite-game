/**
 * Estrutura de dados globais que persistem entre as "runs" (sonhos).
 */
export interface GlobalProgressData {
    globalLevel: number;
    globalXp: number;
    unlockedBrooches: string[];
    achievements: string[];
}

export interface ItemSaveData {
    itemId: number;
    name: string;
    category?: string;
    durability?: number;
    amount?: number;
}

export interface EquipmentSaveData {
    mainHand?: ItemSaveData | null;
    secondHand?: ItemSaveData | null;
    helmet?: ItemSaveData | null;
    chestplate?: ItemSaveData | null;
    pants?: ItemSaveData | null;
    boots?: ItemSaveData | null;
    gloves?: ItemSaveData | null;
    amulet?: ItemSaveData | null;
    bag?: ItemSaveData | null;
    belt?: ItemSaveData | null;
    leftHandRings?: ItemSaveData[];
    rightHandRings?: ItemSaveData[];
}

export interface PlayerClassSaveData {
    unlockedClasses: string[];
    activeClass: string | null;
    unlockedSkills: string[];
    activeLoadout: (string | null)[];
    passiveLoadout: (string | null)[];
    globalActiveLoadout: (string | null)[];
}

export interface PlayerAttributesSaveData {
    level: number;
    currentXp: number;
    availablePoints: number;
    maxHp: number;
    hp: number;
    mana: number;
    strength: number;
    constitution: number;
    dexterity: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
}

export interface PlayerSaveState {
    attributes: PlayerAttributesSaveData;
    coins: number;
    coordinates?: { x: number; y: number };
    backpack: ItemSaveData[];
    equipment: EquipmentSaveData;
    classes: PlayerClassSaveData;
    collectedWorldItems?: string[];
}

import type { GlobalState } from "../facadeComponents/MetaProgressionManager";

export interface SaveSlotDataDTO {
    saveId: string;
    slot: number;
    timestamp: number;
    playerState: PlayerSaveState;
    metaProgressionState?: GlobalState | undefined;
    mapId?: string | undefined;
    characterName?: string | undefined;
    cycle?: number | undefined;
    world?: string | undefined;
    savedAt?: string | undefined;
    globalMetaSummary?: any;
    activeCheckpoint?: any;
    checkpoint?: any;
    [key: string]: any;
}

/** Porta Secundária para a persistência de dados. */
export interface ISaveRepository {
    saveProgress(data: GlobalProgressData): Promise<void>;
    loadProgress(): Promise<GlobalProgressData | null>;
    loadSlot?(slot: number): Promise<SaveSlotDataDTO | null>;
    saveSlot?(slot: number, data: SaveSlotDataDTO): Promise<void>;
    deleteSlot?(slot: number): Promise<void>;
    getAllSlots?(): Promise<Map<number, SaveSlotDataDTO | null>>;
}