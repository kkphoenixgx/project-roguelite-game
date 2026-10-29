/**
 * @file Contém a classe PortalLink, elemento de colisão que permite transição de mapas/interiores.
 */
import ObjectElement from "../ObjectElement";
import type { IEventManager } from "../../eventDispacher/IGameEvents";
import type { objectTypeId } from "../objectType.type";
import { RegisterSpawner, type SpawnPayload } from "../SpawnRegistry";
import type { HitBox } from "../../hitBox/HitBox";
import HitBoxPolygon from "../../hitBox/HitBoxPolygon";
import { HitboxParser, type HitboxJSON } from "../../hitBox/HitboxParser";

@RegisterSpawner('portalLink')
export default class PortalLink extends ObjectElement {
  public targetMapId: string;
  public targetSpawnCoords?: { x: number; y: number } | undefined;
  public transitionCooldownMs: number;
  public isTriggerActive: boolean = true;
  private cooldownTimer: number = 0;

  constructor(
    id: number,
    coordinates: { x: number; y: number },
    size: { width: number; height: number },
    eventManager: IEventManager,
    targetMapId: string,
    targetSpawnCoords?: { x: number; y: number } | undefined,
    hitboxes?: (HitBox | HitboxJSON)[] | null,
    transitionCooldownMs: number = 1000,
    objectId: objectTypeId = 'portalLink'
  ) {
    super(size, coordinates, id, objectId, eventManager, 'static', null);

    this.targetMapId = targetMapId;
    this.targetSpawnCoords = targetSpawnCoords;
    this.transitionCooldownMs = transitionCooldownMs;

    if (hitboxes && hitboxes.length > 0) {
      if (typeof (hitboxes[0] as any).getDebugShape === 'function') {
        this.hitboxes = hitboxes as HitBox[];
      } else {
        this.hitboxes = HitboxParser.parse(
          hitboxes as HitboxJSON[],
          { x: 0, y: 0 },
          (other: any) => this.handleCollision(other)
        );
        for (let i = 0; i < this.hitboxes.length; i++) {
          this.hitboxes[i]?.update(this.coordinates, this.rotation);
        }
      }
    } else {
      this.hitboxes = [this.createDefaultHitbox()];
    }
  }

  private createDefaultHitbox(): HitBox {
    const points = [
      { x: 0, y: 0 },
      { x: this.size.width, y: 0 },
      { x: this.size.width, y: this.size.height },
      { x: 0, y: this.size.height }
    ];

    const hb = new HitBoxPolygon(
      { x: this.coordinates.x, y: this.coordinates.y },
      0,
      points,
      { x: 0, y: 0 },
      (other: any) => this.handleCollision(other)
    );
    hb.getRotatedPoints();
    return hb;
  }

  public handleCollision(other: any): void {
    if (!this.isTriggerActive) return;

    if (other && (other.objectId === 'player' || other.id === 1)) {
      this.triggerTransition();
    }
  }

  public triggerTransition(): void {
    if (!this.isTriggerActive) return;

    this.isTriggerActive = false;
    this.cooldownTimer = this.transitionCooldownMs / 1000;

    const payload: { targetMapId: string; targetCoordinates?: { x: number; y: number } } = {
      targetMapId: this.targetMapId
    };
    if (this.targetSpawnCoords) {
      payload.targetCoordinates = { x: this.targetSpawnCoords.x, y: this.targetSpawnCoords.y };
    }

    this.eventManager.dispatch('mapTransitionRequested', payload);
  }

  public override update(deltaTime: number): void {
    if (!this.isTriggerActive) {
      this.cooldownTimer -= deltaTime;
      if (this.cooldownTimer <= 0) {
        this.isTriggerActive = true;
        this.cooldownTimer = 0;
      }
    }

    if (this.hitboxes) {
      for (let i = 0; i < this.hitboxes.length; i++) {
        this.hitboxes[i]?.update(this.coordinates, this.rotation);
      }
    }
  }

  public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): PortalLink {
    const size = payload.size || { width: 32, height: 32 };
    const metadata = payload.metadata || {};
    const targetMapId = metadata.targetMapId || payload.targetMapId || 'vilgem';
    const targetSpawnCoords = metadata.targetSpawnCoords || payload.targetSpawnCoords;
    const cooldownMs = metadata.cooldownMs ?? payload.cooldownMs ?? 1000;
    const hitboxes = payload.hitboxes || null;

    return new PortalLink(
      id,
      payload.coordinates,
      size,
      eventManager,
      targetMapId,
      targetSpawnCoords,
      hitboxes,
      cooldownMs
    );
  }
}
