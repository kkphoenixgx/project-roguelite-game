import { ComplexClassBase, ClassSkillBuilder } from "./ComplexClassBase";
import type IXPTable from "../ObjectModule/Entities/IXPTable";
import type { IPlayer } from "../ports/domain-contracts";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import Vector2D from "../shared/Vector2D";
import AttackBuilder from "./AttackBuilder";

/**
 * ==============================================================================
 * EXEMPLO DE CLASSE COMPLEXA MULTI-MECÂNICA: ARCANISTA DO VÓRTICE (VortexArcanist)
 * ==============================================================================
 * Demonstra como criar uma classe avançada que combina:
 * - Habilidade 1: Disparo mágico perfurante em linha reta com knockback.
 * - Habilidade 2: Invocação de Vórtice / Buraco Negro gravitacional em área (AoE Pull).
 * - Habilidade 3: Salto Dimensional (Teletransporte / Blink) com cura e invulnerabilidade temporária.
 * - Habilidade 4: Meteoro Astral devastador com dano em área, fogo e atordoamento.
 * ==============================================================================
 */
export default class VortexArcanistTemplate extends ComplexClassBase {
  constructor(xpTable: IXPTable, player: IPlayer, eventManager: IEventManager) {
    super('ArcanistaDoVortice', xpTable, player, eventManager);

    this.registerSkill(
      1,
      ClassSkillBuilder.create('va_t1_piercing_ray', 'Raio Dimensional', 'Dispara um feixe arcano perfurante que atravessa inimigos.')
        .asEssential(1, 1500)
        .withManaCost(10)
        .onExecute(({ player, eventManager, playerCenter, direction }) => {
          const attack = AttackBuilder.create(player)
            .withBaseDamage(25)
            .asMagical()
            .withIntelligenceScaling(0.8)
            .withKnockback(10)
            .withParticle(eventManager, 'magicPulse', '#7C4DFF')
            .build();

          eventManager.dispatch('spawn', {
            type: 'simpleBullet',
            coordinates: { x: playerCenter.x, y: playerCenter.y },
            direction: direction,
            attack: attack
          });
        })
    );

    this.registerSkill(
      4,
      ClassSkillBuilder.create('va_t2_gravity_well', 'Poço de Gravidade', 'Cria um vácuo no cursor puxando todos os inimigos para o centro e causando dano contínuo.')
        .asActive(2, 6000)
        .withManaCost(35)
        .withPrerequisite('va_t1_piercing_ray')
        .onExecute(({ player, eventManager, mouseCoords }) => {
          eventManager.dispatch('spawnVisual', {
            type: 'darkPulse',
            coordinates: { x: mouseCoords.x - 64, y: mouseCoords.y - 64 },
            duration: 1.2,
            size: { width: 128, height: 128 }
          });

          eventManager.dispatch('requestNeighbors', {
            coordinates: mouseCoords,
            radius: 140,
            callback: (neighbors: any[]) => {
              const vacuumAttack = AttackBuilder.create(player)
                .withBaseDamage(40)
                .asDark()
                .withIntelligenceScaling(1.2)
                .withPull(30)
                .withSlow(2.0)
                .withParticle(eventManager, 'darkPulse')
                .build();

              for (let i = 0; i < neighbors.length; i++) {
                const target = neighbors[i]!;
                if (target.id !== player.id && 'takeDamage' in target) {
                  const toCenter = new Vector2D(
                    mouseCoords.x - (target.coordinates.x + (target.size?.width || 0) / 2),
                    mouseCoords.y - (target.coordinates.y + (target.size?.height || 0) / 2)
                  ).normalizeMut();

                  vacuumAttack.execute(target, toCenter);
                }
              }
            }
          });
        })
    );

    this.registerSkill(
      8,
      ClassSkillBuilder.create('va_t3_astral_blink', 'Translocação Astral', 'Teletransporta instantaneamente para a posição do mouse, curando parte do HP.')
        .asRare(3, 8000)
        .withManaCost(25)
        .withPrerequisite('va_t2_gravity_well')
        .onExecute(({ player, eventManager, mouseCoords, playerCenter }) => {
          eventManager.dispatch('particle', {
            effect: 'magicPulse',
            x: playerCenter.x,
            y: playerCenter.y,
            color: '#00E5FF'
          });

          player.coordinates.x = mouseCoords.x - player.size.width / 2;
          player.coordinates.y = mouseCoords.y - player.size.height / 2;

          const healAmount = 20 + Math.floor(player.attributes.intelligence * 0.5);
          player.heal(healAmount);

          eventManager.dispatch('particle', {
            effect: 'levelUp',
            x: mouseCoords.x,
            y: mouseCoords.y,
            color: '#00E5FF'
          });
        })
    );

    this.registerSkill(
      16,
      ClassSkillBuilder.create('va_t4_astral_meteor', 'Meteoro Cataclísmico', 'Invoca uma estrela cadente que colide causando destruição em massa e queimadura.')
        .asActive(4, 15000)
        .withManaCost(60)
        .withPrerequisite('va_t3_astral_blink')
        .onExecute(({ player, eventManager, mouseCoords }) => {
          eventManager.dispatch('spawnVisual', {
            type: 'fireExplosion',
            coordinates: { x: mouseCoords.x - 96, y: mouseCoords.y - 96 },
            duration: 0.8,
            size: { width: 192, height: 192 }
          });

          eventManager.dispatch('requestNeighbors', {
            coordinates: mouseCoords,
            radius: 180,
            callback: (neighbors: any[]) => {
              const meteorAttack = AttackBuilder.create(player)
                .withBaseDamage(90)
                .asFire()
                .withIntelligenceScaling(2.0)
                .withKnockback(25)
                .withBurn(5.0)
                .withStun(1.5)
                .withParticle(eventManager, 'fireExplosion', '#FF3D00')
                .build();

              for (let i = 0; i < neighbors.length; i++) {
                const target = neighbors[i]!;
                if (target.id !== player.id && 'takeDamage' in target) {
                  meteorAttack.execute(target, new Vector2D(0, 1));
                }
              }
            }
          });
        })
    );
  }
}
