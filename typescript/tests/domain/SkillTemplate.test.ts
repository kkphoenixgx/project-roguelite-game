import { describe, it, expect, beforeEach } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import SkillTemplate from '../../domain/templates/SkillTemplate';
import AttackBuilder from '../../domain/templates/AttackBuilder';
import { OrbitalAttackTemplate } from '../../domain/templates/attacks';

describe('SkillTemplate - Padrão Canônico de Habilidades do Domínio', () => {
  let eventManager: EventHandler;
  let player: Player;

  beforeEach(() => {
    eventManager = new EventHandler();
    // hpDiceFaces: 6, level: 10, strength: 15, constitution: 10, dexterity: 15, intelligence: 20
    const attributes = new Attributes(6, 10, 15, 10, 15, 20, 10, 10);
    player = new Player(1, { x: 100, y: 100 }, attributes, eventManager);
  });

  describe('1. Construção Fluente & Conversão Canônica', () => {
    it('deve construir uma habilidade ativa e convertê-la para a entidade canônica Skill', () => {
      const template = SkillTemplate.create('fireball_skill', 'Bola de Fogo Arcana', 'Lança um projétil de fogo devastador.')
        .asActive(2, 3500)
        .withManaCost(25)
        .withRequiredLevel(4)
        .withPrerequisite('magic_spark')
        .withKeybind('spell_1')
        .withIcon('icon_fireball');

      const def = template.build();
      expect(def.id).toBe('fireball_skill');
      expect(def.type).toBe('active');
      expect(def.tier).toBe(2);
      expect(def.cooldownMs).toBe(3500);
      expect(def.manaCost).toBe(25);
      expect(def.requiredLevel).toBe(4);
      expect(def.requiredSkillId).toBe('magic_spark');
      expect(def.keybind).toBe('spell_1');
      expect(def.iconId).toBe('icon_fireball');

      // Conversão para a entidade Skill da árvore de talentos
      const domainSkill = template.toSkill();
      expect(domainSkill.id).toBe('fireball_skill');
      expect(domainSkill.name).toBe('Bola de Fogo Arcana');
      expect(domainSkill.type).toBe('active');
      expect(domainSkill.tier).toBe(2);
      expect(domainSkill.requiredSkillId).toBe('magic_spark');
      expect(domainSkill.keybind).toBe('spell_1');
    });

    it('deve construir habilidades passivas e de atributo sem custo de mana ou cooldown', () => {
      const ironSkin = SkillTemplate.create('iron_skin', 'Pele de Ferro', 'Aumenta a armadura passiva.')
        .asPassive(1)
        .withRequiredLevel(2);

      const def = ironSkin.build();
      expect(def.type).toBe('passive');
      expect(def.cooldownMs).toBe(0);
      expect(def.manaCost).toBe(0);
    });
  });

  describe('2. Validação e Consumo de Recursos (Mana, HP e Cooldown)', () => {
    it('deve bloquear a execução se o jogador não possuir mana suficiente', () => {
      let executed = false;
      const costlySkill = SkillTemplate.create('meteor_strike', 'Chuva de Meteoros', 'Invoca meteoros')
        .asActive(3, 5000)
        .withManaCost(999) // Mana maior que o máximo do jogador
        .onExecute(() => {
          executed = true;
        });

      const success = costlySkill.execute(player, eventManager, { x: 200, y: 200 });
      expect(success).toBe(false);
      expect(executed).toBe(false);
    });

    it('deve bloquear a execução se a habilidade estiver em tempo de recarga', () => {
      let executeCount = 0;
      const quickSlash = SkillTemplate.create('quick_slash', 'Golpe Rápido', 'Corte ágil')
        .asActive(1, 4000)
        .withManaCost(5)
        .onExecute(() => {
          executeCount++;
        });

      // Primeiro disparo com sucesso
      const success1 = quickSlash.execute(player, eventManager, { x: 150, y: 100 });
      expect(success1).toBe(true);
      expect(executeCount).toBe(1);
      expect(player.isSkillOnCooldown('quick_slash')).toBe(true);

      // Segundo disparo bloqueado por cooldown
      const success2 = quickSlash.execute(player, eventManager, { x: 150, y: 100 });
      expect(success2).toBe(false);
      expect(executeCount).toBe(1);
    });

    it('deve deduzir mana e vida corretamente quando configurado e invocar o handler', () => {
      let capturedDirection: any = null;
      const bloodPact = SkillTemplate.create('blood_pact', 'Pacto Carmesim', 'Troca vida e mana por poder')
        .asActive(1, 1000)
        .withManaCost(10)
        .withHpCost(15)
        .onExecute((ctx) => {
          capturedDirection = ctx.direction;
        });

      const initialMana = player.attributes.mana;
      const initialHp = player.attributes.hp;

      // Executa mirando à direita (x=300, y=playerCenter.y)
      const cy = player.coordinates.y + player.size.height / 2;
      const success = bloodPact.execute(player, eventManager, { x: 300, y: cy });

      expect(success).toBe(true);
      expect(player.attributes.mana).toBe(initialMana - 10);
      expect(player.attributes.hp).toBe(initialHp - 15);
      expect(capturedDirection.x).toBeCloseTo(1.0, 2);
      expect(capturedDirection.y).toBeCloseTo(0.0, 2);
    });
  });

  describe('3. Integração com Templates de Ataque (Orbital / Whirlwind)', () => {
    it('deve disparar um OrbitalAttackTemplate diretamente a partir do SkillTemplate', () => {
      let orbitalDispatched = false;

      const whirlwindSkill = SkillTemplate.create('warrior_cyclone', 'Ciclone de Aço', 'Gira uma lâmina mortal em volta do corpo')
        .asActive(2, 3000)
        .withManaCost(15)
        .onExecute((ctx) => {
          const spin = OrbitalAttackTemplate.create('cyclone_blade', 'Lâmina do Ciclone', (owner) => {
            return AttackBuilder.create(owner)
              .withBaseDamage(35)
              .asPhysical()
              .build();
          })
            .withBaseRadius(70)
            .withRotations(2)
            .withAngularSpeed(Math.PI * 2)
            .withKnockbackMode('tangential');

          const active = spin.applyTo(ctx.player as any, ctx.eventManager, 0);
          expect(active.radius).toBe(70);
          expect(active.isFinished).toBe(false);
          orbitalDispatched = true;
        });

      const success = whirlwindSkill.execute(player, eventManager, { x: 100, y: 100 });
      expect(success).toBe(true);
      expect(orbitalDispatched).toBe(true);
    });

    it('deve bloquear a execução quando a habilidade exige arma na mão principal e o jogador está desarmado', () => {
      let executed = false;
      const armedSkill = SkillTemplate.create('armed_strike', 'Golpe Armado', 'Exige arma na mão principal')
        .asActive(1, 1000)
        .withMainHandWeaponRequired(true)
        .onExecute(() => {
          executed = true;
        });

      // Jogador sem arma na mão principal
      expect(player.equipment.mainHand).toBeUndefined();
      const successNoWeapon = armedSkill.execute(player, eventManager, { x: 100, y: 100 });
      expect(successNoWeapon).toBe(false);
      expect(executed).toBe(false);

      // Equipa uma arma na mão principal
      player.equipment.mainHand = { name: 'Pistola', unlocksClass: 'Gunslinger' } as any;
      const successWithWeapon = armedSkill.execute(player, eventManager, { x: 100, y: 100 });
      expect(successWithWeapon).toBe(true);
      expect(executed).toBe(true);
    });
  });
});
