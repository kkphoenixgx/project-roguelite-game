import type { IEventManager } from "../eventDispacher/IGameEvents";
import Vector2D from "../shared/Vector2D";
import Entity from "../ObjectModule/Entities/Entity";

export type GroundHazardTargetFilter = 'enemies' | 'allies' | 'all';

export interface GroundHazardTickContext {
  readonly hazard: GroundHazardInstance;
  readonly target: Entity;
  readonly eventManager: IEventManager;
}

export interface IGroundHazardDefinition {
  readonly id: string;
  readonly name: string;
  readonly radius: number;
  readonly duration: number; //? Duração total de persistência da poça/área em segundos
  readonly tickInterval: number; //? Intervalo em segundos entre cada pulso de dano/efeito
  readonly targetFilter: GroundHazardTargetFilter;
  readonly damageAmount: number;
  readonly damageType: 'physical' | 'magical' | 'true';
  readonly healAmount: number;
  readonly statusFactory?: ((target: Entity) => any) | undefined;
  readonly particleEffect?: string | undefined;
  readonly particleColor?: string | undefined;
  readonly visualType?: string | undefined;
  readonly onTick?: ((ctx: GroundHazardTickContext) => void) | undefined;
  readonly onEnter?: ((ctx: GroundHazardTickContext) => void) | undefined;
  readonly onExit?: ((ctx: GroundHazardTickContext) => void) | undefined;
  readonly onDestroy?: ((hazard: GroundHazardInstance, eventManager: IEventManager) => void) | undefined;
}

/**
 * ==============================================================================
 * INSTÂNCIA ATIVA DE EFEITO DE SOLO (GroundHazardInstance)
 * ==============================================================================
 * Controla uma zona espacial ativa no solo com ticks temporais periódicos,
 * filtragem de aliados/inimigos e Zero-GC no frame loop.
 * ==============================================================================
 */
export class GroundHazardInstance {
  public coordinates: { x: number; y: number };
  public remainingDuration: number;
  private _timeUntilNextTick: number;
  private _isDestroyed: boolean = false;
  private _insideEntities: Set<number> = new Set();
  private _dirCache: Vector2D = new Vector2D(0, 0);

  constructor(
    public readonly definition: IGroundHazardDefinition,
    coordinates: { x: number; y: number },
    public readonly owner: Entity | null,
    public readonly eventManager: IEventManager
  ) {
    this.coordinates = { x: coordinates.x, y: coordinates.y };
    this.remainingDuration = definition.duration;
    this._timeUntilNextTick = definition.tickInterval;

    if (definition.visualType) {
      eventManager.dispatch('spawnVisual', {
        type: definition.visualType,
        coordinates: {
          x: coordinates.x - definition.radius,
          y: coordinates.y - definition.radius
        },
        duration: definition.duration,
        size: { width: definition.radius * 2, height: definition.radius * 2 }
      });
    }

    if (definition.particleEffect) {
      const particlePayload: any = {
        effect: definition.particleEffect,
        x: coordinates.x,
        y: coordinates.y
      };
      if (definition.particleColor) particlePayload.color = definition.particleColor;
      eventManager.dispatch('particle', particlePayload);
    }

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Zona de Solo] '${definition.name}' criada em (${coordinates.x}, ${coordinates.y}).`,
      params: []
    });
  }

  public get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  public update(deltaTime: number): void {
    if (this._isDestroyed) return;

    this.remainingDuration -= deltaTime;
    if (this.remainingDuration <= 0) {
      this.destroy();
      return;
    }

    this._timeUntilNextTick -= deltaTime;
    if (this._timeUntilNextTick <= 0) {
      this._timeUntilNextTick += this.definition.tickInterval;
      this.executeTick();
    }
  }

  private executeTick(): void {
    this.eventManager.dispatch('requestNeighbors', {
      coordinates: this.coordinates,
      radius: this.definition.radius,
      callback: (neighbors: any[]) => {
        if (!neighbors || neighbors.length === 0) return;

        const currentFrameInside = new Set<number>();

        for (let i = 0; i < neighbors.length; i++) {
          const target = neighbors[i]!;
          if (!target || !('attributes' in target) || target.attributes.hp <= 0) continue;

          const isOwner = this.owner && target.id === this.owner.id;
          const isEnemy = !this.owner ? true : target.objectId !== this.owner.objectId;

          let matchesFilter = false;
          if (this.definition.targetFilter === 'all') {
            matchesFilter = true;
          } else if (this.definition.targetFilter === 'enemies') {
            matchesFilter = isEnemy && !isOwner;
          } else if (this.definition.targetFilter === 'allies') {
            matchesFilter = !isEnemy || Boolean(isOwner);
          }

          if (!matchesFilter) continue;

          currentFrameInside.add(target.id);
          const tickCtx: GroundHazardTickContext = {
            hazard: this,
            target,
            eventManager: this.eventManager
          };

    //? Dispara hook onEnter na frame em que a entidade entra na área de efeito
          if (!this._insideEntities.has(target.id) && this.definition.onEnter) {
            this.definition.onEnter(tickCtx);
          }

          if (this.definition.damageAmount > 0 && typeof target.takeDamage === 'function') {
            this._dirCache.x = target.coordinates.x - this.coordinates.x;
            this._dirCache.y = target.coordinates.y - this.coordinates.y;
            this._dirCache.normalizeMut();

            target.takeDamage({
              totalDamage: this.definition.damageAmount,
              damageType: this.definition.damageType,
              isCritical: false,
              direction: this._dirCache,
              attacker: this.owner ?? target
            });
          }

          if (this.definition.healAmount > 0) {
            if (typeof target.heal === 'function') {
              target.heal(this.definition.healAmount);
            } else {
              target.attributes.hp = Math.min(target.attributes.maxHp, target.attributes.hp + this.definition.healAmount);
            }
          }

          if (this.definition.statusFactory && typeof target.applyStatus === 'function') {
            const status = this.definition.statusFactory(target);
            if (status) target.applyStatus(status);
          }

          if (this.definition.onTick) {
            this.definition.onTick(tickCtx);
          }
        }

        if (this.definition.onExit) {
          for (const prevId of this._insideEntities) {
            if (!currentFrameInside.has(prevId)) {
              const exitedTarget = neighbors.find((n: any) => n && n.id === prevId);
              if (exitedTarget) {
                this.definition.onExit({
                  hazard: this,
                  target: exitedTarget,
                  eventManager: this.eventManager
                });
              }
            }
          }
        }

        this._insideEntities = currentFrameInside;
      }
    });
  }

  public destroy(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    if (this.definition.onDestroy) {
      this.definition.onDestroy(this, this.eventManager);
    }

    this.eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Zona de Solo] '${this.definition.name}' expirou.`,
      params: []
    });
  }
}

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: ZONAS E EFEITOS DE SOLO (GroundHazardTemplate)
 * ==============================================================================
 * Fluent Builder para criação de poças venenosas, santuários de cura,
 * armadilhas e campos elementais no solo.
 * ==============================================================================
 */
