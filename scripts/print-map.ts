/**
 * @file print-map.ts
 * Utilitario de Linha de Comando (CLI) para renderizacao completa e snapshot
 * dos mapas do jogo (terreno em chunks + cenarios, props, npcs, itens e portais)
 * utilizando o motor de desenho Skia (@napi-rs/canvas) em ambiente Node.js.
 *
 * Serve como referencia visual e contextual para IAs, desenvolvedores e artistas.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, type Image, type SKRSContext2D } from '@napi-rs/canvas';
import { EventHandler } from '../typescript/domain/eventDispacher/eventDispacher';
import VilgemWorld from '../typescript/domain/ObjectModule/Maps/VilgemWorld';
import AlunWorld from '../typescript/domain/ObjectModule/Maps/AlunWorld';
import CemiiWorld from '../typescript/domain/ObjectModule/Maps/CemiiWorld';
import IntermapWorld from '../typescript/domain/ObjectModule/Maps/IntermapWorld';
import type { IntermapDefinition } from '../typescript/domain/ObjectModule/Maps/IntermapConfig';
import { VisualConfigMap, type ItemVisualConfig, type BaseVisualConfig } from '../typescript/adapters/web/shared/VisualConfigMap';
import { KNOWN_ASSET_DIMENSIONS } from '../typescript/adapters/assets-adapter/Components/AssetDimensions';
import { CLASS_TO_ITEM_KEY } from '../typescript/adapters/assets-adapter/Components/AssetScanner';
import { buildAssetHitboxes, getAssetBaseSize } from '../typescript/domain/ObjectModule/Scenery/SceneryRegistry';
import type { HitBox } from '../typescript/domain/hitBox/HitBox';
import HitBoxPolygon from '../typescript/domain/hitBox/HitBoxPolygon';
import { HitBoxCircle } from '../typescript/domain/hitBox/HitBoxCircle';

export interface CliOptions {
    mapId: string;
    outputPath: string;
    scale: number;
    showGrid: boolean;
    showHitboxes: boolean;
    showLabels: boolean;
    showSpawn: boolean;
    includeScenery: boolean;
    help: boolean;
}

export interface RenderItem {
    id: string;
    presetId: string;
    type: string;
    worldX: number;
    worldY: number;
    worldWidth: number;
    worldHeight: number;
    sortY: number;
    imageSrc?: string | undefined;
    frameCount: number;
    frameWidth?: number | undefined;
    frameHeight?: number | undefined;
    atlasOffset?: { x: number; y: number } | undefined;
    flipX?: boolean | undefined;
    flipY?: boolean | undefined;
    hitboxes?: HitBox[] | undefined;
    label?: string | undefined;
}

export interface PrintResult {
    outputPath: string;
    width: number;
    height: number;
    scale: number;
    elementCount: number;
    fileSizeBytes: number;
    durationMs: number;
}

/**
 * Faz o parsing dos argumentos de linha de comando.
 */
export function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        mapId: 'vilgem',
        outputPath: '',
        scale: 0.5,
        showGrid: false,
        showHitboxes: false,
        showLabels: false,
        showSpawn: true,
        includeScenery: true,
        help: false
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg) continue;

        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--map' || arg === '-m') {
            const next = argv[++i];
            if (next) options.mapId = next;
        } else if (arg === '--output' || arg === '-o') {
            const next = argv[++i];
            if (next) options.outputPath = next;
        } else if (arg === '--scale' || arg === '-s') {
            const next = argv[++i];
            if (next) {
                const val = parseFloat(next);
                if (!isNaN(val) && val > 0) options.scale = val;
            }
        } else if (arg === '--show-grid') {
            options.showGrid = true;
        } else if (arg === '--show-hitboxes') {
            options.showHitboxes = true;
        } else if (arg === '--show-labels') {
            options.showLabels = true;
        } else if (arg === '--hide-spawn') {
            options.showSpawn = false;
        } else if (arg === '--no-scenery') {
            options.includeScenery = false;
        }
    }

    if (!options.outputPath) {
        options.outputPath = path.join('docs', 'maps', `${options.mapId}.png`);
    }

    return options;
}

/**
 * Exibe informacoes de ajuda e parametros disponiveis no console.
 */
