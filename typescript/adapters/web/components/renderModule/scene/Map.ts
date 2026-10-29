/** 
 * @file Contém a classe `GameMap`, responsável pelo gerenciamento de alto desempenho
 * de chunks de mapa dinâmicos (janela deslizante 3x3 com carregamento e descarregamento sob demanda)
 * e fundos sólidos para intermaps.
 */
import { VisualConfigMap, type MapVisualConfig } from "../../../shared/VisualConfigMap";
import intermapsMap from "../../../assets/maps/intermapsMap.json";
import { IntermapRegistry } from "../../../../../domain/ObjectModule/Maps/IntermapConfig";
import type Camera from "./Camera";

export interface ActiveChunk {
  readonly x: number;
  readonly y: number;
  readonly key: string;
  readonly imageUrl: string;
  image?: HTMLImageElement | undefined;
  loading: boolean;
}

interface CachedImageEntry {
  image: HTMLImageElement;
  refCount: number;
  loaded: boolean;
}

const SafeImage = typeof Image !== 'undefined' ? Image : (class {
  public src: string = '';
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public complete: boolean = false;
  public naturalWidth: number = 0;
  public naturalHeight: number = 0;
} as unknown as typeof Image);

export default class GameMap {
  private config?: MapVisualConfig;
  public readonly chunkSize: number = 1024;
  public isIntermap: boolean = false;
  public width: number = 0;
  public height: number = 0;
  public backgroundColor?: string;

  /** Matriz de chunks ativos no raio 3x3 em torno da câmera (máximo de 9 chunks simultâneos). */
  private activeChunks: Map<string, ActiveChunk> = new Map();

  /** Cache de instâncias de HTMLImageElement com contagem de referências. */
  private imageCache: Map<string, CachedImageEntry> = new Map();

  /** Rastreia o chunk onde a câmera esteve no último frame para evitar recomputações desnecessárias (Zero-GC no steady-state). */
  private lastChunkX: number = -999999;
  private lastChunkY: number = -999999;

  public get activeChunksCount(): number {
    return this.isIntermap && !this.config ? 1 : this.activeChunks.size;
  }

  public get currentChunkCoords(): { x: number; y: number } {
    return {
      x: this.lastChunkX === -999999 ? 0 : this.lastChunkX,
      y: this.lastChunkY === -999999 ? 0 : this.lastChunkY
    };
  }

  public originChunk: { cx: number; cy: number } = { cx: 0, cy: 0 };

  constructor(mapId: string, customConfig?: MapVisualConfig) {
    if (customConfig) {
      this.config = customConfig;
      this.chunkSize = customConfig.chunkSize || 1024;
      this.originChunk = customConfig.originChunk || { cx: 0, cy: 0 };
      this.width = (this.config.chunks[0]?.length ?? 0) * this.chunkSize;
      this.height = this.config.chunks.length * this.chunkSize;
      return;
    }

    let intermap = IntermapRegistry.get(mapId) || (intermapsMap as Record<string, any>)[mapId];
    if (typeof localStorage !== 'undefined') {
      try {
        const intermapsRaw = localStorage.getItem('rpg_assets_adapter_intermaps');
        if (intermapsRaw) {
          const parsed = JSON.parse(intermapsRaw);
          if (parsed[mapId]) intermap = parsed[mapId];
        }
      } catch {}
    }

    if (intermap) {
      this.isIntermap = true;
      this.width = intermap.width ?? 1024;
      this.height = intermap.height ?? 1024;
      this.backgroundColor = intermap.backgroundColor ?? '#000000';

      // 1. Prioridade absoluta para intermaps: os chunks vivos definidos no catálogo de intermaps
      if (intermap.chunks && Array.isArray(intermap.chunks) && intermap.chunks.length > 0) {
        this.config = {
          category: 'map',
          chunkSize: intermap.chunkSize || 1024,
          chunks: intermap.chunks
        };
        this.chunkSize = this.config.chunkSize;
      } else {
        const visualConfig = VisualConfigMap[mapId];
        if (visualConfig && visualConfig.category === 'map') {
          this.config = visualConfig as MapVisualConfig;
          this.chunkSize = this.config.chunkSize || 1024;
        }
      }

      // 2. Se houver edições salvas no localStorage pelo Assets Adapter, aplica imediatamente
      if (typeof localStorage !== 'undefined') {
        try {
          const intermapsRaw = localStorage.getItem('rpg_assets_adapter_intermaps');
          if (intermapsRaw) {
            const parsedIntermaps = JSON.parse(intermapsRaw);
            const liveDef = parsedIntermaps[mapId];
            if (liveDef) {
              if (liveDef.backgroundColor) this.backgroundColor = liveDef.backgroundColor;
              if (liveDef.width) this.width = liveDef.width;
              if (liveDef.height) this.height = liveDef.height;
              if (liveDef.chunks && Array.isArray(liveDef.chunks) && liveDef.chunks.length > 0) {
                this.config = {
                  category: 'map',
                  chunkSize: liveDef.chunkSize || this.chunkSize || 1024,
                  chunks: liveDef.chunks
                };
                this.chunkSize = this.config.chunkSize;
              }
            }
          }

          const cachedRaw = localStorage.getItem(`assets_adapter_chunks_${mapId}`);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached.chunks && Array.isArray(cached.chunks) && cached.chunks.length > 0) {
              this.config = {
                category: 'map',
                chunkSize: this.chunkSize || 1024,
                chunks: cached.chunks
              };
              if (cached.width) this.width = cached.width;
              if (cached.height) this.height = cached.height;
            }
          }
        } catch { /* ignore */ }
      }

