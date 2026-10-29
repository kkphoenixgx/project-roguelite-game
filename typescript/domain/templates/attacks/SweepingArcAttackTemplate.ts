import type { IEventManager } from "../../eventDispacher/IGameEvents";
import Vector2D from "../../shared/Vector2D";
import Entity from "../../ObjectModule/Entities/Entity";
import Attack from "../../ObjectModule/Items/Attack";

export interface SweepingArcHitContext {
  readonly target: Entity;
  readonly arcAngle: number;
  readonly eventManager: IEventManager;
}

export interface ISweepingArcDefinition {
  readonly id: string;
  readonly name: string;
  readonly arcSpreadAngleRad: number; // ex: Math.PI * 0.75 (~135 graus)
  readonly radius: number;
  readonly hitboxRadius?: number | undefined;
  readonly durationSec: number; // tempo que o corte leva para varrer o arco (ex: 0.18s)
  readonly dexteritySpeedScaling: number; // mais destreza = corte mais rápido
  readonly particleEffect?: string | undefined;
  readonly particleColor?: string | undefined;
  readonly attackFactory: (owner: Entity) => Attack;
  readonly onHit?: ((ctx: SweepingArcHitContext) => void) | undefined;
  readonly onComplete?: ((owner: Entity, eventManager: IEventManager) => void) | undefined;
}

/**
 * ==============================================================================
 * INSTÂNCIA ATIVA DE CORTE EM ARCO (ActiveSweepingArc)
 * ==============================================================================
 * Varre um setor circular dinâmico a partir do ângulo central mirado pelo jogador,
 * calculando o ponto exato da lâmina a cada fração de segundo. Zero-GC.
 * ==============================================================================
 */
export class ActiveSweepingArc {
  private _elapsedTime: number = 0;
  private _finalDuration: number;
  private _startAngle: number;
  private _currentAngle: number;
  private _isFinished: boolean = false;
  private _hitEntities: Set<number> = new Set();
  private _attackInstance: Attack;
  private _dirCache: Vector2D = new Vector2D(0, 0);