export function printHelp(): void {
    console.log(`
================================================================================
Map Snapshot CLI - Gerador de Imagem do Mapa de Jogo
================================================================================

Uso:
  npm run map:print [opcoes]
  npx tsx scripts/print-map.ts [opcoes]

Opcoes:
  --map, -m <id>        Identificador do mapa a renderizar (padrao: "vilgem").
                        Suporta: vilgem, alun, cemii, ou qualquer mapa interno
                        definido em intermapsMap.json (ex: interior_black_default).
  --output, -o <path>   Caminho do arquivo PNG gerado (padrao: "docs/maps/<id>.png").
  --scale, -s <num>     Escala de resolucao (padrao: 0.5).
                        Exemplos: 1.0 (5120x5120), 0.5 (2560x2560), 0.25 (1280x1280).
  --show-grid           Desenha linhas de divisao dos chunks e coordenadas no mapa.
  --show-hitboxes       Desenha caixas de colisao fisicas (poligonos e circulos).
  --show-labels         Exibe identificadores e coordenadas de cada elemento em cena.
  --hide-spawn          Oculta o marcador do ponto de spawn inicial.
  --no-scenery          Renderiza apenas o terreno base sem construcoes nem props.
  --help, -h            Exibe esta mensagem de ajuda.
================================================================================
`);
}

/**
 * Gerenciador de cache de imagens carregadas via Skia.
 */
export class ImageCache {
    private cache = new Map<string, Image>();

    public async getImage(imagePath: string): Promise<Image | null> {
        if (!imagePath) return null;
        const cached = this.cache.get(imagePath);
        if (cached) return cached;

        try {
            if (!fs.existsSync(imagePath)) {
                return null;
            }
            const img = await loadImage(imagePath);
            this.cache.set(imagePath, img);
            return img;
        } catch {
            return null;
        }
    }
}

/**
 * Resolve caminhos de assets relativos, http locais ou file:// para o caminho absoluto no sistema de arquivos.
 */
export function resolveAssetPath(rawPath: string): string {
    if (!rawPath) return '';
    if (rawPath.startsWith('file://')) {
        return fileURLToPath(rawPath);
    }
    let sanitized = rawPath;
    if (sanitized.startsWith('http://localhost:5173/')) {
        sanitized = sanitized.replace('http://localhost:5173/', '');
    }
    if (sanitized.startsWith('/')) {
        sanitized = sanitized.slice(1);
    }
    return path.resolve(process.cwd(), sanitized);
}

/**
 * Extrai configuracao de animacao com seguranca de tipos do VisualConfigMap.
 */
function getAnimationConfig(config: unknown): {
    imageSrc?: string | undefined;
    frameCount?: number | undefined;
    frameWidth?: number | undefined;
    frameHeight?: number | undefined;
    atlasOffset?: { x: number; y: number } | undefined;
    spriteSize?: { width: number; height: number } | undefined;
} | undefined {
    if (!config || typeof config !== 'object') return undefined;
    const base = config as BaseVisualConfig;
    if (!base.animations || typeof base.animations !== 'object') return undefined;
    const anim = base.animations['static'] || base.animations['idle'] || Object.values(base.animations)[0];
    return anim;
}

/**
 * Servico principal de composicao e renderizacao do mapa.
 */
export class MapPrintService {
    private imageCache = new ImageCache();

