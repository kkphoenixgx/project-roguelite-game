// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import LoadoutTabController from '../../../../adapters/web/GUIS/mainMenuHudModule/partials/loadout/LoadoutTabController';

describe('LoadoutTabController - Controle de Broches e Prevenção de Duplicatas', () => {
    let container: HTMLElement;
    let mockDomain: any;

    const mockBrooches = [
        {
            id: 'brooch_winged_boots',
            name: 'Botas Aladas',
            type: 'ativo',
            description: 'Aumenta a velocidade de movimento temporariamente.',
            tags: ['mobilidade', 'ativo']
        },
        {
            id: 'brooch_flame_dash',
            name: 'Investida Ígnea',
            type: 'ativo',
            description: 'Dispara um rastro de chamas para frente.',
            tags: ['fogo', 'ativo']
        },
        {
            id: 'brooch_iron_will',
            name: 'Vontade de Ferro',
            type: 'passivo',
            description: 'Reduz o dano recebido continuamente.',
            tags: ['defesa', 'passivo']
        }
    ];

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        container.id = 'tab-loadout';
        document.body.appendChild(container);

        mockDomain = {
            globalMetaSummary: {
                brooches: mockBrooches
            }
        };
    });

    it('inicializa slots vazios e inventário ativo habilitado', () => {
        const controller = new LoadoutTabController(container, mockDomain);

        expect(controller.selectedActiveLoadout).toEqual([null, null, null, null]);
        expect(controller.selectedPassiveLoadout).toEqual([null, null, null, null]);

        const inventoryItems = container.querySelectorAll('.brooch-inventory-item');
        expect(inventoryItems.length).toBe(3); // 2 broches ativos + 1 passivo sob a aba padrão 'todos'

        inventoryItems.forEach((item) => {
            expect((item as HTMLElement).draggable).toBe(true);
            expect(item.classList.contains('brooch-equipped-disabled')).toBe(false);
        });
    });

    it('impede que o mesmo broche seja equipado mais de uma vez e aplica estilo disabled em escala de cinza', () => {
        const controller = new LoadoutTabController(container, mockDomain);

        const activeSlots = container.querySelectorAll('#active-slots-container > div');
        expect(activeSlots.length).toBe(4);

        const slot0 = activeSlots[0] as HTMLElement;
        const slot1 = activeSlots[1] as HTMLElement;

        // Simula drop do broche 'brooch_winged_boots' no Slot 0
        (controller as any).draggedBrooch = 'brooch_winged_boots';
        const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
        slot0.dispatchEvent(dropEvent);

        expect(controller.selectedActiveLoadout[0]).toBe('brooch_winged_boots');

        // Verifica que no inventário o item agora está disabled (cinza e não arrastável)
        const inventoryItems = container.querySelectorAll('#brooch-inventory .brooch-inventory-item');
        const wingedBootsItem = Array.from(inventoryItems).find(el => el.getAttribute('title')?.includes('Botas Aladas')) as HTMLElement;
        expect(wingedBootsItem).toBeDefined();
        expect(wingedBootsItem.draggable).toBe(false);
        expect(wingedBootsItem.classList.contains('brooch-equipped-disabled')).toBe(true);
        expect(wingedBootsItem.style.filter).toContain('grayscale(100%)');
        expect(wingedBootsItem.style.cursor).toBe('not-allowed');

        // Tenta equipar o mesmo broche no Slot 1
        (controller as any).draggedBrooch = 'brooch_winged_boots';
        slot1.dispatchEvent(dropEvent);

        // O Slot 1 deve permanecer vazio porque não pode duplicar
        expect(controller.selectedActiveLoadout[1]).toBeNull();
    });

    it('ao desequipar o broche clicando no slot, restaura o estado habilitado no inventário', () => {
        const controller = new LoadoutTabController(container, mockDomain);

        const activeSlots = container.querySelectorAll('#active-slots-container > div');
        const slot0 = activeSlots[0] as HTMLElement;

        // Equipa no Slot 0
        (controller as any).draggedBrooch = 'brooch_winged_boots';
        slot0.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
        expect(controller.selectedActiveLoadout[0]).toBe('brooch_winged_boots');

        // Como renderLoadout() recriou os nós do DOM, busca o novo slot e o broche equipado
        const reRenderedSlot0 = container.querySelector('#active-slots-container > div') as HTMLElement;
        const equippedBroochInSlot = reRenderedSlot0.querySelector('.brooch-inventory-item') as HTMLElement;
        expect(equippedBroochInSlot).not.toBeNull();
        equippedBroochInSlot.click();

        // Slot volta a ser null
        expect(controller.selectedActiveLoadout[0]).toBeNull();

        // Broche no inventário é reabilitado
        const inventoryItems = container.querySelectorAll('#brooch-inventory .brooch-inventory-item');
        const wingedBootsItem = Array.from(inventoryItems).find(el => el.getAttribute('title') === null || !el.getAttribute('title')?.includes('(já equipado)')) as HTMLElement;
        expect(wingedBootsItem).toBeDefined();
        expect(wingedBootsItem.draggable).toBe(true);
        expect(wingedBootsItem.classList.contains('brooch-equipped-disabled')).toBe(false);
        expect(wingedBootsItem.style.filter).not.toContain('grayscale(100%)');
    });

    it('um save novo sem broches desbloqueados deve iniciar com 0 broches no inventário e exibir empty state', () => {
        const emptyDomain: any = {
            globalMetaSummary: {
                brooches: []
            }
        };

        const controller = new LoadoutTabController(container, emptyDomain);
        expect(controller.getConsolidatedBrooches()).toEqual([]);
        expect(controller.selectedActiveLoadout).toEqual([null, null, null, null]);
        expect(controller.selectedPassiveLoadout).toEqual([null, null, null, null]);

        const inventoryItems = container.querySelectorAll('.brooch-inventory-item');
        expect(inventoryItems.length).toBe(0);

        const inventoryContainer = container.querySelector('#brooch-inventory');
        expect(inventoryContainer?.textContent).toContain('Nenhum broche relicário desbloqueado nesta jornada');
    });
});
