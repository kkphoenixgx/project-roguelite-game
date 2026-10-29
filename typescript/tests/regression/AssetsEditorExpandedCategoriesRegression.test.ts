// @vitest-environment jsdom
/**
 * @file AssetsEditorExpandedCategoriesRegression.test.ts
 * Teste de regressão para garantir que a expansão das categorias no selecionador de assets
 * preserva todas as funcionalidades existentes (pares estático/sprite, subfiltros de tipo,
 * modal de novo sprite e compatibilidade com categorias clássicas).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AssetScanner } from '../../../typescript/adapters/assets-adapter/Components/AssetScanner';
import { AssetDrawer } from '../../../typescript/adapters/assets-adapter/Components/AssetDrawer';
import { SpriteDefinitionModal } from '../../../typescript/adapters/assets-adapter/Components/SpriteDefinitionModal';

describe('AssetsEditorExpandedCategoriesRegression - Blindagem de Categorias no Selecionador', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <button id="btn-reopen-drawer" style="display: none;"></button>
            <aside id="asset-drawer" class="asset-drawer"></aside>
        `;
    });

    it('1. Deve preservar 100% da integridade das categorias originais e pareamento estático/sprite em houses e props', () => {
        const scanner = new AssetScanner();

        const houses = scanner.getAssets('houses');
        expect(houses.length).toBeGreaterThan(0);
        expect(houses.every(h => h.category === 'houses')).toBe(true);
        expect(houses.some(h => h.isSprite === true)).toBe(true);
        expect(houses.some(h => !h.isSprite)).toBe(true);

        const props = scanner.getAssets('props');
        expect(props.length).toBeGreaterThan(0);
        expect(props.every(p => p.category === 'props')).toBe(true);
        expect(props.some(p => p.isSprite === true)).toBe(true);
        expect(props.some(p => !p.isSprite)).toBe(true);

        const chunks = scanner.getAssets('chunks');
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.every(c => c.category === 'chunks')).toBe(true);
    });

    it('2. Sub-filtros de tipo (Tudo / Estáticos / Sprites) devem continuar funcionando em conjunto com qualquer nova categoria', () => {
        const scanner = new AssetScanner();
        new AssetDrawer(scanner);

        const treesTab = document.querySelector('.cat-tab[data-cat="trees"]') as HTMLButtonElement;
        treesTab.click();

        const staticPill = document.querySelector('.type-pill[data-type="static"]') as HTMLButtonElement;
        const spritesPill = document.querySelector('.type-pill[data-type="sprites"]') as HTMLButtonElement;

        staticPill.click();
        const staticTreeCards = document.querySelectorAll('.asset-card');
        expect(staticTreeCards.length).toBe(scanner.getAssets('trees', '', 'static').length);
        expect(staticTreeCards.length).toBeGreaterThan(0);

        spritesPill.click();
        const spriteTreeCards = document.querySelectorAll('.asset-card');
        expect(spriteTreeCards.length).toBe(scanner.getAssets('trees', '', 'sprites').length);
        expect(spriteTreeCards.length).toBeGreaterThan(0);
    });

    it('3. SpriteDefinitionModal deve disponibilizar todas as novas categorias no seletor de cadastro', () => {
        const scanner = new AssetScanner();
        new SpriteDefinitionModal(scanner);

        const select = document.querySelector('#def-category') as HTMLSelectElement;
        expect(select).toBeTruthy();

        const optionValues = Array.from(select.options).map(o => o.value);
        expect(optionValues).toContain('roads');
        expect(optionValues).toContain('water');
        expect(optionValues).toContain('bridges');
        expect(optionValues).toContain('fences');
        expect(optionValues).toContain('camp');
        expect(optionValues).toContain('trees');
        expect(optionValues).toContain('weapons');
        expect(optionValues).toContain('npcs');
        expect(optionValues).toContain('enemies');
    });

    it('4. Registrar um asset customizado deve torná-lo visível tanto na sua categoria temática quanto na aba Customizados', () => {
        const scanner = new AssetScanner();
        scanner.registerCustomAsset({
            id: 'custom_mystic_bridge',
            name: 'Ponte Mística de Cristal',
            category: 'bridges',
            imageSrc: 'data:image/png;base64,fake',
            width: 180,
            height: 140,
            frameWidth: 180,
            frameHeight: 140,
            frameCount: 1,
            isSprite: false
        });

        const bridges = scanner.getAssets('bridges');
        expect(bridges.some(a => a.id === 'custom_mystic_bridge')).toBe(true);

        const customList = scanner.getAssets('custom');
        expect(customList.some(a => a.id === 'custom_mystic_bridge')).toBe(true);
    });
});
