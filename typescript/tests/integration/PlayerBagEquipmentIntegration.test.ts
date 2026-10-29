import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import LeatherBag from '../../domain/ObjectModule/Items/Storage/LeatherBag';
import Gun from '../../domain/ObjectModule/Items/Weapons/RangedWeapons/Gun';

describe('PlayerBagEquipmentIntegration - Ponta a Ponta Domínio e Render State', () => {
    let domain: DomainFacade;
    let eventListeners: Record<string, Function[]> = {};

    const mockLogger = { log: vi.fn() };

    const mockEventManager = {
        on: (event: string, callback: Function) => {
            if (!eventListeners[event]) eventListeners[event] = [];
            eventListeners[event].push(callback);
        },
        dispatch: (event: string, payload: any) => {
            if (eventListeners[event]) {
                for (const cb of eventListeners[event]) cb(payload);
            }
        }
    };

    const mockCollisionService = {
        checkPlayerCollision: vi.fn().mockReturnValue(false),
        checkMovement: vi.fn().mockImplementation((entity: any, nextPos: any) => nextPos),
        addCollider: vi.fn(),
        removeCollider: vi.fn(),
        clear: vi.fn()
    };

    beforeEach(async () => {
        eventListeners = {};
        domain = new DomainFacade(
            { player: { id: 1, initialPos: { x: 100, y: 100 }, level: 1 } },
            mockLogger as any,
            mockEventManager as any,
            mockCollisionService as any
        );
        await domain.loadWorld('vilgem');
    });

    it('deve refletir o tamanho padrão de mochila (24) no getRenderState()', () => {
        const renderState = domain.getRenderState();
        const playerState = renderState.renderables.find(r => r.id === 1);

        expect(playerState).toBeDefined();
        expect(playerState!.maxBackpackSize).toBe(24);
        expect(playerState!.equipment?.bag).toBeUndefined();
    });

    it('deve equipar LeatherBag via inventoryAction e atualizar maxBackpackSize para 36 no RenderState', () => {
        const player = (domain as any).player;
        const bag = new LeatherBag();
        player.backpack.push(bag);

        expect(player.backpack.length).toBe(1);

        // Dispara a intenção da UI exatamente como o GameAdapter faz
        mockEventManager.dispatch('inventoryAction', { action: 'equip', payload: { index: 0 } });

        expect(player.equipment.bag).toBe(bag);
        expect(player.maxBackpackSize).toBe(36);

        // Valida que o getRenderState do Domínio expõe o novo maxBackpackSize e o objeto bag
        const renderState = domain.getRenderState();
        const playerState = renderState.renderables.find(r => r.id === 1);

        expect(playerState).toBeDefined();
        expect(playerState!.maxBackpackSize).toBe(36);
        expect(playerState!.equipment?.bag).toBeDefined();
        expect(playerState!.equipment?.bag?.name).toBe('Mochila de Aventureiro');
        expect(playerState!.equipment?.bag?.iconId).toBe(100);
        expect(playerState!.equipment?.bag?.capacityBonus).toBe(12);
    });

    it('deve desequipar LeatherBag via inventoryAction unequip ("bag") e restaurar maxBackpackSize para 24', () => {
        const player = (domain as any).player;
        const bag = new LeatherBag();
        player.backpack.push(bag);

        // Equipa a bolsa
        mockEventManager.dispatch('inventoryAction', { action: 'equip', payload: { index: 0 } });
        expect(player.equipment.bag).toBe(bag);

        // Desequipa a bolsa via clique no slot #eq-bag da UI
        mockEventManager.dispatch('inventoryAction', { action: 'unequip', payload: { slot: 'bag' } });

        expect(player.equipment.bag).toBeUndefined();
        expect(player.backpack.length).toBe(1);
        expect(player.backpack[0]).toBe(bag);

        const renderState = domain.getRenderState();
        const playerState = renderState.renderables.find(r => r.id === 1);

        expect(playerState!.maxBackpackSize).toBe(24);
        expect(playerState!.equipment?.bag).toBeUndefined();
    });

    it('deve propagar a expansão da mochila permitindo que itens além de 24 fiquem visíveis no RenderState', () => {
        const player = (domain as any).player;
        const bag = new LeatherBag();
        player.backpack.push(bag);
        mockEventManager.dispatch('inventoryAction', { action: 'equip', payload: { index: 0 } });

        // Adiciona 30 itens na mochila expandida
        for (let i = 0; i < 30; i++) {
            player.backpack.push(new Gun());
        }

        const renderState = domain.getRenderState();
        const playerState = renderState.renderables.find(r => r.id === 1);

        expect(playerState!.maxBackpackSize).toBe(36);
        expect(playerState!.backpack?.length).toBe(30);
    });
});
