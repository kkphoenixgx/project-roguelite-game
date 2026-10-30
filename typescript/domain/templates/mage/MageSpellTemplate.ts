import type { IPlayer } from "../../ports/domain-contracts";
import type { IEventManager } from "../../eventDispacher/IGameEvents";
import type { action } from "../../eventDispacher/actions.type";
import type { OnHitAction } from "../../ObjectModule/Items/IAtack";
import Attack from "../../ObjectModule/Items/Attack";
import Vector2D from "../../shared/Vector2D";
import type Entity from "../../ObjectModule/Entities/Entity";
import type { ParsedRuneGrammar } from "./RuneGrammarEngine";

export interface SpellExecutionContext {
  readonly player: IPlayer;
  readonly eventManager: IEventManager;
  readonly direction: Vector2D;
  readonly spawnCoordinates: { x: number; y: number };
  readonly manaCost: number;
  readonly sequence: string;
  readonly buffer: readonly (action | string)[];
}

export interface DynamicSpellContext extends SpellExecutionContext {
  readonly grammar: ParsedRuneGrammar;
  readonly elements: readonly string[];
  readonly forces: readonly string[];
  readonly forms: readonly string[];
}

export interface ForceSolverContext {
  readonly target: Entity;
  readonly sourceCoords: { x: number; y: number };
  readonly isSelf: boolean;
  readonly direction: Vector2D;
  readonly eventManager: IEventManager;
  readonly player: IPlayer;
}

export type StaticSpellExecutionMode = 'projectile' | 'homing' | 'custom';

export interface StaticSpellRecipe {
  readonly id: string;
  readonly name: string;
  readonly sequence: string;
  readonly description?: string | undefined;
  readonly manaCost?: (number | ((player: IPlayer, runesCount: number) => number)) | undefined;
  readonly baseDamage: number;
  readonly intelligenceMultiplier: number;
  readonly executionMode: StaticSpellExecutionMode;
  readonly projectileType?: string | undefined;
  readonly homingOptions?: {
    readonly missileCount: number;
    readonly searchRadius: number;
    readonly projectileType?: string | undefined;
  } | undefined;
  readonly castParticles?: readonly string[] | undefined;
  readonly onHitParticles?: readonly (string | OnHitAction)[] | undefined;
  readonly logMessage?: string | undefined;
  readonly customExecution?: ((context: SpellExecutionContext) => boolean) | undefined;
}

/**
 * Builder fluente para criação de receitas estáticas de magias de Mago.
 */
export class MageSpellRecipeBuilder {
  private _sequence: string = '';
  private _description?: string;
  private _manaCost?: number | ((player: IPlayer, runesCount: number) => number);
  private _baseDamage: number = 20;
  private _intelligenceMultiplier: number = 2;
  private _executionMode: StaticSpellExecutionMode = 'projectile';
  private _projectileType?: string;
  private _homingOptions?: { missileCount: number; searchRadius: number; projectileType?: string };
  private _castParticles: string[] = [];
  private _onHitParticles: (string | OnHitAction)[] = [];
  private _logMessage?: string;
  private _customExecution?: (context: SpellExecutionContext) => boolean;

  constructor(
    public readonly id: string,
    public readonly name: string
  ) {}

  public matchingSequence(sequence: readonly (action | string)[] | string): this {
    if (typeof sequence === 'string') {
      this._sequence = sequence;
    } else {
      this._sequence = sequence.join(',');
    }
    return this;
  }


  public withDescription(desc: string): this {
    this._description = desc;
    return this;
  }

  public withManaCost(cost: number | ((player: IPlayer, runesCount: number) => number)): this {
    this._manaCost = cost;
    return this;
  }

  public withBaseDamage(damage: number): this {
    this._baseDamage = damage;
    return this;
  }

  public withIntelligenceScaling(multiplier: number): this {
    this._intelligenceMultiplier = multiplier;
    return this;
  }

  public asProjectile(projectileType: string): this {
    this._executionMode = 'projectile';
    this._projectileType = projectileType;
    return this;
  }

  public asHomingMissiles(options: { missileCount: number; searchRadius: number; projectileType?: string }): this {
    this._executionMode = 'homing';
    this._homingOptions = options;
    return this;
  }

  public withCastParticle(effect: string): this {
    this._castParticles.push(effect);
    return this;
  }

  public withOnHitParticle(effect: string | OnHitAction): this {
    this._onHitParticles.push(effect);
    return this;
  }

  public withLogMessage(msg: string): this {
    this._logMessage = msg;
    return this;
  }