      if (this.config?.chunks && this.config.chunks.length > 0) {
        const cols = this.config.chunks[0]?.length ?? 0;
        const rows = this.config.chunks.length;
        if (cols > 0 && rows > 0) {
          this.width = cols * this.chunkSize;
          this.height = rows * this.chunkSize;
        }
      }
      return;
    }

    const config = VisualConfigMap[mapId];
    if (!config || config.category !== 'map') {
      throw new Error(`Configuração visual não encontrada para o mapa: ${mapId}`);
    }
    this.config = config as MapVisualConfig;
    this.chunkSize = this.config.chunkSize || 1024;

    // Se houver chunks editados salvos no localStorage pelo Assets Adapter, aplica imediatamente
    if (typeof localStorage !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem(`assets_adapter_chunks_${mapId}`);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.chunks && Array.isArray(cached.chunks) && cached.chunks.length > 0) {
            this.config = {
              ...this.config,
              chunks: cached.chunks
            };
          }
        }
      } catch { /* ignore */ }
    }
    this.originChunk = this.config.originChunk || (mapId === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 });

    this.width = (this.config.chunks[0]?.length ?? 0) * this.chunkSize;
    this.height = this.config.chunks.length * this.chunkSize;
  }

  /**
   * Atualiza a janela deslizante de 9 chunks (3x3) ao redor da coordenada alvo (jogador).
   * - Mantém os chunks que permanecem no raio 3x3 sem recarregar.
   * - Carrega sob demanda os novos chunks que entraram na vizinhança.
   * - Descarrega imediatamente e libera a memória da GPU para chunks que saíram da vizinhança.
   */
  public updateActiveWindow(targetX: number, targetY: number): void {
    if (!this.config) return;

    // Converte coordenadas mundiais (que têm o Spawn como (0, 0)) para índices da matriz de chunks
    const signedChunkX = Math.floor(targetX / this.chunkSize);
    const signedChunkY = Math.floor(targetY / this.chunkSize);

    // Otimização Zero-GC: Se o alvo permaneceu no mesmo chunk assinado, o 3x3 é idêntico. Saída imediata O(1)!
    if (signedChunkX === this.lastChunkX && signedChunkY === this.lastChunkY) {
      return;
    }

    this.lastChunkX = signedChunkX;
    this.lastChunkY = signedChunkY;

    // Mapeia para o índice central da matriz somando a origem
    const centerCol = signedChunkX + this.originChunk.cx;
    const centerRow = signedChunkY + this.originChunk.cy;

    // 1. Identifica os 9 chunks da vizinhança 3x3
    const targetKeys = new Set<string>();
    const toLoad: { x: number; y: number; key: string; imageUrl: string }[] = [];

    const chunksMatrix = this.config.chunks;
    const maxRow = chunksMatrix.length;

    for (let y = centerRow - 1; y <= centerRow + 1; y++) {
      if (y < 0 || y >= maxRow) continue;
      const row = chunksMatrix[y];
      if (!row) continue;
      const maxCol = row.length;

      for (let x = centerCol - 1; x <= centerCol + 1; x++) {
        if (x < 0 || x >= maxCol) continue;
        const key = `${x},${y}`;
        targetKeys.add(key);

        if (!this.activeChunks.has(key)) {
          const imageUrl = row[x];
          if (imageUrl) {
            toLoad.push({ x, y, key, imageUrl });
          }
        }
      }
    }

    // 2. Descarrega chunks obsoletos que saíram da vizinhança 3x3
    for (const [key, chunk] of this.activeChunks.entries()) {
      if (!targetKeys.has(key)) {
        this.unloadChunk(key, chunk);
      }
    }

    // 3. Carrega novos chunks que entraram na vizinhança 3x3
    for (let i = 0; i < toLoad.length; i++) {
      const item = toLoad[i]!;
      this.loadChunk(item.x, item.y, item.key, item.imageUrl);
    }
  }

  /**
   * Desenha os chunks ativos na tela ou preenche com cor sólida se for um intermap.
   * Aplica Frustum Culling na CPU para evitar renderizar chunks fora do campo de visão da câmera.
   */
  public draw(ctx: CanvasRenderingContext2D, targetX: number, targetY: number, camera?: Camera): void {
    if (this.isIntermap) {
      ctx.fillStyle = this.backgroundColor ?? '#000000';
      ctx.fillRect(0, 0, this.width, this.height);
      if (!this.config) return;
    }

    if (!this.config) return;

    this.updateActiveWindow(targetX, targetY);

    for (const chunk of this.activeChunks.values()) {
      const img = chunk.image;
      if (img && typeof ctx.drawImage === 'function') {
        const chunkPosX = (chunk.x - this.originChunk.cx) * this.chunkSize;
        const chunkPosY = (chunk.y - this.originChunk.cy) * this.chunkSize;

        // Frustum Culling: ignora chunks que não interceptam a viewport visível da câmera
        if (camera && !camera.isInViewport(chunkPosX, chunkPosY, this.chunkSize, this.chunkSize, 0)) {
          continue;
        }

        ctx.drawImage(
          img,
          chunkPosX,
          chunkPosY,
          this.chunkSize,
          this.chunkSize
        );
      }
    }
  }

  private loadChunk(x: number, y: number, key: string, imageUrl: string): void {
    const chunk: ActiveChunk = {
      x,
      y,
      key,
      imageUrl,
      loading: true
    };
    this.activeChunks.set(key, chunk);

    const cached = this.imageCache.get(imageUrl);
    if (cached) {
      cached.refCount++;
      chunk.image = cached.image;
      chunk.loading = !cached.loaded;
    } else {
      const img = new SafeImage();
      const entry: CachedImageEntry = { image: img, refCount: 1, loaded: false };
      this.imageCache.set(imageUrl, entry);
      chunk.image = img;

      img.onload = () => {
        entry.loaded = true;
        chunk.loading = false;
      };
      img.onerror = () => {
        console.error(`Falha ao carregar textura de chunk: ${imageUrl}`);
        entry.loaded = false;
        chunk.loading = false;
      };
      img.src = imageUrl;
    }
  }

  private unloadChunk(key: string, chunk: ActiveChunk): void {
    this.activeChunks.delete(key);

    const cached = this.imageCache.get(chunk.imageUrl);
    if (cached) {
      cached.refCount--;
      if (cached.refCount <= 0) {
        // Ninguém mais na janela 3x3 utiliza esta imagem:
        // Desvincula listeners e descarrega a textura para liberar a memória da GPU e do navegador
        cached.image.onload = null;
        cached.image.onerror = null;
        cached.image.src = '';
        this.imageCache.delete(chunk.imageUrl);
      }
    }

    chunk.image = undefined;
  }

  /** Retorna a lista de chaves (ex: '1,2') dos chunks atualmente ativos e carregados na memória. */
  public getActiveChunkKeys(): string[] {
    return Array.from(this.activeChunks.keys());
  }

  /** Quantidade exata de chunks gerenciados na memória no momento (máximo 9). */
  public getActiveChunksCount(): number {
    return this.activeChunks.size;
  }

  /** Quantidade exata de imagens carregadas no cache de texturas do mapa. */
  public getLoadedImagesCount(): number {
    return this.imageCache.size;
  }

  /** Verifica se um chunk específico em coordenadas de grid (x, y) está carregado na memória. */
  public isChunkActive(x: number, y: number): boolean {
    return this.activeChunks.has(`${x},${y}`);
  }

  /**
   * Desaloca todos os chunks e destrói o cache de imagens para evitar qualquer vazamento de memória.
   */
  public dispose(): void {
    for (const [key, chunk] of this.activeChunks.entries()) {
      this.unloadChunk(key, chunk);
    }
    this.activeChunks.clear();
    this.imageCache.clear();
    this.lastChunkX = -999999;
    this.lastChunkY = -999999;
  }
}