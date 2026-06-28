import { describe, it, expect, beforeEach, vi } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import Player from '../../domain/ObjectModule/Entities/Player/Player';

describe('Skill Tree Unlock Logic', () => {
    let mockEventManager: any;
    let mockLogger: any;
    let mockCollision: any;
    let domain: DomainFacade;
    let player: Player;

    beforeEach(() => {
        mockEventManager = {
            dispatch: vi.fn(),
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            clear: vi.fn()
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
            { TILE_SIZE: 16 } as any, // mock config
            mockLogger,
            mockEventManager,
            mockCollision
        );
        
        // Acesso via casting pois 'player' é private
        player = (domain as any).player;
        
        // Setup initial state for testing
        player.attributes.level = 10;
        (player.attributes as any)._availablePoints = 5;
        (player as any)._unlockedSkills.clear();
        player.setActiveClass('Pescador');
    });

    it('should NOT allow unlocking T2 skill if T1 is not unlocked', () => {
        // Tenta destravar T2 sem ter o T1
        domain.manageSkillTree('unlock', { skillId: 'pesc_t2_net' });
        
        // Verifica se destravou
        expect(player.unlockedSkills.has('pesc_t2_net')).toBe(false);
        expect(player.attributes.availablePoints).toBe(5); // Ponto não foi gasto
    });

    it('should allow unlocking T2 skill if T1 IS unlocked', () => {
        // Dá o T1 primeiro
        domain.manageSkillTree('unlock', { skillId: 'pesc_t1_fisgada' });
        
        // Verifica se pegou T1
        expect(player.unlockedSkills.has('pesc_t1_fisgada')).toBe(true);
        expect(player.attributes.availablePoints).toBe(4);

        // Tenta pegar T2
        domain.manageSkillTree('unlock', { skillId: 'pesc_t2_net' });
        
        // Verifica se pegou T2
        expect(player.unlockedSkills.has('pesc_t2_net')).toBe(true);
        expect(player.attributes.availablePoints).toBe(3);
    });

    it('should NOT allow unlocking T1 skill if level is insufficient', () => {
        // Reseta level para 0
        player.attributes.level = 0;
        
        domain.manageSkillTree('unlock', { skillId: 'pesc_t1_fisgada' });
        
        expect(player.unlockedSkills.has('pesc_t1_fisgada')).toBe(false);
        expect(player.attributes.availablePoints).toBe(5);
    });

    it('should NOT allow unlocking T3 skill if T2 is missing', () => {
        // Dá T1, mas pula T2 e tenta pegar T3 direto
        domain.manageSkillTree('unlock', { skillId: 'pesc_t1_fisgada' });
        domain.manageSkillTree('unlock', { skillId: 'pesc_t3_leviata' });
        
        expect(player.unlockedSkills.has('pesc_t3_leviata')).toBe(false);
    });
});
