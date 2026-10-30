import type { IEventManager } from "../eventDispacher/IGameEvents";
import type Entity from "../ObjectModule/Entities/Entity";
import type { DamageInfo } from "../ObjectModule/Entities/Entity";

export interface TransformationStatModifiers {
  speedMultiplier?: number;
  bonusStrength?: number;
  bonusConstitution?: number;
  bonusIntelligence?: number;
  bonusDexterity?: number;
  bonusDefense?: number;
  bonusDodge?: number;
  bonusCritChance?: number;
  bonusLifesteal?: number;
}

export interface TransformationContext {
  readonly eventManager: IEventManager;
  readonly remainingDuration: number;
}

export interface TransformationAttackContext {
  readonly target: Entity;
  readonly isCritical: boolean;
  damage: number;
  readonly eventManager: IEventManager;
}

export type TransformationLifecycleHandler = (target: Entity, ctx: TransformationContext) => void;
export type TransformationTickHandler = (dt: number, target: Entity, ctx: TransformationContext) => void;
export type TransformationAttackHandler = (attackCtx: TransformationAttackContext) => void;
export type TransformationDamageHandler = (dmgInfo: DamageInfo, ctx: TransformationContext) => { absorbed?: boolean; extraDodge?: number; overrideDamageReduction?: number | undefined } | void;

export interface ITransformationDefinition {
  readonly id: string;
  readonly name: string;
  readonly duration: number; //? Duração em segundos (<= 0 para infinito até cancelamento)
  readonly visualTint?: string | undefined;
  readonly visualScale?: number | undefined;
  readonly statModifiers: TransformationStatModifiers;
  readonly immunities: readonly string[];
  readonly damageMultiplier: number;
  readonly damageReductionPercent: number;
  readonly onEnter?: TransformationLifecycleHandler | undefined;
  readonly onTick?: TransformationTickHandler | undefined;
  readonly onExit?: TransformationLifecycleHandler | undefined;
  readonly onAttack?: TransformationAttackHandler | undefined;
  readonly onTakeDamage?: TransformationDamageHandler | undefined;
}

/**
 * ==============================================================================
 * INSTÂNCIA ATIVA DE TRANSFORMAÇÃO (ActiveTransformation)
 * ==============================================================================
 * Controla o estado em tempo real da metamorfose aplicada a uma entidade,
 * gerenciando rollback automático de stats, escala, tint e listeners.
 * ==============================================================================
 */
export class ActiveTransformation {
  private _remainingDuration: number;
  private _isActive: boolean = true;
  private _originalTint?: string | undefined;
  private _originalScale?: number | undefined;

  constructor(
    public readonly definition: ITransformationDefinition,
    public readonly target: Entity,
    public readonly eventManager: IEventManager
  ) {
    this._remainingDuration = definition.duration;
    this.applyTransformation();
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get remainingDuration(): number {
    return this._remainingDuration;
  }

  private applyTransformation(): void {
    const anyTarget = this.target as any;
    if (this.definition.visualTint) {
      this._originalTint = anyTarget.visualTint;
      anyTarget.visualTint = this.definition.visualTint;
    }
    if (this.definition.visualScale) {
      this._originalScale = anyTarget.visualScale;
      anyTarget.visualScale = this.definition.visualScale;
    }

    if (this.definition.onEnter) {
      this.definition.onEnter(this.target, {
        eventManager: this.eventManager,
        remainingDuration: this._remainingDuration
      });
    }

    this.eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Transformação] ${this.target.objectId} entrou na forma '${this.definition.name}'!`,
      params: []
    });
  }

  public update(deltaTime: number): void {
    if (!this._isActive) return;

    if (this.definition.duration > 0) {
      this._remainingDuration -= deltaTime;
      if (this._remainingDuration <= 0) {
        this._remainingDuration = 0;
        this.revert();
        return;
      }
    }

    if (this.definition.onTick) {
      this.definition.onTick(deltaTime, this.target, {
        eventManager: this.eventManager,
        remainingDuration: this._remainingDuration
      });
    }
  }

  public isStatusImmune(statusId: string): boolean {
    if (!this._isActive) return false;
    return this.definition.immunities.includes(statusId);
  }

  public onTakeDamage(damageInfo: DamageInfo): { absorbed?: boolean; extraDodge?: number; overrideDamageReduction?: number | undefined } | void {
    if (!this._isActive) return undefined;
    if (this.definition.onTakeDamage) {
      return this.definition.onTakeDamage(damageInfo, {
        eventManager: this.eventManager,
        remainingDuration: this._remainingDuration
      });
    }
    return undefined;
  }

  public revert(): void {
    if (!this._isActive) return;
    this._isActive = false;

    const anyTarget = this.target as any;
    anyTarget.visualTint = this._originalTint;
    anyTarget.visualScale = this._originalScale;

    if (this.definition.onExit) {
      this.definition.onExit(this.target, {
        eventManager: this.eventManager,
        remainingDuration: 0
      });
    }

    this.eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Transformação] Forma '${this.definition.name}' dissipada.`,
      params: []
    });
  }
}

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: TRANSFORMAÇÕES E METAMORFOSES (TransformationTemplate)
 * ==============================================================================
 * Fluent Builder para criação de formas alternativas, metamorfoses e avatares.
 * Encapsula visualTint, visualScale, modificadores de stats, imunidades e hooks.
 * ==============================================================================
 */
