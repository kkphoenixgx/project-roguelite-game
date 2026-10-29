// @vitest-environment jsdom
/**
 * @file AssetsEditorExpandedCategories.unit.test.ts
 * Testes unitários para as novas categorias e subcategorias expandidas no selecionador de assets (AssetDrawer & AssetScanner).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AssetScanner } from '../../../typescript/adapters/assets-adapter/Components/AssetScanner';
import { AssetDrawer } from '../../../typescript/adapters/assets-adapter/Components/AssetDrawer';
import { ASSET_CATEGORIES_CATALOG } from '../../../typescript/adapters/assets-adapter/Models/AssetDefinition';

describe('AssetsEditorExpandedCategories - Testes Unitários de Categorias Expandidas', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <button id="btn-reopen-drawer" style="display: none;"></button>
            <aside id="asset-drawer" class="asset-drawer"></aside>
        `;
    });

    it('1. ASSET_CATEGORIES_CATALOG deve expor todas as 29 categorias temáticas e subcategorias', () => {
        const scanner = new AssetScanner();
        const categories = scanner.getAvailableCategories();

        expect(categories.length).toBeGreaterThanOrEqual(29);
        const ids = categories.map(c => c.id);

        const expectedIds = [
            'all', 'chunks', 'houses', 'fortifications',
            'roads', 'water', 'bridges', 'fences', 'props', 'camp',
            'market', 'fountain', 'nature', 'trees', 'bushes', 'rocks',
            'portals', 'items', 'weapons', 'equipment', 'consumables', 'tools',
            'entities', 'npcs', 'enemies', 'pets', 'vfx', 'sprites', 'custom'
        ];

        for (const expected of expectedIds) {
            expect(ids).toContain(expected);
        }
    });

    it('2. AssetScanner deve classificar e filtrar corretamente as novas categorias de cenário (roads, water, bridges, fences, camp)', () => {
        const scanner = new AssetScanner();

        const roads = scanner.getAssets('roads');
        expect(roads.length).toBeGreaterThan(0);
        expect(roads.every(a => a.category === 'roads')).toBe(true);
        expect(roads.some(a => a.id.includes('road_'))).toBe(true);

        const water = scanner.getAssets('water');
        expect(water.length).toBeGreaterThan(0);
        expect(water.every(a => a.category === 'water')).toBe(true);
        expect(water.some(a => a.id.includes('river_') || a.id.includes('pond_'))).toBe(true);

        const bridges = scanner.getAssets('bridges');
        expect(bridges.length).toBeGreaterThan(0);
        expect(bridges.every(a => a.category === 'bridges')).toBe(true);
        expect(bridges.some(a => a.id.includes('bridge_') || a.id.includes('pier_'))).toBe(true);

        const fences = scanner.getAssets('fences');
        expect(fences.length).toBeGreaterThan(0);
        expect(fences.every(a => a.category === 'fences')).toBe(true);
        expect(fences.some(a => a.id.includes('fence') || a.id.includes('murette'))).toBe(true);

        const camp = scanner.getAssets('camp');
        expect(camp.length).toBeGreaterThan(0);
        expect(camp.every(a => a.category === 'camp')).toBe(true);
        expect(camp.some(a => a.id.includes('camp_') || a.id.includes('graveyard') || a.id.includes('obelisk'))).toBe(true);
    });

    it('3. AssetScanner deve filtrar corretamente as subcategorias de Natureza (trees, bushes, rocks)', () => {
        const scanner = new AssetScanner();

        const trees = scanner.getAssets('trees');
        expect(trees.length).toBeGreaterThan(0);
        expect(trees.some(a => a.id.includes('tree_pine') || a.id.includes('tree_oak'))).toBe(true);

        const bushes = scanner.getAssets('bushes');
        expect(bushes.length).toBeGreaterThan(0);
        expect(bushes.some(a => a.id.includes('bush'))).toBe(true);

        const rocks = scanner.getAssets('rocks');
        expect(rocks.length).toBeGreaterThan(0);
        expect(rocks.some(a => a.id.includes('rock') || a.id.includes('boulder') || a.id.includes('pebble'))).toBe(true);
    });

    it('4. AssetScanner deve filtrar corretamente as subcategorias de Itens (weapons, equipment, consumables, tools)', () => {
        const scanner = new AssetScanner();

        const weapons = scanner.getAssets('weapons');
        expect(weapons.length).toBeGreaterThan(0);
        expect(weapons.every(a => a.isItem === true)).toBe(true);

        const equipment = scanner.getAssets('equipment');
        expect(equipment.length).toBeGreaterThan(0);
        expect(equipment.every(a => a.isItem === true)).toBe(true);

        const consumables = scanner.getAssets('consumables');
        expect(consumables.length).toBeGreaterThan(0);
        expect(consumables.every(a => a.isItem === true)).toBe(true);

        const tools = scanner.getAssets('tools');
        expect(tools.length).toBeGreaterThan(0);
        expect(tools.every(a => a.isItem === true)).toBe(true);
    });

    it('5. AssetScanner deve filtrar corretamente as subcategorias de Entidades (entities, npcs, enemies, pets)', () => {
        const scanner = new AssetScanner();

        const entities = scanner.getAssets('entities');
        expect(entities.length).toBeGreaterThan(0);

        const npcs = scanner.getAssets('npcs');
        expect(npcs.length).toBeGreaterThan(0);
        expect(npcs.some(a => ['molor', 'candelion', 'derocar', 'molin'].some(n => a.id.toLowerCase().includes(n)))).toBe(true);

        const enemies = scanner.getAssets('enemies');
        expect(enemies.length).toBeGreaterThan(0);
        expect(enemies.some(a => a.id.toLowerCase().includes('slime') || a.id.toLowerCase().includes('shadow'))).toBe(true);

        const pets = scanner.getAssets('pets');
        expect(pets.length).toBeGreaterThan(0);
        expect(pets.some(a => a.id.toLowerCase().includes('pet'))).toBe(true);
    });

    it('6. AssetDrawer deve renderizar todas as abas de categoria do catálogo e atualizar a listagem ao clicar', () => {
        const scanner = new AssetScanner();
        new AssetDrawer(scanner);

        const tabs = document.querySelectorAll('.cat-tab');
        expect(tabs.length).toBe(ASSET_CATEGORIES_CATALOG.length);

        const roadsTab = document.querySelector('.cat-tab[data-cat="roads"]') as HTMLButtonElement;
        expect(roadsTab).toBeTruthy();
        roadsTab.click();

        expect(roadsTab.classList.contains('active')).toBe(true);
        const cards = document.querySelectorAll('.asset-card');
        expect(cards.length).toBe(scanner.getAssets('roads').length);
    });
});
