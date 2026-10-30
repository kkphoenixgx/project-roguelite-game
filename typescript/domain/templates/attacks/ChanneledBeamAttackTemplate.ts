import type { IEventManager } from "../../eventDispacher/IGameEvents";
import Vector2D from "../../shared/Vector2D";
import Entity from "../../ObjectModule/Entities/Entity";
import Attack from "../../ObjectModule/Items/Attack";

export interface BeamHitContext {
  readonly target: Entity;
  readonly beamAngle: number;
  readonly eventManager: IEventManager;
}

export interface IChanneledBeamDefinition {
  readonly id: string;
  readonly name: string;
  /** Comprimento do raio em pixels. */
  readonly length: number;
  /** Largura da linha de impacto. */
  readonly width: number;
  /** Intervalo entre pulsos de dano (ex: 0.15s). */
  readonly tickIntervalSec: number;
  /** Duração máxima de canalização (<= 0 para infinito até soltar tecla). */
  readonly maxChannelSec: number;
  /** Velocidade máxima que o feixe consegue girar acompanhando o mouse. */
  readonly turnRateRadPerSec: number;
  readonly particleEffect?: string | undefined;
  readonly particleColor?: string | undefined;
  readonly attackFactory: (owner: Entity) => Attack;
  readonly onHit?: ((ctx: BeamHitContext) => void) | undefined;
  readonly onChannelEnd?: ((owner: Entity, eventManager: IEventManager) => void) | undefined;
}

/**
 * ==============================================================================
 * INSTÂNCIA ATIVA DE RAIO CANALIZADO (ActiveChanneledBeam)
 * ==============================================================================
 * Controla um feixe contínuo emitido a partir do jogador, que rotaciona suavemente
 * na direção do mouse e emite ticks de impacto ao longo de seu comprimento.
 * ==============================================================================
 */
export class ActiveChanneledBeam {
  public currentAngle: number;
  private _targetAngle: number;
  private _timeUntilNextTick: number;
  private _channelTimer: number = 0;
  private _isActive: boolean = true;
  private _attackInstance: Attack;
  private _dirCache: Vector2D = new Vector2D(0, 0);

  constructor(
    public readonly definition: IChanneledBeamDefinition,
    public readonly owner: Entity,
    initialAngle: number,
    public readonly eventManager: IEventManager
  ) {
    this.currentAngle = initialAngle;
    this._targetAngle = initialAngle;
    this._timeUntilNextTick = 0;
    this._attackInstance = definition.attackFactory(owner);

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `⚡ [Feixe Canalizado: ${definition.name}] Disparado! Alcance: ${definition.length}px.`,
      params: []
    });
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public setAimCoordinates(targetCoords: { x: number; y: number }): void {
    const cx = this.owner.coordinates.x + this.owner.size.width / 2;
    const cy = this.owner.coordinates.y + this.owner.size.height / 2;
    this._targetAngle = Math.atan2(targetCoords.y - cy, targetCoords.x - cx);
  }

  public setTargetAngle(targetAngleRad: number): void {
    this._targetAngle = targetAngleRad;
  }

  public update(deltaTime: number): void {
    if (!this._isActive) return;

    if (this.definition.maxChannelSec > 0) {
      this._channelTimer += deltaTime;
      if (this._channelTimer >= this.definition.maxChannelSec) {
        this.stop();
        return;
      }
    }

    this.smoothRotate(deltaTime);

    this._timeUntilNextTick -= deltaTime;
    if (this._timeUntilNextTick <= 0) {
      this._timeUntilNextTick += this.definition.tickIntervalSec;
      this.executeBeamTick();
    }
  }

  private smoothRotate(deltaTime: number): void {
    let diff = this._targetAngle - this.currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const maxDelta = this.definition.turnRateRadPerSec * deltaTime;
    if (Math.abs(diff) <= maxDelta) {
      this.currentAngle = this._targetAngle;
    } else {
      this.currentAngle += Math.sign(diff) * maxDelta;
    }
  }

  private executeBeamTick(): void {
    const cx = this.owner.coordinates.x + this.owner.size.width / 2;
    const cy = this.owner.coordinates.y + this.owner.size.height / 2;

    if (this.definition.particleEffect) {
      for (let dist = 32; dist <= this.definition.length; dist += 48) {
        const px = cx + dist * Math.cos(this.currentAngle);
        const py = cy + dist * Math.sin(this.currentAngle);
        const particlePayload: any = {
          effect: this.definition.particleEffect,
          x: px,
          y: py
        };
        if (this.definition.particleColor) particlePayload.color = this.definition.particleColor;
        this.eventManager.dispatch('particle', particlePayload);
      }
    }

    //? Projeção ortogonal de segmento linear para detecção precisa de contato ao longo do feixe.
    this.eventManager.dispatch('requestNeighbors', {
      coordinates: { x: cx, y: cy },
      radius: this.definition.length,
      callback: (neighbors: any[]) => {
        if (!neighbors) return;

        const beamDirX = Math.cos(this.currentAngle);
        const beamDirY = Math.sin(this.currentAngle);
        const halfWidth = this.definition.width / 2;

        for (let i = 0; i < neighbors.length; i++) {
          const target = neighbors[i]!;
          if (!target || target.id === this.owner.id || target.objectId === this.owner.objectId) continue;
          if (!('attributes' in target) || target.attributes.hp <= 0 || typeof target.takeDamage !== 'function') continue;

          const tcx = target.coordinates.x + target.size.width / 2;
          const tcy = target.coordinates.y + target.size.height / 2;
          const toTargetX = tcx - cx;
          const toTargetY = tcy - cy;

          //? Produto escalar e distância perpendicular à reta do feixe.
          const dot = toTargetX * beamDirX + toTargetY * beamDirY;
          if (dot < 0 || dot > this.definition.length) continue;

          const perpDist = Math.abs(toTargetX * (-beamDirY) + toTargetY * beamDirX);
          if (perpDist <= halfWidth + (target.size.width / 2)) {
            this._dirCache.x = beamDirX;
            this._dirCache.y = beamDirY;

            this._attackInstance.execute(target, this._dirCache);

            if (this.definition.onHit) {
              this.definition.onHit({
                target,
                beamAngle: this.currentAngle,
                eventManager: this.eventManager
              });
            }
          }
        }
      }
    });
  }

  public stop(): void {
    if (!this._isActive) return;
    this._isActive = false;

    if (this.definition.onChannelEnd) {
      this.definition.onChannelEnd(this.owner, this.eventManager);
    }
  }
}

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: RAIO CANALIZADO (ChanneledBeamAttackTemplate)
 * ==============================================================================
 * Fluent Builder para feixes contínuos, raios de gelo/laser e chamas direcionais.
 * ==============================================================================
 */
