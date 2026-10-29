import Class from "../ObjectModule/Entities/Player/Classes/Class";
import Skill from "../Skills/Skill";
import type IXPTable from "../ObjectModule/Entities/IXPTable";
import type { IPlayer } from "../ports/domain-contracts";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import Vector2D from "../shared/Vector2D";
import AttackBuilder from "./AttackBuilder";

/**
 * ==============================================================================
 * BUILDER DE HABILIDADES DE CLASSE (ClassSkillBuilder)
 * ==============================================================================
 * Permite definir habilidades completas com custos de mana, cooldowns,
 * áreas de efeito, tiros, invocações ou buffs de forma expressiva e fluente.
 * ==============================================================================
 */
export type SkillExecutionHandler = (ctx: {
  player: IPlayer;
  eventManager: IEventManager;
  mouseCoords: { x: number; y: number };
  playerCenter: { x: number; y: number };
  direction: Vector2D;
}) => void;

export class ClassSkillBuilder {
  private _id: string;
  private _name: string;
  private _description: string;
  private _type: 'active' | 'passive' | 'rare' | 'essential' | 'attribute' = 'active';
  private _tier: number = 1;
  private _prerequisite?: string;
  private _cooldownMs: number = 0;
  private _manaCost: number = 0;
  private _handler?: SkillExecutionHandler;

  private constructor(id: string, name: string, description: string) {
    this._id = id;
    this._name = name;
    this._description = description;
  }

  public static create(id: string, name: string, description: string): ClassSkillBuilder {
    return new ClassSkillBuilder(id, name, description);
  }

  public asActive(tier: number = 1, cooldownMs: number = 2000): this {
    this._type = 'active';
    this._tier = tier;
    this._cooldownMs = cooldownMs;
    return this;
  }

  public asPassive(tier: number = 1): this {
    this._type = 'passive';
    this._tier = tier;
    return this;
  }

  public asEssential(tier: number = 1, cooldownMs: number = 1000): this {
    this._type = 'essential';
    this._tier = tier;
    this._cooldownMs = cooldownMs;
    return this;
  }

  public asAttribute(tier: number = 1): this {
    this._type = 'attribute';
    this._tier = tier;
    return this;
  }

  public asRare(tier: number = 2, cooldownMs: number = 5000): this {
    this._type = 'rare';
    this._tier = tier;
    this._cooldownMs = cooldownMs;
    return this;
  }

  public withPrerequisite(prerequisiteSkillId: string): this {
    this._prerequisite = prerequisiteSkillId;
    return this;
  }

  public withCooldown(ms: number): this {
    this._cooldownMs = Math.max(0, ms);
    return this;
  }

  public withManaCost(cost: number): this {
    this._manaCost = Math.max(0, cost);
    return this;
  }

  /**
   * Define o comportamento executável da habilidade no combate
   */
  public onExecute(handler: SkillExecutionHandler): this {
    this._handler = handler;
    return this;
  }

  public get id(): string { return this._id; }
  public get cooldownMs(): number { return this._cooldownMs; }
  public get manaCost(): number { return this._manaCost; }
  public get handler(): SkillExecutionHandler | undefined { return this._handler; }

  public buildSkill(): Skill {
    return new Skill(
      this._id,
      this._name,
      this._description,
      this._type,
      this._tier,
      this._prerequisite
    );
  }
}

/**
 * ==============================================================================
 * CLASSE BASE AVANÇADA PARA CLASSES COMPLEXAS (ComplexClassBase)
 * ==============================================================================
 * Automatiza todo o ciclo de vida de classes hiper-complexas:
 * - Registro declarativo de habilidades com custos de mana e cooldowns
 * - Roteamento automático de `executeSkill`
 * - Verificação de recarga (`isSkillOnCooldown`) integrada
 * - Tratamento de custo de mana e fail-fast
 * - Álgebra linear in-place (Zero-GC) pré-calculando direção e centros
 * ==============================================================================
 */
export abstract class ComplexClassBase extends Class {
  protected skillsByLevel: Map<number, Skill> = new Map();
  protected registeredSkillBuilders: Map<string, ClassSkillBuilder> = new Map();

  constructor(name: string, xpTable: IXPTable, player: IPlayer, eventManager: IEventManager) {
    super(name, xpTable, player, eventManager);
  }

  /**
   * Adiciona uma habilidade fluente à classe associada a um nível de progressão
   */
  protected registerSkill(level: number, builder: ClassSkillBuilder): void {
    const skill = builder.buildSkill();
    this.skillsByLevel.set(level, skill);
    this.registeredSkillBuilders.set(builder.id, builder);
  }

  /**
   * Ponto centralizado e seguro de execução de habilidades
   */
  public executeSkill(skillId: string, mouseCoordinates: { x: number; y: number }): void {
    const builder = this.registeredSkillBuilders.get(skillId);
    if (!builder) {
      this.eventManager.dispatch('log', {
        channel: 'error',
        message: `[${this.name}] Nenhuma definição registrada para a habilidade: ${skillId}`,
        params: []
      });
      return;
    }

    if (builder.cooldownMs > 0 && (this.player as any).isSkillOnCooldown?.(skillId)) {
      this.eventManager.dispatch('log', {
        channel: 'domain',
        message: `[${this.name}] ${skillId} está em recarga!`,
        params: []
      });
      return;
    }

    if (builder.manaCost > 0) {
      if (!this.player.attributes || this.player.attributes.mana < builder.manaCost) {
        this.eventManager.dispatch('log', {
          channel: 'domain',
          message: `[${this.name}] Mana insuficiente para conjurar ${skillId}!`,
          params: []
        });
        return;
      }
      this.player.attributes.mana -= builder.manaCost;
    }

    if (builder.cooldownMs > 0 && typeof (this.player as any).setSkillCooldown === 'function') {
      (this.player as any).setSkillCooldown(skillId, builder.cooldownMs);
    }

    if (builder.handler) {
      const px = this.player.coordinates.x + this.player.size.width / 2;
      const py = this.player.coordinates.y + this.player.size.height / 2;
      const dir = new Vector2D(mouseCoordinates.x - px, mouseCoordinates.y - py).normalizeMut();

      builder.handler({
        player: this.player,
        eventManager: this.eventManager,
        mouseCoords: mouseCoordinates,
        playerCenter: { x: px, y: py },
        direction: dir
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
