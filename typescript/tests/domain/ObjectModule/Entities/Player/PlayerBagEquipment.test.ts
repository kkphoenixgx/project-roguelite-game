import { describe, it, expect, vi, beforeEach } from 'vitest';
import Player from '../../../../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../../../../domain/ObjectModule/Entities/Attributes';
import type { IEventManager } from '../../../../../domain/eventDispacher/IGameEvents';
import LeatherBag from '../../../../../domain/ObjectModule/Items/Storage/LeatherBag';
import Gun from '../../../../../domain/ObjectModule/Items/Weapons/RangedWeapons/Gun';
import SimpleSword from '../../../../../domain/ObjectModule/Items/Weapons/MeleeWeapons/SimpleSword';

describe('PlayerBagEquipment - Unit & Regression Tests', () => {
    let player: Player;
    let mockEventManager: IEventManager;

    beforeEach(() => {
        mockEventManager = { on: vi.fn(), dispatch: vi.fn() };
        player = new Player(
            1,
            { x: 100, y: 100 },
            new Attributes(8, 1, 10, 10, 10, 10, 10, 10),
            mockEventManager
        );
    });

    it('deve iniciar com maxBackpackSize padrão de 24 slots', () => {
        expect(player.maxBackpackSize).toBe(24);
        expect(player.equipment.bag).toBeUndefined();
    });

    it('deve equipar LeatherBag e expandir a capacidade da mochila para 36 slots', () => {
        const bag = new LeatherBag();
        player.backpack.push(bag);

        expect(player.backpack.length).toBe(1);
        player.equipItem(0);

        expect(player.equipment.bag).toBe(bag);
        expect(player.maxBackpackSize).toBe(36);
        expect(player.backpack.length).toBe(0);
        expect(player.equipedItens).toContain(bag);
    });

    it('deve desequipar LeatherBag com sucesso quando o inventário base tiver espaço', () => {
        const bag = new LeatherBag();
        player.backpack.push(bag);
        player.equipItem(0);

        const unequipSuccess = player.unequipBag();
        expect(unequipSuccess).toBe(true);
        expect(player.equipment.bag).toBeUndefined();
        expect(player.maxBackpackSize).toBe(24);
        expect(player.backpack.length).toBe(1);
        expect(player.backpack[0]).toBe(bag);
        expect(player.equipedItens).not.toContain(bag);
    });

    it('deve empacotar itens excedentes (do slot 23 em diante) dentro da bolsa ao desequipá-la', () => {
        const bag = new LeatherBag();
        player.backpack.push(bag);
        player.equipItem(0);
        expect(player.maxBackpackSize).toBe(36);

        // Preenche com 25 itens no total
        for (let i = 0; i < 25; i++) {
            player.backpack.push(new SimpleSword());
        }
        expect(player.backpack.length).toBe(25);

        // Ao desequipar, a base tem 24 vagas. O slot 23 em diante é empacotado na bolsa
        const unequipSuccess = player.unequipBag();
        expect(unequipSuccess).toBe(true);
        expect(player.equipment.bag).toBeUndefined();

        // 25 - (slots da base guardados: índice 23 e 24 = 2 itens empacotados na bolsa)
        // Sobram 23 itens na base + a própria bolsa = 24 itens na base!
        expect(player.backpack.length).toBe(24);
        expect(player.backpack[23]).toBe(bag);
        expect(bag.storedItems.length).toBe(2);

        // Re-equipar a bolsa descarrega os itens de volta para a mochila expandida
        player.equipItem(23);
        expect(player.equipment.bag).toBe(bag);
        expect(player.maxBackpackSize).toBe(36);
        expect(bag.storedItems.length).toBe(0);
        expect(player.backpack.length).toBe(25);
    });

    it('deve impedir desequipar a bolsa se todos os slots (base + bolsa) estiverem totalmente lotados', () => {
        const bag = new LeatherBag();
        player.backpack.push(bag);
        player.equipItem(0);
        expect(player.maxBackpackSize).toBe(36);

        // Lotar todos os 36 slots
        for (let i = 0; i < 36; i++) {
            player.backpack.push(new Gun());
        }
        expect(player.backpack.length).toBe(36);

        // Não há espaço livre nem para a própria bolsa
        const unequipSuccess = player.unequipBag();
        expect(unequipSuccess).toBe(false);
        expect(player.equipment.bag).toBe(bag);
        expect(player.backpack.length).toBe(36);
    });

    it('deve permitir desequipar a bolsa via player.unequipItem("bag")', () => {
        const bag = new LeatherBag();
        player.backpack.push(bag);
        player.equipItem(0);
        expect(player.equipment.bag).toBe(bag);

        player.unequipItem('bag');
        expect(player.equipment.bag).toBeUndefined();
        expect(player.backpack[0]).toBe(bag);
    });
});
