/**
 * @file Contém a classe IntermapWorld, responsável por representar um mundo secundário/interior com dimensões e portais customizados.
 */
import GameWorld from "../GameWorld";
import type { IEventManager } from "../../eventDispacher/IGameEvents";
import type { IntermapDefinition } from "./IntermapConfig";

import { getPortalLinksForMap } from "./PortalLinks/portalLinksMap";
import ItemFactory from "../Items/ItemFactory";

export default class IntermapWorld extends GameWorld {
  public readonly mapId: string;
  public readonly parentWorldId: string;
  public readonly width: number;
  public readonly height: number;
  public readonly backgroundColor: string;
  public override readonly originChunk: { cx: number; cy: number };
  public override readonly defaultSpawn?: { x: number; y: number } | undefined;

  constructor(public readonly definition: IntermapDefinition, eventManager: IEventManager) {
    super(eventManager);
    this.mapId = definition.id;
    this.parentWorldId = definition.parentWorldId || 'vilgem';
    this.width = definition.width;
    this.height = definition.height;
    this.backgroundColor = definition.backgroundColor ?? '#000000';
    this.originChunk = definition.originChunk ?? { cx: 0, cy: 0 };
    this.defaultSpawn = definition.defaultSpawn;
  }

  protected override async generateCustomElements(): Promise<void> {
    if (this.definition.scenery && this.definition.scenery.length > 0) {
      for (const item of this.definition.scenery) {
        this.eventManager.dispatch('spawn', {
          type: 'scenery',
          coordinates: { x: item.x, y: item.y },
          metadata: {
            preset: item.presetId,
            ...(item.flipX ? { flipX: true } : {}),
            ...(item.flipY ? { flipY: true } : {})
          }
        });
      }
    }

    //? Registra portais configurados no InnerMap priorizando posições do editor
    if (this.definition.portals && this.definition.portals.length > 0) {
      for (const portal of this.definition.portals) {
        const spawnPayload: any = {
          type: portal.type === 'request' ? 'portalLinkRequest' : 'portalLink',
          coordinates: { x: portal.x, y: portal.y },
          size: { width: portal.width, height: portal.height },
          metadata: {
            targetMapId: portal.targetMapId,
            targetSpawnCoords: portal.targetSpawnCoords,
            cooldownMs: portal.cooldownMs,
            promptText: portal.promptText,
            actionKey: portal.actionKey
          }
        };
        if (portal.hitboxes) {
          spawnPayload.hitboxes = portal.hitboxes;
        }
        this.eventManager.dispatch('spawn', spawnPayload);
      }
    } else {
      const registeredPortals = getPortalLinksForMap(this.mapId);
      for (const portal of registeredPortals) {
        const spawnPayload: any = {
          type: portal.type === 'request' ? 'portalLinkRequest' : 'portalLink',
          coordinates: { x: portal.coordinates.x, y: portal.coordinates.y },
          size: { width: portal.size.width, height: portal.size.height },
          metadata: {
            targetMapId: portal.targetMapId,
            targetSpawnCoords: portal.targetSpawnCoords,
            cooldownMs: portal.cooldownMs,
            promptText: portal.promptText,
            actionKey: portal.actionKey
          }
        };
        if (portal.hitboxes) {
          spawnPayload.hitboxes = portal.hitboxes;
        }
        this.eventManager.dispatch('spawn', spawnPayload);
      }
    }

    if (this.definition.items && this.definition.items.length > 0) {
      for (const it of this.definition.items) {
        const itemInstance = ItemFactory.createItem(it.itemClass || it.itemId || 'SimpleSword', it as any);
        if (itemInstance) {
          const customId = (it as any).id ? `${this.mapId}_item_${(it as any).id}` : undefined;
          this.spawnDroppedItem({ x: it.x, y: it.y }, itemInstance, customId);
        }
      }
    }
  }

  protected override generatePortalLinks(_alreadySpawnedTargets?: Set<string>): void {
  }
}
