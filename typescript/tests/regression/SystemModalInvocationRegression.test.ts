// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

let activeMockWindow: any = null;
vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => activeMockWindow || ({
        close: vi.fn(),
        minimize: vi.fn(),
        toggleMaximize: vi.fn(),
        setFullscreen: vi.fn(),
        isFullscreen: vi.fn().mockResolvedValue(false),
        destroy: vi.fn().mockResolvedValue(undefined),
        onCloseRequested: vi.fn()
    })
}));

interface ModalViolation {
    file: string;
    relativePath: string;
    line: number;
    snippet: string;
    modalType: 'alert' | 'confirm' | 'prompt';
    callPattern: string;
}

/**
 * Varre recursivamente o diretório em busca de arquivos TypeScript de produção,
 * ignorando testes, types de declaração (.d.ts) e node_modules.
 */
function getProductionTsFiles(dirPath: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dirPath)) return results;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'target', 'tests', '.stryker-tmp'].includes(entry.name)) {
                results.push(...getProductionTsFiles(fullPath));
            }
        } else if (
            entry.isFile() &&
            entry.name.endsWith('.ts') &&
            !entry.name.endsWith('.d.ts') &&
            !entry.name.endsWith('.stories.ts')
        ) {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * Analisa o conteúdo de um arquivo e detecta chamadas a modais nativos do sistema
 * (window.alert, window.confirm, window.prompt, alert(), confirm(), prompt()).
 * Ignora declarações de métodos de classe como 'public confirm(...)'.
 */
function auditFileForSystemModals(filePath: string, rootDir: string): ModalViolation[] {
    const violations: ModalViolation[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let inBlockComment = false;

    const relativePath = path.relative(rootDir, filePath);

    lines.forEach((rawLine, idx) => {
        let line = rawLine;

        // Trata comentários em bloco multi-linha
        if (inBlockComment) {
            const endIdx = line.indexOf('*/');
            if (endIdx !== -1) {
                inBlockComment = false;
                line = line.substring(endIdx + 2);
            } else {
                return;
            }
        }

        const startIdx = line.indexOf('/*');
        if (startIdx !== -1) {
            const endIdx = line.indexOf('*/', startIdx + 2);
            if (endIdx !== -1) {
                line = line.substring(0, startIdx) + line.substring(endIdx + 2);
            } else {
                inBlockComment = true;
                line = line.substring(0, startIdx);
            }
        }

        // Trata comentários de linha única
        const commentIdx = line.indexOf('//');
        if (commentIdx !== -1) {
            line = line.substring(0, commentIdx);
        }

        // 1. Chamadas explícitas via window.* ou globalThis.*
        const explicitRegex = /\b(window|globalThis)\s*\.\s*(alert|confirm|prompt)\s*\(/g;
        let match: RegExpExecArray | null;
        while ((match = explicitRegex.exec(line)) !== null) {
            violations.push({
                file: filePath,
                relativePath,
                line: idx + 1,
                snippet: rawLine.trim(),
                modalType: match[2] as 'alert' | 'confirm' | 'prompt',
                callPattern: `${match[1]}.${match[2]}()`
            });
        }

        // 2. Chamadas standalone (alert, confirm, prompt)
        const standaloneRegex = /\b(alert|confirm|prompt)\s*\(/g;
        while ((match = standaloneRegex.exec(line)) !== null) {
            const matchIndex = match.index;
            const prefix = line.substring(0, matchIndex).trimEnd();

            // Ignora acessos de métodos em objetos (ex: ConfirmationModal.confirm, this.confirm, modal.alert)
            if (prefix.endsWith('.')) {
                continue;
            }

            // Ignora declarações de membros de classe (ex: public confirm(, public static alert()
            if (/\b(?:public|private|protected|static|abstract|override|async)\b/.test(prefix)) {
                continue;
            }

            // Ignora se o match anterior já capturou window.xxx
            if (prefix.endsWith('window') || prefix.endsWith('globalThis')) {
                continue;
            }

            violations.push({
                file: filePath,
                relativePath,
                line: idx + 1,
                snippet: rawLine.trim(),
                modalType: match[1] as 'alert' | 'confirm' | 'prompt',
                callPattern: `${match[1]}()`
            });
        }
    });

    return violations;
}

/**
 * Analisa o conteúdo de um arquivo em busca de atribuições de e.returnValue em beforeunload,
 * que provocam a exibição automática de caixas nativas pelo navegador/webview.
 */
function auditFileForUnloadReturnValue(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const matched: string[] = [];

    lines.forEach((line, idx) => {
        if (line.includes('//')) {
            line = line.substring(0, line.indexOf('//'));
        }
        if (/\b(?:e|event)\.returnValue\s*=/.test(line)) {
            matched.push(`Line ${idx + 1}: ${line.trim()}`);
        }
    });

    return matched;
}

describe('Regressão de Governança: Proibição de Modais Nativos e Modais do Sistema via Window', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const typescriptDir = path.resolve(rootDir, 'typescript');
    const domainDir = path.resolve(typescriptDir, 'domain');
    const adaptersDir = path.resolve(typescriptDir, 'adapters');

    // =========================================================================
    // 1. ISOLAMENTO DO DOMÍNIO ("Cérebro no Pote")
    // =========================================================================
    describe('1. Camada de Domínio ("Cérebro no Pote")', () => {
        it('deve garantir ZERO invocações de modais nativos em typescript/domain/', () => {
            const domainFiles = getProductionTsFiles(domainDir);
            expect(domainFiles.length).toBeGreaterThan(0);

            const domainViolations: ModalViolation[] = [];
            for (const file of domainFiles) {
                domainViolations.push(...auditFileForSystemModals(file, rootDir));
            }

            expect(
                domainViolations,
                `O Domínio jamais deve invocar modais síncronos do sistema:\n${domainViolations
                    .map(v => `  - ${v.relativePath}:${v.line} [${v.callPattern}] -> ${v.snippet}`)
                    .join('\n')}`
            ).toHaveLength(0);
        });
    });

    // =========================================================================
    // 2. AUDITORIA DOS ADAPTADORES WEB / GAMEPLAY
    // =========================================================================
    describe('2. Adaptadores Web e GUIs de Gameplay (typescript/adapters/web/)', () => {
        it('deve garantir ZERO chamadas a modais nativos em typescript/adapters/web/', () => {
            const webFiles = getProductionTsFiles(path.resolve(adaptersDir, 'web'));
            const webViolations: ModalViolation[] = [];
            for (const file of webFiles) {
                webViolations.push(...auditFileForSystemModals(file, rootDir));
            }

            expect(
                webViolations,
                `Violações encontradas em adapters/web:\n${webViolations
                    .map(v => `  - ${v.relativePath}:${v.line} [${v.callPattern}] -> ${v.snippet}`)
                    .join('\n')}`
            ).toHaveLength(0);
        });

        it('deve garantir que o MainMenuGui não invoca prompt() nativo ao substituir saves', () => {
            const mainMenuPath = path.resolve(adaptersDir, 'web/GUIS/mainMenuHudModule/MainMenuGui.ts');
            const violations = auditFileForSystemModals(mainMenuPath, rootDir);
            const promptViolations = violations.filter(v => v.modalType === 'prompt');

            expect(promptViolations).toHaveLength(0);

            const content = fs.readFileSync(mainMenuPath, 'utf-8');
            expect(content).not.toMatch(/\bprompt\s*\(/);
            expect(content).toContain('ConfirmationModal.confirm');
        });
    });

    // =========================================================================
    // 3. AUDITORIA DE FERRAMENTAS E EDITORES
    // =========================================================================
    describe('3. Editores e Ferramentas (assets-adapter e polygonWebEditor)', () => {
        it('deve garantir ZERO invocações de alert() e confirm() nativos no assets-adapter', () => {
            const assetsAdapterDir = path.resolve(adaptersDir, 'assets-adapter');
            const files = getProductionTsFiles(assetsAdapterDir);
            const violations: ModalViolation[] = [];

            for (const file of files) {
                violations.push(...auditFileForSystemModals(file, rootDir));
            }

            expect(
                violations,
                `Violações encontradas no assets-adapter:\n${violations
                    .map(v => `  - ${v.relativePath}:${v.line} [${v.callPattern}] -> ${v.snippet}`)
                    .join('\n')}`
            ).toHaveLength(0);
        });

        it('deve garantir ZERO invocações de alert() nativo no polygonWebEditor (EditorApp.ts)', () => {
            const polygonEditorDir = path.resolve(adaptersDir, 'polygonWebEditor');
            const files = getProductionTsFiles(polygonEditorDir);
            const violations: ModalViolation[] = [];

            for (const file of files) {
                violations.push(...auditFileForSystemModals(file, rootDir));
            }

            expect(
                violations,
                `Violações encontradas no polygonWebEditor:\n${violations
                    .map(v => `  - ${v.relativePath}:${v.line} [${v.callPattern}] -> ${v.snippet}`)
                    .join('\n')}`
            ).toHaveLength(0);
        });
    });

    // =========================================================================
    // 4. BALANÇO GERAL DE CONFORMIDADE: REGRA DE ZERO MODAIS NATIVOS
    // =========================================================================
    describe('4. Governança Global: Regra Estrita de ZERO Modais Nativos', () => {
        it('deve garantir ZERO violações de alert/confirm/prompt em toda a base de produção', () => {
            const allFiles = getProductionTsFiles(typescriptDir);
            const allViolations: ModalViolation[] = [];

            for (const file of allFiles) {
                allViolations.push(...auditFileForSystemModals(file, rootDir));
            }

            expect(
                allViolations,
                `Violações encontradas em arquivos de produção:\n${allViolations
                    .map(v => `  - ${v.relativePath}:${v.line} [${v.callPattern}] -> ${v.snippet}`)
                    .join('\n')}`
            ).toHaveLength(0);
        });
    });

    // =========================================================================
    // 5. MODAIS GERADOS PELO SISTEMA / TAURI VIA MANIPULAÇÃO DA WINDOW
    // =========================================================================
    describe('5. Modais do Sistema Gerados pelo Navegador/Tauri via Manipulação da Window', () => {
        it('deve garantir ZERO atribuições de e.returnValue em beforeunload em toda a base de código', () => {
            const allFiles = getProductionTsFiles(typescriptDir);
            const unloadViolations: { file: string; matches: string[] }[] = [];

            for (const file of allFiles) {
                const matches = auditFileForUnloadReturnValue(file);
                if (matches.length > 0) {
                    unloadViolations.push({
                        file: path.relative(rootDir, file),
                        matches
                    });
                }
            }

            expect(
                unloadViolations,
                `Atribuição a e.returnValue detectada, o que gera diálogo nativo do sistema:\n${unloadViolations
                    .map(u => `  - ${u.file}: ${u.matches.join(', ')}`)
                    .join('\n')}`
            ).toHaveLength(0);
        });

        it('deve garantir que InputManager não ativa preventUnload nem dispara diálogo nativo do navegador', () => {
            const inputManagerPath = path.resolve(adaptersDir, 'web/components/keyboardModule/InputManager.ts');
            const content = fs.readFileSync(inputManagerPath, 'utf-8');

            // Verifica que preventUnload não está ativo como true por padrão
            expect(content).toContain('preventUnload: boolean = false;');
            expect(content).not.toMatch(/preventUnload:\s*boolean\s*=\s*true/);

            // Verifica que handleBeforeUnload não atribui e.returnValue
            expect(content).not.toMatch(/e\.returnValue\s*=/);
            expect(content).not.toMatch(/event\.returnValue\s*=/);
        });

        it('deve garantir que WindowHudGui intercepta solicitações de fechamento do Tauri (onCloseRequested) e fecha com exit_game ou destroy()', () => {
            const windowHudPath = path.resolve(adaptersDir, 'web/GUIS/windowHudModule/WindowHudGui.ts');
            const content = fs.readFileSync(windowHudPath, 'utf-8');

            // Intercepta solicitações de fechamento disparadas pelo sistema operacional / Tauri
            expect(content).toContain('win.onCloseRequested');
            expect(content).toContain('event.preventDefault()');
            expect(content).toContain('ConfirmationModal.confirm');
            expect(content).toContain("await invoke('exit_game')");
            expect(content).toContain('await win.destroy()');
            // Não deve chamar getCurrentWindow().close() diretamente sem confirmação
            expect(content).not.toMatch(/closeBtn\.addEventListener\([^)]*\)\s*=>\s*\{\s*getCurrentWindow\(\)\.close\(\)/);
        });

        it('deve garantir que core:window:allow-destroy está concedido nas capabilities do Tauri para prevenir crash de permissão', () => {
            const capabilitiesPath = path.resolve(rootDir, 'src-tauri/capabilities/default.json');
            const capabilities = JSON.parse(fs.readFileSync(capabilitiesPath, 'utf-8'));
            expect(capabilities.permissions).toContain('core:window:allow-destroy');
            expect(capabilities.permissions).toContain('core:window:allow-close');
        });

        it('deve interceptar onCloseRequested dinamicamente ao instanciar WindowHudGui em ambiente Tauri', async () => {
            // Prepara mock da API do Tauri
            let registeredCloseHandler: ((event: any) => Promise<void>) | null = null;
            const mockDestroy = vi.fn().mockResolvedValue(undefined);
            const mockWindow = {
                isFullscreen: vi.fn().mockResolvedValue(false),
                setFullscreen: vi.fn().mockResolvedValue(undefined),
                minimize: vi.fn().mockResolvedValue(undefined),
                toggleMaximize: vi.fn().mockResolvedValue(undefined),
                destroy: mockDestroy,
                onCloseRequested: vi.fn((handler: any) => {
                    registeredCloseHandler = handler;
                })
            };

            // Simula ambiente Tauri
            (window as any).__TAURI_INTERNALS__ = {};
            activeMockWindow = mockWindow;

            const { ConfirmationModal } = await import('../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui');
            const confirmSpy = vi.spyOn(ConfirmationModal, 'confirm').mockResolvedValue(true);
            const { invoke } = await import('@tauri-apps/api/core');

            const { default: WindowHudGui } = await import('../../adapters/web/GUIS/windowHudModule/WindowHudGui');
            new WindowHudGui();

            // Verifica que o interceptor de fechamento da window do Tauri foi registrado
            expect(mockWindow.onCloseRequested).toHaveBeenCalled();
            expect(registeredCloseHandler).toBeDefined();

            // Simula o disparo de onCloseRequested pelo sistema operacional
            const mockEvent = { preventDefault: vi.fn() };
            if (registeredCloseHandler) {
                await (registeredCloseHandler as any)(mockEvent);
            }

            // Garante que o evento do SO foi cancelado para evitar modal nativo
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            // Garante que o ConfirmationModal personalizado foi invocado
            expect(confirmSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Sair do Jogo',
                    variant: 'danger'
                })
            );
            // Garante que invoke('exit_game') foi chamado para encerramento limpo
            expect(invoke).toHaveBeenCalledWith('exit_game');

            confirmSpy.mockRestore();
            activeMockWindow = null;
            delete (window as any).__TAURI_INTERNALS__;
        });

        it('deve acionar win.destroy() como fallback caso invoke("exit_game") falhe', async () => {
            let registeredCloseHandler: ((event: any) => Promise<void>) | null = null;
            const mockDestroy = vi.fn().mockResolvedValue(undefined);
            const mockWindow = {
                isFullscreen: vi.fn().mockResolvedValue(false),
                setFullscreen: vi.fn().mockResolvedValue(undefined),
                minimize: vi.fn().mockResolvedValue(undefined),
                toggleMaximize: vi.fn().mockResolvedValue(undefined),
                destroy: mockDestroy,
                onCloseRequested: vi.fn((handler: any) => {
                    registeredCloseHandler = handler;
                })
            };

            (window as any).__TAURI_INTERNALS__ = {};
            activeMockWindow = mockWindow;

            const { ConfirmationModal } = await import('../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui');
            const confirmSpy = vi.spyOn(ConfirmationModal, 'confirm').mockResolvedValue(true);
            const { invoke } = await import('@tauri-apps/api/core');
            vi.mocked(invoke).mockRejectedValueOnce(new Error('IPC unavailable'));

            const { default: WindowHudGui } = await import('../../adapters/web/GUIS/windowHudModule/WindowHudGui');
            new WindowHudGui();

            expect(mockWindow.onCloseRequested).toHaveBeenCalled();
            expect(registeredCloseHandler).toBeDefined();

            const mockEvent = { preventDefault: vi.fn() };
            if (registeredCloseHandler) {
                await (registeredCloseHandler as any)(mockEvent);
            }

            expect(mockDestroy).toHaveBeenCalled();

            confirmSpy.mockRestore();
            activeMockWindow = null;
            delete (window as any).__TAURI_INTERNALS__;
        });
    });
});
