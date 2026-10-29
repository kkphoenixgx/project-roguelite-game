// @vitest-environment jsdom
/**
 * @file AssetsEditorSidebarCollapseRegression.test.ts
 * Suite de regressão para blindar o botão de fechar o menu lateral (AssetDrawer)
 * contra reincidência de bugs de especificidade CSS, inline styles do PanelResizer,
 * e persistência de largura ao colapsar/expandir.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetDrawer } from '../../../typescript/adapters/assets-adapter/Components/AssetDrawer';
import { AssetScanner } from '../../../typescript/adapters/assets-adapter/Components/AssetScanner';
import { PanelResizer } from '../../../typescript/adapters/assets-adapter/Components/PanelResizer';

describe('AssetsEditorSidebarCollapse (Regression Suite)', () => {
    let scanner: AssetScanner;
    let drawerEl: HTMLElement;
    let reopenBtn: HTMLElement;
    let resizerEl: HTMLElement;

    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <main id="app-workspace">
                <button id="btn-reopen-drawer" class="btn-sidebar-open-tab" style="display: none;">
                    <span>Assets</span>
                </button>
                <aside id="asset-drawer" class="asset-drawer"></aside>
                <div id="drawer-resizer" class="panel-resizer resizer-left"></div>
                <section id="canvas-container"></section>
                <div id="props-resizer" class="panel-resizer resizer-right"></div>
                <aside id="properties-panel" class="properties-panel"></aside>
            </main>
        `;

        drawerEl = document.getElementById('asset-drawer')!;
        reopenBtn = document.getElementById('btn-reopen-drawer')!;
        resizerEl = document.getElementById('drawer-resizer')!;
        scanner = new AssetScanner();
    });

    it('1. deve fechar o menu lateral mesmo quando o PanelResizer definiu inline style no DOM', () => {
        // Simula largura personalizada salva anteriormente no localStorage (ex: 420px)
        localStorage.setItem('assets_adapter_drawer_width', '420');

        const drawer = new AssetDrawer(scanner);
        new PanelResizer({
            drawerId: 'asset-drawer',
            drawerResizerId: 'drawer-resizer',
            propsPanelId: 'properties-panel',
            propsResizerId: 'props-resizer'
        });

        // Verifica que o PanelResizer aplicou o inline style
        expect(drawerEl.style.width).toBe('420px');

        // Clica no botão de fechar o menu lateral
        const toggleBtn = drawerEl.querySelector('#btn-toggle-drawer') as HTMLButtonElement;
        expect(toggleBtn).not.toBeNull();
        toggleBtn.click();

        // O menu DEVE colapsar sem ser impedido pelo inline style prévio
        expect(drawer.isDrawerCollapsed()).toBe(true);
        expect(drawerEl.classList.contains('is-collapsed')).toBe(true);
        expect(drawerEl.style.display).toBe('none');
        expect(drawerEl.style.width).toBe('0px');
        expect(reopenBtn.style.display).toBe('flex');
    });

    it('2. deve restaurar a largura customizada exata ao reabrir após ter sido fechado', () => {
        const customWidth = 380;
        drawerEl.style.width = `${customWidth}px`;

        const drawer = new AssetDrawer(scanner);
        const toggleBtn = drawerEl.querySelector('#btn-toggle-drawer') as HTMLButtonElement;

        // Fecha o menu lateral
        toggleBtn.click();
        expect(drawerEl.style.display).toBe('none');
        expect(drawerEl.style.width).toBe('0px');

        // Reabre clicando no botão lateral
        reopenBtn.click();
        expect(drawerEl.style.display).toBe('flex');
        expect(drawerEl.style.width).toBe(`${customWidth}px`);
        expect(drawer.isDrawerCollapsed()).toBe(false);
    });

    it('3. deve ocultar o divisor/resizer (#drawer-resizer) enquanto colapsado para não bloquear o canvas', () => {
        const drawer = new AssetDrawer(scanner);
        const toggleBtn = drawerEl.querySelector('#btn-toggle-drawer') as HTMLButtonElement;

        expect(resizerEl.style.display).not.toBe('none');

        toggleBtn.click();
        expect(resizerEl.style.display).toBe('none');

        reopenBtn.click();
        expect(resizerEl.style.display).toBe('flex');
    });

    it('4. deve suportar ciclos rápidos de alternância (abrir/fechar/abrir/fechar) sem desestabilizar estado', () => {
        const drawer = new AssetDrawer(scanner);
        const toggleBtn = drawerEl.querySelector('#btn-toggle-drawer') as HTMLButtonElement;

        for (let i = 0; i < 5; i++) {
            toggleBtn.click();
            expect(drawer.isDrawerCollapsed()).toBe(true);
            expect(drawerEl.style.display).toBe('none');
            expect(reopenBtn.style.display).toBe('flex');

            reopenBtn.click();
            expect(drawer.isDrawerCollapsed()).toBe(false);
            expect(drawerEl.style.display).toBe('flex');
            expect(reopenBtn.style.display).toBe('none');
        }
    });

    it('5. deve disparar evento de resize da janela para forçar redimensionamento imediato do MapCanvas', () => {
        const drawer = new AssetDrawer(scanner);
        const toggleBtn = drawerEl.querySelector('#btn-toggle-drawer') as HTMLButtonElement;
        let resizeDispatched = 0;

        window.addEventListener('resize', () => {
            resizeDispatched++;
        });

        toggleBtn.click();
        expect(resizeDispatched).toBe(1);

        reopenBtn.click();
        expect(resizeDispatched).toBe(2);
    });
});
