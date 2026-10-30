import { logger } from "../../shared/Logger";
import html from './windowHud.html?raw';
import css from './windowHud.css?raw';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ConfirmationModal } from '../confirmationModalModule/ConfirmationModalGui';

export default class WindowHudGui {
    private container!: HTMLElement;

    constructor() {
        //? Só injeta a barra superior se o jogo estiver rodando pelo binário do Tauri
        if ((window as any).__TAURI_INTERNALS__) {
            this.injectUI();
            this.setupActions();
            logger.log('init', 'WindowHudGui instantiated and UI injected.');
        } else {
            logger.log('init', 'WindowHudGui skipped (Not running in Tauri).');
        }
    }

    private injectUI(): void {
        const existing = document.getElementById('custom-titlebar');
        if (existing) {
            existing.remove();
        }

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        const div = document.createElement('div');
        div.innerHTML = html;
        this.container = div.firstElementChild as HTMLElement;
        //? Garante que o HUD da janela tenha prioridade absoluta sobre todas as outras UIs
        this.container.style.zIndex = '9999';
        document.body.appendChild(this.container);

        const appIcon = this.container.querySelector('#titlebar-app-icon') as HTMLImageElement;
        const fullscreenBtn = this.container.querySelector('#titlebar-fullscreen') as HTMLButtonElement;
        const minimizeBtn = this.container.querySelector('#titlebar-minimize') as HTMLButtonElement;
        const maximizeBtn = this.container.querySelector('#titlebar-maximize') as HTMLButtonElement;
        const closeBtn = this.container.querySelector('#titlebar-close') as HTMLButtonElement;

        if (fullscreenBtn) fullscreenBtn.innerHTML = `<img src="${new URL('../../assets/icons/fullscreen-button.png', import.meta.url).href}">`;
        if (minimizeBtn) minimizeBtn.innerHTML = `<img src="${new URL('../../assets/icons/minimize-button.png', import.meta.url).href}">`;
        if (maximizeBtn) maximizeBtn.innerHTML = `<img src="${new URL('../../assets/icons/maximize-button.png', import.meta.url).href}">`;
        if (closeBtn) closeBtn.innerHTML = `<img src="${new URL('../../assets/icons/close.png', import.meta.url).href}">`;
        if (appIcon) {
            appIcon.src = new URL('../../assets/icons/game-icon.png', import.meta.url).href;
            appIcon.onerror = () => {
                appIcon.src = '/game-icon.png';
            };
        }
    }

    private setupActions(): void {
        const fullscreenBtn = this.container.querySelector('#titlebar-fullscreen') as HTMLButtonElement;
        const minimizeBtn = this.container.querySelector('#titlebar-minimize') as HTMLButtonElement;
        const maximizeBtn = this.container.querySelector('#titlebar-maximize') as HTMLButtonElement;
        const closeBtn = this.container.querySelector('#titlebar-close') as HTMLButtonElement;

        fullscreenBtn?.addEventListener('click', async () => {
            try {
                const win = getCurrentWindow();
                const isFullscreen = await win.isFullscreen();
                await win.setFullscreen(!isFullscreen);
            } catch(e) { console.warn(e); }
        });

        minimizeBtn?.addEventListener('click', async () => {
            try {
                await getCurrentWindow().minimize();
            } catch(e) { console.warn(e); }
        });

        maximizeBtn?.addEventListener('click', async () => {
            try {
                await getCurrentWindow().toggleMaximize();
            } catch(e) { console.warn(e); }
        });

        const win = getCurrentWindow();

        //? Intercepta solicitações de fechamento disparadas pelo sistema operacional / Tauri
        try {
            if (typeof win.onCloseRequested === 'function') {
                win.onCloseRequested(async (event: any) => {
                    if (this.isConfirmedExiting) {
                        return;
                    }
                    event.preventDefault();
                    try {
                        const confirmed = await ConfirmationModal.confirm({
                            title: 'Sair do Jogo',
                            message: 'Tem certeza de que deseja fechar a janela e encerrar o jogo?',
                            confirmText: 'Sair',
                            cancelText: 'Cancelar',
                            variant: 'danger'
                        });
                        if (confirmed) {
                            await this.closeApplication(win);
                        }
                    } catch (err) {
                        console.warn('[WindowHudGui] Erro durante confirmação de saída:', err);
                    }
                });
            }
        } catch (err) {
            console.warn('[WindowHudGui] onCloseRequested indisponível:', err);
        }

        closeBtn.addEventListener('click', async () => {
            if (this.isConfirmedExiting) return;
            try {
                const confirmed = await ConfirmationModal.confirm({
                    title: 'Sair do Jogo',
                    message: 'Tem certeza de que deseja fechar a janela e encerrar o jogo?',
                    confirmText: 'Sair',
                    cancelText: 'Cancelar',
                    variant: 'danger'
                });
                if (confirmed) {
                    await this.closeApplication(win);
                }
            } catch(e) { console.warn(e); }
        });
    }

    private isConfirmedExiting = false;

    private async closeApplication(win: any): Promise<void> {
        this.isConfirmedExiting = true;
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('exit_game');
            return;
        } catch {}

        try {
            await win.destroy();
            return;
        } catch (err) {
            console.warn('[WindowHudGui] Falha ao destruir janela via win.destroy():', err);
        }

        try {
            await win.close();
        } catch (err) {
            console.warn('[WindowHudGui] Falha ao fechar janela via win.close():', err);
        }
    }
}