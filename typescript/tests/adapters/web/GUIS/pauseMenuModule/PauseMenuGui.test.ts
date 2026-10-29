// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PauseMenuGui from '../../../../../adapters/web/GUIS/pauseMenuModule/PauseMenuGui';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve())
}));

vi.mock('../../../../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui', () => ({
    ConfirmationModal: {
        confirm: vi.fn().mockResolvedValue(true),
        alert: vi.fn().mockResolvedValue(undefined)
    }
}));

describe('PauseMenuGui', () => {
    let onResumeMock: any;
    let onQuitMock: any;
    let gui: PauseMenuGui;

    beforeEach(() => {
        // Limpar o DOM antes de cada teste
        document.body.innerHTML = '';
        
        onResumeMock = vi.fn();
        onQuitMock = vi.fn();
        gui = new PauseMenuGui(onResumeMock, onQuitMock);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('deve injetar a UI no body', () => {
        const overlay = document.getElementById('pause-menu-overlay');
        expect(overlay).not.toBeNull();
        expect(gui.isOpen).toBe(false);
    });

    it('deve exibir e ocultar o menu via toggle()', () => {
        gui.toggle();
        expect(gui.isOpen).toBe(true);
        expect(document.getElementById('pause-menu-overlay')?.classList.contains('active')).toBe(true);
        
        gui.toggle();
        expect(gui.isOpen).toBe(false);
        expect(document.getElementById('pause-menu-overlay')?.classList.contains('active')).toBe(false);
    });

    it('deve chamar onResume e esconder ao clicar no botão Resume principal', async () => {
        gui.show(); // Forçar abertura
        const btnResume = document.getElementById('pm-btn-resume') as HTMLButtonElement;
        
        btnResume.click();
        await new Promise(r => setTimeout(r, 0));
        
        expect(onResumeMock).toHaveBeenCalledOnce();
        expect(gui.isOpen).toBe(false);
    });

    it('deve chamar onQuit ao clicar no botão Quit principal', async () => {
        const btnQuit = document.getElementById('pm-btn-quit') as HTMLButtonElement;
        
        btnQuit.click();
        await new Promise(r => setTimeout(r, 0));
        
        expect(onQuitMock).toHaveBeenCalledOnce();
    });

    it('deve chamar onSave antes de chamar onQuit ao clicar no botão Quit principal quando onSave é fornecido', async () => {
        const callOrder: string[] = [];
        const onSaveMock = vi.fn().mockImplementation(async () => {
            callOrder.push('save');
        });
        const onQuitMockOrder = vi.fn().mockImplementation(() => {
            callOrder.push('quit');
        });

        document.body.innerHTML = '';
        const customGui = new PauseMenuGui(onResumeMock, onQuitMockOrder, onSaveMock);
        customGui.show();

        const btnQuit = document.getElementById('pm-btn-quit') as HTMLButtonElement;
        btnQuit.click();
        await new Promise(r => setTimeout(r, 0));

        expect(onSaveMock).toHaveBeenCalledOnce();
        expect(onQuitMockOrder).toHaveBeenCalledOnce();
        expect(callOrder).toEqual(['save', 'quit']);
    });

    it('deve chamar onSave e exibir feedback de sucesso ao clicar no botão Save Game (Slot 1)', async () => {
        const onSaveMock = vi.fn().mockResolvedValue(undefined);
        document.body.innerHTML = '';
        const customGui = new PauseMenuGui(onResumeMock, onQuitMock, onSaveMock);
        customGui.show();

        const btnSave = document.getElementById('pm-btn-save') as HTMLButtonElement;
        const statusEl = document.getElementById('pm-save-status') as HTMLElement;
        expect(btnSave).not.toBeNull();

        btnSave.click();
        await new Promise(r => setTimeout(r, 0));

        expect(onSaveMock).toHaveBeenCalledOnce();
        expect(statusEl.textContent).toContain('Slot 1');
        expect(statusEl.classList.contains('show')).toBe(true);
        expect(statusEl.classList.contains('error')).toBe(false);
    });

    it('deve exibir feedback de erro se onSave falhar', async () => {
        const onSaveMock = vi.fn().mockRejectedValue(new Error('Disk error'));
        document.body.innerHTML = '';
        const customGui = new PauseMenuGui(onResumeMock, onQuitMock, onSaveMock);
        customGui.show();

        const btnSave = document.getElementById('pm-btn-save') as HTMLButtonElement;
        const statusEl = document.getElementById('pm-save-status') as HTMLElement;

        btnSave.click();
        await new Promise(r => setTimeout(r, 0));

        expect(onSaveMock).toHaveBeenCalledOnce();
        expect(statusEl.textContent).toContain('Erro ao salvar');
        expect(statusEl.classList.contains('error')).toBe(true);
    });

    it('deve alternar a visibilidade do painel de Settings ao clicar em Settings', () => {
        gui.show();
        const btnSettings = document.getElementById('pm-btn-settings') as HTMLButtonElement;
        const settingsPanel = document.getElementById('settings-panel') as HTMLElement;
        
        expect(settingsPanel.classList.contains('active')).toBe(false); // Inicia oculto
        
        btnSettings.click();
        expect(settingsPanel.classList.contains('active')).toBe(true); // Apareceu
        
        btnSettings.click();
        expect(settingsPanel.classList.contains('active')).toBe(false); // Ocultou novamente
    });

    it('deve chamar onResume e esconder ao clicar no Resume Game dentro de Settings', async () => {
        gui.show();
        const settingsResume = document.getElementById('settings-resume') as HTMLButtonElement;
        
        settingsResume.click();
        await new Promise(r => setTimeout(r, 0));
        
        expect(onResumeMock).toHaveBeenCalledOnce();
        expect(gui.isOpen).toBe(false);
    });

    it('deve chamar onQuit (para reiniciar) ao clicar no Restart Game dentro de Settings', async () => {
        gui.show();
        const settingsRestart = document.getElementById('settings-restart') as HTMLButtonElement;
        
        settingsRestart.click();
        await new Promise(r => setTimeout(r, 0));
        
        expect(onQuitMock).toHaveBeenCalledOnce();
    });

    describe('Graybox Tests - Settings Persistence', () => {
        it('deve invocar o backend Tauri com as configurações alteradas ao retomar o jogo', async () => {
            const { invoke } = await import('@tauri-apps/api/core');
            gui.show();

            // Simular alteração manual do usuário nos inputs com modelo presente no <select>
            const modelSelect = document.getElementById('llm-model') as HTMLSelectElement;
            const ctxInput = document.getElementById('llm-ctx') as HTMLInputElement;
            const tempInput = document.getElementById('llm-temp') as HTMLInputElement;

            if(modelSelect) modelSelect.value = 'hermes-3:8b';
            if(ctxInput) ctxInput.value = '4096';
            if(tempInput) tempInput.value = '0.8';

            // Salvar configurações
            const btnResume = document.getElementById('pm-btn-resume') as HTMLButtonElement;
            btnResume.click();

            // O Vitest aguardará a resolução da promessa do event listener, então podemos dar um pequeno delay
            await new Promise(r => setTimeout(r, 10));

            expect(invoke).toHaveBeenCalledWith('save_llm_settings', expect.objectContaining({
                settings: expect.objectContaining({
                    llm_model: 'hermes-3:8b',
                    num_ctx: 4096,
                    temperature: 0.8
                })
            }));
        });

        it('deve aplicar corretamente um preset e enviar a configuração pro backend', async () => {
            const { invoke } = await import('@tauri-apps/api/core');
            gui.show();

            const btnPresetBeast = document.getElementById('preset-beast') as HTMLButtonElement;
            btnPresetBeast.click();

            const settingsResume = document.getElementById('settings-resume') as HTMLButtonElement;
            settingsResume.click();

            await new Promise(r => setTimeout(r, 10));

            expect(invoke).toHaveBeenCalledWith('save_llm_settings', expect.objectContaining({
                settings: {
                    llm_model: 'qwen2.5:7b',
                    num_ctx: 2048,
                    max_tokens: 120,
                    temperature: 0.65,
                    timeout: 120,
                    stateless: false
                }
            }));
        });
    });
});
