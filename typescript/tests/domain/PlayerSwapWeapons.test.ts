import { describe, it, expect, beforeEach } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import Scythe from '../../domain/ObjectModule/Items/Weapons/MeleeWeapons/Scythe';
import SimpleStaff from '../../domain/ObjectModule/Items/Weapons/RangedWeapons/Staffs/SimpleStaff';
import ActionManager from '../../domain/eventDispacher/ActionManager';

describe('Player - Troca Rápida de Armas (Quick Swap / Tab)', () => {
    let eventManager: EventHandler;
    let player: Player;
    let scythe: Scythe;
    let staff: SimpleStaff;

    beforeEach(() => {
        eventManager = new EventHandler();
        const attributes = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
        player = new Player(1, { x: 0, y: 0 }, attributes, eventManager);

        scythe = new Scythe();
        staff = new SimpleStaff();

        player.equipment.mainHand = scythe;
        player.equipment.secondHand = staff;
        player.setActiveClass('Necromancer');
    });

    it('deve alternar a arma principal com a arma secundária', () => {
        expect(player.equipment.mainHand).toBe(scythe);
        expect(player.equipment.secondHand).toBe(staff);

        player.swapWeapons();

        expect(player.equipment.mainHand).toBe(staff);
        expect(player.equipment.secondHand).toBe(scythe);
        expect(player.activeClass).toBe('Mago');
    });

    it('deve alternar de volta para a arma inicial em um segundo swap', () => {
        player.swapWeapons();
        expect(player.equipment.mainHand).toBe(staff);

        player.swapWeapons();
        expect(player.equipment.mainHand).toBe(scythe);
        expect(player.equipment.secondHand).toBe(staff);
        expect(player.activeClass).toBe('Necromante');
    });

    it('deve disparar a troca de armas através do ActionManager com a ação swapWeapons', () => {
        const mockLogger = { log: () => {} } as any;
        const actionManager = new ActionManager(player, mockLogger, eventManager);

        actionManager.checkEvent(['swapWeapons'], { x: 100, y: 100 });

        expect(player.equipment.mainHand).toBe(staff);
        expect(player.equipment.secondHand).toBe(scythe);
        expect(player.activeClass).toBe('Mago');
    });
});
