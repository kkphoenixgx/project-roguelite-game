// @vitest-environment jsdom
/**
 * @file AssetDrawerNewSpriteButton.unit.test.ts
 * Testes unitários do botão "Definir Novo Sprite" do rodapé da biblioteca de assets (AssetDrawer).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetDrawer } from '../../adapters/assets-adapter/Components/AssetDrawer';
import { AssetScanner } from '../../adapters/assets-adapter/Components/AssetScanner';

describe('AssetDrawerNewSpriteButton (Unit)', () => {
    let scanner: AssetScanner;

    beforeEach(() => {
        document.body.innerHTML = `<aside id="asset-drawer"></aside><button id="btn-reopen-drawer"></button>`;
        scanner = new AssetScanner();
    });

    it('renderiza o botão com id próprio da biblioteca', () => {
        new AssetDrawer(scanner);
        const btn = document.getElementById('btn-drawer-new-sprite');
        expect(btn).not.toBeNull();
        expect(btn!.textContent).toContain('Definir Novo Sprite');
        expect(btn!.classList.contains('btn-new-sprite')).toBe(true);
    });

    it('clicar chama onNewSpriteRequested', () => {
        const drawer = new AssetDrawer(scanner);
        const onNew = vi.fn();
        drawer.onNewSpriteRequested = onNew;

        (document.getElementById('btn-drawer-new-sprite') as HTMLElement).click();

        expect(onNew).toHaveBeenCalledTimes(1);
    });

    it('continua funcionando depois que a biblioteca é renderizada de novo (filtros/refresh)', () => {
        const drawer = new AssetDrawer(scanner);
        const onNew = vi.fn();
        drawer.onNewSpriteRequested = onNew;

        drawer.refresh();
        drawer.render();
        (document.getElementById('btn-drawer-new-sprite') as HTMLElement).click();

        expect(onNew).toHaveBeenCalledTimes(1);
    });

    it('sem ação configurada, o clique não lança erro', () => {
        new AssetDrawer(scanner);
        expect(() => (document.getElementById('btn-drawer-new-sprite') as HTMLElement).click()).not.toThrow();
    });
});
