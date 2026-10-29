import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import BroochTemplate from '../../domain/templates/BroochTemplate';
import BroochRegistry from '../../domain/ObjectModule/Entities/Player/components/BroochRegistry';
import Attack from '../../domain/ObjectModule/Items/Attack';
import StunStatus from '../../domain/ObjectModule/Entities/Status/StunStatus';
import Vector2D from '../../domain/shared/Vector2D';

describe('Sistema Integral de Broches Ancestrais (Active & Passive Brooches)', () => {
  let eventManager: EventHandler;
  let player: Player;

  beforeEach(() => {
    BroochRegistry.resetAll();
    eventManager = new EventHandler();
    const attributes = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
    player = new Player(1, { x: 100, y: 100 }, attributes, eventManager);
  });

  describe('BroochTemplate & BroochRegistry', () => {
    it('deve construir broches ativos e passivos via Fluent Builder com tipagem estrita', () => {
      const activeDef = BroochTemplate.createActive('test_active', 'Broche Teste', 'Descrição ativa', 25000)
        .withTags('teste', 'fogo')
        .onExecute(() => {})
        .build();

      expect(activeDef.id).toBe('test_active');
      expect(activeDef.type).toBe('ativo');
      expect(activeDef.shape).toBe('circle');
      expect(activeDef.cooldownMs).toBe(25000);
      expect(activeDef.tags).toContain('fogo');

      const passiveDef = BroochTemplate.createPassive('test_passive', 'Passivo Teste', 'Descrição passiva')
        .withTags('defesa')
        .build();

      expect(passiveDef.id).toBe('test_passive');
      expect(passiveDef.type).toBe('passivo');
      expect(passiveDef.shape).toBe('triangle');
    });

    it('deve resolver aliases canônicos no BroochRegistry', () => {
      expect(BroochRegistry.getCanonicalId('brooch_heal')).toBe('brooch_active_heal');
      expect(BroochRegistry.getCanonicalId('brooch_meteor')).toBe('brooch_active_meteor');
      expect(BroochRegistry.getCanonicalId('brooch_shield')).toBe('brooch_active_shield');
      expect(BroochRegistry.getCooldown('brooch_active_meteor')).toBe(90000);
    });
  });

  describe('Broches Ativos (Global Active Loadout)', () => {
    it('[Cálice da Vida] deve curar 30% da Vida Máxima e entrar em tempo de recarga', () => {
      player.attributes.hp = 20;
      const initialHp = player.attributes.hp;
      const expectedHeal = Math.round(player.attributes.maxHp * 0.3);

      player.executeActiveBrooch('brooch_active_heal', { x: 100, y: 100 });

      expect(player.attributes.hp).toBe(initialHp + expectedHeal);
      expect(player.isSkillOnCooldown('brooch_active_heal')).toBe(true);
    });

    it('[Barreira de Cristal] deve conceder 3 cargas e absorver 100% de dano nos próximos 3 hits', () => {
      player.executeActiveBrooch('brooch_active_shield', { x: 100, y: 100 });
      expect(player.activeShieldCharges).toBe(3);

      const initialHp = player.attributes.hp;

      // Primeiro hit - absorvido
      player.takeDamage({
        totalDamage: 40,
        damageType: 'physical',
        isCritical: false,
        direction: new Vector2D(1, 0),
        attacker: player
      });
      expect(player.attributes.hp).toBe(initialHp);
      expect(player.activeShieldCharges).toBe(2);

      // Segundo hit - absorvido
      player.takeDamage({
        totalDamage: 40,
        damageType: 'physical',
        isCritical: false,
        direction: new Vector2D(1, 0),
        attacker: player
      });
      expect(player.attributes.hp).toBe(initialHp);
      expect(player.activeShieldCharges).toBe(1);

      // Terceiro hit - absorvido
      player.takeDamage({
        totalDamage: 40,
        damageType: 'physical',
        isCritical: false,
        direction: new Vector2D(1, 0),
        attacker: player
      });
      expect(player.attributes.hp).toBe(initialHp);
      expect(player.activeShieldCharges).toBe(0);

      // Quarto hit - agora recebe dano real! (forçamos dodge = 0 para eliminar ruído estocástico)
      (player.attributes as any)._bonusDodge = -999;
      player.takeDamage({
        totalDamage: 50,
        damageType: 'physical',
        isCritical: false,
        direction: new Vector2D(1, 0),
        attacker: player
      });
      expect(player.attributes.hp).toBeLessThan(initialHp);
    });

    it('[Dados da Fortuna] deve potencializar esquiva e decair via Zero-GC no update', () => {
      player.executeActiveBrooch('brooch_active_luck', { x: 100, y: 100 });
      expect(player.fortuneBuffTimer).toBe(10.0);

      player.update(4.0);
      expect(player.fortuneBuffTimer).toBeCloseTo(6.0, 1);

      player.update(6.5);
      expect(player.fortuneBuffTimer).toBe(0);
    });

    it('[Botas Aladas] deve resetar recarga de dash e aplicar surge de velocidade', () => {
      (player as any).isDashing = true;
      player.executeActiveBrooch('brooch_active_dash', { x: 100, y: 100 });
      expect((player as any).isDashing).toBe(false);
      expect(player.dashSurgeTimer).toBe(2.5);

      player.update(0.5);
      expect(player.dashSurgeTimer).toBeCloseTo(2.0, 1);
    });

    it('[Fúria do Berserker] deve infligir +50% de dano e anular a defesa do jogador por 8 segundos', () => {
      player.executeActiveBrooch('brooch_active_berserk', { x: 100, y: 100 });
      expect(player.berserkTimer).toBe(8.0);

      const targetAttributes = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
      targetAttributes.dodge = -100;
      const target = new Player(2, { x: 120, y: 100 }, targetAttributes, eventManager);

      const attack = new Attack(player, 40, 'physical');
      const targetHpBefore = target.attributes.hp;
      attack.execute(target, new Vector2D(1, 0));

      const damageDealt = targetHpBefore - target.attributes.hp;
      // Dano base 40 + scaling de Força (5) = 45 * 1.5 (berserk) = 67.5 -> 67 - defesa
      expect(damageDealt).toBeGreaterThan(45);
    });

    it('[O Broche Azul - Estase Cósmica] deve ficar azul (#00E5FF), imune a dano/status e resetar todos os cooldowns por 4s', () => {
      // 1. Simula habilidades em cooldown
      player.setSkillCooldown('skill_fireball', 20000);
      player.setSkillCooldown('skill_dash', 8000);
      expect(player.isSkillOnCooldown('skill_fireball')).toBe(true);
      expect(player.isSkillOnCooldown('skill_dash')).toBe(true);

      // 2. Executa o Broche Azul
      player.executeActiveBrooch('brooch_active_astral', { x: 100, y: 100 });

      // Deve ter resetado os cooldowns
      expect(player.isSkillOnCooldown('skill_fireball')).toBe(false);
      expect(player.isSkillOnCooldown('skill_dash')).toBe(false);

      // Deve ter aplicado o visual azul (Forma Cósmica)
      expect(player.visualTint).toBe('#00E5FF');

      // 3. Imunidade total a dano
      const initialHp = player.attributes.hp;
      (player.attributes as any)._bonusDodge = -999; // Força sem esquiva aleatória
      player.takeDamage({
        totalDamage: 999,
        damageType: 'true',
        isCritical: true,
        direction: new Vector2D(0, 1),
        attacker: player
      });
      expect(player.attributes.hp).toBe(initialHp);

      // 4. Imunidade total a status (ex: stun)
      player.applyStatus(new StunStatus(5.0));
      expect(player.activeStatuses.has('stun')).toBe(false);

      // 5. Após 4 segundos, a forma astral dissipa
      player.update(4.1);
      expect(player.visualTint).toBeUndefined();

      // Agora volta a tomar dano
      player.takeDamage({
        totalDamage: 30,
        damageType: 'true',
        isCritical: false,
        direction: new Vector2D(0, 1),
        attacker: player
      });
      expect(player.attributes.hp).toBeLessThan(initialHp);
    });
  });

  describe('Broches Passivos (Passive Loadout)', () => {
    it('[Broche da Fênix] deve ressuscitar o jogador com 50% de HP ao receber dano letal', () => {
      player.equipPassiveInLoadout('brooch_phoenix', 0);
      expect(player.hasPassiveBrooch('brooch_phoenix')).toBe(true);

      player.attributes.hp = 10;
      player.attributes.dodge = -999;
      const initialMaxHp = player.attributes.maxHp;

      // Dano letal
      player.takeDamage({
        totalDamage: 9999,
        damageType: 'true',
        isCritical: false,
        direction: new Vector2D(0, 1),
        attacker: player
      });

      expect(player.state).not.toBe('dead');
      expect(player.attributes.hp).toBe(Math.round(initialMaxHp * 0.5));
      expect(player.phoenixUsedThisRun).toBe(true);

      // Segundo dano letal na mesma run mata de verdade
      player.takeDamage({
        totalDamage: 9999,
        damageType: 'true',
        isCritical: false,
        direction: new Vector2D(0, 1),
        attacker: player
      });

      expect(player.attributes.hp).toBeLessThanOrEqual(0);
      expect(player.state).toBe('dead');
    });

    it('[Broche do Titã] deve conceder imunidade total a Stun e Knockback', () => {
      player.equipPassiveInLoadout('brooch_titan', 1);

      // Tenta aplicar stun
      player.applyStatus(new StunStatus(3));
      expect(player.activeStatuses.has('stun')).toBe(false);

      // Tenta aplicar knockback via takeDamage
      const oldAccelX = (player as any).accelerator.x;
      player.takeDamage({
        totalDamage: 10,
        damageType: 'physical',
        isCritical: false,
        direction: new Vector2D(5, 0),
        attacker: player
      });

      expect((player as any).accelerator.x).toBe(0);
    });

    it('[Broche das Sombras] deve conceder furtividade e inalvejabilidade por 3s após um dash', () => {
      player.equipPassiveInLoadout('brooch_shadow', 2);

      // Executa dash
      (player as any).dashToDirection(new Vector2D(1, 0));
      expect(player.shadowStealthTimer).toBe(3.0);

      // Durante o stealth, o jogador esquiva / não toma dano
      const initialHp = player.attributes.hp;
      const damageDealt = player.takeDamage({
        totalDamage: 50,
        damageType: 'physical',
        isCritical: false,
        direction: new Vector2D(1, 0),
        attacker: player
      });

      expect(damageDealt).toBe(0);
      expect(player.attributes.hp).toBe(initialHp);

      // Atualiza 3.1s para dissipar o stealth
      player.update(3.1);
      expect(player.shadowStealthTimer).toBe(0);
    });

    it('[Dente do Vampiro] deve curar 5% do HP máximo sempre que desferir dano crítico', () => {
      player.equipPassiveInLoadout('brooch_vampiric', 3);
      player.attributes.critChance = 100; // Força crítico
      player.attributes.hp = 10;
      const initialHp = player.attributes.hp;

      const targetAttributes = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
      const target = new Player(3, { x: 120, y: 100 }, targetAttributes, eventManager);

      const attack = new Attack(player, 20, 'physical');
      attack.execute(target, new Vector2D(1, 0));

      const expectedHeal = Math.round(player.attributes.maxHp * 0.05);
      expect(player.attributes.hp).toBe(initialHp + expectedHeal);
    });

    it('[Ampulheta do Destino] deve permitir roletar recompensas de nível até 3 vezes', () => {
      player.equipPassiveInLoadout('brooch_reroll_master', 0);
      expect(player.rerollChargesRemaining).toBe(3);

      const reroll1 = player.classManager.rerollLevelUpChoices();
      expect(reroll1).toBe(true);
      expect(player.rerollChargesRemaining).toBe(2);

      const reroll2 = player.classManager.rerollLevelUpChoices();
      expect(reroll2).toBe(true);
      expect(player.rerollChargesRemaining).toBe(1);

      const reroll3 = player.classManager.rerollLevelUpChoices();
      expect(reroll3).toBe(true);
      expect(player.rerollChargesRemaining).toBe(0);

      // Quarta tentativa esgotada
      const reroll4 = player.classManager.rerollLevelUpChoices();
      expect(reroll4).toBe(false);
    });
  });
});
