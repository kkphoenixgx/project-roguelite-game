import type { IEventManager } from "../eventDispacher/IGameEvents";
import type { BroochConfig } from "../facadeComponents/MetaProgressionMap";

export interface BroochExecutionContext {
  readonly player: any;
  readonly eventManager: IEventManager;
  readonly mouseCoords: { x: number; y: number };
  readonly broochId: string;
}

export interface BroochHookContext {
  readonly player: any;
  readonly eventManager: IEventManager;
}

export interface BroochDamageHookResult {
  absorbed?: boolean;
  extraDodge?: number;
  overrideDamageReduction?: number | undefined;
  cancelKnockback?: boolean;
  preventDeath?: boolean;
}

export interface BroochStatusHookResult {
  block?: boolean;
}

export type BroochExecuteHandler = (ctx: BroochExecutionContext) => void;
export type BroochLifecycleHandler = (player: any) => void;
export type BroochDamageHook = (damageInfo: any, ctx: BroochHookContext) => BroochDamageHookResult | void;
export type BroochStatusHook = (status: any, ctx: BroochHookContext) => BroochStatusHookResult | void;
export type BroochAttackHook = (target: any, isCritical: boolean, damageDealt: number, ctx: BroochHookContext) => void;
export type BroochDamageMultiplierHook = (ctx: BroochHookContext) => number | void;
export type BroochDashHook = (ctx: BroochHookContext) => void;
export type BroochUpdateHook = (deltaTime: number, ctx: BroochHookContext) => void;
export type BroochResetHook = (ctx: BroochHookContext) => void;

export interface BroochValidationContext {
  readonly player: any;
  readonly eventManager: any;
  readonly lastResult?: any;
}

export type BroochAssertion = (ctx: BroochValidationContext) => boolean | { valid: boolean; reason?: string | undefined };

export interface IBroochDefinition extends BroochConfig {
  readonly cooldownMs: number;
  readonly onExecute?: BroochExecuteHandler | undefined;
  readonly onAttach?: BroochLifecycleHandler | undefined;
  readonly onDetach?: BroochLifecycleHandler | undefined;
  readonly onBeforeTakeDamage?: BroochDamageHook | undefined;
  readonly onBeforeApplyStatus?: BroochStatusHook | undefined;
  readonly onAfterAttack?: BroochAttackHook | undefined;
  readonly onComputeDamageMultiplier?: BroochDamageMultiplierHook | undefined;
  readonly onDash?: BroochDashHook | undefined;
  readonly onUpdate?: BroochUpdateHook | undefined;
  readonly onReset?: BroochResetHook | undefined;
  readonly assertion?: BroochAssertion | undefined;
  validate(ctx: BroochValidationContext): boolean | { valid: boolean; reason?: string | undefined };
}

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: BROCHE (ATIVO OU PASSIVO) DO DOMÍNIO
 * ==============================================================================
 * Segue o padrão de Fluent Builder para criar e registrar novos broches ancestrais
 * de meta-progressão no jogo, com Zero-GC no hot path e suporte a recargas e efeitos.
 * 
 * Filosofia de Design:
 * O Player NÃO possui atributos específicos para cada broche.
 * Todo o estado interno, timers, contadores de escudos e regras de combate são
 * encapsulados dentro do próprio broche através de seus hooks!
 * ==============================================================================
 */
export default class BroochTemplate {
  private _id: string;
  private _name: string;
  private _description: string;
  private _type: 'ativo' | 'passivo';
  private _shape: 'circle' | 'triangle';
  private _tags: string[] = [];
  private _cooldownMs: number = 0;
  private _onExecute?: BroochExecuteHandler;
  private _onAttach?: BroochLifecycleHandler;
  private _onDetach?: BroochLifecycleHandler;
  private _onBeforeTakeDamage?: BroochDamageHook;
  private _onBeforeApplyStatus?: BroochStatusHook;
  private _onAfterAttack?: BroochAttackHook;
  private _onComputeDamageMultiplier?: BroochDamageMultiplierHook;
  private _onDash?: BroochDashHook;
  private _onUpdate?: BroochUpdateHook;
  private _onReset?: BroochResetHook;
  private _assertion?: BroochAssertion;

