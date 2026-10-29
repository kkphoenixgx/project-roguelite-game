import type { IEventManager } from "../eventDispacher/IGameEvents";
import Vector2D from "../shared/Vector2D";
import Entity from "../ObjectModule/Entities/Entity";

export interface SynergyReactionContext {
  readonly target: Entity;
  readonly firstStatus: string;
  readonly secondStatus: string;
  readonly eventManager: IEventManager;
}

export type SynergyReactionTriggerHandler = (ctx: SynergyReactionContext) => void;

export interface ISynergyReactionDefinition {
  readonly id: string;
  readonly name: string;
  readonly firstElement: string;
  readonly secondElement: string;
  readonly bonusDamage: number;
  readonly damageType: 'physical' | 'magical' | 'true';
  readonly explosionRadius: number;
  readonly consumeFirst: boolean;
  readonly consumeSecond: boolean;
  readonly particleEffect?: string | undefined;
  readonly particleColor?: string | undefined;
  readonly resultingStatusFactory?: ((target: Entity) => any) | undefined;
  readonly onTrigger?: SynergyReactionTriggerHandler | undefined;
}

/**
 * ==============================================================================
 * REGISTRO CENTRAL DE REAÇÕES ELEMENTAIS (SynergyReactionRegistry)
 * ==============================================================================
 * Avalia em tempo de execução a combinação de status ou dano aplicados a uma entidade,
 * disparando explosões de sinergia de forma totalmente desacoplada e Zero-GC.
 * ==============================================================================
 */
export class SynergyReactionRegistry {
  private static reactions: Map<string, ISynergyReactionDefinition> = new Map();
  private static _isInitialized: boolean = false;

  private static makeKey(elemA: string, elemB: string): string {
    return [elemA, elemB].sort().join('__+__');
  }

  public static register(def: ISynergyReactionDefinition): void {
    const key = this.makeKey(def.firstElement, def.secondElement);
    this.reactions.set(key, def);
    this.reactions.set(def.id, def);
  }

  public static get(elemA: string, elemB: string): ISynergyReactionDefinition | undefined {
    const key = this.makeKey(elemA, elemB);
    return this.reactions.get(key);
  }

  /**
   * Avalia se a aplicação de um novo status em uma entidade dispara uma reação
   * com algum status que a entidade já possua.
   */
  public static evaluateStatusApplication(target: Entity, newStatusId: string, eventManager: IEventManager): boolean {
    if (!target.activeStatuses || target.activeStatuses.size === 0) return false;

    for (const existingId of target.activeStatuses.keys()) {
      const reaction = this.get(existingId, newStatusId);
      if (reaction) {
        this.triggerReaction(reaction, target, existingId, newStatusId, eventManager);
        return true;
      }
    }
    return false;
  }

