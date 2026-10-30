import type { IEventManager } from "../../eventDispacher/IGameEvents";
import Vector2D from "../../shared/Vector2D";
import Entity from "../../ObjectModule/Entities/Entity";
import Attack from "../../ObjectModule/Items/Attack";

export interface NovaBurstHitContext {
  readonly target: Entity;
  readonly distance: number;
  readonly eventManager: IEventManager;
}

export interface INovaBurstDefinition {
  readonly id: string;
  readonly name: string;
  readonly startRadius: number;
  readonly maxRadius: number;
  readonly expansionSpeed: number; //? Velocidade de expansão da onda de choque em pixels por segundo
  readonly ringThickness: number; //? Largura da frente de onda expansiva em pixels
  readonly particleEffect?: string | undefined;
  readonly particleColor?: string | undefined;
  readonly particleCount?: number | undefined;
  readonly attackFactory: (owner: Entity) => Attack;
  readonly onHit?: ((ctx: NovaBurstHitContext) => void) | undefined;
  readonly onComplete?: ((owner: Entity, eventManager: IEventManager) => void) | undefined;
}

/**
 * ==============================================================================
 * INSTÂNCIA ATIVA DE ONDA EXPANSIVA / NOVA (ActiveNovaBurst)
 * ==============================================================================
 * Emite uma frente de onda circular expansiva que viaja do centro para fora,
 * atingindo cada inimigo uma única vez conforme a onda colide com eles.
 * ==============================================================================
 */
export class ActiveNovaBurst {
  public currentRadius: number;
  private _isFinished: boolean = false;
  private _hitEntities: Set<number> = new Set();
  private _attackInstance: Attack;
  private _dirCache: Vector2D = new Vector2D(0, 0);
  public readonly origin: { x: number; y: number };
  private _particleTimer: number = 0.035;
  private readonly _particleInterval: number = 0.035;

