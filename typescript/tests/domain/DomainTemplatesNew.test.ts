import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import Vector2D from '../../domain/shared/Vector2D';
import StunStatus from '../../domain/ObjectModule/Entities/Status/StunStatus';
import BurnStatus from '../../domain/ObjectModule/Entities/Status/BurnStatus';
import AttackBuilder from '../../domain/templates/AttackBuilder';
import TransformationTemplate from '../../domain/templates/TransformationTemplate';
import SummonTemplate from '../../domain/templates/SummonTemplate';
import GroundHazardTemplate from '../../domain/templates/GroundHazardTemplate';
import SynergyReactionTemplate, { SynergyReactionRegistry } from '../../domain/templates/SynergyReactionTemplate';
import TemplateEnemyTemplate from '../../domain/templates/EnemyTemplate';

describe('Novos Templates Arquiteturais do Domínio', () => {
  let eventManager: EventHandler;
  let player: Player;

  beforeEach(() => {
    eventManager = new EventHandler();
    const attributes = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
    player = new Player(1, { x: 100, y: 100 }, attributes, eventManager);
  });

  describe('1. TransformationTemplate (Metamorfoses, Avatares e Buffs)', () => {
    it('deve aplicar tint, escala e reverter automaticamente após a duração', () => {
      let enterTriggered = false;
      let exitTriggered = false;

      const avatarTemplate = TransformationTemplate.create('avatar_celestial', 'Avatar Celestial')
        .withDuration(3.0)
        .withVisualTint('#FFD700')
        .withVisualScale(1.8)
        .withImmunities('stun', 'freeze')
        .withDamageMultiplier(2.0)
        .onEnter(() => { enterTriggered = true; })
        .onExit(() => { exitTriggered = true; });

      const transform = avatarTemplate.applyTo(player, eventManager);

      expect(enterTriggered).toBe(true);
      expect((player as any).visualTint).toBe('#FFD700');
      expect((player as any).visualScale).toBe(1.8);
      expect(transform.isStatusImmune('stun')).toBe(true);
      expect(transform.isStatusImmune('poison')).toBe(false);

      // Avança o tempo
      transform.update(1.5);
      expect(transform.isActive).toBe(true);
      expect((player as any).visualTint).toBe('#FFD700');

      // Expirar a duração
      transform.update(1.6);
      expect(transform.isActive).toBe(false);
      expect(exitTriggered).toBe(true);
      expect((player as any).visualTint).toBeUndefined();
      expect((player as any).visualScale).toBeUndefined();
    });
  });

  describe('2. SummonTemplate (Lacaios, Totens e Pets)', () => {
    it('deve criar lacaio vinculado ao mestre e perseguir inimigos no raio', () => {
      let summonDeathCalled = false;

      const minionTemplate = SummonTemplate.create('wolf_companion', 'Lobo Espiritual')
        .withMaxHealth(80)
        .withSpeed(120)
        .withDuration(15)
        .withBehavior('aggressive')
        .withAttackBehavior((summon) => {
          return AttackBuilder.create(summon)
            .withBaseDamage(25)
            .asPhysical()
            .build();
        }, 1000, 150)
        .onDeath(() => { summonDeathCalled = true; });

      const wolf = minionTemplate.spawn(player, { x: 120, y: 100 }, eventManager);

      expect(wolf.master).toBe(player);
      expect(wolf.attributes.maxHp).toBe(80);
      expect(wolf.attributes.hp).toBe(80);
      expect(wolf.objectId).toBe('summon');

      // Simula dano letal no lacaio
      wolf.takeDamage({
        totalDamage: 999,
        damageType: 'true',
        isCritical: false,
        direction: new Vector2D(0, 0),
        attacker: wolf
      });

      wolf.update(0.1);
      expect(wolf.state).toBe('dead');
      expect(summonDeathCalled).toBe(true);
    });
  });

  describe('3. GroundHazardTemplate (Zonas de Efeito e Santuários de Solo)', () => {
    it('deve criar área no solo com ticks periódicos aplicando dano a inimigos', () => {
      let ticksCount = 0;

      const poisonPool = GroundHazardTemplate.create('acid_pool', 'Poça Ácida')
        .withRadius(100)
        .withDuration(4.0)
        .withTickInterval(1.0)
        .withDamage(35, 'magical')
        .withTargetFilter('enemies')
        .onTick(() => { ticksCount++; });

      const targetAttr = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
      const enemy = new TemplateEnemyTemplate(2, 1, 10, { x: 110, y: 100 }, targetAttr, eventManager);

      // Mock de requestNeighbors respondendo com o inimigo dentro do raio
      eventManager.on('requestNeighbors', (ev) => {
        if (ev.callback) {
          ev.callback([enemy]);
        }
      });

      const hazardInstance = poisonPool.spawnAt({ x: 100, y: 100 }, player, eventManager);
      const enemyHpBefore = enemy.attributes.hp;

      // Avança 1 segundo -> dispara tick
      hazardInstance.update(1.05);

      expect(ticksCount).toBe(1);
      expect(enemy.attributes.hp).toBeLessThan(enemyHpBefore);

      // Avança até o fim da duração
      hazardInstance.update(3.0);
      expect(hazardInstance.isDestroyed).toBe(true);
    });
  });

  describe('4. SynergyReactionTemplate (Sinergias e Reações Elementais)', () => {
    it('deve detonar Evaporação Explosiva ao combinar Burn + Wet', () => {
      let reactionTriggered = false;

      // Inimigo com BurnStatus
      const targetAttr = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
      const enemy = new TemplateEnemyTemplate(3, 1, 10, { x: 200, y: 200 }, targetAttr, eventManager);

      enemy.applyStatus(new BurnStatus(5.0, player));
      expect(enemy.activeStatuses.has('burn')).toBe(true);

      const customReaction = SynergyReactionTemplate.create('custom_vaporize', 'Evaporação Teste')
        .between('burn', 'wet')
        .withExtraDamage(50, 'magical')
        .withConsumesStatus(true, true)
        .onTrigger(() => { reactionTriggered = true; });

      customReaction.register();

      const enemyHpBefore = enemy.attributes.hp;

      // Aplica o elemento 'wet'
      const reacted = SynergyReactionRegistry.evaluateStatusApplication(enemy, 'wet', eventManager);

      expect(reacted).toBe(true);
      expect(reactionTriggered).toBe(true);
      // Status consumidos na reação
      expect(enemy.activeStatuses.has('burn')).toBe(false);
      // Dano extra aplicado
      expect(enemy.attributes.hp).toBeLessThan(enemyHpBefore);
    });
  });
});
