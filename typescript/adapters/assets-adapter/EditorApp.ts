/**
 * @file EditorApp.ts
 * Ponto de entrada do assets-adapter.
 * Orquestra o Drawer de assets dinâmico, Canvas do mapa, Painel de Propriedades e Modais.
 */

import { AssetScanner } from "./Components/AssetScanner";
import { MapSelectorModal, type SelectedMapConfig } from "./Components/MapSelectorModal";
import { AssetDrawer } from "./Components/AssetDrawer";
import { MapCanvas } from "./Components/MapCanvas";
import { PropertiesPanel } from "./Components/PropertiesPanel";
import { SpriteDefinitionModal } from "./Components/SpriteDefinitionModal";
import { Exporter } from "./Components/Exporter";

import { PanelResizer } from "./Components/PanelResizer";
import { WorldCodeSync } from "./Components/WorldCodeSync";
import { ChunkManagerModal } from "./Components/ChunkManagerModal";
import { ChunkSync } from "./Components/ChunkSync";
import { VisualConfigMap, type MapVisualConfig } from "../web/shared/VisualConfigMap";
import { InnerMapManager } from "./Components/InnerMapManager";

export class EditorApp {
    private scanner: AssetScanner;
    private mapSelectorModal: MapSelectorModal;
    private chunkManagerModal: ChunkManagerModal;
    private drawer: AssetDrawer;
    private canvas: MapCanvas;
    private propertiesPanel: PropertiesPanel;
    private spriteDefModal: SpriteDefinitionModal;
    private exporter: Exporter;
    private panelResizer: PanelResizer;
    private codeSync: WorldCodeSync;
    private chunkSync: ChunkSync;

    private currentMap: SelectedMapConfig;

    constructor() {
        //? Higienização preventiva de localStorage contra corrupção de mundos raiz
        if (typeof localStorage !== 'undefined') {
            try {
                const rawIntermaps = localStorage.getItem('rpg_assets_adapter_intermaps');
                if (rawIntermaps) {
                    const parsed = JSON.parse(rawIntermaps);
                    let changed = false;
                    for (const rootId of ['vilgem', 'alun', 'cemii', 'blank_project']) {
                        if (parsed[rootId]) {
                            delete parsed[rootId];
                            changed = true;
                        }
                    }
                    if (changed) {
                        localStorage.setItem('rpg_assets_adapter_intermaps', JSON.stringify(parsed));
                    }
                }
                const vilgemChunks = localStorage.getItem('assets_adapter_chunks_vilgem');
                if (vilgemChunks) {
                    const parsed = JSON.parse(vilgemChunks);
                    if (parsed.width < 3072 || parsed.height < 4096 || !parsed.chunks || parsed.chunks.length < 4) {
                        localStorage.removeItem('assets_adapter_chunks_vilgem');
                    }
                }
            } catch { /* ignore */ }
        }

        this.scanner = new AssetScanner();
        this.exporter = new Exporter();
        this.codeSync = new WorldCodeSync();
        this.chunkSync = new ChunkSync();
        this.currentMap = this.initCurrentMap('vilgem');

        this.canvas = new MapCanvas(
            'canvas-container',
            this.currentMap,
            (selectedAsset) => {
                this.propertiesPanel.render();
            },
            () => {
                this.propertiesPanel.render();
                this.triggerAutoSave();
            }
        );
        this.canvas.getAssetDefinition = (id: string) => this.scanner.getAssetById(id);

        this.chunkManagerModal = new ChunkManagerModal(
            this.currentMap,
            (updatedMap) => {
                this.currentMap = updatedMap;
                this.canvas.changeMap(updatedMap);
                this.propertiesPanel.render();
                this.triggerAutoSave();
            },
            this.scanner,
            (mapToOpen) => this.openMapInEditor(mapToOpen),
            () => this.canvas.placedAssets
        );

        this.propertiesPanel = new PropertiesPanel(
            'properties-panel',
            this.canvas,
            () => this.exporter.open(this.currentMap, this.canvas.placedAssets),
            () => this.spriteDefModal.open(),
            () => this.mapSelectorModal.open(),
            () => this.chunkManagerModal.open(),
            (mapToOpen) => this.openMapInEditor(mapToOpen)
        );

        this.drawer = new AssetDrawer(
            this.scanner,
            (selectedAsset) => {
                (window as any).__draggedAssetData = selectedAsset;
                //? Atualiza a textura ativa do pincel de chunk ao selecionar asset de terreno ou estrada
                if (
                    this.canvas.isChunkBrushMode ||
                    selectedAsset.category === 'chunks' ||
                    selectedAsset.category === 'roads' ||
                    selectedAsset.category === 'water'
                ) {
                    this.canvas.setBrushTexture(selectedAsset.imageSrc, selectedAsset.name);
                    this.propertiesPanel.render();
                }
            }
        );

        this.panelResizer = new PanelResizer({
            drawerId: 'asset-drawer',
            drawerResizerId: 'drawer-resizer',
            propsPanelId: 'properties-panel',
            propsResizerId: 'props-resizer',
            onResize: () => {
                this.canvas.resize();
            }
        });

        this.spriteDefModal = new SpriteDefinitionModal(
            this.scanner,
            (newAsset) => {
                this.drawer.refresh();
                const centerWorld = this.canvas.screenToWorld(
                    this.canvas['canvas'].width / 2,
                    this.canvas['canvas'].height / 2
                );
                this.canvas.addAssetToMap(newAsset, Math.round(centerWorld.x), Math.round(centerWorld.y));
            }
        );

        this.mapSelectorModal = new MapSelectorModal(async (selectedMap) => {
            await this.openMapInEditor(selectedMap);
        });

        this.bindGlobalToolbarEvents();

        this.loadMapChunks(this.currentMap.id);
        this.loadWorldAssets(this.currentMap.id);
        this.updateTopBarTitle();
    }

