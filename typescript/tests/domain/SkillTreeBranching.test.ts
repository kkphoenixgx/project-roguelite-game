import { describe, it, expect, beforeEach, vi } from 'vitest';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import SkillTreeGateway from '../../domain/facadeComponents/SkillTreeGateway';

describe('Skill Tree Linear Branching (Domain)', () => {
    let mockEventManager: any;
    let mockLogger: any;
    let player: Player;
    let skillTreeGateway: SkillTreeGateway;

    beforeEach(() => {
        mockEventManager = {
            dispatch: vi.fn(),
            on: vi.fn()
        };
        mockLogger = { log: vi.fn() };
        player = new Player(1, { x: 0, y: 0 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), mockEventManager);
        skillTreeGateway = new SkillTreeGateway(player, mockLogger, mockEventManager, vi.fn());

        (player.attributes as any)._level = 20;
        (player.attributes as any)._availablePoints = 20;
        player.unlockedSkills.clear();
    });

    describe('Guerreiro Linear Branching (Colosso vs Titã)', () => {
        beforeEach(() => {
            player.unlockClass('Guerreiro');
            player.setActiveClass('Guerreiro');
        });

        it('deve exigir a fundação Tier 1 (w_t1_strike -> w_t1_heavy_blow) antes de permitir qualquer ramo', () => {
            // Tenta ir direto para o Ramo A (w_t2_cleave)
            skillTreeGateway.manage('unlock', { skillId: 'w_t2_cleave' });
            expect(player.unlockedSkills.has('w_t2_cleave')).toBe(false);

            // Tenta ir direto para o Ramo B (w_t1_iron_skin)
            skillTreeGateway.manage('unlock', { skillId: 'w_t1_iron_skin' });
            expect(player.unlockedSkills.has('w_t1_iron_skin')).toBe(false);

            // Desbloqueia a base
            skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
            expect(player.unlockedSkills.has('w_t1_strike')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });
            expect(player.unlockedSkills.has('w_t1_heavy_blow')).toBe(true);
        });

        it('deve progredir linearmente no Ramo do Colosso até o Avatar da Guerra', () => {
            skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
            skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });

            // Tenta pular o turbilhão e pegar fúria direto
            skillTreeGateway.manage('unlock', { skillId: 'w_t3_berserk' });
            expect(player.unlockedSkills.has('w_t3_berserk')).toBe(false);

            // Avança no ramo
            skillTreeGateway.manage('unlock', { skillId: 'w_t2_cleave' });
            expect(player.unlockedSkills.has('w_t2_cleave')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'w_t3_berserk' });
            expect(player.unlockedSkills.has('w_t3_berserk')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'w_t5_blade_dance' });
            expect(player.unlockedSkills.has('w_t5_blade_dance')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'w_t4_armor_breaker' });
            expect(player.unlockedSkills.has('w_t4_armor_breaker')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'w_t5_avatar_of_war' });
            expect(player.unlockedSkills.has('w_t5_avatar_of_war')).toBe(true);
        });

        it('deve progredir linearmente no Ramo do Titã até o Impacto Sísmico', () => {
            skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
            skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });

            // Ramo B
            skillTreeGateway.manage('unlock', { skillId: 'w_t1_iron_skin' });
            expect(player.unlockedSkills.has('w_t1_iron_skin')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'w_t2_shield_bash' });
            expect(player.unlockedSkills.has('w_t2_shield_bash')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'w_t3_war_cry' });
            expect(player.unlockedSkills.has('w_t3_war_cry')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'w_t3_colossus_vigor' });
            expect(player.unlockedSkills.has('w_t3_colossus_vigor')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'w_t4_ground_slam' });
            expect(player.unlockedSkills.has('w_t4_ground_slam')).toBe(true);
        });
    });

    describe('Necromante Linear Branching (Ossos vs Espectro)', () => {
        beforeEach(() => {
            player.unlockClass('Necromante');
            player.setActiveClass('Necromante');
        });

        it('deve progredir linearmente no Ramo dos Ossos após a fundação Tier 1', () => {
            // Base
            skillTreeGateway.manage('unlock', { skillId: 'n_t1_reap' });
            skillTreeGateway.manage('unlock', { skillId: 'n_t1_death_aura' });

            // Ramo dos Ossos
            skillTreeGateway.manage('unlock', { skillId: 'n_t2_bone_spear' });
            expect(player.unlockedSkills.has('n_t2_bone_spear')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'n_t2_lifesteal' });
            expect(player.unlockedSkills.has('n_t2_lifesteal')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'n_t4_corpse_explosion' });
            expect(player.unlockedSkills.has('n_t4_corpse_explosion')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'n_t4_death_warden' });
            expect(player.unlockedSkills.has('n_t4_death_warden')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'n_t5_dance_of_dead' });
            expect(player.unlockedSkills.has('n_t5_dance_of_dead')).toBe(true);
        });

        it('deve progredir linearmente no Ramo do Espectro até o Clamor da Banshee', () => {
            // Base
            skillTreeGateway.manage('unlock', { skillId: 'n_t1_reap' });
            skillTreeGateway.manage('unlock', { skillId: 'n_t1_death_aura' });

            // Ramo do Espectro
            skillTreeGateway.manage('unlock', { skillId: 'n_t1_soul_leech' });
            expect(player.unlockedSkills.has('n_t1_soul_leech')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'n_t3_soul' });
            expect(player.unlockedSkills.has('n_t3_soul')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'n_t3_grasp_of_dead' });
            expect(player.unlockedSkills.has('n_t3_grasp_of_dead')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'n_t3_spectral_veil' });
            expect(player.unlockedSkills.has('n_t3_spectral_veil')).toBe(true);

            skillTreeGateway.manage('unlock', { skillId: 'n_t5_wail_of_banshee' });
            expect(player.unlockedSkills.has('n_t5_wail_of_banshee')).toBe(true);
        });
    });
});
