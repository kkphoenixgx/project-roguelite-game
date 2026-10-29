import { describe, it, expect, vi, beforeEach } from 'vitest';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import DefaultXPTable from '../../domain/ObjectModule/Entities/DefaultXPTable';

describe('Skill Cooldown System & Loadouts Integration', () => {
    let mockEventManager: any;
    let player: Player;

    beforeEach(() => {
        vi.useFakeTimers();
        mockEventManager = {
            dispatch: vi.fn(),
            on: vi.fn()
        };
        const attrs = new Attributes(10, 1, 10, 10, 10, 10, 10, 10);
        player = new Player(1, { x: 100, y: 100 }, attrs, mockEventManager);
    });

    it('deve registrar cooldown de habilidade e calcular tempo restante', () => {
        player.attributes.dexterity = 0; // Sem CDR para o teste bater exato
        player.setSkillCooldown('m_t4_teleport', 3000);

        expect(player.isSkillOnCooldown('m_t4_teleport')).toBe(true);
        expect(player.isSkillOnCooldown('other_skill')).toBe(false);

        const activeCds = player.getActiveCooldowns();
        expect(activeCds['m_t4_teleport']).toBeDefined();
        expect(activeCds['m_t4_teleport']!.totalMs).toBe(3000);
        expect(activeCds['m_t4_teleport']!.remainingMs).toBeGreaterThan(0);

        // Simula passagem de tempo do relógio da vida real com o jogo pausado (sem player.update)
        vi.advanceTimersByTime(5000);
        expect(player.isSkillOnCooldown('m_t4_teleport')).toBe(true);
        expect(player.getActiveCooldowns()['m_t4_teleport']!.remainingMs).toBe(3000);

        // Avança o tempo da simulação do jogo (despausado)
        player.update(3.001);

        expect(player.isSkillOnCooldown('m_t4_teleport')).toBe(false);
        const expiredCds = player.getActiveCooldowns();
        expect(expiredCds['m_t4_teleport']).toBeUndefined();
    });

    it('deve aplicar redução de recarga (CDR / recharge) ao cooldown', () => {
        // DEX alta concede bônus de recarga
        player.attributes.dexterity = 40; // 40 * 0.25 = 10% CDR
        expect(player.attributes.recharge).toBe(10);

        player.setSkillCooldown('w_t2_cleave', 4000); // 4000 - 10% = 3600ms

        const activeCds = player.getActiveCooldowns();
        expect(activeCds['w_t2_cleave']!.totalMs).toBe(3600);
    });

    it('deve executar broche ativo e colocá-lo em cooldown', () => {
        player.attributes.hp = 5;
        const initialHp = player.attributes.hp;

        player.executeActiveBrooch('brooch_active_heal', { x: 100, y: 100 });

        // Cura 30% do HP máximo
        expect(player.attributes.hp).toBeGreaterThan(initialHp);
        const healedHp = player.attributes.hp;
        expect(player.isSkillOnCooldown('brooch_active_heal')).toBe(true);

        // Tentar usar novamente durante o cooldown deve ser bloqueado
        player.executeActiveBrooch('brooch_active_heal', { x: 100, y: 100 });
        expect(player.attributes.hp).toBe(healedHp); // Não curou de novo
    });

    it('deve bloquear habilidades de guerreiro quando em recarga', () => {
        player.unlockClass('Guerreiro');
        player.setActiveClass('Guerreiro');
        player.unlockSkill('w_t1_strike');
        player.unlockSkill('w_t2_cleave');

        // Primeira execução de Corte Giratório
        player.executeActiveSkill('w_t2_cleave', { x: 150, y: 150 });
        expect(player.isSkillOnCooldown('w_t2_cleave')).toBe(true);

        // Segunda tentativa deve ser barrada pelo cooldown
        const initialCallCount = mockEventManager.dispatch.mock.calls.length;
        player.executeActiveSkill('w_t2_cleave', { x: 150, y: 150 });

        // Deve disparar log informando recarga
        expect(mockEventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
            message: expect.stringContaining('em recarga')
        }));
    });
});
