// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LevelUpRewardGui from '../../../../adapters/web/GUIS/levelUpRewardHudModule/LevelUpRewardGui';

describe('LevelUpRewardGui - Unit & Tarot Card Flip Lifecycle', () => {
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

    it('deve inicializar com o container oculto e injetar estilo e modal', () => {
        expect(gui.isOpen).toBe(false);
        const container = document.getElementById('levelup-reward-container');
        expect(container).toBeDefined();
        expect(container?.style.display).toBe('');
    });

    it('deve abrir a tela, gerar cartas com estrutura 3D e pausar o jogo', () => {
        gui.show({ x: 100, y: 100 });

        expect(gui.isOpen).toBe(true);
        expect(togglePauseCallback).toHaveBeenCalledOnce();

        const container = document.getElementById('levelup-reward-container');
        expect(container?.style.display).toBe('flex');

        const wrappers = document.querySelectorAll('.reward-card-wrapper');
        expect(wrappers.length).toBe(3);

        // Verifica estrutura interna de cada carta (backface e front)
        const firstCard = wrappers[0] as HTMLElement;
        expect(firstCard.querySelector('.reward-card-inner')).toBeDefined();
        expect(firstCard.querySelector('.reward-card-back')).toBeDefined();
        expect(firstCard.querySelector('.reward-card-front')).toBeDefined();
        expect(firstCard.querySelector('.reward-icon')).toBeDefined();
        expect(firstCard.querySelector('.reward-desc')).toBeDefined();
        expect(firstCard.querySelector('.reward-name')?.textContent).toBe('Força Titânica');
    });

    it('deve disparar a animação de flipagem das cartas escalonada (staggered flip onInit)', () => {
        gui.show({ x: 0, y: 0 });

        const wrappers = document.querySelectorAll('.reward-card-wrapper');
        expect(wrappers[0]?.classList.contains('flipped')).toBe(false);
        expect(wrappers[1]?.classList.contains('flipped')).toBe(false);
        expect(wrappers[2]?.classList.contains('flipped')).toBe(false);

        // Avança frame de rAF e o delay do primeiro card (100ms)
        vi.advanceTimersByTime(120);
        expect(wrappers[0]?.classList.contains('flipped')).toBe(true);
        expect(wrappers[1]?.classList.contains('flipped')).toBe(false);

        // Avança até o segundo card (100 + 140 = 240ms)
        vi.advanceTimersByTime(150);
        expect(wrappers[1]?.classList.contains('flipped')).toBe(true);
        expect(wrappers[2]?.classList.contains('flipped')).toBe(false);

        // Avança até o terceiro card (100 + 280 = 380ms)
        vi.advanceTimersByTime(150);
        expect(wrappers[2]?.classList.contains('flipped')).toBe(true);

        // Avança o tempo de estabilização do flip (550ms adicionais)
        expect(wrappers[0]?.classList.contains('ready')).toBe(false);
        vi.advanceTimersByTime(550);
        expect(wrappers[0]?.classList.contains('ready')).toBe(true);
    });

    it('deve selecionar uma recompensa ao clicar na carta, invocar callback e fechar', () => {
        gui.show({ x: 50, y: 50 });

        const wrappers = document.querySelectorAll('.reward-card-wrapper');
        const secondCard = wrappers[1] as HTMLElement;
        secondCard.click();

        expect(claimCallback).toHaveBeenCalledWith('der_crit_dmg', { x: 50, y: 50 }, 20);
        expect(gui.isOpen).toBe(false);
        expect(togglePauseCallback).toHaveBeenCalledTimes(2); // Pause na abertura + despausa no fechamento
    });

    it('deve limpar os timers de animação ao fechar prematuramente ou destruir', () => {
        gui.show({ x: 0, y: 0 });
        gui.hide();
        expect(gui.isOpen).toBe(false);

        // Não deve estourar erro mesmo avançando o relógio
        expect(() => vi.runAllTimers()).not.toThrow();
    });

    it('deve utilizar ícones SVG vetoriais limpos sem filtros pesados de feDropShadow', () => {
        gui.show({ x: 0, y: 0 });
        const svgs = document.querySelectorAll('.reward-icon svg');
        expect(svgs.length).toBe(3);
        svgs.forEach(svg => {
            expect(svg.innerHTML).not.toContain('<feDropShadow');
            expect(svg.innerHTML).not.toContain('filter="url(');
        });
    });
});
