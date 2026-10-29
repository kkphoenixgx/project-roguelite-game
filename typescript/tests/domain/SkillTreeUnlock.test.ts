import { describe, it, expect, beforeEach, vi } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import SkillTreeGateway from '../../domain/facadeComponents/SkillTreeGateway';
import DomainRenderState from '../../domain/facadeComponents/DomainRenderState';

describe('Skill Tree Unlock Logic', () => {
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
            { TILE_SIZE: 16 } as any, // mock config
            mockLogger,
            mockEventManager,
            mockCollision
        );
        player = new Player(1, { x: 0, y: 0 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), mockEventManager);
        (domain as any).player = player;

        skillTreeGateway = new SkillTreeGateway(player, mockLogger, mockEventManager, vi.fn());
        
        // Setup initial state for testing
        (player.attributes as any)._level = 10;
        (player.attributes as any)._availablePoints = 5;
        player.unlockedSkills.clear();
        player.unlockClass('Pescador');
        player.setActiveClass('Pescador');
    });

    it('should NOT allow unlocking T2 skill if T1 is not unlocked', () => {
        // Tenta destravar T2 sem ter o T1
        skillTreeGateway.manage('unlock', { skillId: 'pesc_t2_net' });
        
        // Verifica se destravou
        expect(player.unlockedSkills.has('pesc_t2_net')).toBe(false);
        expect(player.attributes.availablePoints).toBe(5); // Ponto não foi gasto
    });

    it('should allow unlocking T2 skill if T1 IS unlocked', () => {
        // Dá o T1 primeiro
        skillTreeGateway.manage('unlock', { skillId: 'pesc_t1_fisgada' });
        
        // Verifica se pegou T1
        expect(player.unlockedSkills.has('pesc_t1_fisgada')).toBe(true);
        expect(player.attributes.availablePoints).toBe(4);

        // Tenta pegar T2
        skillTreeGateway.manage('unlock', { skillId: 'pesc_t2_net' });
        
        // Verifica se pegou T2
        expect(player.unlockedSkills.has('pesc_t2_net')).toBe(true);
        expect(player.attributes.availablePoints).toBe(3);
    });

    it('should NOT allow unlocking T1 skill if level is insufficient', () => {
        // Reseta level para 0
        (player.attributes as any)._level = 0;
        
        skillTreeGateway.manage('unlock', { skillId: 'pesc_t1_fisgada' });
        
        expect(player.unlockedSkills.has('pesc_t1_fisgada')).toBe(false);
        expect(player.attributes.availablePoints).toBe(5);
    });

    it('should NOT allow unlocking T3 skill if T2 is missing', () => {
        // Dá T1, mas pula T2 e tenta pegar T3 direto
        skillTreeGateway.manage('unlock', { skillId: 'pesc_t1_fisgada' });
        skillTreeGateway.manage('unlock', { skillId: 'pesc_t3_leviata' });
        
        expect(player.unlockedSkills.has('pesc_t3_leviata')).toBe(false);
    });

    it('should NOT allow unlocking skills of a class that is locked/not owned', () => {
        // Warrior não está desbloqueado
        expect(player.unlockedClasses.includes('Warrior')).toBe(false);

        skillTreeGateway.manage('unlock', { skillId: 'w_t1_strike' });
        expect(player.unlockedSkills.has('w_t1_strike')).toBe(false);
        expect(player.attributes.availablePoints).toBe(5);
    });

    it('should grant points on level up instead of auto-unlocking skills across unchosen branches', () => {
        (player.attributes as any)._level = 1;
        (player.attributes as any)._currentXp = 0;
        (player.attributes as any)._xpToNextLevel = 100;
        (player.attributes as any)._availablePoints = 0;
        const initialUnlockedCount = player.unlockedSkills.size;

        // Sobe para nível 2 (nível par, que concede class_skill)
        player.gainXp(100);

        expect(player.attributes.level).toBe(2);
        // Habilidades desbloqueadas NÃO aumentam sozinhas/automaticamente
        expect(player.unlockedSkills.size).toBe(initialUnlockedCount);
        // O jogador ganha pontos disponíveis (attribute_point + class_skill = 2 pontos)
        expect(player.attributes.availablePoints).toBe(2);
    });

    it('should set canUnlock = false in DomainRenderState when viewing a locked class', () => {
        // Pescador is unlocked, Guerreiro is locked
        expect(player.unlockedClasses.includes('Pescador')).toBe(true);
        expect(player.unlockedClasses.includes('Guerreiro')).toBe(false);

        const renderStateBuilder = new DomainRenderState(mockLogger, () => (domain as any).viewedClass);
        const mockWorld = { width: 1000, height: 1000, mapId: 'test', chunks: [] } as any;
        const mockObjManager = { getNearActiveElements: () => [], getAllRenderableStates: () => [] } as any;

        // Visualizando Pescador: T1 pode ser desbloqueado
        (domain as any).viewedClass = 'Pescador';
        let state = renderStateBuilder.getRenderState(mockWorld, player, mockObjManager);
        let playerState = state.renderables[0] as any;
        let pescT1 = playerState.skillTree?.find((s: any) => s.id === 'pesc_t1_fisgada');
        expect(pescT1?.canUnlock).toBe(true);

        // Visualizando Guerreiro (classe bloqueada): T1 NÃO pode ser desbloqueado
        (domain as any).viewedClass = 'Guerreiro';
        state = renderStateBuilder.getRenderState(mockWorld, player, mockObjManager);
        playerState = state.renderables[0] as any;
        let warT1 = playerState.skillTree?.find((s: any) => s.id === 'w_t1_strike');
        expect(warT1?.canUnlock).toBe(false);
    });
});
