import type { IEventManager } from "../../eventDispacher/IGameEvents";
import type { ChunkCoordDTO, WorldBoundsDTO } from "../../ports/domain-contracts";
import type ObjectElement from "../ObjectElement";
import type GameWorld from "../GameWorld";

/**
 * ==============================================================================
 * GERENCIADOR DE CHUNKS DO MUNDO (WorldChunkManager)
 * ==============================================================================
 * Centraliza o particionamento espacial por Chunks (1024px x 1024px) com
 * suporte a coordenadas inteiras assinadas (cx, cy) ∈ ℤ × ℤ estilo Minecraft.
 *
 * Responsabilidades (SRP & Zero-GC):
 * 1. Mapeamento bidirecional e hashing espacial inteiro de 32 bits (sem alocação de strings).
 * 2. Rastreamento da Janela Ativa 3x3 em torno da posição do Jogador.
 * 3. Particionamento espacial de entidades para simulação, colisão e renderização culling.
 * 4. Disparo do evento semântico 'activeChunkChanged' ao cruzar fronteiras.
 * 5. Suporte a carregamento e geração procedural sob demanda de chunks.
 * ==============================================================================
 */
export default class WorldChunkManager {
  public static readonly CHUNK_SIZE: number = 1024;

  /**
   * Converte coordenadas de mundo contínuas (x, y) em coordenadas inteiras de chunk (cx, cy).
   * Suporta números negativos naturais: x = -50 -> cx = -1.
   */
  public static getChunkCoord(worldX: number, worldY: number): ChunkCoordDTO {
    return {
      cx: Math.floor(worldX / WorldChunkManager.CHUNK_SIZE),
      cy: Math.floor(worldY / WorldChunkManager.CHUNK_SIZE)
    };
  }

  /**
   * Empacota duas coordenadas inteiras assinadas de 16 bits (-32768 a 32767)
   * em uma chave inteira única de 32 bits assinada (Zero-GC, sem string).
   */
  public static getChunkKey(cx: number, cy: number): number {
    return ((cx & 0xFFFF) << 16) | (cy & 0xFFFF);
  }

  /**
   * Empacota coordenadas de mundo diretamente na chave inteira de 32 bits.
   */
  public static getChunkKeyFromCoords(worldX: number, worldY: number): number {
    const cx = Math.floor(worldX / WorldChunkManager.CHUNK_SIZE);
    const cy = Math.floor(worldY / WorldChunkManager.CHUNK_SIZE);
    return ((cx & 0xFFFF) << 16) | (cy & 0xFFFF);
  }

  /**
   * Desempacota uma chave inteira de 32 bits de volta para (cx, cy) inteiros assinados.
   */
  public static unpackChunkKey(key: number): ChunkCoordDTO {
    return {
      cx: key >> 16,
      cy: (key << 16) >> 16
    };
  }

  private currentCenterChunk: ChunkCoordDTO = { cx: 0, cy: 0 };
  private activeChunkKeys: Set<number> = new Set();
  private activeChunkCoords: ChunkCoordDTO[] = [];
  private isPartitioningEnabled: boolean = true;

  private chunkElements: Map<number, Set<ObjectElement>> = new Map();
  private elementChunkMap: Map<number, number> = new Map(); //? Mapeamento de element.id para chave numérica de chunk
  private alwaysActiveElements: Set<ObjectElement> = new Set(); //? Entidades globais imunes a culling (ex: barreiras de borda do mapa)

  //! Buffer reutilizável de entidades ativas para manter Zero-GC no hot path de tick e colisão
  private activeElementsBuffer: ObjectElement[] = [];
  private isBufferDirty: boolean = true;

  private loadedChunks: Set<number> = new Set();
  private proceduralGenerator?: (cx: number, cy: number, manager: WorldChunkManager) => void;

  constructor(private eventManager?: IEventManager) {
    this.recomputeActiveWindow(0, 0, false);
  }

  /**
   * Inicializa o gerenciador para o mundo informado, configurando o chunk central
   * na origem ou no spawn default e marcando os chunks nominais como carregados.
   */
  public initForWorld(world: GameWorld): void {
    const origin = world.originChunk || { cx: 0, cy: 0 };
    const defaultSpawn = world.defaultSpawn || { x: 0, y: 0 };
    const initialCx = Math.floor(defaultSpawn.x / WorldChunkManager.CHUNK_SIZE);
    const initialCy = Math.floor(defaultSpawn.y / WorldChunkManager.CHUNK_SIZE);

    this.recomputeActiveWindow(initialCx, initialCy, false);

    const minCx = Math.floor(world.minX / WorldChunkManager.CHUNK_SIZE);
    const maxCx = Math.floor((world.maxX - 1) / WorldChunkManager.CHUNK_SIZE);
    const minCy = Math.floor(world.minY / WorldChunkManager.CHUNK_SIZE);
    const maxCy = Math.floor((world.maxY - 1) / WorldChunkManager.CHUNK_SIZE);

    for (let x = minCx; x <= maxCx; x++) {
      for (let y = minCy; y <= maxCy; y++) {
        if (world.isChunkValid(x, y)) {
          this.loadedChunks.add(WorldChunkManager.getChunkKey(x, y));
        }
      }
    }
  }

