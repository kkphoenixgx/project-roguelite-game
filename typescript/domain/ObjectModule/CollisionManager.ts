import type ObjectElement from "./ObjectElement";
import type Player from "./Entities/Player/Player";
import type { ICollisionService } from "../ports/ICollisionService";
import type { ITelemetryPort } from "../ports/ITelemetryPort";
import { NullTelemetryPort } from "../ports/ITelemetryPort";

export default class CollisionManager {
  private staticGrid: Map<number, any[]> = new Map();
  public staticCollidersCache: any[] = [];
  private readonly GRID_SIZE = 256;
  private currentCollisionTick = 0;

  private isCheckingCollisions: boolean = false;
  private pendingCollisions: Int32Array = new Int32Array(0);
  private collisionBuffer: Float32Array = new Float32Array(10000);
  private emptyCollisions: Int32Array = new Int32Array(0);

  constructor(private collisionService: ICollisionService, private telemetry: ITelemetryPort = NullTelemetryPort) {}

  public handleCollisionResult = (pairs: Int32Array) => {
    this.pendingCollisions = pairs;
    this.isCheckingCollisions = false;
  };

  public applyDelayedCollisions(elements: Map<number, ObjectElement>, player: Player): void {
    for (let i = 0; i < this.pendingCollisions.length; i += 2) {
      const idA = this.pendingCollisions[i];
      const idB = this.pendingCollisions[i + 1];
      if (idA === undefined || idB === undefined) continue;

      const elementA = elements.get(idA) || (player.id === idA ? player : undefined);
      const elementB = elements.get(idB) || (player.id === idB ? player : undefined);

      if (elementA && elementB && !(elementA as any).isDestroyed && !(elementB as any).isDestroyed) {
        elementA.hitboxes?.[0]?.onColision(elementB);
        elementB.hitboxes?.[0]?.onColision(elementA);
        this.telemetry.incrementResolvedCollision?.();
      }
    }
    this.pendingCollisions = this.emptyCollisions;
  }

  public checkCollisions(player: Player, elementsArray: ObjectElement[], worldBounds: any): void {
      if (this.isCheckingCollisions) return;
      this.isCheckingCollisions = true;

      let offset = 0;
      offset = this.addElementToCollisionBuffer(player, offset);
      for (let i = 0; i < elementsArray.length; i++) {
          offset = this.addElementToCollisionBuffer(elementsArray[i]!, offset);
      }

      this.telemetry.incrementCollisionCheck?.();
      this.collisionService.checkCollisions(this.collisionBuffer, offset, worldBounds, this.handleCollisionResult);
  }

  private addElementToCollisionBuffer(element: ObjectElement, offset: number): number {
      if (!element || (element as any).isDestroyed || !element.hitboxes || element.objectId === 'environmentCollider') return offset;
      for (let j = 0; j < element.hitboxes.length; j++) {
          const hitbox = element.hitboxes[j];
          if (!hitbox) continue;

          const shape = hitbox.getDebugShape();
          if (shape.type === 'circle') {
              if (offset + 5 > this.collisionBuffer.length) {
                  const newBuffer = new Float32Array(this.collisionBuffer.length * 2 + 5);
                  newBuffer.set(this.collisionBuffer);
                  this.collisionBuffer = newBuffer;
              }
              this.collisionBuffer[offset++] = element.id;
              this.collisionBuffer[offset++] = 0;
              this.collisionBuffer[offset++] = shape.coordinates.x;
              this.collisionBuffer[offset++] = shape.coordinates.y;
              this.collisionBuffer[offset++] = shape.radius || 0;
          } else if (shape.type === 'polygon' && shape.points) {
              const sizeNeeded = 3 + shape.points.length * 2;
              if (offset + sizeNeeded > this.collisionBuffer.length) {
                  const newBuffer = new Float32Array(this.collisionBuffer.length * 2 + sizeNeeded);
                  newBuffer.set(this.collisionBuffer);
                  this.collisionBuffer = newBuffer;
              }
              this.collisionBuffer[offset++] = element.id;
              this.collisionBuffer[offset++] = 1;
              this.collisionBuffer[offset++] = shape.points.length;
              for (let k = 0; k < shape.points.length; k++) {
                  this.collisionBuffer[offset++] = shape.points[k]!.x;
                  this.collisionBuffer[offset++] = shape.points[k]!.y;
              }
          }
      }
      return offset;
  }

