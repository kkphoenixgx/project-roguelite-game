// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import XpBarGui from '../../../../adapters/web/GUIS/xpBarHudModule/XpBarGui';

describe('XpBarGui', () => {
    let xpBar: XpBarGui;

    beforeEach(() => {
        document.body.innerHTML = '';
        xpBar = new XpBarGui();
    });

    it('deve injetar elementos do HUD de XP no DOM', () => {
        const fillEl = document.getElementById('xp-bar-fill');
        const levelEl = document.getElementById('player-level');
        expect(fillEl).not.toBeNull();
        expect(levelEl).not.toBeNull();
    });

    it('deve atualizar a largura da barra e o nível quando dados válidos forem fornecidos', () => {
        const fillEl = document.getElementById('xp-bar-fill') as HTMLElement;
        const levelEl = document.getElementById('player-level') as HTMLElement;

        xpBar.update({ level: 5, currentXp: 50, xpToNextLevel: 100 });

        expect(fillEl.style.width).toBe('50%');
        expect(levelEl.textContent).toBe('5');
    });

    it('deve calcular porcentagem zero se xpToNextLevel for zero ou menor', () => {
        const fillEl = document.getElementById('xp-bar-fill') as HTMLElement;

        xpBar.update({ level: 1, currentXp: 0, xpToNextLevel: 0 });

        expect(fillEl.style.width).toBe('0%');
    });

    it('não deve atualizar DOM se os valores de level e percentage forem idênticos ao frame anterior (otimização)', () => {
        const fillEl = document.getElementById('xp-bar-fill') as HTMLElement;
        const levelEl = document.getElementById('player-level') as HTMLElement;

        xpBar.update({ level: 2, currentXp: 25, xpToNextLevel: 100 });
        expect(fillEl.style.width).toBe('25%');
        expect(levelEl.textContent).toBe('2');

        // Alteramos a propriedade diretamente no DOM para checar se o update reescreve ou ignora
        fillEl.style.width = '999%';
        levelEl.textContent = '999';

        xpBar.update({ level: 2, currentXp: 25, xpToNextLevel: 100 });
        // Por serem os mesmos valores, a otimização não deve reescrever
        expect(fillEl.style.width).toBe('999%');
        expect(levelEl.textContent).toBe('999');
    });

    it('deve ignorar chamadas com dados incompletos ou undefined', () => {
        const fillEl = document.getElementById('xp-bar-fill') as HTMLElement;
        const levelEl = document.getElementById('player-level') as HTMLElement;

        xpBar.update({ currentXp: 50, xpToNextLevel: 100 });
        xpBar.update({ level: 3, xpToNextLevel: 100 });
        xpBar.update({ level: 3, currentXp: 50 });
        xpBar.update({} as any);

        expect(fillEl.style.width).toBe('');
        expect(levelEl.textContent).toBe('0');
    });
});