  public withCustomExecution(fn: (context: SpellExecutionContext) => boolean): this {
    this._executionMode = 'custom';
    this._customExecution = fn;
    return this;
  }

  public build(): StaticSpellRecipe {
    if (!this._sequence) {
      throw new Error(`[MageSpellRecipeBuilder] A receita '${this.id}' precisa definir uma sequência de runas via matchingSequence()!`);
    }

    return {
      id: this.id,
      name: this.name,
      sequence: this._sequence,
      description: this._description,
      manaCost: this._manaCost,
      baseDamage: this._baseDamage,
      intelligenceMultiplier: this._intelligenceMultiplier,
      executionMode: this._executionMode,
      projectileType: this._projectileType,
      homingOptions: this._homingOptions,
      castParticles: [...this._castParticles],
      onHitParticles: [...this._onHitParticles],
      logMessage: this._logMessage,
      customExecution: this._customExecution
    };
  }
}

/**
 * ==============================================================================
 * TEMPLATE DE MAGIAS DO MAGO (MageSpellTemplate)
 * ==============================================================================
 * Facilita a criação declarativa de magias estáticas e a execução de magias no domínio,
 * eliminando switches gigantes e if/else aninhados.
 * ==============================================================================
 */
export class MageSpellTemplate {
  /**
   * Cria um builder para receita estática de magia.
   */
  public static createStatic(id: string, name: string): MageSpellRecipeBuilder {
    return new MageSpellRecipeBuilder(id, name);
  }

  /**
   * Executa uma receita de magia estática aplicando dano escalonado, partículas e custos.
   */
  public static executeRecipe(recipe: StaticSpellRecipe, context: SpellExecutionContext): boolean {
    const { player, eventManager, direction, spawnCoordinates, manaCost } = context;

    //? Delega para execução customizada da magia caso definida
    if (recipe.executionMode === 'custom' && recipe.customExecution) {
      const executed = recipe.customExecution(context);
      if (executed) {
        player.attributes.mana -= manaCost;
      }
      return executed;
    }

    const calculatedDamage = recipe.baseDamage + Math.floor((player.attributes.intelligence || 0) * recipe.intelligenceMultiplier);

    const onHitActions: OnHitAction[] = [];
    if (recipe.onHitParticles && recipe.onHitParticles.length > 0) {
      for (const p of recipe.onHitParticles) {
        if (typeof p === 'function') {
          onHitActions.push(p);
        } else {
          onHitActions.push((_, target) => {
            eventManager.dispatch('particle', { effect: p as any, x: target.coordinates.x, y: target.coordinates.y });
          });
        }
      }
    }

    const playerAttack = new Attack(player as any, calculatedDamage, 'magical', onHitActions);

    if (recipe.executionMode === 'projectile') {
      const projType = recipe.projectileType || 'fireball';
      eventManager.dispatch('spawn', {
        type: projType as any,
        coordinates: spawnCoordinates,
        direction: direction,
        attack: playerAttack
      });
    } else if (recipe.executionMode === 'homing') {
      const count = recipe.homingOptions?.missileCount ?? 3;
      const radius = recipe.homingOptions?.searchRadius ?? 600;
      const projType = recipe.homingOptions?.projectileType || 'magicMissile';

      eventManager.dispatch('requestNeighbors', {
        requester: player as any,
        radius: radius,
        callback: (neighbors) => {
          const potentialTargets = neighbors.filter(n => n.id !== player.id && 'takeDamage' in n && (n as any).attributes?.hp > 0);
          potentialTargets.sort((a, b) => player.getDistanceTo(a) - player.getDistanceTo(b));

          const targets = potentialTargets.slice(0, count);
          let missilesFired = 0;

          for (const target of targets) {
            eventManager.dispatch('spawn', {
              type: projType as any,
              coordinates: { ...spawnCoordinates },
              attack: playerAttack,
              target: target
            } as any);
            missilesFired++;
          }

          while (missilesFired < count) {
            eventManager.dispatch('spawn', {
              type: projType as any,
              coordinates: { ...spawnCoordinates },
              direction: player.facingDirection.clone(),
              attack: playerAttack
            });
            missilesFired++;
          }
        }
      });
    }

    if (recipe.castParticles) {
      for (const effect of recipe.castParticles) {
        eventManager.dispatch('particle', { effect: effect as any, x: spawnCoordinates.x, y: spawnCoordinates.y });
      }
    }

    if (recipe.logMessage) {
      eventManager.dispatch('log', { channel: 'domain', message: recipe.logMessage, params: [] });
    }

    player.attributes.mana -= manaCost;
    return true;
  }
}

export default MageSpellTemplate;
