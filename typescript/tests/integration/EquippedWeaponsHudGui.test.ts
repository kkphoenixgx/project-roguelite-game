// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EquippedWeaponsHudGui from '../../adapters/web/GUIS/equippedWeaponsHudModule/EquippedWeaponsHudGui';

describe('EquippedWeaponsHudGui - Display Dark Souls de Armas Equipadas', () => {
    let onSwapMock: any;
    let gui: EquippedWeaponsHudGui;

    beforeEach(() => {
        onSwapMock = vi.fn();
        gui = new EquippedWeaponsHudGui(onSwapMock);
    });

    afterEach(() => {
        gui.destroy();
    });

    it('deve injetar o container e elementos no DOM', () => {
        const container = document.getElementById('equipped-weapons-hud-container');
        expect(container).not.toBeNull();
        expect(document.getElementById('ew-primary-slot')).not.toBeNull();
        expect(document.getElementById('ew-secondary-slot')).not.toBeNull();
        expect(document.getElementById('ew-btn-swap')).not.toBeNull();
    });

    it('deve atualizar o slot da arma principal e secundária quando presentes no renderable state', () => {
        gui.update({
            id: 1,
            entityTypeId: 'player',
            coordinates: { x: 0, y: 0 },
            size: { width: 32, height: 32 },
            rotation: 0,
            equipment: {
                mainHand: { name: 'Foice da Morte', iconId: 3, itemId: 3 },
                secondHand: { name: 'Cajado Rúnico', iconId: 1, itemId: 1 }
            }
        } as any);

        const primaryName = document.getElementById('ew-primary-name');
        const secondaryName = document.getElementById('ew-secondary-name');
        const primaryIcon = document.getElementById('ew-primary-icon') as HTMLImageElement;
        const secondaryIcon = document.getElementById('ew-secondary-icon') as HTMLImageElement;

        expect(primaryName?.textContent).toBe('Foice da Morte');
        expect(secondaryName?.textContent).toBe('Cajado Rúnico');
        expect(primaryIcon.style.display).toBe('block');
        expect(secondaryIcon.style.display).toBe('block');
    });

    it('deve exibir placeholder de desarmado quando não houver arma principal', () => {
        gui.update({
            id: 1,
            entityTypeId: 'player',
            coordinates: { x: 0, y: 0 },
            size: { width: 32, height: 32 },
            rotation: 0,
            equipment: {
                mainHand: null,
                secondHand: null
            }
        } as any);

        const primaryName = document.getElementById('ew-primary-name');
        const secondaryName = document.getElementById('ew-secondary-name');
        const primaryEmpty = document.getElementById('ew-primary-empty');
        const secondaryEmpty = document.getElementById('ew-secondary-empty');

        expect(primaryName?.textContent).toBe('Desarmado');
        expect(secondaryName?.textContent).toBe('Vazio');
        expect(primaryEmpty?.style.display).toBe('flex');
        expect(secondaryEmpty?.style.display).toBe('flex');
    });

    it('deve disparar a callback onSwapWeaponsCallback ao clicar no divisor de troca [TAB]', () => {
        const btnSwap = document.getElementById('ew-btn-swap');
        btnSwap?.click();

        expect(onSwapMock).toHaveBeenCalledOnce();
    });

    it('deve disparar a callback onSwapWeaponsCallback ao clicar no slot secundário', () => {
        const secSlot = document.getElementById('ew-secondary-slot');
        secSlot?.click();

        expect(onSwapMock).toHaveBeenCalledOnce();
    });
});