  /**
   * Define o gerador procedural sob demanda caso o jogador explore áreas não geradas.
   */
  public setProceduralGenerator(generator: (cx: number, cy: number, manager: WorldChunkManager) => void): void {
    this.proceduralGenerator = generator;
  }

  /**
   * Habilita ou desabilita o particionamento espacial estrito (útil para mapas fechados pequenos).
   */
  public setPartitioningEnabled(enabled: boolean): void {
    this.isPartitioningEnabled = enabled;
    this.isBufferDirty = true;
  }

  public getPartitioningEnabled(): boolean {
    return this.isPartitioningEnabled;
  }

  /**
   * Atualiza a posição do jogador e computa a transição de chunks na janela 3x3.
   * Dispara 'activeChunkChanged' apenas quando o jogador cruza a fronteira do chunk central.
   */
  public updatePlayerPosition(playerCenterX: number, playerCenterY: number): boolean {
    const cx = Math.floor(playerCenterX / WorldChunkManager.CHUNK_SIZE);
    const cy = Math.floor(playerCenterY / WorldChunkManager.CHUNK_SIZE);

    if (cx === this.currentCenterChunk.cx && cy === this.currentCenterChunk.cy) {
      return false;
    }

    this.recomputeActiveWindow(cx, cy, true);
    return true;
  }

