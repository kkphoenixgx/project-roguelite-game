import type { IPlayer } from "../../ports/domain-contracts";
import type { IEventManager } from "../../eventDispacher/IGameEvents";
import type { action } from "../../eventDispacher/actions.type";
import type { OnHitAction } from "../../ObjectModule/Items/IAtack";
import Attack from "../../ObjectModule/Items/Attack";
import Vector2D from "../../shared/Vector2D";
import type Entity from "../../ObjectModule/Entities/Entity";
import { RuneGrammarEngine, type ParsedRuneGrammar } from "./RuneGrammarEngine";
import {
  MageSpellTemplate,
  type StaticSpellRecipe,
  type SpellExecutionContext,
  type DynamicSpellContext,
  type ForceSolverContext
} from "./MageSpellTemplate";
import { registerBladeInfusions } from "./spells/BladeInfusions";
import { registerAbyssalDemon } from "./spells/AbyssalDemonSpell";
import { registerNegationRules } from "./spells/NegationSpells";
import type { FormSolverFn, ForceSolverFn, DynamicSpellRule, ISpellRegistry } from "./ISpellCraftingContracts";

export type { FormSolverFn, ForceSolverFn, DynamicSpellRule, ISpellRegistry };

/**
 * ==============================================================================
 * REGISTRO E ORQUESTRADOR DE MAGIAS DO MAGO (MageSpellCraftingRegistry)
 * ==============================================================================
 * Centraliza:
 * 1. O motor de gramática de runas (RuneGrammarEngine).
 * 2. O catálogo de receitas estáticas de magias (StaticSpellRecipe).
 * 3. Regras de síntese de magias dinâmicas complexas (DynamicSpellRule).
 * 4. Os solucionadores de formas dinâmicas básicas (FormSolvers, ex: Projétil, Self, etc.).
 * 5. Os solucionadores de forças físicas (ForceSolvers, ex: Knockback, Pull).
 * 6. Os mapeamentos de VFX e partículas por elemento.
 * ==============================================================================
 */
export class MageSpellCraftingRegistry implements ISpellRegistry {
  public readonly grammarEngine: RuneGrammarEngine;
  private readonly recipesBySequence = new Map<string, StaticSpellRecipe>();
  private readonly recipesById = new Map<string, StaticSpellRecipe>();
  private readonly dynamicRules: DynamicSpellRule[] = [];
  private readonly formSolvers = new Map<string, FormSolverFn>();
  private readonly forceSolvers = new Map<string, ForceSolverFn>();
  private readonly elementVfxMap = new Map<string, string>();


  constructor(grammarEngine?: RuneGrammarEngine) {
    this.grammarEngine = grammarEngine ?? RuneGrammarEngine.createDefault();
  }

  /**
   * Registra uma receita estática de magia.
   */
  public registerRecipe(recipe: StaticSpellRecipe): this {
    this.recipesBySequence.set(recipe.sequence, recipe);
    this.recipesById.set(recipe.id, recipe);
    return this;
  }

  /**
   * Registra uma regra de síntese para magia dinâmica (combinações de formas, elementos e forças).
   */
  public registerDynamicRule(rule: DynamicSpellRule): this {
    this.dynamicRules.push(rule);
    this.dynamicRules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return this;
  }

  /**
   * Registra um solucionador para uma forma de magia dinâmica (ex: 'projectile', 'self', 'beam').
   */
  public registerFormSolver(form: string, solver: FormSolverFn): this {
    this.formSolvers.set(form, solver);
    return this;
  }


  /**
   * Registra um solucionador para uma força vetorial (ex: 'knockback', 'pull').
   */
  public registerForceSolver(force: string, solver: ForceSolverFn): this {
    this.forceSolvers.set(force, solver);
    return this;
  }

  /**
   * Registra o efeito de partícula visual correspondente a um elemento.
   */
  public registerElementVfx(element: string, particleEffect: string): this {
    this.elementVfxMap.set(element, particleEffect);
    return this;
  }

  /**
   * Obtém uma receita estática pelo ID.
   */
  public getRecipeById(id: string): StaticSpellRecipe | undefined {
    return this.recipesById.get(id);
  }

  /**
   * Obtém uma receita estática pela sequência de runas.
   */
  public getRecipeBySequence(sequence: string): StaticSpellRecipe | undefined {
    return this.recipesBySequence.get(sequence);
  }

  /**
   * Executa a força vetorial registrada no contexto fornecido.
   */
  public applyForce(forceName: string, context: ForceSolverContext): void {
    const solver = this.forceSolvers.get(forceName);
    if (solver) {
      solver(context);
    }
  }

