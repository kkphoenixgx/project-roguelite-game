import { describe, it, expect, beforeEach } from 'vitest';
import { EventHandler } from '../../../domain/eventDispacher/eventDispacher';
import Player from '../../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../../domain/ObjectModule/Entities/Attributes';
import TemplateEnemyTemplate from '../../../domain/templates/EnemyTemplate';
import AttackBuilder from '../../../domain/templates/AttackBuilder';
import {
  OrbitalAttackTemplate,
  SweepingArcAttackTemplate,
  ChanneledBeamAttackTemplate,
  NovaBurstAttackTemplate
} from '../../../domain/templates/attacks';

describe('Attack Templates - Geometrias e Cinemáticas Avançadas de Ataque', () => {
  let eventManager: EventHandler;
  let player: Player;
  let enemy1: TemplateEnemyTemplate;
  let enemy2: TemplateEnemyTemplate;

  beforeEach(() => {
    eventManager = new EventHandler();
    // hpDiceFaces: 1, level: 10, strength: 20, constitution: 10, dexterity: 30
    const playerAttrs = new Attributes(1, 10, 20, 10, 30, 10, 10, 10);
    player = new Player(1, { x: 100, y: 100 }, playerAttrs, eventManager);

    const enemyAttrs1 = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
    enemy1 = new TemplateEnemyTemplate(2, 1, 10, { x: 160, y: 100 }, enemyAttrs1, eventManager);

    const enemyAttrs2 = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
    enemy2 = new TemplateEnemyTemplate(3, 1, 10, { x: 250, y: 250 }, enemyAttrs2, eventManager);

    // Sistema de vizinhos espaciais mockado para os testes
    eventManager.on('requestNeighbors', (ev) => {
      if (ev.callback && ev.coordinates) {
        const queryCoords = ev.coordinates;
        const queryRadius = ev.radius;
        const result: any[] = [];

        for (const candidate of [enemy1, enemy2]) {
          const cx = candidate.coordinates.x + candidate.size.width / 2;
          const cy = candidate.coordinates.y + candidate.size.height / 2;
          const dist = Math.hypot(cx - queryCoords.x, cy - queryCoords.y);
          if (dist <= queryRadius + 20) {
            result.push(candidate);
          }
        }
        ev.callback(result);
      }
    });
  });

  describe('1. OrbitalAttackTemplate (Redemoinho / Lâmina Giratória Orbital)', () => {
    it('deve escalar velocidade angular por destreza e raio por força', () => {
      const whirlwind = OrbitalAttackTemplate.create('blade_spin', 'Dança das Lâminas', (owner) => {
        return AttackBuilder.create(owner)
          .withBaseDamage(40)
          .asPhysical()
          .build();
      })
        .withBaseRadius(60)
        .withStrengthRadiusScaling(1.5) // 20 força * 1.5 = +30 -> raio total = 90
        .withAngularSpeed(Math.PI * 2) // 1 volta/s base (6.283 rad/s)
        .withDexterityScaling(0.1) // 30 destreza * 0.1 = +3 rad/s
        .withRotations(2)
        .withHitboxRadius(25)
        .withTargetHitCooldown(200)
        .withKnockbackMode('tangential');

      const active = whirlwind.applyTo(player, eventManager, 0);

      // Verificação do raio escalado: 60 base + (20 str * 1.5) = 90
      expect(active.radius).toBe(90);

      // Verificação da velocidade angular escalada: 2*PI (~6.283) + (30 dex * 0.1) = ~9.283
      expect(active.angularSpeed).toBeCloseTo(Math.PI * 2 + 3.0, 3);

      expect(active.isFinished).toBe(false);
    });

    it('deve causar dano ao inimigo na passagem da lâmina e respeitar cooldown por alvo', () => {
      let hitsCount = 0;
      const initialHp = enemy1.attributes.hp;

      const whirlwind = OrbitalAttackTemplate.create('blade_spin', 'Dança das Lâminas', (owner) => {
        return AttackBuilder.create(owner)
          .withBaseDamage(20)
          .asPhysical()
          .build();
      })
        .withBaseRadius(60)
        .withAngularSpeed(Math.PI)
        .withRotations(3)
        .withHitboxRadius(30)
        .withTargetHitCooldown(500) // 500ms antes de atingir o mesmo inimigo de novo
        .withKnockbackMode('radial')
        .onHit(() => {
          hitsCount++;
        });

      // Spawn apontando exatamente na direção do inimigo1 (ângulo 0 rad = eixo X positivo)
      const active = whirlwind.applyTo(player, eventManager, 0);

      // Frame 1: Lâmina passa e atinge o inimigo1
      active.update(0.01);
      expect(hitsCount).toBe(1);
      expect(enemy1.attributes.hp).toBeLessThan(initialHp);

      const hpAfterHit1 = enemy1.attributes.hp;

      // Frame 2 logo em seguida (delta minúsculo): não deve tomar novo dano devido ao cooldown por alvo
      active.update(0.01);
      expect(hitsCount).toBe(1);
      expect(enemy1.attributes.hp).toBe(hpAfterHit1);
    });

    it('deve finalizar após completar a quantidade definida de rotações', () => {
      let completedCalled = false;

      const whirlwind = OrbitalAttackTemplate.create('blade_spin_finish', 'Giro Rápido', (owner) =>
        AttackBuilder.create(owner).withBaseDamage(10).build()
      )
        .withBaseRadius(50)
        .withAngularSpeed(Math.PI * 2) // 1 volta/s
        .withDexterityScaling(0)
        .withRotations(1) // 1 volta exata
        .onComplete(() => {
          completedCalled = true;
        });

      const active = whirlwind.applyTo(player, eventManager, 0);

      // Meia volta (0.5s = PI radianos)
      active.update(0.5);
      expect(active.isFinished).toBe(false);
      expect(completedCalled).toBe(false);

      // Volta completa (mais 0.55s)
      active.update(0.55);
      expect(active.isFinished).toBe(true);
      expect(completedCalled).toBe(true);
    });
  });

  describe('2. SweepingArcAttackTemplate (Corte em Arco / Cleave)', () => {
    it('deve acelerar o tempo de varredura com destreza e atingir inimigos no caminho', () => {
      let hitTarget: any = null;
      let completed = false;

      const cleave = SweepingArcAttackTemplate.create('heavy_cleave', 'Corte Transversal', (owner) => {
        return AttackBuilder.create(owner)
          .withBaseDamage(35)
          .asPhysical()
          .build();
      })
        .withArcAngleDegrees(135) // 135 graus
        .withRadius(70)
        .withDuration(0.3) // 0.3s base
        .withDexterityScaling(0.01) // +1% velocidade por destreza (30 dex = +30% velocidade)
        .onHit((ctx) => {
          hitTarget = ctx.target;
        })
        .onComplete(() => {
          completed = true;
        });

      // Mira para a direita (0 rad), o arco varre de -0.375*PI a +0.375*PI passando por 0 (onde está enemy1)
      const arc = cleave.sweep(player, 0, eventManager);

      const expectedDuration = 0.3 / (1 + (30 * 0.01)); // ~0.2307s
      expect(arc.finalDuration).toBeCloseTo(expectedDuration, 3);
      expect(arc.finalDuration).toBeLessThan(0.3);

      // Atualiza metade do tempo
      arc.update(0.12);
      expect(hitTarget).toBe(enemy1);
      expect(arc.isFinished).toBe(false);

      // Conclui a varredura
      arc.update(0.15);
      expect(arc.isFinished).toBe(true);
      expect(completed).toBe(true);
    });
  });

  describe('3. ChanneledBeamAttackTemplate (Raio Canalizado / Laser Contínuo)', () => {
    it('deve emitir ticks contínuos e rotacionar suavemente em direção ao mouse', () => {
      let tickCount = 0;
      let channelEnded = false;

      const deathRay = ChanneledBeamAttackTemplate.create('void_beam', 'Raio do Vazio', (owner) => {
        return AttackBuilder.create(owner)
          .withBaseDamage(15)
          .asMagical()
          .build();
      })
        .withLength(200)
        .withWidth(30)
        .withTickInterval(0.1) // 10 ticks por segundo
        .withMaxChannelDuration(0.5) // 0.5s de canalização
        .withTurnRateDegreesPerSec(180) // 180 graus por segundo = PI rad/s
        .onHit(() => {
          tickCount++;
        })
        .onChannelEnd(() => {
          channelEnded = true;
        });

      // Inicia apontado para a direita (0 rad) onde está enemy1
      const beam = deathRay.channel(player, 0, eventManager);

      // Define mira levemente inclinada
      beam.setTargetAngle(0.1);

      // Roda um frame de 0.15s: deve executar pelo menos 1 tick de impacto
      beam.update(0.15);
      expect(tickCount).toBeGreaterThanOrEqual(1);
      expect(beam.isActive).toBe(true);

      // Avança além de 0.5s para expirar a canalização
      beam.update(0.4);
      expect(beam.isActive).toBe(false);
      expect(channelEnded).toBe(true);
    });
  });

  describe('4. NovaBurstAttackTemplate (Onda Expansiva / Explosão Circular)', () => {
    it('deve expandir do raio inicial até o máximo e atingir inimigos no anel', () => {
      let novaHitTarget: any = null;
      let novaCompleted = false;

      const shockwave = NovaBurstAttackTemplate.create('earth_shatter', 'Onda Sísmica', (owner) => {
        return AttackBuilder.create(owner)
          .withBaseDamage(50)
          .asPhysical()
          .build();
      })
        .withStartRadius(10)
        .withMaxRadius(150)
        .withExpansionSpeed(300) // 300 px/s -> leva ~0.46s para atingir 150px
        .withRingThickness(25)
        .onHit((ctx) => {
          novaHitTarget = ctx.target;
        })
        .onComplete(() => {
          novaCompleted = true;
        });

      // Emite a partir do centro do jogador (100, 100). Inimigo1 está em (160, 100) -> dist ~60px
      const centerCoords = {
        x: player.coordinates.x + player.size.width / 2,
        y: player.coordinates.y + player.size.height / 2
      };
      const burst = shockwave.triggerAt(centerCoords, player, eventManager);

      // Frame 1: expande 30px (raio 40px) -> ainda não alcançou o inimigo a 60px
      burst.update(0.1);
      expect(burst.currentRadius).toBe(40);
      expect(burst.isFinished).toBe(false);

      // Frame 2: expande mais 30px (raio 70px) -> alcança o inimigo (dist 60px cai na espessura de 25px)
      burst.update(0.1);
      expect(burst.currentRadius).toBe(70);
      expect(novaHitTarget).toBe(enemy1);

      // Frame 3: expande além de 150px para finalizar
      burst.update(0.35);
      expect(burst.isFinished).toBe(true);
      expect(novaCompleted).toBe(true);
    });
  });
});