    /**
     * Executa o processo completo de renderizacao do mapa.
     */
    public async renderMap(options: CliOptions): Promise<PrintResult> {
        const startTime = Date.now();

        // 1. Carrega a definicao do mundo
        const mapData = await this.loadWorldData(options.mapId);

        // 2. Calcula as dimensoes do canvas
        const scale = options.scale;
        const canvasWidth = Math.max(1, Math.round(mapData.width * scale));
        const canvasHeight = Math.max(1, Math.round(mapData.height * scale));

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;

        // 3. Fundo base
        ctx.fillStyle = mapData.backgroundColor || '#181b22';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 4. Renderiza o terreno de chunks
        await this.renderChunks(ctx, mapData, scale);

        // 5. Prepara e renderiza os elementos em cena com Y-Sort
        let renderedCount = 0;
        if (options.includeScenery) {
            const renderItems = this.buildRenderItems(mapData.spawns, options.showHitboxes);
            renderedCount = await this.renderElements(ctx, renderItems, mapData.minX, mapData.minY, scale);

            // 6. Overlay de hitboxes se solicitado
            if (options.showHitboxes) {
                this.renderHitboxes(ctx, renderItems, mapData.minX, mapData.minY, scale);
            }

            // 7. Overlay de rotulos se solicitado
            if (options.showLabels) {
                this.renderLabels(ctx, renderItems, mapData.minX, mapData.minY, scale);
            }
        }

        // 8. Grid de chunks e coordenadas
        if (options.showGrid) {
            this.renderGrid(ctx, mapData, scale);
        }

        // 9. Marcador de Spawn inicial
        if (options.showSpawn && mapData.defaultSpawn) {
            this.renderSpawnMarker(ctx, mapData.defaultSpawn, mapData.minX, mapData.minY, scale);
        }

        // 10. Salva arquivo PNG de saida
        const absoluteOutputPath = path.isAbsolute(options.outputPath)
            ? options.outputPath
            : path.resolve(process.cwd(), options.outputPath);

        const dir = path.dirname(absoluteOutputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(absoluteOutputPath, buffer);

        const durationMs = Date.now() - startTime;
        return {
            outputPath: absoluteOutputPath,
            width: canvasWidth,
            height: canvasHeight,
            scale,
            elementCount: renderedCount,
            fileSizeBytes: buffer.length,
            durationMs
        };
    }

    /**
     * Carrega as informacoes e elementos do mapa correspondente.
     */
    private async loadWorldData(mapId: string): Promise<{
        mapId: string;
        width: number;
        height: number;
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        originChunk: { cx: number; cy: number };
        chunkSize: number;
        chunks: string[][];
        backgroundColor?: string | undefined;
        defaultSpawn?: { x: number; y: number } | undefined;
        spawns: any[];
    }> {
        const eventManager = new EventHandler();
        const spawns: any[] = [];
        eventManager.on('spawn', (payload) => spawns.push(payload));

        if (mapId === 'vilgem') {
            const world = new VilgemWorld(eventManager);
            await world.generate();
            const state = world.getState();
            return {
                mapId: world.mapId,
                width: world.width,
                height: world.height,
                minX: state.minX ?? -2048,
                minY: state.minY ?? -2048,
                maxX: state.maxX ?? 3072,
                maxY: state.maxY ?? 3072,
                originChunk: world.originChunk,
                chunkSize: 1024,
                chunks: world.chunks || [],
                defaultSpawn: world.defaultSpawn,
                spawns
            };
        }

        if (mapId === 'alun') {
            const world = new AlunWorld(eventManager);
            await world.generate();
            const state = world.getState();
            return {
                mapId: world.mapId,
                width: world.width,
                height: world.height,
                minX: state.minX ?? 0,
                minY: state.minY ?? 0,
                maxX: state.maxX ?? 4000,
                maxY: state.maxY ?? 4000,
                originChunk: world.originChunk,
                chunkSize: 1000,
                chunks: (world as any).chunks || [],
                defaultSpawn: world.defaultSpawn,
                spawns
            };
        }

        if (mapId === 'cemii') {
            const world = new CemiiWorld(eventManager);
            await world.generate();
            const state = world.getState();
            return {
                mapId: world.mapId,
                width: world.width,
                height: world.height,
                minX: state.minX ?? 0,
                minY: state.minY ?? 0,
                maxX: state.maxX ?? 4000,
                maxY: state.maxY ?? 4000,
                originChunk: world.originChunk,
                chunkSize: world.chunkSize || 1000,
                chunks: world.chunks || [],
                defaultSpawn: world.defaultSpawn,
                spawns
            };
        }

        // Verifica mapas internos (intermapsMap.json)
        const intermapsPath = path.resolve(process.cwd(), 'typescript/adapters/web/assets/maps/intermapsMap.json');
        if (fs.existsSync(intermapsPath)) {
            const rawContent = fs.readFileSync(intermapsPath, 'utf-8');
            const intermaps = JSON.parse(rawContent) as Record<string, IntermapDefinition>;
            const def = intermaps[mapId];
            if (def) {
                const world = new IntermapWorld(def, eventManager);
                await world.generate();
                const originCx = def.originChunk?.cx || 0;
                const originCy = def.originChunk?.cy || 0;
                const chunkSize = 1024;
                const minX = -originCx * chunkSize;
                const minY = -originCy * chunkSize;
                return {
                    mapId: def.id,
                    width: def.width,
                    height: def.height,
                    minX,
                    minY,
                    maxX: minX + def.width,
                    maxY: minY + def.height,
                    originChunk: { cx: originCx, cy: originCy },
                    chunkSize,
                    chunks: def.chunks || [],
                    backgroundColor: def.backgroundColor,
                    defaultSpawn: def.defaultSpawn,
                    spawns
                };
            }
        }

        throw new Error(`Mapa com ID "${mapId}" nao foi encontrado no catalogo de mapas.`);
    }

    /**
     * Renderiza a grade de chunks de terreno.
     */
    private async renderChunks(
        ctx: SKRSContext2D,
        mapData: {
            chunks: string[][];
            chunkSize: number;
            originChunk: { cx: number; cy: number };
            minX: number;
            minY: number;
        },
        scale: number
    ): Promise<void> {
        const { chunks, chunkSize, originChunk } = mapData;
        if (!chunks || chunks.length === 0) return;

        for (let cy = 0; cy < chunks.length; cy++) {
            const row = chunks[cy];
            if (!row) continue;

            for (let cx = 0; cx < row.length; cx++) {
                const chunkUrl = row[cx];
                if (!chunkUrl) continue;

                const localPath = resolveAssetPath(chunkUrl);
                const img = await this.imageCache.getImage(localPath);

                // Posicionamento no canvas
                const chunkWorldX = (cx - originChunk.cx) * chunkSize;
                const chunkWorldY = (cy - originChunk.cy) * chunkSize;
                const canvasX = Math.round((chunkWorldX - mapData.minX) * scale);
                const canvasY = Math.round((chunkWorldY - mapData.minY) * scale);
                const canvasSize = Math.round(chunkSize * scale);

                if (img) {
                    ctx.drawImage(img, canvasX, canvasY, canvasSize, canvasSize);
                } else {
                    // Fallback para chunks sem imagem
                    ctx.fillStyle = (cx + cy) % 2 === 0 ? '#1f242d' : '#252b37';
                    ctx.fillRect(canvasX, canvasY, canvasSize, canvasSize);
                }
            }
        }
    }

    /**
     * Converte os eventos de spawn em modelos RenderItem ordenaveis e normalizados.
     */
    private buildRenderItems(spawns: any[], buildHitboxes: boolean): RenderItem[] {
        const items: RenderItem[] = [];
        let index = 0;

        for (const spawn of spawns) {
            index++;
            const type = spawn.type;

            // 1. Cenarios e Props
            if (type === 'scenery') {
                const presetId = spawn.metadata?.preset || 'unknown';
                const coords = spawn.coordinates || { x: 0, y: 0 };
                const flipX = Boolean(spawn.metadata?.flipX);
                const flipY = Boolean(spawn.metadata?.flipY);

                const animConfig = getAnimationConfig(VisualConfigMap[presetId]);
                const baseSize = getAssetBaseSize(presetId);
                const knownDims = KNOWN_ASSET_DIMENSIONS[presetId] || KNOWN_ASSET_DIMENSIONS[`${presetId}_clean`];

                const width: number = spawn.size?.width
                    ?? animConfig?.spriteSize?.width
                    ?? knownDims?.width
                    ?? animConfig?.frameWidth
                    ?? baseSize.width
                    ?? 64;

                const height: number = spawn.size?.height
                    ?? animConfig?.spriteSize?.height
                    ?? knownDims?.height
                    ?? animConfig?.frameHeight
                    ?? baseSize.height
                    ?? 64;

                const hitboxes: HitBox[] | undefined = buildHitboxes
                    ? buildAssetHitboxes(presetId, coords, { width, height }, flipX, flipY)
                    : undefined;

                items.push({
                    id: `scenery_${index}_${presetId}`,
                    presetId,
                    type: 'scenery',
                    worldX: coords.x,
                    worldY: coords.y,
                    worldWidth: width,
                    worldHeight: height,
                    sortY: coords.y + height,
                    imageSrc: animConfig?.imageSrc,
                    frameCount: animConfig?.frameCount ?? 1,
                    frameWidth: animConfig?.frameWidth,
                    frameHeight: animConfig?.frameHeight,
                    atlasOffset: animConfig?.atlasOffset,
                    flipX: flipX || undefined,
                    flipY: flipY || undefined,
                    hitboxes,
                    label: presetId
                });
            }

            // 2. NPCs (Habitantes / Entidades)
            else if (type === 'molor' || type === 'candelion' || type === 'derocar' || type === 'molin') {
                const coords = spawn.coordinates || { x: 0, y: 0 };
                const animConfig = getAnimationConfig(VisualConfigMap[type]);

                const width: number = spawn.size?.width ?? animConfig?.frameWidth ?? 32;
                const height: number = spawn.size?.height ?? animConfig?.frameHeight ?? 32;

                items.push({
                    id: `npc_${index}_${type}`,
                    presetId: type,
                    type: 'npc',
                    worldX: coords.x,
                    worldY: coords.y,
                    worldWidth: width,
                    worldHeight: height,
                    sortY: coords.y + height,
                    imageSrc: animConfig?.imageSrc,
                    frameCount: animConfig?.frameCount ?? 1,
                    frameWidth: animConfig?.frameWidth ?? 32,
                    frameHeight: animConfig?.frameHeight ?? 32,
                    atlasOffset: animConfig?.atlasOffset,
                    label: `NPC: ${type}`
                });
            }

            // 3. Portais
            else if (type === 'portalLinkRequest' || type === 'portalLink') {
                const coords = spawn.coordinates || { x: 0, y: 0 };
                const width: number = spawn.size?.width ?? 64;
                const height: number = spawn.size?.height ?? 64;
                const animConfig = getAnimationConfig(VisualConfigMap['portal_link_circle']);

                items.push({
                    id: `portal_${index}`,
                    presetId: 'portal_link_circle',
                    type: 'portal',
                    worldX: coords.x,
                    worldY: coords.y,
                    worldWidth: width,
                    worldHeight: height,
                    sortY: coords.y + height,
                    imageSrc: animConfig?.imageSrc,
                    frameCount: 1,
                    frameWidth: 64,
                    frameHeight: 64,
                    label: `Portal -> ${spawn.metadata?.targetMapId || 'intermap'}`
                });
            }

            // 4. Itens Caidos no Chao
            else if (type === 'droppedItem' && spawn.item) {
                const coords = spawn.coordinates || { x: 0, y: 0 };
                const itemClass = spawn.item.constructor?.name || spawn.item.name || 'item';
                const itemKey = CLASS_TO_ITEM_KEY[itemClass] || itemClass;
                const itemVisual = VisualConfigMap[itemKey] as ItemVisualConfig | undefined;
                const droppedAnim = itemVisual?.droppedConfig;

                const width: number = spawn.size?.width ?? droppedAnim?.frameWidth ?? 32;
                const height: number = spawn.size?.height ?? droppedAnim?.frameHeight ?? 32;

                items.push({
                    id: `item_${index}_${itemKey}`,
                    presetId: itemKey,
                    type: 'item',
                    worldX: coords.x,
                    worldY: coords.y,
                    worldWidth: width,
                    worldHeight: height,
                    sortY: coords.y + height,
                    imageSrc: droppedAnim?.imageSrc ?? itemVisual?.uiIconUrl,
                    frameCount: droppedAnim?.frameCount ?? 1,
                    frameWidth: droppedAnim?.frameWidth ?? 32,
                    frameHeight: droppedAnim?.frameHeight ?? 32,
                    atlasOffset: droppedAnim?.atlasOffset,
                    label: itemClass
                });
            }
        }

        return items;
    }

    /**
     * Renderiza todos os elementos ordenados por Y (2.5D Isometric Sorting).
     */
    private async renderElements(
        ctx: SKRSContext2D,
        items: RenderItem[],
        minX: number,
        minY: number,
        scale: number
    ): Promise<number> {
        // Ordenacao isometrica pelo pe do objeto
        const sorted = [...items].sort((a, b) => a.sortY - b.sortY);
        let count = 0;

        for (const item of sorted) {
            const canvasX = Math.round((item.worldX - minX) * scale);
            const canvasY = Math.round((item.worldY - minY) * scale);
            const canvasW = Math.max(1, Math.round(item.worldWidth * scale));
            const canvasH = Math.max(1, Math.round(item.worldHeight * scale));

            const localPath = resolveAssetPath(item.imageSrc || '');
            const img = await this.imageCache.getImage(localPath);

            if (img) {
                const frameWidth = item.frameWidth ?? Math.floor(img.width / Math.max(1, item.frameCount));
                const frameHeight = item.frameHeight ?? img.height;
                const sx = item.atlasOffset?.x ?? 0;
                const sy = item.atlasOffset?.y ?? 0;

                if (item.flipX || item.flipY) {
                    ctx.save();
                    ctx.translate(canvasX + canvasW / 2, canvasY + canvasH / 2);
                    ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
                    ctx.drawImage(img, sx, sy, frameWidth, frameHeight, -canvasW / 2, -canvasH / 2, canvasW, canvasH);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, sx, sy, frameWidth, frameHeight, canvasX, canvasY, canvasW, canvasH);
                }
            } else {
                // Fallback visual elegante quando a imagem nao esta disponivel
                ctx.fillStyle = item.type === 'portal' ? 'rgba(100, 50, 200, 0.6)'
                    : item.type === 'npc' ? 'rgba(40, 180, 220, 0.6)'
                    : item.type === 'item' ? 'rgba(230, 180, 40, 0.6)'
                    : 'rgba(80, 90, 110, 0.6)';
                ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(canvasX, canvasY, canvasW, canvasH);
            }
            count++;
        }

        return count;
    }

