import Class from "../ObjectModule/Entities/Player/Classes/Class";
import Skill from "../Skills/Skill";
import type IXPTable from "../ObjectModule/Entities/IXPTable";
import type { IPlayer } from "../ports/domain-contracts";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import Vector2D from "../shared/Vector2D";
import AttackBuilder from "./AttackBuilder";

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: CLASSE DO JOGADOR (Player Class Template)
 * ==============================================================================
 * Regras Obrigatórias para quem está criando uma nova Classe:
 * 1. Estenda a classe abstrata `Class`.
 * 2. No construtor:
 *    - Chame `super('NomeDaClasse', xpTable, player, eventManager)`.
 *    - Popule o mapa `skillsByLevel` mapeando níveis para instâncias de `Skill`.
 *    - Tipos de skill: 'active' | 'passive' | 'rare' | 'essential' | 'attribute'.
 * 3. Implemente `executeSkill(skillId, mouseCoordinates)`:
 *    - Trate o cooldown com `(this.player as any).isSkillOnCooldown?.(skillId)`.
 *    - Use o `AttackBuilder` para criar ataques balanceados e fluentes.
 *    - Dispare eventos semânticos via `eventManager` (ex: `spawnVisual`, `particle`, `spawn`).
 * 4. Implemente os getters canônicos `getSkillForLevel(level)` e `allSkills`.
 * ==============================================================================
 */
export default class TemplatePlayerClassTemplate extends Class {
  private skillsByLevel: Map<number, Skill> = new Map();
  private lastSkillTime: number = 0;
  private readonly skillCooldown: number = 4000;

  constructor(xpTable: IXPTable, player: IPlayer, eventManager: IEventManager) {
    super('ArquetipoModelo', xpTable, player, eventManager);

    // 1. Skill Nível 1: Atributo Passivo inicial
    this.skillsByLevel.set(
      1,
      new Skill(
        'tpl_t1_focus',
        'Foco Inicial',
        'Aumenta passivamente o foco e os atributos básicos do personagem.',
        'attribute',
        1
      )
    );

    // 2. Skill Nível 4: Habilidade Ativa principal
    this.skillsByLevel.set(
      4,
      new Skill(
        'tpl_t2_burst',
        'Impacto Arquetípico',
        'Dispara uma onda de energia expansiva em direção ao cursor do mouse.',
        'active',
        2,
        'tpl_t1_focus' // Pré-requisito
      )
    );
  }

  /**
   * Ponto de execução disparado quando o jogador aciona um slot do Loadout (teclas 1 a 4)
   */
  public executeSkill(skillId: string, mouseCoordinates: { x: number; y: number }): void {
    if (skillId === 'tpl_t2_burst') {
      // 1. Verificação de Cooldown (Fail-Fast)
      if ((this.player as any).isSkillOnCooldown?.(skillId)) {
        this.eventManager.dispatch('log', {
          channel: 'domain',
          message: `[${this.name}] Habilidade em recarga!`,
          params: []
        });
        return;
      }

      const now = Date.now();
      if (now - this.lastSkillTime < this.skillCooldown) {
        return;
      }
      this.lastSkillTime = now;
      (this.player as any).setSkillCooldown?.(skillId, this.skillCooldown);

      // 2. Cálculo vetorial em direção ao mouse (Zero-GC)
      const px = this.player.coordinates.x + this.player.size.width / 2;
      const py = this.player.coordinates.y + this.player.size.height / 2;
      const dir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py).normalizeMut();

      // 3. Criação do Ataque via AttackBuilder
      const attack = AttackBuilder.create(this.player)
        .withBaseDamage(30)
        .asPhysical()
        .withStrengthScaling(0.5)
        .withDexterityScaling(0.5)
        .withKnockback(15)
        .withParticle(this.eventManager, 'slashSparks')
        .build();

      // 4. Disparo de Projétil / Magia via Barramento de Eventos
      this.eventManager.dispatch('spawn', {
        type: 'simpleBullet',
        coordinates: { x: px, y: py },
        direction: dir,
        attack: attack
      });

      this.eventManager.dispatch('log', {
        channel: 'domain',
        message: `[${this.name}] Impacto Arquetípico disparado!`,
        params: []
      });
    }
  }

  public getSkillForLevel(level: number): Skill | null {
    return this.skillsByLevel.get(level) || null;
  }

  public get allSkills(): Skill[] {
    return Array.from(this.skillsByLevel.values());
  }
}
