// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import GameOverGui from '../../../../adapters/web/GUIS/gameoverHudModule/GameOverGui';
import type { IGameDomain } from '../../../../domain/ports/domain-contracts';

describe('GameOverGui', () => {
    let gameOverGui: GameOverGui;
    let restartSpy: Mock<() => void>;
    let mockDomain: Partial<IGameDomain>;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
        restartSpy = vi.fn<() => void>();
        mockDomain = {};
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('deve injetar elementos no DOM e iniciar oculto', () => {
        gameOverGui = new GameOverGui(restartSpy, mockDomain as IGameDomain);

        const container = document.getElementById('game-over-container');
        expect(container).not.toBeNull();
        expect(container?.style.display).toBe('none');
    });

    it('deve disparar restartCallback ao clicar no botão reiniciar', () => {
        gameOverGui = new GameOverGui(restartSpy, mockDomain as IGameDomain);

        const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
        expect(restartBtn).not.toBeNull();
        restartBtn.click();

        expect(restartSpy).toHaveBeenCalledTimes(1);
    });


    it('deve exibir tela e renderizar resumo da run com feitos', () => {
        mockDomain = {
            metaProgressionManager: {
                lastRunSummary: {
                    totalReward: 250,
                    breakdown: {
                        levelReward: 200,
                        feats: [
                            { name: 'Primeiro Chefe Derrotado', value: 50 },
                            { name: 'Explorador de Masmorras', value: 0 }
                        ]
                    }
                }
            }
        } as any;

        gameOverGui = new GameOverGui(restartSpy, mockDomain as IGameDomain);
        gameOverGui.show();

        const container = document.getElementById('game-over-container');
        expect(container?.style.display).toBe('flex');

        const lvlEl = document.getElementById('go-final-level');
        const lvlEssEl = document.getElementById('go-level-essence');
        const totalEl = document.getElementById('go-total-reward');
        const featsList = document.getElementById('go-feats-list');

        // levelReward = 200 => finalLevel = 200 / 50 = 4
        expect(lvlEl?.textContent).toBe('4');
        expect(lvlEssEl?.textContent).toBe('+200 XP');
        expect(totalEl?.textContent).toBe('+250 XP');

        const featItems = featsList?.querySelectorAll('.go-feat-item');
        expect(featItems?.length).toBe(2);
        expect(featItems?.[0]?.textContent).toContain('Primeiro Chefe Derrotado');
        expect(featItems?.[0]?.textContent).toContain('+50 XP');
    });

    it('deve renderizar mensagem de fallback se não houver feitos na run', () => {
        mockDomain = {
            metaProgressionManager: {
                lastRunSummary: {
                    totalReward: 50,
                    breakdown: {
                        levelReward: 50,
                        feats: []
                    }
                }
            }
        } as any;

        gameOverGui = new GameOverGui(restartSpy, mockDomain as IGameDomain);
        gameOverGui.show();

        const featsList = document.getElementById('go-feats-list');
        expect(featsList?.textContent).toContain('Nenhum feito notável.');
    });

    it('deve permitir fechar com hide()', () => {
        gameOverGui = new GameOverGui(restartSpy, mockDomain as IGameDomain);
        gameOverGui.show();
        const container = document.getElementById('game-over-container');
        expect(container?.style.display).toBe('flex');

        gameOverGui.hide();
        expect(container?.style.display).toBe('none');
    });

    it('deve habilitar reinício via teclado após timeout de 1.5s', () => {
        gameOverGui = new GameOverGui(restartSpy, mockDomain as IGameDomain);
        gameOverGui.show();

        // Antes de 1.5s, keydown não dispara reinício
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Space' }));
        expect(restartSpy).not.toHaveBeenCalled();

        // Avança 1500ms
        vi.advanceTimersByTime(1500);

        // Agora pressionar tecla aciona forceRestart (once: true)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Space' }));
        expect(restartSpy).toHaveBeenCalledTimes(1);

        // Segundo keydown não deve duplicar chamada
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Space' }));
        expect(restartSpy).toHaveBeenCalledTimes(1);
    });

    it('deve suportar domínio sem metaProgressionManager sem quebrar', () => {
        mockDomain = {};
        gameOverGui = new GameOverGui(restartSpy, mockDomain as IGameDomain);
        expect(() => gameOverGui.show()).not.toThrow();
        const container = document.getElementById('game-over-container');
        expect(container?.style.display).toBe('flex');
    });
});