  public resolveStaticCollisions(player: Player, elementsArray: ObjectElement[]): void {
      const statics = this.staticCollidersCache;
      if (statics.length === 0) return;
      this.resolveDynamicStatic(player);
      for (let i = 0; i < elementsArray.length; i++) {
          const element = elementsArray[i]!;
          if (element.objectId === 'enemy' || element.objectId === 'slime' || element.objectId === 'shadowMob') {
              this.resolveDynamicStatic(element);
          }
      }
  }

  private resolveDynamicStatic(dyn: any): void {
      if (!dyn.hitboxes || !dyn.hitboxes[0]) return;
      
      const cx = dyn.coordinates.x + dyn.size.width / 2;
      const cy = dyn.coordinates.y + dyn.size.height / 2;
      const r = dyn.hitboxes[0].radius || 10;

      const startCol = Math.floor((cx - r) / this.GRID_SIZE);
      const endCol = Math.floor((cx + r) / this.GRID_SIZE);
      const startRow = Math.floor((cy - r) / this.GRID_SIZE);
      const endRow = Math.floor((cy + r) / this.GRID_SIZE);

      this.currentCollisionTick++;

      for (let c = startCol; c <= endCol; c++) {
          for (let row = startRow; row <= endRow; row++) {
              const key = this.getGridKey(c, row);
              const cell = this.staticGrid.get(key);
              if (!cell) continue;

              for (let i = 0; i < cell.length; i++) {
                  const env = cell[i];
                  if (env._lastCheckTick === this.currentCollisionTick) continue;
                  env._lastCheckTick = this.currentCollisionTick;

                  const aabb = env._aabbCache;

                  if (cx + r > aabb.boxX && cx - r < aabb.boxX + aabb.boxW && cy + r > aabb.boxY && cy - r < aabb.boxY + aabb.boxH) {
                      this.telemetry.incrementResolvedCollision();
                      if (typeof dyn.resolveEnvironmentCollision === 'function') {
                          dyn.resolveEnvironmentCollision(env, r);
                          if (dyn.hitboxes) {
                              const newCx = dyn.coordinates.x + dyn.size.width / 2;
                              const newCy = dyn.coordinates.y + dyn.size.height / 2;
                              if (dyn._centerCache) {
                                  dyn._centerCache.x = newCx;
                                  dyn._centerCache.y = newCy;
                              }
                              const coord = dyn._centerCache || { x: newCx, y: newCy };
                              for (let j = 0; j < dyn.hitboxes.length; j++) {
                                  dyn.hitboxes[j]!.update(coord, dyn.rotation);
                              }
                          }
                      }
                  }
              }
          }
      }
  }

  private getGridKey(col: number, row: number): number {
      return ((col & 0xFFFF) << 16) | (row & 0xFFFF);
  }