export default class TransformationTemplate {
  private _duration: number = 10;
  private _visualTint?: string | undefined;
  private _visualScale?: number | undefined;
  private _statModifiers: TransformationStatModifiers = {};
  private _immunities: string[] = [];
  private _damageMultiplier: number = 1.0;
  private _damageReductionPercent: number = 0;
  private _onEnter?: TransformationLifecycleHandler | undefined;
  private _onTick?: TransformationTickHandler | undefined;
  private _onExit?: TransformationLifecycleHandler | undefined;
  private _onAttack?: TransformationAttackHandler | undefined;
  private _onTakeDamage?: TransformationDamageHandler | undefined;

  private constructor(private readonly _id: string, private readonly _name: string) {}

  public static create(id: string, name: string): TransformationTemplate {
    return new TransformationTemplate(id, name);
  }

  public withDuration(seconds: number): this {
    this._duration = seconds;
    return this;
  }

  public withVisualTint(colorHex: string): this {
    this._visualTint = colorHex;
    return this;
  }

  public withVisualScale(scale: number): this {
    this._visualScale = scale;
    return this;
  }

  public withStatModifiers(mods: Partial<TransformationStatModifiers>): this {
    this._statModifiers = { ...this._statModifiers, ...mods };
    return this;
  }

  public withImmunities(...statusIds: string[]): this {
    this._immunities.push(...statusIds);
    return this;
  }

  public withDamageMultiplier(multiplier: number): this {
    this._damageMultiplier = multiplier;
    return this;
  }

  public withDamageReduction(percent: number): this {
    this._damageReductionPercent = percent;
    return this;
  }

  public onEnter(handler: TransformationLifecycleHandler): this {
    this._onEnter = handler;
    return this;
  }

  public onTick(handler: TransformationTickHandler): this {
    this._onTick = handler;
    return this;
  }

  public onExit(handler: TransformationLifecycleHandler): this {
    this._onExit = handler;
    return this;
  }

  public onAttack(handler: TransformationAttackHandler): this {
    this._onAttack = handler;
    return this;
  }

  public onTakeDamage(handler: TransformationDamageHandler): this {
    this._onTakeDamage = handler;
    return this;
  }

  public build(): ITransformationDefinition {
    return {
      id: this._id,
      name: this._name,
      duration: this._duration,
      visualTint: this._visualTint,
      visualScale: this._visualScale,
      statModifiers: { ...this._statModifiers },
      immunities: [...this._immunities],
      damageMultiplier: this._damageMultiplier,
      damageReductionPercent: this._damageReductionPercent,
      onEnter: this._onEnter,
      onTick: this._onTick,
      onExit: this._onExit,
      onAttack: this._onAttack,
      onTakeDamage: this._onTakeDamage
    };
  }

  public applyTo(target: Entity, eventManager: IEventManager): ActiveTransformation {
    return new ActiveTransformation(this.build(), target, eventManager);
  }
}
