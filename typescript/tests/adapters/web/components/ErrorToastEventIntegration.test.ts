// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { GameEventBinder } from '../../../../adapters/web/components/GameEventBinder';
import { EventHandler } from '../../../../domain/eventDispacher/eventDispacher';
import UIManager from '../../../../adapters/web/components/UiManager/UIManager';
import ToastGui from '../../../../adapters/web/GUIS/toastModule/ToastGui';

describe('Error Toast Event Integration & Regression Tests', () => {
    let eventHandler: EventHandler;
    let uiManager: UIManager;
    let mockSceneManager: any;
    let mockDomain: any;
    let binder: GameEventBinder;

    beforeAll(() => {
        mockDomain = {
            eventManager: { on: vi.fn(), dispatch: vi.fn() },
            getEquippedItems: vi.fn().mockReturnValue([]),
            getInventoryItems: vi.fn().mockReturnValue([]),
            getAttributes: vi.fn().mockReturnValue({}),
            generateLocalRewards: vi.fn().mockReturnValue([])
        };

        mockSceneManager = {
            addVisualEffect: vi.fn(),
            particleOrchestrator: { executeEffect: vi.fn() }
        };

        const mockDialogueAdapter: any = {
            isAnyMenuOpen: () => false,
            update: vi.fn(),
            clear: vi.fn(),
            showPortalPrompt: vi.fn(),
            hidePortalPrompt: vi.fn(),
            floatingChatGui: { clear: vi.fn() }
        };

        uiManager = new UIManager(
            mockDomain,
            vi.fn(),
            vi.fn(),
            vi.fn(),
            vi.fn(),
            vi.fn(),
            vi.fn(),
            vi.fn(),
            mockDialogueAdapter
        );
    });

    beforeEach(() => {
        vi.useFakeTimers();
        eventHandler = new EventHandler();

        binder = new GameEventBinder(
            eventHandler,
            uiManager,
            mockSceneManager,
            () => true,
            vi.fn()
        );

        binder.bindEvents();
    });

    afterEach(() => {
        binder.unbindAll();
        uiManager.toastGui.clearAll();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    afterAll(() => {
        uiManager.destroy();
    });

    it('deve interceptar log de erro e exibir toast visual para erro de arma da classe requerida', () => {
        const errorMsg = "A habilidade 'Fan the Hammer' requer a arma da classe 'Gunslinger' equipada na mão principal!";

        // Simula disparo do evento pelo Domínio (PlayerClassManager)
        eventHandler.dispatch('log', {
            channel: 'error',
            message: errorMsg,
            params: []
        });

        const container = document.getElementById('toast-notifications-container');
        expect(container).not.toBeNull();

        const toastEl = container?.querySelector('.toast-item.variant-error') as HTMLElement;
        expect(toastEl).not.toBeNull();
        expect(toastEl.textContent).toContain("A habilidade 'Fan the Hammer' requer a arma da classe 'Gunslinger' equipada na mão principal!");
    });

    it('não deve disparar toast quando o log for de outro canal (ex: debug, info, input)', () => {
        const toastSpy = vi.spyOn(uiManager, 'showToast');

        eventHandler.dispatch('log', {
            channel: 'info',
            message: 'Informação informativa de depuração',
            params: []
        });

        eventHandler.dispatch('log', {
            channel: 'combat',
            message: 'Inimigo atingido',
            params: []
        });

        expect(toastSpy).not.toHaveBeenCalled();
    });

    it('deve ser resiliente e não quebrar na recepção de payload de log malformado ou nulo', () => {
        const toastSpy = vi.spyOn(uiManager, 'showToast');

        expect(() => {
            eventHandler.dispatch('log', null as any);
            eventHandler.dispatch('log', undefined as any);
            eventHandler.dispatch('log', { channel: 'error', message: 123 as any, params: [] });
            eventHandler.dispatch('log', {} as any);
        }).not.toThrow();

        expect(toastSpy).not.toHaveBeenCalled();
    });

    it('deve desinscrever o listener no unbindAll e não criar novos toasts após descarte (prevenção de vazamento)', () => {
        binder.unbindAll();

        eventHandler.dispatch('log', {
            channel: 'error',
            message: 'Erro pós descarte',
            params: []
        });

        const container = document.getElementById('toast-notifications-container');
        expect(container?.textContent).not.toContain('Erro pós descarte');
    });

    it('deve permitir fechar múltiplos toasts de erro consecutivos com auto-dismiss', () => {
        eventHandler.dispatch('log', {
            channel: 'error',
            message: 'Erro 1: Mão principal desarmada',
            params: []
        });

        eventHandler.dispatch('log', {
            channel: 'error',
            message: 'Erro 2: Recarga em andamento',
            params: []
        });

        const container = document.getElementById('toast-notifications-container');
        const items = container?.querySelectorAll('.toast-item');
        expect(items?.length).toBe(2);

        // Avança o tempo do auto-dismiss
        vi.advanceTimersByTime(4000);
        vi.advanceTimersByTime(350);

        const remainingItems = container?.querySelectorAll('.toast-item');
        expect(remainingItems?.length).toBe(0);
    });
});
