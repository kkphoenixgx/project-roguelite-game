// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import Canvas from '../../adapters/web/components/renderModule/engine/Canvas';
import LevelUpRewardGui from '../../adapters/web/GUIS/levelUpRewardHudModule/LevelUpRewardGui';
import type { IGameDomain } from '../../domain/ports/domain-contracts';

/**
 * TESTE DE REGRESSÃO: ACELERAÇÃO POR GPU E FRAME BUDGET (60 FPS)
 * 
 * Blindagem estrita contra a regressão de 20 FPS causada por:
 * 1. Desativação indevida de DMABUF / renderizador por hardware no WebKitGTK (Linux).
 * 2. Flags destrutivas de depuração síncrona de driver (MESA_DEBUG, LIBGL_DEBUG).
 * 3. Criação de canvas sem flags de otimização de preenchimento (alpha: false).
 * 4. Reflows e animações de flip de cartas na tela de Reward.
 */
describe('Regressão de Performance: Aceleração Gráfica por GPU e 60 FPS', () => {
    const rootDir = path.resolve(__dirname, '../../..');

    describe('1. Blindagem de Configuração de GPU e Variáveis de Ambiente (Tauri/Linux)', () => {
        it('log_config.json não deve desabilitar DMABUF nem ativar flags de depuração síncrona', () => {
            const configPath = path.join(rootDir, 'log_config.json');
            expect(fs.existsSync(configPath)).toBe(true);

            const content = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(content);

            // Se disable_webkit_dmabuf_renderer for true, a tela cai para 20 FPS no Linux por forçar software rendering
            expect(parsed.disable_webkit_dmabuf_renderer).toBe(false);

            // Se enable_native_system_debug for true, MESA_DEBUG força sincronização de pipeline a cada draw call
            expect(parsed.enable_native_system_debug).toBe(false);
        });

        it('src-tauri/src/log_config.rs e platform_env.rs devem encapsular políticas de plataforma/arquitetura com defaults seguros (false)', () => {
            const rsPath = path.join(rootDir, 'src-tauri/src/log_config.rs');
            const platformEnvPath = path.join(rootDir, 'src-tauri/src/platform_env.rs');
            expect(fs.existsSync(rsPath)).toBe(true);
            expect(fs.existsSync(platformEnvPath)).toBe(true);

            const rsContent = fs.readFileSync(rsPath, 'utf-8');
            const platformEnvContent = fs.readFileSync(platformEnvPath, 'utf-8');

            // Verifica anotações serde default
            expect(rsContent).toContain('pub enable_native_system_debug: bool');
            expect(rsContent).toContain('pub disable_webkit_dmabuf_renderer: bool');

            // Verifica que o Default trait define false para ambos
            expect(rsContent).toMatch(/enable_native_system_debug:\s*false/);
            expect(rsContent).toMatch(/disable_webkit_dmabuf_renderer:\s*false/);

            // Verifica delegação ao PlatformGraphicsProfile
            expect(rsContent).toContain('PlatformGraphicsProfile::detect()');

            // Verifica que o módulo multiplataforma isola Linux, Windows e macOS e aplica roteamento de GPU adequado
            expect(platformEnvContent).toContain('#[cfg(target_os = "linux")]');
            expect(platformEnvContent).toContain('#[cfg(target_os = "windows")]');
            expect(platformEnvContent).toContain('#[cfg(target_os = "macos")]');
            expect(platformEnvContent).toContain('WEBKIT_FORCE_COMPOSITING_MODE');
            expect(platformEnvContent).toContain('remove_var("WEBKIT_DISABLE_DMABUF_RENDERER")');
            expect(platformEnvContent).toContain('__NV_DISABLE_EXPLICIT_SYNC');
            expect(platformEnvContent).toContain('display_connected_to_nvidia');
            expect(platformEnvContent).toContain('detect_linux_gpu_topology');
        });
    });

    describe('2. Otimização do Contexto de Renderização do Canvas', () => {
        it('Canvas.ts deve inicializar contexto 2d com alpha: false e SEM desynchronized: true (evita Error 71 Protocol error no Wayland/WebKitGTK)', () => {
            const canvasPath = path.join(rootDir, 'typescript/adapters/web/components/renderModule/engine/Canvas.ts');
            const canvasSource = fs.readFileSync(canvasPath, 'utf-8');

            // Deve solicitar { alpha: false } para dispensar alpha blending no compositor
            expect(canvasSource).toContain('alpha: false');
            // Não deve usar desynchronized: true pois causa crash de protocolo Wayland (Gdk Error 71) no WebKitGTK Linux
            expect(canvasSource).not.toContain('desynchronized: true');
        });

        it('deve instanciar Canvas corretamente no DOM e manter estilos responsivos full-screen', () => {
            const container = document.createElement('div');
            document.body.appendChild(container);

            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
                fillStyle: '',
                fillRect: vi.fn()
            });

            const canvas = new Canvas(container, 1024, 768);
            expect(canvas.element).toBeDefined();
            expect(canvas.element.style.position).toBe('absolute');
            expect(canvas.element.style.width).toBe('100vw');
            expect(canvas.element.style.height).toBe('100vh');

            HTMLCanvasElement.prototype.getContext = originalGetContext;
            container.remove();
        });

        it('GameAdapter deve instanciar RenderThrottlePolicy com enableIdleFreeze: false para sustentar 60 FPS sem throttling de compositor', () => {
            const adapterPath = path.join(rootDir, 'typescript/adapters/web/components/GameAdapter.ts');
            const adapterSource = fs.readFileSync(adapterPath, 'utf-8');

            // Deve instanciar RenderThrottlePolicy com (60, false) ou false no enableIdleFreeze
            expect(adapterSource).toMatch(/new\s+RenderThrottlePolicy\s*\(\s*60\s*,\s*false\s*\)/);
        });
    });

    describe('3. LevelUpRewardGui - Conformidade com Animação Flip 60 FPS', () => {
        let mockDomain: Partial<IGameDomain>;
        let claimSpy: any;
        let pauseSpy: any;
        let rewardGui: LevelUpRewardGui;

        beforeEach(() => {
            claimSpy = vi.fn();
            pauseSpy = vi.fn();
            mockDomain = {
                generateLocalRewards: vi.fn().mockReturnValue([
                    { id: 'stat_str', name: 'Força Titânica', description: 'Aumenta dano', rarity: 'raro', value: 5, iconSvg: '<svg></svg>' },
                    { id: 'stat_dex', name: 'Agilidade Felina', description: 'Aumenta velocidade', rarity: 'epico', value: 10, iconSvg: '<svg></svg>' },
                    { id: 'stat_int', name: 'Mente Brilhante', description: 'Aumenta intelecto', rarity: 'comum', value: 2, iconSvg: '<svg></svg>' }
                ])
            };

            rewardGui = new LevelUpRewardGui(mockDomain as IGameDomain, claimSpy, pauseSpy);
        });

        afterEach(() => {
            rewardGui.hide();
            document.getElementById('levelup-reward-container')?.remove();
        });

        it('deve exibir as cartas com classes para aceleração de flip 3D onInit sem travar', () => {
            rewardGui.show({ x: 100, y: 100 });
            expect(rewardGui.isOpen).toBe(true);

            const wrappers = document.querySelectorAll('.reward-card-wrapper');
            expect(wrappers.length).toBe(3);

            // Cada wrapper deve conter a estrutura de flip 3D (costas e frente)
            wrappers.forEach(wrapper => {
                const inner = wrapper.querySelector('.reward-card-inner');
                expect(inner).not.toBeNull();
                const backFace = wrapper.querySelector('.reward-card-back');
                expect(backFace).not.toBeNull();
                const frontFace = wrapper.querySelector('.reward-card-front');
                expect(frontFace).not.toBeNull();
            });
        });

        it('deve processar o clique de seleção do card e ocultar o modal', () => {
            rewardGui.show({ x: 50, y: 50 });
            const firstCard = document.querySelector('.reward-card-wrapper') as HTMLElement;
            expect(firstCard).not.toBeNull();

            firstCard.click();
            expect(claimSpy).toHaveBeenCalledWith('stat_str', { x: 50, y: 50 }, 5);
            expect(rewardGui.isOpen).toBe(false);
        });
    });
});
