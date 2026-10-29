/**
 * @file ChunkManagerModal.ts
 * Modal visual para gerenciamento de chunks: adicionar/deletar linhas e colunas,
 * e definir texturas de fundo do terreno em tempo real sincronizado com o código.
 */

import type { SelectedMapConfig } from "./MapSelectorModal";
import type { AssetScanner } from "./AssetScanner";
import type { PlacedAssetModel } from "../Models/PlacedAssetModel";
import { ChunkSync } from "./ChunkSync";
import { VisualConfigMap, type MapVisualConfig } from "../../web/shared/VisualConfigMap";
import { InnerMapManager } from "./InnerMapManager";
import { ConfirmationModal } from "../../web/GUIS/confirmationModalModule/ConfirmationModalGui";

export interface TerrainTextureOption {
    label: string;
    url: string;
    path: string;
    fileName: string;
}

export class ChunkManagerModal {
    private modalElement: HTMLElement | null = null;
    private mapConfig: SelectedMapConfig;
    private chunkSync: ChunkSync;
    private onMapUpdated: (updatedConfig: SelectedMapConfig) => void;
    private scanner?: AssetScanner | undefined;
    private onOpenMap?: ((mapConfig: SelectedMapConfig) => void) | undefined;
    private placedAssetsProvider?: (() => PlacedAssetModel[]) | undefined;
    private activeTab: 'chunks' | 'innermaps' = 'chunks';
    private selectedCell: { row: number; col: number } | null = null;
    private cellPaths: Map<string, string> = new Map();

    // Presets de texturas comuns de terreno disponíveis no projeto
    public static readonly DEFAULT_GROUND = new URL('../../web/assets/maps/vilgem/chunk_1_1_ground.png', import.meta.url).href;
    public static readonly TERRAIN_TEXTURES: TerrainTextureOption[] = [
        { label: 'Grama Central (Ground)', url: new URL('../../web/assets/maps/vilgem/chunk_1_1_ground.png', import.meta.url).href, path: 'assets/maps/vilgem/chunk_1_1_ground.png', fileName: 'chunk_1_1_ground.png' },
        { label: 'Borda Noroeste (NW)', url: new URL('../../web/assets/maps/vilgem/chunk_0_0_nw.png', import.meta.url).href, path: 'assets/maps/vilgem/chunk_0_0_nw.png', fileName: 'chunk_0_0_nw.png' },
        { label: 'Borda Norte (N)', url: new URL('../../web/assets/maps/vilgem/chunk_1_0_n.png', import.meta.url).href, path: 'assets/maps/vilgem/chunk_1_0_n.png', fileName: 'chunk_1_0_n.png' },
        { label: 'Borda Nordeste (NE)', url: new URL('../../web/assets/maps/vilgem/chunk_2_0_ne.png', import.meta.url).href, path: 'assets/maps/vilgem/chunk_2_0_ne.png', fileName: 'chunk_2_0_ne.png' },
        { label: 'Borda Oeste (W)', url: new URL('../../web/assets/maps/vilgem/chunk_0_1_w.png', import.meta.url).href, path: 'assets/maps/vilgem/chunk_0_1_w.png', fileName: 'chunk_0_1_w.png' },
        { label: 'Borda Leste (E)', url: new URL('../../web/assets/maps/vilgem/chunk_2_1_e.png', import.meta.url).href, path: 'assets/maps/vilgem/chunk_2_1_e.png', fileName: 'chunk_2_1_e.png' },
        { label: 'Borda Sudoeste (SW)', url: new URL('../../web/assets/maps/vilgem/chunk_0_2_sw.png', import.meta.url).href, path: 'assets/maps/vilgem/chunk_0_2_sw.png', fileName: 'chunk_0_2_sw.png' },
        { label: 'Borda Sul (S)', url: new URL('../../web/assets/maps/vilgem/chunk_1_2_s.png', import.meta.url).href, path: 'assets/maps/vilgem/chunk_1_2_s.png', fileName: 'chunk_1_2_s.png' },
        { label: 'Borda Sudeste (SE)', url: new URL('../../web/assets/maps/vilgem/chunk_2_2_se.png', import.meta.url).href, path: 'assets/maps/vilgem/chunk_2_2_se.png', fileName: 'chunk_2_2_se.png' },
        { label: 'Grama Nativa de Vilgem (Sem Emendas)', url: new URL('../../web/assets/maps/vilgem/grass_seamless_base.png', import.meta.url).href, path: 'assets/maps/vilgem/grass_seamless_base.png', fileName: 'grass_seamless_base.png' }
    ];

    constructor(
        mapConfig: SelectedMapConfig, 
        onMapUpdated: (updatedConfig: SelectedMapConfig) => void,
        scanner?: AssetScanner,
        onOpenMap?: (mapConfig: SelectedMapConfig) => void,
        placedAssetsProvider?: () => PlacedAssetModel[]
    ) {
        this.mapConfig = mapConfig;
        this.onMapUpdated = onMapUpdated;
        this.scanner = scanner;
        this.onOpenMap = onOpenMap;
        this.placedAssetsProvider = placedAssetsProvider;
        this.chunkSync = new ChunkSync();
        this.ensureChunksLoaded();
    }

    public updateMapConfig(mapConfig: SelectedMapConfig): void {
        this.mapConfig = mapConfig;
        this.ensureChunksLoaded();
    }

    private ensureChunksLoaded(): void {
        if (!this.mapConfig.originChunk) {
            this.mapConfig.originChunk = this.mapConfig.id === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 };
        }

