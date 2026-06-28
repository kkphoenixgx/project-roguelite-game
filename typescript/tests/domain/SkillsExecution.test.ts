import { describe, it, expect, vi, beforeEach } from 'vitest';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import DefaultXPTable from '../../domain/ObjectModule/Entities/DefaultXPTable';
import Gunslinger from '../../domain/ObjectModule/Entities/Player/Classes/Gunslinger';
import Warrior from '../../domain/ObjectModule/Entities/Player/Classes/Warrior';
import Necromancer from '../../domain/ObjectModule/Entities/Player/Classes/Necromancer';
import Mage from '../../domain/ObjectModule/Entities/Player/Classes/Mage';
import Pescador from '../../domain/ObjectModule/Entities/Player/Classes/Pescador';

describe('Generalist Skills Execution Test', () => {
    let mockEventManager: any;
    let player: any;
    let xpTable: any;

    beforeEach(() => {
        mockEventManager = {
            dispatch: vi.fn(),
            on: vi.fn(),
        };
        xpTable = new DefaultXPTable();
        // Crio um mock do Player por que precisamos só de algumas propriedades
        player = {
            id: 1,
            coordinates: { x: 100, y: 100 },
            size: { width: 32, height: 32 },
            attributes: { strength: 10, dexterity: 10, intelligence: 10, wisdom: 10, constitution: 10, level: 10 },
            activeStatuses: new Map(),
            facingDirection: { clone: () => ({ x: 1, y: 0 }) }
        };
    });

    it('should correctly execute Gunslinger gs_t2_fanhammer', () => {
        const gunslinger = new Gunslinger(xpTable, player as any, mockEventManager);
        gunslinger.executeSkill('gs_t2_fanhammer', { x: 150, y: 150 });
        
        // Deve registrar log e spawnar balas (em setTimeout, mas dispatch log já serve)
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
            message: expect.stringContaining('[Gunslinger] Fan the Hammer ativado no alvo')
        }));
    });

    it('should correctly execute Warrior w_t2_cleave', () => {
        const warrior = new Warrior(xpTable, player as any, mockEventManager);
        warrior.executeSkill('w_t2_cleave', { x: 150, y: 150 });
        
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'slashSparks'
        }));
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
            radius: 100
        }));
    });

    it('should correctly execute Necromancer n_t4_corpse_explosion', () => {
        const necromancer = new Necromancer(xpTable, player as any, mockEventManager);
        necromancer.executeSkill('n_t4_corpse_explosion', { x: 200, y: 200 });
        
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'darkPulse'
        }));
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
            radius: 120
        }));
    });

    it('should correctly execute Mage m_t4_teleport', () => {
        const mage = new Mage(xpTable, player as any, mockEventManager);
        mage.executeSkill('m_t4_teleport', { x: 300, y: 300 });
        
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('particle', expect.objectContaining({
            effect: 'magicPulse'
        }));
        // Como o player mockado sofre alteração:
        expect(player.coordinates.x).not.toBe(100);
        expect(player.coordinates.y).not.toBe(100);
    });

    it('should correctly execute Pescador pesc_t2_net', () => {
        const pescador = new Pescador(xpTable, player as any, mockEventManager);
        pescador.executeSkill('pesc_t2_net', { x: 150, y: 150 });
        
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'waterSplash'
        }));
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
            radius: 96
        }));
    });

    it('should correctly execute Pescador pesc_t3_leviata', () => {
        const pescador = new Pescador(xpTable, player as any, mockEventManager);
        // Garantir tempo pra cooldown (caso os testes andem rápido, eles rodam instâncias novas de pescador)
        pescador.executeSkill('pesc_t3_leviata', { x: 150, y: 150 });
        
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
            type: 'spawn-leviatã'
        }));
    });
});
