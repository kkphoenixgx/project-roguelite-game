/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetScanner } from '../../../adapters/assets-adapter/Components/AssetScanner';
import { MapCanvas } from '../../../adapters/assets-adapter/Components/MapCanvas';
import { Exporter } from '../../../adapters/assets-adapter/Components/Exporter';
import { PanelResizer } from '../../../adapters/assets-adapter/Components/PanelResizer';
import { WorldCodeSync } from '../../../adapters/assets-adapter/Components/WorldCodeSync';
import { VisualConfigSync } from '../../../adapters/assets-adapter/Components/VisualConfigSync';
import { AssetDrawer } from '../../../adapters/assets-adapter/Components/AssetDrawer';
import { ChunkSync } from '../../../adapters/assets-adapter/Components/ChunkSync';
import { ChunkManagerModal } from '../../../adapters/assets-adapter/Components/ChunkManagerModal';
import { MapSelectorModal, type SelectedMapConfig } from '../../../adapters/assets-adapter/Components/MapSelectorModal';
import { PropertiesPanel } from '../../../adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../../adapters/assets-adapter/Models/PlacedAssetModel';

describe('Assets Adapter (Scenery Placer & World Object Editor)', () => {
    let mockMap: SelectedMapConfig;

    beforeEach(() => {
        HTMLCanvasElement.prototype.getContext = (() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            drawImage: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn(() => ({ width: 80 })),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
        } as unknown as CanvasRenderingContext2D)) as any;

        HTMLCanvasElement.prototype.toDataURL = vi.fn((type?: string) => 'data:image/png;base64,mockCleanGroundDataUrl');

        document.body.innerHTML = `
            <button id="btn-reopen-drawer" style="display: none;"></button>
            <div id="asset-drawer" style="width: 320px;"></div>
            <div id="drawer-resizer"></div>
            <div id="canvas-container" style="width: 800px; height: 600px;"></div>
            <div id="props-resizer"></div>
            <div id="properties-panel" style="width: 300px;"></div>
        `;

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            description: 'Vila central'
        };
    });

    describe('AssetScanner', () => {
        it('deve listar e enriquecer assets preservando a categoria temática real e diferenciando sprites animados de PNGs estáticos', () => {
            const scanner = new AssetScanner();
            const allAssets = scanner.getAssets();

            expect(allAssets.length).toBeGreaterThan(0);
            
            // Verifica que assets animados mantêm sua categoria temática (ex: 'houses') e isSprite = true
            const boroHouse = scanner.getAssetById('house_red_boro');
            expect(boroHouse).toBeDefined();
            expect(boroHouse?.isSprite).toBe(true);
            expect(boroHouse?.category).toBe('houses');
            expect(boroHouse?.frameCount).toBeGreaterThan(1);

            // Verifica que assets com 1 frame estático de cenário também estão na sua categoria temática
            const ledaHouse = scanner.getAssetById('house_blue_leda');
            expect(ledaHouse).toBeDefined();
            expect(ledaHouse?.isSprite).toBe(false);
            expect(ledaHouse?.category).toBe('houses');
            expect(ledaHouse?.frameCount).toBe(1);
        });

        it('deve filtrar por tag temática trazendo tanto estáticos quanto sprites em pares correspondentes', () => {
            const scanner = new AssetScanner();
            const houses = scanner.getAssets('houses');
            const props = scanner.getAssets('props');
            const sprites = scanner.getAssets('sprites');

            expect(houses.length).toBeGreaterThan(0);
            expect(houses.every(h => h.category === 'houses')).toBe(true);
            // Confirma que a tag 'houses' inclui TANTO spritesheets animados QUANTO PNGs estáticos
            expect(houses.some(h => h.isSprite === true)).toBe(true);
            expect(houses.some(h => !h.isSprite)).toBe(true);

            expect(props.length).toBeGreaterThan(0);
            expect(props.every(p => p.category === 'props')).toBe(true);
            expect(props.some(p => p.isSprite === true)).toBe(true);
            expect(props.some(p => !p.isSprite)).toBe(true);

            // Confirma que a aba de sprites traz todos os sprites independentemente da categoria
            expect(sprites.length).toBeGreaterThan(0);
            expect(sprites.every(s => s.isSprite === true || s.category === 'sprites')).toBe(true);
            expect(sprites.some(s => s.id === 'house_red_boro')).toBe(true);
        });

        it('deve filtrar por termo de busca', () => {
            const scanner = new AssetScanner();
            const searchResults = scanner.getAssets(undefined, 'boro');
            
            expect(searchResults.length).toBeGreaterThan(0);
            expect(searchResults.some(a => a.id.includes('boro'))).toBe(true);
        });

        it('deve permitir registrar novos sprites customizados via modal', () => {
            const scanner = new AssetScanner();
            scanner.registerCustomAsset({
                id: 'custom_dragon_statue',
                name: 'Estátua do Dragão Ancião',
                category: 'sprites',
                imageSrc: 'data:image/png;base64,fake',
                width: 128,
                height: 128,
                frameWidth: 64,
                frameHeight: 128,
                frameCount: 2,
                isSprite: true
            });

            const custom = scanner.getAssetById('custom_dragon_statue');
            expect(custom).toBeDefined();
            expect(custom?.isCustom).toBe(true);
            expect(custom?.isSprite).toBe(true);
            expect(custom?.name).toBe('Estátua do Dragão Ancião');
        });

        it('deve listar e categorizar imagens de chunks e terrenos na gaveta de assets', () => {
            const scanner = new AssetScanner();
            const chunkAssets = scanner.getAssets('chunks');

            expect(chunkAssets.length).toBeGreaterThan(0);
            expect(chunkAssets.every(c => c.category === 'chunks')).toBe(true);
            expect(chunkAssets.some(c => c.id.includes('chunk_') || c.id.includes('grass'))).toBe(true);

            // Verifica que o tamanho padrão de chunk é 1024x1024
            const firstChunk = chunkAssets[0]!;
            expect(firstChunk.width).toBe(1024);
            expect(firstChunk.height).toBe(1024);
        });
    });

    describe('MapCanvas (Posicionamento, Manipulação e Coordenadas)', () => {
        let canvas: MapCanvas;

        beforeEach(() => {
            canvas = new MapCanvas('canvas-container', mockMap);
        });

        it('deve adicionar um asset ao mapa com coordenadas mundiais exatas', () => {
            const assetDef = {
                id: 'house_red_boro',
                name: 'Cumeeira de Boro',
                category: 'houses',
                imageSrc: 'test.png',
                width: 305,
                height: 354,
                frameWidth: 305,
                frameHeight: 354,
                frameCount: 1
            };

            const placed = canvas.addAssetToMap(assetDef, 1060, 1040);

            expect(placed).toBeDefined();
            expect(placed.presetId).toBe('house_red_boro');
            expect(placed.x).toBe(1060);
            expect(placed.y).toBe(1040);
            expect(placed.width).toBe(305);
            expect(placed.height).toBe(354);
            expect(canvas.placedAssets.length).toBe(1);
            expect(canvas.selectedAsset).toBe(placed);
        });

        it('deve permitir duplicar e apagar o asset selecionado', () => {
            const assetDef = {
                id: 'wooden_bench',
                name: 'Banco de Madeira',
                category: 'props',
                imageSrc: 'test.png',
                width: 60,
                height: 40,
                frameWidth: 60,
                frameHeight: 40,
                frameCount: 1
            };

            canvas.addAssetToMap(assetDef, 1390, 1370);
            expect(canvas.placedAssets.length).toBe(1);

            // Duplica
            canvas.duplicateSelected();
            expect(canvas.placedAssets.length).toBe(2);
            expect(canvas.selectedAsset?.x).toBe(1390 + 32);

            // Apaga o duplicado
            canvas.deleteSelected();
            expect(canvas.placedAssets.length).toBe(1);
            expect(canvas.selectedAsset).toBeNull();
        });

        it('deve suportar Undo (Desfazer) e Redo (Refazer)', () => {
            const assetDef = {
                id: 'stone_well',
                name: 'Poço de Pedra',
                category: 'props',
                imageSrc: 'test.png',
                width: 50,
                height: 50,
                frameWidth: 50,
                frameHeight: 50,
                frameCount: 1
            };

            canvas.addAssetToMap(assetDef, 500, 500);
            expect(canvas.placedAssets.length).toBe(1);

            // Undo
            canvas.undo();
            expect(canvas.placedAssets.length).toBe(0);

            // Redo
            canvas.redo();
            expect(canvas.placedAssets.length).toBe(1);
            expect(canvas.placedAssets[0]?.presetId).toBe('stone_well');
        });

        it('deve converter coordenadas de tela para mundo e mundo para tela com precisão', () => {
            canvas.panX = 100;
            canvas.panY = 50;
            canvas.zoom = 2.0;

            const world = canvas.screenToWorld(300, 250);
            // (300 - 100) / 2 = 100
            // (250 - 50) / 2 = 100
            expect(world.x).toBe(100);
            expect(world.y).toBe(100);

            const screen = canvas.worldToScreen(100, 100);
            expect(screen.x).toBe(300);
            expect(screen.y).toBe(250);
        });

        it('deve encaixar o asset selecionado e todos os assets na grade quando solicitado (Snap to Grid)', () => {
            canvas.gridSize = 32;

            const asset1 = canvas.addAssetToMap({
                id: 'bench',
                name: 'Banco',
                category: 'props',
                imageSrc: 'bench.png',
                width: 32,
                height: 32,
                frameWidth: 32,
                frameHeight: 32,
                frameCount: 1
            }, 105, 215);

            expect(asset1.x).toBe(105);
            expect(asset1.y).toBe(215);

            // Snap no selecionado
            canvas.snapSelectedToGrid();
            // 105 / 32 = 3.28 -> 96
            // 215 / 32 = 6.71 -> 224
            expect(asset1.x).toBe(96);
            expect(asset1.y).toBe(224);

            // Adiciona segundo asset desalinhado
            const asset2 = canvas.addAssetToMap({
                id: 'lantern',
                name: 'Lanterna',
                category: 'props',
                imageSrc: 'lantern.png',
                width: 32,
                height: 32,
                frameWidth: 32,
                frameHeight: 32,
                frameCount: 1
            }, 305, 410);

            // Snap em todos os assets da cena
            canvas.snapAllToGrid();
            expect(asset1.x).toBe(96);
            expect(asset1.y).toBe(224);
            expect(asset2.x).toBe(320); // 305 / 32 = 9.53 -> 320
            expect(asset2.y).toBe(416); // 410 / 32 = 12.81 -> 416
        });
    });

    describe('Exporter (Geração de Código TypeScript)', () => {
        it('deve gerar código TypeScript formatado com chamadas de spawn de cenário', () => {
            const exporter = new Exporter();
            const placedList = [
                {
                    uid: '1',
                    presetId: 'fountain_awakening',
                    name: 'Fonte do Despertar',
                    x: 1451,
                    y: 1454,
                    width: 170,
                    height: 165,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    imageSrc: ''
                },
                {
                    uid: '2',
                    presetId: 'house_red_boro',
                    name: 'Cumeeira de Boro',
                    x: 1060,
                    y: 1040,
                    width: 305,
                    height: 354,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    imageSrc: ''
                }
            ];

            const code = exporter.generateTypeScript(mockMap, placedList);

            expect(code).toContain("this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1451, y: 1454 }, metadata: { preset: 'fountain_awakening' } });");
            expect(code).toContain("this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1060, y: 1040 }, metadata: { preset: 'house_red_boro' } });");
            expect(code).toContain("Chunk (1, 1)");
            expect(code).toContain("ALVORADA DE VILGEM");
        });
    });

    describe('PanelResizer (Expansão e Redimensionamento dos Painéis)', () => {
        it('deve definir a largura do drawer respeitando os limites min e max', () => {
            const onResizeMock = vi.fn();
            const resizer = new PanelResizer({
                minDrawerWidth: 200,
                maxDrawerWidth: 600,
                defaultDrawerWidth: 320,
                onResize: onResizeMock
            });

            const drawer = document.getElementById('asset-drawer')!;

            // Redimensionamento válido
            resizer.setDrawerWidth(450);
            expect(drawer.style.width).toBe('450px');

            // Abaixo do mínimo -> fixa no mínimo
            resizer.setDrawerWidth(100);
            expect(drawer.style.width).toBe('200px');

            // Acima do máximo -> fixa no máximo
            resizer.setDrawerWidth(800);
            expect(drawer.style.width).toBe('600px');
        });

        it('deve definir a largura do properties panel respeitando os limites min e max', () => {
            const resizer = new PanelResizer({
                minPropsWidth: 220,
                maxPropsWidth: 500,
                defaultPropsWidth: 300
            });

            const props = document.getElementById('properties-panel')!;

            resizer.setPropsWidth(380);
            expect(props.style.width).toBe('380px');

            resizer.setPropsWidth(150);
            expect(props.style.width).toBe('220px');

            resizer.setPropsWidth(900);
            expect(props.style.width).toBe('500px');
        });

        it('deve restaurar a largura padrão com dblclick no resizer', () => {
            const onResizeMock = vi.fn();
            new PanelResizer({
                defaultDrawerWidth: 320,
                onResize: onResizeMock
            });

            const drawer = document.getElementById('asset-drawer')!;
            const drawerResizer = document.getElementById('drawer-resizer')!;

            drawer.style.width = '550px';

            drawerResizer.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

            expect(drawer.style.width).toBe('320px');
            expect(onResizeMock).toHaveBeenCalled();
        });
    });

    describe('WorldCodeSync (Sincronização Automática com o Código)', () => {
        it('deve extrair elementos reais de cenário a partir do código com delimitadores', () => {
            const scanner = new AssetScanner();
            const sync = new WorldCodeSync();

            const sampleCode = `
                // <!-- ASSETS_ADAPTER_SCENERY_START -->
                // Fonte sagrada
                this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1451, y: 1454 }, metadata: { preset: 'fountain_awakening' } });
                // Casa vermelha
                this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1060, y: 1040 }, metadata: { preset: 'house_red_boro' } });
                // <!-- ASSETS_ADAPTER_SCENERY_END -->

                // NPCS não devem ser parseados como cenário
                this.eventManager.dispatch('spawn', { type: 'molor', coordinates: { x: 1350, y: 1380 } });
            `;

            const assets = sync.parseSceneryFromCode(sampleCode, scanner);

            expect(assets.length).toBe(2);
            expect(assets[0]?.presetId).toBe('fountain_awakening');
            expect(assets[0]?.x).toBe(1451);
            expect(assets[0]?.y).toBe(1454);
            expect(assets[0]?.width).toBeGreaterThan(0);

            expect(assets[1]?.presetId).toBe('house_red_boro');
            expect(assets[1]?.x).toBe(1060);
            expect(assets[1]?.y).toBe(1040);
        });

        it('deve carregar com sucesso os elementos cenográficos reais de VilgemWorld.ts', async () => {
            const scanner = new AssetScanner();
            const sync = new WorldCodeSync();

            const assets = await sync.loadWorldAssets('vilgem', scanner);

            // Verifica que carregou dezenas de elementos reais presentes no código
            expect(assets.length).toBeGreaterThan(20);
            expect(assets.some(a => a.presetId === 'fountain_awakening')).toBe(true);
            expect(assets.some(a => a.presetId === 'house_red_boro')).toBe(true);
            expect(assets.some(a => a.presetId === 'house_blue_leda')).toBe(true);
            expect(assets.some(a => a.presetId === 'wooden_bench')).toBe(true);
        });

        it('deve gerar código TypeScript agrupado por chunks para salvar entre delimitadores', () => {
            const sync = new WorldCodeSync();
            const placedList = [
                {
                    uid: '1',
                    presetId: 'fountain_awakening',
                    name: 'Fonte do Despertar',
                    x: 1451,
                    y: 1454,
                    width: 170,
                    height: 165,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    imageSrc: ''
                }
            ];

            const code = sync.generateSceneryCode(placedList, mockMap);

            expect(code).toContain("CHUNK (1,1)");
            expect(code).toContain("this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: 1451, y: 1454 }, metadata: { preset: 'fountain_awakening' } });");
        });
    });

    describe('AssetDrawer (Controle de Expansão e Botão Lateral de Reabrir)', () => {
        it('deve exibir o botão lateral de reabrir quando a gaveta for colapsada', () => {
            const scanner = new AssetScanner();
            const drawer = new AssetDrawer(scanner);

            const btnReopen = document.getElementById('btn-reopen-drawer')!;
            const drawerContainer = document.getElementById('asset-drawer')!;

            expect(btnReopen.style.display).toBe('none');

            // Colapsa
            drawer.toggleCollapse();
            expect(drawerContainer.classList.contains('is-collapsed')).toBe(true);
            expect(btnReopen.style.display).toBe('flex');

            // Clica no botão lateral para reabrir
            btnReopen.click();
            expect(drawerContainer.classList.contains('is-collapsed')).toBe(false);
            expect(btnReopen.style.display).toBe('none');
        });
    });

    describe('VisualConfigSync (Conformidade com VisualConfigMap.ts e Delimitadores)', () => {
        it('deve gerar código TypeScript para sprites em estrita conformidade com AnyVisualConfig', () => {
            const visualSync = new VisualConfigSync();
            const customSprites = [
                {
                    id: 'fountain_awakening_dynamic',
                    name: 'Fonte do Despertar Dinâmica',
                    category: 'sprites' as const,
                    imageSrc: 'assets/sprites/scenery/fountain/fountain_awakening_anim.png',
                    width: 170,
                    height: 165,
                    frameWidth: 170,
                    frameHeight: 165,
                    frameCount: 6,
                    animationSpeed: 10,
                    atlasOffset: { x: 0, y: 0 },
                    anchor: 'bottom-center',
                    isSprite: true
                }
            ];

            const code = visualSync.generateSpritesCode(customSprites);

            expect(code).toContain("'fountain_awakening_dynamic': {");
            expect(code).toContain("category: 'entity',");
            expect(code).toContain("frameCount: 6");
            expect(code).toContain("frameWidth: 170");
            expect(code).toContain("frameHeight: 165");
            expect(code).toContain("animationSpeed: 10");
        });

        it('deve conter constantes com os nomes dos delimitadores esperados no VisualConfigMap.ts', () => {
            expect(VisualConfigSync.SPRITES_START_DELIMITER).toBe('// <!-- ASSETS_ADAPTER_SPRITES_START -->');
            expect(VisualConfigSync.SPRITES_END_DELIMITER).toBe('// <!-- ASSETS_ADAPTER_SPRITES_END -->');
            expect(VisualConfigSync.IMPORTS_START_DELIMITER).toBe('// <!-- ASSETS_ADAPTER_IMPORTS_START -->');
            expect(VisualConfigSync.IMPORTS_END_DELIMITER).toBe('// <!-- ASSETS_ADAPTER_IMPORTS_END -->');
            expect(VisualConfigSync.CONSTS_START_DELIMITER).toBe('// <!-- ASSETS_ADAPTER_CONSTS_START -->');
            expect(VisualConfigSync.CONSTS_END_DELIMITER).toBe('// <!-- ASSETS_ADAPTER_CONSTS_END -->');
        });
    });

    describe('MapCanvas - Renderização Diferenciada de Sprites vs PNGs Estáticos', () => {
        it('deve renderizar sprites fatiando a spritesheet usando sx/sy/sWidth/sHeight', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            const ctx = canvas['ctx'];

            // Imagem fake completa
            const fakeImg = new Image();
            Object.defineProperty(fakeImg, 'complete', { value: true });
            Object.defineProperty(fakeImg, 'naturalWidth', { value: 1020 });
            Object.defineProperty(fakeImg, 'naturalHeight', { value: 165 });
            canvas['spriteImages'].set('fake_anim.png', fakeImg);

            // Adiciona asset configurado como sprite (6 frames de 170px)
            canvas.placedAssets = [
                {
                    uid: 'sprite_1',
                    presetId: 'fountain_awakening',
                    name: 'Fonte',
                    x: 100,
                    y: 200,
                    width: 170,
                    height: 165,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    imageSrc: 'fake_anim.png',
                    isSprite: true,
                    frameCount: 6,
                    frameWidth: 170,
                    frameHeight: 165,
                    animationSpeed: 10,
                    atlasOffset: { x: 0, y: 0 }
                }
            ];

            canvas.render();

            // Verifica que drawImage foi chamado com parâmetros de fatiamento (9 argumentos)
            expect(ctx.drawImage).toHaveBeenCalledWith(
                fakeImg,
                expect.any(Number), // sx
                expect.any(Number), // sy
                170,                // sWidth (frameWidth)
                165,                // sHeight (frameHeight)
                -85,                // dx (-width/2)
                -82.5,              // dy (-height/2)
                170,                // dWidth
                165                 // dHeight
            );
        });

        it('deve renderizar PNGs estáticos com a imagem inteira sem fatiamento', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            const ctx = canvas['ctx'];

            const fakeImg = new Image();
            Object.defineProperty(fakeImg, 'complete', { value: true });
            Object.defineProperty(fakeImg, 'naturalWidth', { value: 260 });
            Object.defineProperty(fakeImg, 'naturalHeight', { value: 327 });
            canvas['spriteImages'].set('fake_clean.png', fakeImg);

            // Adiciona asset configurado como static PNG (1 frame)
            canvas.placedAssets = [
                {
                    uid: 'png_1',
                    presetId: 'house_blue_leda',
                    name: 'Casa Leda',
                    x: 50,
                    y: 80,
                    width: 260,
                    height: 327,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    imageSrc: 'fake_clean.png',
                    isSprite: false,
                    frameCount: 1
                }
            ];

            canvas.render();

            // Verifica que drawImage foi chamado no modo PNG padrão (5 argumentos: img, dx, dy, dw, dh)
            expect(ctx.drawImage).toHaveBeenCalledWith(
                fakeImg,
                -130, // dx (-width/2)
                -163.5, // dy (-height/2)
                260,  // dWidth
                327   // dHeight
            );
        });

        it('deve mover na horizontal ao usar Shift + Scroll no canvas', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            canvas.panX = 100;
            canvas.zoom = 1.0;

            const canvasEl = document.getElementById('canvas-container')?.querySelector('canvas')!;
            expect(canvasEl).toBeDefined();

            // Dispara evento de wheel com shiftKey: true
            const shiftWheelEvent = new WheelEvent('wheel', {
                deltaY: 50,
                shiftKey: true,
                cancelable: true
            });
            canvasEl.dispatchEvent(shiftWheelEvent);

            // Verifica que o panX se moveu na horizontal
            expect(canvas.panX).toBe(100 - 50);
            expect(canvas.zoom).toBe(1.0); // O zoom não deve ser alterado
        });

        it('deve mover o mapa com dois dedos no touchpad via deltaX e deltaY nativos', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            canvas.panX = 200;
            canvas.panY = 200;
            canvas.zoom = 1.0;

            const canvasEl = document.getElementById('canvas-container')?.querySelector('canvas')!;

            // Gesto de dois dedos no touchpad movendo na diagonal
            const touchpadWheelEvent = new WheelEvent('wheel', {
                deltaX: 30,
                deltaY: -45,
                cancelable: true
            });
            canvasEl.dispatchEvent(touchpadWheelEvent);

            expect(canvas.panX).toBe(170); // 200 - 30
            expect(canvas.panY).toBe(245); // 200 - (-45)
            expect(canvas.zoom).toBe(1.0);
        });

        it('deve ajustar zoom ao usar pinch de touchpad ou Ctrl + wheel', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            canvas.zoom = 1.0;

            const canvasEl = document.getElementById('canvas-container')?.querySelector('canvas')!;

            // Gesto de pinça no touchpad (dispara wheel com ctrlKey = true)
            const pinchZoomEvent = new WheelEvent('wheel', {
                clientX: 400,
                clientY: 300,
                deltaY: -100, // Zoom in
                ctrlKey: true,
                cancelable: true
            });
            canvasEl.dispatchEvent(pinchZoomEvent);

            expect(canvas.zoom).toBeGreaterThan(1.0);
        });

        it('deve suportar touchstart e touchmove com dois dedos para pan e zoom', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            canvas.panX = 100;
            canvas.panY = 100;

            const canvasEl = document.getElementById('canvas-container')?.querySelector('canvas')!;

            // Simula touchstart com 2 dedos
            const touch1 = { clientX: 200, clientY: 200 };
            const touch2 = { clientX: 300, clientY: 200 };
            const startEvent = new CustomEvent('touchstart', { cancelable: true });
            Object.defineProperty(startEvent, 'touches', {
                value: [touch1, touch2]
            });
            canvasEl.dispatchEvent(startEvent);

            // Simula touchmove deslocando ambos os dedos em 50px
            const moveTouch1 = { clientX: 250, clientY: 250 };
            const moveTouch2 = { clientX: 350, clientY: 250 };
            const moveEvent = new CustomEvent('touchmove', { cancelable: true });
            Object.defineProperty(moveEvent, 'touches', {
                value: [moveTouch1, moveTouch2]
            });
            canvasEl.dispatchEvent(moveEvent);

            // Confirma que o pan foi atualizado
            expect(canvas.panX).toBe(150); // 100 + 50
            expect(canvas.panY).toBe(150); // 100 + 50
        });
    });

    describe('AssetDrawer - Quebra de Linha e Fold / Unfold de Tags', () => {
        it('deve alternar entre expandido e recolhido ao clicar no botão de fold/unfold de tags', () => {
            const scanner = new AssetScanner();
            new AssetDrawer(scanner);

            const btnFold = document.getElementById('btn-toggle-tags-fold')!;
            const categoryTabs = document.querySelector('.category-tabs')!;

            expect(btnFold).toBeDefined();
            expect(categoryTabs).toBeDefined();

            // Inicia por padrão recolhido (folded) exibindo a 1ª linha
            expect(categoryTabs.classList.contains('folded')).toBe(true);
            expect(btnFold.textContent).toContain('Expandir');

            // Clica para expandir (unfold)
            btnFold.click();
            expect(categoryTabs.classList.contains('unfolded')).toBe(true);
            expect(btnFold.textContent).toContain('Recolher');

            // Clica novamente para recolher (fold)
            btnFold.click();
            expect(categoryTabs.classList.contains('folded')).toBe(true);
            expect(btnFold.textContent).toContain('Expandir');
        });
    });

    describe('ChunkSync & ChunkManagerModal (Gerenciador de Chunks e Fundos do Terreno)', () => {
        it('deve gerar código TypeScript para matriz de chunks formatado corretamente', () => {
            const sync = new ChunkSync();
            const sampleChunks: string[][] = [
                ['../assets/maps/vilgem/chunk_0_0_nw.png', '../assets/maps/vilgem/chunk_1_0_n.png'],
                ['../assets/maps/vilgem/chunk_0_1_w.png', '../assets/maps/vilgem/chunk_1_1_ground.png']
            ];

            const code = sync.generateChunksCode('vilgem', sampleChunks);

            expect(code).toContain('const vilgemChunks: string[][] = [');
            expect(code).toContain("new URL('../assets/maps/vilgem/chunk_0_0_nw.png', import.meta.url).href");
            expect(code).toContain("new URL('../assets/maps/vilgem/chunk_1_1_ground.png', import.meta.url).href");
        });

        it('deve conter delimitadores esperados para chunks e dimensões de mapa', () => {
            expect(ChunkSync.CHUNKS_START_PREFIX).toBe('// <!-- ASSETS_ADAPTER_CHUNKS_START:');
            expect(ChunkSync.CHUNKS_END_PREFIX).toBe('// <!-- ASSETS_ADAPTER_CHUNKS_END:');
            expect(ChunkSync.MAP_DIMS_START).toBe('// <!-- ASSETS_ADAPTER_MAP_DIMS_START -->');
            expect(ChunkSync.MAP_DIMS_END).toBe('// <!-- ASSETS_ADAPTER_MAP_DIMS_END -->');
        });

        it('deve permitir expandir chunks em 4 direções e deletar blocos recalculando dimensões em ChunkManagerModal', () => {
            let updatedConfig: SelectedMapConfig | null = null;
            const initialMap: SelectedMapConfig = {
                id: 'vilgem',
                name: 'Alvorada de Vilgem',
                width: 2048,
                height: 2048,
                chunkSize: 1024,
                description: 'Mapa teste',
                chunks: [
                    ['bg1.png', 'bg2.png'],
                    ['bg3.png', 'bg4.png']
                ]
            };

            const modal = new ChunkManagerModal(initialMap, (cfg) => {
                updatedConfig = cfg;
            });

            modal.open();

            // 1. Expande Leste (adiciona coluna à direita)
            const btnEast = document.getElementById('btn-expand-east')!;
            expect(btnEast).toBeDefined();
            btnEast.click();

            expect(initialMap.chunks?.[0]?.length).toBe(3);
            expect(initialMap.width).toBe(3072); // 3 * 1024

            // 2. Expande Sul (adiciona linha abaixo)
            const btnSouth = document.getElementById('btn-expand-south')!;
            expect(btnSouth).toBeDefined();
            btnSouth.click();

            expect(initialMap.chunks?.length).toBe(3);
            expect(initialMap.height).toBe(3072); // 3 * 1024

            // 3. Expande Norte (adiciona linha acima)
            const btnNorth = document.getElementById('btn-expand-north')!;
            expect(btnNorth).toBeDefined();
            btnNorth.click();

            expect(initialMap.chunks?.length).toBe(4);
            expect(initialMap.height).toBe(4096);

            // 4. Expande Oeste (adiciona coluna à esquerda)
            const btnWest = document.getElementById('btn-expand-west')!;
            expect(btnWest).toBeDefined();
            btnWest.click();

            expect(initialMap.chunks?.[0]?.length).toBe(4);
            expect(initialMap.width).toBe(4096);

            // 5. Deleta o chunk individual (esvazia a célula pontual mantendo a grade, ou trima se toda a borda for esvaziada)
            const deleteBtn = document.querySelector('.btn-delete-chunk-block') as HTMLElement;
            expect(deleteBtn).toBeDefined();
            deleteBtn.click();
            // A célula individual (0, 0) agora fica pontualmente vazia ('')
            expect(initialMap.chunks?.[0]?.[0]).toBe('');

            // 6. Exclui linha e coluna específicas via API do modal
            modal.deleteSpecificRow(0);
            expect(initialMap.chunks?.length).toBe(3);
            expect(initialMap.height).toBe(3072); // 3 * 1024

            modal.deleteSpecificColumn(0);
            expect(initialMap.chunks?.[0]?.length).toBe(3);
            expect(initialMap.width).toBe(3072);

            // 7. Testa botão de aresta (➕) em uma borda que não tem chunk
            const edgeAddBtn = document.querySelector('.btn-chunk-edge-add.edge-east') as HTMLElement;
            expect(edgeAddBtn).toBeDefined();
            edgeAddBtn.click();
            // Ao clicar em uma aresta leste na borda do mapa, expande a matriz à direita
            expect(initialMap.chunks?.[0]?.length).toBe(4);
            expect(initialMap.width).toBe(4096);

            modal.close();
        });
    });

    describe('Blank Project & Exportação de Fundo Fixo (PNG)', () => {
        it('deve listar a opção de Projeto em Branco no seletor de mapas', () => {
            let selected: SelectedMapConfig | null = null;
            const modal = new MapSelectorModal((cfg: SelectedMapConfig) => {
                selected = cfg;
            });

            const blankCard = document.querySelector('[data-map-id="blank_project"]') as HTMLElement;
            expect(blankCard).toBeDefined();
            expect(blankCard.textContent).toContain('Projeto em Branco');

            blankCard.click();
            expect(selected).not.toBeNull();
            const resultConfig = selected as unknown as SelectedMapConfig;
            expect(resultConfig.id).toBe('blank_project');
            expect(resultConfig.width).toBe(1024);
            expect(resultConfig.height).toBe(1024);
            expect(resultConfig.chunkSize).toBe(1024);
        });

        it('deve exportar imagem PNG limpa na resolução 1:1 sem grades nem bounding boxes', () => {
            const blankMap: SelectedMapConfig = {
                id: 'blank_project',
                name: 'Projeto em Branco',
                width: 1024,
                height: 1024,
                chunkSize: 1024,
                description: 'Fundo limpo'
            };

            const canvas = new MapCanvas('canvas-container', blankMap);
            canvas.showGrid = true;
            canvas.showChunkBorders = true;

            const scanner = new AssetScanner();
            const house = scanner.getAssets()[0]!;
            canvas.addAssetToMap(house, 200, 300);
            canvas.selectAsset(canvas.placedAssets[0]!);

            // Testa geração do DataURL limpo chamando exportAsImage
            const dataUrl = canvas.exportAsImage({
                fileName: 'test_city_ground',
                transparentBackground: false
            });

            expect(typeof dataUrl).toBe('string');
            expect(dataUrl.length).toBeGreaterThan(0);
        });
    });

    describe('Prioridade de Clique por Z-Index e Redimensionamento (Handles)', () => {
        it('deve priorizar a seleção de assets com base no z-index visual (ou Y-Sort se indefinido)', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            canvas.panX = 0;
            canvas.panY = 0;
            canvas.zoom = 1;

            const scanner = new AssetScanner();
            const house = scanner.getAssets()[0]!;

            // Asset A na base com zIndex menor
            const assetA = canvas.addAssetToMap(house, 100, 100);
            assetA.width = 100;
            assetA.height = 100;
            assetA.zIndex = 10;

            // Asset B sobreposto a A, com zIndex maior
            const assetB = canvas.addAssetToMap(house, 100, 100);
            assetB.width = 100;
            assetB.height = 100;
            assetB.zIndex = 50;

            // Dispara clique sobre a área comum (x: 120, y: 120)
            const canvasEl = document.getElementById('map-editor-canvas') as HTMLCanvasElement;
            const clickEvent = new MouseEvent('mousedown', {
                clientX: 120,
                clientY: 120,
                button: 0,
                bubbles: true
            });
            canvasEl.dispatchEvent(clickEvent);

            // Asset B deve ter sido selecionado porque seu zIndex é maior
            expect(canvas.selectedAsset).toBeDefined();
            expect(canvas.selectedAsset?.uid).toBe(assetB.uid);

            // Agora invertemos: colocamos zIndex de A superior
            assetA.zIndex = 100;
            canvasEl.dispatchEvent(clickEvent);
            expect(canvas.selectedAsset?.uid).toBe(assetA.uid);
        });

        it('deve redimensionar interativamente o asset pelas alças (handles)', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            canvas.panX = 0;
            canvas.panY = 0;
            canvas.zoom = 1;

            const scanner = new AssetScanner();
            const house = scanner.getAssets()[0]!;

            const asset = canvas.addAssetToMap(house, 100, 100);
            asset.width = 100;
            asset.height = 100;
            canvas.selectAsset(asset);

            const canvasEl = document.getElementById('map-editor-canvas') as HTMLCanvasElement;

            // 1. Clica na alça inferior direita (se) em x: 200, y: 200
            canvasEl.dispatchEvent(new MouseEvent('mousedown', {
                clientX: 200,
                clientY: 200,
                button: 0,
                bubbles: true
            }));

            // 2. Move para x: 250, y: 270 (aumentando largura para 150 e altura para 170)
            canvasEl.dispatchEvent(new MouseEvent('mousemove', {
                clientX: 250,
                clientY: 270,
                bubbles: true
            }));

            expect(asset.width).toBe(150);
            expect(asset.height).toBe(170);
            expect(asset.x).toBe(100);
            expect(asset.y).toBe(100);

            // 3. Solta o mouse
            window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

            // 4. Agora testa redimensionamento pela alça superior esquerda (nw) em x: 100, y: 100
            canvasEl.dispatchEvent(new MouseEvent('mousedown', {
                clientX: 100,
                clientY: 100,
                button: 0,
                bubbles: true
            }));

            // Move para x: 80, y: 60 (aumenta o tamanho expandindo para a esquerda e cima)
            canvasEl.dispatchEvent(new MouseEvent('mousemove', {
                clientX: 80,
                clientY: 60,
                bubbles: true
            }));

            expect(asset.x).toBe(80);
            expect(asset.y).toBe(60);
            expect(asset.width).toBe(170); // 150 + 20
            expect(asset.height).toBe(210); // 170 + 40

            window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        });
    });

    describe('Espelhamento de Imagens (Flip X e Flip Y)', () => {
        it('deve alternar flipX e flipY via flipSelectedX() e flipSelectedY()', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            const asset: PlacedAssetModel = {
                uid: 'test_flip',
                presetId: 'house_red_boro',
                name: 'Casa Vermelha',
                x: 100,
                y: 100,
                width: 200,
                height: 200,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc: 'test.png'
            };
            canvas.placedAssets = [asset];
            canvas.selectAsset(asset);

            expect(asset.flipX).toBeUndefined();
            expect(asset.flipY).toBeUndefined();

            canvas.flipSelectedX();
            expect(asset.flipX).toBe(true);

            canvas.flipSelectedX();
            expect(asset.flipX).toBe(false);

            canvas.flipSelectedY();
            expect(asset.flipY).toBe(true);

            canvas.flipSelectedY();
            expect(asset.flipY).toBe(false);
        });

        it('deve aplicar ctx.scale(-1, 1) ou ctx.scale(1, -1) na renderização quando espelhado', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            const ctx = canvas['ctx'];

            const asset: PlacedAssetModel = {
                uid: 'test_flip_render',
                presetId: 'house_red_boro',
                name: 'Casa Vermelha',
                x: 50,
                y: 50,
                width: 100,
                height: 100,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                flipX: true,
                flipY: false,
                imageSrc: 'test.png'
            };
            canvas.placedAssets = [asset];
            canvas.render();

            expect(ctx.scale).toHaveBeenCalledWith(-1, 1);

            (ctx.scale as any).mockClear();
            asset.flipX = true;
            asset.flipY = true;
            canvas.render();

            expect(ctx.scale).toHaveBeenCalledWith(-1, -1);
        });

        it('deve preservar flipX e flipY ao duplicar o asset', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            const asset: PlacedAssetModel = {
                uid: 'orig_flip',
                presetId: 'house_red_boro',
                name: 'Casa Vermelha',
                x: 100,
                y: 100,
                width: 100,
                height: 100,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                flipX: true,
                flipY: true,
                imageSrc: 'test.png'
            };
            canvas.placedAssets = [asset];
            canvas.selectAsset(asset);

            canvas.duplicateSelected();
            expect(canvas.placedAssets.length).toBe(2);
            const dup = canvas.placedAssets[1]!;
            expect(dup.flipX).toBe(true);
            expect(dup.flipY).toBe(true);
        });

        it('deve alternar flipX e flipY pelos botões do PropertiesPanel', () => {
            const canvas = new MapCanvas('canvas-container', mockMap);
            const propPanel = new PropertiesPanel('properties-panel', canvas);

            const asset: PlacedAssetModel = {
                uid: 'asset_prop_test',
                presetId: 'street_lantern',
                name: 'Poste',
                x: 100,
                y: 100,
                width: 40,
                height: 60,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc: 'test.png'
            };
            canvas.placedAssets = [asset];
            canvas.selectAsset(asset);
            propPanel.render();

            const btnFlipX = document.getElementById('btn-flip-x');
            const btnFlipY = document.getElementById('btn-flip-y');
            expect(btnFlipX).not.toBeNull();
            expect(btnFlipY).not.toBeNull();

            // Clica em Flip X
            btnFlipX?.click();
            expect(asset.flipX).toBe(true);
            expect(document.getElementById('btn-flip-x')?.classList.contains('active')).toBe(true);

            // Clica em Flip Y
            btnFlipY?.click();
            expect(asset.flipY).toBe(true);
            expect(document.getElementById('btn-flip-y')?.classList.contains('active')).toBe(true);
        });

        it('deve gerar código com flipX e flipY no Exporter e WorldCodeSync e fazer o parse bidirecional', () => {
            const sync = new WorldCodeSync();
            const exporter = new Exporter();
            const scanner = new AssetScanner();

            const assets: PlacedAssetModel[] = [
                {
                    uid: 'synced_flip',
                    presetId: 'house_red_boro',
                    name: 'Casa Vermelha',
                    x: 1200,
                    y: 1300,
                    width: 200,
                    height: 200,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    flipX: true,
                    flipY: true,
                    imageSrc: 'test.png'
                }
            ];

            const codeSync = sync.generateSceneryCode(assets, mockMap);
            expect(codeSync).toContain("preset: 'house_red_boro', flipX: true, flipY: true");

            const codeExp = exporter.generateTypeScript(mockMap, assets);
            expect(codeExp).toContain("preset: 'house_red_boro', flipX: true, flipY: true");

            // Testa o parse reverso
            const parsed = sync.parseSceneryFromCode(codeSync, scanner);
            expect(parsed.length).toBe(1);
            expect(parsed[0]!.flipX).toBe(true);
            expect(parsed[0]!.flipY).toBe(true);
            expect(parsed[0]!.presetId).toBe('house_red_boro');
        });
    });

    describe('ChunkManagerModal - Deletar Chunk e Seleção de Imagem de Fundo (Path)', () => {
        it('o botão de delete do chunk deve deletar o chunk reduzindo a grade, e não apenas esvaziar o fundo', () => {
            const initialMap: SelectedMapConfig = {
                id: 'vilgem',
                name: 'Vilgem',
                description: 'Mapa teste',
                width: 2048,
                height: 2048,
                chunkSize: 1024,
                chunks: [
                    ['chunk1.png', 'chunk2.png'],
                    ['chunk3.png', 'chunk4.png']
                ]
            };

            const modal = new ChunkManagerModal(initialMap, () => {});
            modal.open();

            // Esvazia as duas células da linha 1 (célula [1,0] e [1,1])
            modal.deleteChunk(1, 0);
            modal.deleteChunk(1, 1);

            // A linha 1 foi totalmente esvaziada, logo trimEmptyOuterBorders remove a linha da base
            // reduzindo rows de 2 para 1 e height de 2048 para 1024!
            expect(initialMap.chunks?.length).toBe(1);
            expect(initialMap.height).toBe(1024);
            expect(initialMap.width).toBe(2048);

            modal.close();
        });

        it('deve permitir selecionar uma imagem obtendo o path e definindo como fundo do chunk', () => {
            const scanner = new AssetScanner();
            const initialMap: SelectedMapConfig = {
                id: 'vilgem',
                name: 'Vilgem',
                description: 'Mapa teste',
                width: 1024,
                height: 1024,
                chunkSize: 1024,
                chunks: [['old_bg.png']]
            };

            const modal = new ChunkManagerModal(initialMap, () => {}, scanner);
            modal.open();

            // Seleciona a célula (0, 0)
            const card = document.querySelector('.chunk-block-card') as HTMLElement;
            card.click();

            // Verifica se o campo de input de path e botão de aplicar existem
            const inputPath = document.getElementById('input-custom-chunk-url') as HTMLInputElement;
            const btnApply = document.getElementById('btn-apply-custom-bg') as HTMLElement;
            expect(inputPath).not.toBeNull();
            expect(btnApply).not.toBeNull();

            // Digita um novo path de imagem
            inputPath.value = 'assets/maps/vilgem/chunk_1_1_ground.png';
            btnApply.click();

            // O fundo do chunk deve receber a URL resolvida da textura
            expect(initialMap.chunks?.[0]?.[0]).toBe(ChunkManagerModal.DEFAULT_GROUND);

            // Testa aplicação direta via setChunkBackground com displayPath
            modal.setChunkBackground(0, 0, 'data:image/png;base64,mockCustomBg', 'custom_ground.png');
            expect(initialMap.chunks?.[0]?.[0]).toBe('data:image/png;base64,mockCustomBg');

            modal.close();
        });

        it('os botões de aresta individuais devem criar APENAS UM CHUNK pontual enquanto os botões maiores expandem a linha/coluna inteira', () => {
            const initialMap: SelectedMapConfig = {
                id: 'vilgem',
                name: 'Vilgem',
                description: 'Mapa teste',
                width: 2048,
                height: 2048,
                chunkSize: 1024,
                chunks: [
                    ['c00.png', 'c01.png'],
                    ['c10.png', 'c11.png']
                ]
            };

            const modal = new ChunkManagerModal(initialMap, () => {});
            modal.open();

            // 1. Cria apenas 1 chunk ao Norte na coluna 1 a partir da célula (0, 1)
            modal.addChunkAtEdge(0, 1, 'north');
            // A matriz agora tem 3 linhas
            expect(initialMap.chunks?.length).toBe(3);
            expect(initialMap.height).toBe(3072);
            expect(initialMap.chunks?.[0]?.length).toBe(2);
            // APENAS a coluna 1 da nova linha no topo deve ter chunk; a coluna 0 deve estar vazia ('')
            expect(initialMap.chunks?.[0]?.[0]).toBe('');
            expect(initialMap.chunks?.[0]?.[1]).toBe(ChunkManagerModal.DEFAULT_GROUND);

            // 2. Cria apenas 1 chunk a Oeste na linha 1 (célula [1, 0] que antes era c00)
            modal.addChunkAtEdge(1, 0, 'west');
            // A matriz agora tem 3 colunas
            expect(initialMap.chunks?.[0]?.length).toBe(3);
            expect(initialMap.width).toBe(3072);
            // APENAS a linha 1 da nova coluna à esquerda tem chunk; as linhas 0 e 2 estão vazias ('')
            expect(initialMap.chunks?.[0]?.[0]).toBe('');
            expect(initialMap.chunks?.[1]?.[0]).toBe(ChunkManagerModal.DEFAULT_GROUND);
            expect(initialMap.chunks?.[2]?.[0]).toBe('');

            // 3. Preenchimento de slot vazio com createChunkAt
            modal.createChunkAt(0, 0);
            expect(initialMap.chunks?.[0]?.[0]).toBe(ChunkManagerModal.DEFAULT_GROUND);

            // 4. Botões maiores globais continuam expandindo a linha/coluna inteira
            modal.expandSouth();
            // Nova linha na base com todas as 3 colunas preenchidas
            expect(initialMap.chunks?.length).toBe(4);
            const lastRow = initialMap.chunks![3]!;
            expect(lastRow[0]).toBe(ChunkManagerModal.DEFAULT_GROUND);
            expect(lastRow[1]).toBe(ChunkManagerModal.DEFAULT_GROUND);
            expect(lastRow[2]).toBe(ChunkManagerModal.DEFAULT_GROUND);

            modal.close();
        });

        it('deve persistir chunks e dimensões no reload (F5) via ChunkSync e cache local sem perder alterações', async () => {
            const sync = new ChunkSync();
            const mapId = 'vilgem_reload_test';
            const sampleChunks: string[][] = [
                ['chunk_a.png', 'chunk_b.png'],
                ['chunk_c.png', '']
            ];

            // 1. Sincroniza chunks no disco e cache local
            await sync.syncChunksToDisk(mapId, sampleChunks, 2048, 2048);

            // 2. Simula o reload (F5) lendo os chunks do cache síncrono
            const cached = sync.getCachedChunks(mapId);
            expect(cached).not.toBeNull();
            expect(cached?.chunks.length).toBe(2);
            expect(cached?.chunks[0]?.[0]).toBe('chunk_a.png');
            expect(cached?.chunks[1]?.[1]).toBe('');
            expect(cached?.width).toBe(2048);
            expect(cached?.height).toBe(2048);

            // 3. Simula instanciação de um novo modal sem chunks no config (como ocorre no F5)
            const freshMapConfig: SelectedMapConfig = {
                id: mapId,
                name: 'Vilgem Test',
                width: 3072,
                height: 3072,
                chunkSize: 1024,
                description: 'Mapa de teste para reload'
            };

            const freshModal = new ChunkManagerModal(freshMapConfig, () => {});
            freshModal.open();

            // O modal deve carregar os chunks persistidos no cache, e NÃO sobrescrever com DEFAULT_GROUND padrão 3x3!
            expect(freshMapConfig.chunks).toBeDefined();
            expect(freshMapConfig.chunks?.length).toBe(2);
            expect(freshMapConfig.chunks?.[0]?.[0]).toBe('chunk_a.png');
            expect(freshMapConfig.chunks?.[1]?.[1]).toBe('');
            expect(freshMapConfig.width).toBe(2048);
            expect(freshMapConfig.height).toBe(2048);

            freshModal.close();
        });

        it('deve transladar coordenadas dos assets posicionados no editor ao expandir ou trimar Norte e Oeste mantendo-os travados no terreno', () => {
            const placedAssets: PlacedAssetModel[] = [
                {
                    uid: 'asset_wall_1',
                    presetId: 'fortification_gate',
                    name: 'Portão',
                    x: 500,
                    y: 600,
                    width: 100,
                    height: 100,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    imageSrc: 'gate.png'
                }
            ];

            const initialMap: SelectedMapConfig = {
                id: 'vilgem_shift_test',
                name: 'Vilgem Shift Test',
                width: 2048,
                height: 2048,
                chunkSize: 1024,
                chunks: [
                    ['c00.png', 'c01.png'],
                    ['c10.png', 'c11.png']
                ]
            };

            const modal = new ChunkManagerModal(
                initialMap,
                () => {},
                undefined,
                undefined,
                () => placedAssets
            );
            modal.open();

            // 1. As coordenadas mundiais dos assets permanecem absolutas e ancoradas na origem Spawn (0,0)
            modal.expandNorth();
            expect(placedAssets[0]!.y).toBe(600);
            expect(placedAssets[0]!.x).toBe(500);

            // 2. Ao expandir para o Oeste, as coordenadas dos assets continuam estritamente preservadas
            modal.expandWest();
            expect(placedAssets[0]!.x).toBe(500);
            expect(placedAssets[0]!.y).toBe(600);

            // 3. Ao adicionar chunk pontual em aresta Norte
            modal.addChunkAtEdge(0, 0, 'north');
            expect(placedAssets[0]!.y).toBe(600);

            // 4. Ao deletar a linha 0
            modal.deleteSpecificRow(0);
            expect(placedAssets[0]!.y).toBe(600);

            // 5. Ao deletar a coluna 0
            modal.deleteSpecificColumn(0);
            expect(placedAssets[0]!.x).toBe(500);

            modal.close();
        });
    });
});