  /**
   * Recalcula os 9 chunks que compõem a janela ativa 3x3 centrada em (centerCx, centerCy).
   */
  private recomputeActiveWindow(centerCx: number, centerCy: number, dispatchEvent: boolean): void {
    const prev = { ...this.currentCenterChunk };
    this.currentCenterChunk.cx = centerCx;
    this.currentCenterChunk.cy = centerCy;

    this.activeChunkKeys.clear();
    this.activeChunkCoords = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = centerCx + dx;
        const cy = centerCy + dy;
        const key = WorldChunkManager.getChunkKey(cx, cy);

        this.activeChunkKeys.add(key);
        this.activeChunkCoords.push({ cx, cy });

        if (this.proceduralGenerator && !this.loadedChunks.has(key)) {
          this.loadedChunks.add(key);
          this.proceduralGenerator(cx, cy, this);
        }
      }
    }

    this.isBufferDirty = true;

    if (dispatchEvent && this.eventManager) {
      this.eventManager.dispatch('activeChunkChanged', {
        previousChunk: prev,
        currentChunk: { cx: centerCx, cy: centerCy },
        activeChunks: this.activeChunkCoords
      });
    }
  }

  /**
   * Registra uma nova entidade na malha espacial de chunks.
   */
  public registerElement(element: ObjectElement): void {
    if (!element || (element as any).isDestroyed) return;
    if (element.objectId === 'environmentCollider') {
      this.alwaysActiveElements.add(element);
    }
    const midX = element.coordinates.x + (element.size?.width || 0) * 0.5;
    const midY = element.coordinates.y + (element.size?.height || 0) * 0.5;
    const key = WorldChunkManager.getChunkKeyFromCoords(midX, midY);

    let cell = this.chunkElements.get(key);
    if (!cell) {
      cell = new Set();
      this.chunkElements.set(key, cell);
    }
    cell.add(element);
    this.elementChunkMap.set(element.id, key);
    this.isBufferDirty = true;
  }

  /**
   * Atualiza a célula de chunk de uma entidade móvel (Zero-GC se ela não cruzar fronteira).
   */
  public updateElementPosition(element: ObjectElement): void {
    if (!element || (element as any).isDestroyed) return;
    const oldKey = this.elementChunkMap.get(element.id);
    //? Ignora entidades não mapeadas em chunks (já removidas ou despawnadas) para evitar reativação espúria
    if (oldKey === undefined) return;

    const midX = element.coordinates.x + (element.size?.width || 0) * 0.5;
    const midY = element.coordinates.y + (element.size?.height || 0) * 0.5;
    const newKey = WorldChunkManager.getChunkKeyFromCoords(midX, midY);

    if (oldKey === newKey) return;

    const oldCell = this.chunkElements.get(oldKey);
    if (oldCell) {
      oldCell.delete(element);
      if (oldCell.size === 0) this.chunkElements.delete(oldKey);
    }

    let newCell = this.chunkElements.get(newKey);
    if (!newCell) {
      newCell = new Set();
      this.chunkElements.set(newKey, newCell);
    }
    newCell.add(element);
    this.elementChunkMap.set(element.id, newKey);
    this.isBufferDirty = true;
  }

  /**
   * Remove uma entidade do particionamento espacial.
   */
  public removeElement(elementId: number): void {
    for (const el of this.alwaysActiveElements) {
      if (el.id === elementId) {
        this.alwaysActiveElements.delete(el);
        break;
      }
    }
    const key = this.elementChunkMap.get(elementId);
    if (key !== undefined) {
      this.elementChunkMap.delete(elementId);
      const cell = this.chunkElements.get(key);
      if (cell) {
        for (const el of cell) {
          if (el.id === elementId) {
            cell.delete(el);
            break;
          }
        }
        if (cell.size === 0) this.chunkElements.delete(key);
      }
      this.isBufferDirty = true;
    }
  }

  /**
   * Verifica se a entidade está contida na Janela Ativa 3x3 do jogador.
   * O Jogador e colisores de ambiente estáticos são SEMPRE considerados ativos.
   */
  public isElementInActiveWindow(element: ObjectElement): boolean {
    if (!this.isPartitioningEnabled) return true;
    if (!element) return false;
    if (element.id === 1 || element.objectId === 'player' || element.objectId === 'environmentCollider') return true;

    const key = this.elementChunkMap.get(element.id);
    if (key !== undefined) {
      return this.activeChunkKeys.has(key);
    }

    const midX = element.coordinates.x + (element.size?.width || 0) * 0.5;
    const midY = element.coordinates.y + (element.size?.height || 0) * 0.5;
    const computedKey = WorldChunkManager.getChunkKeyFromCoords(midX, midY);
    return this.activeChunkKeys.has(computedKey);
  }

  /**
   * Verifica se uma coordenada de mundo pertence à janela 3x3 ativa.
   */
  public isCoordInActiveWindow(worldX: number, worldY: number): boolean {
    if (!this.isPartitioningEnabled) return true;
    const key = WorldChunkManager.getChunkKeyFromCoords(worldX, worldY);
    return this.activeChunkKeys.has(key);
  }

  /**
   * Retorna a lista de entidades ativas contidas na janela 3x3.
   * Utiliza buffer interno memoizado para Zero-GC no loop de 60 FPS.
   */
  public getActiveElements(fallbackAllElements?: ObjectElement[]): ObjectElement[] {
    if (!this.isPartitioningEnabled) {
      return fallbackAllElements || [];
    }

    if (!this.isBufferDirty) {
      return this.activeElementsBuffer;
    }

    this.activeElementsBuffer.length = 0;
    for (const key of this.activeChunkKeys) {
      const cell = this.chunkElements.get(key);
      if (cell && cell.size > 0) {
        for (const el of cell) {
          if (!(el as any).isDestroyed) {
            this.activeElementsBuffer.push(el);
          }
        }
      }
    }
    for (const el of this.alwaysActiveElements) {
      if (!(el as any).isDestroyed && !this.activeElementsBuffer.includes(el)) {
        this.activeElementsBuffer.push(el);
      }
    }
    this.isBufferDirty = false;
    return this.activeElementsBuffer;
  }

  public getCurrentChunk(): ChunkCoordDTO {
    return { ...this.currentCenterChunk };
  }

  public getActiveChunks(): readonly ChunkCoordDTO[] {
    return this.activeChunkCoords;
  }

  public getActiveChunkKeys(): ReadonlySet<number> {
    return this.activeChunkKeys;
  }

  public isChunkLoaded(cx: number, cy: number): boolean {
    return this.loadedChunks.has(WorldChunkManager.getChunkKey(cx, cy));
  }

  public markChunkLoaded(cx: number, cy: number): void {
    this.loadedChunks.add(WorldChunkManager.getChunkKey(cx, cy));
  }

  /**
   * Limpa todo o estado e buffers do particionador.
   */
  public clear(preservePlayer: boolean = true): void {
    if (preservePlayer) {
      for (const [key, cell] of this.chunkElements.entries()) {
        const toDelete: ObjectElement[] = [];
        for (const el of cell) {
          if (el.id !== 1 && el.objectId !== 'player') {
            toDelete.push(el);
            this.elementChunkMap.delete(el.id);
          }
        }
        for (const el of toDelete) {
          cell.delete(el);
        }
        if (cell.size === 0) this.chunkElements.delete(key);
      }
    } else {
      this.chunkElements.clear();
      this.elementChunkMap.clear();
      this.alwaysActiveElements.clear();
    }
    this.activeElementsBuffer.length = 0;
    this.isBufferDirty = true;
  }
}
