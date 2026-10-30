/** @file Contém a classe ObjectElementManager, responsável por gerenciar o ciclo de vida (criação, atualização, remoção) de uma coleção de entidades de domínio. */
import type { EntityRenderableState } from "../ports/domain-contracts";
import type Player from "./Entities/Player/Player";
import ObjectElement from "./ObjectElement";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import type { ICollisionService } from "../ports/ICollisionService";
import type { ITelemetryPort } from "../ports/ITelemetryPort";
import { NullTelemetryPort } from "../ports/ITelemetryPort";
import { SpawnRegistry } from "./SpawnRegistry";
import CollisionManager from "./CollisionManager";
import RewardManager from "./RewardManager";
import EnvironmentCollider from "./EnvironmentCollider";
import SceneryElement from "./Scenery/SceneryElement";
import WorldChunkManager from "./Maps/WorldChunkManager";
import type { WorldBoundsDTO } from "../ports/domain-contracts";
import { ChunkBoundaryHelper } from "./Maps/ChunkBoundaryHelper";



//? Auto-carregamento eager de módulos do domínio via glob para registrar decoradores @RegisterSpawner.
import.meta.glob('./Entities/**/*.ts', { eager: true });
import.meta.glob('./Items/**/*.ts', { eager: true });
import.meta.glob('./Scenery/**/*.ts', { eager: true });
import './Maps/PortalLink';
import './Maps/PortalLinkRequest';
//? Carregamento de módulos locais exceto o web worker de colisão para disparar os registradores.
import.meta.glob('./!(Collision.worker).ts', { eager: true });

