// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Variável compartilhada para o mock de janela do Tauri
let activeMockWindow: any = null;

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => activeMockWindow || ({
        close: vi.fn().mockResolvedValue(undefined),
        minimize: vi.fn().mockResolvedValue(undefined),
        toggleMaximize: vi.fn().mockResolvedValue(undefined),
        setFullscreen: vi.fn().mockResolvedValue(undefined),
        isFullscreen: vi.fn().mockResolvedValue(false),
        destroy: vi.fn().mockResolvedValue(undefined),
        onCloseRequested: vi.fn()
    })
}));

describe('Regressão de Governança: Prevenção de Crash e Encerramento Efetivo do Jogo', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    let unhandledRejections: any[] = [];
    let unhandledErrors: any[] = [];
    let rejectionHandler: (e: PromiseRejectionEvent) => void;
    let errorHandler: (e: ErrorEvent) => void;

    beforeEach(() => {
        vi.clearAllMocks();
        unhandledRejections = [];
        unhandledErrors = [];

        rejectionHandler = (e: PromiseRejectionEvent) => {
            unhandledRejections.push(e.reason);
        };
        errorHandler = (e: ErrorEvent) => {
            unhandledErrors.push(e.error || e.message);
        };

        window.addEventListener('unhandledrejection', rejectionHandler);
        window.addEventListener('error', errorHandler);

        // Limpa possíveis resíduos de crash overlay ou titlebar no DOM
        document.getElementById('game-crash-overlay')?.remove();
        document.getElementById('custom-titlebar')?.remove();
    });

    afterEach(() => {
        window.removeEventListener('unhandledrejection', rejectionHandler);
        window.removeEventListener('error', errorHandler);
        delete (window as any).__TAURI_INTERNALS__;
        activeMockWindow = null;
        document.getElementById('game-crash-overlay')?.remove();
        document.getElementById('custom-titlebar')?.remove();
    });

    // =========================================================================
    // 1. BLINDAGEM DE CONFIGURAÇÃO E PERMISSÕES DO TAURI
    // =========================================================================
    describe('1. Verificação de Capacidades e Permissões do Tauri', () => {
        it('deve garantir que core:window:allow-destroy está explicitamente concedido em default.json', () => {
            const capabilitiesPath = path.resolve(rootDir, 'src-tauri/capabilities/default.json');
            expect(fs.existsSync(capabilitiesPath)).toBe(true);

            const content = fs.readFileSync(capabilitiesPath, 'utf-8');
            const parsed = JSON.parse(content);

            expect(parsed.permissions).toContain('core:window:allow-destroy');
            expect(parsed.permissions).toContain('core:window:allow-close');
        });

        it('deve garantir que o backend Rust implementa e expõe o comando exit_game', () => {
            const libRsPath = path.resolve(rootDir, 'src-tauri/src/lib.rs');
            expect(fs.existsSync(libRsPath)).toBe(true);

            const libContent = fs.readFileSync(libRsPath, 'utf-8');

            // Verifica a definição da função exit_game
            expect(libContent).toMatch(/fn\s+exit_game\s*\(/);
            expect(libContent).toContain('app.exit(0)');
            expect(libContent).toContain('cleanup_zombie_processes()');

            // Verifica o registro no generate_handler
            expect(libContent).toMatch(/tauri::generate_handler!\[[\s\S]*?\bexit_game\b[\s\S]*?\]/);
        });
    });

    // =========================================================================
    // 2. CICLO COMPLETO DE SAÍDA E GARANTIA DE ZERO CRASHES
    // =========================================================================
    describe('2. Ciclo de Saída via Botão de Fechar da Interface (WindowHudGui)', () => {
        it('deve fechar o jogo via invoke("exit_game") sem disparar unhandled rejection ou crash overlay', async () => {
            const mockDestroy = vi.fn().mockResolvedValue(undefined);
            const mockClose = vi.fn().mockResolvedValue(undefined);
            const mockWindow = {
                isFullscreen: vi.fn().mockResolvedValue(false),
                setFullscreen: vi.fn().mockResolvedValue(undefined),
                minimize: vi.fn().mockResolvedValue(undefined),
                toggleMaximize: vi.fn().mockResolvedValue(undefined),
                destroy: mockDestroy,
                close: mockClose,
                onCloseRequested: vi.fn()
            };

            (window as any).__TAURI_INTERNALS__ = {};
            activeMockWindow = mockWindow;

            const { invoke } = await import('@tauri-apps/api/core');
            vi.mocked(invoke).mockResolvedValue(undefined);

            const { ConfirmationModal } = await import('../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui');
            const confirmSpy = vi.spyOn(ConfirmationModal, 'confirm').mockResolvedValue(true);

            const { default: WindowHudGui } = await import('../../adapters/web/GUIS/windowHudModule/WindowHudGui');
            new WindowHudGui();

            const closeBtn = document.getElementById('titlebar-close');
            expect(closeBtn).not.toBeNull();

            // Dispara o clique no botão de fechar
            closeBtn!.click();

            // Aguarda a resolução assíncrona do modal e das chamadas de fechamento
            await new Promise(r => setTimeout(r, 50));

            // Garante que o modal personalizado foi chamado
            expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Sair do Jogo',
                variant: 'danger'
            }));

            // Garante que exit_game foi acionado para encerramento gracioso
            expect(invoke).toHaveBeenCalledWith('exit_game');

            // Garante que ZERO exceções não tratadas foram geradas
            expect(unhandledRejections).toHaveLength(0);
            expect(unhandledErrors).toHaveLength(0);

            // Garante que o crash overlay não foi injetado
            const crashOverlay = document.getElementById('game-crash-overlay');
            expect(crashOverlay).toBeNull();

            confirmSpy.mockRestore();
        });

        it('não deve fechar o jogo se o usuário cancelar o modal de saída', async () => {
            const mockDestroy = vi.fn().mockResolvedValue(undefined);
            const mockClose = vi.fn().mockResolvedValue(undefined);
            const mockWindow = {
                isFullscreen: vi.fn().mockResolvedValue(false),
                setFullscreen: vi.fn().mockResolvedValue(undefined),
                minimize: vi.fn().mockResolvedValue(undefined),
                toggleMaximize: vi.fn().mockResolvedValue(undefined),
                destroy: mockDestroy,
                close: mockClose,
                onCloseRequested: vi.fn()
            };

            (window as any).__TAURI_INTERNALS__ = {};
            activeMockWindow = mockWindow;

            const { invoke } = await import('@tauri-apps/api/core');
            vi.mocked(invoke).mockClear();

            const { ConfirmationModal } = await import('../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui');
            const confirmSpy = vi.spyOn(ConfirmationModal, 'confirm').mockResolvedValue(false);

            const { default: WindowHudGui } = await import('../../adapters/web/GUIS/windowHudModule/WindowHudGui');
            new WindowHudGui();

            const closeBtn = document.getElementById('titlebar-close');
            expect(closeBtn).not.toBeNull();

            closeBtn!.click();
            await new Promise(r => setTimeout(r, 50));

            expect(confirmSpy).toHaveBeenCalled();
            // Nenhuma rotina de encerramento pode ter sido chamada
            expect(invoke).not.toHaveBeenCalledWith('exit_game');
            expect(mockDestroy).not.toHaveBeenCalled();
            expect(mockClose).not.toHaveBeenCalled();

            confirmSpy.mockRestore();
        });
    });

    // =========================================================================
    // 3. TOLERÂNCIA A FALHAS E RESILIÊNCIA EM CADEIA (IPC FALLBACK)
    // =========================================================================
    describe('3. Cadeia de Contingência e Tolerância a Falhas na Saída', () => {
        it('deve recorrer a win.destroy() caso o comando nativo exit_game falhe com erro de IPC', async () => {
            const mockDestroy = vi.fn().mockResolvedValue(undefined);
            const mockClose = vi.fn().mockResolvedValue(undefined);
            const mockWindow = {
                isFullscreen: vi.fn().mockResolvedValue(false),
                setFullscreen: vi.fn().mockResolvedValue(undefined),
                minimize: vi.fn().mockResolvedValue(undefined),
                toggleMaximize: vi.fn().mockResolvedValue(undefined),
                destroy: mockDestroy,
                close: mockClose,
                onCloseRequested: vi.fn()
            };

            (window as any).__TAURI_INTERNALS__ = {};
            activeMockWindow = mockWindow;

            const { invoke } = await import('@tauri-apps/api/core');
            // Simula falha do IPC nativo
            vi.mocked(invoke).mockRejectedValueOnce(new Error('Tauri IPC offline'));

            const { ConfirmationModal } = await import('../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui');
            const confirmSpy = vi.spyOn(ConfirmationModal, 'confirm').mockResolvedValue(true);

            const { default: WindowHudGui } = await import('../../adapters/web/GUIS/windowHudModule/WindowHudGui');
            new WindowHudGui();

            const closeBtn = document.getElementById('titlebar-close');
            closeBtn!.click();

            await new Promise(r => setTimeout(r, 50));

            // Garante que o fallback win.destroy foi acionado
            expect(mockDestroy).toHaveBeenCalledTimes(1);
            expect(unhandledRejections).toHaveLength(0);

            confirmSpy.mockRestore();
        });

        it('deve recorrer a win.close() caso exit_game e win.destroy() falhem consecutivamente', async () => {
            const mockDestroy = vi.fn().mockRejectedValue(new Error('core:window:allow-destroy permission error'));
            const mockClose = vi.fn().mockResolvedValue(undefined);
            const mockWindow = {
                isFullscreen: vi.fn().mockResolvedValue(false),
                setFullscreen: vi.fn().mockResolvedValue(undefined),
                minimize: vi.fn().mockResolvedValue(undefined),
                toggleMaximize: vi.fn().mockResolvedValue(undefined),
                destroy: mockDestroy,
                close: mockClose,
                onCloseRequested: vi.fn()
            };

            (window as any).__TAURI_INTERNALS__ = {};
            activeMockWindow = mockWindow;

            const { invoke } = await import('@tauri-apps/api/core');
            vi.mocked(invoke).mockRejectedValueOnce(new Error('IPC unavailable'));

            const { ConfirmationModal } = await import('../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui');
            const confirmSpy = vi.spyOn(ConfirmationModal, 'confirm').mockResolvedValue(true);

            const { default: WindowHudGui } = await import('../../adapters/web/GUIS/windowHudModule/WindowHudGui');
            new WindowHudGui();

            const closeBtn = document.getElementById('titlebar-close');
            closeBtn!.click();

            await new Promise(r => setTimeout(r, 50));

            // Garante que o fallback final win.close() foi chamado
            expect(mockClose).toHaveBeenCalledTimes(1);
            // Garante que o erro de win.destroy() não vazou como rejeição não tratada
            expect(unhandledRejections).toHaveLength(0);

            confirmSpy.mockRestore();
        });
    });

    // =========================================================================
    // 4. INTERCEPTADOR DE FECHAMENTO PELO SISTEMA OPERACIONAL (onCloseRequested)
    // =========================================================================
    describe('4. Interceptação de Fechamento pelo Sistema Operacional (Alt+F4 / Window Manager)', () => {
        it('deve cancelar o fechamento nativo e acionar confirmação ao receber evento do sistema', async () => {
            let registeredCloseHandler: ((event: any) => Promise<void>) | null = null;
            const mockWindow = {
                isFullscreen: vi.fn().mockResolvedValue(false),
                setFullscreen: vi.fn().mockResolvedValue(undefined),
                minimize: vi.fn().mockResolvedValue(undefined),
                toggleMaximize: vi.fn().mockResolvedValue(undefined),
                destroy: vi.fn().mockResolvedValue(undefined),
                close: vi.fn().mockResolvedValue(undefined),
                onCloseRequested: vi.fn((handler: any) => {
                    registeredCloseHandler = handler;
                })
            };

            (window as any).__TAURI_INTERNALS__ = {};
            activeMockWindow = mockWindow;

            const { invoke } = await import('@tauri-apps/api/core');
            vi.mocked(invoke).mockResolvedValue(undefined);

            const { ConfirmationModal } = await import('../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui');
            const confirmSpy = vi.spyOn(ConfirmationModal, 'confirm').mockResolvedValue(true);

            const { default: WindowHudGui } = await import('../../adapters/web/GUIS/windowHudModule/WindowHudGui');
            new WindowHudGui();

            expect(registeredCloseHandler).not.toBeNull();

            const mockOsCloseEvent = {
                preventDefault: vi.fn()
            };

            // Simula o evento emitido pelo SO
            await registeredCloseHandler!(mockOsCloseEvent);

            // Garante que o comportamento nativo foi suspenso
            expect(mockOsCloseEvent.preventDefault).toHaveBeenCalled();
            // Garante que a confirmação foi solicitada
            expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Sair do Jogo',
                variant: 'danger'
            }));
            // Garante que a saída foi executada
            expect(invoke).toHaveBeenCalledWith('exit_game');
            expect(unhandledRejections).toHaveLength(0);

            confirmSpy.mockRestore();
        });
    });
});