  /**
   * Obtém o efeito de partícula para o elemento.
   */
  public getElementVfx(element: string): string | undefined {
    return this.elementVfxMap.get(element);
  }

  /**
   * Executa uma magia a partir de um buffer de runas digitadas.
   */
  public executeSpell(
    buffer: readonly (action | string)[],
    player: IPlayer,
    eventManager: IEventManager,
    customDirection?: Vector2D,
    customSpawnCoords?: { x: number; y: number },
    customManaCost?: number
  ): boolean {
    if (buffer.length === 0) return false;
    if (player.activeStatuses?.has('stun') || player.activeStatuses?.has('paralyze')) return false;

    const sequence = buffer.join(',');
    const direction = customDirection ?? player.facingDirection.clone();
    const spawnCoordinates = customSpawnCoords ?? {
      x: player.coordinates.x + player.size.width / 2,
      y: player.coordinates.y + player.size.height / 2
    };

    //? 1. Verifica se há receita estática registrada correspondente à combinação de componentes.
    const staticRecipe = this.recipesBySequence.get(sequence);
    let manaCost: number;

    if (customManaCost !== undefined) {
      manaCost = customManaCost;
    } else if (staticRecipe && staticRecipe.manaCost !== undefined) {
      manaCost = typeof staticRecipe.manaCost === 'function'
        ? staticRecipe.manaCost(player, buffer.length)
        : staticRecipe.manaCost;
    } else {
      manaCost = 5 * buffer.length;
    }

    if ((player.attributes.mana || 0) < manaCost) {
      return false;
    }

    const context: SpellExecutionContext = {
      player,
      eventManager,
      direction,
      spawnCoordinates,
      manaCost,
      sequence,
      buffer
    };

    if (staticRecipe) {
      return MageSpellTemplate.executeRecipe(staticRecipe, context);
    }

    //? 2. Síntese e Execução Dinâmica
    return this.synthesizeAndExecuteDynamic(context);
  }

  /**
   * Executa diretamente uma receita estática registrada pelo seu ID (ex: 'fireball').
   */
  public executeStaticSpell(
    recipeId: string,
    player: IPlayer,
    eventManager: IEventManager,
    customDirection?: Vector2D,
    customSpawnCoords?: { x: number; y: number },
    customManaCost?: number
  ): boolean {
    const recipe = this.recipesById.get(recipeId);
    if (!recipe) {
      eventManager.dispatch('log', { channel: 'domain', message: `[SpellRegistry] Receita '${recipeId}' não encontrada!`, params: [] });
      return false;
    }

    const direction = customDirection ?? player.facingDirection.clone();
    const spawnCoordinates = customSpawnCoords ?? {
      x: player.coordinates.x + player.size.width / 2,
      y: player.coordinates.y + player.size.height / 2
    };

    const runesCount = recipe.sequence ? recipe.sequence.split(',').length : 1;
    let manaCost: number;
    if (customManaCost !== undefined) {
      manaCost = customManaCost;
    } else if (recipe.manaCost !== undefined) {
      manaCost = typeof recipe.manaCost === 'function'
        ? recipe.manaCost(player, runesCount)
        : recipe.manaCost;
    } else {
      manaCost = 5 * runesCount;
    }

    if ((player.attributes.mana || 0) < manaCost) {
      return false;
    }

    const context: SpellExecutionContext = {
      player,
      eventManager,
      direction,
      spawnCoordinates,
      manaCost,
      sequence: recipe.sequence,
      buffer: recipe.sequence.split(',')
    };

    return MageSpellTemplate.executeRecipe(recipe, context);
  }

  /**
   * Executa a síntese dinâmica de feitiço com base na gramática das runas.
   */
  public synthesizeAndExecuteDynamic(context: SpellExecutionContext): boolean {
    const grammar = this.grammarEngine.parse(context.buffer);
    const dynamicContext: DynamicSpellContext = {
      ...context,
      grammar,
      elements: grammar.elements,
      forces: grammar.forces,
      forms: grammar.forms
    };

    //? 1. Avalia regras de síntese dinâmica especializada por combinação de componentes.
    for (const rule of this.dynamicRules) {
      if (rule.matcher(dynamicContext)) {
        return rule.execute(dynamicContext);
      }
    }

    //? 2. Fallback para solucionadores de forma genéricos caso nenhuma regra especializada seja atendida.
    for (const form of grammar.forms) {
      const solver = this.formSolvers.get(form);
      if (solver) {
        return solver(dynamicContext);
      }
    }

    return false;
  }