    /**
     * Renderiza o overlay de caixas de colisao fisicas.
     */
    private renderHitboxes(
        ctx: SKRSContext2D,
        items: RenderItem[],
        minX: number,
        minY: number,
        scale: number
    ): void {
        ctx.save();
        for (const item of items) {
            if (!item.hitboxes || item.hitboxes.length === 0) continue;

            for (const hb of item.hitboxes) {
                if (hb instanceof HitBoxPolygon) {
                    const pts = hb.getRotatedPoints();
                    if (!pts || pts.length < 3) continue;

                    ctx.beginPath();
                    ctx.moveTo(Math.round((pts[0]!.x - minX) * scale), Math.round((pts[0]!.y - minY) * scale));
                    for (let i = 1; i < pts.length; i++) {
                        ctx.lineTo(Math.round((pts[i]!.x - minX) * scale), Math.round((pts[i]!.y - minY) * scale));
                    }
                    ctx.closePath();

                    ctx.fillStyle = 'rgba(0, 255, 136, 0.28)';
                    ctx.fill();
                    ctx.strokeStyle = '#00ff88';
                    ctx.lineWidth = Math.max(1, 1.5 * scale);
                    ctx.stroke();
                } else if (hb instanceof HitBoxCircle) {
                    const cx = Math.round((hb.coordinates.x - minX) * scale);
                    const cy = Math.round((hb.coordinates.y - minY) * scale);
                    const r = Math.round(hb.radius * scale);

                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 200, 255, 0.28)';
                    ctx.fill();
                    ctx.strokeStyle = '#00c8ff';
                    ctx.lineWidth = Math.max(1, 1.5 * scale);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    /**
     * Renderiza rotulos e nomes dos elementos para depuracao e inspecao visual.
     */
    private renderLabels(
        ctx: SKRSContext2D,
        items: RenderItem[],
        minX: number,
        minY: number,
        scale: number
    ): void {
        ctx.save();
        const fontSize = Math.max(9, Math.round(11 * scale));
        ctx.font = `bold ${fontSize}px sans-serif`;

        for (const item of items) {
            const text = item.label || item.presetId;
            const x = Math.round((item.worldX - minX) * scale);
            const y = Math.round((item.worldY - minY) * scale);

            const metrics = ctx.measureText(text);
            const padding = 3 * scale;

            ctx.fillStyle = 'rgba(15, 20, 28, 0.85)';
            ctx.fillRect(x - padding, y - fontSize - padding, metrics.width + padding * 2, fontSize + padding * 2);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - padding, y - fontSize - padding, metrics.width + padding * 2, fontSize + padding * 2);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, x, y - 2);
        }
        ctx.restore();
    }

    /**
     * Renderiza a grade de chunks e demarcacoes de coordenadas.
     */
    private renderGrid(
        ctx: SKRSContext2D,
        mapData: {
            width: number;
            height: number;
            minX: number;
            minY: number;
            chunkSize: number;
            originChunk: { cx: number; cy: number };
        },
        scale: number
    ): void {
        const { width, height, minX, minY, chunkSize, originChunk } = mapData;
        const cols = Math.ceil(width / chunkSize);
        const rows = Math.ceil(height / chunkSize);

        ctx.save();

        // 1. Linhas de divisao dos chunks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = Math.max(1, 2 * scale);

        for (let cy = 0; cy <= rows; cy++) {
            const y = Math.round(cy * chunkSize * scale);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(Math.round(width * scale), y);
            ctx.stroke();
        }

        for (let cx = 0; cx <= cols; cx++) {
            const x = Math.round(cx * chunkSize * scale);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, Math.round(height * scale));
            ctx.stroke();
        }

        // 2. Etiquetas dos chunks
        const labelFontSize = Math.max(10, Math.round(14 * scale));
        ctx.font = `bold ${labelFontSize}px monospace`;

        for (let cy = 0; cy < rows; cy++) {
            for (let cx = 0; cx < cols; cx++) {
                const signedCx = cx - originChunk.cx;
                const signedCy = cy - originChunk.cy;
                const isOrigin = signedCx === 0 && signedCy === 0;

                const chunkWorldX = signedCx * chunkSize;
                const chunkWorldY = signedCy * chunkSize;
                const canvasX = Math.round((chunkWorldX - minX) * scale);
                const canvasY = Math.round((chunkWorldY - minY) * scale);

                const label = `Chunk (${signedCx}, ${signedCy}) [${chunkWorldX}, ${chunkWorldY}]`;

                ctx.fillStyle = isOrigin ? 'rgba(255, 180, 0, 0.85)' : 'rgba(0, 0, 0, 0.65)';
                ctx.fillRect(canvasX + 8, canvasY + 8, ctx.measureText(label).width + 12, labelFontSize + 8);

                ctx.fillStyle = isOrigin ? '#000000' : '#ffffff';
                ctx.fillText(label, canvasX + 14, canvasY + labelFontSize + 12);
            }
        }

        ctx.restore();
    }

