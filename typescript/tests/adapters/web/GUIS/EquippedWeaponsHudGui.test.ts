// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import EquippedWeaponsHudGui from '../../../../adapters/web/GUIS/equippedWeaponsHudModule/EquippedWeaponsHudGui';
import type { EntityRenderableState } from '../../../../domain/ports/domain-contracts';

describe('EquippedWeaponsHudGui', () => {
    let hud: EquippedWeaponsHudGui;
    let onSwapSpy: Mock<() => void>;

    beforeEach(() => {
        document.body.innerHTML = '';
        onSwapSpy = vi.fn<() => void>();
        hud = new EquippedWeaponsHudGui(onSwapSpy);
    });

    afterEach(() => {
        if (hud) hud.destroy();
    });


    it('deve injetar a estrutura do HUD no DOM', () => {
        const container = document.getElementById('equipped-weapons-hud-container');
        expect(container).not.toBeNull();
        expect(document.getElementById('ew-primary-slot')).not.toBeNull();
        expect(document.getElementById('ew-secondary-slot')).not.toBeNull();
        expect(document.getElementById('ew-btn-swap')).not.toBeNull();
    });

    it('deve disparar onSwapWeaponsCallback ao clicar no divisor de troca ou slot secundário', () => {
        const btnSwap = document.getElementById('ew-btn-swap') as HTMLElement;
        const secondarySlot = document.getElementById('ew-secondary-slot') as HTMLElement;

        btnSwap.click();
        expect(onSwapSpy).toHaveBeenCalledTimes(1);

        secondarySlot.click();
        expect(onSwapSpy).toHaveBeenCalledTimes(2);
    });


    it('deve ignorar cliques se nenhum callback foi registrado', () => {
        hud.destroy();
        const standaloneHud = new EquippedWeaponsHudGui();
        const btnSwap = document.getElementById('ew-btn-swap') as HTMLElement;
        expect(() => btnSwap.click()).not.toThrow();
        standaloneHud.destroy();
    });


    it('deve ignorar update se dados forem undefined ou não possuírem equipment', () => {
        const primaryName = document.getElementById('ew-primary-name') as HTMLElement;
        expect(primaryName.textContent).toBe('Principal');

        hud.update(undefined);
        expect(primaryName.textContent).toBe('Principal');

        hud.update({} as any);
        expect(primaryName.textContent).toBe('Principal');
    });

    it('deve exibir desarmado e vazio quando slots estiverem nulos', () => {
        const data: EntityRenderableState = {
            id: 1,
            coordinates: { x: 0, y: 0 },
            size: { width: 32, height: 32 },
            rotation: 0,
            entityTypeId: 'player',
            equipment: {
                mainHand: null as any,
                secondHand: null as any
            }
        };

        hud.update(data);

        const primaryName = document.getElementById('ew-primary-name') as HTMLElement;
        const primaryIcon = document.getElementById('ew-primary-icon') as HTMLImageElement;
        const primaryEmpty = document.getElementById('ew-primary-empty') as HTMLElement;

        const secondaryName = document.getElementById('ew-secondary-name') as HTMLElement;
        const secondaryIcon = document.getElementById('ew-secondary-icon') as HTMLImageElement;
        const secondaryEmpty = document.getElementById('ew-secondary-empty') as HTMLElement;

        expect(primaryName.textContent).toBe('Desarmado');
        expect(primaryIcon.style.display).toBe('none');
        expect(primaryEmpty.style.display).toBe('flex');

        expect(secondaryName.textContent).toBe('Vazio');
        expect(secondaryIcon.style.display).toBe('none');
        expect(secondaryEmpty.style.display).toBe('flex');
    });

    it('deve manter os ícones/nomes fixos nos slots físicos e alternar o estilo do slot selecionado na troca', () => {
        const data1: EntityRenderableState = {
            id: 1,
            coordinates: { x: 0, y: 0 },
            size: { width: 32, height: 32 },
            rotation: 0,
            entityTypeId: 'player',
            equipment: {
                mainHand: {
                    itemId: 101,
                    iconId: 101,
                    name: 'Espada de Ferro'
                } as any,
                secondHand: {
                    itemId: 202,
                    iconId: 202,
                    name: 'Cajado Arcano'
                } as any
            }
        };

        hud.update(data1);

        const primarySlot = document.getElementById('ew-primary-slot') as HTMLElement;
        const secondarySlot = document.getElementById('ew-secondary-slot') as HTMLElement;
        const primaryName = document.getElementById('ew-primary-name') as HTMLElement;
        const secondaryName = document.getElementById('ew-secondary-name') as HTMLElement;

        expect(primaryName.textContent).toBe('Espada de Ferro');
        expect(secondaryName.textContent).toBe('Cajado Arcano');
        expect(hud.getSelectedSlotIndex()).toBe(0);
        expect(primarySlot.classList.contains('ew-slot-primary')).toBe(true);
        expect(primarySlot.classList.contains('is-selected')).toBe(true);
        expect(primarySlot.getAttribute('data-selected')).toBe('true');
        expect(secondarySlot.classList.contains('ew-slot-secondary')).toBe(true);
        expect(secondarySlot.getAttribute('data-selected')).toBe('false');

        const container = document.getElementById('equipped-weapons-hud-container') as HTMLElement;

        // Troca de armas: as imagens/nomes permanecem fixos em seus slots físicos,
        // mas a posição do selecionado (estilo primário/iluminado) muda para o slot 1
        const data2: EntityRenderableState = {
            id: 1,
            coordinates: { x: 0, y: 0 },
            size: { width: 32, height: 32 },
            rotation: 0,
            entityTypeId: 'player',
            equipment: {
                mainHand: {
                    itemId: 202,
                    iconId: 202,
                    name: 'Cajado Arcano'
                } as any,
                secondHand: {
                    itemId: 101,
                    iconId: 101,
                    name: 'Espada de Ferro'
                } as any
            }
        };

        hud.update(data2);
        expect(primaryName.textContent).toBe('Espada de Ferro');
        expect(secondaryName.textContent).toBe('Cajado Arcano');
        expect(hud.getSelectedSlotIndex()).toBe(1);
        expect(primarySlot.classList.contains('ew-slot-secondary')).toBe(true);
        expect(primarySlot.classList.contains('is-selected')).toBe(false);
        expect(primarySlot.getAttribute('data-selected')).toBe('false');
        expect(secondarySlot.classList.contains('ew-slot-primary')).toBe(true);
        expect(secondarySlot.classList.contains('is-selected')).toBe(true);
        expect(secondarySlot.getAttribute('data-selected')).toBe('true');
        expect(container.classList.contains('ew-swap-anim')).toBe(true);

        // Quando o slot 1 está selecionado, clicar no slot 0 (inativo) deve disparar o callback de troca
        primarySlot.click();
        expect(onSwapSpy).toHaveBeenCalledTimes(1);

        // Clicar no próprio slot já selecionado (slot 1) não deve disparar troca redundante
        secondarySlot.click();
        expect(onSwapSpy).toHaveBeenCalledTimes(1);

        // Segunda troca: retorna o estilo selecionado para o slot 0 mantendo os itens fixos
        hud.update(data1);
        expect(primaryName.textContent).toBe('Espada de Ferro');
        expect(secondaryName.textContent).toBe('Cajado Arcano');
        expect(hud.getSelectedSlotIndex()).toBe(0);
        expect(primarySlot.classList.contains('ew-slot-primary')).toBe(true);
        expect(secondarySlot.classList.contains('ew-slot-secondary')).toBe(true);
    });

    it('deve carregar e exibir imagem de uiIconUrl quando o item possuir configuração visual', () => {
        const data: EntityRenderableState = {
            id: 1,
            coordinates: { x: 0, y: 0 },
            size: { width: 32, height: 32 },
            rotation: 0,
            entityTypeId: 'player',
            equipment: {
                mainHand: {
                    itemId: 1, // staff
                    iconId: 1,
                    name: 'Staff'
                } as any,
                secondHand: {
                    itemId: 2, // gun
                    iconId: 2,
                    name: 'Gun'
                } as any
            }
        };

        hud.update(data);

        const primaryIcon = document.getElementById('ew-primary-icon') as HTMLImageElement;
        const primaryEmpty = document.getElementById('ew-primary-empty') as HTMLElement;
        const secondaryIcon = document.getElementById('ew-secondary-icon') as HTMLImageElement;
        const secondaryEmpty = document.getElementById('ew-secondary-empty') as HTMLElement;

        expect(primaryIcon.style.display).toBe('block');
        expect(primaryIcon.src).toContain('staff-design-1.png');
        expect(primaryEmpty.style.display).toBe('none');

        expect(secondaryIcon.style.display).toBe('block');
        expect(secondaryIcon.src).toContain('gun-design-1.png');
        expect(secondaryEmpty.style.display).toBe('none');
    });

    it('deve utilizar itemId como fallback se iconId não for fornecido', () => {
        const data: EntityRenderableState = {
            id: 1,
            coordinates: { x: 0, y: 0 },
            size: { width: 32, height: 32 },
            rotation: 0,
            entityTypeId: 'player',
            equipment: {
                mainHand: {
                    itemId: 999,
                    name: 'Machado Ancestral'
                } as any
            }
        };

        hud.update(data);
        const primaryName = document.getElementById('ew-primary-name') as HTMLElement;
        expect(primaryName.textContent).toBe('Machado Ancestral');
    });

    it('deve renderizar a anatomia visual Dark Souls com cards retos, pedestais ovais marrons e filetes iluminados', () => {
        const container = document.getElementById('equipped-weapons-hud-container') as HTMLElement;
        const cards = container.querySelectorAll('.ew-card');
        const pedestals = container.querySelectorAll('.ew-pedestal');
        const topFillet = container.querySelector('.ew-slot-primary .ew-fillet-top');
        const bottomFillet = container.querySelector('.ew-slot-primary .ew-fillet-bottom');

        expect(cards.length).toBe(2);
        expect(pedestals.length).toBe(2);
        expect(topFillet).not.toBeNull();
        expect(bottomFillet).not.toBeNull();
    });
});


