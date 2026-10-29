/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InnerMapManager } from '../../adapters/assets-adapter/Components/InnerMapManager';
import { PropertiesPanel } from '../../adapters/assets-adapter/Components/PropertiesPanel';
import { MapCanvas } from '../../adapters/assets-adapter/Components/MapCanvas';
import type { SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';
import type { PlacedAssetModel } from '../../adapters/assets-adapter/Models/PlacedAssetModel';

describe('Assets Adapter Regression - PropertiesPanel, Portais e World Spawn', () => {
    let mockRootMap: SelectedMapConfig;
    let mockInnerMapConfig: SelectedMapConfig;
    let canvas: MapCanvas;
    let propertiesPanel: PropertiesPanel;

    beforeEach(() => {
        // Mock Canvas 2D Context
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

        document.body.innerHTML = `
            <div id="canvas-container" style="width: 800px; height: 600px;"></div>
            <div id="properties-panel" style="width: 300px;"></div>
        `;

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({})
        } as any);

        mockRootMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 4096,
            chunkSize: 1024,
            description: 'Mapa principal',
            isInnerMap: false
        };

        mockInnerMapConfig = {
            id: 'interior_black_default',
            name: 'Interior Escuro',
            parentWorldId: 'vilgem',
            width: 2048,
            height: 1024,
            chunkSize: 1024,
            description: 'Interior',
            isInnerMap: true,
            backgroundColor: '#000000'
        };

        canvas = new MapCanvas('canvas-container', mockInnerMapConfig);
        propertiesPanel = new PropertiesPanel('properties-panel', canvas);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    /* -------------------------------------------------------------------------- */
    /* CASO 1: Desacoplamento do World Spawn da Fonte e da Padaria no Dropdown    */
    /* -------------------------------------------------------------------------- */
    it('getAllPortalDestinations() deve listar a Fonte do Despertar (1536, 1615) como Spawn Central de Vilgem', () => {
        const destinations = propertiesPanel.getAllPortalDestinations();

        // 1. Localiza a opcao de Spawn Central de Vilgem
        const vilgemCentralSpawn = destinations.find(
            d => d.mapId === 'vilgem' && d.label.includes('Spawn Central (Fonte do Despertar)')
        );

        expect(vilgemCentralSpawn).toBeDefined();
        expect(vilgemCentralSpawn?.spawnX).toBe(1536);
        expect(vilgemCentralSpawn?.spawnY).toBe(1615);
        expect(vilgemCentralSpawn?.category).toBe('Mundo: Alvorada de Vilgem');
    });

    it('getAllPortalDestinations() deve listar separadamente o portal da padaria em (-324, -571) sem confundi-lo com o spawn central', () => {
        const destinations = propertiesPanel.getAllPortalDestinations();

        // 2. Localiza a opcao de retorno na padaria de Vilgem
        const bakeryDestination = destinations.find(
            d => d.mapId === 'vilgem' && d.label.includes('vilgem_bakery_entrance')
        );

        expect(bakeryDestination).toBeDefined();
        expect(bakeryDestination?.spawnX).toBe(-324);
        expect(bakeryDestination?.spawnY).toBe(-571);

        // Garante que o Spawn Central e o Portal da Padaria sao duas opcoes estritamente distintas
        const vilgemCentralSpawn = destinations.find(
            d => d.mapId === 'vilgem' && d.label.includes('Spawn Central (Fonte do Despertar)')
        );
        expect(bakeryDestination?.spawnX).not.toBe(vilgemCentralSpawn?.spawnX);
        expect(bakeryDestination?.spawnY).not.toBe(vilgemCentralSpawn?.spawnY);
    });

    /* -------------------------------------------------------------------------- */
    /* CASO 2: Botao de Retorno Rapido ao Mundo Pai (btnQuickParent)               */
    /* -------------------------------------------------------------------------- */
    it('btnQuickParent deve configurar o destino para a Fonte do Despertar (1536, 1615) quando o pai for Vilgem', () => {
        const portalAsset: PlacedAssetModel = {
            uid: 'portal_test_1',
            presetId: 'portal_link',
            name: 'Portal Teste',
            x: 100,
            y: 100,
            width: 64,
            height: 48,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '',
            selected: true,
            isPortal: true
        };

        canvas.setPlacedAssets([portalAsset]);
        canvas.selectedAsset = portalAsset;
        propertiesPanel.render();

        const btnQuickParent = document.getElementById('btn-quick-target-parent') as HTMLButtonElement;
        expect(btnQuickParent).not.toBeNull();

        // Dispara clique no atalho de retorno ao mundo pai
        btnQuickParent.click();

        // Assert: As coordenadas de destino devem ser a Fonte do Despertar (1536, 1615)
        expect(portalAsset.targetMapId).toBe('vilgem');
        expect(portalAsset.targetSpawnX).toBe(1536);
        expect(portalAsset.targetSpawnY).toBe(1615);
    });

    /* -------------------------------------------------------------------------- */
    /* CASO 3: Dropdown Unificado Atualiza Coordenadas do Portal                  */
    /* -------------------------------------------------------------------------- */
    it('ao selecionar a Padaria no dropdown unificado, deve atribuir targetMapId e coordenadas exatas (-324, -571)', () => {
        const portalAsset: PlacedAssetModel = {
            uid: 'portal_test_2',
            presetId: 'portal_link',
            name: 'Portal Saida',
            x: 500,
            y: 500,
            width: 64,
            height: 48,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '',
            selected: true,
            isPortal: true
        };

        canvas.setPlacedAssets([portalAsset]);
        canvas.selectedAsset = portalAsset;
        propertiesPanel.render();

        const select = document.getElementById('prop-target-unified-select') as HTMLSelectElement;
        expect(select).not.toBeNull();

        // Simula selecao da opcao de saida para a padaria de Vilgem
        select.value = 'vilgem|-324|-571';
        select.dispatchEvent(new Event('change'));

        expect(portalAsset.targetMapId).toBe('vilgem');
        expect(portalAsset.targetSpawnX).toBe(-324);
        expect(portalAsset.targetSpawnY).toBe(-571);
    });

    /* -------------------------------------------------------------------------- */
    /* CASO 4: Double-Bind no InnerMapManager Preserva Coordenadas Existentes      */
    /* -------------------------------------------------------------------------- */
    it('InnerMapManager.syncDoubleBind nao deve sobrescrever coordenadas de retorno customizadas pelo usuario', async () => {
        const innerMgr = InnerMapManager.getInstance();
        
        // Cadastra um InnerMap de teste com portal ja ajustado pelo usuario para a padaria
        const testInner = await innerMgr.createInnerMap({
            id: 'test_bakery_interior',
            name: 'Interior Padaria Teste',
            parentWorldId: 'vilgem',
            width: 1024,
            height: 1024,
            returnPortalCoords: { x: 700, y: 450 }
        });

        expect(testInner.portals?.[0]?.targetSpawnCoords).toEqual({ x: 700, y: 450 });

        // Simula tentativa de sincronizacao de double bind a partir do portal em Vilgem
        const entrancePortalInVilgem: PlacedAssetModel = {
            uid: 'vilgem_door_1',
            presetId: 'portal_link',
            name: 'Portal Link -> test_bakery_interior',
            x: 700,
            y: 390,
            width: 64,
            height: 48,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: '',
            isPortal: true,
            targetMapId: 'test_bakery_interior',
            targetSpawnX: 512,
            targetSpawnY: 700
        };

        await innerMgr.syncDoubleBind(entrancePortalInVilgem, mockRootMap);

        // Assert: As coordenadas preexistentes (700, 450) devem ser preservadas
        const retrieved = innerMgr.getInnerMap('test_bakery_interior');
        const returnPortal = retrieved?.portals?.find(p => p.targetMapId === 'vilgem');
        expect(returnPortal?.targetSpawnCoords).toEqual({ x: 700, y: 450 });
    });
});
