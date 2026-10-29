// @vitest-environment jsdom
/**
 * @file AssetsEditorSidebarCollapse.unit.test.ts
 * Testes unitários para o botão e fluxo de fechar/reabrir o menu lateral (AssetDrawer).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetDrawer } from '../../../typescript/adapters/assets-adapter/Components/AssetDrawer';
import { AssetScanner } from '../../../typescript/adapters/assets-adapter/Components/AssetScanner';

describe('AssetsEditorSidebarCollapse (Unit Tests)', () => {
    let scanner: AssetScanner;
    let drawerEl: HTMLElement;
    let reopenBtn: HTMLElement;
    let resizerEl: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = `
            <main id="app-workspace">
                <button id="btn-reopen-drawer" class="btn-sidebar-open-tab" style="display: none;">
                    <span>Assets</span>
                </button>
                <aside id="asset-drawer" class="asset-drawer" style="width: 320px;"></aside>
                <div id="drawer-resizer" class="panel-resizer resizer-left"></div>
                <section id="canvas-container"></section>
            </main>
        `;

        drawerEl = document.getElementById('asset-drawer')!;
        reopenBtn = document.getElementById('btn-reopen-drawer')!;
        resizerEl = document.getElementById('drawer-resizer')!;
        scanner = new AssetScanner();
    });

    it('1. deve renderizar o botão de fechar o menu lateral (#btn-toggle-drawer) com texto inicial ❮', () => {
        const drawer = new AssetDrawer(scanner);
        const toggleBtn = drawerEl.querySelector('#btn-toggle-drawer') as HTMLButtonElement;

        expect(toggleBtn).not.toBeNull();
        expect(toggleBtn.textContent?.trim()).toBe('❮');
        expect(drawer.isDrawerCollapsed()).toBe(false);
    });

    it('2. deve fechar o menu lateral ao clicar no botão #btn-toggle-drawer', () => {
        const drawer = new AssetDrawer(scanner);
        const toggleBtn = drawerEl.querySelector('#btn-toggle-drawer') as HTMLButtonElement;
        const resizeSpy = vi.fn();
        window.addEventListener('resize', resizeSpy);

        toggleBtn.click();

        expect(drawer.isDrawerCollapsed()).toBe(true);
        expect(drawerEl.classList.contains('is-collapsed')).toBe(true);
        expect(drawerEl.style.display).toBe('none');
        expect(drawerEl.style.width).toBe('0px');
        expect(resizerEl.style.display).toBe('none');
        expect(reopenBtn.style.display).toBe('flex');
        expect(resizeSpy).toHaveBeenCalled();
    });

    it('3. deve reabrir o menu lateral e restaurar dimensões ao clicar no botão de reabrir (#btn-reopen-drawer)', () => {
        const drawer = new AssetDrawer(scanner);
        const toggleBtn = drawerEl.querySelector('#btn-toggle-drawer') as HTMLButtonElement;

        // Fecha primeiro
        toggleBtn.click();
        expect(drawer.isDrawerCollapsed()).toBe(true);
        expect(reopenBtn.style.display).toBe('flex');

        // Clica para reabrir
        reopenBtn.click();

        expect(drawer.isDrawerCollapsed()).toBe(false);
        expect(drawerEl.classList.contains('is-collapsed')).toBe(false);
        expect(drawerEl.style.display).toBe('flex');
        expect(drawerEl.style.width).toBe('320px');
        expect(resizerEl.style.display).toBe('flex');
        expect(reopenBtn.style.display).toBe('none');
        expect(toggleBtn.textContent?.trim()).toBe('❮');
    });

    it('4. deve alternar estado via setCollapsed() programático', () => {
        const drawer = new AssetDrawer(scanner);

        drawer.setCollapsed(true);
        expect(drawer.isDrawerCollapsed()).toBe(true);
        expect(drawerEl.style.display).toBe('none');

        drawer.setCollapsed(false);
        expect(drawer.isDrawerCollapsed()).toBe(false);
        expect(drawerEl.style.display).toBe('flex');
    });

    it('5. deve manter os listeners de fechar ativos mesmo após refresh() do catálogo', () => {
        const drawer = new AssetDrawer(scanner);
        drawer.refresh();

        const toggleBtn = drawerEl.querySelector('#btn-toggle-drawer') as HTMLButtonElement;
        expect(toggleBtn).not.toBeNull();

        toggleBtn.click();
        expect(drawer.isDrawerCollapsed()).toBe(true);
        expect(drawerEl.style.display).toBe('none');
    });
});