  constructor(
    public readonly definition: INovaBurstDefinition,
    public readonly owner: Entity,
    coordinates: { x: number; y: number },
    public readonly eventManager: IEventManager
  ) {
    this.origin = { x: coordinates.x, y: coordinates.y };
    this.currentRadius = definition.startRadius;
    this._attackInstance = definition.attackFactory(owner);

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `💥 [Onda Expansiva: ${definition.name}] Detonada! Alcance máximo: ${definition.maxRadius}px.`,
      params: []
    });
  }

  public get isFinished(): boolean {
    return this._isFinished;
  }

  public update(deltaTime: number): void {
    if (this._isFinished) return;

    this.currentRadius += this.definition.expansionSpeed * deltaTime;

    if (this.currentRadius >= this.definition.maxRadius) {
      this.finish();
      return;
    }

    if (this.definition.particleEffect) {
      this._particleTimer += deltaTime;
      if (this._particleTimer >= this._particleInterval) {
        this._particleTimer = 0;
    //? Emite partículas na borda do anel expansivo em padrão octogonal
        const points = 8;
        const angleStep = (Math.PI * 2) / points;
        const count = this.definition.particleCount ?? 2;
        for (let i = 0; i < points; i++) {
          const angle = i * angleStep;
          const px = this.origin.x + this.currentRadius * Math.cos(angle);
          const py = this.origin.y + this.currentRadius * Math.sin(angle);
          const particlePayload: any = {
            effect: this.definition.particleEffect,
            x: px,
            y: py,
            count
          };
          if (this.definition.particleColor) particlePayload.color = this.definition.particleColor;
          this.eventManager.dispatch('particle', particlePayload);
        }
      }
    }

    this.checkCollisions();
  }

  private checkCollisions(): void {
    const minR = Math.max(0, this.currentRadius - this.definition.ringThickness);
    const maxR = this.currentRadius + this.definition.ringThickness;

    this.eventManager.dispatch('requestNeighbors', {
      coordinates: this.origin,
      radius: maxR,
      callback: (neighbors: any[]) => {
        if (!neighbors) return;

        for (let i = 0; i < neighbors.length; i++) {
          const target = neighbors[i]!;
          if (!target || target.id === this.owner.id || target.objectId === this.owner.objectId) continue;
          if (this._hitEntities.has(target.id)) continue;
          if (!('attributes' in target) || target.attributes.hp <= 0 || typeof target.takeDamage !== 'function') continue;

          const tcx = target.coordinates.x + target.size.width / 2;
          const tcy = target.coordinates.y + target.size.height / 2;
          const dx = tcx - this.origin.x;
          const dy = tcy - this.origin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

    //? Verifica se o raio do alvo intercepta a espessura do anel expansivo
          if (dist >= minR && dist <= maxR) {
            this._hitEntities.add(target.id);

            this._dirCache.x = dx;
            this._dirCache.y = dy;
            this._dirCache.normalizeMut();

            this._attackInstance.execute(target, this._dirCache);

            if (this.definition.onHit) {
              this.definition.onHit({
                target,
                distance: dist,
                eventManager: this.eventManager
              });
            }
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
 * TEMPLATE ARQUETÍPICO: ONDA EXPANSIVA / NOVA (NovaBurstAttackTemplate)
 * ==============================================================================
 * Fluent Builder para ondas de choque, explosões em anel e pulsos de força.
 * ==============================================================================
 */
export default class NovaBurstAttackTemplate {
  private _startRadius: number = 16;
  private _maxRadius: number = 180;
  private _expansionSpeed: number = 320; //? Velocidade de propagação da onda em pixels por segundo
  private _ringThickness: number = 28;
  private _particleEffect?: string | undefined;
  private _particleColor?: string | undefined;
  private _attackFactory: (owner: Entity) => Attack;
  private _onHit?: ((ctx: NovaBurstHitContext) => void) | undefined;
  private _onComplete?: ((owner: Entity, eventManager: IEventManager) => void) | undefined;

  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    attackFactory: (owner: Entity) => Attack
  ) {
    this._attackFactory = attackFactory;
  }

  public static create(id: string, name: string, attackFactory: (owner: Entity) => Attack): NovaBurstAttackTemplate {
    return new NovaBurstAttackTemplate(id, name, attackFactory);
  }

  public withStartRadius(radius: number): this {
    this._startRadius = radius;
    return this;
  }

  public withMaxRadius(radius: number): this {
    this._maxRadius = radius;
    return this;
  }

  public withExpansionSpeed(pixelsPerSec: number): this {
    this._expansionSpeed = pixelsPerSec;
    return this;
  }

  public withRingThickness(thickness: number): this {
    this._ringThickness = thickness;
    return this;
  }

  private _particleCount?: number | undefined;

  public withParticle(effect: string, color?: string, count: number = 2): this {
    this._particleEffect = effect;
    this._particleColor = color;
    this._particleCount = count;
    return this;
  }

  public onHit(handler: (ctx: NovaBurstHitContext) => void): this {
    this._onHit = handler;
    return this;
  }

  public onComplete(handler: (owner: Entity, eventManager: IEventManager) => void): this {
    this._onComplete = handler;
    return this;
  }

  public build(): INovaBurstDefinition {
    return {
      id: this._id,
      name: this._name,
      startRadius: this._startRadius,
      maxRadius: this._maxRadius,
      expansionSpeed: this._expansionSpeed,
      ringThickness: this._ringThickness,
      particleEffect: this._particleEffect,
      particleColor: this._particleColor,
      particleCount: this._particleCount,
      attackFactory: this._attackFactory,
      onHit: this._onHit,
      onComplete: this._onComplete
    };
  }

  public triggerAt(coordinates: { x: number; y: number }, owner: Entity, eventManager: IEventManager): ActiveNovaBurst {
    return new ActiveNovaBurst(this.build(), owner, coordinates, eventManager);
  }
}