    /**
     * Renderiza o marcador indicador do ponto de spawn inicial do jogador.
     */
    private renderSpawnMarker(
        ctx: SKRSContext2D,
        spawn: { x: number; y: number },
        minX: number,
        minY: number,
        scale: number
    ): void {
        const cx = Math.round((spawn.x - minX) * scale);
        const cy = Math.round((spawn.y - minY) * scale);
        const radius = Math.max(6, Math.round(16 * scale));

        ctx.save();

        // Circulo brilhante
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 68, 68, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = Math.max(2, 3 * scale);
        ctx.stroke();

        // Mira central
        ctx.beginPath();
        ctx.moveTo(cx - radius * 1.5, cy);
        ctx.lineTo(cx + radius * 1.5, cy);
        ctx.moveTo(cx, cy - radius * 1.5);
        ctx.lineTo(cx, cy + radius * 1.5);
        ctx.strokeStyle = '#ffdd33';
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.stroke();

        // Texto
        const fontSize = Math.max(10, Math.round(12 * scale));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const label = `Spawn (${spawn.x}, ${spawn.y})`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(cx - radius, cy + radius + 4, ctx.measureText(label).width + 8, fontSize + 6);
        ctx.fillStyle = '#ffdd33';
        ctx.fillText(label, cx - radius + 4, cy + radius + fontSize + 6);

        ctx.restore();
    }
}