  private constructor(id: string, name: string, description: string, type: 'ativo' | 'passivo', shape: 'circle' | 'triangle') {
    this._id = id;
    this._name = name;
    this._description = description;
    this._type = type;
    this._shape = shape;
  }

  /**
   * Fábrica fluente para Broches Ativos (Redondos / Teclas 5 a 8).
   */
  public static createActive(id: string, name: string, description: string, cooldownMs: number): BroochTemplate {
    const builder = new BroochTemplate(id, name, description, 'ativo', 'circle');
    builder._cooldownMs = cooldownMs;
    return builder;
  }

  /**
   * Fábrica fluente para Broches Passivos (Triangulares / Slots Passivos).
   */
  public static createPassive(id: string, name: string, description: string): BroochTemplate {
    return new BroochTemplate(id, name, description, 'passivo', 'triangle');
  }

  public withTags(...tags: string[]): this {
    this._tags = tags;
    return this;
  }

  public withCooldown(cooldownMs: number): this {
    this._cooldownMs = cooldownMs;
    return this;
  }

  public withAssertion(assertion: BroochAssertion): this {
    this._assertion = assertion;
    return this;
  }

  public onExecute(handler: BroochExecuteHandler): this {
    this._onExecute = handler;
    return this;
  }

  public onAttach(handler: BroochLifecycleHandler): this {
    this._onAttach = handler;
    return this;
  }

  public onDetach(handler: BroochLifecycleHandler): this {
    this._onDetach = handler;
    return this;
  }

  public onBeforeTakeDamage(hook: BroochDamageHook): this {
    this._onBeforeTakeDamage = hook;
    return this;
  }

  public onBeforeApplyStatus(hook: BroochStatusHook): this {
    this._onBeforeApplyStatus = hook;
    return this;
  }

  public onAfterAttack(hook: BroochAttackHook): this {
    this._onAfterAttack = hook;
    return this;
  }

  public onComputeDamageMultiplier(hook: BroochDamageMultiplierHook): this {
    this._onComputeDamageMultiplier = hook;
    return this;
  }

  public onDash(hook: BroochDashHook): this {
    this._onDash = hook;
    return this;
  }

  public onUpdate(hook: BroochUpdateHook): this {
    this._onUpdate = hook;
    return this;
  }

  public onReset(hook: BroochResetHook): this {
    this._onReset = hook;
    return this;
  }

  public build(): IBroochDefinition {
    const assertion = this._assertion;
    const def: IBroochDefinition = {
      id: this._id,
      name: this._name,
      description: this._description,
      type: this._type,
      shape: this._shape,
      tags: [...this._tags],
      cooldownMs: this._cooldownMs,
      assertion: this._assertion,
      validate(ctx: BroochValidationContext): boolean | { valid: boolean; reason?: string | undefined } {
        if (!this.assertion) {
          return { valid: false, reason: `Brooch '${this.id}' does not have an assertion defined.` };
        }
        return this.assertion(ctx);
      }
    };
    if (this._onExecute) (def as any).onExecute = this._onExecute;
    if (this._onAttach) (def as any).onAttach = this._onAttach;
    if (this._onDetach) (def as any).onDetach = this._onDetach;
    if (this._onBeforeTakeDamage) (def as any).onBeforeTakeDamage = this._onBeforeTakeDamage;
    if (this._onBeforeApplyStatus) (def as any).onBeforeApplyStatus = this._onBeforeApplyStatus;
    if (this._onAfterAttack) (def as any).onAfterAttack = this._onAfterAttack;
    if (this._onComputeDamageMultiplier) (def as any).onComputeDamageMultiplier = this._onComputeDamageMultiplier;
    if (this._onDash) (def as any).onDash = this._onDash;
    if (this._onUpdate) (def as any).onUpdate = this._onUpdate;
    if (this._onReset) (def as any).onReset = this._onReset;
    return def;
  }
}
