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
            type: 'cleave'
        }));
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
            radius: expect.any(Number)
        }));
    });

    it('should correctly execute Necromancer n_t4_corpse_explosion', () => {
        const necromancer = new Necromancer(xpTable, player as any, mockEventManager);
        necromancer.executeSkill('n_t4_corpse_explosion', { x: 200, y: 200 });
        
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'n_t4_corpse_explosion'
        }));
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
            radius: expect.any(Number)
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
            type: 'fishing-net'
        }));
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
            radius: 96
        }));
    });

    it('should correctly execute Pescador pesc_t3_leviata', () => {
        const pescador = new Pescador(xpTable, player as any, mockEventManager);
        pescador.executeSkill('pesc_t3_leviata', { x: 150, y: 150 });
        
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
            type: 'spawn-leviatã'
        }));
    });

    it('should correctly execute Warrior skills with correct sprites and sizes', () => {
        const warrior = new Warrior(xpTable, player as any, mockEventManager);

        // 1. Pancada Pesada (Heavy Blow)
        warrior.executeSkill('w_t1_heavy_blow', { x: 150, y: 100 });
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'heavy-blow',
            size: { width: 64, height: 64 }
        }));

        // 2. Investida com Escudo (Shield Bash)
        warrior.executeSkill('w_t2_shield_bash', { x: 150, y: 100 });
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'shield-bash',
            size: { width: 64, height: 64 }
        }));

        // 3. Grito de Guerra (War Cry)
        warrior.executeSkill('w_t3_war_cry', { x: 100, y: 100 });
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'war-cry',
            size: { width: 128, height: 128 }
        }));

        // 4. Impacto Sísmico (Ground Slam)
        warrior.executeSkill('w_t4_ground_slam', { x: 100, y: 100 });
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'ground-slam',
            size: { width: 128, height: 128 }
        }));

        // 5. Dança das Lâminas do Colosso (Blade Dance)
        warrior.executeSkill('w_t5_blade_dance', { x: 150, y: 100 });
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'blade-dance',
            size: { width: 128, height: 128 }
        }));

        // 6. Avatar da Guerra (Avatar of War)
        warrior.executeSkill('w_t5_avatar_of_war', { x: 100, y: 100 });
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
            type: 'avatar-of-war',
            size: { width: 128, height: 128 }
        }));
    });
});
