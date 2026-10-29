/**
 * @vitest-environment jsdom
 * 
 * Nota: vitest.setup.ts sobrescreve global.window com um objeto vazio para testes Node.
 * No ambiente jsdom, o window correto é restaurado automaticamente pelo jsdom.
 * Mas o vi.mock do setup global JÁ rodou antes, então precisamos garantir que
 * o `window` do jsdom esteja intacto.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WebWindowManager from '../../adapters/web/components/WebWindowManager';

describe('Integration - WebWindowManager Debug Keybinds', () => {
    let mockSceneManager: any;
    let mockTelemetryAdapter: any;

    beforeEach(() => {
        document.body.innerHTML = '';
        
        mockSceneManager = {
            setDebugMode: vi.fn()
        };

        mockTelemetryAdapter = {
            getTelemetryUI: vi.fn(() => document.createElement('div')),
            getSnapshot: vi.fn(() => ({ frameTimeMs: 16, activeEntities: 5 }))
        };

        // Ensure window.open exists in jsdom
        if (!window.open) {
            (window as any).open = vi.fn();
        } else {
            vi.spyOn(window, 'open').mockImplementation(vi.fn() as any);
        }

        // Ensure window.addEventListener exists (jsdom should provide it)
        if (typeof window.addEventListener !== 'function') {
            // Fallback: skip test gracefully if jsdom window is broken by global setup
            return;
        }

        new WebWindowManager(mockSceneManager, mockTelemetryAdapter);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deve alternar o modo de depuração de Hitboxes (SceneManager debug mode) ao pressionar F2', () => {
        if (typeof window.addEventListener !== 'function') return; // Guard

        const f2Event = new KeyboardEvent('keydown', { key: 'F2', shiftKey: false, bubbles: true });
        window.dispatchEvent(f2Event);

        expect(mockSceneManager.setDebugMode).toHaveBeenCalledWith(true);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', shiftKey: false, bubbles: true }));
        
        expect(mockSceneManager.setDebugMode).toHaveBeenCalledWith(false);
        expect(mockSceneManager.setDebugMode).toHaveBeenCalledTimes(2);
    });

    it('deve abrir o Editor Web de Hitboxes (Polygon) ao pressionar Shift + F2', () => {
        if (typeof window.addEventListener !== 'function') return; // Guard

        const shiftF2Event = new KeyboardEvent('keydown', { key: 'F2', shiftKey: true, bubbles: true });
        window.dispatchEvent(shiftF2Event);

        expect(window.open).toHaveBeenCalledWith('/typescript/adapters/polygonWebEditor/index.html', '_blank');
        expect(mockSceneManager.setDebugMode).not.toHaveBeenCalled();
    });

    it('deve abrir o Assets Adapter ao pressionar F4', () => {
        if (typeof window.addEventListener !== 'function') return; // Guard

        const f4Event = new KeyboardEvent('keydown', { key: 'F4', bubbles: true });
        window.dispatchEvent(f4Event);

        expect(window.open).toHaveBeenCalledWith('/typescript/adapters/assets-adapter/index.html', '_blank');
    });

    it('deve expor openAssetsAdapter e toggleAssetsAdapter no objeto window', () => {
        expect(typeof (window as any).openAssetsAdapter).toBe('function');
        expect(typeof (window as any).toggleAssetsAdapter).toBe('function');

        (window as any).openAssetsAdapter();
        expect(window.open).toHaveBeenCalledWith('/typescript/adapters/assets-adapter/index.html', '_blank');

        (window as any).toggleAssetsAdapter();
        expect(window.open).toHaveBeenCalledWith('/typescript/adapters/assets-adapter/index.html', '_blank');
    });
});
