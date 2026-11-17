// @vitest-environment jsdom
/**
 * @file EditorMenuBar.unit.test.ts
 * Testes unitários da barra de menus suspensos do Assets Editor (MenuBar) e dos rótulos/chips de estado (ToolbarStatus).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MenuBar } from '../../adapters/assets-adapter/Components/MenuBar';
import { getActiveModeChips, getToggleMenuLabels, type EditorToggleState } from '../../adapters/assets-adapter/Components/ToolbarStatus';

const HTML = `
    <nav id="bar">
        <div class="menu-root" id="m-file">
            <button class="menu-trigger">Arquivo</button>
            <div class="menu-dropdown"><button class="menu-item" id="item-open">Abrir</button></div>
        </div>
        <div class="menu-root" id="m-view">
            <button class="menu-trigger">Exibir</button>
            <div class="menu-dropdown">
                <button class="menu-item" id="item-toggle">Hitboxes</button>
                <button class="menu-item" id="item-disabled" disabled>Desabilitado</button>
            </div>
        </div>
    </nav>
    <div id="outside"></div>
`;

const baseState: EditorToggleState = {
    snapToGrid: false, gridSize: 32, showHitboxes: false, showPlayerReference: true,
    isStampMode: false, isChunkBrushMode: false, chunkBrushRadius: 64
};

describe('EditorMenuBar (Unit)', () => {
    let bar: MenuBar;
    const $ = (sel: string) => document.querySelector(sel) as HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = HTML;
        bar = new MenuBar($('#bar'));
    });

    afterEach(() => {
        bar.destroy();
        document.body.innerHTML = '';
    });

    describe('MenuBar', () => {
        it('abre e fecha o menu ao clicar no título', () => {
            $('#m-file .menu-trigger').click();
            expect($('#m-file').classList.contains('is-open')).toBe(true);
            expect($('#m-file .menu-trigger').getAttribute('aria-expanded')).toBe('true');

            $('#m-file .menu-trigger').click();
            expect($('#m-file').classList.contains('is-open')).toBe(false);
        });

        it('mantém só um menu aberto e troca ao passar o mouse com um menu já aberto', () => {
            $('#m-view .menu-trigger').dispatchEvent(new MouseEvent('mouseenter'));
            expect(bar.currentMenu).toBeNull();

            $('#m-file .menu-trigger').click();
            $('#m-view .menu-trigger').dispatchEvent(new MouseEvent('mouseenter'));

            expect($('#m-file').classList.contains('is-open')).toBe(false);
            expect($('#m-view').classList.contains('is-open')).toBe(true);
        });

        it('fecha ao escolher um item, mas preserva o listener da ação do item', () => {
            const action = vi.fn();
            $('#item-toggle').addEventListener('click', action);
            $('#m-view .menu-trigger').click();

            $('#item-toggle').click();

            expect(action).toHaveBeenCalledTimes(1);
            expect(bar.currentMenu).toBeNull();
        });

        it('não fecha ao clicar em item desabilitado', () => {
            $('#m-view .menu-trigger').click();
            $('#item-disabled').dispatchEvent(new MouseEvent('click'));
            expect($('#m-view').classList.contains('is-open')).toBe(true);
        });

        it('fecha com Escape e com clique fora da barra', () => {
            $('#m-file .menu-trigger').click();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(bar.currentMenu).toBeNull();

            $('#m-file .menu-trigger').click();
            $('#outside').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            expect(bar.currentMenu).toBeNull();
        });
    });

    describe('ToolbarStatus', () => {
        it('rótulos de menu não repetem estado On/Off (o ✓ indica o estado)', () => {
            const labels = getToggleMenuLabels(baseState);
            expect(labels).toEqual({
                snap: 'Encaixe na Grade',
                hitboxes: 'Hitboxes',
                playerRef: 'Referência do Player',
                stamp: 'Modo Carimbo',
                chunkBrush: 'Pincel de Chunk'
            });
            expect(Object.values(labels).join(' ')).not.toMatch(/\b(On|Off|Ativo|Desligado)\b/);
        });

        it('rótulos mostram o parâmetro útil quando a ferramenta está ativa', () => {
            const labels = getToggleMenuLabels({ ...baseState, snapToGrid: true, isChunkBrushMode: true });
            expect(labels.snap).toBe('Encaixe na Grade (32px)');
            expect(labels.chunkBrush).toBe('Pincel de Chunk (64px)');
        });

        it('sem modos ativos não há chips', () => {
            expect(getActiveModeChips(baseState)).toEqual([]);
        });

        it('mostra chips de todos os modos ativos (pincel/carimbo primeiro)', () => {
            const chips = getActiveModeChips({ ...baseState, snapToGrid: true, showHitboxes: true, isStampMode: true, isChunkBrushMode: true });
            expect(chips.map(c => c.id)).toEqual(['chunkBrush', 'stamp', 'snap', 'hitboxes']);
        });
    });
});
