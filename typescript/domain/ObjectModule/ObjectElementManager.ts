/** @file Contém a classe ObjectElementManager, responsável por gerenciar o ciclo de vida (criação, atualização, remoção) de uma coleção de entidades de domínio. */
import type { EntityRenderableState } from "../ports/domain-contracts";
import type Player from "./Entities/Player/Player";
import ObjectElement from "./ObjectElement";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import type { ICollisionService } from "../ports/ICollisionService";
import { SpawnRegistry } from "./SpawnRegistry";

// Auto-carrega todas as entidades e itens do domínio para engatilhar os decorators @RegisterSpawner
import.meta.glob('./Entities/**/*.ts', { eager: true });
import.meta.glob('./Items/**/*.ts', { eager: true });
import.meta.glob('./!(Collision.worker).ts', { eager: true }); // Garante que EnvironmentCollider e outras raízes ativem o Decorator

/** * @class ObjectElementManager * Gerencia uma coleção de `ObjectElement`s (como inimigos, itens, projéteis). * Esta classe encapsula a lógica de adicionar, remover, atualizar e acessar * grupos de entidades, permitindo que a `DomainFacade` delegue essa * responsabilidade e permaneça focada na orquestração de alto nível. */
export default class ObjectElementManager {
  /** @private Um mapa que armazena todas as entidades gerenciadas, usando o ID como chave para acesso rápido. */
  private elements: Map<number, ObjectElement> = new Map();
  private elementsArray: ObjectElement[] = []; // Array sombra contíguo O(1) para abolir MapIterators
  /** @private Um contador para gerar IDs únicos para novas entidades. Começa em 100 para evitar colisões com IDs estáticos (como o do jogador). */
  private nextId: number = 100;
  /** @private Armazena os limites do mundo para recriar a Quadtree. */
  private worldBounds: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 };
  
  private isCheckingCollisions: boolean = false;

  private waveTimer: number = 0;
  private readonly WAVE_INTERVAL: number = 5; // 5 segundos de jogo para a próxima onda
  private shadowMobTimer: number = 0;
  private readonly SHADOW_MOB_INTERVAL: number = 30; // 30 segundos para a aparição do mago sombrio
  private renderStatePool: EntityRenderableState[] = [];
  private pendingCollisions: Int32Array = new Int32Array(0);
  private collisionBuffer: Float32Array = new Float32Array(10000); // Espaço para 2500 hitboxes simultâneas
  private emptyCollisions: Int32Array = new Int32Array(0);
  private stunnedPositionsPool: Map<number, {x: number, y: number}> = new Map();
  private sharedNeighborsArray: ObjectElement[] = [];
  private staticCollidersCache: any[] = [];
  private staticGrid: Map<number, any[]> = new Map();
  private readonly GRID_SIZE = 256; // 256x256 pixels por célula para otimização de AABB estática
  private currentCollisionTick = 0;

  private handleCollisionResult = (pairs: Int32Array) => {
    this.pendingCollisions = pairs;
    this.isCheckingCollisions = false;
  };

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

  constructor(private eventManager: IEventManager, private collisionService: ICollisionService) {
    this.eventManager.dispatch('log', { channel: 'init', message: 'ObjectElementManager instantiated.', params: [] });
    this.setupEventListeners();
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
              const key = c + (row << 10);
              const cell = this.staticGrid.get(key);
              if (!cell) continue;

              for (let i = 0; i < cell.length; i++) {
                  const env = cell[i];
                  if (env._lastCheckTick === this.currentCollisionTick) continue;
                  env._lastCheckTick = this.currentCollisionTick;

                  const aabb = env._aabbCache;

                  if (cx + r > aabb.boxX && cx - r < aabb.boxX + aabb.boxW && cy + r > aabb.boxY && cy - r < aabb.boxY + aabb.boxH) {
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

  private resolveStaticCollisions(player: Player): void {
      const statics = this.staticCollidersCache;
      if (statics.length === 0) return;
      this.resolveDynamicStatic(player);
      for (let i = 0; i < this.elementsArray.length; i++) {
          const element = this.elementsArray[i]!;
          if (element.objectId === 'enemy' || element.objectId === 'slime' || element.objectId === 'shadowMob') {
              this.resolveDynamicStatic(element);
          }
      }
  }
  
  //? ----------- Methods -----------

  /** Configura os listeners para eventos de domínio que afetam os objetos gerenciados. */
  private setupEventListeners(): void {

    this.eventManager.on('spawn', (payload) => {
      const factory = SpawnRegistry.strategies.get(payload.type);
      if (factory) {
        this.spawn(id => factory(id, payload, this.eventManager));
      } else {
        this.eventManager.dispatch('log', { channel: 'error', message: `(Manager) Nenhuma fábrica registrada para o tipo: ${payload.type}`, params: [] });
      }
    });
    
    this.eventManager.on('despawn', payload => {
      this.removeByID(payload.objectId);
    });

    this.eventManager.on('requestNeighbors', (payload :any) => {
      this.sharedNeighborsArray.length = 0;
      
      // Centro de quem solicitou a busca
      let reqX = 0;
      let reqY = 0;

      if (payload.coordinates) {
        reqX = payload.coordinates.x;
        reqY = payload.coordinates.y;
      } else if (payload.requester) {
        reqX = payload.requester.coordinates.x + (payload.requester.size.width / 2);
        reqY = payload.requester.coordinates.y + (payload.requester.size.height / 2);
      } else {
        return payload.callback(this.sharedNeighborsArray);
      }


      for (const element of this.elements.values()) {
        if (payload.requester && element.id === payload.requester.id) continue;
        
        const elX = element.coordinates.x + (element.size.width / 2);
        const elY = element.coordinates.y + (element.size.height / 2);
        const distance = Math.hypot(reqX - elX, reqY - elY);
        
        if (distance <= payload.radius) {
          this.sharedNeighborsArray.push(element);
        }
      }
      
      payload.callback(this.sharedNeighborsArray);
    });
  }

  /** * Executa o método `update` de todas as entidades gerenciadas. * @param deltaTime O tempo decorrido desde o último frame. */
  public updateAll(deltaTime: number, player: Player): void {

    // O timer de spawn agora respeita o deltaTime. Se o jogo pausar, o deltaTime para de somar aqui.
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

    // 1. Movemos todas as entidades fisicamente primeiro
    this.stunnedPositionsPool.clear();

    for (let i = 0; i < this.elementsArray.length; i++) {
      const element = this.elementsArray[i]!;
      if ('activeStatuses' in element && (element as any).activeStatuses?.has('stun')) {
          // Salva a posição exata imposta pelo controle de grupo (ex: Pescador arrastando)
          this.stunnedPositionsPool.set(element.id, { x: element.coordinates.x, y: element.coordinates.y });
      }
      element.update(deltaTime, player);
    }

    // Anula qualquer movimento físico que a IA tentou fazer enquanto estava atordoada (Stunned)
    this.stunnedPositionsPool.forEach(this._handleStunnedPosition);

    // MÁGICA: Resolve colisões estáticas SINCRONAMENTE na Main Thread (Extingue o Tunneling e o Efeito Fantasma)!
    this.resolveStaticCollisions(player);

    // 2. Resolução Atrasada: Aplica as colisões para ejetar as entidades de dentro dos obstáculos antes de desenhar!
    for (let i = 0; i < this.pendingCollisions.length; i += 2) {
      const idA = this.pendingCollisions[i];
      const idB = this.pendingCollisions[i + 1];
      if (idA === undefined || idB === undefined) continue;

      const elementA = this.elements.get(idA) || (player.id === idA ? player : undefined);
      const elementB = this.elements.get(idB) || (player.id === idB ? player : undefined);

      if (elementA && elementB) {
        elementA.hitboxes?.[0]?.onColision(elementB);
        elementB.hitboxes?.[0]?.onColision(elementA);
      }
    }
    this.pendingCollisions = this.emptyCollisions;

    // Após todas as atualizações, garante que ninguém saiu dos limites do mapa.
    for (let i = 0; i < this.elementsArray.length; i++) {
      this.clampToWorldBounds(this.elementsArray[i]!);
    }
    // O jogador também precisa ser verificado.
    this.clampToWorldBounds(player);

    // Monta o array limpo, excluindo entidades que foram destruídas (ex: DroppedItems coletados) na resolução de colisão acima
    this.checkCollisions(player);
  }
  /** * Cria e adiciona uma nova entidade ao gerenciador usando uma função de fábrica. * Este método abstrai a criação de qualquer tipo de `ObjectElement`. * @param factoryFn Uma função que recebe um ID e retorna uma nova instância de `ObjectElement` (ou uma subclasse como `Enemy`, `Projectile`, etc.). * @returns A instância da entidade criada. * @template T O tipo específico da entidade a ser criada, que deve estender `ObjectElement`. */
  public spawn<T extends ObjectElement>(factoryFn: (id: number) => T): T {
    const newId = this.nextId++;
    const newElement = factoryFn(newId);
    if (!(newElement instanceof ObjectElement)) {
      throw new Error("A fábrica deve retornar uma instância de ObjectElement.");
    }
    this.elements.set(newId, newElement);
    this.elementsArray.push(newElement);
    
    // Cache AABB for static geometry (Zero-GC optimization)
    if (newElement.objectId === 'environmentCollider') {
        const env = newElement as any;
        let boxX = env.coordinates.x;
        let boxY = env.coordinates.y;
        let boxW = env.size?.width || 32;
        let boxH = env.size?.height || 32;

        if (env.hitboxes && env.hitboxes[0]) {
            const shape = env.hitboxes[0].getDebugShape();
            if (shape.type === 'polygon' && shape.points && shape.points.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for(let i=0; i < shape.points.length; i++) {
                    const px = shape.points[i]!.x;
                    const py = shape.points[i]!.y;
                    if (px < minX) minX = px;
                    if (py < minY) minY = py;
                    if (px > maxX) maxX = px;
                    if (py > maxY) maxY = py;
                }
                boxX = minX; boxY = minY; boxW = maxX - minX; boxH = maxY - minY;
            }
        }
        env._aabbCache = { boxX, boxY, boxW, boxH };
        env._lastCheckTick = 0;
        this.staticCollidersCache.push(env);

        // Zero-GC Spatial Grid Insertion
        const startCol = Math.floor(boxX / this.GRID_SIZE);
        const endCol = Math.floor((boxX + boxW) / this.GRID_SIZE);
        const startRow = Math.floor(boxY / this.GRID_SIZE);
        const endRow = Math.floor((boxY + boxH) / this.GRID_SIZE);
        for(let c = startCol; c <= endCol; c++) {
            for(let r = startRow; r <= endRow; r++) {
                const key = c + (r << 10);
                let cell = this.staticGrid.get(key);
                if(!cell) { cell = []; this.staticGrid.set(key, cell); }
                cell.push(env);
            }
        }
    }

    return newElement;
  }
  /** * Remove um elemento do mapa com base no ID fornecido. @param id O número (key) do elemento a ser removido. @returns Retorna true se o elemento existia e foi removido, ou false caso contrário. */
  public removeByID(id: number): boolean {
    const el = this.elements.get(id);
    if (el) {
        const idx = this.elementsArray.indexOf(el);
        if (idx !== -1) this.elementsArray.splice(idx, 1);
    }
    if (el && el.objectId === 'environmentCollider') {
        const idx = this.staticCollidersCache.indexOf(el);
        if (idx !== -1) this.staticCollidersCache.splice(idx, 1);

        const aabb = (el as any)._aabbCache;
        if (aabb) {
            const startCol = Math.floor(aabb.boxX / this.GRID_SIZE);
            const endCol = Math.floor((aabb.boxX + aabb.boxW) / this.GRID_SIZE);
            const startRow = Math.floor(aabb.boxY / this.GRID_SIZE);
            const endRow = Math.floor((aabb.boxY + aabb.boxH) / this.GRID_SIZE);
            for(let c = startCol; c <= endCol; c++) {
                for(let r = startRow; r <= endRow; r++) {
                    const key = c + (r << 10);
                    let cell = this.staticGrid.get(key);
                    if(cell) {
                        const cellIdx = cell.indexOf(el);
                        if (cellIdx !== -1) cell.splice(cellIdx, 1);
                    }
                }
            }
        }
    }
    return this.elements.delete(id);
  }

  /** Busca uma entidade específica ativa no mundo pelo seu ID. */
  public getElementById(id: number): ObjectElement | undefined {
    return this.elements.get(id);
  }

   /** Define os limites do mundo, essenciais para a inicialização da Quadtree. */
  public setWorldBounds(width: number, height: number): void {
    this.worldBounds = { x: 0, y: 0, width, height };
  }
  /** * Garante que a posição de um elemento esteja dentro dos limites do mundo. * @param element O elemento a ser verificado e corrigido. */
  private clampToWorldBounds(element: ObjectElement): void {
    const { coordinates, size } = element;
    const { width: worldWidth, height: worldHeight } = this.worldBounds;

    coordinates.x = Math.max(0, Math.min(coordinates.x, worldWidth - size.width));
    coordinates.y = Math.max(0, Math.min(coordinates.y, worldHeight - size.height));
  }

  /** * Instancia uma onda de inimigos atrelada ao loop de atualização do domínio. */
  private spawnWave(): void {
    const enemyCount = 20;
    const gridCols = 10; //? 10 inimigos por linha
    const spacing = 24;  //? Espaço entre inimigos. Raio da hitbox é 8, diâmetro é 16. 24px garante que não colidam no spawn
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

  /** Cria um inimigo sombrio fora do campo de visão imediato do jogador */
  private spawnShadowMob(player: Player): void {
    // Calcula uma distância aleatória entre 250 e 350 pixels (positiva ou negativa)
    const distanceX = Math.random() > 0.5 ? 250 + Math.random() * 100 : -250 - Math.random() * 100;
    const distanceY = Math.random() > 0.5 ? 250 + Math.random() * 100 : -250 - Math.random() * 100;
    const x = player.coordinates.x + distanceX;
    const y = player.coordinates.y + distanceY;

    this.eventManager.dispatch('spawn', {
        type: 'shadowMob',
        coordinates: { x, y }
    });
  }


  /** * Retorna uma lista de DTOs (`EntityRenderableState`) para todas as entidades gerenciadas. * @returns Um array com o estado renderizável de cada entidade. */
  public getAllRenderableStates(): EntityRenderableState[] {
    let index = 0;
    for (let i = 0; i < this.elementsArray.length; i++) {
      const element = this.elementsArray[i]!;
      
      // OTIMIZAÇÃO CRÍTICA: Impede que os milhares de blocos invisíveis do chão vão para a GPU e afundem os FPS!
      if (element.objectId === 'environmentCollider') continue;

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
        (state as any).connectedTo = undefined; // Remove a chave sem destruir a hidden class C++ do V8
      }

      // Reciclando o Array de Hitboxes (Livre do Garbage Collector)
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

  private checkCollisions(player: Player): void {
      if (this.isCheckingCollisions) return;
      this.isCheckingCollisions = true;

      let offset = 0;
      offset = this.addElementToCollisionBuffer(player, offset);
      for (let i = 0; i < this.elementsArray.length; i++) {
          offset = this.addElementToCollisionBuffer(this.elementsArray[i]!, offset);
      }

      // Envia (Fire and Forget)
      this.collisionService.checkCollisions(this.collisionBuffer, offset, this.worldBounds, this.handleCollisionResult);
  }

  private addElementToCollisionBuffer(element: ObjectElement, offset: number): number {
      if (!element || !element.hitboxes || element.objectId === 'environmentCollider') return offset;
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

  
}