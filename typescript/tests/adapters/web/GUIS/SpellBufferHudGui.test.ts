// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SpellBufferHudGui, { RUNE_DICTIONARY } from '../../../../adapters/web/GUIS/spellBufferHudModule/SpellBufferHudGui';

describe('SpellBufferHudGui', () => {
    let hud: SpellBufferHudGui;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
        hud = new SpellBufferHudGui();
    });

    afterEach(() => {
        if (hud) hud.destroy();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('deve injetar o elemento raiz no DOM e começar inativo', () => {
        const container = document.getElementById('spell-buffer-container');
        expect(container).not.toBeNull();
        expect(container?.classList.contains('is-active')).toBe(false);
    });

    it('deve adicionar runas dinamicamente e atualizar o contador', () => {
        hud.pushRune('spell_1'); // Self
        hud.pushRune('spell_4'); // Fogo

        const countEl = document.getElementById('spell-buffer-count');
        expect(countEl?.textContent).toBe('2/9');

        const runeBadges = document.querySelectorAll('.rune-glyph');
        expect(runeBadges.length).toBe(2);
        expect(runeBadges[0]!.textContent).toBe('[Self]');
        expect(runeBadges[1]!.textContent).toBe('[Fogo]');

        const container = document.getElementById('spell-buffer-container');
        expect(container?.classList.contains('is-active')).toBe(true);
    });

    it('deve disparar auto-cast com flash-success após 500ms de inatividade', () => {
        hud.pushRune('spell_0'); // Projétil
        hud.pushRune('spell_4'); // Fogo

        const container = document.getElementById('spell-buffer-container');
        expect(container?.classList.contains('is-active')).toBe(true);

        // Avança 500ms para disparar o auto-cast
        vi.advanceTimersByTime(500);

        expect(container?.classList.contains('flash-success')).toBe(true);
        expect(container?.classList.contains('is-active')).toBe(false);

        // Avança mais 400ms para concluir a animação de dissolve
        vi.advanceTimersByTime(400);

        expect(container?.classList.contains('flash-success')).toBe(false);
        expect(hud.activeRunes.length).toBe(0);
    });

    it('deve disparar triggerShatter (flash-shatter) ao tentar inserir mais de 9 runas', () => {
        for (let i = 0; i < 9; i++) {
            hud.pushRune(`spell_${i}`);
        }
        expect(hud.activeRunes.length).toBe(9);

        const container = document.getElementById('spell-buffer-container');
        // A 10ª runa deve quebrar o buffer
        hud.pushRune('spell_9');

        expect(container?.classList.contains('flash-shatter')).toBe(true);

        vi.advanceTimersByTime(450);
        expect(container?.classList.contains('flash-shatter')).toBe(false);
        expect(hud.activeRunes.length).toBe(0);
    });

    it('deve permitir limpar o buffer diretamente com clear()', () => {
        hud.pushRune('spell_1');
        hud.pushRune('spell_2');
        expect(hud.activeRunes.length).toBe(2);

        hud.clear();
        expect(hud.activeRunes.length).toBe(0);

        const countEl = document.getElementById('spell-buffer-count');
        expect(countEl?.textContent).toBe('0/9');
        const runeBadges = document.querySelectorAll('.rune-glyph');
        expect(runeBadges.length).toBe(0);
    });

    it('deve conter definições semânticas rúnicas para todos os comandos de magia conhecidos', () => {
        expect(RUNE_DICTIONARY['spell_0']!.label).toBe('Projétil');
        expect(RUNE_DICTIONARY['spell_1']!.label).toBe('Self');
        expect(RUNE_DICTIONARY['spell_4']!.label).toBe('Fogo');
        expect(RUNE_DICTIONARY['spell_5']!.label).toBe('Água');
        expect(RUNE_DICTIONARY['spell_8']!.label).toBe('Luz');
        expect(RUNE_DICTIONARY['spell_9']!.label).toBe('Arcano');
    });

    it('deve lidar com setRunes vazias, com itens e com overflow', () => {
        hud.setRunes(['spell_0', 'spell_1']);
        expect(hud.activeRunes.length).toBe(2);
        const container = document.getElementById('spell-buffer-container');
        expect(container?.classList.contains('is-active')).toBe(true);

        hud.setRunes([]);
        expect(hud.activeRunes.length).toBe(0);
        expect(container?.classList.contains('is-active')).toBe(false);

        hud.setRunes(['spell_0', 'spell_1', 'spell_2', 'spell_3', 'spell_4', 'spell_5', 'spell_6', 'spell_7', 'spell_8', 'spell_9']);
        expect(container?.classList.contains('flash-shatter')).toBe(true);
    });

    it('deve cancelar flashTimeout ativo se pushRune for chamado durante animação', () => {
        hud.pushRune('spell_0');
        vi.advanceTimersByTime(500); // ativa triggerSuccess com flashTimeout ativo
        const container = document.getElementById('spell-buffer-container');
        expect(container?.classList.contains('flash-success')).toBe(true);

        hud.pushRune('spell_1');
        expect(container?.classList.contains('flash-success')).toBe(false);
    });

    it('não deve disparar sucesso se não houver runas ao chamar triggerSuccess', () => {
        const container = document.getElementById('spell-buffer-container');
        hud.triggerSuccess();
        expect(container?.classList.contains('flash-success')).toBe(false);
    });

    it('deve suportar runas desconhecidas caindo no fallback semântico', () => {
        hud.pushRune('spell_custom');
        const badge = document.querySelector('.rune-glyph');
        expect(badge?.textContent).toBe('[custom]');
        expect(badge?.classList.contains('rune-magic')).toBe(true);
    });
});