  public addStaticCollider(env: any): void {
      let boxX = env.coordinates.x;
      let boxY = env.coordinates.y;
      let boxW = env.size?.width || 32;
      let boxH = env.size?.height || 32;

      if (env.hitboxes && env.hitboxes.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          let hasValidShape = false;
          for (let h = 0; h < env.hitboxes.length; h++) {
              const hb = env.hitboxes[h];
              if (!hb) continue;
              const shape = hb.getDebugShape();
              if (shape.type === 'polygon' && shape.points && shape.points.length > 0) {
                  for (let i = 0; i < shape.points.length; i++) {
                      const px = shape.points[i]!.x;
                      const py = shape.points[i]!.y;
                      if (px < minX) minX = px;
                      if (py < minY) minY = py;
                      if (px > maxX) maxX = px;
                      if (py > maxY) maxY = py;
                      hasValidShape = true;
                  }
              } else if (shape.type === 'circle') {
                  const cx = shape.coordinates?.x ?? env.coordinates.x;
                  const cy = shape.coordinates?.y ?? env.coordinates.y;
                  const cr = shape.radius || 16;
                  if (cx - cr < minX) minX = cx - cr;
                  if (cy - cr < minY) minY = cy - cr;
                  if (cx + cr > maxX) maxX = cx + cr;
                  if (cy + cr > maxY) maxY = cy + cr;
                  hasValidShape = true;
              }
          }
          if (hasValidShape) {
              boxX = minX; boxY = minY; boxW = maxX - minX; boxH = maxY - minY;
          }
      }
      env._aabbCache = { boxX, boxY, boxW, boxH };
      env._lastCheckTick = 0;
      this.staticCollidersCache.push(env);

      const startCol = Math.floor(boxX / this.GRID_SIZE);
      const endCol = Math.floor((boxX + boxW) / this.GRID_SIZE);
      const startRow = Math.floor(boxY / this.GRID_SIZE);
      const endRow = Math.floor((boxY + boxH) / this.GRID_SIZE);

      for(let c = startCol; c <= endCol; c++) {
          for(let r = startRow; r <= endRow; r++) {
              const key = this.getGridKey(c, r);
              let cell = this.staticGrid.get(key);
              if(!cell) { cell = []; this.staticGrid.set(key, cell); }
              cell.push(env);
          }
      }
  }

  public removeStaticCollider(el: any): void {
      const idx = this.staticCollidersCache.indexOf(el);
      if (idx !== -1) this.staticCollidersCache.splice(idx, 1);

      const aabb = el._aabbCache;
      if (aabb) {
          const startCol = Math.floor(aabb.boxX / this.GRID_SIZE);
          const endCol = Math.floor((aabb.boxX + aabb.boxW) / this.GRID_SIZE);
          const startRow = Math.floor(aabb.boxY / this.GRID_SIZE);
          const endRow = Math.floor((aabb.boxY + aabb.boxH) / this.GRID_SIZE);
          for(let c = startCol; c <= endCol; c++) {
              for(let r = startRow; r <= endRow; r++) {
                  const key = this.getGridKey(c, r);
                  let cell = this.staticGrid.get(key);
                  if(cell) {
                      const cellIdx = cell.indexOf(el);
                      if (cellIdx !== -1) cell.splice(cellIdx, 1);
                  }
              }
          }
      }
  }

  public clearStaticColliders(): void {
      this.staticCollidersCache.length = 0;
      this.staticGrid.clear();
  }

  public clearPendingCollisions(): void {
      this.pendingCollisions = this.emptyCollisions;
      this.isCheckingCollisions = false;
  }

  public getStaticColliders(): readonly any[] {
      return this.staticCollidersCache;
  }

  private sharedNeighborsBuffer: ObjectElement[] = [];

  public requestNeighbors(payload: any, elements: Map<number, ObjectElement>): void {
      const sharedNeighborsArray = this.sharedNeighborsBuffer;
      sharedNeighborsArray.length = 0;
      
      let reqX = 0;
      let reqY = 0;

      if (payload.coordinates) {
        reqX = payload.coordinates.x;
        reqY = payload.coordinates.y;
      } else if (payload.requester) {
        reqX = payload.requester.coordinates.x + (payload.requester.size.width * 0.5);
        reqY = payload.requester.coordinates.y + (payload.requester.size.height * 0.5);
      } else {
        return payload.callback(sharedNeighborsArray);
      }

      const radius = payload.radius || 0;
      const radiusSq = radius * radius;
      const requesterId = payload.requester ? payload.requester.id : -1;

      for (const element of elements.values()) {
        if (element.id === requesterId) continue;
        
        const dx = reqX - (element.coordinates.x + (element.size.width * 0.5));
        const dy = reqY - (element.coordinates.y + (element.size.height * 0.5));
        
        if (dx * dx + dy * dy <= radiusSq) {
          sharedNeighborsArray.push(element);
        }
      }
      
      payload.callback(sharedNeighborsArray);
  }
}
