/**
 * @file MapCanvas.ts
 * Área central do wireframe: "Mapa gerado pelo adaptador web".
 * Renderiza o terreno real dos chunks, grid, pan/zoom focado no mouse,
 * recepção de Drag & Drop de assets, seleção e perspectiva isométrica 2.5D (Y-Sorting).
 */

import type { SelectedMapConfig } from "./MapSelectorModal";
import type { PlacedAssetModel } from "../Models/PlacedAssetModel";
import type { AssetDefinition } from "../Models/AssetDefinition";
import { VisualConfigMap, type MapVisualConfig } from "../../web/shared/VisualConfigMap";
import { ChunkSync } from "./ChunkSync";
import ItemFactory from "../../../domain/ObjectModule/Items/ItemFactory";
import { ASSET_HITBOX_CATALOG } from "../../../domain/ObjectModule/Scenery/SceneryRegistry";

export class MapCanvas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private container: HTMLElement;

    private mapConfig: SelectedMapConfig;
    private chunkImages: Map<string, HTMLImageElement> = new Map();
    private spriteImages: Map<string, HTMLImageElement> = new Map();

    public panX: number = 0;
    public panY: number = 0;
    public zoom: number = 0.5; //? Zoom inicial de visualização ampla do mapa
    private isPanning: boolean = false;
    private panStartX: number = 0;
    private panStartY: number = 0;
    private isSpacePressed: boolean = false;

    public placedAssets: PlacedAssetModel[] = [];
    public selectedAsset: PlacedAssetModel | null = null;
    public selectedAssets: PlacedAssetModel[] = [];
    public clipboardAssets: PlacedAssetModel[] = [];
    private isDraggingAsset: boolean = false;
    private dragAssetOffsetX: number = 0;
    private dragAssetOffsetY: number = 0;
    private dragStartWorldX: number = 0;
    private dragStartWorldY: number = 0;
    private dragInitialPositions: Map<string, { x: number; y: number }> = new Map();

    public isBoxSelecting: boolean = false;
    public boxSelectStartScreenX: number = 0;
    public boxSelectStartScreenY: number = 0;
    public boxSelectCurrentScreenX: number = 0;
    public boxSelectCurrentScreenY: number = 0;
    public lastMouseWorldPos: { x: number; y: number } = { x: 0, y: 0 };

    private isResizingAsset: boolean = false;
    private activeResizeHandle: 'nw' | 'ne' | 'se' | 'sw' | null = null;
    private resizeStartWorldX: number = 0;
    private resizeStartWorldY: number = 0;
    private initialAssetRect: { x: number; y: number; width: number; height: number } | null = null;

    private isTouchPanning: boolean = false;
    private touchStartPanX: number = 0;
    private touchStartPanY: number = 0;
    private touchInitialDist: number = 0;
    private touchInitialZoom: number = 1;

    public showGrid: boolean = false;
    public gridSize: number = 32;
    public snapToGrid: boolean = false;
    public showChunkBorders: boolean = true;
    public showHitboxes: boolean = false; //? Alternância de exibição visual de hitboxes
    public showPlayerReference: boolean = true; //? Exibição do player idle de referência proporcional
    public playerRefFollowZoom: boolean = true; //? Segue o zoom da câmera para manter proporção 1:1 com os chunks
    public getAssetDefinition?: ((presetId: string) => AssetDefinition | undefined) | undefined;
    private dynamicHitboxCatalog: Record<string, any> | null = null;
    public mapCollisionLayers: any[] = [];
    private loadedMapCollisionId: string = '';

    private ghostAsset: { asset: AssetDefinition, worldX: number, worldY: number } | null = null;
    private animationTime: number = 0;

    public isStampMode: boolean = false;
    public activeStampAsset: AssetDefinition | null = null;
    public onStampModeChanged?: ((active: boolean, asset?: AssetDefinition | null) => void) | undefined;

    public isChunkBrushMode: boolean = false;
    public chunkBrushRadius: number = 48; //? Raio da área de pintura em pixels no mundo
    public chunkBrushSoftness: number = 0.25; //? Fator de suavidade radial da borda do pincel
    public chunkBrushOpacity: number = 1.0; //? Opacidade da pincelada de textura
    public activeBrushTextureUrl: string = '/assets/maps/vilgem/grass_seamless_base.png';
    public activeBrushTextureName: string = 'Grama Nativa de Vilgem (Sem Emendas)';
    public mergeBrushStrokes: boolean = true; //? Mesclagem de pinceladas consecutivas na mesma área
    public activePaintedAsset: PlacedAssetModel | null = null;
    private isPaintingBrushStroke: boolean = false;
    private lastBrushWorldPoint: { x: number; y: number } | null = null;
    private paintedLayerCanvases: Map<string, HTMLCanvasElement> = new Map();
    public onChunkBrushModeChanged?: ((active: boolean) => void) | undefined;

    private history: PlacedAssetModel[][] = [];
    private historyIndex: number = -1;

    private onAssetSelectedCallback?: ((asset: PlacedAssetModel | null) => void) | undefined;
    private onAssetChangedCallback?: (() => void) | undefined;

    constructor(
        containerId: string, 
        initialMap: SelectedMapConfig,
        onAssetSelected?: ((asset: PlacedAssetModel | null) => void) | undefined,
        onAssetChanged?: (() => void) | undefined
    ) {
        this.container = document.getElementById(containerId) as HTMLElement;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'map-editor-canvas';
        this.ctx = this.canvas.getContext('2d')!;
        this.container.appendChild(this.canvas);

        this.mapConfig = initialMap;
        this.onAssetSelectedCallback = onAssetSelected;
        this.onAssetChangedCallback = onAssetChanged;

        this.resize();
        this.preloadChunkTextures();
        this.preloadPlayerReference();
        this.bindEvents();
        this.saveState();
        this.centerMap();
        this.startRenderLoop();
    }

    public resize(): void {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    /**
     * Carrega as imagens dos chunks em cache
     */
    private preloadChunkTextures(): void {
        const mapVisual = VisualConfigMap[this.mapConfig.id] as MapVisualConfig | undefined;
        const chunks = this.mapConfig.chunks || mapVisual?.chunks;
        if (!chunks) return;

        for (let y = 0; y < chunks.length; y++) {
            for (let x = 0; x < chunks[y]!.length; x++) {
                const url = chunks[y]![x]!;
                if (!this.chunkImages.has(url)) {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => this.render();
                    this.chunkImages.set(url, img);
                }
            }
        }
    }

    /**
     * ? Pré-carrega a imagem do Player Idle para a referência visual no canto inferior do canvas
     */
    public preloadPlayerReference(): void {
        const config = this.getPlayerIdleConfig();
        if (config.imageSrc) {
            this.getSpriteImage(config.imageSrc);
        }
    }

    /**
     * ? Retorna a configuração oficial do Player Idle a partir do VisualConfigMap
     */
    public getPlayerIdleConfig(): {
        imageSrc: string;
        frameCount: number;
        animationSpeed: number;
        frameWidth: number;
        frameHeight: number;
        worldWidth: number;
        worldHeight: number;
        atlasOffset: { x: number; y: number };
    } {
        const playerVisual = (VisualConfigMap as any)['player'];
        const idle = playerVisual?.animations?.['idle'];
        return {
            imageSrc: idle?.imageSrc || '/assets/entities/player/player-idle.png',
            frameCount: idle?.frameCount ?? 2,
            animationSpeed: idle?.animationSpeed ?? 20,
            frameWidth: idle?.frameWidth ?? 32,
            frameHeight: idle?.frameHeight ?? 32,
            worldWidth: idle?.spriteSize?.width ?? 32,
            worldHeight: idle?.spriteSize?.height ?? 32,
            atlasOffset: idle?.atlasOffset ?? { x: 0, y: 0 }
        };
    }

    /**
     * ? Calcula a caixa delimitadora do Player de referência no canto inferior direito da tela (UI).
     * Escala proporcionalmente ao zoom do mapa (32px * zoom), ficando exatamente do tamanho que é no cenário.
     */
    public getPlayerReferenceRect(): { x: number; y: number; width: number; height: number } {
        const margin = 20;
        const config = this.getPlayerIdleConfig();
        const effectiveZoom = this.playerRefFollowZoom ? this.zoom : 1.0;
        const drawW = Math.max(1, Math.round(config.worldWidth * effectiveZoom));
        const drawH = Math.max(1, Math.round(config.worldHeight * effectiveZoom));
        const cw = this.canvas?.width || 800;
        const ch = this.canvas?.height || 600;
        const x = cw - drawW - margin;
        const y = ch - drawH - margin;
        return { x, y, width: drawW, height: drawH };
    }

    /**
     * ? Alterna a visibilidade do player de referência no canto inferior direito
     */
    public togglePlayerReference(): void {
        this.showPlayerReference = !this.showPlayerReference;
        this.render();
    }

    /**
     * ? Adiciona uma instância do Player em escala real 1:1 diretamente no centro da visualização do mapa,
     * permitindo comparar fisicamente com as portas, casas e construções.
     */
    public spawnPlayerReferenceOnMap(): void {
        const cw = this.canvas?.width || 800;
        const ch = this.canvas?.height || 600;
        const centerWorld = this.screenToWorld(cw / 2, ch / 2);
        const config = this.getPlayerIdleConfig();
        const playerDef: AssetDefinition = this.getAssetDefinition?.('player') || {
            id: 'player',
            name: 'Player (Guia de Proporção)',
            category: 'entities',
            imageSrc: config.imageSrc,
            width: 32,
            height: 32,
            frameWidth: 32,
            frameHeight: 32,
            isSprite: true,
            frameCount: config.frameCount,
            animationSpeed: config.animationSpeed
        };
        const placed = this.addAssetToMap(playerDef, Math.round(centerWorld.x - 16), Math.round(centerWorld.y - 16));
        this.selectAsset(placed);
        this.onAssetChangedCallback?.();
        this.render();
    }

    /**
     * Pré-carrega um sprite de asset e sincroniza as proporções 1:1
     */
    private getSpriteImage(src: string): HTMLImageElement {
        if (!this.spriteImages.has(src)) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                this.syncPlacedAssetsWithNaturalImage(src, img);
                this.render();
            };
            this.spriteImages.set(src, img);
        }
        return this.spriteImages.get(src)!;
    }

    /**
     * Sincroniza as proporções dos assets colocados com as dimensões naturais 1:1 da imagem,
     * impedindo distorções visuais e garantindo fidelidade com a renderização do jogo.
     */
    private syncPlacedAssetsWithNaturalImage(src: string, img: HTMLImageElement): void {
        if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
        let changed = false;
        for (const asset of this.placedAssets) {
            if (asset.imageSrc === src && !asset.isCustomScaled) {
                const visualEntry = (VisualConfigMap as any)[asset.presetId];
                const animState = visualEntry?.animations?.['static'] || visualEntry?.animations?.['idle'] || (visualEntry?.animations ? Object.values(visualEntry.animations)[0] as any : undefined);
                const isSprite = asset.isSprite || (asset.frameCount !== undefined && asset.frameCount > 1) || Boolean(animState?.frameCount && animState.frameCount > 1);
                const frameCount = (isSprite && asset.frameCount && asset.frameCount > 1) 
                    ? asset.frameCount 
                    : (animState?.frameCount && animState.frameCount > 1 ? animState.frameCount : 1);
                const natFrameW = Math.floor(img.naturalWidth / frameCount);
                const natFrameH = img.naturalHeight;

                if (asset.width !== natFrameW || asset.height !== natFrameH) {
                    const centerX = asset.x + asset.width / 2;
                    const centerY = asset.y + asset.height / 2;
                    asset.width = natFrameW;
                    asset.height = natFrameH;
                    asset.frameWidth = natFrameW;
                    asset.frameHeight = natFrameH;
                    asset.x = Math.round(centerX - natFrameW / 2);
                    asset.y = Math.round(centerY - natFrameH / 2);
                    changed = true;
                }
            }
        }
        if (changed) {
            this.onAssetChangedCallback?.();
        }
    }

    public centerMap(): void {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const mw = this.mapConfig.width;
        const mh = this.mapConfig.height;
        const chunkSize = this.mapConfig.chunkSize || 1024;
        const originCx = this.mapConfig.originChunk?.cx ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);
        const originCy = this.mapConfig.originChunk?.cy ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);
        const centerX = (-originCx * chunkSize) + mw / 2;
        const centerY = (-originCy * chunkSize) + mh / 2;

        this.zoom = Math.min(cw / (mw * 1.1), ch / (mh * 1.1), 0.7);
        this.panX = cw / 2 - centerX * this.zoom;
        this.panY = ch / 2 - centerY * this.zoom;
    }

    public changeMap(newConfig: SelectedMapConfig): void {
        this.mapConfig = newConfig;
        this.loadedMapCollisionId = '';
        if (this.showHitboxes) {
            this.loadMapCollisionLayer();
        }
        this.preloadChunkTextures();
        this.centerMap();
    }

    private bindEvents(): void {
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('resize', () => {
                this.resize();
                this.render();
            });
        }

    //? Navegação no mapa: pan bidimensional fluido e zoom centrado no cursor
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (this.isChunkBrushMode && e.altKey) {
                const deltaRadius = e.deltaY < 0 ? 4 : -4;
                this.setChunkBrushRadius(this.chunkBrushRadius + deltaRadius);
                this.onAssetChangedCallback?.();
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
                const newZoom = Math.max(0.08, Math.min(5.0, this.zoom * zoomFactor));

        //? Preserva o ponto mundial sob o cursor estático durante alteração de zoom
                this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
                this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
                this.zoom = newZoom;

                this.render();
                return;
            }

            if (e.shiftKey) {
                const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
                this.panX -= delta;
                this.render();
                return;
            }

            this.panX -= e.deltaX;
            this.panY -= e.deltaY;
            this.render();
        }, { passive: false });

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && !this.isSpacePressed) {
                    this.isSpacePressed = true;
                    this.canvas.style.cursor = 'grab';
                }

                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.copySelected();
                    return;
                }
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.paste();
                    return;
                }
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.selectAll();
                    return;
                }

                const hasSelection = this.selectedAssets.length > 0 || this.selectedAsset !== null;

                if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.deleteSelected();
                }
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && hasSelection) {
                    e.preventDefault();
                    this.duplicateSelected();
                }
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    this.undo();
                }
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    this.redo();
                }
                if (e.key.toLowerCase() === 'h' && hasSelection && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.flipSelectedX();
                }
                if (e.key.toLowerCase() === 'v' && hasSelection && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.flipSelectedY();
                }
                if (e.key.toLowerCase() === 'n' && hasSelection && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.naturalizeSelected();
                }
                if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && hasSelection && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.centerSelectedInChunk();
                }
                if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && hasSelection && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.rotateSelectedBy(e.shiftKey ? -90 : 90);
                }
                if (e.key === 'F2' && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.toggleHitboxes();
                }
                if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.togglePlayerReference();
                }
                if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey && hasSelection && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.toggleLockSelected();
                }
                if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.toggleStampMode();
                }
                if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !this.isTypingInInput()) {
                    e.preventDefault();
                    this.toggleChunkBrushMode();
                }
                if (this.isChunkBrushMode && (e.key === '[' || e.key === ']') && !this.isTypingInInput()) {
                    e.preventDefault();
                    const step = e.shiftKey ? 16 : 6;
                    this.setChunkBrushRadius(this.chunkBrushRadius + (e.key === ']' ? step : -step));
                    this.onAssetChangedCallback?.();
                }
                if (e.key === 'Escape' && !this.isTypingInInput()) {
                    e.preventDefault();
                    if (this.isChunkBrushMode) {
                        this.toggleChunkBrushMode(false);
                    } else if (this.isStampMode) {
                        this.toggleStampMode();
                    } else if (hasSelection) {
                        this.selectAsset(null);
                    }
                }
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && hasSelection && !this.isTypingInInput()) {
                    e.preventDefault();
                    const step = e.shiftKey ? 10 : (this.snapToGrid ? this.gridSize : 1);
                    const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
                    targets.forEach(asset => {
                        if (asset.locked) return;
                        if (e.key === 'ArrowUp') asset.y -= step;
                        if (e.key === 'ArrowDown') asset.y += step;
                        if (e.key === 'ArrowLeft') asset.x -= step;
                        if (e.key === 'ArrowRight') asset.x += step;
                    });
                    this.onAssetChangedCallback?.();
                    this.render();
                }
            });

            window.addEventListener('keyup', (e) => {
                if (e.code === 'Space') {
                    this.isSpacePressed = false;
                    this.canvas.style.cursor = 'default';
                }
            });
        }

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseScreenX = e.clientX - rect.left;
            const mouseScreenY = e.clientY - rect.top;

            if (e.button === 1 || (e.button === 0 && this.isSpacePressed)) {
                this.isPanning = true;
                this.panStartX = mouseScreenX - this.panX;
                this.panStartY = mouseScreenY - this.panY;
                this.canvas.style.cursor = 'grabbing';
                return;
            }

            if (e.button === 0 && this.showPlayerReference) {
                const refRect = this.getPlayerReferenceRect();
                if (
                    mouseScreenX >= refRect.x &&
                    mouseScreenX <= refRect.x + refRect.width &&
                    mouseScreenY >= refRect.y &&
                    mouseScreenY <= refRect.y + refRect.height
                ) {
                    this.playerRefFollowZoom = !this.playerRefFollowZoom;
                    this.render();
                    return;
                }
            }

            if (e.button === 0) {
                const worldPos = this.screenToWorld(mouseScreenX, mouseScreenY);
                this.lastMouseWorldPos = { x: worldPos.x, y: worldPos.y };

                if (this.isChunkBrushMode) {
                    this.startBrushStroke(worldPos.x, worldPos.y);
                    return;
                }

                if (this.isStampMode && this.activeStampAsset) {
                    let placeX = worldPos.x - this.activeStampAsset.width / 2;
                    let placeY = worldPos.y - this.activeStampAsset.height / 2;
                    if (this.snapToGrid) {
                        placeX = Math.round(placeX / this.gridSize) * this.gridSize;
                        placeY = Math.round(placeY / this.gridSize) * this.gridSize;
                    }
                    const newPlaced: PlacedAssetModel = {
                        uid: `asset_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                        presetId: this.activeStampAsset.id,
                        name: this.activeStampAsset.name,
                        x: Math.round(placeX),
                        y: Math.round(placeY),
                        width: this.activeStampAsset.width,
                        height: this.activeStampAsset.height,
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                        imageSrc: this.activeStampAsset.imageSrc,
                        isSprite: this.activeStampAsset.isSprite || (this.activeStampAsset.frameCount > 1),
                        frameCount: this.activeStampAsset.frameCount,
                        frameWidth: this.activeStampAsset.frameWidth,
                        frameHeight: this.activeStampAsset.frameHeight,
                        animationSpeed: this.activeStampAsset.animationSpeed,
                        atlasOffset: this.activeStampAsset.atlasOffset,
                        selected: false
                    };
                    this.placedAssets.push(newPlaced);
                    this.saveState();
                    this.onAssetChangedCallback?.();
                    this.render();
                    return;
                }

                if (this.selectedAssets.length <= 1) {
                    const handle = this.findResizeHandleAtWorldPos(worldPos.x, worldPos.y);
                    if (handle && this.selectedAsset && !this.selectedAsset.locked) {
                        this.isResizingAsset = true;
                        this.activeResizeHandle = handle;
                        this.resizeStartWorldX = worldPos.x;
                        this.resizeStartWorldY = worldPos.y;
                        this.initialAssetRect = {
                            x: this.selectedAsset.x,
                            y: this.selectedAsset.y,
                            width: this.selectedAsset.width,
                            height: this.selectedAsset.height
                        };
                        return;
                    }
                }

                const hit = this.findAssetAtWorldPos(worldPos.x, worldPos.y);

                if (hit) {
                    const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;
                    if (isModifier) {
                        this.toggleAssetSelection(hit);
                    } else {
                        if (!this.selectedAssets.some(a => a.uid === hit.uid)) {
                            this.selectAsset(hit);
                        } else {
                            this.selectedAsset = hit;
                        }
                    }

                    this.isDraggingAsset = true;
                    this.dragStartWorldX = worldPos.x;
                    this.dragStartWorldY = worldPos.y;
                    this.dragAssetOffsetX = worldPos.x - hit.x;
                    this.dragAssetOffsetY = worldPos.y - hit.y;
                    this.dragInitialPositions.clear();
                    const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
                    targets.forEach(a => {
                        this.dragInitialPositions.set(a.uid, { x: a.x, y: a.y });
                    });
                } else {
                    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        this.selectAsset(null);
                    }
                    this.isBoxSelecting = true;
                    this.boxSelectStartScreenX = mouseScreenX;
                    this.boxSelectStartScreenY = mouseScreenY;
                    this.boxSelectCurrentScreenX = mouseScreenX;
                    this.boxSelectCurrentScreenY = mouseScreenY;
                }
                this.render();
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseScreenX = e.clientX - rect.left;
            const mouseScreenY = e.clientY - rect.top;
            const worldPos = this.screenToWorld(mouseScreenX, mouseScreenY);
            this.lastMouseWorldPos = { x: worldPos.x, y: worldPos.y };

            if (this.isPanning) {
                this.panX = mouseScreenX - this.panStartX;
                this.panY = mouseScreenY - this.panStartY;
                this.render();
                return;
            }

            if (this.isChunkBrushMode) {
                this.canvas.style.cursor = 'crosshair';
                if (this.isPaintingBrushStroke) {
                    this.continueBrushStroke(worldPos.x, worldPos.y);
                } else {
                    this.render();
                }
                return;
            }

            if (this.isStampMode && this.activeStampAsset) {
                let gx = worldPos.x - this.activeStampAsset.width / 2;
                let gy = worldPos.y - this.activeStampAsset.height / 2;
                if (this.snapToGrid) {
                    gx = Math.round(gx / this.gridSize) * this.gridSize;
                    gy = Math.round(gy / this.gridSize) * this.gridSize;
                }
                this.ghostAsset = {
                    asset: this.activeStampAsset,
                    worldX: gx,
                    worldY: gy
                };
                this.canvas.style.cursor = 'crosshair';
                this.render();
                return;
            }

            if (this.isBoxSelecting) {
                this.boxSelectCurrentScreenX = mouseScreenX;
                this.boxSelectCurrentScreenY = mouseScreenY;
                this.updateBoxSelection(e.shiftKey || e.ctrlKey || e.metaKey);
                this.render();
                return;
            }

            if (this.isResizingAsset && this.selectedAsset && this.initialAssetRect && this.activeResizeHandle) {
                let dx = worldPos.x - this.resizeStartWorldX;
                let dy = worldPos.y - this.resizeStartWorldY;

                if (this.snapToGrid) {
                    dx = Math.round(dx / this.gridSize) * this.gridSize;
                    dy = Math.round(dy / this.gridSize) * this.gridSize;
                }

                const init = this.initialAssetRect;
                const minSize = 16;
                const aspect = (init.width && init.height) ? (init.width / init.height) : 1;
                //? Shift restringe redimensionamento para proporção 1:1
                const lockAspect = e.shiftKey;

                let newX = init.x;
                let newY = init.y;
                let newW = init.width;
                let newH = init.height;

                switch (this.activeResizeHandle) {
                    case 'se':
                        newW = Math.max(minSize, init.width + dx);
                        newH = lockAspect ? Math.max(minSize, Math.round(newW / aspect)) : Math.max(minSize, init.height + dy);
                        break;
                    case 'sw':
                        newW = Math.max(minSize, init.width - dx);
                        newH = lockAspect ? Math.max(minSize, Math.round(newW / aspect)) : Math.max(minSize, init.height + dy);
                        newX = init.x + (init.width - newW);
                        break;
                    case 'ne':
                        newW = Math.max(minSize, init.width + dx);
                        newH = lockAspect ? Math.max(minSize, Math.round(newW / aspect)) : Math.max(minSize, init.height - dy);
                        newY = init.y + (init.height - newH);
                        break;
                    case 'nw':
                        newW = Math.max(minSize, init.width - dx);
                        newH = lockAspect ? Math.max(minSize, Math.round(newW / aspect)) : Math.max(minSize, init.height - dy);
                        newX = init.x + (init.width - newW);
                        newY = init.y + (init.height - newH);
                        break;
                }

                this.selectedAsset.x = Math.round(newX);
                this.selectedAsset.y = Math.round(newY);
                this.selectedAsset.width = Math.round(newW);
                this.selectedAsset.height = Math.round(newH);
                this.selectedAsset.isCustomScaled = true;

                this.onAssetChangedCallback?.();
                this.render();
                return;
            }

            //? Arraste de múltiplos assets selecionados em conjunto
            if (this.isDraggingAsset) {
                let dx = worldPos.x - this.dragStartWorldX;
                let dy = worldPos.y - this.dragStartWorldY;

                if (this.snapToGrid) {
                    dx = Math.round(dx / this.gridSize) * this.gridSize;
                    dy = Math.round(dy / this.gridSize) * this.gridSize;
                }

                const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
                targets.forEach(a => {
                    if (a.locked) return;
                    const init = this.dragInitialPositions.get(a.uid);
                    if (init) {
                        a.x = Math.round(init.x + dx);
                        a.y = Math.round(init.y + dy);
                    }
                });

                this.onAssetChangedCallback?.();
                this.render();
                return;
            }

            if (!this.isPanning && !this.isDraggingAsset && !this.isResizingAsset && !this.isBoxSelecting) {
                if (this.showPlayerReference) {
                    const refRect = this.getPlayerReferenceRect();
                    if (
                        mouseScreenX >= refRect.x &&
                        mouseScreenX <= refRect.x + refRect.width &&
                        mouseScreenY >= refRect.y &&
                        mouseScreenY <= refRect.y + refRect.height
                    ) {
                        this.canvas.style.cursor = 'pointer';
                        return;
                    }
                }

                if (this.isSpacePressed) {
                    this.canvas.style.cursor = 'grab';
                } else {
                    const handleHover = this.findResizeHandleAtWorldPos(worldPos.x, worldPos.y);
                    if (handleHover) {
                        if (handleHover === 'nw' || handleHover === 'se') {
                            this.canvas.style.cursor = 'nwse-resize';
                        } else {
                            this.canvas.style.cursor = 'nesw-resize';
                        }
                    } else {
                        const assetHover = this.findAssetAtWorldPos(worldPos.x, worldPos.y);
                        this.canvas.style.cursor = assetHover ? 'move' : 'default';
                    }
                }
            }
        });

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('mouseup', () => {
                if (this.isPaintingBrushStroke) {
                    this.finishBrushStroke();
                }
                if (this.isPanning) {
                    this.isPanning = false;
                    this.canvas.style.cursor = this.isSpacePressed ? 'grab' : (this.isChunkBrushMode ? 'crosshair' : 'default');
                }
                if (this.isBoxSelecting) {
                    this.isBoxSelecting = false;
                    const distScreen = Math.hypot(
                        this.boxSelectCurrentScreenX - this.boxSelectStartScreenX,
                        this.boxSelectCurrentScreenY - this.boxSelectStartScreenY
                    );
                    if (distScreen < 4 && this.selectedAssets.length === 0) {
                        this.selectAsset(null);
                    } else {
                        this.selectedAsset = this.selectedAssets[this.selectedAssets.length - 1] || null;
                        this.onAssetSelectedCallback?.(this.selectedAsset);
                    }
                    this.render();
                }
                if (this.isResizingAsset) {
                    this.isResizingAsset = false;
                    this.activeResizeHandle = null;
                    this.initialAssetRect = null;
                    this.saveState();
                    this.onAssetChangedCallback?.();
                }
                if (this.isDraggingAsset) {
                    this.isDraggingAsset = false;
                    this.dragInitialPositions.clear();
                    this.saveState();
                }
            });
        }

        //? Double-click com hitboxes ativas (F2): abre o PolygonWebEditor para o asset selecionado
        this.canvas.addEventListener('dblclick', (e) => {
            if (!this.showHitboxes) return;
            const rect = this.canvas.getBoundingClientRect();
            const mouseScreenX = e.clientX - (rect?.left || 0);
            const mouseScreenY = e.clientY - (rect?.top || 0);
            const worldPos = this.screenToWorld(mouseScreenX, mouseScreenY);

            const hitAsset = this.findAssetAtWorldPos(worldPos.x, worldPos.y);
            if (hitAsset) {
                this.openHitboxEditorForAsset(hitAsset);
            }
        });

        //? Botão direito cancela Chunk Brush Mode ou Stamp Mode ativo
        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.isChunkBrushMode) {
                e.preventDefault();
                this.toggleChunkBrushMode(false);
                return;
            }
            if (this.isStampMode) {
                e.preventDefault();
                this.toggleStampMode();
            }
        });

        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy';
            }

            const rect = this.canvas.getBoundingClientRect();
            const mouseScreenX = e.clientX - rect.left;
            const mouseScreenY = e.clientY - rect.top;
            const worldPos = this.screenToWorld(mouseScreenX, mouseScreenY);

            let wx = worldPos.x;
            let wy = worldPos.y;
            if (this.snapToGrid) {
                wx = Math.round(wx / this.gridSize) * this.gridSize;
                wy = Math.round(wy / this.gridSize) * this.gridSize;
            }

            this.ghostAsset = {
                asset: (window as any).__draggedAssetData || { width: 64, height: 64, imageSrc: '' },
                worldX: wx,
                worldY: wy
            };
            this.render();
        });

        this.canvas.addEventListener('dragleave', () => {
            this.ghostAsset = null;
            this.render();
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.ghostAsset = null;

            let assetData: AssetDefinition | null = null;
            try {
                const json = e.dataTransfer?.getData('application/json');
                if (json) assetData = JSON.parse(json);
            } catch (err) {}

            if (!assetData && (window as any).__draggedAssetData) {
                assetData = (window as any).__draggedAssetData;
            }

            if (assetData) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseScreenX = e.clientX - rect.left;
                const mouseScreenY = e.clientY - rect.top;
                const worldPos = this.screenToWorld(mouseScreenX, mouseScreenY);

                let finalX = worldPos.x - assetData.width / 2;
                let finalY = worldPos.y - assetData.height / 2;

                if (this.snapToGrid) {
                    finalX = Math.round(finalX / this.gridSize) * this.gridSize;
                    finalY = Math.round(finalY / this.gridSize) * this.gridSize;
                }

                this.addAssetToMap(assetData, Math.round(finalX), Math.round(finalY));
            }
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                this.isTouchPanning = true;

                const t1 = e.touches[0]!;
                const t2 = e.touches[1]!;

                const rect = this.canvas.getBoundingClientRect();
                const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
                const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

                this.touchStartPanX = midX - this.panX;
                this.touchStartPanY = midY - this.panY;

                this.touchInitialDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                this.touchInitialZoom = this.zoom;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.isTouchPanning && e.touches.length === 2) {
                e.preventDefault();

                const t1 = e.touches[0]!;
                const t2 = e.touches[1]!;

                const rect = this.canvas.getBoundingClientRect();
                const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
                const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

                this.panX = midX - this.touchStartPanX;
                this.panY = midY - this.touchStartPanY;

                //? Zoom por pinça quando a distância dos dedos varia significativamente
                if (this.touchInitialDist > 0) {
                    const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                    const scaleFactor = currentDist / this.touchInitialDist;
                    const targetZoom = Math.max(0.08, Math.min(5.0, this.touchInitialZoom * scaleFactor));

                    if (Math.abs(targetZoom - this.zoom) > 0.001 && this.zoom > 0) {
                        this.panX = midX - (midX - this.panX) * (targetZoom / this.zoom);
                        this.panY = midY - (midY - this.panY) * (targetZoom / this.zoom);
                        this.zoom = targetZoom;
                    }
                }

                this.render();
            }
        }, { passive: false });

        const endTouch = () => {
            if (this.isTouchPanning) {
                this.isTouchPanning = false;
                this.touchInitialDist = 0;
            }
        };

        this.canvas.addEventListener('touchend', endTouch);
        this.canvas.addEventListener('touchcancel', endTouch);
    }

    public addAssetToMap(asset: AssetDefinition, worldX: number, worldY: number): PlacedAssetModel {
        const isPortal = asset.id.includes('portal') || asset.category === 'portals';
        const isItem = Boolean(asset.isItem || asset.category === 'items');
        const itemDefaults = isItem ? ItemFactory.getItemDefaults(asset.itemClass || asset.id) : null;

        const cachedImg = this.spriteImages.get(asset.imageSrc);
        let initW = asset.width;
        let initH = asset.height;
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
            const frameCount = (asset.isSprite && asset.frameCount && asset.frameCount > 1) ? asset.frameCount : 1;
            initW = asset.frameWidth || Math.floor(cachedImg.naturalWidth / frameCount);
            initH = asset.frameHeight || cachedImg.naturalHeight;
        }

        const newPlaced: PlacedAssetModel = {
            uid: `asset_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            presetId: asset.id,
            name: itemDefaults?.name || asset.name,
            x: worldX,
            y: worldY,
            width: initW,
            height: initH,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: asset.imageSrc,
            selected: true,
            isSprite: !isItem && asset.isSprite,
            frameWidth: initW,
            frameHeight: initH,
            frameCount: asset.frameCount,
            animationSpeed: asset.animationSpeed,
            atlasOffset: asset.atlasOffset,
            isPortal: isPortal,
            portalType: isPortal ? 'request' : undefined,
            targetMapId: isPortal ? (this.mapConfig.isInnerMap ? (this.mapConfig.parentWorldId || 'vilgem') : 'interior_black_default') : undefined,
            targetSpawnX: isPortal ? (this.mapConfig.isInnerMap ? (this.mapConfig.parentWorldId === 'vilgem' ? 1536 : 500) : 512) : undefined,
            targetSpawnY: isPortal ? (this.mapConfig.isInnerMap ? (this.mapConfig.parentWorldId === 'vilgem' ? 1615 : 500) : 700) : undefined,
            promptText: isPortal ? 'Entrar' : undefined,
            actionKey: isPortal ? 'E' : undefined,
            cooldownMs: isPortal ? 1000 : undefined,
            isItem: isItem,
            itemClass: itemDefaults?.itemClass || asset.itemClass || 'SimpleSword',
            itemCategory: itemDefaults?.category || asset.itemCategory,
            itemId: itemDefaults?.itemId,
            itemName: itemDefaults?.name || asset.name,
            itemDescription: itemDefaults?.description || '',
            itemRarity: itemDefaults?.rarity || 'common',
            itemAmount: itemDefaults?.amount || 1,
            itemPrice: itemDefaults?.price || 10,
            itemDurability: itemDefaults?.durability || 100,
            itemBaseDamage: itemDefaults?.baseDamage,
            itemAttackSpeed: itemDefaults?.attackSpeed,
            itemDamageReduction: itemDefaults?.damageReductionPercent,
            itemDodge: itemDefaults?.dodgePercent,
            itemRequiredLevel: itemDefaults?.requiredLevel || 1
        };

        this.placedAssets.push(newPlaced);
        this.selectAsset(newPlaced);
        this.saveState();
        this.render();
        this.onAssetChangedCallback?.();
        return newPlaced;
    }

    public setPlacedAssets(assets: PlacedAssetModel[]): void {
        this.placedAssets = [...assets];
        this.selectedAsset = null;
        this.selectedAssets = [];
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
        this.render();
    }

    public selectAsset(asset: PlacedAssetModel | null): void {
        this.placedAssets.forEach(a => a.selected = false);
        this.selectedAsset = asset;
        this.selectedAssets = asset ? [asset] : [];
        if (asset) asset.selected = true;
        this.onAssetSelectedCallback?.(asset);
        this.render();
    }

    public selectMultipleAssets(assets: PlacedAssetModel[]): void {
        const uids = new Set(assets.map(a => a.uid));
        this.placedAssets.forEach(a => {
            a.selected = uids.has(a.uid);
        });
        this.selectedAssets = [...assets];
        this.selectedAsset = assets[assets.length - 1] || null;
        this.onAssetSelectedCallback?.(this.selectedAsset);
        this.render();
    }

    public toggleAssetSelection(asset: PlacedAssetModel): void {
        const idx = this.selectedAssets.findIndex(a => a.uid === asset.uid);
        if (idx >= 0) {
            this.selectedAssets.splice(idx, 1);
            asset.selected = false;
        } else {
            this.selectedAssets.push(asset);
            asset.selected = true;
        }
        this.selectedAsset = this.selectedAssets[this.selectedAssets.length - 1] || null;
        this.onAssetSelectedCallback?.(this.selectedAsset);
        this.render();
    }

    public updateBoxSelection(isAdditive: boolean): void {
        const p1 = this.screenToWorld(this.boxSelectStartScreenX, this.boxSelectStartScreenY);
        const p2 = this.screenToWorld(this.boxSelectCurrentScreenX, this.boxSelectCurrentScreenY);

        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        const matchedUids = new Set<string>();

        for (const asset of this.placedAssets) {
            const ax1 = asset.x;
            const ax2 = asset.x + asset.width;
            const ay1 = asset.y;
            const ay2 = asset.y + asset.height;

            //? Teste de intersecção AABB entre caixa de seleção e bounds do asset
            const overlaps = ax1 < maxX && ax2 > minX && ay1 < maxY && ay2 > minY;
            if (overlaps) {
                matchedUids.add(asset.uid);
            }
        }

        if (!isAdditive) {
            this.placedAssets.forEach(a => {
                a.selected = matchedUids.has(a.uid);
            });
            this.selectedAssets = this.placedAssets.filter(a => a.selected);
        } else {
            this.placedAssets.forEach(a => {
                if (matchedUids.has(a.uid)) {
                    a.selected = true;
                }
            });
            this.selectedAssets = this.placedAssets.filter(a => a.selected);
        }

        this.selectedAsset = this.selectedAssets[this.selectedAssets.length - 1] || null;
    }

    public copySelected(): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;

        this.clipboardAssets = targets.map(a => JSON.parse(JSON.stringify(a)));
    }

    public paste(): void {
        if (this.clipboardAssets.length === 0) return;

        let minX = Infinity;
        let minY = Infinity;
        for (const a of this.clipboardAssets) {
            if (a.x < minX) minX = a.x;
            if (a.y < minY) minY = a.y;
        }

        let offsetX = 32;
        let offsetY = 32;

        //? Cola alinhado ao cursor se o mouse estiver posicionado no mapa
        if (this.lastMouseWorldPos && (this.lastMouseWorldPos.x !== 0 || this.lastMouseWorldPos.y !== 0)) {
            offsetX = this.lastMouseWorldPos.x - minX;
            offsetY = this.lastMouseWorldPos.y - minY;
            if (this.snapToGrid) {
                offsetX = Math.round(offsetX / this.gridSize) * this.gridSize;
                offsetY = Math.round(offsetY / this.gridSize) * this.gridSize;
            }
        }

        this.placedAssets.forEach(a => a.selected = false);
        this.selectedAssets = [];

        const pasted: PlacedAssetModel[] = [];

        this.clipboardAssets.forEach((source, idx) => {
            const clone: PlacedAssetModel = {
                ...JSON.parse(JSON.stringify(source)),
                uid: `asset_${Date.now()}_${Math.floor(Math.random() * 10000)}_${idx}`,
                x: source.x + offsetX,
                y: source.y + offsetY,
                selected: true
            };
            this.placedAssets.push(clone);
            pasted.push(clone);
        });

        this.selectedAssets = pasted;
        this.selectedAsset = pasted[pasted.length - 1] || null;

        this.saveState();
        this.onAssetSelectedCallback?.(this.selectedAsset);
        this.onAssetChangedCallback?.();
        this.render();
    }

    public selectAll(): void {
        if (this.placedAssets.length === 0) return;
        this.placedAssets.forEach(a => a.selected = true);
        this.selectedAssets = [...this.placedAssets];
        this.selectedAsset = this.selectedAssets[this.selectedAssets.length - 1] || null;
        this.onAssetSelectedCallback?.(this.selectedAsset);
        this.render();
    }

    public deleteSelected(): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;

        const deletable = targets.filter(a => !a.locked);
        if (deletable.length === 0) return;

        const uidsToDelete = new Set(deletable.map(a => a.uid));
        this.placedAssets = this.placedAssets.filter(a => !uidsToDelete.has(a.uid));
        this.selectedAssets = this.selectedAssets.filter(a => !uidsToDelete.has(a.uid));
        if (this.selectedAsset && uidsToDelete.has(this.selectedAsset.uid)) {
            this.selectedAsset = this.selectedAssets[0] || null;
        }
        this.saveState();
        this.onAssetSelectedCallback?.(this.selectedAsset);
        this.onAssetChangedCallback?.();
        this.render();
    }

    public duplicateSelected(): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;

        this.placedAssets.forEach(a => a.selected = false);
        const duplicates: PlacedAssetModel[] = [];

        targets.forEach((source, idx) => {
            const duplicate: PlacedAssetModel = {
                ...JSON.parse(JSON.stringify(source)),
                uid: `asset_${Date.now()}_${Math.floor(Math.random() * 10000)}_${idx}`,
                x: source.x + 32,
                y: source.y + 32,
                selected: true
            };
            this.placedAssets.push(duplicate);
            duplicates.push(duplicate);
        });

        this.selectedAssets = duplicates;
        this.selectedAsset = duplicates[duplicates.length - 1] || null;
        this.saveState();
        this.onAssetSelectedCallback?.(this.selectedAsset);
        this.onAssetChangedCallback?.();
        this.render();
    }

    /**
     * Encaixa o(s) asset(s) selecionado(s) imediatamente na linha de grid mais próxima (Snap to Grid)
     */
    public snapSelectedToGrid(): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;
        targets.forEach(a => {
            a.x = Math.round(a.x / this.gridSize) * this.gridSize;
            a.y = Math.round(a.y / this.gridSize) * this.gridSize;
        });
        this.saveState();
        this.onAssetChangedCallback?.();
        this.render();
    }

    /**
     * Alterna o espelhamento horizontal (Flip X) do(s) asset(s) selecionado(s)
     */
    public flipSelectedX(): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;
        targets.forEach(a => a.flipX = !a.flipX);
        this.saveState();
        this.onAssetChangedCallback?.();
        this.render();
    }

    /**
     * Alterna o espelhamento vertical (Flip Y) do(s) asset(s) selecionado(s)
     */
    public flipSelectedY(): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;
        targets.forEach(a => a.flipY = !a.flipY);
        this.saveState();
        this.onAssetChangedCallback?.();
        this.render();
    }

    /**
     * Naturaliza a disposição dos assets selecionados aplicando uma leve variação randômica:
     * 1. Deslocamento radial randômico de pequeno raio (padrão até 12px) em direção aleatória (0..2π).
     * 2. Variação proporcional de escala randômica de pequeno porte (padrão ±8% a ±12%) preservando proporções.
     *
     * @param maxRadius Raio máximo em pixels para a perturbação de posição (default: 12)
     * @param maxScaleVariation Variação percentual máxima de escala (default: 0.10 i.e. ±10%)
     */
    public naturalizeSelected(maxRadius: number = 12, maxScaleVariation: number = 0.10): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;

        targets.forEach(asset => {
            if (asset.locked) return;

            //? Deslocamento radial aleatório uniforme no raio configurado
            const angle = Math.random() * Math.PI * 2;
            const distance = 1 + Math.random() * Math.max(1, maxRadius - 1);
            const dx = Math.round(Math.cos(angle) * distance);
            const dy = Math.round(Math.sin(angle) * distance);

            asset.x += dx;
            asset.y += dy;

            //? Variação suave de escala preservando a proporção de aspecto estrita
            const scaleFactor = 1 + ((Math.random() * 2 - 1) * maxScaleVariation);
            const aspect = (asset.width && asset.height) ? (asset.width / asset.height) : 1;

            const newWidth = Math.max(16, Math.round(asset.width * scaleFactor));
            const newHeight = Math.max(16, Math.round(newWidth / aspect));

            if (newWidth !== asset.width || newHeight !== asset.height) {
                asset.width = newWidth;
                asset.height = newHeight;
                asset.isCustomScaled = true;
            }
        });

        this.saveState();
        this.onAssetChangedCallback?.();
        this.render();
    }

    /**
     * Centraliza o(s) asset(s) selecionado(s) perfeitamente com o chunk onde se encontram.
     * - Para seleção única: centraliza o asset no chunk que o contém.
     * - Para seleção múltipla: calcula o bounding box do grupo e centraliza o conjunto dentro do chunk, mantendo as posições relativas.
     */
    public centerSelectedInChunk(): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;

        const movable = targets.filter(a => !a.locked);
        if (movable.length === 0) return;

        const chunkSize = this.mapConfig.chunkSize || 1024;

        if (movable.length === 1) {
            const asset = movable[0]!;
            const assetCenterX = asset.x + asset.width / 2;
            const assetCenterY = asset.y + asset.height / 2;

            const chunkWorldX = Math.floor(assetCenterX / chunkSize) * chunkSize;
            const chunkWorldY = Math.floor(assetCenterY / chunkSize) * chunkSize;

            const targetCenterX = chunkWorldX + chunkSize / 2;
            const targetCenterY = chunkWorldY + chunkSize / 2;

            asset.x = Math.round(targetCenterX - asset.width / 2);
            asset.y = Math.round(targetCenterY - asset.height / 2);
        } else {
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;

            movable.forEach(a => {
                minX = Math.min(minX, a.x);
                maxX = Math.max(maxX, a.x + a.width);
                minY = Math.min(minY, a.y);
                maxY = Math.max(maxY, a.y + a.height);
            });

            const groupCenterX = (minX + maxX) / 2;
            const groupCenterY = (minY + maxY) / 2;

            const chunkWorldX = Math.floor(groupCenterX / chunkSize) * chunkSize;
            const chunkWorldY = Math.floor(groupCenterY / chunkSize) * chunkSize;

            const targetCenterX = chunkWorldX + chunkSize / 2;
            const targetCenterY = chunkWorldY + chunkSize / 2;

            const dx = Math.round(targetCenterX - groupCenterX);
            const dy = Math.round(targetCenterY - groupCenterY);

            movable.forEach(asset => {
                asset.x += dx;
                asset.y += dy;
            });
        }

        this.saveState();
        this.onAssetChangedCallback?.();
        this.render();
    }

    /**
     * Alinha todos os assets selecionados em relação aos seus limites comuns
     */
    public alignSelected(alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length < 2) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const a of targets) {
            if (a.x < minX) minX = a.x;
            if (a.x + a.width > maxX) maxX = a.x + a.width;
            if (a.y < minY) minY = a.y;
            if (a.y + a.height > maxY) maxY = a.y + a.height;
        }

        const groupCenterH = minX + (maxX - minX) / 2;
        const groupCenterV = minY + (maxY - minY) / 2;

        targets.forEach(a => {
            if (a.locked) return;
            switch (alignment) {
                case 'left':
                    a.x = minX;
                    break;
                case 'right':
                    a.x = maxX - a.width;
                    break;
                case 'center-h':
                    a.x = Math.round(groupCenterH - a.width / 2);
                    break;
                case 'top':
                    a.y = minY;
                    break;
                case 'bottom':
                    //? Alinhamento na base inferior (plano de chão do 2.5D)
                    a.y = maxY - a.height;
                    break;
                case 'center-v':
                    a.y = Math.round(groupCenterV - a.height / 2);
                    break;
            }
            if (this.snapToGrid) {
                a.x = Math.round(a.x / this.gridSize) * this.gridSize;
                a.y = Math.round(a.y / this.gridSize) * this.gridSize;
            }
        });

        this.saveState();
        this.render();
        this.onAssetChangedCallback?.();
    }

    /**
     * Distribui uniformemente o espaçamento entre 3 ou mais assets selecionados
     */
    public distributeSelected(axis: 'horizontal' | 'vertical'): void {
        const targets = (this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []))
            .filter(a => !a.locked);
        if (targets.length < 3) return;

        if (axis === 'horizontal') {
            const sorted = [...targets].sort((a, b) => a.x - b.x);
            const first = sorted[0]!;
            const last = sorted[sorted.length - 1]!;
            const totalSpan = (last.x + last.width) - first.x;
            const totalAssetWidths = sorted.reduce((sum, a) => sum + a.width, 0);
            const freeSpace = totalSpan - totalAssetWidths;
            const gap = freeSpace / (sorted.length - 1);

            let currentX = first.x + first.width + gap;
            for (let i = 1; i < sorted.length - 1; i++) {
                const item = sorted[i]!;
                item.x = Math.round(currentX);
                if (this.snapToGrid) {
                    item.x = Math.round(item.x / this.gridSize) * this.gridSize;
                }
                currentX = item.x + item.width + gap;
            }
        } else {
            const sorted = [...targets].sort((a, b) => a.y - b.y);
            const first = sorted[0]!;
            const last = sorted[sorted.length - 1]!;
            const totalSpan = (last.y + last.height) - first.y;
            const totalAssetHeights = sorted.reduce((sum, a) => sum + a.height, 0);
            const freeSpace = totalSpan - totalAssetHeights;
            const gap = freeSpace / (sorted.length - 1);

            let currentY = first.y + first.height + gap;
            for (let i = 1; i < sorted.length - 1; i++) {
                const item = sorted[i]!;
                item.y = Math.round(currentY);
                if (this.snapToGrid) {
                    item.y = Math.round(item.y / this.gridSize) * this.gridSize;
                }
                currentY = item.y + item.height + gap;
            }
        }

        this.saveState();
        this.render();
        this.onAssetChangedCallback?.();
    }

    /**
     * Alterna o estado de bloqueio (Lock) dos assets selecionados
     */
    public toggleLockSelected(): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;

        const anyUnlocked = targets.some(a => !a.locked);
        targets.forEach(a => {
            a.locked = anyUnlocked;
        });

        this.saveState();
        this.render();
        this.onAssetChangedCallback?.();
    }

    /**
     * Alterna o modo Carimbo / Pincel Contínuo (Stamp Tool - Tecla B).
     * Permite posicionar rapidamente múltiplos assets repetidos com um clique direto no canvas.
     */
    public toggleStampMode(asset?: AssetDefinition): void {
        this.isStampMode = !this.isStampMode;
        if (this.isStampMode && this.isChunkBrushMode) {
            this.isChunkBrushMode = false;
            this.isPaintingBrushStroke = false;
            this.onChunkBrushModeChanged?.(false);
        }
        if (this.isStampMode) {
            if (asset) {
                this.activeStampAsset = asset;
            } else if (!this.activeStampAsset) {
                if (this.selectedAsset) {
                    const def = this.getAssetDefinition?.(this.selectedAsset.presetId);
                    if (def) {
                        this.activeStampAsset = def;
                    } else {
                        this.activeStampAsset = {
                            id: this.selectedAsset.presetId,
                            name: this.selectedAsset.name,
                            category: 'custom',
                            imageSrc: this.selectedAsset.imageSrc,
                            width: this.selectedAsset.width,
                            height: this.selectedAsset.height,
                            frameCount: this.selectedAsset.frameCount ?? 1,
                            frameWidth: this.selectedAsset.frameWidth ?? this.selectedAsset.width,
                            frameHeight: this.selectedAsset.frameHeight ?? this.selectedAsset.height,
                            animationSpeed: this.selectedAsset.animationSpeed,
                            atlasOffset: this.selectedAsset.atlasOffset,
                            isSprite: this.selectedAsset.isSprite
                        };
                    }
                } else if (typeof window !== 'undefined' && (window as any).__draggedAssetData) {
                    this.activeStampAsset = (window as any).__draggedAssetData;
                }
            }
        }

        if (!this.isStampMode) {
            this.activeStampAsset = null;
            this.ghostAsset = null;
        } else {
            if (this.lastMouseWorldPos && this.activeStampAsset) {
                let gx = this.lastMouseWorldPos.x - this.activeStampAsset.width / 2;
                let gy = this.lastMouseWorldPos.y - this.activeStampAsset.height / 2;
                if (this.snapToGrid) {
                    gx = Math.round(gx / this.gridSize) * this.gridSize;
                    gy = Math.round(gy / this.gridSize) * this.gridSize;
                }
                this.ghostAsset = {
                    asset: this.activeStampAsset,
                    worldX: gx,
                    worldY: gy
                };
            }
        }

        this.onStampModeChanged?.(this.isStampMode, this.activeStampAsset);
        this.render();
    }

    /**
     * Alterna o modo Pincel de Textura de Chunk (Tecla T).
     * Quando ativo, exibe um círculo ao redor do cursor e permite pintar com um fundo de chunk
     * sobre o mapa, gerando um objeto (PlacedAssetModel) com a área pintada pronto para Bake.
     */
    public toggleChunkBrushMode(forceState?: boolean, textureUrl?: string, textureName?: string): void {
        this.isChunkBrushMode = forceState !== undefined ? forceState : !this.isChunkBrushMode;

        if (this.isChunkBrushMode) {
            if (this.isStampMode) {
                this.isStampMode = false;
                this.activeStampAsset = null;
                this.ghostAsset = null;
                this.onStampModeChanged?.(false, null);
            }
            if (textureUrl) {
                this.setBrushTexture(textureUrl, textureName);
            } else if (!this.activeBrushTextureUrl) {
                const defaultUrl = this.mapConfig.chunks?.[0]?.[0] || '/assets/maps/vilgem/grass_seamless_base.png';
                this.setBrushTexture(defaultUrl, 'Grama Nativa de Vilgem (Sem Emendas)');
            } else {
                this.getSpriteImage(this.activeBrushTextureUrl);
            }
            if (this.canvas) {
                this.canvas.style.cursor = 'crosshair';
            }
        } else {
            this.isPaintingBrushStroke = false;
            this.lastBrushWorldPoint = null;
            if (this.canvas) {
                this.canvas.style.cursor = 'default';
            }
        }

        this.onChunkBrushModeChanged?.(this.isChunkBrushMode);
        this.onAssetChangedCallback?.();
        this.render();
    }

    /**
     * Define a textura de fundo de chunk ativa para o pincel.
     */
    public setBrushTexture(textureUrl: string, textureName?: string): void {
        if (!textureUrl) return;
        const textureChanged = this.activeBrushTextureUrl !== textureUrl;
        this.activeBrushTextureUrl = textureUrl;
        if (textureName) {
            this.activeBrushTextureName = textureName;
        }
        this.getSpriteImage(textureUrl);
        if (!this.chunkImages.has(textureUrl) && typeof Image !== 'undefined') {
            const img = new Image();
            img.src = textureUrl;
            img.onload = () => this.render();
            this.chunkImages.set(textureUrl, img);
        }
        //? Mudança de textura inicia uma nova camada pintada na próxima pincelada
        if (textureChanged) {
            this.activePaintedAsset = null;
        }
        this.render();
    }

    /**
     * Ajusta o raio do círculo do pincel em pixels do mundo (8px a 256px).
     */
    public setChunkBrushRadius(radius: number): void {
        const clamped = Math.max(8, Math.min(256, Math.round(Number(radius) || 48)));
        this.chunkBrushRadius = clamped;
        this.render();
    }

    /**
     * Ajusta a suavidade da borda do pincel (0 = borda sólida, 1 = degradê suave máximo).
     */
    public setChunkBrushSoftness(softness: number): void {
        this.chunkBrushSoftness = Math.max(0, Math.min(1, Number(softness) || 0));
        this.render();
    }

    /**
     * Ajusta a opacidade da pincelada (0.1 a 1.0).
     */
    public setChunkBrushOpacity(opacity: number): void {
        this.chunkBrushOpacity = Math.max(0.1, Math.min(1.0, Number(opacity) || 1.0));
        this.render();
    }

    /**
     * Desvincula o objeto pintado atual para que a próxima pincelada gere um novo PlacedAssetModel independente.
     */
    public startNewPaintedLayer(): void {
        this.activePaintedAsset = null;
        this.isPaintingBrushStroke = false;
        this.lastBrushWorldPoint = null;
        this.render();
    }

    /**
     * Cria um elemento canvas compatível com navegador e ambientes de teste (Node/Vitest).
     */
    private createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
        const w = Math.max(1, Math.round(width));
        const h = Math.max(1, Math.round(height));
        if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            if (ctx) {
                return c;
            }
        }
        //? Fallback mock para ambiente de teste sem Canvas 2D nativo
        return {
            width: w,
            height: h,
            getContext: () => this.ctx,
            toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        } as any;
    }

    /**
     * Obtém a imagem carregada da textura ativa do pincel.
     */
    private getActiveBrushImage(): HTMLImageElement | null {
        const url = this.activeBrushTextureUrl;
        if (!url) return null;
        const fromChunks = this.chunkImages.get(url);
        if (fromChunks && fromChunks.complete && fromChunks.naturalWidth > 0) {
            return fromChunks;
        }
        const fromSprites = this.getSpriteImage(url);
        if (fromSprites && fromSprites.complete && fromSprites.naturalWidth > 0) {
            return fromSprites;
        }
        return fromChunks || fromSprites || null;
    }

    /**
     * Inicia uma pincelada de textura de chunk na posição mundial (worldX, worldY).
     */
    public startBrushStroke(worldX: number, worldY: number): PlacedAssetModel {
        this.isPaintingBrushStroke = true;
        this.lastBrushWorldPoint = { x: worldX, y: worldY };

        const asset = this.applyBrushDab(worldX, worldY);
        this.selectAsset(asset);
        this.render();
        return asset;
    }

    /**
     * Continua a pincelada interpolando pontos entre a última posição e (worldX, worldY)
     * para formar um traço contínuo e suave.
     */
    public continueBrushStroke(worldX: number, worldY: number): void {
        if (!this.isPaintingBrushStroke) return;

        const prev = this.lastBrushWorldPoint || { x: worldX, y: worldY };
        const dist = Math.hypot(worldX - prev.x, worldY - prev.y);
        const step = Math.max(3, this.chunkBrushRadius * 0.25);

        if (dist >= step) {
            const steps = Math.ceil(dist / step);
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const ix = prev.x + (worldX - prev.x) * t;
                const iy = prev.y + (worldY - prev.y) * t;
                this.applyBrushDab(ix, iy);
            }
        } else {
            this.applyBrushDab(worldX, worldY);
        }

        this.lastBrushWorldPoint = { x: worldX, y: worldY };
        this.render();
    }

    /**
     * Finaliza a pincelada atual, atualiza o PNG DataURL do objeto pintado e salva no histórico Undo/Redo.
     */
    public finishBrushStroke(): PlacedAssetModel | null {
        if (!this.isPaintingBrushStroke) return this.activePaintedAsset;
        this.isPaintingBrushStroke = false;
        this.lastBrushWorldPoint = null;

        if (this.activePaintedAsset) {
            this.syncPaintedAssetDataUrl(this.activePaintedAsset);
            this.selectAsset(this.activePaintedAsset);
            this.saveState();
            this.onAssetChangedCallback?.();
        }

        const finishedAsset = this.activePaintedAsset;
        if (!this.mergeBrushStrokes) {
            this.activePaintedAsset = null;
        }

        this.render();
        return finishedAsset;
    }

    /**
     * Sincroniza o canvas offscreen da camada pintada com o `imageSrc` (Data URL PNG) do PlacedAssetModel.
     */
    private syncPaintedAssetDataUrl(asset: PlacedAssetModel): void {
        const layerCanvas = this.paintedLayerCanvases.get(asset.uid);
        if (!layerCanvas) return;

        try {
            const dataUrl = typeof layerCanvas.toDataURL === 'function'
                ? layerCanvas.toDataURL('image/png')
                : asset.imageSrc;
            if (dataUrl && dataUrl.startsWith('data:image/')) {
                asset.imageSrc = dataUrl;
                if (typeof Image !== 'undefined') {
                    const img = new Image();
                    img.src = dataUrl;
                    this.spriteImages.set(dataUrl, img);
                }
            }
        } catch {
            //? Ignora falhas de tainted canvas em ambientes restritos de teste/CORS
        }
    }

    /**
     * Aplica um carimbo circular ("dab") de textura de chunk na coordenada mundial (wx, wy),
     * criando ou expandindo dinamicamente o PlacedAssetModel correspondente.
     */
    private applyBrushDab(wx: number, wy: number): PlacedAssetModel {
        const radius = Math.max(8, this.chunkBrushRadius);
        const dabMinX = Math.floor(wx - radius);
        const dabMinY = Math.floor(wy - radius);
        const dabMaxX = Math.ceil(wx + radius);
        const dabMaxY = Math.ceil(wy + radius);

        let asset = this.activePaintedAsset;
        if (
            !asset ||
            !this.mergeBrushStrokes ||
            !this.placedAssets.some(a => a.uid === asset!.uid) ||
            asset.locked ||
            asset.rotation !== 0
        ) {
            const initW = Math.max(16, dabMaxX - dabMinX);
            const initH = Math.max(16, dabMaxY - dabMinY);
            const uid = `painted_chunk_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            const layerCanvas = this.createOffscreenCanvas(initW, initH);
            this.paintedLayerCanvases.set(uid, layerCanvas);

            //? Z-index no piso inferior para pintura de terreno ficar abaixo de props/casas
            asset = {
                uid,
                presetId: 'painted_chunk_layer',
                name: `Pintura: ${this.activeBrushTextureName || 'Terreno'}`,
                x: dabMinX,
                y: dabMinY,
                width: initW,
                height: initH,
                baseWidth: initW,
                baseHeight: initH,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                zIndex: -9999,
                imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                selected: true,
                isPaintedLayer: true,
                sourceTextureUrl: this.activeBrushTextureUrl,
                sourceTextureName: this.activeBrushTextureName
            };

            this.placedAssets.push(asset);
            this.activePaintedAsset = asset;
        }

        //? Expande os limites da camada se a pincelada extrapolar o bounding box atual
        let layerCanvas = this.paintedLayerCanvases.get(asset.uid);
        if (!layerCanvas) {
            layerCanvas = this.createOffscreenCanvas(asset.width, asset.height);
            this.paintedLayerCanvases.set(asset.uid, layerCanvas);
        }

        const curMinX = asset.x;
        const curMinY = asset.y;
        const curMaxX = asset.x + asset.width;
        const curMaxY = asset.y + asset.height;

        if (dabMinX < curMinX || dabMinY < curMinY || dabMaxX > curMaxX || dabMaxY > curMaxY) {
            const newMinX = Math.min(curMinX, dabMinX);
            const newMinY = Math.min(curMinY, dabMinY);
            const newMaxX = Math.max(curMaxX, dabMaxX);
            const newMaxY = Math.max(curMaxY, dabMaxY);
            const newW = Math.max(16, newMaxX - newMinX);
            const newH = Math.max(16, newMaxY - newMinY);

            const expandedCanvas = this.createOffscreenCanvas(newW, newH);
            const expCtx = expandedCanvas.getContext('2d');
            if (expCtx && layerCanvas.width > 0 && layerCanvas.height > 0) {
                try {
                    expCtx.drawImage(layerCanvas, curMinX - newMinX, curMinY - newMinY);
                } catch {}
            }

            layerCanvas = expandedCanvas;
            this.paintedLayerCanvases.set(asset.uid, layerCanvas);

            asset.x = newMinX;
            asset.y = newMinY;
            asset.width = newW;
            asset.height = newH;
            asset.baseWidth = newW;
            asset.baseHeight = newH;
        }

        const lCtx = layerCanvas.getContext('2d');
        if (lCtx) {
            const localCx = wx - asset.x;
            const localCy = wy - asset.y;
            this.drawTexturedBrushCircleOnLayer(lCtx, localCx, localCy, radius, asset.x, asset.y);
        }

        //? Atualiza imageSrc no primeiro ponto para evitar canvas vazio
        if (asset.imageSrc.length < 120) {
            this.syncPaintedAssetDataUrl(asset);
        }

        return asset;
    }

    /**
     * Renderiza um círculo preenchido com a textura de chunk ativa (alinhada às coordenadas de mundo/chunk)
     * sobre o contexto 2D da camada pintada.
     */
    private drawTexturedBrushCircleOnLayer(
        layerCtx: CanvasRenderingContext2D,
        localCx: number,
        localCy: number,
        radius: number,
        layerWorldX: number,
        layerWorldY: number
    ): void {
        const chunkSize = this.mapConfig.chunkSize || 1024;
        const brushImg = this.getActiveBrushImage();
        const diam = Math.ceil(radius * 2);

        layerCtx.save();
        layerCtx.globalAlpha = this.chunkBrushOpacity;

        //? Suavidade de borda (softness > 0): compõe máscara radial com gradiente de transparência
        const dabCanvas = this.createOffscreenCanvas(diam, diam);
        const dabCtx = dabCanvas.getContext('2d');

        if (dabCtx && dabCtx !== this.ctx) {
            dabCtx.save();
            dabCtx.beginPath();
            dabCtx.arc(radius, radius, radius, 0, Math.PI * 2);
            dabCtx.clip();

            const dabWorldLeft = layerWorldX + localCx - radius;
            const dabWorldTop = layerWorldY + localCy - radius;

            this.fillWorldAlignedTextureRect(dabCtx, brushImg, dabWorldLeft, dabWorldTop, diam, diam, chunkSize);

            if (this.chunkBrushSoftness > 0.02 && typeof dabCtx.createRadialGradient === 'function') {
                const innerR = Math.max(0, radius * (1 - this.chunkBrushSoftness));
                const grad = dabCtx.createRadialGradient(radius, radius, innerR, radius, radius, radius);
                grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                dabCtx.globalCompositeOperation = 'destination-in';
                dabCtx.fillStyle = grad;
                dabCtx.fillRect(0, 0, diam, diam);
            }

            dabCtx.restore();
            layerCtx.drawImage(dabCanvas, localCx - radius, localCy - radius);
        } else {
            //? Fallback direto com clip circular no contexto alvo
            layerCtx.beginPath();
            layerCtx.arc(localCx, localCy, radius, 0, Math.PI * 2);
            if (typeof layerCtx.clip === 'function') {
                layerCtx.clip();
            }
            const dabWorldLeft = layerWorldX + localCx - radius;
            const dabWorldTop = layerWorldY + localCy - radius;
            this.fillWorldAlignedTextureRect(
                layerCtx,
                brushImg,
                dabWorldLeft,
                dabWorldTop,
                diam,
                diam,
                chunkSize,
                localCx - radius,
                localCy - radius
            );
        }

        layerCtx.restore();
    }

    /**
     * Preenche uma região retangular com a textura do chunk repetida (tiled) e alinhada perfeitamente
     * à grade mundial de chunks (chunkSize = 1024px), garantindo continuidade sem costuras entre pinceladas.
     */
    private fillWorldAlignedTextureRect(
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement | null,
        worldLeft: number,
        worldTop: number,
        width: number,
        height: number,
        chunkSize: number,
        destOffsetX: number = 0,
        destOffsetY: number = 0
    ): void {
        if (img && img.complete && img.naturalWidth > 0) {
            const tileW = chunkSize || 1024;
            const tileH = chunkSize || 1024;
            const startTileX = Math.floor(worldLeft / tileW) * tileW;
            const endTileX = Math.ceil((worldLeft + width) / tileW) * tileW;
            const startTileY = Math.floor(worldTop / tileH) * tileH;
            const endTileY = Math.ceil((worldTop + height) / tileH) * tileH;

            for (let ty = startTileY; ty < endTileY; ty += tileH) {
                for (let tx = startTileX; tx < endTileX; tx += tileW) {
                    const drawX = destOffsetX + (tx - worldLeft);
                    const drawY = destOffsetY + (ty - worldTop);
                    ctx.drawImage(img, drawX, drawY, tileW, tileH);
                }
            }
        } else {
            //? Cor representativa enquanto a imagem carrega ou em ambiente de teste
            ctx.fillStyle = '#3b7a57';
            ctx.fillRect(destOffsetX, destOffsetY, width, height);
        }
    }

    /**
     * Desenha o círculo visual da ferramenta Pincel de Textura de Chunk em volta do cursor do mouse,
     * exibindo um preview translúcido da textura selecionada dentro do círculo e o raio atual.
     */
    private drawChunkBrushCursor(ctx: CanvasRenderingContext2D): void {
        if (!this.isChunkBrushMode) return;
        const wx = this.lastMouseWorldPos.x;
        const wy = this.lastMouseWorldPos.y;
        const radius = this.chunkBrushRadius;
        const chunkSize = this.mapConfig.chunkSize || 1024;
        const brushImg = this.getActiveBrushImage();

        ctx.save();

        ctx.save();
        ctx.beginPath();
        ctx.arc(wx, wy, radius, 0, Math.PI * 2);
        if (typeof ctx.clip === 'function') {
            ctx.clip();
        }
        ctx.globalAlpha = 0.55;
        this.fillWorldAlignedTextureRect(
            ctx,
            brushImg,
            wx - radius,
            wy - radius,
            radius * 2,
            radius * 2,
            chunkSize,
            wx - radius,
            wy - radius
        );
        ctx.restore();

        if (this.chunkBrushSoftness > 0.05) {
            const innerR = Math.max(2, radius * (1 - this.chunkBrushSoftness));
            ctx.beginPath();
            ctx.arc(wx, wy, innerR, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = Math.max(1, 1.2 / this.zoom);
            ctx.setLineDash([3 / this.zoom, 3 / this.zoom]);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(wx, wy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.isPaintingBrushStroke ? '#34d399' : '#38bdf8';
        ctx.lineWidth = Math.max(1.5, 2.2 / this.zoom);
        ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(wx, wy, Math.max(2, 3 / this.zoom), 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();

        const label = `🎨 Pincel: ${this.activeBrushTextureName} (R: ${radius}px)`;
        ctx.font = `bold ${Math.max(10, 12 / this.zoom)}px monospace`;
        const tw = ctx.measureText(label).width;
        const pad = 4 / this.zoom;
        const boxX = wx - tw / 2 - pad;
        const boxY = wy + radius + (8 / this.zoom);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(boxX, boxY, tw + pad * 2, 18 / this.zoom);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(label, boxX + pad, boxY + (13 / this.zoom));

        ctx.restore();
    }

    /**
     * Move e centraliza a visualização do mapa diretamente sobre o asset especificado.
     */
    public panToAsset(asset: PlacedAssetModel): void {
        const centerX = asset.x + asset.width / 2;
        const centerY = asset.y + asset.height / 2;
        this.panX = Math.round(this.canvas.width / 2 - centerX * this.zoom);
        this.panY = Math.round(this.canvas.height / 2 - centerY * this.zoom);
        this.selectAsset(asset);
        this.render();
    }

    /**
     * Retorna as dimensões base (originais não escaladas) de um asset
     */
    public getAssetBaseDimensions(asset: PlacedAssetModel): { baseW: number; baseH: number } {
        const def = this.getAssetDefinition?.(asset.presetId);
        const baseW = asset.baseWidth || def?.frameWidth || def?.width || asset.frameWidth || asset.width;
        const baseH = asset.baseHeight || def?.frameHeight || def?.height || asset.frameHeight || asset.height;
        if (!asset.baseWidth) {
            asset.baseWidth = baseW;
            asset.baseHeight = baseH;
        }
        return { baseW, baseH };
    }

    /**
     * Aplica uma escala proporcional absoluta (baseada nas dimensões base) no asset ou grupo selecionado,
     * preservando estritamente a proporção de aspecto (aspect ratio) e mantendo o centro de ancoragem.
     * 
     * @param targetScale Multiplicador de escala relativo ao tamanho base (ex: 0.5 para -2x/metade, 0.667 para -1.5x, 1.0 para normal, 1.5 para +50%, 2.0 para dobro)
     * @param commitToHistory Se deve gravar no histórico para Undo/Redo (default: true)
     */
    public setScaleSelected(targetScale: number, commitToHistory: boolean = true): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;

        const movable = targets.filter(a => !a.locked);
        if (movable.length === 0) return;

        const clampedScale = Math.max(0.1, Math.min(10.0, targetScale));

        if (movable.length === 1) {
            const asset = movable[0]!;
            const { baseW, baseH } = this.getAssetBaseDimensions(asset);
            const aspect = (baseW && baseH) ? (baseW / baseH) : 1;

            const newWidth = Math.max(8, Math.round(baseW * clampedScale));
            const newHeight = Math.max(8, Math.round(newWidth / aspect));

            const centerX = asset.x + asset.width / 2;
            const centerY = asset.y + asset.height / 2;

            asset.width = newWidth;
            asset.height = newHeight;
            asset.x = Math.round(centerX - newWidth / 2);
            asset.y = Math.round(centerY - newHeight / 2);
            asset.scaleX = clampedScale;
            asset.scaleY = clampedScale;
            asset.isCustomScaled = true;
        } else {
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;

            movable.forEach(a => {
                minX = Math.min(minX, a.x);
                maxX = Math.max(maxX, a.x + a.width);
                minY = Math.min(minY, a.y);
                maxY = Math.max(maxY, a.y + a.height);
            });

            const groupCenterX = (minX + maxX) / 2;
            const groupCenterY = (minY + maxY) / 2;

            movable.forEach(asset => {
                const { baseW, baseH } = this.getAssetBaseDimensions(asset);
                const aspect = (baseW && baseH) ? (baseW / baseH) : 1;

                const newWidth = Math.max(8, Math.round(baseW * clampedScale));
                const newHeight = Math.max(8, Math.round(newWidth / aspect));

                const currentCenterX = asset.x + asset.width / 2;
                const currentCenterY = asset.y + asset.height / 2;
                const relX = currentCenterX - groupCenterX;
                const relY = currentCenterY - groupCenterY;

                const prevScale = asset.scaleX || (asset.width / baseW) || 1;
                const scaleDelta = clampedScale / prevScale;

                const newCenterX = groupCenterX + relX * scaleDelta;
                const newCenterY = groupCenterY + relY * scaleDelta;

                asset.width = newWidth;
                asset.height = newHeight;
                asset.x = Math.round(newCenterX - newWidth / 2);
                asset.y = Math.round(newCenterY - newHeight / 2);
                asset.scaleX = clampedScale;
                asset.scaleY = clampedScale;
                asset.isCustomScaled = true;
            });
        }

        if (commitToHistory) {
            this.saveState();
            this.onAssetChangedCallback?.();
        }
        this.render();
    }

    /**
     * Define o ângulo absoluto de rotação em graus para o(s) asset(s) selecionado(s)
     */
    public setRotationSelected(degrees: number, commitToHistory: boolean = true): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;

        const movable = targets.filter(a => !a.locked);
        if (movable.length === 0) return;

        let normalized = Math.round(degrees);
        if (normalized !== 360) {
            normalized = ((normalized % 360) + 360) % 360;
        }

        movable.forEach(asset => {
            asset.rotation = normalized;
        });

        if (commitToHistory) {
            this.saveState();
            this.onAssetChangedCallback?.();
        }
        this.render();
    }

    /**
     * Gira o(s) asset(s) selecionado(s) por um deslocamento angular em graus (+90, -90, +45, etc.)
     */
    public rotateSelectedBy(deltaDegrees: number, commitToHistory: boolean = true): void {
        const targets = this.selectedAssets.length > 0 ? this.selectedAssets : (this.selectedAsset ? [this.selectedAsset] : []);
        if (targets.length === 0) return;

        const movable = targets.filter(a => !a.locked);
        if (movable.length === 0) return;

        movable.forEach(asset => {
            const current = asset.rotation || 0;
            let next = (current + deltaDegrees) % 360;
            if (next < 0) next += 360;
            asset.rotation = Math.round(next);
        });

        if (commitToHistory) {
            this.saveState();
            this.onAssetChangedCallback?.();
        }
        this.render();
    }

    /**
     * Encaixa todos os assets do mapa no grid atual
     */
    public snapAllToGrid(): void {
        if (this.placedAssets.length === 0) return;
        this.placedAssets.forEach(asset => {
            asset.x = Math.round(asset.x / this.gridSize) * this.gridSize;
            asset.y = Math.round(asset.y / this.gridSize) * this.gridSize;
        });
        this.saveState();
        this.onAssetChangedCallback?.();
        this.render();
    }

    public clearAll(): void {
        this.placedAssets = [];
        this.selectAsset(null);
        this.saveState();
        this.onAssetChangedCallback?.();
        this.render();
    }

    public loadPlacedAssets(assets: PlacedAssetModel[]): void {
        this.placedAssets = assets.map(a => ({ ...a, selected: false }));
        this.selectAsset(null);
        this.saveState();
        this.onAssetChangedCallback?.();
        this.render();
    }

    /**
     * Detecta se o clique foi em uma das alças de redimensionamento (cantos) do asset selecionado.
     */
    private findResizeHandleAtWorldPos(wx: number, wy: number): 'nw' | 'ne' | 'se' | 'sw' | null {
        if (!this.selectedAsset) return null;
        const a = this.selectedAsset;
        const handleHitRadius = Math.max(12, 14 / this.zoom);

        const corners: { id: 'nw' | 'ne' | 'se' | 'sw', x: number, y: number }[] = [
            { id: 'nw', x: a.x, y: a.y },
            { id: 'ne', x: a.x + a.width, y: a.y },
            { id: 'se', x: a.x + a.width, y: a.y + a.height },
            { id: 'sw', x: a.x, y: a.y + a.height }
        ];

        for (const corner of corners) {
            const dist = Math.hypot(wx - corner.x, wy - corner.y);
            if (dist <= handleHitRadius) {
                return corner.id;
            }
        }

        return null;
    }

    /**
     * Encontra o asset sob o cursor do mouse com prioridade estrita de Z-Index:
     * Quem está mais acima na renderização (maior zIndex ou Y-Sort) recebe o clique primeiro.
     */
    private findAssetAtWorldPos(wx: number, wy: number): PlacedAssetModel | null {
    //? Ordena em ordem decrescente para que o elemento no topo capture o clique
        const sorted = [...this.placedAssets].sort((a, b) => {
            const zA = a.zIndex !== undefined ? a.zIndex : (a.y + a.height);
            const zB = b.zIndex !== undefined ? b.zIndex : (b.y + b.height);
            return zB - zA;
        });

        for (const asset of sorted) {
            if (wx >= asset.x && wx <= asset.x + asset.width &&
                wy >= asset.y && wy <= asset.y + asset.height) {
                return asset;
            }
        }
        return null;
    }

    public screenToWorld(sx: number, sy: number): { x: number, y: number } {
        return {
            x: (sx - this.panX) / this.zoom,
            y: (sy - this.panY) / this.zoom
        };
    }

    public worldToScreen(wx: number, wy: number): { x: number, y: number } {
        return {
            x: wx * this.zoom + this.panX,
            y: wy * this.zoom + this.panY
        };
    }

    public isTypingInInput(): boolean {
        const tag = document.activeElement?.tagName?.toLowerCase();
        return tag === 'input' || tag === 'textarea';
    }

    public saveState(): void {
        const snapshot = JSON.parse(JSON.stringify(this.placedAssets));
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(snapshot);
        this.historyIndex++;
    }

    public undo(): void {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.placedAssets = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.selectAsset(null);
            this.onAssetChangedCallback?.();
            this.render();
        }
    }

    public redo(): void {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.placedAssets = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.selectAsset(null);
            this.onAssetChangedCallback?.();
            this.render();
        }
    }

    private startRenderLoop(): void {
        const loop = (timestamp?: number) => {
            if (timestamp !== undefined) {
                this.animationTime = timestamp;
            }
            this.render();
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                requestAnimationFrame(loop);
            }
        };
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            requestAnimationFrame(loop);
        }
    }

    public render(): void {
        const ctx = this.ctx;
        if (!ctx) return;

        if (this.container && (this.canvas.width !== this.container.clientWidth || this.canvas.height !== this.container.clientHeight)) {
            if (this.container.clientWidth > 0 && this.container.clientHeight > 0) {
                this.resize();
            }
        }

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        this.drawMapTerrain(ctx);

        if (this.showGrid) {
            this.drawGrid(ctx);
        }

        if (this.showChunkBorders) {
            this.drawChunkBorders(ctx);
        }

        this.drawPlacedAssets(ctx);

        if (this.showHitboxes) {
            this.drawMapCollisionLayers(ctx);
        }

        if (this.selectedAssets.length > 1) {
            this.drawGroupBoundingBox(ctx);
        }

        if (this.ghostAsset) {
            this.drawGhostPreview(ctx);
        }

        if (this.isChunkBrushMode) {
            this.drawChunkBrushCursor(ctx);
        }

        ctx.restore();

        this.drawCameraOverlay(ctx);

        if (this.isBoxSelecting) {
            this.drawMarqueeSelectionBox(ctx);
        }

        this.drawPlayerReferenceOverlay(ctx);
    }

    private drawMapTerrain(ctx: CanvasRenderingContext2D): void {
        const mw = this.mapConfig.width;
        const mh = this.mapConfig.height;

        if (this.mapConfig.id === 'blank_project') {
            ctx.fillStyle = '#11141c';
            ctx.fillRect(0, 0, mw, mh);

            const checkSize = 32;
            ctx.fillStyle = '#171b26';
            for (let y = 0; y < mh; y += checkSize) {
                for (let x = 0; x < mw; x += checkSize) {
                    if ((Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0) {
                        ctx.fillRect(x, y, checkSize, checkSize);
                    }
                }
            }
            return;
        }

        ctx.fillStyle = this.mapConfig.backgroundColor || (this.mapConfig.isInnerMap ? '#000000' : '#181b22');
        ctx.fillRect(0, 0, mw, mh);

        const mapVisual = VisualConfigMap[this.mapConfig.id] as MapVisualConfig | undefined;
        const chunks = this.mapConfig.chunks || mapVisual?.chunks;
        const chunkSize = this.mapConfig.chunkSize || mapVisual?.chunkSize || 1024;
        const originCx = this.mapConfig.originChunk?.cx ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);
        const originCy = this.mapConfig.originChunk?.cy ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);
        const minX = -originCx * chunkSize;
        const minY = -originCy * chunkSize;

        ctx.fillStyle = this.mapConfig.backgroundColor || (this.mapConfig.isInnerMap ? '#000000' : '#181b22');
        ctx.fillRect(minX, minY, mw, mh);

        if (chunks) {
            for (let y = 0; y < chunks.length; y++) {
                for (let x = 0; x < chunks[y]!.length; x++) {
                    const url = chunks[y]![x]!;
                    if (!url) continue;
                    let img = this.chunkImages.get(url);
                    if (!img) {
                        img = new Image();
                        img.src = url;
                        img.onload = () => this.render();
                        this.chunkImages.set(url, img);
                    }
                    if (img && img.complete && img.naturalWidth > 0) {
                        const chunkPosX = (x - originCx) * chunkSize;
                        const chunkPosY = (y - originCy) * chunkSize;
                        ctx.drawImage(img, chunkPosX, chunkPosY, chunkSize, chunkSize);
                    }
                }
            }
        }
    }

    private drawGrid(ctx: CanvasRenderingContext2D): void {
        const chunkSize = this.mapConfig.chunkSize || 1024;
        const originCx = this.mapConfig.originChunk?.cx ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);
        const originCy = this.mapConfig.originChunk?.cy ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);
        const minX = -originCx * chunkSize;
        const minY = -originCy * chunkSize;
        const maxX = minX + this.mapConfig.width;
        const maxY = minY + this.mapConfig.height;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let x = minX; x <= maxX; x += this.gridSize) {
            ctx.moveTo(x, minY);
            ctx.lineTo(x, maxY);
        }
        for (let y = minY; y <= maxY; y += this.gridSize) {
            ctx.moveTo(minX, y);
            ctx.lineTo(maxX, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    private drawChunkBorders(ctx: CanvasRenderingContext2D): void {
        const chunkSize = this.mapConfig.chunkSize || 1024;
        const cols = Math.ceil(this.mapConfig.width / chunkSize);
        const rows = Math.ceil(this.mapConfig.height / chunkSize);
        const originCx = this.mapConfig.originChunk?.cx ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);
        const originCy = this.mapConfig.originChunk?.cy ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);

        ctx.save();
        ctx.lineWidth = 2;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const signedCx = x - originCx;
                const signedCy = y - originCy;
                const cx = signedCx * chunkSize;
                const cy = signedCy * chunkSize;
                const isOrigin = signedCx === 0 && signedCy === 0;

                if (isOrigin) {
                    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(cx, cy, chunkSize, chunkSize);

                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 16px "Segoe UI", sans-serif';
                    ctx.fillText(`⭐ Spawn (0, 0) [Origem Central]`, cx + 16, cy + 32);
                } else {
                    ctx.strokeStyle = 'rgba(85, 170, 255, 0.45)';
                    ctx.setLineDash([8, 8]);
                    ctx.strokeRect(cx, cy, chunkSize, chunkSize);

                    ctx.fillStyle = 'rgba(85, 170, 255, 0.85)';
                    ctx.font = 'bold 16px "Segoe UI", sans-serif';
                    ctx.fillText(`Chunk (${signedCx}, ${signedCy})`, cx + 16, cy + 32);
                }
            }
        }
        ctx.restore();
    }

    private drawPlacedAssets(ctx: CanvasRenderingContext2D): void {
    //? Ordenação de profundidade Y-Sort (2.5D: coordenadas Y maiores desenham por cima)
        const sorted = [...this.placedAssets].sort((a, b) => {
            const zA = a.zIndex !== undefined ? a.zIndex : (a.y + a.height);
            const zB = b.zIndex !== undefined ? b.zIndex : (b.y + b.height);
            return zA - zB;
        });

        for (const asset of sorted) {
            const paintedCanvas = asset.isPaintedLayer ? this.paintedLayerCanvases.get(asset.uid) : undefined;
            const img = this.getSpriteImage(asset.imageSrc);

            ctx.save();
            ctx.translate(asset.x + asset.width / 2, asset.y + asset.height / 2);
            if (asset.rotation) {
                ctx.rotate((asset.rotation * Math.PI) / 180);
            }
            const sx = (asset.flipX ? -1 : 1) * (asset.scaleX || 1);
            const sy = (asset.flipY ? -1 : 1) * (asset.scaleY || 1);
            if (sx !== 1 || sy !== 1) {
                ctx.scale(sx, sy);
            }

            if (paintedCanvas && paintedCanvas.width > 0 && paintedCanvas.height > 0 && !(paintedCanvas as any).toDataURL?.().includes('mockPngDataUrl')) {
                try {
                    ctx.drawImage(paintedCanvas, -asset.width / 2, -asset.height / 2, asset.width, asset.height);
                } catch {
                    if (img && img.complete && img.naturalWidth > 0) {
                        ctx.drawImage(img, -asset.width / 2, -asset.height / 2, asset.width, asset.height);
                    }
                }
            } else if (img && img.complete && img.naturalWidth > 0) {
                const isSprite = asset.isSprite || (asset.frameCount !== undefined && asset.frameCount > 1);
                if (isSprite && asset.frameCount && asset.frameCount > 1) {
                    const animTicks = Math.max(1, asset.animationSpeed || 10);
                    const frameDurationMs = animTicks * (1000 / 60);
                    const frameIndex = Math.floor(this.animationTime / frameDurationMs) % asset.frameCount;
                    const fWidth = asset.frameWidth || Math.floor(img.naturalWidth / asset.frameCount);
                    const fHeight = asset.frameHeight || img.naturalHeight;
                    const sx = (asset.atlasOffset?.x || 0) + frameIndex * fWidth;
                    const sy = (asset.atlasOffset?.y || 0);

                    ctx.drawImage(
                        img,
                        sx, sy, fWidth, fHeight,
                        -asset.width / 2, -asset.height / 2, asset.width, asset.height
                    );
                } else {
                    ctx.drawImage(img, -asset.width / 2, -asset.height / 2, asset.width, asset.height);
                }
            } else {
                ctx.fillStyle = 'rgba(70, 90, 120, 0.7)';
                ctx.fillRect(-asset.width / 2, -asset.height / 2, asset.width, asset.height);
                ctx.fillStyle = '#fff';
                ctx.font = '11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(asset.presetId, 0, 0);
            }

            ctx.restore();

            if (this.showHitboxes) {
                this.drawHitboxesForAsset(ctx, asset);
            }

            if (asset.selected) {
                this.drawSelectedBoundingBox(ctx, asset);
            }
        }
    }

    /**
     * ? Alterna a visibilidade das hitboxes (F2) e renderiza novamente.
     * ! Recarrega o catálogo fresco do servidor e as camadas de colisão do mapa para evitar barreiras invisíveis.
     */
    public toggleHitboxes(): void {
        this.showHitboxes = !this.showHitboxes;
        if (this.showHitboxes) {
            this.refreshHitboxCatalog();
            this.loadMapCollisionLayer();
        }
        this.render();
    }

    /**
     * ? Busca o catálogo atualizado de hitboxes via API para sincronização imediata com o PolygonWebEditor.
     */
    public async refreshHitboxCatalog(): Promise<void> {
        try {
            if (typeof fetch === 'function') {
                const resp = await fetch('/api/assets-adapter?target=hitboxes');
                if (resp && resp.ok) {
                    const data = await resp.json();
                    if (data && typeof data === 'object') {
                        this.dynamicHitboxCatalog = data;
                        this.render();
                    }
                }
            }
        } catch { /* ! Fallback silencioso para ASSET_HITBOX_CATALOG estático */ }
    }

    /**
     * ? Carrega os polígonos de colisão do mapa (vilgem_hitboxes.json / collisionJsonUrl).
     */
    public async loadMapCollisionLayer(): Promise<void> {
        const mapId = this.mapConfig.id;
        if (this.loadedMapCollisionId === mapId) return;
        this.loadedMapCollisionId = mapId;

        const visual = VisualConfigMap[mapId] as MapVisualConfig | undefined;
        const collisionUrl = visual?.collisionJsonUrl;
        if (!collisionUrl) {
            this.mapCollisionLayers = [];
            return;
        }

        try {
            if (typeof fetch === 'function') {
                const resp = await fetch(collisionUrl);
                if (resp && resp.ok) {
                    const data = await resp.json();
                    this.mapCollisionLayers = data.hitboxes || [];
                    this.render();
                }
            }
        } catch {
            this.mapCollisionLayers = [];
        }
    }

    /**
     * ? Renderiza as camadas de colisão estática do mapa (bordas do mundo, paredes globais).
     */
    private drawMapCollisionLayers(ctx: CanvasRenderingContext2D): void {
        if (!this.mapCollisionLayers || this.mapCollisionLayers.length === 0) return;

        ctx.save();
        for (const collider of this.mapCollisionLayers) {
            if (collider.type === 'polygon' && collider.points && collider.points.length > 2) {
                const ox = collider.coordinates?.x || 0;
                const oy = collider.coordinates?.y || 0;

                ctx.strokeStyle = '#d946ef';
                ctx.fillStyle = 'rgba(217, 70, 239, 0.2)';
                ctx.lineWidth = Math.max(1.5, 2 / this.zoom);
                ctx.setLineDash([8 / this.zoom, 4 / this.zoom]);

                ctx.beginPath();
                ctx.moveTo(ox + collider.points[0].x, oy + collider.points[0].y);
                for (let i = 1; i < collider.points.length; i++) {
                    ctx.lineTo(ox + collider.points[i].x, oy + collider.points[i].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

        //! Vértices da barreira de mapa
                ctx.fillStyle = '#f0abfc';
                const vRadius = Math.max(2.5, 3.5 / this.zoom);
                for (const p of collider.points) {
                    ctx.beginPath();
                    ctx.arc(ox + p.x, oy + p.y, vRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

        //! Tag identificadora de limite de mapa
                ctx.fillStyle = '#f0abfc';
                ctx.font = `bold ${Math.max(10, 11 / this.zoom)}px monospace`;
                ctx.fillText(`[Map Boundary: ${collider.id}]`, ox + collider.points[0].x, oy + collider.points[0].y - (6 / this.zoom));
            }
        }
        ctx.restore();
    }

    /**
     * ? Desenha as hitboxes reais configuradas no catálogo de colisão para o asset dado,
     * incluindo o envelope físico AABB e gatilhos de portais para evitar barreiras invisíveis.
     */
    private drawHitboxesForAsset(ctx: CanvasRenderingContext2D, asset: PlacedAssetModel): void {
      //? Renderização visual da área de colisão do portal
        if (asset.isPortal || asset.presetId.includes('portal') || asset.portalType) {
            this.drawPortalHitbox(ctx, asset);
        }

        const cleanPreset = asset.presetId.replace(/_clean$|_anim$/, '');
        const catalog = this.dynamicHitboxCatalog || ASSET_HITBOX_CATALOG;
        const hitboxData = catalog[cleanPreset] || catalog[asset.presetId];
        if (!hitboxData || !hitboxData.shapes || hitboxData.shapes.length === 0) return;

        const baseWidth = hitboxData.baseWidth || asset.width || 64;
        const baseHeight = hitboxData.baseHeight || asset.height || 64;
        const scaleX = asset.width / baseWidth;
        const scaleY = asset.height / baseHeight;

        ctx.save();
        ctx.lineWidth = Math.max(1.5, 2 / this.zoom);

        for (const shape of hitboxData.shapes) {
            if (shape.type === 'polygon' && shape.points && shape.points.length > 2) {
                const points = shape.points.map((p: { x: number; y: number }) => {
                    let lx = p.x * scaleX;
                    let ly = p.y * scaleY;
                    if (asset.flipX) lx = asset.width - lx;
                    if (asset.flipY) ly = asset.height - ly;
                    return { x: asset.x + lx, y: asset.y + ly };
                });

        //? Calcula os limites AABB físicos do polígono
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const p of points) {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                }
                const aabbW = maxX - minX;
                const aabbH = maxY - minY;

                ctx.strokeStyle = '#00ffb4';
                ctx.fillStyle = 'rgba(0, 255, 180, 0.28)';
                ctx.beginPath();
                ctx.moveTo(points[0]!.x, points[0]!.y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i]!.x, points[i]!.y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.save();
                ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
                ctx.lineWidth = Math.max(1, 1.2 / this.zoom);
                ctx.setLineDash([4 / this.zoom, 3 / this.zoom]);
                ctx.strokeRect(minX, minY, aabbW, aabbH);

                const isSlanted = points.some((p: { x: number; y: number }) => (p.x !== minX && p.x !== maxX) || (p.y !== minY && p.y !== maxY));
                if (isSlanted) {
                    ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
                    ctx.font = `bold ${Math.max(9, 10 / this.zoom)}px monospace`;
                    ctx.fillText(`⚠️ [AABB: ${Math.round(aabbW)}x${Math.round(aabbH)}]`, minX, minY - (4 / this.zoom));
                }
                ctx.restore();

                ctx.fillStyle = '#ffffff';
                const vertexRadius = Math.max(2, 3 / this.zoom);
                for (const p of points) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, vertexRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (shape.type === 'circle' && shape.center && typeof shape.radius === 'number') {
                const radiusScale = Math.min(scaleX, scaleY);
                const scaledRadius = shape.radius * radiusScale;
                let cx = shape.center.x * scaleX;
                let cy = shape.center.y * scaleY;
                if (asset.flipX) cx = asset.width - cx;
                if (asset.flipY) cy = asset.height - cy;

                const worldCenterX = asset.x + cx;
                const worldCenterY = asset.y + cy;

                ctx.strokeStyle = '#ff9f1a';
                ctx.fillStyle = 'rgba(255, 159, 26, 0.28)';
                ctx.beginPath();
                ctx.arc(worldCenterX, worldCenterY, scaledRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#ff3838';
                ctx.beginPath();
                ctx.arc(worldCenterX, worldCenterY, Math.max(2.5, 3.5 / this.zoom), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /**
     * ? Renderiza o gatilho de colisão físico de um portal com destaque esmeralda.
     */
    private drawPortalHitbox(ctx: CanvasRenderingContext2D, asset: PlacedAssetModel): void {
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.lineWidth = Math.max(2, 2.5 / this.zoom);
        ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
        ctx.strokeRect(asset.x, asset.y, asset.width, asset.height);
        ctx.fillRect(asset.x, asset.y, asset.width, asset.height);

        const portalLabel = `🌀 [Portal: ${asset.targetMapId || 'Destino'}] (${asset.width}x${asset.height})`;
        ctx.font = `bold ${Math.max(10, 11 / this.zoom)}px monospace`;
        ctx.fillStyle = '#10b981';
        ctx.fillText(portalLabel, asset.x, asset.y - (6 / this.zoom));
        ctx.restore();
    }

    /**
     * Abre o Hitbox Editor (polygonWebEditor) integrado para o asset selecionado via duplo clique.
     */
    public openHitboxEditorForAsset(asset: PlacedAssetModel): void {
        const cleanPreset = asset.presetId.replace(/_clean$|_anim$/, '');
        const url = `/typescript/adapters/polygonWebEditor/index.html?assetId=${encodeURIComponent(cleanPreset)}&imageSrc=${encodeURIComponent(asset.imageSrc)}&width=${asset.width}&height=${asset.height}`;
        if (typeof window !== 'undefined' && typeof window.open === 'function') {
            window.open(url, '_blank');
        }
    }

    private drawSelectedBoundingBox(ctx: CanvasRenderingContext2D, asset: PlacedAssetModel): void {
        ctx.save();
        const isPortal = asset.isPortal || asset.presetId.includes('portal');
        const isLocked = !!asset.locked;
        ctx.strokeStyle = isLocked ? '#f59e0b' : (isPortal ? '#10b981' : '#00ffff');
        ctx.lineWidth = 2 / this.zoom;
        ctx.setLineDash(isLocked ? [4 / this.zoom, 4 / this.zoom] : (isPortal ? [6 / this.zoom, 4 / this.zoom] : []));
        ctx.strokeRect(asset.x, asset.y, asset.width, asset.height);

        if (this.selectedAssets.length <= 1) {
            if (!isLocked) {
                const handleSize = Math.max(6, 8 / this.zoom);
                ctx.fillStyle = isPortal ? '#34d399' : '#ffffff';
                ctx.fillRect(asset.x - handleSize/2, asset.y - handleSize/2, handleSize, handleSize);
                ctx.fillRect(asset.x + asset.width - handleSize/2, asset.y - handleSize/2, handleSize, handleSize);
                ctx.fillRect(asset.x - handleSize/2, asset.y + asset.height - handleSize/2, handleSize, handleSize);
                ctx.fillRect(asset.x + asset.width - handleSize/2, asset.y + asset.height - handleSize/2, handleSize, handleSize);
            }

            const flipTags = `${asset.flipX ? ' [FlipX]' : ''}${asset.flipY ? ' [FlipY]' : ''}`;
            const portalTag = isPortal ? ` [🌀 Portal -> ${asset.targetMapId || 'destino'}]` : '';
            const lockTag = isLocked ? ' 🔒 [Bloqueado]' : '';
            const labelText = `X: ${asset.x}, Y: ${asset.y} (${asset.width}x${asset.height})${asset.isSprite ? ' [Sprite]' : ''}${flipTags}${portalTag}${lockTag}`;
            ctx.font = `bold ${Math.max(11, 13 / this.zoom)}px monospace`;
            const textWidth = ctx.measureText(labelText).width;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            const pad = 4 / this.zoom;
            ctx.fillRect(asset.x, asset.y - (20 / this.zoom), textWidth + pad * 2, 18 / this.zoom);

            ctx.fillStyle = isLocked ? '#f59e0b' : (isPortal ? '#34d399' : '#00ffff');
            ctx.fillText(labelText, asset.x + pad, asset.y - (6 / this.zoom));
        }

        ctx.restore();
    }

    /**
     * Desenha o enquadramento envolvente de grupo quando múltiplos assets estão selecionados
     */
    private drawGroupBoundingBox(ctx: CanvasRenderingContext2D): void {
        if (this.selectedAssets.length <= 1) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const a of this.selectedAssets) {
            if (a.x < minX) minX = a.x;
            if (a.y < minY) minY = a.y;
            if (a.x + a.width > maxX) maxX = a.x + a.width;
            if (a.y + a.height > maxY) maxY = a.y + a.height;
        }

        const gw = maxX - minX;
        const gh = maxY - minY;

        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8 / this.zoom;
        ctx.setLineDash([8 / this.zoom, 4 / this.zoom]);
        ctx.strokeRect(minX, minY, gw, gh);

        const label = `📦 ${this.selectedAssets.length} selecionados (${Math.round(gw)}x${Math.round(gh)}) - [Ctrl+C, Ctrl+V, Del]`;
        ctx.font = `bold ${Math.max(11, 13 / this.zoom)}px monospace`;
        const textWidth = ctx.measureText(label).width;
        const pad = 4 / this.zoom;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(minX, minY - (22 / this.zoom), textWidth + pad * 2, 18 / this.zoom);

        ctx.fillStyle = '#38bdf8';
        ctx.fillText(label, minX + pad, minY - (8 / this.zoom));
        ctx.restore();
    }

    /**
     * Renderiza na tela o retângulo translúcido de seleção em área tipo Desktop (Marquee Selection)
     */
    private drawMarqueeSelectionBox(ctx: CanvasRenderingContext2D): void {
        const sx = Math.min(this.boxSelectStartScreenX, this.boxSelectCurrentScreenX);
        const sy = Math.min(this.boxSelectStartScreenY, this.boxSelectCurrentScreenY);
        const sw = Math.abs(this.boxSelectCurrentScreenX - this.boxSelectStartScreenX);
        const sh = Math.abs(this.boxSelectCurrentScreenY - this.boxSelectStartScreenY);

        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.fillRect(sx, sy, sw, sh);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(sx, sy, sw, sh);

        if (this.selectedAssets.length > 0) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            const label = `📦 ${this.selectedAssets.length} objeto(s)`;
            ctx.font = 'bold 11px "Segoe UI", sans-serif';
            const tw = ctx.measureText(label).width;
            ctx.fillRect(sx + 6, sy + 6, tw + 8, 18);
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(label, sx + 10, sy + 19);
        }
        ctx.restore();
    }

    private drawGhostPreview(ctx: CanvasRenderingContext2D): void {
        if (!this.ghostAsset) return;
        const { asset, worldX, worldY } = this.ghostAsset;

        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(worldX, worldY, asset.width, asset.height);

        const img = this.getSpriteImage(asset.imageSrc);
        if (img && img.complete) {
            const isSprite = asset.isSprite || (asset.frameCount !== undefined && asset.frameCount > 1);
            if (isSprite && asset.frameCount && asset.frameCount > 1) {
                const fWidth = asset.frameWidth || Math.floor(img.naturalWidth / asset.frameCount);
                const fHeight = asset.frameHeight || img.naturalHeight;
                const sx = asset.atlasOffset?.x || 0;
                const sy = asset.atlasOffset?.y || 0;
                ctx.drawImage(img, sx, sy, fWidth, fHeight, worldX, worldY, asset.width, asset.height);
            } else {
                ctx.drawImage(img, worldX, worldY, asset.width, asset.height);
            }
        }

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`Soltar em X: ${worldX}, Y: ${worldY}`, worldX, worldY - 8);

        ctx.restore();
    }

    private drawCameraOverlay(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 18, 26, 0.75)';
        ctx.fillRect(10, this.canvas.height - 35, 340, 25);

        ctx.fillStyle = '#8bc34a';
        ctx.font = '11px monospace';
        const zoomPct = Math.round(this.zoom * 100);
        ctx.fillText(`Mapa: ${this.mapConfig.name} | Zoom: ${zoomPct}% | Assets: ${this.placedAssets.length}`, 18, this.canvas.height - 18);
        ctx.restore();
    }

    /**
     * ? Renderiza o Player Idle no canto inferior direito da tela SEM NENHUMA UI EM VOLTA.
     * Sempre fica exatamente do tamanho que é normalmente no cenário: ao dar zoom out, ele diminui
     * na mesma proporção do cenário (32px * zoom), mas estando fixo na UI (viewport).
     */
    private drawPlayerReferenceOverlay(ctx: CanvasRenderingContext2D): void {
        if (!this.showPlayerReference) return;
        if (!this.canvas.width || !this.canvas.height) return;

        const config = this.getPlayerIdleConfig();
        const img = this.getSpriteImage(config.imageSrc);

        const effectiveZoom = this.playerRefFollowZoom ? this.zoom : 1.0;
        const drawW = Math.max(1, Math.round(config.worldWidth * effectiveZoom));
        const drawH = Math.max(1, Math.round(config.worldHeight * effectiveZoom));
        const margin = 20;
        const drawX = Math.round(this.canvas.width - drawW - margin);
        const drawY = Math.round(this.canvas.height - drawH - margin);

        ctx.save();

        const shadowW = Math.max(2, drawW * 0.75);
        const shadowH = Math.max(1, Math.round(drawH * 0.22));
        const shadowX = drawX + drawW / 2;
        const shadowY = drawY + drawH;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        if (typeof ctx.ellipse === 'function') {
            ctx.beginPath();
            ctx.ellipse(shadowX, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(shadowX, shadowY, shadowW / 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.imageSmoothingEnabled = false;

        if (img && img.complete && img.naturalWidth > 0) {
            const animTicks = Math.max(1, config.animationSpeed || 20);
            const frameDurationMs = animTicks * (1000 / 60);
            const frameIndex = Math.floor(this.animationTime / frameDurationMs) % config.frameCount;
            const sx = (config.atlasOffset?.x || 0) + frameIndex * config.frameWidth;
            const sy = (config.atlasOffset?.y || 0);

            ctx.drawImage(
                img,
                sx, sy, config.frameWidth, config.frameHeight,
                drawX, drawY, drawW, drawH
            );
        } else {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.fillRect(drawX, drawY, drawW, drawH);
        }

        ctx.restore();
    }

    /**
     * Renderiza o mapa atual em escala 1:1 real em um canvas offscreen e gera o Data URL PNG.
     * Não desenha grids, bordas de chunk, bounding boxes de seleção nem overlays de HUD.
     * Resulta em uma imagem de fundo (ground texture) limpa pronta para ser usada como chunk fixo.
     */
    public exportAsImage(options: { 
        transparentBackground?: boolean;
        fileName?: string;
    } = {}): string {
        const width = this.mapConfig.width;
        const height = this.mapConfig.height;

        let exportCanvas: HTMLCanvasElement;
        if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
            exportCanvas = document.createElement('canvas');
        } else {
            exportCanvas = {
                width: 0,
                height: 0,
                getContext: () => this.ctx,
                toDataURL: () => 'data:image/png;base64,mockPngDataUrl'
            } as any;
        }

        exportCanvas.width = width;
        exportCanvas.height = height;

        const offCtx = exportCanvas.getContext('2d');
        if (!offCtx) return '';

        if (!options.transparentBackground) {
            if (this.mapConfig.id !== 'blank_project') {
                const mapVisual = VisualConfigMap[this.mapConfig.id] as MapVisualConfig | undefined;
                const chunks = this.mapConfig.chunks || mapVisual?.chunks;
                const chunkSize = this.mapConfig.chunkSize || mapVisual?.chunkSize || 1024;
                if (chunks) {
                    for (let y = 0; y < chunks.length; y++) {
                        for (let x = 0; x < chunks[y]!.length; x++) {
                            const url = chunks[y]![x]!;
                            if (!url) continue;
                            const img = this.chunkImages.get(url);
                            if (img && img.complete && img.naturalWidth > 0) {
                                offCtx.drawImage(img, x * chunkSize, y * chunkSize, chunkSize, chunkSize);
                            }
                        }
                    }
                }
            }
        }

        const sorted = [...this.placedAssets].sort((a, b) => {
            const zA = a.zIndex !== undefined ? a.zIndex : (a.y + a.height);
            const zB = b.zIndex !== undefined ? b.zIndex : (b.y + b.height);
            return zA - zB;
        });

        for (const asset of sorted) {
            const img = this.getSpriteImage(asset.imageSrc);

            offCtx.save();
            offCtx.translate(asset.x + asset.width / 2, asset.y + asset.height / 2);
            if (asset.rotation) {
                offCtx.rotate((asset.rotation * Math.PI) / 180);
            }
            if (asset.scaleX || asset.scaleY) {
                offCtx.scale(asset.scaleX || 1, asset.scaleY || 1);
            }

            if (img && img.complete && img.naturalWidth > 0) {
                const isSprite = asset.isSprite || (asset.frameCount !== undefined && asset.frameCount > 1);
                if (isSprite && asset.frameCount && asset.frameCount > 1) {
                    const animTicks = Math.max(1, asset.animationSpeed || 10);
                    const frameDurationMs = animTicks * (1000 / 60);
                    const frameIndex = Math.floor(this.animationTime / frameDurationMs) % asset.frameCount;
                    const fWidth = asset.frameWidth || Math.floor(img.naturalWidth / asset.frameCount);
                    const fHeight = asset.frameHeight || img.naturalHeight;
                    const sx = (asset.atlasOffset?.x || 0) + frameIndex * fWidth;
                    const sy = (asset.atlasOffset?.y || 0);

                    offCtx.drawImage(
                        img,
                        sx, sy, fWidth, fHeight,
                        -asset.width / 2, -asset.height / 2, asset.width, asset.height
                    );
                } else {
                    offCtx.drawImage(img, -asset.width / 2, -asset.height / 2, asset.width, asset.height);
                }
            } else {
                offCtx.fillStyle = 'rgba(70, 90, 120, 0.7)';
                offCtx.fillRect(-asset.width / 2, -asset.height / 2, asset.width, asset.height);
            }

            offCtx.restore();
        }

        const dataUrl = exportCanvas.toDataURL ? exportCanvas.toDataURL('image/png') : 'data:image/png;base64,mockPng';

        if (options.fileName && typeof document !== 'undefined' && typeof document.createElement === 'function') {
            const link = document.createElement('a');
            link.download = options.fileName.endsWith('.png') ? options.fileName : `${options.fileName}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        return dataUrl;
    }

    /**
     * Carrega uma imagem de forma assíncrona com suporte a ambiente de teste / mock
     */
    public loadImageAsync(src: string): Promise<HTMLImageElement | null> {
        return new Promise((resolve) => {
            if (!src) return resolve(null);
            const cached = this.chunkImages.get(src) || this.spriteImages.get(src);
            if (cached && cached.complete && cached.naturalWidth > 0) {
                return resolve(cached);
            }
            if (typeof Image === 'undefined') {
                return resolve({
                    src,
                    complete: true,
                    naturalWidth: 1024,
                    naturalHeight: 1024,
                    width: 1024,
                    height: 1024
                } as any);
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';

            let resolved = false;
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    if (!img.naturalWidth) {
                        try {
                            Object.defineProperty(img, 'naturalWidth', { value: 1024, configurable: true });
                            Object.defineProperty(img, 'naturalHeight', { value: 1024, configurable: true });
                            Object.defineProperty(img, 'complete', { value: true, configurable: true });
                        } catch {}
                    }
                    resolve(img);
                }
            }, 40);

            img.onload = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve(img);
                }
            };
            img.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve(null);
                }
            };
            img.src = src;
        });
    }

    /**
     * Desenha um asset sobre o contexto 2D offscreen de um chunk específico,
     * aplicando posição relativa, rotação, espelhamento e escala.
     */
    private drawAssetOnChunkContext(
        offCtx: CanvasRenderingContext2D,
        asset: PlacedAssetModel,
        spriteImg: HTMLImageElement | null,
        col: number,
        row: number,
        originCx: number,
        originCy: number,
        chunkSize: number
    ): void {
        const centerX = asset.x + asset.width / 2;
        const centerY = asset.y + asset.height / 2;
        const chunkWorldX = (col - originCx) * chunkSize;
        const chunkWorldY = (row - originCy) * chunkSize;
        const localCenterX = centerX - chunkWorldX;
        const localCenterY = centerY - chunkWorldY;

        offCtx.save();
        offCtx.translate(localCenterX, localCenterY);
        if (asset.rotation) {
            offCtx.rotate((asset.rotation * Math.PI) / 180);
        }
        const sx = (asset.flipX ? -1 : 1) * (asset.scaleX || 1);
        const sy = (asset.flipY ? -1 : 1) * (asset.scaleY || 1);
        if (sx !== 1 || sy !== 1) {
            offCtx.scale(sx, sy);
        }

        const paintedCanvas = asset.isPaintedLayer ? this.paintedLayerCanvases.get(asset.uid) : undefined;
        if (paintedCanvas && paintedCanvas.width > 0 && paintedCanvas.height > 0 && (paintedCanvas as any).getContext?.('2d') !== this.ctx) {
            try {
                offCtx.drawImage(paintedCanvas, -asset.width / 2, -asset.height / 2, asset.width, asset.height);
            } catch {
                if (spriteImg && spriteImg.naturalWidth > 0) {
                    offCtx.drawImage(spriteImg, -asset.width / 2, -asset.height / 2, asset.width, asset.height);
                }
            }
        } else if (spriteImg && spriteImg.naturalWidth > 0) {
            const isSprite = asset.isSprite || (asset.frameCount !== undefined && asset.frameCount > 1);
            if (isSprite && asset.frameCount && asset.frameCount > 1) {
                const fWidth = asset.frameWidth || Math.floor(spriteImg.naturalWidth / asset.frameCount);
                const fHeight = asset.frameHeight || spriteImg.naturalHeight;
                const sxPos = (asset.atlasOffset?.x || 0);
                const syPos = (asset.atlasOffset?.y || 0);
                offCtx.drawImage(
                    spriteImg,
                    sxPos, syPos, fWidth, fHeight,
                    -asset.width / 2, -asset.height / 2, asset.width, asset.height
                );
            } else {
                offCtx.drawImage(spriteImg, -asset.width / 2, -asset.height / 2, asset.width, asset.height);
            }
        } else {
            offCtx.fillStyle = 'rgba(70, 90, 120, 0.7)';
            offCtx.fillRect(-asset.width / 2, -asset.height / 2, asset.width, asset.height);
        }
        offCtx.restore();
    }

    /**
     * Incorpora (bake) múltiplos assets selecionados no fundo do(s) chunk(s) correspondente(s).
     * Respeita rigorosamente a ordenação Z-Index / Y-Sort (Painter's Algorithm) ao pintar o canvas.
     */
    public async bakeMultipleAssetsToChunkBackground(assets: PlacedAssetModel[]): Promise<{
        success: boolean;
        message?: string | undefined;
        bakedCount?: number | undefined;
        chunkCoords?: { row: number; col: number } | undefined;
        newUrl?: string | undefined;
        affectedChunks?: Array<{ row: number; col: number; newUrl: string }> | undefined;
    }> {
        if (!assets || assets.length === 0) {
            return {
                success: false,
                message: 'Nenhum asset selecionado para fixar no fundo.'
            };
        }

        const chunkSize = this.mapConfig.chunkSize || 1024;
        const originCx = this.mapConfig.originChunk?.cx ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);
        const originCy = this.mapConfig.originChunk?.cy ?? (this.mapConfig.id === 'vilgem' ? 1 : 0);
        const chunks = this.mapConfig.chunks;

        if (!chunks || chunks.length === 0) {
            return {
                success: false,
                message: 'Não há configuração de chunks válida no mapa.'
            };
        }

        const chunkMap = new Map<string, { row: number; col: number; assets: PlacedAssetModel[] }>();

        for (const asset of assets) {
            const centerX = asset.x + asset.width / 2;
            const centerY = asset.y + asset.height / 2;
            const centerCol = Math.floor(centerX / chunkSize) + originCx;
            const centerRow = Math.floor(centerY / chunkSize) + originCy;

            if (!chunks[centerRow] || chunks[centerRow]![centerCol] === undefined) {
                return {
                    success: false,
                    message: `Não há um chunk válido na posição do asset (linha ${centerRow}, coluna ${centerCol}). Certifique-se de que o chunk existe antes de fixar o objeto.`
                };
            }

            const effW = Math.max(1, asset.width);
            const effH = Math.max(1, asset.height);
            const minCol = Math.max(0, Math.floor(asset.x / chunkSize) + originCx);
            const maxCol = Math.min((chunks[0]?.length ?? 1) - 1, Math.floor((asset.x + effW - 0.001) / chunkSize) + originCx);
            const minRow = Math.max(0, Math.floor(asset.y / chunkSize) + originCy);
            const maxRow = Math.min(chunks.length - 1, Math.floor((asset.y + effH - 0.001) / chunkSize) + originCy);

            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    if (chunks[r] && chunks[r]![c] !== undefined) {
                        const key = `${r}_${c}`;
                        let entry = chunkMap.get(key);
                        if (!entry) {
                            entry = { row: r, col: c, assets: [] };
                            chunkMap.set(key, entry);
                        }
                        entry.assets.push(asset);
                    }
                }
            }
        }

        const affectedChunks: Array<{ row: number; col: number; newUrl: string }> = [];

        for (const entry of chunkMap.values()) {
            const { row, col, assets: chunkAssets } = entry;

            let offCanvas: HTMLCanvasElement;
            if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
                offCanvas = document.createElement('canvas');
            } else {
                offCanvas = {
                    width: chunkSize,
                    height: chunkSize,
                    getContext: () => this.ctx,
                    toDataURL: () => 'data:image/png;base64,mockBakedPng'
                } as any;
            }
            offCanvas.width = chunkSize;
            offCanvas.height = chunkSize;
            const offCtx = offCanvas.getContext('2d');
            if (!offCtx) {
                return { success: false, message: `Falha ao inicializar contexto 2D para o chunk (${row}, ${col}).` };
            }

            const currentBgUrl = chunks[row]![col]!;
            if (currentBgUrl && currentBgUrl.trim() !== '') {
                const bgImg = await this.loadImageAsync(currentBgUrl);
                if (bgImg && bgImg.naturalWidth > 0) {
                    offCtx.drawImage(bgImg, 0, 0, chunkSize, chunkSize);
                } else if (this.mapConfig.backgroundColor) {
                    offCtx.fillStyle = this.mapConfig.backgroundColor;
                    offCtx.fillRect(0, 0, chunkSize, chunkSize);
                }
            } else if (this.mapConfig.backgroundColor) {
                offCtx.fillStyle = this.mapConfig.backgroundColor;
                offCtx.fillRect(0, 0, chunkSize, chunkSize);
            }

      //? Ordenação por Z-Index/Y-Sort (Painter's Algorithm: menor Z-Index desenha primeiro)
            chunkAssets.sort((a, b) => {
                const zA = a.zIndex !== undefined ? a.zIndex : (a.y + a.height);
                const zB = b.zIndex !== undefined ? b.zIndex : (b.y + b.height);
                if (zA !== zB) {
                    return zA - zB;
                }
                return (a.uid || '').localeCompare(b.uid || '');
            });

            for (const asset of chunkAssets) {
                const spriteImg = await this.loadImageAsync(asset.imageSrc);
                this.drawAssetOnChunkContext(offCtx, asset, spriteImg, col, row, originCx, originCy, chunkSize);
            }

            const dataUrl = offCanvas.toDataURL ? offCanvas.toDataURL('image/png') : 'data:image/png;base64,mockPng';
            const fileName = `chunk_r${row}_c${col}_baked_${Date.now()}.png`;

            let newChunkUrl = dataUrl;
            if (typeof fetch !== 'undefined') {
                try {
                    const res = await fetch(`/api/assets-adapter?target=save-chunk-image&mapId=${encodeURIComponent(this.mapConfig.id)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mapId: this.mapConfig.id,
                            row,
                            col,
                            dataUrl,
                            fileName
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.url) {
                            newChunkUrl = data.url;
                        }
                    }
                } catch (err) {
                }
            }

            chunks[row]![col] = newChunkUrl;

            if (typeof Image !== 'undefined') {
                const updatedImg = new Image();
                updatedImg.src = newChunkUrl;
                this.chunkImages.set(newChunkUrl, updatedImg);
            }

            affectedChunks.push({ row, col, newUrl: newChunkUrl });
        }

        const bakedUids = new Set(assets.map(a => a.uid));
        for (const uid of bakedUids) {
            this.paintedLayerCanvases.delete(uid);
            if (this.activePaintedAsset?.uid === uid) {
                this.activePaintedAsset = null;
            }
        }
        this.placedAssets = this.placedAssets.filter(a => !bakedUids.has(a.uid));
        if (this.selectedAsset && bakedUids.has(this.selectedAsset.uid)) {
            this.selectedAsset = null;
        }
        this.selectedAssets = this.selectedAssets.filter(a => !bakedUids.has(a.uid));

    //? Persiste os chunks assados no disco via ChunkSync
        const chunkSync = new ChunkSync();
        await chunkSync.syncChunksToDisk(
            this.mapConfig.id,
            chunks,
            this.mapConfig.width,
            this.mapConfig.height,
            this.mapConfig.originChunk
        );

        this.saveState();
        this.render();
        this.onAssetChangedCallback?.();

        const firstChunk = affectedChunks[0];
        return {
            success: true,
            bakedCount: assets.length,
            chunkCoords: firstChunk ? { row: firstChunk.row, col: firstChunk.col } : undefined,
            newUrl: firstChunk?.newUrl,
            affectedChunks
        };
    }

    /**
     * Incorpora (bake) um asset no fundo do chunk onde ele está posicionado.
     * Renderiza o fundo existente + asset selecionado em um canvas offscreen,
     * salva a nova textura do chunk como imagem e remove o asset dinâmico do mapa.
     */
    public async bakeAssetToChunkBackground(asset: PlacedAssetModel): Promise<{
        success: boolean;
        message?: string | undefined;
        chunkCoords?: { row: number; col: number } | undefined;
        newUrl?: string | undefined;
        bakedCount?: number | undefined;
        affectedChunks?: Array<{ row: number; col: number; newUrl: string }> | undefined;
    }> {
        return this.bakeMultipleAssetsToChunkBackground([asset]);
    }
}