  constructor(
    public readonly definition: ISweepingArcDefinition,
    public readonly owner: Entity,
    centralFacingAngle: number,
    public readonly eventManager: IEventManager
  ) {
    this._attackInstance = definition.attackFactory(owner);

    // Ajusta duração por destreza
    const dex = owner.attributes?.dexterity || 10;
    const speedMult = 1 + (dex * definition.dexteritySpeedScaling);
    this._finalDuration = Math.max(0.05, definition.durationSec / speedMult);

    // O arco inicia na metade esquerda do leque e viaja até a metade direita
    const halfArc = definition.arcSpreadAngleRad / 2;
    this._startAngle = centralFacingAngle - halfArc;
    this._currentAngle = this._startAngle;

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Corte em Arco: ${definition.name}] Disparado! Duracao: ${(this._finalDuration * 1000).toFixed(0)}ms.`,
      params: []
    });
  }

  public get isFinished(): boolean {
    return this._isFinished;
  }

  public get finalDuration(): number {
    return this._finalDuration;
  }

  public get currentAngle(): number {
    return this._currentAngle;
  }

  public update(deltaTime: number): void {
    if (this._isFinished) return;

    this._elapsedTime += deltaTime;
    const progress = Math.min(1.0, this._elapsedTime / this._finalDuration);
    this._currentAngle = this._startAngle + (this.definition.arcSpreadAngleRad * progress);

    const cx = this.owner.coordinates.x + this.owner.size.width / 2;
    const cy = this.owner.coordinates.y + this.owner.size.height / 2;
    const bladeX = cx + this.definition.radius * Math.cos(this._currentAngle);
    const bladeY = cy + this.definition.radius * Math.sin(this._currentAngle);

    if (this.definition.particleEffect) {
      const particlePayload: any = {
        effect: this.definition.particleEffect,
        x: bladeX,
        y: bladeY
      };
      if (this.definition.particleColor) particlePayload.color = this.definition.particleColor;
      this.eventManager.dispatch('particle', particlePayload);
    }

    const hRadius = this.definition.hitboxRadius || 28;
    this.checkCollisions(bladeX, bladeY, hRadius);

    // Varredura proximal para cobrir proximidade imediata ao atacante (Zero dead-zone)
    if (this.definition.radius > hRadius) {
      const midX = cx + (this.definition.radius * 0.45) * Math.cos(this._currentAngle);
      const midY = cy + (this.definition.radius * 0.45) * Math.sin(this._currentAngle);
      this.checkCollisions(midX, midY, hRadius);
    }

    if (progress >= 1.0) {
      this.finish();
    }
  }

  private checkCollisions(bladeX: number, bladeY: number, collisionRadius: number = 28): void {
    this.eventManager.dispatch('requestNeighbors', {
      coordinates: { x: bladeX, y: bladeY },
      radius: collisionRadius,
      callback: (neighbors: any[]) => {
        if (!neighbors) return;

        for (let i = 0; i < neighbors.length; i++) {
          const target = neighbors[i]!;
          if (!target || target.id === this.owner.id || target.objectId === this.owner.objectId) continue;
          if (this._hitEntities.has(target.id)) continue;
          if (!('attributes' in target) || target.attributes.hp <= 0 || typeof target.takeDamage !== 'function') continue;

          this._hitEntities.add(target.id);

          this._dirCache.x = Math.cos(this._currentAngle);
          this._dirCache.y = Math.sin(this._currentAngle);

          this._attackInstance.execute(target, this._dirCache);

          if (this.definition.onHit) {
            this.definition.onHit({
              target,
              arcAngle: this._currentAngle,
              eventManager: this.eventManager
            });
          }
        }
      }
    });
  }

  public finish(): void {
    if (this._isFinished) return;
    this._isFinished = true;
    this._hitEntities.clear();

    if (this.definition.onComplete) {
      this.definition.onComplete(this.owner, this.eventManager);
    }
  }
}

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: CORTE EM ARCO / CLEAVE (SweepingArcAttackTemplate)
 * ==============================================================================
 * Fluent Builder para golpes amplos direcionais de espada, machado ou foice.
 * ==============================================================================
 */
export default class SweepingArcAttackTemplate {
  private _arcSpreadAngleRad: number = Math.PI * 0.75; // 135 graus
  private _radius: number = 52;
  private _hitboxRadius?: number;
  private _durationSec: number = 0.18;
  private _dexteritySpeedScaling: number = 0.03;
  private _particleEffect?: string | undefined;
  private _particleColor?: string | undefined;
  private _attackFactory: (owner: Entity) => Attack;
  private _onHit?: ((ctx: SweepingArcHitContext) => void) | undefined;
  private _onComplete?: ((owner: Entity, eventManager: IEventManager) => void) | undefined;

  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    attackFactory: (owner: Entity) => Attack
  ) {
    this._attackFactory = attackFactory;
  }

  public static create(id: string, name: string, attackFactory: (owner: Entity) => Attack): SweepingArcAttackTemplate {
    return new SweepingArcAttackTemplate(id, name, attackFactory);
  }

  public withArcAngleDegrees(degrees: number): this {
    this._arcSpreadAngleRad = (degrees * Math.PI) / 180;
    return this;
  }

  public withRadius(radius: number): this {
    this._radius = radius;
    return this;
  }

  public withHitboxRadius(radius: number): this {
    this._hitboxRadius = radius;
    return this;
  }

  public withDuration(seconds: number): this {
    this._durationSec = seconds;
    return this;
  }

  public withDexterityScaling(scaling: number): this {
    this._dexteritySpeedScaling = scaling;
    return this;
  }

  public withParticle(effect: string, color?: string): this {
    this._particleEffect = effect;
    this._particleColor = color;
    return this;
  }

  public onHit(handler: (ctx: SweepingArcHitContext) => void): this {
    this._onHit = handler;
    return this;
  }

  public onComplete(handler: (owner: Entity, eventManager: IEventManager) => void): this {
    this._onComplete = handler;
    return this;
  }

  public build(): ISweepingArcDefinition {
    return {
      id: this._id,
      name: this._name,
      arcSpreadAngleRad: this._arcSpreadAngleRad,
      radius: this._radius,
      hitboxRadius: this._hitboxRadius,
      durationSec: this._durationSec,
      dexteritySpeedScaling: this._dexteritySpeedScaling,
      particleEffect: this._particleEffect,
      particleColor: this._particleColor,
      attackFactory: this._attackFactory,
      onHit: this._onHit,
      onComplete: this._onComplete
    };
  }

  public sweep(owner: Entity, facingAngle: number, eventManager: IEventManager): ActiveSweepingArc {
    return new ActiveSweepingArc(this.build(), owner, facingAngle, eventManager);
  }
}