    /**
     * Alterna o mapa ativo no editor para qualquer Mundo ou InnerMap.
     */
    public async openMapInEditor(mapConfig: SelectedMapConfig): Promise<void> {
        this.currentMap = mapConfig;
        await this.loadMapChunks(mapConfig.id);

        if (!this.currentMap.chunks || this.currentMap.chunks.length === 0) {
            const cols = Math.max(1, Math.round(this.currentMap.width / (this.currentMap.chunkSize || 1024)));
            const rows = Math.max(1, Math.round(this.currentMap.height / (this.currentMap.chunkSize || 1024)));
            this.currentMap.chunks = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '/assets/maps/vilgem/grass_seamless_base.png'));
        }

        this.canvas.changeMap(this.currentMap);
        this.chunkManagerModal.updateMapConfig(this.currentMap);

        await this.loadWorldAssets(mapConfig.id);
        this.propertiesPanel.render();
        this.updateTopBarTitle();
    }

    private updateTopBarTitle(): void {
        const titleBadge = document.querySelector('.top-navbar-title-badge');
        const headerTitle = document.querySelector('#top-navbar h1');
        if (headerTitle) {
            headerTitle.textContent = this.currentMap.isInnerMap 
                ? `Editor [InnerMap]: ${this.currentMap.name}` 
                : `Editor de Assets - ${this.currentMap.name}`;
        }
    }

    private initCurrentMap(mapId: string): SelectedMapConfig {
        const mapVisual = VisualConfigMap[mapId] as MapVisualConfig | undefined;
        let cached = this.chunkSync.getCachedChunks(mapId);

        if (mapId === 'vilgem' && cached && (cached.width < 3072 || cached.height < 4096 || cached.chunks.length < 4)) {
            try { localStorage.removeItem('assets_adapter_chunks_vilgem'); } catch {}
            cached = null;
        }

        let chunks = mapVisual?.chunks && mapVisual.chunks.length > 0
            ? mapVisual.chunks.map(r => [...r])
            : cached?.chunks;
        let width = chunks && chunks[0] ? chunks[0].length * (mapVisual?.chunkSize || 1024) : (cached?.width || (mapId === 'vilgem' ? 3072 : 1024));
        let height = chunks ? chunks.length * (mapVisual?.chunkSize || 1024) : (cached?.height || (mapId === 'vilgem' ? 4096 : 1024));

        const originChunk = cached?.originChunk
            || mapVisual?.originChunk
            || (mapId === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 });

        return {
            id: mapId,
            name: mapId === 'vilgem' ? 'Alvorada de Vilgem' : mapId,
            width: width || (mapId === 'vilgem' ? 3072 : 1024),
            height: height || (mapId === 'vilgem' ? 4096 : 1024),
            chunkSize: 1024,
            chunks: chunks,
            originChunk,
            description: 'Vila central medieval composta por 3x4 chunks dinâmicos de 1024px.'
        };
    }

    private async loadMapChunks(mapId: string): Promise<void> {
        if (mapId === 'blank_project') return;
        const result = await this.chunkSync.loadChunksFromDisk(mapId);
        if (result && result.chunks && result.chunks.length > 0) {
            this.currentMap.chunks = result.chunks;
            this.currentMap.width = result.width;
            this.currentMap.height = result.height;
            if (result.originChunk) {
                this.currentMap.originChunk = result.originChunk;
            } else if (!this.currentMap.originChunk) {
                const mapVisual = VisualConfigMap[mapId] as MapVisualConfig | undefined;
                this.currentMap.originChunk = mapVisual?.originChunk || (mapId === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 });
            }
            this.canvas.changeMap(this.currentMap);
            this.chunkManagerModal.updateMapConfig(this.currentMap);
            this.propertiesPanel.render();
        }
    }

    private lastSavedSceneryCode: string = '';

    private async loadWorldAssets(mapId: string): Promise<void> {
        if (mapId === 'blank_project') {
            this.canvas.setPlacedAssets([]);
            this.lastSavedSceneryCode = '';
            this.updateSyncBadge('saved', '🎨 Projeto em Branco (Modo Textura Fixa)');
            return;
        }

        const mapName = mapId === 'vilgem' ? 'VilgemWorld.ts' : mapId;
        this.updateSyncBadge('saving', `Carregando elementos de ${mapName}...`);
        const assets = await this.codeSync.loadWorldAssets(mapId, this.scanner, this.currentMap);
        this.canvas.setPlacedAssets(assets);
        this.lastSavedSceneryCode = this.codeSync.generateSceneryCode(assets, this.currentMap);
        this.updateSyncBadge('saved', `✓ Sincronizado (${assets.length} objetos em ${mapName})`);
    }

    private triggerAutoSave(): void {
        if (this.currentMap.id === 'blank_project') {
            //? Projeto em branco: compor e exportar imagem de fundo sem persistência de entidades
            this.updateSyncBadge('saved', `🎨 Textura Fixa pronta (${this.canvas.placedAssets.length} elementos)`);
            return;
        }

        const currentCode = this.codeSync.generateSceneryCode(this.canvas.placedAssets, this.currentMap);
        if (currentCode === this.lastSavedSceneryCode) {
            return;
        }

        //? Sincroniza Double-Bind automático para portais posicionados
        const portals = this.canvas.placedAssets.filter(a => a.isPortal || a.presetId.includes('portal'));
        for (const p of portals) {
            InnerMapManager.getInstance().syncDoubleBind(p, this.currentMap);
        }

        this.codeSync.autoSave(
            this.currentMap.id,
            this.canvas.placedAssets,
            this.currentMap,
            (status, msg) => {
                this.updateSyncBadge(status, msg);
                if (status === 'saved') {
                    this.lastSavedSceneryCode = currentCode;
                }
            }
        );
    }

    private updateSyncBadge(status: 'saving' | 'saved' | 'error', message?: string): void {
        const badge = document.getElementById('sync-status-badge');
        const text = document.getElementById('sync-status-text');
        if (!badge || !text) return;

        badge.className = `sync-status-badge ${status}`;
        text.textContent = message || (status === 'saved' ? '✓ Sincronizado com VilgemWorld.ts' : 'Salvando...');
    }

    private bindGlobalToolbarEvents(): void {
        const btnOpenSpriteModal = document.getElementById('btn-open-sprite-modal');
        btnOpenSpriteModal?.addEventListener('click', () => {
            this.spriteDefModal.open();
        });

        const btnExportQuick = document.getElementById('btn-quick-export');
        btnExportQuick?.addEventListener('click', () => {
            this.exporter.open(this.currentMap, this.canvas.placedAssets);
        });

        const btnChangeMapQuick = document.getElementById('btn-quick-change-map');
        btnChangeMapQuick?.addEventListener('click', () => {
            this.mapSelectorModal.open();
        });

        const btnManageChunks = document.getElementById('btn-manage-chunks');
        btnManageChunks?.addEventListener('click', () => {
            this.chunkManagerModal.open();
        });

        const btnExportImageQuick = document.getElementById('btn-quick-export-image');
        btnExportImageQuick?.addEventListener('click', () => {
            const defaultName = this.currentMap.id === 'blank_project'
                ? `chunk_ground_${this.currentMap.width}x${this.currentMap.height}`
                : `${this.currentMap.id}_ground_layer`;
            this.canvas.exportAsImage({
                fileName: defaultName,
                transparentBackground: false
            });
        });

        const btnToggleSnap = document.getElementById('btn-quick-toggle-snap');
        const snapText = document.getElementById('snap-status-text');
        btnToggleSnap?.addEventListener('click', () => {
            this.canvas.snapToGrid = !this.canvas.snapToGrid;
            if (this.canvas.snapToGrid) {
                this.canvas.showGrid = true;
            }
            if (snapText) {
                snapText.textContent = this.canvas.snapToGrid 
                    ? `Grid Snap: Ativo (${this.canvas.gridSize}px)` 
                    : 'Grid Snap: Desligado';
            }
            btnToggleSnap.classList.toggle('active', this.canvas.snapToGrid);
            this.canvas.render();
            this.propertiesPanel.render();
        });

        const btnToggleHitboxes = document.getElementById('btn-quick-toggle-hitboxes');
        const hitboxText = document.getElementById('hitbox-status-text');
        const updateHitboxButtonState = () => {
            if (hitboxText) {
                hitboxText.textContent = this.canvas.showHitboxes
                    ? 'Hitboxes (F2): Ativo'
                    : 'Hitboxes (F2): Off';
            }
            btnToggleHitboxes?.classList.toggle('active', this.canvas.showHitboxes);
        };

        btnToggleHitboxes?.addEventListener('click', () => {
            this.canvas.toggleHitboxes();
            updateHitboxButtonState();
        });

        const btnTogglePlayerRef = document.getElementById('btn-quick-toggle-player-ref');
        const playerRefText = document.getElementById('player-ref-text');
        const updatePlayerRefButtonState = () => {
            if (playerRefText) {
                playerRefText.textContent = this.canvas.showPlayerReference
                    ? 'Player Ref (P): On'
                    : 'Player Ref (P): Off';
            }
            btnTogglePlayerRef?.classList.toggle('active', this.canvas.showPlayerReference);
        };

        btnTogglePlayerRef?.addEventListener('click', () => {
            this.canvas.togglePlayerReference();
            updatePlayerRefButtonState();
        });

        const btnToggleStamp = document.getElementById('btn-quick-stamp-mode');
        const stampText = document.getElementById('stamp-status-text');
        const updateStampButtonState = () => {
            if (stampText) {
                stampText.textContent = this.canvas.isStampMode
                    ? 'Carimbo (B): Ativo'
                    : 'Carimbo (B): Off';
            }
            btnToggleStamp?.classList.toggle('active', this.canvas.isStampMode);
        };

        btnToggleStamp?.addEventListener('click', () => {
            this.canvas.toggleStampMode();
            updateStampButtonState();
        });

        this.canvas.onStampModeChanged = () => {
            updateStampButtonState();
            updateChunkBrushButtonState();
            this.propertiesPanel.render();
        };

        const btnToggleChunkBrush = document.getElementById('btn-quick-chunk-brush');
        const chunkBrushText = document.getElementById('chunk-brush-status-text');
        const updateChunkBrushButtonState = () => {
            if (chunkBrushText) {
                chunkBrushText.textContent = this.canvas.isChunkBrushMode
                    ? `Pincel Chunk (T): Ativo (${this.canvas.chunkBrushRadius}px)`
                    : 'Pincel Chunk (T): Off';
            }
            btnToggleChunkBrush?.classList.toggle('active', this.canvas.isChunkBrushMode);
        };

        btnToggleChunkBrush?.addEventListener('click', () => {
            this.canvas.toggleChunkBrushMode();
            updateChunkBrushButtonState();
            updateStampButtonState();
            this.propertiesPanel.render();
        });

        this.canvas.onChunkBrushModeChanged = () => {
            updateChunkBrushButtonState();
            updateStampButtonState();
            this.propertiesPanel.render();
        };

        window.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                updateHitboxButtonState();
            }
            if (e.key?.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !this.canvas.isTypingInInput()) {
                updatePlayerRefButtonState();
            }
            if (e.key?.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !this.canvas.isTypingInInput()) {
                updateStampButtonState();
                updateChunkBrushButtonState();
            }
            if (e.key?.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !this.canvas.isTypingInInput()) {
                updateChunkBrushButtonState();
                updateStampButtonState();
            }
            if ((e.key === '[' || e.key === ']' || e.key === 'Escape') && !this.canvas.isTypingInInput()) {
                updateChunkBrushButtonState();
                updateStampButtonState();
            }
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    (window as any).editorApp = new EditorApp();
});