/**
 * Ponto de entrada CLI quando executado diretamente.
 */
export async function runCli(): Promise<void> {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    console.log(`[MapPrint CLI] Renderizando mapa "${options.mapId}"...`);
    console.log(`  - Escala: ${options.scale}x`);
    console.log(`  - Hitboxes: ${options.showHitboxes ? 'SIM' : 'NAO'}`);
    console.log(`  - Grid: ${options.showGrid ? 'SIM' : 'NAO'}`);
    console.log(`  - Labels: ${options.showLabels ? 'SIM' : 'NAO'}`);
    console.log(`  - Saida esperada: ${options.outputPath}`);

    const service = new MapPrintService();
    try {
        const result = await service.renderMap(options);
        const sizeMb = (result.fileSizeBytes / (1024 * 1024)).toFixed(2);
        console.log(`[MapPrint CLI] Concluido com sucesso!`);
        console.log(`  - Dimensoes da imagem: ${result.width}x${result.height} px`);
        console.log(`  - Elementos posicionados: ${result.elementCount}`);
        console.log(`  - Tamanho do arquivo: ${sizeMb} MB (${result.fileSizeBytes} bytes)`);
        console.log(`  - Tempo de renderizacao: ${result.durationMs} ms`);
        console.log(`  - Arquivo salvo em: ${result.outputPath}`);
    } catch (err: any) {
        console.error(`[MapPrint CLI] Falha na renderizacao:`, err?.message || err);
        process.exit(1);
    }
}

// Execucao direta
if (process.argv[1] && process.argv[1].endsWith('print-map.ts')) {
    runCli().catch((err) => {
        console.error('[MapPrint CLI] Erro fatal:', err);
        process.exit(1);
    });
}