export default class ChanneledBeamAttackTemplate {
  private _length: number = 220;
  private _width: number = 20;
  private _tickIntervalSec: number = 0.15;
  private _maxChannelSec: number = 5.0;
  private _turnRateRadPerSec: number = Math.PI * 2;
  private _particleEffect?: string | undefined;
  private _particleColor?: string | undefined;
  private _attackFactory: (owner: Entity) => Attack;
  private _onHit?: ((ctx: BeamHitContext) => void) | undefined;
  private _onChannelEnd?: ((owner: Entity, eventManager: IEventManager) => void) | undefined;

  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    attackFactory: (owner: Entity) => Attack
  ) {
    this._attackFactory = attackFactory;
  }

  public static create(id: string, name: string, attackFactory: (owner: Entity) => Attack): ChanneledBeamAttackTemplate {
    return new ChanneledBeamAttackTemplate(id, name, attackFactory);
  }

  public withLength(pixels: number): this {
    this._length = pixels;
    return this;
  }

  public withWidth(pixels: number): this {
    this._width = pixels;
    return this;
  }

  public withTickInterval(seconds: number): this {
    this._tickIntervalSec = seconds;
    return this;
  }

  public withMaxChannelDuration(seconds: number): this {
    this._maxChannelSec = seconds;
    return this;
  }

  public withTurnRateDegreesPerSec(degrees: number): this {
    this._turnRateRadPerSec = (degrees * Math.PI) / 180;
    return this;
  }

  public withParticle(effect: string, color?: string): this {
    this._particleEffect = effect;
    this._particleColor = color;
    return this;
  }

  public onHit(handler: (ctx: BeamHitContext) => void): this {
    this._onHit = handler;
    return this;
  }

  public onChannelEnd(handler: (owner: Entity, eventManager: IEventManager) => void): this {
    this._onChannelEnd = handler;
    return this;
  }

  public build(): IChanneledBeamDefinition {
    return {
      id: this._id,
      name: this._name,
      length: this._length,
      width: this._width,
      tickIntervalSec: this._tickIntervalSec,
      maxChannelSec: this._maxChannelSec,
      turnRateRadPerSec: this._turnRateRadPerSec,
      particleEffect: this._particleEffect,
      particleColor: this._particleColor,
      attackFactory: this._attackFactory,
      onHit: this._onHit,
      onChannelEnd: this._onChannelEnd
    };
  }

  public channel(owner: Entity, initialAngle: number, eventManager: IEventManager): ActiveChanneledBeam {
    return new ActiveChanneledBeam(this.build(), owner, initialAngle, eventManager);
  }
}
