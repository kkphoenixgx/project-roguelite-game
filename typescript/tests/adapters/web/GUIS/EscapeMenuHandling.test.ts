// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PauseMenuGui from '../../../../adapters/web/GUIS/pauseMenuModule/PauseMenuGui';
import UIManager from '../../../../adapters/web/components/UiManager/UIManager';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve())
}));

describe('Escape Menu Handling & Navigation', () => {
    let onResumeMock: any;
    let onQuitMock: any;
    let pauseGui: PauseMenuGui;

    beforeEach(() => {
        document.body.innerHTML = '';
        onResumeMock = vi.fn();
        onQuitMock = vi.fn();
        pauseGui = new PauseMenuGui(onResumeMock, onQuitMock);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('PauseMenuGui Settings panel toggle via ESC', () => {
        it('deve identificar se o painel de configurações está aberto via isSettingsOpen()', () => {
            expect(pauseGui.isSettingsOpen()).toBe(false);
            
            const btnSettings = document.getElementById('pm-btn-settings') as HTMLElement;
            btnSettings?.click();
            expect(pauseGui.isSettingsOpen()).toBe(true);

            pauseGui.closeSettings();
            expect(pauseGui.isSettingsOpen()).toBe(false);
        });
    });

    describe('UIManager.closeAnyOpenMenu()', () => {
        let fakeDomain: any;
        let uiManager: UIManager;
        let mockTogglePause: any;

        beforeEach(() => {
            mockTogglePause = vi.fn();
            fakeDomain = {
                eventManager: { on: vi.fn(), dispatch: vi.fn() },
                getEquippedItems: vi.fn().mockReturnValue([]),
                getInventoryItems: vi.fn().mockReturnValue([]),
                getAttributes: vi.fn().mockReturnValue({}),
                generateLocalRewards: vi.fn().mockReturnValue([])
            };

            const fakeDialogueAdapter: any = {
                dialogueGui: { isOpen: false, hide: vi.fn(), show: vi.fn() },
                floatingChatGui: { clear: vi.fn() },
                isAnyMenuOpen: vi.fn().mockReturnValue(false),
                clear: vi.fn()
            };

            uiManager = new UIManager(
                fakeDomain,
                mockTogglePause,
                vi.fn(),
                vi.fn(),
                vi.fn(),
                vi.fn(),
                vi.fn(),
                vi.fn(),
                fakeDialogueAdapter,
                vi.fn()
            );
        });

        it('deve retornar false se nenhum menu estiver aberto', () => {
            expect(uiManager.isAnyMenuOpen()).toBe(false);
            expect(uiManager.closeAnyOpenMenu()).toBe(false);
        });

        it('deve fechar a Skill Tree quando aberta e retornar true', () => {
            uiManager.toggleSkillTree();
            expect(uiManager.isAnyMenuOpen()).toBe(true);

            const closed = uiManager.closeAnyOpenMenu();
            expect(closed).toBe(true);
            expect(uiManager.isAnyMenuOpen()).toBe(false);
        });

        it('deve fechar o Menu de Personagem quando aberto e retornar true', () => {
            uiManager.toggleCharacterMenu();
            expect(uiManager.isAnyMenuOpen()).toBe(true);

            const closed = uiManager.closeAnyOpenMenu();
            expect(closed).toBe(true);
            expect(uiManager.isAnyMenuOpen()).toBe(false);
        });

        it('deve fechar o Diálogo quando aberto e retornar true', () => {
            (uiManager.dialogueAdapter.isAnyMenuOpen as any).mockReturnValue(true);
            expect(uiManager.isAnyMenuOpen()).toBe(true);

            const closed = uiManager.closeAnyOpenMenu();
            expect(closed).toBe(true);
            expect(uiManager.dialogueAdapter.clear).toHaveBeenCalledOnce();
        });
    });
});