        if (!this.mapConfig.chunks || this.mapConfig.chunks.length === 0) {
            // 1. Tenta carregar de VisualConfigMap (fonte de verdade em código)
            const mapVisual = VisualConfigMap[this.mapConfig.id] as MapVisualConfig | undefined;
            if (mapVisual?.chunks && mapVisual.chunks.length > 0) {
                this.mapConfig.chunks = mapVisual.chunks.map((row: string[]) => [...row]);
                const rows = this.mapConfig.chunks.length;
                const cols = this.mapConfig.chunks[0]?.length || 3;
                this.mapConfig.width = cols * (this.mapConfig.chunkSize || 1024);
                this.mapConfig.height = rows * (this.mapConfig.chunkSize || 1024);
                this.updateWorldBounds();
                return;
            }

            // 2. Tenta carregar do cache local síncrono
            const cached = this.chunkSync.getCachedChunks(this.mapConfig.id);
            if (cached && cached.chunks.length > 0) {
                this.mapConfig.chunks = cached.chunks.map(row => [...row]);
                this.mapConfig.width = cached.width;
                this.mapConfig.height = cached.height;
                if (cached.originChunk) {
                    this.mapConfig.originChunk = { ...cached.originChunk };
                }
                this.updateWorldBounds();
                return;
            }

            // 3. Fallback: cria matriz padrão se não existir
            const cols = Math.max(1, Math.ceil(this.mapConfig.width / (this.mapConfig.chunkSize || 1024)));
            const rows = Math.max(1, Math.ceil(this.mapConfig.height / (this.mapConfig.chunkSize || 1024)));
            this.mapConfig.chunks = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ChunkManagerModal.DEFAULT_GROUND));
            this.updateWorldBounds();
        } else {
            this.updateWorldBounds();
        }
    }

    /**
     * Retorna o chunk que atua como origem central (0, 0)
     */
    public getOriginChunk(): { cx: number; cy: number } {
        if (!this.mapConfig.originChunk) {
            this.mapConfig.originChunk = this.mapConfig.id === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 };
        }
        return this.mapConfig.originChunk;
    }

    /**
     * Converte índices de linha e coluna na matriz para coordenadas inteiras assinadas (cx, cy) ∈ ℤ × ℤ
     * onde o chunk de origem tem coordenadas (0, 0).
     */
    public getSignedChunkCoords(row: number, col: number): { cx: number; cy: number } {
        const origin = this.getOriginChunk();
        return {
            cx: col - origin.cx,
            cy: row - origin.cy
        };
    }

    /**
     * Atualiza os limites do mundo (worldBounds, minChunkX, minChunkY) com base na origem
     */
    public updateWorldBounds(): void {
        const chunks = this.mapConfig.chunks || [];
        const rows = chunks.length;
        const cols = chunks[0]?.length || 0;
        const chunkSize = this.mapConfig.chunkSize || 1024;
        const origin = this.getOriginChunk();

        const minChunkX = -origin.cx;
        const minChunkY = -origin.cy;
        const maxChunkX = cols - 1 - origin.cx;
        const maxChunkY = rows - 1 - origin.cy;

        this.mapConfig.minChunkX = minChunkX;
        this.mapConfig.minChunkY = minChunkY;
        this.mapConfig.worldBounds = {
            minX: minChunkX * chunkSize,
            minY: minChunkY * chunkSize,
            maxX: (maxChunkX + 1) * chunkSize,
            maxY: (maxChunkY + 1) * chunkSize
        };
    }

    public getAvailableTextures(): TerrainTextureOption[] {
        const list = [...ChunkManagerModal.TERRAIN_TEXTURES];
        const seenUrls = new Set(list.map(t => t.url));

        if (this.scanner) {
            const chunkAssets = this.scanner.getAssets('chunks');
            chunkAssets.forEach(asset => {
                if (!seenUrls.has(asset.imageSrc)) {
                    seenUrls.add(asset.imageSrc);
                    const fileName = asset.imageSrc.split('/').pop()?.split('?')[0] || asset.name;
                    list.push({
                        label: asset.name,
                        url: asset.imageSrc,
                        path: `assets/maps/${fileName}`,
                        fileName: fileName
                    });
                }
            });
        }

        return list;
    }

    public resolveTextureUrl(pathOrUrl: string): string {
        if (!pathOrUrl || pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('blob:')) {
            return pathOrUrl;
        }
        const available = this.getAvailableTextures();
        const found = available.find(t => 
            t.path === pathOrUrl || 
            t.fileName === pathOrUrl || 
            t.url === pathOrUrl ||
            pathOrUrl.endsWith(t.fileName)
        );
        return found ? found.url : pathOrUrl;
    }

    public open(): void {
        this.close();

        // Garante que chunks existe como matriz válida
        this.ensureChunksLoaded();

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'modal-backdrop chunk-manager-backdrop is-open';
        this.render();
        document.body.appendChild(this.modalElement);
    }

    public close(): void {
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }
    }

    private render(): void {
        if (!this.modalElement) return;

        const chunks = this.mapConfig.chunks || [];
        const rows = chunks.length;
        const cols = chunks[0]?.length || 0;
        const chunkSize = this.mapConfig.chunkSize || 1024;
        const totalW = cols * chunkSize;
        const totalH = rows * chunkSize;
        const innerMgr = InnerMapManager.getInstance();
        const innerMapsForWorld = innerMgr.getInnerMapsForWorld(this.mapConfig.id);
        const allInnerMaps = innerMgr.getAll();
        const displayInnerMaps = innerMapsForWorld.length > 0 ? innerMapsForWorld : allInnerMaps;

        this.modalElement.innerHTML = `
            <div class="modal-card chunk-manager-card">
                <div class="modal-header">
                    <div class="modal-title-area">
                        <span class="modal-icon">${this.mapConfig.isInnerMap ? '🚪' : '🧱'}</span>
                        <div>
                            <h2>${this.mapConfig.isInnerMap ? 'Gerenciador de InnerMap & Chunks' : 'Construtor de Mundo em Chunks & InnerMaps'}</h2>
                            <p class="modal-subtitle">Mapa: <strong>${this.mapConfig.name}</strong> (${this.mapConfig.id}) ${this.mapConfig.parentWorldId ? `• Derivado de: <code>${this.mapConfig.parentWorldId}</code>` : ''} • ${cols}x${rows} Chunks (${totalW}x${totalH}px)</p>
                        </div>
                    </div>
                    <button class="modal-close-btn" id="btn-close-chunk-modal">✕</button>
                </div>

                <!-- Barra de Abas (Tabs) -->
                <div class="modal-tab-bar">
                    <button type="button" class="modal-tab-btn ${this.activeTab === 'chunks' ? 'active' : ''}" id="tab-btn-chunks">
                        🧱 Chunks do Terreno (${cols}x${rows})
                    </button>
                    <button type="button" class="modal-tab-btn ${this.activeTab === 'innermaps' ? 'active' : ''}" id="tab-btn-innermaps">
                        🚪 InnerMaps & Portais (${displayInnerMaps.length})
                    </button>
                </div>

                ${this.activeTab === 'chunks' ? this.renderChunksTab(chunks, rows, cols, chunkSize) : this.renderInnerMapsTab(displayInnerMaps)}

                <div class="modal-footer">
                    <button id="btn-chunk-modal-close" class="btn-primary">Concluir & Fechar</button>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    private renderChunksTab(chunks: string[][], rows: number, cols: number, chunkSize: number): string {
        const availableTextures = this.getAvailableTextures();
        return `
            <div class="chunk-manager-body">
                <!-- Instruções e Ações Rápidas -->
                <div class="chunk-toolbar">
                    <div class="chunk-info-text">
                        <span>💡 Clique nos botões <b>➕</b> ao redor do mapa para expandir o terreno na direção desejada ou no <b>🗑️</b> de qualquer bloco para deletar o chunk do mapa.</span>
                    </div>
                    <div class="chunk-tools-group right">
                        ${this.mapConfig.isInnerMap ? `
                        <div class="innermap-bg-toolbar-group">
                            <span class="badge-innermap-parent">🚪 InnerMap (Pai: <b>${this.mapConfig.parentWorldId || 'vilgem'}</b>)</span>
                            <label class="innermap-color-label">Fundo Sólido:
                                <input type="color" id="innermap-bg-color-picker" value="${this.mapConfig.backgroundColor || '#000000'}">
                                <input type="text" id="innermap-bg-hex-input" class="prop-input-mini" value="${this.mapConfig.backgroundColor || '#000000'}">
                            </label>
                        </div>
                        ` : ''}
                        <button id="btn-fill-all-grass" class="btn-chunk-action highlight" title="Preencher todos os blocos com grama padrão">🌱 Preencher Tudo com Grama</button>
                    </div>
                </div>

                <!-- Workspace com Layout em 2 Colunas: Viewport Espacial dos Chunks (Esq) e Detalhes/Seleção (Dir) -->
                <div class="chunk-workspace-layout">
                    <!-- Visualizador Espacial de Chunks com Botões Direcionais nas Bordas -->
                    <div class="chunk-builder-viewport">
                        <div class="chunk-builder-container">
                            <!-- Botão de Expansão Norte (Topo - Linha Inteira) -->
                            <div class="chunk-expand-row top">
                                <button id="btn-expand-north" class="btn-chunk-expand btn-expand-h" title="Expandir Mapa para o Norte (Linha Inteira no Topo)">
                                    <span class="expand-icon">➕</span>
                                    <span class="expand-label">Expandir Norte (Linha Inteira)</span>
                                </button>
                            </div>

                            <div class="chunk-builder-middle">
                                <!-- Botão de Expansão Oeste (Esquerda - Coluna Inteira) -->
                                <button id="btn-expand-west" class="btn-chunk-expand btn-expand-v" title="Expandir Mapa para o Oeste (Coluna Inteira à Esquerda)">
                                    <span class="expand-icon">➕</span>
                                    <span class="expand-label">Oeste (Coluna)</span>
                                </button>

                                <!-- Grid de Blocos de Chunks -->
                                <div class="chunk-blocks-grid" style="grid-template-columns: repeat(${cols}, 104px); grid-template-rows: repeat(${rows}, 104px);">
                                    ${chunks.map((row, r) => row.map((bgUrl, c) => {
                                        const isSelected = this.selectedCell?.row === r && this.selectedCell?.col === c;
                                        const isEmpty = !bgUrl || bgUrl.trim() === '';
                                        const signedCoords = this.getSignedChunkCoords(r, c);
                                        const isOrigin = signedCoords.cx === 0 && signedCoords.cy === 0;

                                        if (isEmpty) {
                                            return `
                                                <div class="chunk-block-card empty-chunk ${isSelected ? 'selected' : ''} ${isOrigin ? 'origin-chunk' : ''}" data-row="${r}" data-col="${c}">
                                                    <div class="chunk-block-thumb empty">
                                                        <button type="button" class="btn-create-chunk-slot" data-row="${r}" data-col="${c}" title="Criar apenas 1 chunk nesta posição">
                                                            <span class="slot-add-icon">➕</span>
                                                            <span class="slot-add-label">Criar Chunk</span>
                                                        </button>
                                                        <div class="chunk-block-header">
                                                            <span class="chunk-coord-tag ${isOrigin ? 'spawn-origin' : ''}">${isOrigin ? '⭐ (0,0)' : `(${signedCoords.cx},${signedCoords.cy})`}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            `;
                                        }

                                        const hasNoNorth = r === 0 || !chunks[r - 1]?.[c] || !chunks[r - 1]![c]?.trim();
                                        const hasNoSouth = r === rows - 1 || !chunks[r + 1]?.[c] || !chunks[r + 1]![c]?.trim();
                                        const hasNoWest = c === 0 || !chunks[r]?.[c - 1] || !chunks[r]![c - 1]?.trim();
                                        const hasNoEast = c === cols - 1 || !chunks[r]?.[c + 1] || !chunks[r]![c + 1]?.trim();

                                        const resolvedBgUrl = this.resolveTextureUrl(bgUrl);

                                        return `
                                            <div class="chunk-block-card ${isSelected ? 'selected' : ''} ${isOrigin ? 'origin-chunk' : ''}" data-row="${r}" data-col="${c}">
                                                ${hasNoNorth ? `<button type="button" class="btn-chunk-edge-add edge-north" data-edge="north" data-row="${r}" data-col="${c}" title="Criar apenas 1 chunk ao Norte">➕</button>` : ''}
                                                ${hasNoSouth ? `<button type="button" class="btn-chunk-edge-add edge-south" data-edge="south" data-row="${r}" data-col="${c}" title="Criar apenas 1 chunk ao Sul">➕</button>` : ''}
                                                ${hasNoWest ? `<button type="button" class="btn-chunk-edge-add edge-west" data-edge="west" data-row="${r}" data-col="${c}" title="Criar apenas 1 chunk a Oeste">➕</button>` : ''}
                                                ${hasNoEast ? `<button type="button" class="btn-chunk-edge-add edge-east" data-edge="east" data-row="${r}" data-col="${c}" title="Criar apenas 1 chunk a Leste">➕</button>` : ''}

                                                <div class="chunk-block-thumb" style="background-image: url('${resolvedBgUrl}');">
                                                    <div class="chunk-block-header">
                                                        <span class="chunk-coord-tag ${isOrigin ? 'spawn-origin' : ''}">${isOrigin ? '⭐ Spawn (0, 0)' : `(${signedCoords.cx}, ${signedCoords.cy})`}</span>
                                                        <button type="button" class="btn-delete-chunk-block" data-row="${r}" data-col="${c}" title="Deletar este chunk do mapa">🗑️</button>
                                                    </div>
                                                    <div class="chunk-block-footer">
                                                        <span class="chunk-px-tag">${chunkSize}px</span>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')).join('')}
                                </div>

                                <!-- Botão de Expansão Leste (Direita - Coluna Inteira) -->
                                <button id="btn-expand-east" class="btn-chunk-expand btn-expand-v" title="Expandir Mapa para o Leste (Coluna Inteira à Direita)">
                                    <span class="expand-icon">➕</span>
                                    <span class="expand-label">Leste (Coluna)</span>
                                </button>
                            </div>

                            <!-- Botão de Expansão Sul (Base - Linha Inteira) -->
                            <div class="chunk-expand-row bottom">
                                <button id="btn-expand-south" class="btn-chunk-expand btn-expand-h" title="Expandir Mapa para o Sul (Linha Inteira na Base)">
                                    <span class="expand-icon">➕</span>
                                    <span class="expand-label">Expandir Sul (Linha Inteira)</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Detalhes e Textura do Bloco Selecionado -->
                    <div class="chunk-selection-details">
                        ${this.selectedCell ? (() => {
                            const sc = this.getSignedChunkCoords(this.selectedCell.row, this.selectedCell.col);
                            const minWx = sc.cx * chunkSize;
                            const maxWx = (sc.cx + 1) * chunkSize;
                            const minWy = sc.cy * chunkSize;
                            const maxWy = (sc.cy + 1) * chunkSize;
                            const isOrigin = sc.cx === 0 && sc.cy === 0;

                            return `
                            <div class="selected-chunk-header">
                                <div>
                                    <h4>Bloco Selecionado: <span>Chunk (${sc.cx}, ${sc.cy})</span> ${isOrigin ? '<span class="badge-origin-highlight">⭐ Spawn / Origem</span>' : ''}</h4>
                                    <span class="chunk-world-coords">Mundo: [${minWx}..${maxWx}, ${minWy}..${maxWy}] px (Grid: ${this.selectedCell.col}, ${this.selectedCell.row})</span>
                                </div>
                                <div class="chunk-selected-controls">
                                    <button id="btn-del-selected-chunk" class="btn-action-small danger" title="Deletar este chunk do mapa">🗑️ Deletar Chunk</button>
                                    <button id="btn-del-selected-col" class="btn-action-small danger" title="Excluir coluna inteira deste chunk">Excluir Col ${this.selectedCell.col}</button>
                                    <button id="btn-del-selected-row" class="btn-action-small danger" title="Excluir linha inteira deste chunk">Excluir Lin ${this.selectedCell.row}</button>
                                </div>
                            </div>

                            <div class="texture-selector-container">
                                <div class="chunk-bg-selection-card">
                                    <label class="prop-label">Imagem de Fundo do Chunk (Path):</label>
                                    <div class="chunk-path-input-group">
                                        <input type="text" id="input-custom-chunk-url" class="prop-input chunk-path-input" 
                                               placeholder="Selecione uma imagem ou digite o caminho..." 
                                               value="${this.cellPaths.get(`${this.selectedCell.row},${this.selectedCell.col}`) || chunks[this.selectedCell.row]?.[this.selectedCell.col] || ''}">
                                        <input type="file" id="input-chunk-file-hidden" accept="image/png,image/jpeg,image/webp,image/jpg" style="display: none;">
                                        <button type="button" id="btn-browse-chunk-file" class="btn-primary-highlight" title="Selecionar imagem do computador (pega o path e imagem)">
                                             <span>📁</span> Selecionar Imagem...
                                        </button>
                                        <button type="button" id="btn-apply-custom-bg" class="btn-secondary" title="Aplicar caminho digitado">
                                            <span>✔️</span> Aplicar Path
                                        </button>
                                        <button type="button" id="btn-clear-chunk-bg" class="btn-danger" title="Limpar apenas a imagem de fundo deste bloco mantendo o chunk">
                                            <span>🧹</span> Limpar Fundo
                                        </button>
                                    </div>

                                    ${(chunks[this.selectedCell.row]?.[this.selectedCell.col] || this.cellPaths.get(`${this.selectedCell.row},${this.selectedCell.col}`)) ? `
                                        <div class="chunk-current-path-display">
                                            <span class="path-badge">Path Atual:</span>
                                            <code class="path-code" title="${this.cellPaths.get(`${this.selectedCell.row},${this.selectedCell.col}`) || chunks[this.selectedCell.row]?.[this.selectedCell.col]}">${this.cellPaths.get(`${this.selectedCell.row},${this.selectedCell.col}`) || chunks[this.selectedCell.row]?.[this.selectedCell.col]}</code>
                                        </div>
                                    ` : ''}
                                </div>

                                <label class="prop-label" style="margin-top: 10px; margin-bottom: 6px;">Ou escolha uma textura da biblioteca:</label>
                                <div class="texture-options-grid">
                                    ${availableTextures.map((tex, tIdx) => {
                                        const isCurrent = (chunks[this.selectedCell!.row]?.[this.selectedCell!.col] === tex.url) ||
                                                          (this.cellPaths.get(`${this.selectedCell!.row},${this.selectedCell!.col}`) === tex.path);
                                        return `
                                            <button type="button" class="texture-option-btn ${isCurrent ? 'active' : ''}" data-tex-idx="${tIdx}" title="Path: ${tex.path}">
                                                <img src="${tex.url}" alt="${tex.label}" />
                                                <div class="texture-option-info">
                                                    <span class="texture-label">${tex.label}</span>
                                                    <span class="texture-path-hint">${tex.fileName}</span>
                                                </div>
                                            </button>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                            `;
                        })() : (() => {
                            const origin = this.getOriginChunk();
                            const b = this.mapConfig.worldBounds || {
                                minX: -origin.cx * chunkSize,
                                minY: -origin.cy * chunkSize,
                                maxX: (cols - origin.cx) * chunkSize,
                                maxY: (rows - origin.cy) * chunkSize
                            };
                            return `
                            <div class="chunk-hint-empty">
                                <div class="chunk-hint-icon">🗺️</div>
                                <h4>Visão Geral dos Chunks</h4>
                                <p>Clique em qualquer bloco na grade ao lado para selecionar sua imagem de fundo, editar o path ou remover o chunk.</p>
                                <div class="chunk-map-stats-summary">
                                    <div class="chunk-stat-item">
                                        <span class="stat-label">Origem Central (0, 0):</span>
                                        <span class="stat-val"><strong>Chunk [col: ${origin.cx}, lin: ${origin.cy}]</strong></span>
                                    </div>
                                    <div class="chunk-stat-item">
                                        <span class="stat-label">Limites do Mundo:</span>
                                        <span class="stat-val"><strong>[${b.minX}..${b.maxX}, ${b.minY}..${b.maxY}]</strong> px</span>
                                    </div>
                                    <div class="chunk-stat-item">
                                        <span class="stat-label">Matriz de Chunks:</span>
                                        <span class="stat-val"><strong>${cols}</strong> colunas x <strong>${rows}</strong> linhas</span>
                                    </div>
                                    <div class="chunk-stat-item">
                                        <span class="stat-label">Tamanho por Chunk:</span>
                                        <span class="stat-val"><strong>${chunkSize}px</strong></span>
                                    </div>
                                    <div class="chunk-stat-item">
                                        <span class="stat-label">Dimensões Totais:</span>
                                        <span class="stat-val"><strong>${cols * chunkSize} x ${rows * chunkSize}px</strong></span>
                                    </div>
                                    <div class="chunk-stat-item">
                                        <span class="stat-label">Total de Chunks:</span>
                                        <span class="stat-val"><strong>${cols * rows}</strong> blocos</span>
                                    </div>
                                </div>
                            </div>
                            `;
                        })()}
                    </div>
                </div>
            </div>
        `;
    }

    private renderInnerMapsTab(innerMaps: any[]): string {
        const placed = this.placedAssetsProvider ? this.placedAssetsProvider() : [];
        const portalAssets = placed.filter(a => a.isPortal || a.presetId.includes('portal'));

        return `
            <div class="innermaps-manager-body">
                <!-- Seção 1: Resumo e PortalLinks Posicionados no Mapa Atual -->
                <div class="innermaps-summary-bar">
                    <div class="summary-info">
                        <span class="summary-badge">Mundo Atual: <b>${this.mapConfig.name}</b> (<code>${this.mapConfig.id}</code>)</span>
                        <span class="summary-hint">InnerMaps são interiores ou salas conectadas por PortalLinks com double-bind automático.</span>
                    </div>
                </div>

                ${portalAssets.length > 0 ? `
                <div class="innermap-active-portals-box">
                    <h4 class="box-title">🌀 PortalLinks Posicionados Neste Mapa (${portalAssets.length})</h4>
                    <div class="active-portals-grid">
                        ${portalAssets.map(p => `
                            <div class="portal-chip">
                                <span class="chip-name">📍 ${p.name}</span>
                                <span class="chip-pos">(${Math.round(p.x)}, ${Math.round(p.y)})</span>
                                <span class="chip-arrow">➔</span>
                                <span class="chip-target"><code>${p.targetMapId || 'interior_black_default'}</code></span>
                                <button type="button" class="btn-chip-open-target" data-target="${p.targetMapId || 'interior_black_default'}" title="Abrir InnerMap no Editor">
                                    🗺️ Abrir
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Seção 2: Criação Rápida de Novo InnerMap -->
                <div class="create-innermap-panel">
                    <h4 class="panel-title">✨ Criar Novo InnerMap (Derivado de <code>${this.mapConfig.id}</code>)</h4>
                    <div class="create-innermap-form">
                        <div class="create-field">
                            <label>ID do InnerMap:</label>
                            <input type="text" id="new-innermap-id" class="prop-input" placeholder="ex: interior_padaria" value="interior_${this.mapConfig.id}_sala">
                        </div>
                        <div class="create-field">
                            <label>Nome Amigável:</label>
                            <input type="text" id="new-innermap-name" class="prop-input" placeholder="ex: Padaria de Vilgem" value="Interior Sala">
                        </div>
                        <div class="create-field-small">
                            <label>Largura (px):</label>
                            <input type="number" id="new-innermap-w" class="prop-input" value="1024" step="128">
                        </div>
                        <div class="create-field-small">
                            <label>Altura (px):</label>
                            <input type="number" id="new-innermap-h" class="prop-input" value="1024" step="128">
                        </div>
                        <div class="create-field-color">
                            <label>Fundo:</label>
                            <input type="color" id="new-innermap-color" value="#000000">
                        </div>
                        <button type="button" id="btn-create-innermap-action" class="btn-primary-highlight">
                            ➕ Criar InnerMap & Double-Bind
                        </button>
                    </div>
                    <p class="create-innermap-note">
                        🔒 <b>Double-Bind Automático</b>: Este InnerMap terá <code>parentWorldId: "${this.mapConfig.id}"</code> e receberá automaticamente um portal de retorno configurado para retornar a este mundo com segurança.
                    </p>
                </div>

                <!-- Seção 3: Catálogo de InnerMaps -->
                <div class="innermaps-catalog-section">
                    <h4 class="catalog-title">🚪 Catálogo de InnerMaps (${innerMaps.length})</h4>
                    <div class="innermaps-cards-grid">
                        ${innerMaps.map(m => {
                            const isChildOfCurrent = m.parentWorldId === this.mapConfig.id;
                            const isCurrentMap = m.id === this.mapConfig.id;
                            const portalCount = m.portals?.length || 0;
                            const sceneryCount = m.scenery?.length || 0;

                            return `
                                <div class="innermap-card ${isCurrentMap ? 'is-current' : ''}">
                                    <div class="innermap-card-thumb" style="background-color: ${m.backgroundColor || '#000000'};">
                                        <div class="innermap-thumb-overlay">
                                            <span class="thumb-dim">${m.width}x${m.height}px</span>
                                        </div>
                                    </div>
                                    <div class="innermap-card-info">
                                        <div class="innermap-card-header">
                                            <h5 class="innermap-name">${m.name || m.id}</h5>
                                            <span class="badge-parent ${isChildOfCurrent ? 'highlight' : ''}">${m.parentWorldId}</span>
                                        </div>
                                        <code class="innermap-id-tag">${m.id}</code>
                                        <div class="innermap-stats-row">
                                            <span>🌀 Portais: <b>${portalCount}</b></span>
                                            <span>🖼️ Assets: <b>${sceneryCount}</b></span>
                                        </div>
                                        <div class="innermap-card-actions">
                                            <button type="button" class="btn-open-innermap" data-inner-id="${m.id}" ${isCurrentMap ? 'disabled' : ''}>
                                                ${isCurrentMap ? '✓ Ativo no Editor' : '🗺️ Abrir no Editor'}
                                            </button>
                                            ${m.id !== 'interior_black_default' && !isCurrentMap ? `
                                            <button type="button" class="btn-delete-innermap" data-inner-id="${m.id}" title="Excluir este InnerMap">
                                                🗑️
                                            </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    private bindEvents(): void {
        if (!this.modalElement) return;

        // Fechar
        this.modalElement.querySelector('#btn-close-chunk-modal')?.addEventListener('click', () => this.close());
        this.modalElement.querySelector('#btn-chunk-modal-close')?.addEventListener('click', () => this.close());

        // Alternância de Abas
        this.modalElement.querySelector('#tab-btn-chunks')?.addEventListener('click', () => {
            this.activeTab = 'chunks';
            this.render();
        });
        this.modalElement.querySelector('#tab-btn-innermaps')?.addEventListener('click', () => {
            this.activeTab = 'innermaps';
            this.render();
        });

        if (this.activeTab === 'innermaps') {
            this.bindInnerMapsEvents();
            return;
        }

        // Se for InnerMap na aba chunks, vincula controles de cor de fundo
        const colorPicker = this.modalElement.querySelector('#innermap-bg-color-picker') as HTMLInputElement;
        const colorHex = this.modalElement.querySelector('#innermap-bg-hex-input') as HTMLInputElement;
        if (colorPicker && colorHex) {
            const updateBg = (colorVal: string) => {
                this.mapConfig.backgroundColor = colorVal;
                colorPicker.value = colorVal;
                colorHex.value = colorVal;
                this.onMapUpdated(this.mapConfig);
                InnerMapManager.getInstance().updateInnerMap(this.mapConfig.id, { backgroundColor: colorVal });
            };
            colorPicker.addEventListener('input', () => updateBg(colorPicker.value));
            colorHex.addEventListener('change', () => updateBg(colorHex.value));
        }

        // Botões Direcionais de Expansão (4 direções nos cantos/bordas)
        this.modalElement.querySelector('#btn-expand-north')?.addEventListener('click', () => this.expandNorth());
        this.modalElement.querySelector('#btn-expand-south')?.addEventListener('click', () => this.expandSouth());
        this.modalElement.querySelector('#btn-expand-west')?.addEventListener('click', () => this.expandWest());
        this.modalElement.querySelector('#btn-expand-east')?.addEventListener('click', () => this.expandEast());

        // Preencher tudo
        this.modalElement.querySelector('#btn-fill-all-grass')?.addEventListener('click', () => this.fillAll(ChunkManagerModal.DEFAULT_GROUND));

        // Seleção de Célula
        const cards = this.modalElement.querySelectorAll('.chunk-block-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Não dispara seleção se clicou no botão de delete individual
                if ((e.target as HTMLElement).closest('.btn-delete-chunk-block')) return;
                const r = parseInt(card.getAttribute('data-row') || '0', 10);
                const c = parseInt(card.getAttribute('data-col') || '0', 10);
                this.selectedCell = { row: r, col: c };
                this.render();
            });
        });

        // Botões de Aresta Individuais (➕ em qualquer lado sem chunk)
        const edgeBtns = this.modalElement.querySelectorAll('.btn-chunk-edge-add');
        edgeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const edge = btn.getAttribute('data-edge') as 'north' | 'south' | 'west' | 'east';
                const r = parseInt(btn.getAttribute('data-row') || '0', 10);
                const c = parseInt(btn.getAttribute('data-col') || '0', 10);
                this.addChunkAtEdge(r, c, edge);
            });
        });

        // Botão para criar chunk pontual em slot vazio existente
        const createSlotBtns = this.modalElement.querySelectorAll('.btn-create-chunk-slot');
        createSlotBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const r = parseInt(btn.getAttribute('data-row') || '0', 10);
                const c = parseInt(btn.getAttribute('data-col') || '0', 10);
                this.createChunkAt(r, c);
            });
        });

        // Botão de Deletar Bloco Individual (lixeira no canto do bloco) -> Deleta o chunk do mapa
        const deleteBtns = this.modalElement.querySelectorAll('.btn-delete-chunk-block');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const r = parseInt(btn.getAttribute('data-row') || '0', 10);
                const c = parseInt(btn.getAttribute('data-col') || '0', 10);
                this.deleteChunk(r, c);
            });
        });

        // Deletar o Chunk Selecionado diretamente pelo cabeçalho
        this.modalElement.querySelector('#btn-del-selected-chunk')?.addEventListener('click', () => {
            if (this.selectedCell) {
                this.deleteChunk(this.selectedCell.row, this.selectedCell.col);
            }
        });

        // Excluir Coluna ou Linha do Bloco Selecionado
        this.modalElement.querySelector('#btn-del-selected-col')?.addEventListener('click', () => {
            if (this.selectedCell) {
                this.deleteSpecificColumn(this.selectedCell.col);
            }
        });

        this.modalElement.querySelector('#btn-del-selected-row')?.addEventListener('click', () => {
            if (this.selectedCell) {
                this.deleteSpecificRow(this.selectedCell.row);
            }
        });

        // Botão de Selecionar Imagem (Arquivo Local do Computador)
        const btnBrowse = this.modalElement.querySelector('#btn-browse-chunk-file');
        const fileInput = this.modalElement.querySelector('#input-chunk-file-hidden') as HTMLInputElement;
        btnBrowse?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', () => {
            const file = fileInput.files?.[0];
            if (file && this.selectedCell) {
                const suggestedPath = `assets/maps/${this.mapConfig.id}/${file.name}`;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const dataUrl = ev.target?.result as string;
                    if (this.selectedCell) {
                        let finalUrl = dataUrl;
                        try {
                            const res = await fetch(`/api/assets-adapter?target=save-chunk-image&mapId=${encodeURIComponent(this.mapConfig.id)}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    mapId: this.mapConfig.id,
                                    row: this.selectedCell.row,
                                    col: this.selectedCell.col,
                                    dataUrl,
                                    fileName: file.name
                                })
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.url) finalUrl = data.url;
                            }
                        } catch {}
                        this.setChunkBackground(this.selectedCell.row, this.selectedCell.col, finalUrl, suggestedPath);
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Aplicação de Textura da Galeria do Projeto
        const availableTextures = this.getAvailableTextures();
        const texBtns = this.modalElement.querySelectorAll('.texture-option-btn');
        texBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-tex-idx') || '0', 10);
                const tex = availableTextures[idx];
                if (tex && this.selectedCell) {
                    this.setChunkBackground(this.selectedCell.row, this.selectedCell.col, tex.url, tex.path);
                }
            });
        });

        // Aplicação de Path Customizado via input
        this.modalElement.querySelector('#btn-apply-custom-bg')?.addEventListener('click', () => {
            const input = this.modalElement?.querySelector('#input-custom-chunk-url') as HTMLInputElement;
            if (input && this.selectedCell) {
                const rawPath = input.value.trim();
                const resolved = this.resolveTextureUrl(rawPath);
                this.setChunkBackground(this.selectedCell.row, this.selectedCell.col, resolved, rawPath);
            }
        });

        // Limpar fundo do chunk selecionado (mantendo o chunk existente)
        this.modalElement.querySelector('#btn-clear-chunk-bg')?.addEventListener('click', () => {
            if (this.selectedCell) {
                this.setChunkBackground(this.selectedCell.row, this.selectedCell.col, '');
            }
        });
    }

    private bindInnerMapsEvents(): void {
        if (!this.modalElement) return;

        const innerMgr = InnerMapManager.getInstance();

        // 1. Botão nos chips de portais ativos para abrir o mapa de destino
        this.modalElement.querySelectorAll('.btn-chip-open-target').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                if (!targetId) return;
                const innerDef = innerMgr.getInnerMap(targetId);
                if (innerDef) {
                    this.close();
                    this.onOpenMap?.(innerMgr.toSelectedMapConfig(innerDef));
                } else if (targetId === 'vilgem' || targetId === 'alun' || targetId === 'cemii') {
                    this.close();
                    this.onOpenMap?.({
                        id: targetId,
                        name: targetId === 'vilgem' ? 'Alvorada de Vilgem' : targetId,
                        width: targetId === 'vilgem' ? 3072 : 4000,
                        height: targetId === 'vilgem' ? 4096 : 4000,
                        chunkSize: targetId === 'vilgem' ? 1024 : 1000,
                        description: `Mundo ${targetId}`
                    });
                } else {
                    ConfirmationModal.alert(`O mapa "${targetId}" ainda não foi criado.`);
                }
            });
        });

        // 2. Botão nos cards de InnerMap para abrir no Editor
        this.modalElement.querySelectorAll('.btn-open-innermap').forEach(btn => {
            btn.addEventListener('click', () => {
                const innerId = btn.getAttribute('data-inner-id');
                if (!innerId) return;
                const innerDef = innerMgr.getInnerMap(innerId);
                if (innerDef) {
                    this.close();
                    this.onOpenMap?.(innerMgr.toSelectedMapConfig(innerDef));
                }
            });
        });

        // 3. Botão para Excluir InnerMap
        this.modalElement.querySelectorAll('.btn-delete-innermap').forEach(btn => {
            btn.addEventListener('click', async () => {
                const innerId = btn.getAttribute('data-inner-id');
                if (!innerId) return;
                if (innerId === 'interior_black_default') {
                    ConfirmationModal.alert('O InnerMap padrão interior_black_default não pode ser excluído.');
                    return;
                }
                const confirmed = await ConfirmationModal.confirm({
                    title: 'Excluir InnerMap',
                    message: `Tem certeza de que deseja excluir o InnerMap "${innerId}"?`,
                    confirmText: 'Excluir',
                    cancelText: 'Cancelar',
                    variant: 'danger'
                });
                if (confirmed) {
                    await innerMgr.deleteInnerMap(innerId);
                    this.render();
                }
            });
        });

        // 4. Criação de Novo InnerMap com Double-Bind
        this.modalElement.querySelector('#btn-create-innermap-action')?.addEventListener('click', async () => {
            const idInput = this.modalElement?.querySelector('#new-innermap-id') as HTMLInputElement;
            const nameInput = this.modalElement?.querySelector('#new-innermap-name') as HTMLInputElement;
            const wInput = this.modalElement?.querySelector('#new-innermap-w') as HTMLInputElement;
            const hInput = this.modalElement?.querySelector('#new-innermap-h') as HTMLInputElement;
            const colorInput = this.modalElement?.querySelector('#new-innermap-color') as HTMLInputElement;

            let id = idInput?.value.trim() || '';
            if (!id || id === 'interior_') {
                id = `interior_${this.mapConfig.id}_${Date.now()}`;
            }
            // Sanitiza id para identificador seguro
            id = id.toLowerCase().replace(/[^a-z0-9_]/g, '_');

            const name = nameInput?.value.trim() || id;
            const width = Math.max(512, Number(wInput?.value || 1024));
            const height = Math.max(512, Number(hInput?.value || 1024));
            const backgroundColor = colorInput?.value || '#000000';

            const newInner = await innerMgr.createInnerMap({
                id,
                name,
                parentWorldId: this.mapConfig.id,
                width,
                height,
                backgroundColor,
                returnPortalCoords: this.mapConfig.id === 'vilgem' ? { x: 1536, y: 1615 } : { x: 500, y: 500 }
            });

            const openNow = await ConfirmationModal.confirm({
                title: 'InnerMap Criado',
                message: `InnerMap "${newInner.name}" (${newInner.id}) criado com sucesso com Double-Bind para ${this.mapConfig.id}!\n\nDeseja abrir este novo InnerMap no Editor agora?`,
                confirmText: 'Abrir no Editor',
                cancelText: 'Permanecer',
                variant: 'success'
            });

            if (openNow) {
                this.close();
                this.onOpenMap?.(innerMgr.toSelectedMapConfig(newInner));
            } else {
                this.render();
            }
        });
    }

    /**
     * Expande para o Norte (adiciona uma linha inteira no topo)
     */
    public expandNorth(): void {
        const chunks = this.mapConfig.chunks || [];
        const cols = chunks[0]?.length || 3;
        const newRow = Array.from({ length: cols }, () => ChunkManagerModal.DEFAULT_GROUND);
        chunks.unshift(newRow);
        this.shiftCellPaths(1, 0);
        this.shiftPlacedAssets(0, 1);
        this.getOriginChunk().cy += 1;
        if (this.selectedCell) {
            this.selectedCell.row++;
        }
        this.saveAndNotify();
        this.render();
    }

    /**
     * Expande para o Sul (adiciona uma linha inteira na base)
     */
    public expandSouth(): void {
        const chunks = this.mapConfig.chunks || [];
        const cols = chunks[0]?.length || 3;
        const newRow = Array.from({ length: cols }, () => ChunkManagerModal.DEFAULT_GROUND);
        chunks.push(newRow);
        this.saveAndNotify();
        this.render();
    }

    /**
     * Expande para o Oeste (adiciona uma coluna inteira à esquerda)
     */
    public expandWest(): void {
        const chunks = this.mapConfig.chunks || [];
        chunks.forEach(row => row.unshift(ChunkManagerModal.DEFAULT_GROUND));
        this.shiftCellPaths(0, 1);
        this.shiftPlacedAssets(1, 0);
        this.getOriginChunk().cx += 1;
        if (this.selectedCell) {
            this.selectedCell.col++;
        }
        this.saveAndNotify();
        this.render();
    }

    /**
     * Expande para o Leste (adiciona uma coluna inteira à direita)
     */
    public expandEast(): void {
        const chunks = this.mapConfig.chunks || [];
        chunks.forEach(row => row.push(ChunkManagerModal.DEFAULT_GROUND));
        this.saveAndNotify();
        this.render();
    }

    /**
     * Cria ou ativa um único chunk pontual na posição especificada da matriz.
     */
    public createChunkAt(row: number, col: number, bgUrl: string = ChunkManagerModal.DEFAULT_GROUND): void {
        const chunks = this.mapConfig.chunks || [];
        if (chunks[row] && chunks[row]![col] !== undefined) {
            chunks[row]![col] = bgUrl;
            this.selectedCell = { row, col };
            this.saveAndNotify();
            this.render();
        }
    }

    /**
     * Adiciona um novo chunk em uma aresta livre de um bloco existente (Norte, Sul, Oeste ou Leste)
     * Cria APENAS UM CHUNK na direção selecionada, sem preencher a linha ou coluna inteira.
     */
    public addChunkAtEdge(row: number, col: number, edge: 'north' | 'south' | 'west' | 'east'): void {
        const chunks = this.mapConfig.chunks || [];
        const rows = chunks.length;
        const cols = chunks[0]?.length || 0;

        if (rows === 0 || cols === 0) {
            this.mapConfig.chunks = [[ChunkManagerModal.DEFAULT_GROUND]];
            this.mapConfig.originChunk = { cx: 0, cy: 0 };
            this.selectedCell = { row: 0, col: 0 };
            this.saveAndNotify();
            this.render();
            return;
        }

        switch (edge) {
            case 'north':
                if (row === 0) {
                    // Adiciona uma nova linha no topo onde APENAS a coluna 'col' tem chunk
                    const newRow = Array.from({ length: cols }, (_, i) => i === col ? ChunkManagerModal.DEFAULT_GROUND : '');
                    chunks.unshift(newRow);
                    this.shiftCellPaths(1, 0);
                    this.shiftPlacedAssets(0, 1);
                    this.getOriginChunk().cy += 1;
                    this.selectedCell = { row: 0, col };
                } else {
                    chunks[row - 1]![col] = ChunkManagerModal.DEFAULT_GROUND;
                    this.selectedCell = { row: row - 1, col };
                }
                break;

            case 'south':
                if (row === rows - 1) {
                    // Adiciona uma nova linha na base onde APENAS a coluna 'col' tem chunk
                    const newRow = Array.from({ length: cols }, (_, i) => i === col ? ChunkManagerModal.DEFAULT_GROUND : '');
                    chunks.push(newRow);
                    this.selectedCell = { row: rows, col };
                } else {
                    chunks[row + 1]![col] = ChunkManagerModal.DEFAULT_GROUND;
                    this.selectedCell = { row: row + 1, col };
                }
                break;

            case 'west':
                if (col === 0) {
                    // Adiciona uma coluna à esquerda onde APENAS a linha 'row' tem chunk
                    for (let r = 0; r < rows; r++) {
                        chunks[r]!.unshift(r === row ? ChunkManagerModal.DEFAULT_GROUND : '');
                    }
                    this.shiftCellPaths(0, 1);
                    this.shiftPlacedAssets(1, 0);
                    this.getOriginChunk().cx += 1;
                    this.selectedCell = { row, col: 0 };
                } else {
                    chunks[row]![col - 1] = ChunkManagerModal.DEFAULT_GROUND;
                    this.selectedCell = { row, col: col - 1 };
                }
                break;

            case 'east':
                if (col === cols - 1) {
                    // Adiciona uma coluna à direita onde APENAS a linha 'row' tem chunk
                    for (let r = 0; r < rows; r++) {
                        chunks[r]!.push(r === row ? ChunkManagerModal.DEFAULT_GROUND : '');
                    }
                    this.selectedCell = { row, col: cols };
                } else {
                    chunks[row]![col + 1] = ChunkManagerModal.DEFAULT_GROUND;
                    this.selectedCell = { row, col: col + 1 };
                }
                break;
        }

        this.saveAndNotify();
        this.render();
    }

    /**
     * Deleta o chunk especificado do mapa pontualmente:
     * 1. Remove a imagem e o chunk da célula (row, col) definindo-a como vazia ('').
     * 2. Remove o caminho mapeado do cellPaths.
     * 3. Trima bordas externas (linhas ou colunas das extremidades) se ficarem totalmente vazias.
     */
    public deleteChunk(row: number, col: number): void {
        const chunks = this.mapConfig.chunks || [];
        if (!chunks[row] || chunks[row]![col] === undefined) {
            return;
        }

        // Limpa o chunk específico
        chunks[row]![col] = '';
        this.cellPaths.delete(`${row},${col}`);

        if (this.selectedCell?.row === row && this.selectedCell?.col === col) {
            this.selectedCell = null;
        }

        // Realiza o trim de bordas externas totalmente vazias (Norte, Sul, Oeste, Leste)
        this.trimEmptyOuterBorders();

        this.saveAndNotify();
        this.render();
    }

    /**
     * Trima linhas ou colunas externas da matriz que estejam 100% vazias,
     * ajustando adequadamente o posicionamento das células e caminhos mapeados.
     */
    public trimEmptyOuterBorders(): void {
        const chunks = this.mapConfig.chunks || [];
        if (!chunks.length) return;

        let trimmed = true;
        while (trimmed) {
            trimmed = false;
            const rows = chunks.length;
            const cols = chunks[0]?.length || 0;

            if (rows <= 1 && cols <= 1) break;

            // 1. Trima Linha do Topo (Norte) se 100% vazia
            if (rows > 1 && chunks[0]!.every(c => !c || c.trim() === '')) {
                chunks.shift();
                this.shiftCellPaths(-1, 0);
                this.shiftPlacedAssets(0, -1);
                this.getOriginChunk().cy = Math.max(0, this.getOriginChunk().cy - 1);
                if (this.selectedCell) {
                    this.selectedCell.row--;
                }
                trimmed = true;
                continue;
            }

            // 2. Trima Linha da Base (Sul) se 100% vazia
            if (rows > 1 && chunks[rows - 1]!.every(c => !c || c.trim() === '')) {
                chunks.pop();
                trimmed = true;
                continue;
            }

            // 3. Trima Coluna da Esquerda (Oeste) se 100% vazia
            if (cols > 1 && chunks.every(row => !row[0] || row[0]!.trim() === '')) {
                chunks.forEach(row => row.shift());
                this.shiftCellPaths(0, -1);
                this.shiftPlacedAssets(-1, 0);
                this.getOriginChunk().cx = Math.max(0, this.getOriginChunk().cx - 1);
                if (this.selectedCell) {
                    this.selectedCell.col--;
                }
                trimmed = true;
                continue;
            }

            // 4. Trima Coluna da Direita (Leste) se 100% vazia
            if (cols > 1 && chunks.every(row => !row[cols - 1] || row[cols - 1]!.trim() === '')) {
                chunks.forEach(row => row.pop());
                trimmed = true;
                continue;
            }
        }
    }

    public deleteOrClearChunk(row: number, col: number): void {
        this.deleteChunk(row, col);
    }

    /**
     * Remove uma coluna inteira específica
     */
    public deleteSpecificColumn(colIndex: number): void {
        const chunks = this.mapConfig.chunks || [];
        if (chunks[0] && chunks[0].length > 1) {
            chunks.forEach(row => {
                row.splice(colIndex, 1);
            });
            if (colIndex === 0) {
                this.shiftPlacedAssets(-1, 0);
                this.getOriginChunk().cx = Math.max(0, this.getOriginChunk().cx - 1);
            }
            const newMap = new Map<string, string>();
            for (const [key, value] of this.cellPaths.entries()) {
                const [rStr, cStr] = key.split(',');
                const r = parseInt(rStr || '0', 10);
                const c = parseInt(cStr || '0', 10);
                if (c === colIndex) continue;
                const newC = c > colIndex ? c - 1 : c;
                newMap.set(`${r},${newC}`, value);
            }
            this.cellPaths = newMap;
            if (this.selectedCell) {
                if (this.selectedCell.col === colIndex) {
                    this.selectedCell = null;
                } else if (this.selectedCell.col > colIndex) {
                    this.selectedCell.col--;
                }
            }
            this.saveAndNotify();
            this.render();
        }
    }

    /**
     * Remove uma linha inteira específica
     */
    public deleteSpecificRow(rowIndex: number): void {
        const chunks = this.mapConfig.chunks || [];
        if (chunks.length > 1) {
            chunks.splice(rowIndex, 1);
            if (rowIndex === 0) {
                this.shiftPlacedAssets(0, -1);
                this.getOriginChunk().cy = Math.max(0, this.getOriginChunk().cy - 1);
            }
            const newMap = new Map<string, string>();
            for (const [key, value] of this.cellPaths.entries()) {
                const [rStr, cStr] = key.split(',');
                const r = parseInt(rStr || '0', 10);
                const c = parseInt(cStr || '0', 10);
                if (r === rowIndex) continue;
                const newR = r > rowIndex ? r - 1 : r;
                newMap.set(`${newR},${c}`, value);
            }
            this.cellPaths = newMap;
            if (this.selectedCell) {
                if (this.selectedCell.row === rowIndex) {
                    this.selectedCell = null;
                } else if (this.selectedCell.row > rowIndex) {
                    this.selectedCell.row--;
                }
            }
            this.saveAndNotify();
            this.render();
        }
    }

    private shiftCellPaths(deltaRow: number, deltaCol: number): void {
        if (deltaRow === 0 && deltaCol === 0) return;
        const newMap = new Map<string, string>();
        for (const [key, value] of this.cellPaths.entries()) {
            const [rStr, cStr] = key.split(',');
            const r = parseInt(rStr || '0', 10) + deltaRow;
            const c = parseInt(cStr || '0', 10) + deltaCol;
            newMap.set(`${r},${c}`, value);
        }
        this.cellPaths = newMap;
    }

    /**
     * Em um mundo procedural onde as coordenadas mundiais partem do Spawn (0, 0)
     * e os chunks utilizam índices assinados relativos ao originChunk, as posições
     * mundiais dos assets já posicionados NUNCA devem ser alteradas na expansão.
     */
    private shiftPlacedAssets(deltaCols: number, deltaRows: number): void {
        // No-op: As coordenadas mundiais são absolutas e persistentes.
        return;
    }

    // Métodos legados mantidos para compatibilidade com outros componentes
    public addColumn(): void {
        this.expandEast();
    }

    public deleteColumn(): void {
        const chunks = this.mapConfig.chunks || [];
        if (chunks[0] && chunks[0].length > 1) {
            this.deleteSpecificColumn(chunks[0].length - 1);
        }
    }

    public addRow(): void {
        this.expandSouth();
    }

    public deleteRow(): void {
        const chunks = this.mapConfig.chunks || [];
        if (chunks.length > 1) {
            this.deleteSpecificRow(chunks.length - 1);
        }
    }

    public fillAll(bgUrl: string): void {
        const chunks = this.mapConfig.chunks || [];
        for (let r = 0; r < chunks.length; r++) {
            for (let c = 0; c < chunks[r]!.length; c++) {
                chunks[r]![c] = bgUrl;
            }
        }
        this.saveAndNotify();
        this.render();
    }

    public setChunkBackground(row: number, col: number, bgUrl: string, displayPath?: string): void {
        const chunks = this.mapConfig.chunks || [];
        if (chunks[row] && chunks[row]![col] !== undefined) {
            chunks[row]![col] = bgUrl;
            if (displayPath) {
                this.cellPaths.set(`${row},${col}`, displayPath);
            } else if (!bgUrl) {
                this.cellPaths.delete(`${row},${col}`);
            }
            this.saveAndNotify();
            this.render();
        }
    }

    private async saveAndNotify(): Promise<void> {
        const chunks = this.mapConfig.chunks || [];
        const rows = chunks.length;
        const cols = chunks[0]?.length || 0;
        const chunkSize = this.mapConfig.chunkSize || 1024;
        this.mapConfig.width = cols * chunkSize;
        this.mapConfig.height = rows * chunkSize;

        // Atualiza os limites do mundo e coordenadas assinadas relativas à origem central
        this.updateWorldBounds();

        // Notifica o aplicativo para atualizar canvas e mapa
        this.onMapUpdated({ ...this.mapConfig });

        // Se for um InnerMap, atualiza também no catálogo do InnerMapManager
        if (this.mapConfig.isInnerMap || InnerMapManager.getInstance().hasInnerMap(this.mapConfig.id)) {
            await InnerMapManager.getInstance().updateInnerMap(this.mapConfig.id, {
                chunks,
                width: this.mapConfig.width,
                height: this.mapConfig.height,
                backgroundColor: this.mapConfig.backgroundColor,
                originChunk: this.getOriginChunk()
            });
        }

        // Sincroniza dinamicamente com o disco (VisualConfigMap.ts e VilgemWorld.ts ou intermapsMap.json)
        await this.chunkSync.syncChunksToDisk(this.mapConfig.id, chunks, this.mapConfig.width, this.mapConfig.height, this.getOriginChunk());
    }
}