  /**
   * Cria o registro padrão com todas as magias canônicas, formas, forças e efeitos visuais do Mago.
   */
  public static createDefault(): MageSpellCraftingRegistry {
    const registry = new MageSpellCraftingRegistry();

    //? Registro de receitas estáticas canônicas.
    registry.registerRecipe(
      MageSpellTemplate.createStatic('fireball', 'Bola de Fogo')
        .matchingSequence(['spell_0', 'spell_4', 'spell_0'])
        .withBaseDamage(30)
        .withIntelligenceScaling(2)
        .asProjectile('fireball')
        .withCastParticle('fireExplosion')
        .withOnHitParticle('fireExplosion')
        .withLogMessage('Cast static spell: Fireball!')
        .build()
    );

    registry.registerRecipe(
      MageSpellTemplate.createStatic('magicMissile', 'Mísseis Mágicos')
        .matchingSequence(['spell_0', 'spell_9', 'spell_0'])
        .withBaseDamage(10)
        .withIntelligenceScaling(2)
        .asHomingMissiles({ missileCount: 3, searchRadius: 600, projectileType: 'magicMissile' })
        .withCastParticle('magicPulse')
        .withLogMessage('Cast static spell: Homing Magic Missiles!')
        .build()
    );

    //? Mapeamento de VFX por Elemento.
    const elementVfxEntries: [string, string][] = [
      ['fire', 'fireExplosion'],
      ['water', 'waterSplash'],
      ['ground', 'rockShatter'],
      ['dark', 'darkPulse'],
      ['light', 'lightFlash'],
      ['magic', 'magicPulse'],
      ['potencia', 'fireExplosion'],
      ['ice', 'iceShard'],
      ['life', 'levelUp'],
      ['caos', 'darkPulse'],
      ['ordem', 'lightFlash'],
      ['air', 'windGust'],
      ['magma', 'magmaBurst'],
      ['infernous', 'darkPulse'],
      ['thunder', 'slashSparks'],
      ['nature', 'natureBurst'],
      ['abys', 'darkPulse'],
      ['holy', 'lightFlash'],
      ['decay', 'darkPulse'],
      ['crystal', 'crystalShatter'],
      ['negation', 'magicPulse']
    ];

    for (const [el, fx] of elementVfxEntries) {
      registry.registerElementVfx(el, fx);
    }

    //! Solucionadores de forças físicas e cinemática sob disciplina Zero-GC.
    registry.registerForceSolver('knockback', (ctx) => {
      const forceMagnitude = 15;
      const { target, isSelf, direction, eventManager } = ctx;
      const tCx = target.coordinates.x + target.size.width / 2;
      const tCy = target.coordinates.y + target.size.height / 2;

      eventManager.dispatch('spawnVisual', {
        type: 'knockback-vfx' as any,
        coordinates: { x: tCx - 32, y: tCy - 32 },
        duration: 0.2,
        size: { width: 64, height: 64 },
        rotation: direction.angle()
      });

      if (isSelf) {
        const recoil = direction.clone().invertMut().multiplyMut(forceMagnitude);
        target.applyForce(recoil);
        setTimeout(() => target.resetAccelerator(), 150);
      } else {
        const knockbackDir = direction.clone().normalizeMut();
        const appliedForce = knockbackDir.multiplyMut(forceMagnitude);

        target.velocity.resetMut();
        target.applyForce(appliedForce);

        setTimeout(() => {
          if (target.attributes && target.attributes.hp > 0) {
            target.applyForce(appliedForce.clone());
          }
        }, 110);
        setTimeout(() => target.resetAccelerator(), 200);
      }
    });

    registry.registerForceSolver('pull', (ctx) => {
      const forceMagnitude = 20;
      const { target, isSelf, direction, eventManager, player } = ctx;
      const tCx = target.coordinates.x + target.size.width / 2;
      const tCy = target.coordinates.y + target.size.height / 2;

      if (isSelf) {
        const dash = direction.clone().multiplyMut(forceMagnitude);
        target.applyForce(dash);
        setTimeout(() => target.resetAccelerator(), 150);

        const dist = 150;
        eventManager.dispatch('spawnVisual', {
          type: 'pull-force' as any,
          coordinates: { x: tCx + (direction.x * dist / 2) - 32, y: tCy + (direction.y * dist / 2) - 64 },
          duration: 0.25,
          size: { width: 64, height: 128 },
          rotation: direction.angle() + Math.PI / 2
        });
      } else {
        const pCx = player.coordinates.x + player.size.width / 2;
        const pCy = player.coordinates.y + player.size.height / 2;

        const pullDir = Vector2D.sub({ x: pCx, y: pCy }, { x: tCx, y: tCy }).normalizeMut();
        const appliedForce = pullDir.multiplyMut(forceMagnitude);

        target.velocity.resetMut();
        target.applyForce(appliedForce);

        setTimeout(() => {
          if (target.attributes && target.attributes.hp > 0) {
            target.applyForce(appliedForce.clone());
          }
        }, 110);
        setTimeout(() => target.resetAccelerator(), 250);

        const dist = Math.max(32, Math.hypot(tCx - pCx, tCy - pCy));
        const midX = (pCx + tCx) / 2;
        const midY = (pCy + tCy) / 2;

        eventManager.dispatch('spawnVisual', {
          type: 'pull-force' as any,
          coordinates: { x: midX - 32, y: midY - (dist / 2) },
          duration: 0.3,
          size: { width: 64, height: dist },
          rotation: Math.atan2(tCy - pCy, tCx - pCx) + Math.PI / 2
        });
      }
    });

    //? Solucionadores de Formas Dinâmicas.
    registry.registerFormSolver('projectile', (ctx) => {
      const { player, eventManager, direction, spawnCoordinates, manaCost, elements, forces } = ctx;
      const baseDamage = 10 + (10 * elements.length) + Math.floor(player.attributes.intelligence || 0);
      const onHitActions: OnHitAction[] = [];

      if (elements.length > 0) {
        onHitActions.push((_, target) => {
          const cx = target.coordinates.x + target.size.width / 2;
          const cy = target.coordinates.y + target.size.height / 2;
          for (const el of elements) {
            const effect = registry.getElementVfx(el);
            if (effect) {
              eventManager.dispatch('particle', { effect: effect as any, x: cx, y: cy });
            }
          }
        });
      }

      for (const force of forces) {
        onHitActions.push((attacker, target) => {
          registry.applyForce(force, {
            target: target as Entity,
            sourceCoords: attacker.coordinates,
            isSelf: false,
            direction,
            eventManager,
            player
          });
        });
      }

      const playerAttack = new Attack(player as any, baseDamage, 'magical', onHitActions);

      eventManager.dispatch('spawn', {
        type: 'dynamicSpell' as any,
        coordinates: spawnCoordinates,
        direction: direction,
        attack: playerAttack,
        spellElements: [...elements]
      } as any);

      eventManager.dispatch('particle', { effect: 'magicAura', x: spawnCoordinates.x, y: spawnCoordinates.y });
      eventManager.dispatch('log', {
        channel: 'domain',
        message: `Cast Dynamic Projectile! Elements: [${elements.join(', ')}], Forces: [${forces.join(', ')}]`,
        params: []
      });

      player.attributes.mana -= manaCost;
      return true;
    });

    registry.registerFormSolver('self', (ctx) => {
      const { player, eventManager, direction, spawnCoordinates, manaCost, elements, forces } = ctx;

      for (const force of forces) {
        registry.applyForce(force, {
          target: player as any,
          sourceCoords: spawnCoordinates,
          isSelf: true,
          direction,
          eventManager,
          player
        });
      }

      if (elements.length > 0) {
        const baseDamage = 10 + (10 * elements.length) + Math.floor(player.attributes.intelligence || 0);
        const playerAttack = new Attack(player as any, baseDamage, 'magical', []);

        eventManager.dispatch('requestNeighbors', {
          requester: player as any,
          radius: 150,
          callback: (neighbors) => {
            for (const n of neighbors) {
              if (n.id !== player.id && 'takeDamage' in n) {
                playerAttack.execute(n as any, direction);
              }
            }
          }
        });

        for (const el of elements) {
          const effect = registry.getElementVfx(el);
          if (effect) {
            eventManager.dispatch('particle', { effect: effect as any, x: spawnCoordinates.x, y: spawnCoordinates.y });
          }
        }
      } else {
        eventManager.dispatch('particle', { effect: 'magicAura', x: spawnCoordinates.x, y: spawnCoordinates.y });
      }

      eventManager.dispatch('log', {
        channel: 'domain',
        message: `Cast Self Spell! Elements: [${elements.join(', ')}], Forces: [${forces.join(', ')}]`,
        params: []
      });

      player.attributes.mana -= manaCost;
      return true;
    });

    //? 5. Registra feitiços dinâmicos canônicos e infusões
    registerAbyssalDemon(registry);
    registerBladeInfusions(registry);
    registerNegationRules(registry);

    return registry;
  }
}


export default MageSpellCraftingRegistry;