/** * @class ObjectElementManager * Gerencia uma coleção de `ObjectElement`s. * Esta classe encapsula a lógica de adicionar, remover, atualizar e acessar * grupos de entidades, permitindo que a `DomainFacade` delegue essa * responsabilidade e permaneça focada na orquestração de alto nível. */
export default class ObjectElementManager {
  private elements: Map<number, ObjectElement> = new Map();
  private elementsArray: ObjectElement[] = [];
  private nextId: number = 100;
  private worldBounds: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 };
  private chunkManager!: WorldChunkManager;
  
  private waveTimer: number = 0;
  private readonly WAVE_INTERVAL: number = 5;
  private shadowMobTimer: number = 0;
  private readonly SHADOW_MOB_INTERVAL: number = 30;
  private renderStatePool: EntityRenderableState[] = [];
  private stunnedPositionsPool: Map<number, {x: number, y: number}> = new Map();

  private collisionManager: CollisionManager;
  private rewardManager: RewardManager;
  private dynamicTimingsMap: Map<string, { fileName: string; module: string; durationMs: number; count: number }> = new Map();
  private dynamicTimingsList: { fileName: string; module: string; durationMs: number; count: number }[] = [];
  private collectedWorldItems: Set<string> = new Set<string>();

  private resolveDynamicModule(className: string): string {
    if (className.includes('Projectile') || className.includes('Bullet') || className.includes('Slash') || className.includes('Arrow')) {
      return 'Domain / Projectiles';
    }
    if (className.includes('Orb') || className.includes('Coin') || className.includes('Loot') || className.includes('Drop') || className.includes('Item')) {
      return 'Domain / Pickups';
    }
    if (className.includes('Collider') || className.includes('Tree') || className.includes('Rock') || className.includes('Wall') || className.includes('Door') || className.includes('Portal')) {
      return 'Domain / Environment';
    }
    if (className.includes('Particle') || className.includes('Emitter') || className.includes('Text') || className.includes('Damage')) {
      return 'Domain / Effects';
    }
    return 'Domain / Entities';
  }

  private getDynamicTracker(element: ObjectElement): { fileName: string; module: string; durationMs: number; count: number } {
    const className = element.constructor?.name || 'ObjectElement';
    let tracker = this.dynamicTimingsMap.get(className);
    if (!tracker) {
      tracker = {
        fileName: `${className}.ts`,
        module: this.resolveDynamicModule(className),
        durationMs: 0,
        count: 0
      };
      this.dynamicTimingsMap.set(className, tracker);
      this.dynamicTimingsList.push(tracker);
    }
    return tracker;
  }

  private _handleStunnedPosition = (pos: {x: number, y: number}, id: number) => {
      const el = this.elements.get(id);
      if (el) {
          el.coordinates.x = pos.x;
          el.coordinates.y = pos.y;
          if (el.hitboxes) {
              const cx = pos.x + el.size.width / 2;
              const cy = pos.y + el.size.height / 2;
              for (let i = 0; i < el.hitboxes.length; i++) {
                  el.hitboxes[i]!.updatePosition({ x: cx, y: cy });
              }
          }
      }
  };

  constructor(private eventManager: IEventManager, collisionService: ICollisionService, private telemetryPort: ITelemetryPort = NullTelemetryPort) {
    this.collisionManager = new CollisionManager(collisionService, this.telemetryPort);
    this.chunkManager = new WorldChunkManager(eventManager);
    this.rewardManager = new RewardManager(eventManager, () => {
      for (const el of this.elements.values()) {
        if (el.objectId === 'player') return el;
      }
      return undefined;
    });
    this.rewardManager.setupEventListeners();
    this.eventManager.dispatch('log', { channel: 'init', message: 'ObjectElementManager instantiated.', params: [] });
    this.setupEventListeners();
  }

  public getChunkManager(): WorldChunkManager {
    return this.chunkManager;
  }

  public getCollisionManager(): CollisionManager {
    return this.collisionManager;
  }

  private setupEventListeners(): void {
    this.eventManager.on('spawn', (payload) => {
      if (payload.type === 'droppedItem') {
        if (!payload.item) {
          this.eventManager.dispatch('log', { channel: 'error', message: '(Manager) droppedItem spawn ignorado: item é nulo ou indefinido.', params: [] });
          return;
        }
        if (payload.pickupId && this.collectedWorldItems.has(payload.pickupId)) {
          return;
        }
      }
      const factory = SpawnRegistry.strategies.get(payload.type);
      if (factory) {
        this.spawn(id => factory(id, payload, this.eventManager));
      } else {
        this.eventManager.dispatch('log', { channel: 'error', message: `(Manager) Nenhuma fábrica registrada para o tipo: ${payload.type}`, params: [] });
      }
    });
    
    this.eventManager.on('worldItemCollected', (payload) => {
      if (payload && payload.pickupId) {
        this.collectedWorldItems.add(payload.pickupId);
      }
    });

    this.eventManager.on('despawn', payload => {
      this.removeByID(payload.objectId);
    });

    this.eventManager.on('requestNeighbors', (payload: any) => {
      this.collisionManager.requestNeighbors(payload, this.elements);
    });

    this.eventManager.on('triggerAssetState', (payload: any) => {
      this.handleTriggerAssetState(payload);
    });
  }

  /**
   * Processa o gatilho semântico de mudança de estado de asset/cenário (ex: portão do castelo abrindo).
   */
  public handleTriggerAssetState(payload: import("../ports/domain-contracts").TriggerAssetStateDTO): boolean {
    if (!payload || !payload.targetState) return false;

    let matchedAny = false;

    for (const element of this.elements.values()) {
      if ((element as any).isDestroyed) continue;

      if (payload.elementId !== undefined && element.id !== payload.elementId) {
        continue;
      }

      const isScenery = element instanceof SceneryElement;
      const elementPreset = isScenery ? (element as SceneryElement).presetType : element.objectId;
      if (payload.presetType && elementPreset !== payload.presetType && element.objectId !== payload.presetType) {
        continue;
      }

      //? Distância euclidiana até a AABB mais próxima para suportar assets grandes com colisão precisa.
      if (payload.nearCoordinates) {
        const radius = payload.nearCoordinates.radius ?? 400;
        const qx = payload.nearCoordinates.x;
        const qy = payload.nearCoordinates.y;
        const closestX = Math.max(element.coordinates.x, Math.min(qx, element.coordinates.x + element.size.width));
        const closestY = Math.max(element.coordinates.y, Math.min(qy, element.coordinates.y + element.size.height));
        const dx = qx - closestX;
        const dy = qy - closestY;
        if (dx * dx + dy * dy > radius * radius) {
          continue;
        }
      }

      const previousState = element.state;
      element.state = payload.targetState;

      let passable = (element as any).passable ?? true;
      if (payload.passable !== undefined) {
        passable = payload.passable;
        (element as any).passable = passable;

        if (element instanceof EnvironmentCollider) {
          if (passable) {
            this.collisionManager.removeStaticCollider(element);
          } else {
            this.collisionManager.addStaticCollider(element);
          }
        }
      }

      matchedAny = true;

      this.eventManager.dispatch('assetStateChanged', {
        elementId: element.id,
        presetType: elementPreset,
        previousState,
        currentState: element.state,
        passable
      });
    }

    return matchedAny;
  }

  public updateAll(deltaTime: number, player: Player): void {
    //? Janela ativa de chunks em torno do jogador para culling espacial.
    const px = player.coordinates.x + player.size.width / 2;
    const py = player.coordinates.y + player.size.height / 2;
    this.chunkManager.updatePlayerPosition(px, py);
    this.chunkManager.updateElementPosition(player);

    this.waveTimer += deltaTime;
    if (this.waveTimer >= this.WAVE_INTERVAL) {
      this.spawnWave();
      this.waveTimer = 0;
    }

    this.shadowMobTimer += deltaTime;
    if (this.shadowMobTimer >= this.SHADOW_MOB_INTERVAL) {
      this.spawnShadowMob(player);
      this.shadowMobTimer = 0;
    }

    this.stunnedPositionsPool.clear();

    for (let i = 0; i < this.dynamicTimingsList.length; i++) {
      const tracker = this.dynamicTimingsList[i]!;
      tracker.durationMs = 0;
      tracker.count = 0;
    }

    const hasPerf = typeof performance !== 'undefined';
    const activeElements = this.chunkManager.getActiveElements(this.elementsArray);

    for (let i = 0; i < activeElements.length; i++) {
      const element = activeElements[i]!;
      if ((element as any).isDestroyed || !this.elements.has(element.id)) {
        continue;
      }
      if ('activeStatuses' in element && (element as any).activeStatuses?.has('stun')) {
          this.stunnedPositionsPool.set(element.id, { x: element.coordinates.x, y: element.coordinates.y });
      }
      const tStart = hasPerf ? performance.now() : 0;
      element.update(deltaTime, player);

      if ((element as any).isDestroyed || !this.elements.has(element.id)) {
        continue;
      }

      this.chunkManager.updateElementPosition(element);
      if (hasPerf) {
        const dur = performance.now() - tStart;
        const tracker = this.getDynamicTracker(element);
        tracker.durationMs += dur;
        tracker.count++;
      }
    }

    if (hasPerf) {
      for (let i = 0; i < this.dynamicTimingsList.length; i++) {
        const tracker = this.dynamicTimingsList[i]!;
        if (tracker.count > 0) {
          this.telemetryPort.recordFileTiming?.(tracker.fileName, tracker.module, tracker.durationMs, tracker.count);
        }
      }
    }

    this.stunnedPositionsPool.forEach(this._handleStunnedPosition);

    const tCol = typeof performance !== 'undefined' ? performance.now() : 0;
    this.collisionManager.resolveStaticCollisions(player, activeElements);
    this.collisionManager.applyDelayedCollisions(this.elements, player);

    for (let i = 0; i < activeElements.length; i++) {
      const element = activeElements[i]!;
      if ((element as any).isDestroyed || !this.elements.has(element.id)) continue;
      this.clampToWorldBounds(element);
    }
    this.clampToWorldBounds(player);

    this.collisionManager.checkCollisions(player, activeElements, this.worldBounds);
    if (tCol > 0) {
      this.telemetryPort.recordFileTiming?.('CollisionManager.ts', 'Domain / Physics', performance.now() - tCol, 1);
    }
  }

  public spawn<T extends ObjectElement>(factoryFn: (id: number) => T): T {
    const newId = this.nextId++;
    const newElement = factoryFn(newId);
    if (!newElement || typeof newElement.id !== 'number') {
      throw new Error("A fábrica deve retornar uma instância de ObjectElement válida.");
    }
    this.elements.set(newId, newElement);
    this.elementsArray.push(newElement);
    this.chunkManager.registerElement(newElement);
    
    if (newElement instanceof EnvironmentCollider) {
        this.collisionManager.addStaticCollider(newElement);
    }

    return newElement;
  }

  public removeByID(id: number): boolean {
    const el = this.elements.get(id);
    if (!el) return false;
    (el as any).isDestroyed = true;
    this.elements.delete(id);
    const idx = this.elementsArray.indexOf(el);
    if (idx !== -1) this.elementsArray.splice(idx, 1);
    this.chunkManager.removeElement(id);
    if (el instanceof EnvironmentCollider) {
      this.collisionManager.removeStaticCollider(el);
    }
    if (typeof (el as any).destroy === 'function') {
      (el as any).destroy();
    }
    return true;
  }

  public clearWorldElements(preservePlayer: boolean = true): void {
    const toRemove: number[] = [];
    for (const [id, element] of this.elements.entries()) {
      if (preservePlayer && (element.objectId === 'player' || element.id === 1)) {
        continue;
      }
      toRemove.push(id);
    }
    for (const id of toRemove) {
      this.removeByID(id);
    }
    this.chunkManager.clear(preservePlayer);
    this.collisionManager.clearStaticColliders();
    this.collisionManager.clearPendingCollisions();
    this.renderStatePool = [];
    this.stunnedPositionsPool.clear();
  }

  public setCollectedWorldItems(items: Set<string> | string[]): void {
    this.collectedWorldItems = new Set(items);
    this.purgeCollectedItems(this.collectedWorldItems);
  }

  public getCollectedWorldItems(): Set<string> {
    return this.collectedWorldItems;
  }

  public isItemCollected(pickupId: string): boolean {
    return this.collectedWorldItems.has(pickupId);
  }

  public purgeCollectedItems(collectedIds: Set<string>): void {
    if (!collectedIds || collectedIds.size === 0) return;
    const toRemove: number[] = [];
    for (const [id, element] of this.elements.entries()) {
      if (element.objectId === 'droppedItem' && (element as any).pickupId) {
        if (collectedIds.has((element as any).pickupId)) {
          toRemove.push(id);
        }
      }
    }
    for (const id of toRemove) {
      this.removeByID(id);
    }
  }

  public getElementById(id: number): ObjectElement | undefined {
    return this.elements.get(id);
  }

  public getEntities(): ObjectElement[] {
    return this.elementsArray;
  }

  private activeWorldBoundsDTO?: WorldBoundsDTO | undefined;

  public setWorldBounds(boundsOrWidth: number | WorldBoundsDTO | { minX?: number, minY?: number, maxX?: number, maxY?: number, width?: number, height?: number }, maybeHeight?: number): void {
    if (typeof boundsOrWidth === 'number') {
      this.worldBounds = { x: 0, y: 0, width: boundsOrWidth, height: maybeHeight || boundsOrWidth };
      this.activeWorldBoundsDTO = undefined;
    } else if (boundsOrWidth) {
      this.activeWorldBoundsDTO = boundsOrWidth as WorldBoundsDTO;
      const minX = boundsOrWidth.minX ?? 0;
      const minY = boundsOrWidth.minY ?? 0;
      const maxX = boundsOrWidth.maxX ?? (boundsOrWidth.width ? minX + boundsOrWidth.width : minX);
      const maxY = boundsOrWidth.maxY ?? (boundsOrWidth.height ? minY + boundsOrWidth.height : minY);
      this.worldBounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
  }

  public getWorldBounds(): { x: number, y: number, width: number, height: number } {
    return this.worldBounds;
  }

  private clampToWorldBounds(element: ObjectElement): void {
    const { coordinates, size } = element;
    const minX = this.worldBounds.x;
    const minY = this.worldBounds.y;
    const maxX = this.worldBounds.x + this.worldBounds.width;
    const maxY = this.worldBounds.y + this.worldBounds.height;

    coordinates.x = Math.max(minX, Math.min(coordinates.x, maxX - size.width));
    coordinates.y = Math.max(minY, Math.min(coordinates.y, maxY - size.height));

    //? Clamping dinâmico por topologia de chunks: restringe transição em bordas sem chunk contíguo.
    const chunks = this.activeWorldBoundsDTO?.chunks;
    if (chunks && chunks.length > 0) {
      const origin = this.activeWorldBoundsDTO?.originChunk || { cx: 0, cy: 0 };
      const chunkSize = this.activeWorldBoundsDTO?.chunkSize || 1024;

      const midX = coordinates.x + size.width * 0.5;
      const midY = coordinates.y + size.height * 0.5;
      const curCx = Math.floor(midX / chunkSize);
      const curCy = Math.floor(midY / chunkSize);

      if (ChunkBoundaryHelper.isChunkValid(chunks, origin, curCx, curCy)) {
        const cMinX = curCx * chunkSize;
        const cMaxX = (curCx + 1) * chunkSize;
        const cMinY = curCy * chunkSize;
        const cMaxY = (curCy + 1) * chunkSize;

        if (!ChunkBoundaryHelper.isChunkValid(chunks, origin, curCx - 1, curCy)) {
          coordinates.x = Math.max(cMinX, coordinates.x);
        }
        if (!ChunkBoundaryHelper.isChunkValid(chunks, origin, curCx + 1, curCy)) {
          coordinates.x = Math.min(cMaxX - size.width, coordinates.x);
        }
        if (!ChunkBoundaryHelper.isChunkValid(chunks, origin, curCx, curCy - 1)) {
          coordinates.y = Math.max(cMinY, coordinates.y);
        }
        if (!ChunkBoundaryHelper.isChunkValid(chunks, origin, curCx, curCy + 1)) {
          coordinates.y = Math.min(cMaxY - size.height, coordinates.y);
        }
      } else {
        //? Recuperação defensiva de penetração: empurra a entidade de volta para o chunk válido mais próximo.
        if (ChunkBoundaryHelper.isChunkValid(chunks, origin, curCx, curCy + 1)) {
          coordinates.y = Math.max((curCy + 1) * chunkSize, coordinates.y);
        }
        if (ChunkBoundaryHelper.isChunkValid(chunks, origin, curCx, curCy - 1)) {
          coordinates.y = Math.min(curCy * chunkSize - size.height, coordinates.y);
        }
        if (ChunkBoundaryHelper.isChunkValid(chunks, origin, curCx + 1, curCy)) {
          coordinates.x = Math.max((curCx + 1) * chunkSize, coordinates.x);
        }
        if (ChunkBoundaryHelper.isChunkValid(chunks, origin, curCx - 1, curCy)) {
          coordinates.x = Math.min(curCx * chunkSize - size.width, coordinates.x);
        }
      }
    }
  }

  private readonly MAX_ENEMIES: number = 30;
  private readonly MAX_SHADOW_MOBS: number = 5;

  private spawnWave(): void {
    let currentEnemies = 0;
    for (let i = 0; i < this.elementsArray.length; i++) {
      const objId = this.elementsArray[i]!.objectId;
      if (objId === 'slime' || objId === 'shadowMob' || objId === 'enemy') {
        currentEnemies++;
      }
    }
    if (currentEnemies >= this.MAX_ENEMIES) {
      return;
    }

    const enemyCount = Math.min(20, this.MAX_ENEMIES - currentEnemies);
    const gridCols = 10;
    const spacing = 24;
    const startPos = { x: 200, y: 200 };

    for (let i = 0; i < enemyCount; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);

      const x = startPos.x + col * spacing;
      const y = startPos.y + row * spacing;

      this.eventManager.dispatch('spawn', {
          type: 'slime',
          coordinates: { x, y }
      });
    }
  }

  private spawnShadowMob(player: Player): void {
    let currentShadow = 0;
    for (let i = 0; i < this.elementsArray.length; i++) {
      if (this.elementsArray[i]!.objectId === 'shadowMob') {
        currentShadow++;
      }
    }
    if (currentShadow >= this.MAX_SHADOW_MOBS) {
      return;
    }

    const distanceX = Math.random() > 0.5 ? 250 + Math.random() * 100 : -250 - Math.random() * 100;
    const distanceY = Math.random() > 0.5 ? 250 + Math.random() * 100 : -250 - Math.random() * 100;
    const x = player.coordinates.x + distanceX;
    const y = player.coordinates.y + distanceY;

    this.eventManager.dispatch('spawn', {
        type: 'shadowMob',
        coordinates: { x, y }
    });
  }

  public getAllRenderableStates(): EntityRenderableState[] {
    const activeElements = this.chunkManager.getActiveElements(this.elementsArray);
    let index = 0;
    for (let i = 0; i < activeElements.length; i++) {
      const element = activeElements[i]!;
      if ((element as any).isDestroyed || !this.elements.has(element.id)) {
        continue;
      }
      const rotation = typeof element.rotation === 'number' ? element.rotation : 0;

      let state = this.renderStatePool[index];
      if (!state) {
        state = {
          id: element.id,
          entityTypeId: element.objectId,
          coordinates: { x: 0, y: 0 },
          size: { width: 0, height: 0 },
          state: element.state,
          rotation: rotation,
        };
        this.renderStatePool[index] = state;
      }
      state.id = element.id;
      state.entityTypeId = element.objectId;
      state.coordinates.x = element.coordinates.x;
      state.coordinates.y = element.coordinates.y;
      state.size.width = element.size.width;
      state.size.height = element.size.height;
      state.state = element.state;
      state.rotation = rotation;
      state.equipment = (element as any).equipment;
      state.backpack = (element as any).backpack;
      state.coins = (element as any).coins;
      
      const isCognitive = !!(element as any).npcName;
      state.isInteractiveNpc = isCognitive;
      if (isCognitive) {
        state.npcName = (element as any).npcName;
      }
      state.maxBackpackSize = (element as any).maxBackpackSize;
      state.hasBeard = (element as any).hasBeard;
      (state as any).facingDirection = (element as any).facingDirection;
      state.spellElements = (element as any).spellElements;
      
      if ('activeStatusesList' in element) {
        const statusesList = (element as any).activeStatusesList as any[];
        if (!state.activeStatuses) state.activeStatuses = [];
        let statusIndex = 0;
        for (let i = 0; i < statusesList.length; i++) {
            const s = statusesList[i];
            if (!state.activeStatuses[statusIndex]) state.activeStatuses[statusIndex] = { id: '', description: '', remaining: 0 };
            const uiStatus = state.activeStatuses[statusIndex]!;
            uiStatus.id = s.id;
            uiStatus.description = s.description;
            uiStatus.remaining = Math.max(0, s.duration - s.elapsed);
            statusIndex++;
        }
        state.activeStatuses.length = statusIndex;
      } else {
        if (state.activeStatuses) state.activeStatuses.length = 0;
      }

      if ('connectedTo' in element && (element as any).connectedTo) {
        state.connectedTo = (element as any).connectedTo;
      } else {
        (state as any).connectedTo = undefined;
      }

      if (!state.hitboxes) state.hitboxes = [];
      const stateHitboxes = state.hitboxes as any[];
      
      if (element.hitboxes) {
        for (let j = 0; j < element.hitboxes.length; j++) {
          const hitbox = element.hitboxes[j];
          if (hitbox) {
            stateHitboxes[j] = hitbox.getDebugShape();
          }
        }
        stateHitboxes.length = element.hitboxes.length;
      } else {
        stateHitboxes.length = 0;
      }

      index++;
    }
    this.renderStatePool.length = index;
    return this.renderStatePool;
  }
}