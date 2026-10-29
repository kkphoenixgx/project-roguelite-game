/**
 * @file Define os contratos e o registro de dados dos Intermaps (salas/interiores secundários).
 */

export interface IntermapPortalConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  targetMapId: string;
  targetSpawnCoords?: { x: number; y: number } | undefined;
  cooldownMs?: number | undefined;
  type?: 'direct' | 'request' | undefined;
  promptText?: string | undefined;
  actionKey?: string | undefined;
  hitboxes?: any[] | undefined;
}

export interface IntermapSceneryConfig {
  x: number;
  y: number;
  presetId: string;
  flipX?: boolean | undefined;
  flipY?: boolean | undefined;
}

export interface IntermapItemConfig {
  x: number;
  y: number;
  itemClass: string;
  itemId?: number | undefined;
  name?: string | undefined;
  description?: string | undefined;
  rarity?: string | undefined;
  amount?: number | undefined;
  price?: number | undefined;
  durability?: number | undefined;
  baseDamage?: number | undefined;
  attackSpeed?: number | undefined;
  damageReductionPercent?: number | undefined;
  dodgePercent?: number | undefined;
  requiredLevel?: number | undefined;
}

export interface IntermapDefinition {
  id: string;
  name?: string | undefined;
  /** Identificador explícito do mundo de onde este innerMap deriva (ex: 'vilgem'). */
  parentWorldId: string;
  width: number;
  height: number;
  backgroundColor?: string | undefined;
  chunks?: string[][] | undefined;
  chunkSize?: number | undefined;
  defaultSpawn?: { x: number; y: number } | undefined;
  portals?: IntermapPortalConfig[] | undefined;
  scenery?: IntermapSceneryConfig[] | undefined;
  items?: IntermapItemConfig[] | undefined;
  collisionData?: any[] | undefined;
  originChunk?: { cx: number; cy: number } | undefined;
}

export class IntermapRegistry {
  private static definitions: Map<string, IntermapDefinition> = new Map();

  public static register(def: IntermapDefinition): void {
    if (def && def.portals) {
      for (const p of def.portals) {
        if (p.targetMapId === 'vilgem' && p.targetSpawnCoords) {
          if (p.targetSpawnCoords.x === 700 && p.targetSpawnCoords.y === 450) {
            p.targetSpawnCoords = { x: -324, y: -574 };
          } else if (p.targetSpawnCoords.x === 1536 && p.targetSpawnCoords.y === 1615) {
            p.targetSpawnCoords = { x: 512, y: 591 };
          } else if (p.targetSpawnCoords.x === 1296 && p.targetSpawnCoords.y === 1954) {
            p.targetSpawnCoords = { x: 272, y: 930 };
          }
        }
      }
    }
    this.definitions.set(def.id, def);
  }

  public static registerAll(defs: Record<string, IntermapDefinition>): void {
    for (const [id, def] of Object.entries(defs)) {
      this.register(def);
    }
  }

  public static get(id: string): IntermapDefinition | undefined {
    return this.definitions.get(id);
  }

  public static has(id: string): boolean {
    return this.definitions.has(id);
  }

  public static getAll(): IntermapDefinition[] {
    return Array.from(this.definitions.values());
  }

  public static getInnerMapsForWorld(parentWorldId: string): IntermapDefinition[] {
    return Array.from(this.definitions.values()).filter(d => d.parentWorldId === parentWorldId);
  }

  public static clear(): void {
    this.definitions.clear();
  }
}

// Registro default inicial correspondente ao intermapsMap.json
IntermapRegistry.register({
  id: "interior_black_default",
  name: "Interior Escuro",
  parentWorldId: "vilgem",
  width: 2048,
  height: 1024,
  backgroundColor: "#000000",
  defaultSpawn: { x: 512, y: 700 },
  portals: [
    {
      x: 1936,
      y: 3,
      width: 106,
      height: 1011,
      targetMapId: "vilgem",
      targetSpawnCoords: { x: -324, y: -574 },
      type: "request",
      promptText: "Entrar",
      actionKey: "E",
      cooldownMs: 1000
    }
  ],
  scenery: [
    {
      x: 595,
      y: 34,
      presetId: "pond_nature_clearing"
    },
    {
      x: 554,
      y: 565,
      presetId: "river_straight_horizontal"
    }
  ],
  chunks: [
    [
      "/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png",
      "/typescript/adapters/web/assets/maps/vilgem/grass_seamless_base.png"
    ]
  ],
  items: [
    {
      x: 529,
      y: 475,
      itemClass: "LeatherBag"
    },
    {
      x: 473,
      y: 365,
      itemClass: "AdrenalineFlask"
    }
  ]
});