  public static triggerReaction(
    def: ISynergyReactionDefinition,
    target: Entity,
    elemA: string,
    elemB: string,
    eventManager: IEventManager
  ): void {
    const cx = target.coordinates.x + target.size.width / 2;
    const cy = target.coordinates.y + target.size.height / 2;

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `💥 [Sinergia Elemental: ${def.name}] Reação entre '${elemA}' e '${elemB}' detonada!`,
      params: []
    });

    if (def.particleEffect) {
      const particlePayload: any = {
        effect: def.particleEffect,
        x: cx,
        y: cy
      };
      if (def.particleColor) particlePayload.color = def.particleColor;
      eventManager.dispatch('particle', particlePayload);
    }

    // Aplicação de Dano de Reação
    if (def.bonusDamage > 0 && typeof target.takeDamage === 'function') {
      target.takeDamage({
        totalDamage: def.bonusDamage,
        damageType: def.damageType,
        isCritical: true,
        direction: new Vector2D(0, 0),
        attacker: target
      });
    }

    // Explosão em área para vizinhos
    if (def.explosionRadius > 0) {
      eventManager.dispatch('requestNeighbors', {
        coordinates: target.coordinates,
        radius: def.explosionRadius,
        callback: (neighbors: any[]) => {
          if (!neighbors) return;
          for (let i = 0; i < neighbors.length; i++) {
            const n = neighbors[i]!;
            if (n && n.id !== target.id && 'takeDamage' in n && n.attributes?.hp > 0) {
              const dx = n.coordinates.x - target.coordinates.x;
              const dy = n.coordinates.y - target.coordinates.y;
              const dir = new Vector2D(dx, dy).normalizeMut();
              n.takeDamage({
                totalDamage: Math.round(def.bonusDamage * 0.6),
                damageType: def.damageType,
                isCritical: false,
                direction: dir,
                attacker: target
              });
            }
          }
        }
      });
    }

    // Consumo de status
    if (def.consumeFirst) {
      target.activeStatuses.delete(elemA);
    }
    if (def.consumeSecond) {
      target.activeStatuses.delete(elemB);
    }

    // Aplicação de status resultante
    if (def.resultingStatusFactory && typeof target.applyStatus === 'function') {
      const resStatus = def.resultingStatusFactory(target);
      if (resStatus) target.applyStatus(resStatus);
    }

    // Callback de gancho
    if (def.onTrigger) {
      def.onTrigger({
        target,
        firstStatus: elemA,
        secondStatus: elemB,
        eventManager
      });
    }
  }

  private static registerDefaults(): void {
    // 1. Vaporização (Fogo + Molhado / Queimadura + Água)
    this.register(
      SynergyReactionTemplate.create('reaction_vaporize', 'Evaporação Explosiva')
        .between('burn', 'wet')
        .withExtraDamage(60, 'magical')
        .withAreaExplosion(120, 'magicPulse', '#FF9100')
        .withConsumesStatus(true, true)
        .build()
    );

    // 2. Choque em Cadeia (Eletricidade + Molhado / Paralisia + Água)
    this.register(
      SynergyReactionTemplate.create('reaction_electro_charge', 'Arco Elétrico Condutivo')
        .between('paralyze', 'wet')
        .withExtraDamage(45, 'magical')
        .withAreaExplosion(140, 'magicPulse', '#FFEA00')
        .withConsumesStatus(false, true)
        .build()
    );

    // 3. Combustão Tóxica (Veneno + Queimadura)
    this.register(
      SynergyReactionTemplate.create('reaction_toxic_combustion', 'Combustão Tóxica')
        .between('poison', 'burn')
        .withExtraDamage(80, 'magical')
        .withAreaExplosion(150, 'fireExplosion', '#76FF03')
        .withConsumesStatus(true, true)
        .build()
    );

    // 4. Fragmentação de Gelo (Congelamento + Atordoamento)
    this.register(
      SynergyReactionTemplate.create('reaction_shatter', 'Fragmentação Congelada')
        .between('freeze', 'stun')
        .withExtraDamage(90, 'physical')
        .withAreaExplosion(100, 'magicPulse', '#00E5FF')
        .withConsumesStatus(true, true)
        .build()
    );
  }
}

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: SINERGIAS E REAÇÕES ELEMENTAIS (SynergyReactionTemplate)
 * ==============================================================================
 * Fluent Builder para criar e registrar reações elementais de alto impacto.
 * ==============================================================================
 */
export default class SynergyReactionTemplate {
  private _firstElement: string = '';
  private _secondElement: string = '';
  private _bonusDamage: number = 0;
  private _damageType: 'physical' | 'magical' | 'true' = 'magical';
  private _explosionRadius: number = 0;
  private _consumeFirst: boolean = true;
  private _consumeSecond: boolean = true;
  private _particleEffect?: string | undefined;
  private _particleColor?: string | undefined;
  private _resultingStatusFactory?: ((target: Entity) => any) | undefined;
  private _onTrigger?: SynergyReactionTriggerHandler | undefined;

  private constructor(private readonly _id: string, private readonly _name: string) {}

  public static create(id: string, name: string): SynergyReactionTemplate {
    return new SynergyReactionTemplate(id, name);
  }

  public between(elementA: string, elementB: string): this {
    this._firstElement = elementA;
    this._secondElement = elementB;
    return this;
  }

  public withExtraDamage(amount: number, type: 'physical' | 'magical' | 'true' = 'magical'): this {
    this._bonusDamage = amount;
    this._damageType = type;
    return this;
  }

  public withAreaExplosion(radius: number, particle?: string, color?: string): this {
    this._explosionRadius = radius;
    this._particleEffect = particle;
    this._particleColor = color;
    return this;
  }

  public withConsumesStatus(consumeFirst: boolean, consumeSecond: boolean): this {
    this._consumeFirst = consumeFirst;
    this._consumeSecond = consumeSecond;
    return this;
  }

  public withResultingStatus(factory: (target: Entity) => any): this {
    this._resultingStatusFactory = factory;
    return this;
  }

  public onTrigger(handler: SynergyReactionTriggerHandler): this {
    this._onTrigger = handler;
    return this;
  }

  public build(): ISynergyReactionDefinition {
    return {
      id: this._id,
      name: this._name,
      firstElement: this._firstElement,
      secondElement: this._secondElement,
      bonusDamage: this._bonusDamage,
      damageType: this._damageType,
      explosionRadius: this._explosionRadius,
      consumeFirst: this._consumeFirst,
      consumeSecond: this._consumeSecond,
      particleEffect: this._particleEffect,
      particleColor: this._particleColor,
      resultingStatusFactory: this._resultingStatusFactory,
      onTrigger: this._onTrigger
    };
  }

  public register(): void {
    SynergyReactionRegistry.register(this.build());
  }
}

// Inicializa reações padrão após a definição de SynergyReactionTemplate
(SynergyReactionRegistry as any).registerDefaults();
