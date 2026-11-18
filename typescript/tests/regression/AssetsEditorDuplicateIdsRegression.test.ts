// @vitest-environment jsdom
/**
 * @file AssetsEditorDuplicateIdsRegression.test.ts
 * Teste de regressão: o botão "Definir Novo Sprite" da biblioteca de assets não fazia nada.
 *
 * Bug original: o botão do rodapé da biblioteca (AssetDrawer) usava o mesmo id `btn-open-sprite-modal` do
 * item de menu "Mapa > Definir Novo Sprite...". O EditorApp liga o clique com `getElementById`, que devolve
 * apenas o PRIMEIRO elemento (o da barra superior), então o botão da biblioteca nunca recebia o evento.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AssetDrawer } from '../../adapters/assets-adapter/Components/AssetDrawer';
import { AssetScanner } from '../../adapters/assets-adapter/Components/AssetScanner';

const EDITOR_DIR = path.resolve(__dirname, '../../adapters/assets-adapter');

describe('AssetsEditorDuplicateIdsRegression (Regression Test)', () => {
    beforeEach(() => {
        const html = fs.readFileSync(path.join(EDITOR_DIR, 'index.html'), 'utf-8');
        document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script'));
    });

    it('com a página do editor montada, não há ids repetidos entre a barra de menus e a biblioteca', () => {
        new AssetDrawer(new AssetScanner());

        const counts = new Map<string, number>();
        document.querySelectorAll('[id]').forEach(el => counts.set(el.id, (counts.get(el.id) || 0) + 1));
        const duplicated = [...counts].filter(([, n]) => n > 1).map(([id]) => id);

        expect(duplicated).toEqual([]);
    });

    it('o botão da biblioteca abre o modal de sprite e o item de menu continua existindo', () => {
        const drawer = new AssetDrawer(new AssetScanner());
        const openModal = vi.fn();
        drawer.onNewSpriteRequested = openModal;

        (document.getElementById('btn-drawer-new-sprite') as HTMLElement).click();

        expect(openModal).toHaveBeenCalledTimes(1);
        expect(document.querySelector('#editor-menu-bar #btn-open-sprite-modal')).not.toBeNull();
    });

    it('o EditorApp conecta o botão da biblioteca ao modal de definição de sprite', () => {
        const source = fs.readFileSync(path.join(EDITOR_DIR, 'EditorApp.ts'), 'utf-8');
        expect(source).toContain('this.drawer.onNewSpriteRequested = () => this.spriteDefModal.open()');
    });
});