export default class GroundHazardTemplate {
  private _radius: number = 80;
  private _duration: number = 6.0;
  private _tickInterval: number = 0.5;
  private _targetFilter: GroundHazardTargetFilter = 'enemies';
  private _damageAmount: number = 0;
  private _damageType: 'physical' | 'magical' | 'true' = 'magical';
  private _healAmount: number = 0;
  private _statusFactory?: ((target: Entity) => any) | undefined;
  private _particleEffect?: string | undefined;
  private _particleColor?: string | undefined;
  private _visualType?: string | undefined;
  private _onTick?: ((ctx: GroundHazardTickContext) => void) | undefined;
  private _onEnter?: ((ctx: GroundHazardTickContext) => void) | undefined;
  private _onExit?: ((ctx: GroundHazardTickContext) => void) | undefined;
  private _onDestroy?: ((hazard: GroundHazardInstance, eventManager: IEventManager) => void) | undefined;

  private constructor(private readonly _id: string, private readonly _name: string) {}

  public static create(id: string, name: string): GroundHazardTemplate {
    return new GroundHazardTemplate(id, name);
  }

  public withRadius(radius: number): this {
    this._radius = radius;
    return this;
  }

  public withDuration(seconds: number): this {
    this._duration = seconds;
    return this;
  }

  public withTickInterval(seconds: number): this {
    this._tickInterval = seconds;
    return this;
  }

  public withTargetFilter(filter: GroundHazardTargetFilter): this {
    this._targetFilter = filter;
    return this;
  }

  public withDamage(amount: number, type: 'physical' | 'magical' | 'true' = 'magical'): this {
    this._damageAmount = amount;
    this._damageType = type;
    return this;
  }

  public withHealing(amount: number): this {
    this._healAmount = amount;
    this._targetFilter = 'allies';
    return this;
  }

  public withStatus(statusFactory: (target: Entity) => any): this {
    this._statusFactory = statusFactory;
    return this;
  }

  public withParticle(effect: string, color?: string): this {
    this._particleEffect = effect;
    this._particleColor = color;
    return this;
  }

  public withVisual(visualType: string): this {
    this._visualType = visualType;
    return this;
  }

  public onTick(handler: (ctx: GroundHazardTickContext) => void): this {
    this._onTick = handler;
    return this;
  }

  public onEnter(handler: (ctx: GroundHazardTickContext) => void): this {
    this._onEnter = handler;
    return this;
  }

  public onExit(handler: (ctx: GroundHazardTickContext) => void): this {
    this._onExit = handler;
    return this;
  }

  public onDestroy(handler: (hazard: GroundHazardInstance, eventManager: IEventManager) => void): this {
    this._onDestroy = handler;
    return this;
  }

  public build(): IGroundHazardDefinition {
    return {
      id: this._id,
      name: this._name,
      radius: this._radius,
      duration: this._duration,
      tickInterval: this._tickInterval,
      targetFilter: this._targetFilter,
      damageAmount: this._damageAmount,
      damageType: this._damageType,
      healAmount: this._healAmount,
      statusFactory: this._statusFactory,
      particleEffect: this._particleEffect,
      particleColor: this._particleColor,
      visualType: this._visualType,
      onTick: this._onTick,
      onEnter: this._onEnter,
      onExit: this._onExit,
      onDestroy: this._onDestroy
    };
  }

  public spawnAt(coordinates: { x: number; y: number }, owner: Entity | null, eventManager: IEventManager): GroundHazardInstance {
    return new GroundHazardInstance(this.build(), coordinates, owner, eventManager);
  }
}
