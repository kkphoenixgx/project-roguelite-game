import { invoke } from "@tauri-apps/api/core";
import { logger } from "../../shared/Logger";
import html from './pauseMenu.html?raw';
import css from './pauseMenu.css?raw';
import { ConfirmationModal } from '../confirmationModalModule/ConfirmationModalGui';

export default class PauseMenuGui {
    private container!: HTMLElement;
    private isVisible: boolean = false;
    private settingsPanel!: HTMLElement;
    private saveStatusEl!: HTMLElement | null;

    constructor(
        private onResume: () => void,
        private onQuit: () => void,
        private onSave?: () => Promise<void> | void
    ) {
        this.injectUI();
        this.setupListeners();
        logger.log('init', 'PauseMenuGui instantiated.');
    }

    private injectUI(): void {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        
        const div = document.createElement('div');
        div.innerHTML = html;
        this.container = div.firstElementChild as HTMLElement;
        document.body.appendChild(this.container);
        
        this.settingsPanel = this.container.querySelector('#settings-panel') as HTMLElement;
        this.saveStatusEl = this.container.querySelector('#pm-save-status') as HTMLElement;
    }

    private setupListeners(): void {
        const btnResume = this.container.querySelector('#pm-btn-resume');
        const btnSave = this.container.querySelector('#pm-btn-save') as HTMLButtonElement;
        const btnSettings = this.container.querySelector('#pm-btn-settings');
        const btnQuit = this.container.querySelector('#pm-btn-quit');

        btnResume?.addEventListener('click', async () => {
            await this.saveSettings();
            this.hide();
            this.onResume();
        });

        btnSave?.addEventListener('click', async () => {
            if (btnSave.disabled) return;
            btnSave.disabled = true;
            const originalText = btnSave.textContent;
            btnSave.textContent = 'Salvando...';

            try {
                if (this.onSave) {
                    await this.onSave();
                }
                this.showSaveFeedback('✓ Jogo gravado com sucesso no Slot 1!', false);
            } catch (err) {
                console.error('[PauseMenuGui] Erro ao salvar jogo:', err);
                this.showSaveFeedback('✗ Erro ao salvar progresso.', true);
            } finally {
                btnSave.disabled = false;
                btnSave.textContent = originalText;
            }
        });

        btnSettings?.addEventListener('click', () => {
            this.toggleSettings();
        });

        btnQuit?.addEventListener('click', async () => {
            if (this.onSave) {
                try {
                    await this.onSave();
                } catch (err) {
                    console.error('[PauseMenuGui] Erro ao salvar antes de quitar:', err);
                }
            }
            this.onQuit();
        });

        const settingsRestart = this.container.querySelector('#settings-restart');
        const settingsResume = this.container.querySelector('#settings-resume');

        settingsRestart?.addEventListener('click', async () => {
            const confirmed = await ConfirmationModal.confirm({
                title: 'Reiniciar Partida',
                message: 'Tem certeza de que deseja reiniciar a partida?',
                confirmText: 'Reiniciar',
                cancelText: 'Cancelar',
                variant: 'warning'
            });
            if (confirmed) {
                await this.saveSettings();
                this.onQuit();
            }
        });

        settingsResume?.addEventListener('click', async () => {
            await this.saveSettings();
            this.hide();
            this.onResume();
        });

        /* Tabs Logic */
        const navItems = this.container.querySelectorAll('.nav-item');
        const tabBodies = this.container.querySelectorAll('.settings-body');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                const targetTabId = (item as HTMLElement).dataset.tab;
                tabBodies.forEach(body => {
                    if (body.id === targetTabId) {
                        (body as HTMLElement).style.display = 'flex';
                    } else {
                        (body as HTMLElement).style.display = 'none';
                    }
                });
            });
        });

        /* Slider Value Displays */
        const bindSlider = (id: string, suffix: string = '') => {
            const input = this.container.querySelector(`#llm-${id}`) as HTMLInputElement;
            const span = this.container.querySelector(`#val-${id}`);
            if (input && span) {
                input.addEventListener('input', () => {
                    span.textContent = input.value + suffix;
                });
            }
        };

        bindSlider('ctx');
        bindSlider('timeout', 's');
        bindSlider('temp');
        bindSlider('tokens');

        /* Presets Logic */
        const applyLLMPreset = (model: string, ctx: string, timeout: string, temp: string, tokens: string, reflexion: boolean, guards: boolean, stateless: boolean) => {
            const modelSelect = this.container.querySelector('#llm-model') as HTMLSelectElement;
            if (modelSelect) modelSelect.value = model;
            
            const triggerInput = (id: string, val: string) => {
                const el = this.container.querySelector(`#llm-${id}`) as HTMLInputElement;
                if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
            };

            triggerInput('ctx', ctx);
            triggerInput('timeout', timeout);
            triggerInput('temp', temp);
            triggerInput('tokens', tokens);

            const refEl = this.container.querySelector('#llm-reflexion') as HTMLInputElement;
            if (refEl) refEl.checked = reflexion;
            const guardsEl = this.container.querySelector('#llm-guards') as HTMLInputElement;
            if (guardsEl) guardsEl.checked = guards;
            const statelessEl = this.container.querySelector('#llm-stateless') as HTMLInputElement;
            if (statelessEl) statelessEl.checked = stateless;
        };

        this.container.querySelector('#preset-potato')?.addEventListener('click', () => {
            //? Perfil Econômico: modelo ultraleve qwen2.5:0.5b sem reflexão para CPUs e gráficos integrados
            applyLLMPreset('qwen2.5:0.5b', '768', '600', '0.5', '32', false, false, true);
        });

        this.container.querySelector('#preset-balanced')?.addEventListener('click', () => {
            //? Perfil Equilibrado: modelo padrão qwen2.5:1.5b com reflexão e guardas ativos
            applyLLMPreset('qwen2.5:1.5b', '1024', '180', '0.7', '96', true, true, false);
        });

        this.container.querySelector('#preset-beast')?.addEventListener('click', () => {
            //? Perfil High-End: modelo qwen2.5:7b com contexto expandido (2048 tokens) para GPUs dedicadas
            applyLLMPreset('qwen2.5:7b', '2048', '120', '0.65', '120', true, true, false);
        });
    }

    private toggleSettings(): void {
        if (this.settingsPanel.classList.contains('active')) {
            this.settingsPanel.classList.remove('active');
        } else {
            this.settingsPanel.classList.add('active');
        }
    }

    
    private async saveSettings() {
        const modelSelect = this.container.querySelector('#llm-model') as HTMLSelectElement;
        const ctxInput = this.container.querySelector('#llm-ctx') as HTMLInputElement;
        const timeoutInput = this.container.querySelector('#llm-timeout') as HTMLInputElement;
        const tempInput = this.container.querySelector('#llm-temp') as HTMLInputElement;
        const tokensInput = this.container.querySelector('#llm-tokens') as HTMLInputElement;
        const statelessInput = this.container.querySelector('#llm-stateless') as HTMLInputElement;

        if (!modelSelect || !ctxInput || !timeoutInput || !tempInput || !tokensInput) return;

        const settings = {
            llm_model: modelSelect.value,
            num_ctx: parseInt(ctxInput.value, 10),
            timeout: parseInt(timeoutInput.value, 10),
            temperature: parseFloat(tempInput.value),
            max_tokens: parseInt(tokensInput.value, 10),
            stateless: statelessInput ? statelessInput.checked : true
        };

        try {
            await invoke('save_llm_settings', { settings });
            logger.log('domain', 'LLM Settings saved:', settings);
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    private showSaveFeedback(message: string, isError: boolean = false): void {
        if (!this.saveStatusEl) return;
        this.saveStatusEl.textContent = message;
        this.saveStatusEl.classList.remove('error');
        if (isError) {
            this.saveStatusEl.classList.add('error');
        }
        this.saveStatusEl.classList.add('show');

        setTimeout(() => {
            if (this.saveStatusEl) {
                this.saveStatusEl.classList.remove('show');
            }
        }, 3000);
    }

    public show(): void {
        if (!this.isVisible) {
            this.isVisible = true;
            this.container.classList.add('active');
            this.settingsPanel.classList.remove('active');
        }
    }

    public hide(): void {
        if (this.isVisible) {
            this.isVisible = false;
            this.container.classList.remove('active');
        }
    }

    public toggle(): void {
        if (this.isVisible) this.hide();
        else this.show();
    }

    public get isOpen(): boolean {
        return this.isVisible;
    }

    public isSettingsOpen(): boolean {
        return this.settingsPanel?.classList.contains('active') ?? false;
    }

    public closeSettings(): void {
        if (this.settingsPanel) {
            this.settingsPanel.classList.remove('active');
        }
    }
}
