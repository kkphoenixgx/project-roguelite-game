/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InnerMapManager } from '../../../adapters/assets-adapter/Components/InnerMapManager';
import { ChunkManagerModal } from '../../../adapters/assets-adapter/Components/ChunkManagerModal';
import { PropertiesPanel } from '../../../adapters/assets-adapter/Components/PropertiesPanel';
import { MapCanvas } from '../../../adapters/assets-adapter/Components/MapCanvas';
import type { SelectedMapConfig } from '../../../adapters/assets-adapter/Components/MapSelectorModal';
import type { PlacedAssetModel } from '../../../adapters/assets-adapter/Models/PlacedAssetModel';

describe('Assets Adapter - Suporte a PortalLinks e InnerMaps', () => {
    let mockRootMap: SelectedMapConfig;
    let mockInnerMapConfig: SelectedMapConfig;

    beforeEach(() => {
        // Setup JSDOM Canvas Mock
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

        HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockCanvas');

        // Global DOM structure
        document.body.innerHTML = `
            <div id="top-navbar">
                <span class="top-navbar-title-badge"></span>
                <h1>Editor de Assets</h1>
            </div>
            <div id="canvas-container" style="width: 800px; height: 600px;"></div>
            <div id="properties-panel" style="width: 300px;"></div>
        `;

        // Mock fetch para evitar erros de rede do Vite
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({})
        } as any);

        mockRootMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            chunks: [['c00', 'c01'], ['c10', 'c11']],
            description: 'Mundo central'
        };

        mockInnerMapConfig = {
            id: 'interior_forge_vilgem',
            name: 'Forja de Vilgem',
            width: 1024,
            height: 1024,
            chunkSize: 1024,
            backgroundColor: '#1a1410',
            isInnerMap: true,
            parentWorldId: 'vilgem',
            description: 'Interior da ferraria'
        };

        localStorage.clear();
    });

    describe('1. InnerMapManager (Singleton, CRUD & Double-Bind)', () => {
        it('deve instanciar como singleton e listar InnerMaps cadastrados com parentWorldId', () => {
            const manager = InnerMapManager.getInstance();
            expect(manager).toBeDefined();

            const all = manager.getAll();
            expect(all.length).toBeGreaterThan(0);
            expect(all.every(m => typeof m.id === 'string' && typeof m.parentWorldId === 'string')).toBe(true);
        });

        it('deve filtrar InnerMaps estritamente derivados de um mundo pai específico', async () => {
            const manager = InnerMapManager.getInstance();

            await manager.createInnerMap({
                id: 'interior_cottage_alun',
                name: 'Chalé de Alun',
                parentWorldId: 'alun',
                width: 1024,
                height: 1024
            });

            const alunMaps = manager.getInnerMapsForWorld('alun');
            expect(alunMaps.some(m => m.id === 'interior_cottage_alun')).toBe(true);
            expect(alunMaps.every(m => m.parentWorldId === 'alun')).toBe(true);
        });

        it('deve criar novo InnerMap com Double-Bind automático apontando de volta para o mapa pai', async () => {
            const manager = InnerMapManager.getInstance();

            const created = await manager.createInnerMap({
                id: 'interior_tavern_vilgem',
                name: 'Taverna do Javali',
                parentWorldId: 'vilgem',
                width: 1536,
                height: 1024,
                backgroundColor: '#2b1d0c',
                returnPortalCoords: { x: 800, y: 550 }
            });

            expect(created.id).toBe('interior_tavern_vilgem');
            expect(created.parentWorldId).toBe('vilgem');
            expect(created.backgroundColor).toBe('#2b1d0c');
            expect(created.portals).toBeDefined();
            expect(created.portals?.length).toBe(1);

            // Valida o portal de retorno (Double-Bind)
            const returnPortal = created.portals?.[0];
            expect(returnPortal?.targetMapId).toBe('vilgem');
            expect(returnPortal?.targetSpawnCoords).toEqual({ x: 800, y: 550 });
            expect(returnPortal?.type).toBe('direct');
        });

        it('deve sincronizar Double-Bind automático (syncDoubleBind) ao posicionar um portal no editor', async () => {
            const manager = InnerMapManager.getInstance();

            const portalAsset: PlacedAssetModel = {
                uid: 'portal_123',
                presetId: 'portal_wood_door',
                name: 'Porta da Forja',
                x: 1200,
                y: 800,
                width: 64,
                height: 64,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc: 'door.png',
                isPortal: true,
                targetMapId: 'interior_black_forge_test',
                targetSpawnX: 512,
                targetSpawnY: 650
            };

            await manager.syncDoubleBind(portalAsset, mockRootMap);

            const generatedInnerMap = manager.getInnerMap('interior_black_forge_test');
            expect(generatedInnerMap).toBeDefined();
            expect(generatedInnerMap?.parentWorldId).toBe('vilgem');
            expect(generatedInnerMap?.portals).toBeDefined();

            const returnPortal = generatedInnerMap?.portals?.find(p => p.targetMapId === 'vilgem');
            expect(returnPortal).toBeDefined();
            // Ponto seguro fora da colisão da porta: y + height + 15 = 800 + 64 + 15 = 879
            expect(returnPortal?.targetSpawnCoords?.x).toBe(1200);
            expect(returnPortal?.targetSpawnCoords?.y).toBe(879);
        });

        it('deve converter IntermapDefinition para SelectedMapConfig com isInnerMap=true', () => {
            const manager = InnerMapManager.getInstance();
            const def = {
                id: 'interior_library',
                name: 'Biblioteca Arcana',
                parentWorldId: 'vilgem',
                width: 1024,
                height: 1024,
                backgroundColor: '#0a0a14'
            };

            const config = manager.toSelectedMapConfig(def);
            expect(config.id).toBe('interior_library');
            expect(config.isInnerMap).toBe(true);
            expect(config.parentWorldId).toBe('vilgem');
            expect(config.backgroundColor).toBe('#0a0a14');
        });
    });

    describe('2. ChunkManagerModal (Abas de Chunks vs InnerMaps & Controles Visuais)', () => {
        it('deve alternar entre as abas Chunks e InnerMaps renderizando os conteúdos correspondentes', () => {
            const modal = new ChunkManagerModal(mockRootMap, () => {});
            modal.open();

            const tabChunksBtn = document.querySelector('#tab-btn-chunks') as HTMLElement;
            const tabInnerBtn = document.querySelector('#tab-btn-innermaps') as HTMLElement;

            expect(tabChunksBtn).toBeDefined();
            expect(tabInnerBtn).toBeDefined();
            expect(tabChunksBtn.classList.contains('active')).toBe(true);

            // Clica na aba de InnerMaps
            tabInnerBtn.click();
            const activeInnerTab = document.querySelector('#tab-btn-innermaps') as HTMLElement;
            expect(activeInnerTab.classList.contains('active')).toBe(true);
            expect(document.querySelector('.innermaps-cards-grid, .innermaps-catalog-section')).not.toBeNull();
            expect(document.querySelector('.create-innermap-panel, .create-innermap-form')).not.toBeNull();

            // Clica de volta na aba de Chunks
            const freshChunksTab = document.querySelector('#tab-btn-chunks') as HTMLElement;
            freshChunksTab.click();
            const activeChunksTab = document.querySelector('#tab-btn-chunks') as HTMLElement;
            expect(activeChunksTab.classList.contains('active')).toBe(true);
            expect(document.querySelector('.chunk-matrix-container, .chunk-builder-viewport')).not.toBeNull();

            modal.close();
        });

        it('deve exibir controles de cor de fundo sólida em tempo real quando o mapa aberto for um InnerMap', () => {
            const onMapUpdated = vi.fn();
            const modal = new ChunkManagerModal(mockInnerMapConfig, onMapUpdated);
            modal.open();

            const colorPicker = document.querySelector('#innermap-bg-color-picker') as HTMLInputElement;
            const hexInput = document.querySelector('#innermap-bg-hex-input') as HTMLInputElement;

            expect(colorPicker).toBeDefined();
            expect(hexInput).toBeDefined();
            expect(colorPicker.value).toBe('#1a1410');
            expect(hexInput.value).toBe('#1a1410');

            // Altera a cor no seletor
            colorPicker.value = '#0000ff';
            colorPicker.dispatchEvent(new Event('input'));

            expect(mockInnerMapConfig.backgroundColor).toBe('#0000ff');
            expect(onMapUpdated).toHaveBeenCalledWith(mockInnerMapConfig);

            modal.close();
        });

        it('deve permitir navegar imediatamente para um InnerMap selecionado a partir do modal', () => {
            const onOpenMap = vi.fn();
            const modal = new ChunkManagerModal(mockRootMap, () => {}, undefined, onOpenMap);
            modal.open();

            // Alterna para aba de InnerMaps
            (document.querySelector('#tab-btn-innermaps') as HTMLElement).click();

            const openBtn = document.querySelector('.btn-innermap-open') as HTMLElement;
            if (openBtn) {
                openBtn.click();
                expect(onOpenMap).toHaveBeenCalled();
            }

            modal.close();
        });
    });

    describe('3. PropertiesPanel (Navegação com Datalist e Botão de Voltar ao Mundo Pai)', () => {
        let canvas: MapCanvas;
        let onOpenMapMock: any;

        beforeEach(() => {
            canvas = new MapCanvas('canvas-container', mockRootMap);
            onOpenMapMock = vi.fn();
        });

        it('deve renderizar <datalist id="datalist-innermaps"> no campo Mapa de Destino de um PortalLink', () => {
            const portalAsset: PlacedAssetModel = {
                uid: 'p_portal_test',
                presetId: 'portal_stone_gate',
                name: 'Portal Místico',
                x: 100,
                y: 100,
                width: 64,
                height: 64,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc: 'gate.png',
                isPortal: true,
                targetMapId: 'interior_black_default'
            };

            canvas.selectedAsset = portalAsset;
            const panel = new PropertiesPanel(
                'properties-panel',
                canvas,
                undefined,
                undefined,
                undefined,
                undefined,
                onOpenMapMock
            );

            panel.render();

            const targetInput = document.querySelector('#prop-target-map-input') as HTMLInputElement;
            const datalist = document.querySelector('#datalist-innermaps') as HTMLElement;
            const btnOpenTarget = document.querySelector('#btn-prop-open-target-map') as HTMLElement;

            expect(targetInput).toBeDefined();
            expect(targetInput.getAttribute('list')).toBe('datalist-innermaps');
            expect(datalist).toBeDefined();
            expect(datalist.children.length).toBeGreaterThan(0);
            expect(btnOpenTarget).toBeDefined();

            // Clica no botão para abrir o mapa de destino
            btnOpenTarget.click();
            expect(onOpenMapMock).toHaveBeenCalled();
        });

        it('deve exibir o botão "Voltar para Mundo Pai" e controles de cor de fundo na visão geral de um InnerMap', () => {
            const innerCanvas = new MapCanvas('canvas-container', mockInnerMapConfig);
            innerCanvas.selectedAsset = null; // Nenhum asset selecionado -> visão geral

            const panel = new PropertiesPanel(
                'properties-panel',
                innerCanvas,
                undefined,
                undefined,
                undefined,
                undefined,
                onOpenMapMock
            );

            panel.render();

            const btnBackParent = document.querySelector('#btn-back-to-parent-world') as HTMLElement;
            const colorPicker = document.querySelector('#overview-innermap-color') as HTMLInputElement;

            expect(btnBackParent).toBeDefined();
            expect(colorPicker).toBeDefined();

            // Clica para voltar ao mundo pai
            btnBackParent.click();
            expect(onOpenMapMock).toHaveBeenCalledWith(expect.objectContaining({
                id: 'vilgem'
            }));
        });
    });
});
