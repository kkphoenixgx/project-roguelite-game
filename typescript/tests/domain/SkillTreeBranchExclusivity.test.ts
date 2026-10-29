import { describe, it, expect, beforeEach, vi } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import SkillTreeGateway from '../../domain/facadeComponents/SkillTreeGateway';
import DomainRenderState from '../../domain/facadeComponents/DomainRenderState';

describe('Skill Tree Branch Exclusivity (Clean Architecture)', () => {
    let mockEventManager: any;
    let mockLogger: any;
    let mockCollision: any;
    let domain: DomainFacade;
    let player: Player;
    let skillTreeGateway: SkillTreeGateway;

    beforeEach(() => {
        mockEventManager = {
            dispatch: vi.fn(),
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            clear: vi.fn(),
            on: vi.fn()
        };
        mockLogger = { log: vi.fn() };
        mockCollision = {
            checkCollisions: vi.fn(),
            getPossibleCollisions: vi.fn(),
            updateEntityPosition: vi.fn(),
            removeEntity: vi.fn(),
            clear: vi.fn()
        };

        domain = new DomainFacade(
            { TILE_SIZE: 16 } as any,
            mockLogger,
            mockEventManager,
            mockCollision
        );
        player = new Player(1, { x: 0, y: 0 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), mockEventManager);
        (domain as any).player = player;

        skillTreeGateway = new SkillTreeGateway(player, mockLogger, mockEventManager, vi.fn());

        (player.attributes as any)._level = 20;
        (player.attributes as any)._availablePoints = 10;
        player.unlockedSkills.clear();
        player.unlockClass('Guerreiro');
        player.setActiveClass('Guerreiro');
    });

    it('should allow unlocking base stem skills before branch bifurcation', () => {
        // Tronco comum do Guerreiro: w_t1_strike -> w_t1_heavy_blow
        skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
        expect(player.unlockedSkills.has('w_t1_strike')).toBe(true);

        skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });
        expect(player.unlockedSkills.has('w_t1_heavy_blow')).toBe(true);
    });

    it('should block opposing branch when Colosso branch is chosen', () => {
        // Desbloqueia a base
        skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
        skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });

        // Escolhe o Ramo A (Colosso): w_t2_cleave
        skillTreeGateway.manage('unlock', { skillId: 'w_t2_cleave' });
        expect(player.unlockedSkills.has('w_t2_cleave')).toBe(true);

        // Tenta escolher o Ramo B (Titã): w_t1_iron_skin
        const initialPoints = player.attributes.availablePoints;
        skillTreeGateway.manage('unlock', { skillId: 'w_t1_iron_skin' });

        // Deve ser bloqueado!
        expect(player.unlockedSkills.has('w_t1_iron_skin')).toBe(false);
        expect(player.attributes.availablePoints).toBe(initialPoints);
        expect(mockLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Ramo concorrente'));
    });

    it('should reflect canUnlock = false in DomainRenderState for opposing branch nodes', () => {
        skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
        skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });
        skillTreeGateway.manage('unlock', { skillId: 'w_t2_cleave' });

        const renderStateBuilder = new DomainRenderState(mockLogger, () => 'Guerreiro');
        const mockWorld = { width: 1000, height: 1000, mapId: 'test', chunks: [] } as any;
        const mockObjManager = { getNearActiveElements: () => [], getAllRenderableStates: () => [] } as any;

        const state = renderStateBuilder.getRenderState(mockWorld, player, mockObjManager);
        const playerState = (renderStateBuilder as any).cachedPlayerState;

        // Nós do Ramo Colosso devem poder progredir
        const berserkNode = playerState.skillTree.find((s: any) => s.id === 'w_t3_berserk');
        expect(berserkNode?.canUnlock).toBe(true);

        // Nós do Ramo Titã devem estar bloqueados
        const ironSkinNode = playerState.skillTree.find((s: any) => s.id === 'w_t1_iron_skin');
        expect(ironSkinNode?.canUnlock).toBe(false);

        const shieldBashNode = playerState.skillTree.find((s: any) => s.id === 'w_t2_shield_bash');
        expect(shieldBashNode?.canUnlock).toBe(false);
    });

    it('should block Colosso branch when Tita branch is chosen', () => {
        skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
        skillTreeGateway.manage('unlock', { skillId: 'w_t1_heavy_blow' });

        // Escolhe o Ramo B (Titã): w_t1_iron_skin
        skillTreeGateway.manage('unlock', { skillId: 'w_t1_iron_skin' });
        expect(player.unlockedSkills.has('w_t1_iron_skin')).toBe(true);

        // Tenta desbloquear Ramo A (Colosso): w_t2_cleave
        skillTreeGateway.manage('unlock', { skillId: 'w_t2_cleave' });
        expect(player.unlockedSkills.has('w_t2_cleave')).toBe(false);
    });

    it('should also enforce branch exclusivity for Necromancer', () => {
        player.unlockClass('Necromante');
        player.setActiveClass('Necromante');

        // Tronco base: reap -> death_aura
        skillTreeGateway.manage('unlock', { skillId: 'n_t1_reap' });
        skillTreeGateway.manage('unlock', { skillId: 'n_t1_death_aura' });

        // Escolhe Ramo A (Senhor dos Ossos): n_t2_bone_spear
        skillTreeGateway.manage('unlock', { skillId: 'n_t2_bone_spear' });
        expect(player.unlockedSkills.has('n_t2_bone_spear')).toBe(true);

        // Tenta desbloquear Ramo B (Espectro Abissal): n_t1_soul_leech
        skillTreeGateway.manage('unlock', { skillId: 'n_t1_soul_leech' });
        expect(player.unlockedSkills.has('n_t1_soul_leech')).toBe(false);
    });
});
