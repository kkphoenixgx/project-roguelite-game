/**
 * @file PlacedObjectsCompliance.test.ts
 * Valida se todos os objetos de cenário, portais e itens coletáveis gerados
 * em tempo de execução pelo Domínio (GameWorld) batem exatamente com as
 * posições, proporções (largura, altura, escala) e orientações do Assets Editor (WorldCodeSync).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import VilgemWorld from '../../domain/ObjectModule/Maps/VilgemWorld';
import IntermapWorld from '../../domain/ObjectModule/Maps/IntermapWorld';
import { IntermapRegistry } from '../../domain/ObjectModule/Maps/IntermapConfig';
import { WorldCodeSync } from '../../adapters/assets-adapter/Components/WorldCodeSync';
import { AssetScanner } from '../../adapters/assets-adapter/Components/AssetScanner';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import ObjectElementManager from '../../domain/ObjectModule/ObjectElementManager';
import SceneryElement from '../../domain/ObjectModule/Scenery/SceneryElement';
import PortalLink from '../../domain/ObjectModule/Maps/PortalLink';
import PortalLinkRequest from '../../domain/ObjectModule/Maps/PortalLinkRequest';
import DroppedItem from '../../domain/ObjectModule/Items/DroppedItem';
import { getAssetBaseSize, ASSET_HITBOX_CATALOG } from '../../domain/ObjectModule/Scenery/SceneryRegistry';
import rawVilgemWorldCode from '../../domain/ObjectModule/Maps/VilgemWorld.ts?raw';
import defaultIntermapsJson from '../../adapters/web/assets/maps/intermapsMap.json';

describe('Placed Objects Fidelity & Proportion Compliance (Assets Editor vs Domínio)', () => {
    let eventManager: EventHandler;
    let scanner: AssetScanner;
    let codeSync: WorldCodeSync;
    let objectManager: ObjectElementManager;

    const mockCollisionService = {
        checkPlayerCollision: vi.fn().mockReturnValue(false),
        checkMovement: vi.fn().mockImplementation((_entity: any, nextPos: any) => nextPos),
        addCollider: vi.fn(),
        removeCollider: vi.fn(),
        clear: vi.fn()
    };

    beforeEach(() => {
        eventManager = new EventHandler();
        scanner = new AssetScanner();
        codeSync = new WorldCodeSync();
        objectManager = new ObjectElementManager(eventManager, mockCollisionService as any);

        for (const def of Object.values(defaultIntermapsJson)) {
            IntermapRegistry.register(def as any);
        }
    });

    describe('1. Alvorada de Vilgem (VilgemWorld)', () => {
        it('deve validar que 100% dos objetos de cenário, portais e itens do assets-editor coincidem em posição e tamanho com o mundo do jogo', async () => {
            // 1. Obtém a lista autoritativa de assets posicionados via parser do Assets Editor (WorldCodeSync)
            const editorAssets = codeSync.parseSceneryFromCode(rawVilgemWorldCode, scanner);
            expect(editorAssets.length).toBeGreaterThan(0);

            // 2. Instancia e gera o mundo real do jogo
            const world = new VilgemWorld(eventManager);
            await world.generate();

            // 3. Coleta todas as entidades criadas pelo ObjectElementManager
            const entities = objectManager.getEntities();
            expect(entities.length).toBeGreaterThan(0);

            const sceneryEntities = entities.filter(e => e instanceof SceneryElement) as SceneryElement[];
            const portalEntities = entities.filter(e => e instanceof PortalLink || e instanceof PortalLinkRequest) as (PortalLink | PortalLinkRequest)[];
            const droppedItems = entities.filter(e => e instanceof DroppedItem) as DroppedItem[];

            // -----------------------------------------------------------------
            // Verificação de Elementos de Cenário (Scenery)
            // -----------------------------------------------------------------
            const editorScenery = editorAssets.filter(a => !a.isPortal && !a.isItem);
            expect(editorScenery.length).toBeGreaterThan(0);

            for (const asset of editorScenery) {
                // Procura a entidade correspondente no mundo pela posição exata (x, y)
                const matching = sceneryEntities.find(
                    e => Math.round(e.coordinates.x) === Math.round(asset.x) &&
                         Math.round(e.coordinates.y) === Math.round(asset.y)
                );

                expect(
                    matching,
                    `Asset de cenário "${asset.presetId}" em (${asset.x}, ${asset.y}) não foi instanciado no mundo!`
                ).toBeDefined();

                // Verifica tipo de preset
                expect(matching!.presetType).toBe(asset.presetId);

                // Verifica proporção e tamanho (largura e altura no mundo)
                const expectedBaseSize = getAssetBaseSize(asset.presetId);
                const expectedWidth = asset.width || expectedBaseSize.width;
                const expectedHeight = asset.height || expectedBaseSize.height;

                expect(
                    matching!.size.width,
                    `Largura incorreta para ${asset.presetId} em (${asset.x}, ${asset.y})`
                ).toBe(expectedWidth);

                expect(
                    matching!.size.height,
                    `Altura incorreta para ${asset.presetId} em (${asset.x}, ${asset.y})`
                ).toBe(expectedHeight);
            }

            // -----------------------------------------------------------------
            // Verificação de Portais (PortalLinks)
            // -----------------------------------------------------------------
            const editorPortals = editorAssets.filter(a => a.isPortal);
            expect(editorPortals.length).toBeGreaterThan(0);

            for (const portal of editorPortals) {
                const matching = portalEntities.find(
                    p => Math.round(p.coordinates.x) === Math.round(portal.x) &&
                         Math.round(p.coordinates.y) === Math.round(portal.y)
                );

                expect(
                    matching,
                    `Portal com destino "${portal.targetMapId}" em (${portal.x}, ${portal.y}) não foi encontrado!`
                ).toBeDefined();

                // Valida proporções do portal
                expect(matching!.size.width).toBe(portal.width);
                expect(matching!.size.height).toBe(portal.height);
                expect(matching!.targetMapId).toBe(portal.targetMapId);

                // Se for request, valida actionKey e promptText
                if (portal.portalType !== 'direct' && matching instanceof PortalLinkRequest) {
                    expect(matching.actionKey).toBe(portal.actionKey || 'E');
                    expect(matching.promptText).toBe(portal.promptText || 'Entrar');
                }
            }

            // -----------------------------------------------------------------
            // Verificação de Itens Coletáveis no Chão (DroppedItems)
            // -----------------------------------------------------------------
            const editorItems = editorAssets.filter(a => a.isItem);
            expect(editorItems.length).toBeGreaterThan(0);

            for (const item of editorItems) {
                const matching = droppedItems.find(
                    d => Math.round(d.coordinates.x) === Math.round(item.x) &&
                         Math.round(d.coordinates.y) === Math.round(item.y)
                );

                expect(
                    matching,
                    `Item "${item.itemClass || item.name}" em (${item.x}, ${item.y}) não foi instanciado!`
                ).toBeDefined();

                // Proporções padrão de itens de chão no mundo (16x16)
                expect(matching!.size.width).toBe(16);
                expect(matching!.size.height).toBe(16);

                // Classe e características do item
                if (item.itemClass) {
                    expect(matching!.item.constructor.name).toBe(item.itemClass);
                }
            }
        });
    });

    describe('2. Interiores e Salas (IntermapWorld - interior_black_default)', () => {
        it('deve validar que as posições e proporções dos elementos de interior_black_default batem com o editor', async () => {
            const def = IntermapRegistry.get('interior_black_default');
            expect(def).toBeDefined();

            const world = new IntermapWorld(def!, eventManager);
            await world.generate();

            const entities = objectManager.getEntities();
            const scenery = entities.filter(e => e instanceof SceneryElement) as SceneryElement[];
            const portals = entities.filter(e => e instanceof PortalLink || e instanceof PortalLinkRequest) as (PortalLink | PortalLinkRequest)[];
            const items = entities.filter(e => e instanceof DroppedItem) as DroppedItem[];

            // 1. Cenário
            for (const sc of def!.scenery || []) {
                const matching = scenery.find(
                    e => Math.round(e.coordinates.x) === Math.round(sc.x) &&
                         Math.round(e.coordinates.y) === Math.round(sc.y)
                );
                expect(matching, `Cenário ${sc.presetId} em (${sc.x}, ${sc.y}) não encontrado no interior`).toBeDefined();
                expect(matching!.presetType).toBe(sc.presetId);
            }

            // 2. Portais
            for (const p of def!.portals || []) {
                const matching = portals.find(
                    portal => Math.round(portal.coordinates.x) === Math.round(p.x) &&
                              Math.round(portal.coordinates.y) === Math.round(p.y)
                );
                expect(matching, `Portal para ${p.targetMapId} em (${p.x}, ${p.y}) não encontrado no interior`).toBeDefined();
                expect(matching!.size.width).toBe(p.width);
                expect(matching!.size.height).toBe(p.height);
                expect(matching!.targetMapId).toBe(p.targetMapId);
            }

            // 3. Itens
            for (const it of def!.items || []) {
                const matching = items.find(
                    item => Math.round(item.coordinates.x) === Math.round(it.x) &&
                            Math.round(item.coordinates.y) === Math.round(it.y)
                );
                expect(matching, `Item ${it.itemClass} em (${it.x}, ${it.y}) não encontrado no interior`).toBeDefined();
                if (it.itemClass) {
                    expect(matching!.item.constructor.name).toBe(it.itemClass);
                }
            }
        });
    });

    describe('3. Integridade de Proporção com o Catálogo de Hitboxes (ASSET_HITBOX_CATALOG)', () => {
        it('deve garantir que nenhum elemento de cenário instanciado tenha dimensões divergentes do catálogo normativo', () => {
            const editorAssets = codeSync.parseSceneryFromCode(rawVilgemWorldCode, scanner);

            for (const asset of editorAssets) {
                if (asset.isPortal || asset.isItem) continue;

                const catalogData = ASSET_HITBOX_CATALOG[asset.presetId];
                if (catalogData) {
                    // O tamanho deve bater com baseWidth e baseHeight do catálogo
                    expect(
                        asset.width,
                        `Largura do asset ${asset.presetId} no editor difere do catálogo normativo`
                    ).toBe(catalogData.baseWidth);

                    expect(
                        asset.height,
                        `Altura do asset ${asset.presetId} no editor difere do catálogo normativo`
                    ).toBe(catalogData.baseHeight);
                }
            }
        });
    });
});
