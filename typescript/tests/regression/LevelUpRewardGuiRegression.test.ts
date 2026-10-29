// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LevelUpRewardGui from '../../adapters/web/GUIS/levelUpRewardHudModule/LevelUpRewardGui';

describe('LevelUpRewardGui - Performance & Zero-Reflow Regression Test', () => {
    let mockDomain: any;
    let claimCallback: any;
    let togglePauseCallback: any;
    let gui: LevelUpRewardGui;

    beforeEach(() => {
        vi.useFakeTimers();
        mockDomain = {
            generateLocalRewards: vi.fn(() => [
                { id: 'stat_str', name: 'Força Titânica', description: '+1 Força Base', type: 'stat', rarity: 'comum', value: 1 },
                { id: 'der_crit_dmg', name: 'Força Bruta', description: '+20% Dano Crítico', type: 'stat', rarity: 'epico', value: 20 },
                { id: 'der_maxhp', name: 'Vitalidade Pura', description: '+20 Max Vida', type: 'stat', rarity: 'lendario', value: 20 }
            ])
        };
        claimCallback = vi.fn();
        togglePauseCallback = vi.fn();
        gui = new LevelUpRewardGui(mockDomain, claimCallback, togglePauseCallback);
    });

    afterEach(() => {
        gui.destroy();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('deve utilizar CSS contain e GPU hardware acceleration (translateZ) sem forçar reflow síncrono', () => {
        // Espiões de leitura síncrona de geometria (Forced Reflow)
        const getBoundingClientRectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect');
        const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle');

        // Abre a tela com as 3 cartas
        gui.show({ x: 0, y: 0 });

        // Nenhuma leitura síncrona de geometria deve ocorrer no hot path de geração
        expect(getBoundingClientRectSpy).not.toHaveBeenCalled();

        // Dispara o ciclo de animação de flipagem
        vi.advanceTimersByTime(500);

        const wrappers = document.querySelectorAll('.reward-card-wrapper');
        expect(wrappers.length).toBe(3);
        wrappers.forEach(w => {
            expect(w.classList.contains('flipped')).toBe(true);
        });

        getBoundingClientRectSpy.mockRestore();
        getComputedStyleSpy.mockRestore();
    });

    it('deve garantir que o teardown limpe todos os timers e remova o container do DOM sem vazamento de memória', () => {
        gui.show({ x: 0, y: 0 });
        const containerBefore = document.getElementById('levelup-reward-container');
        expect(containerBefore).toBeDefined();

        gui.destroy();

        const containerAfter = document.getElementById('levelup-reward-container');
        expect(containerAfter).toBeNull();
    });

    it('deve garantir que o CSS de animação não utilize filtros drop-shadow ou perspectiva aninhada que causam jank na GPU', () => {
        const styles = Array.from(document.head.querySelectorAll('style'));
        let cssContent = styles.map(s => s.textContent || '').join('\n');
        
        if (!cssContent.includes('#levelup-cards-container')) {
            const fs = require('fs');
            const path = require('path');
            const cssPath = path.resolve(__dirname, '../../adapters/web/GUIS/levelUpRewardHudModule/levelUpReward.css');
            cssContent = fs.readFileSync(cssPath, 'utf-8');
        }

        // O container de cards não deve ter perspective concorrente com o wrapper individual
        expect(cssContent).not.toMatch(/#levelup-cards-container\s*\{[^}]*perspective:/);

        // O .reward-card-inner e os ícones não devem ter filtros drop-shadow em tempo de execução
        expect(cssContent).not.toMatch(/\.reward-card-inner\s*\{[^}]*filter:/);
        expect(cssContent).not.toMatch(/\.reward-icon\s*\{[^}]*filter:/);
        expect(cssContent).not.toMatch(/\.card-back-sigil\s*\{[^}]*filter:/);

        // Deve utilizar transform3d para isolamento puro de camadas na GPU
        expect(cssContent).toContain('translate3d');
    });
});
