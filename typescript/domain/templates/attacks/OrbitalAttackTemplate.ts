import type { IEventManager } from "../../eventDispacher/IGameEvents";
import Vector2D from "../../shared/Vector2D";
import Entity from "../../ObjectModule/Entities/Entity";
import Attack from "../../ObjectModule/Items/Attack";

export type OrbitalKnockbackMode = 'tangential' | 'radial' | 'pull';

export interface OrbitalHitContext {
  readonly orbital: ActiveOrbitalAttack;
  readonly target: Entity;
  readonly currentAngle: number;
  readonly eventManager: IEventManager;
}

export interface IOrbitalAttackDefinition {
  readonly id: string;
  readonly name: string;
  readonly baseRadius: number;
  readonly baseAngularSpeed: number; // radianos por segundo (ex: 2 * Math.PI = 1 volta por segundo)
  readonly rotations: number; // quantidade de voltas (<= 0 para infinito / canalizado)
  readonly dexterityScaling: number; // cada ponto de destreza acelera a rotação
  readonly strengthRadiusScaling: number; // cada ponto de força aumenta o raio de alcance
  readonly hitboxRadius: number; // tamanho da lâmina giratória
  readonly targetHitCooldownMs: number; // previne múltiplos hits seguidos no mesmo inimigo no mesmo giro
  readonly knockbackMode: OrbitalKnockbackMode;
  readonly visualEffect?: string | undefined;
  readonly particleEffect?: string | undefined;
  readonly particleColor?: string | undefined;
  readonly attackFactory: (owner: Entity) => Attack;
  readonly onHit?: ((ctx: OrbitalHitContext) => void) | undefined;
  readonly onComplete?: ((owner: Entity, eventManager: IEventManager) => void) | undefined;
}

/**
 * ==============================================================================
 * INSTÂNCIA ATIVA DE ATAQUE ORBITAL / GIRATÓRIO (ActiveOrbitalAttack)
 * ==============================================================================
 * Controla a lâmina/hitbox que viaja em trajetória paramétrica circular em torno
 * de uma entidade âncora (o jogador ou lacaio).
 * 
 * Filosofia de Design e Performance:
 * - Zero-GC: Reutiliza vetores de direção e coordenadas in-place no frame loop.
 * - Desacoplado: O jogador apenas move-se; a lâmina segue o centro do jogador.
 * - Cooldown por Alvo: Garante que um inimigo tome hit por volta ou intervalo seguro.
 * ==============================================================================
 */
export class ActiveOrbitalAttack {
  public currentAngle: number;
  private _accumulatedRotation: number = 0;
  private _maxRotation: number;
  private _isFinished: boolean = false;
  private _hitCooldowns: Map<number, number> = new Map();
  private _dirCache: Vector2D = new Vector2D(0, 0);
  private _attackInstance: Attack;

  // Parâmetros computados baseados nos atributos do mestre
  public readonly angularSpeed: number;
  public readonly radius: number;

  constructor(
    public readonly definition: IOrbitalAttackDefinition,
    public readonly owner: Entity,
    public readonly eventManager: IEventManager,
    initialAngle: number = 0
  ) {
    this.currentAngle = initialAngle;
    this._maxRotation = definition.rotations > 0 ? definition.rotations * Math.PI * 2 : Infinity;
    this._attackInstance = definition.attackFactory(owner);

    // 1. Velocidade Angular escalonada por Destreza
    const dex = owner.attributes?.dexterity || 10;
    this.angularSpeed = definition.baseAngularSpeed + (dex * definition.dexterityScaling);

    // 2. Raio da órbita escalonado por Força e Área de Efeito
    const str = owner.attributes?.strength || 10;
    const bonusAreaPercent = (owner.attributes as any)?.bonusArea || 0;
    const baseWithStr = definition.baseRadius + (str * definition.strengthRadiusScaling);
    this.radius = Math.round(baseWithStr * (1 + (bonusAreaPercent / 100)));

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Ataque Giratorio: ${definition.name}] Iniciado! Raio: ${this.radius}px, Velocidade: ${this.angularSpeed.toFixed(2)} rad/s.`,
      params: []
    });
  }

  public get isFinished(): boolean {
    return this._isFinished;
  }

  public get currentCoordinates(): { x: number; y: number } {
    const cx = this.owner.coordinates.x + this.owner.size.width / 2;
    const cy = this.owner.coordinates.y + this.owner.size.height / 2;
    return {
      x: cx + this.radius * Math.cos(this.currentAngle),
      y: cy + this.radius * Math.sin(this.currentAngle)
    };
  }

  public update(deltaTime: number): void {
    if (this._isFinished) return;

    // Avança o ângulo angular
    const deltaAngle = this.angularSpeed * deltaTime;
    this.currentAngle += deltaAngle;
    this._accumulatedRotation += deltaAngle;

    // Verifica conclusão por número de voltas
    if (this._accumulatedRotation >= this._maxRotation) {
      this.finish();
      return;
    }

    // Calcula coordenadas atuais da lâmina giratória
    const bladeCoords = this.currentCoordinates;

    // Partículas e trilha visual desacoplada
    if (this.definition.particleEffect) {
      const particlePayload: any = {
        effect: this.definition.particleEffect,
        x: bladeCoords.x,
        y: bladeCoords.y
      };
      if (this.definition.particleColor) particlePayload.color = this.definition.particleColor;
      this.eventManager.dispatch('particle', particlePayload);
    }

    // Consulta e atinge inimigos no ponto exato da lâmina
    this.checkCollisionsAtBlade(bladeCoords);
  }

  private checkCollisionsAtBlade(bladeCoords: { x: number; y: number }): void {
    const now = Date.now();

    this.eventManager.dispatch('requestNeighbors', {
      coordinates: bladeCoords,
      radius: this.definition.hitboxRadius,
      callback: (neighbors: any[]) => {
        if (!neighbors || neighbors.length === 0) return;

        for (let i = 0; i < neighbors.length; i++) {
          const target = neighbors[i]!;
          if (!target || target.id === this.owner.id || target.objectId === this.owner.objectId) continue;
          if (!('attributes' in target) || target.attributes.hp <= 0 || typeof target.takeDamage !== 'function') continue;

          // Valida cooldown de contato individual por inimigo
          const nextHitTime = this._hitCooldowns.get(target.id) || 0;
          if (now < nextHitTime) continue;

          // Registra novo cooldown para este inimigo
          this._hitCooldowns.set(target.id, now + this.definition.targetHitCooldownMs);

          // Calcula direção de arremesso/knockback
          this.computeKnockbackDirection(bladeCoords, target.coordinates);

          // Executa o golpe
          this._attackInstance.execute(target, this._dirCache);

          if (this.definition.onHit) {
            this.definition.onHit({
              orbital: this,
              target,
              currentAngle: this.currentAngle,
              eventManager: this.eventManager
            });
          }
        }
      }
    });
  }

  private computeKnockbackDirection(bladeCoords: { x: number; y: number }, targetCoords: { x: number; y: number }): void {
    if (this.definition.knockbackMode === 'tangential') {
      // Vetor tangente à rotação circular: (-sin(θ), cos(θ))
      this._dirCache.x = -Math.sin(this.currentAngle);
      this._dirCache.y = Math.cos(this.currentAngle);
      this._dirCache.normalizeMut();
    } else if (this.definition.knockbackMode === 'radial') {
      // Empurra para fora do centro do jogador
      this._dirCache.x = targetCoords.x - this.owner.coordinates.x;
      this._dirCache.y = targetCoords.y - this.owner.coordinates.y;
      this._dirCache.normalizeMut();
    } else if (this.definition.knockbackMode === 'pull') {
      // Puxa em direção à lâmina
      this._dirCache.x = bladeCoords.x - targetCoords.x;
      this._dirCache.y = bladeCoords.y - targetCoords.y;
      this._dirCache.normalizeMut();
    } else {
      this._dirCache.resetMut();
    }
  }

  public finish(): void {
    if (this._isFinished) return;
    this._isFinished = true;
    this._hitCooldowns.clear();

    if (this.definition.onComplete) {
      this.definition.onComplete(this.owner, this.eventManager);
    }

    this.eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Ataque Giratorio: ${this.definition.name}] Rotacao finalizada.`,
      params: []
    });
  }
}

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: ATAQUE ORBITAL / GIRATÓRIO (OrbitalAttackTemplate)
 * ==============================================================================
 * Fluent Builder para ataques circulares contínuos com física orbital real.
 * ==============================================================================
 */
export default class OrbitalAttackTemplate {
  private _baseRadius: number = 48;
  private _baseAngularSpeed: number = Math.PI * 3; // ~1.5 voltas por segundo
  private _rotations: number = 2; // 2 voltas completas por padrão
  private _dexterityScaling: number = 0.04; // +4% de velocidade angular por ponto de Destreza
  private _strengthRadiusScaling: number = 0.02; // +2% de alcance por ponto de Força
  private _hitboxRadius: number = 24; // raio de impacto da espada
  private _targetHitCooldownMs: number = 300; // no máximo 1 hit a cada 300ms por alvo
  private _knockbackMode: OrbitalKnockbackMode = 'tangential';
  private _visualEffect?: string | undefined;
  private _particleEffect?: string | undefined;
  private _particleColor?: string | undefined;
  private _attackFactory: (owner: Entity) => Attack;
  private _onHit?: ((ctx: OrbitalHitContext) => void) | undefined;
  private _onComplete?: ((owner: Entity, eventManager: IEventManager) => void) | undefined;

  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    attackFactory: (owner: Entity) => Attack
  ) {
    this._attackFactory = attackFactory;
  }

  public static create(id: string, name: string, attackFactory: (owner: Entity) => Attack): OrbitalAttackTemplate {
    return new OrbitalAttackTemplate(id, name, attackFactory);
  }

  public withBaseRadius(radius: number): this {
    this._baseRadius = radius;
    return this;
  }

  public withAngularSpeed(radPerSecond: number): this {
    this._baseAngularSpeed = radPerSecond;
    return this;
  }

  public withRotations(rotations: number): this {
    this._rotations = rotations;
    return this;
  }

  public withDexterityScaling(scalingPerPoint: number): this {
    this._dexterityScaling = scalingPerPoint;
    return this;
  }

  public withStrengthRadiusScaling(scalingPerPoint: number): this {
    this._strengthRadiusScaling = scalingPerPoint;
    return this;
  }

  public withHitboxRadius(radius: number): this {
    this._hitboxRadius = radius;
    return this;
  }

  public withTargetHitCooldown(cooldownMs: number): this {
    this._targetHitCooldownMs = cooldownMs;
    return this;
  }

  public withKnockbackMode(mode: OrbitalKnockbackMode): this {
    this._knockbackMode = mode;
    return this;
  }

  public withParticle(effect: string, color?: string): this {
    this._particleEffect = effect;
    this._particleColor = color;
    return this;
  }

  public withVisual(visualEffect: string): this {
    this._visualEffect = visualEffect;
    return this;
  }

  public onHit(handler: (ctx: OrbitalHitContext) => void): this {
    this._onHit = handler;
    return this;
  }

  public onComplete(handler: (owner: Entity, eventManager: IEventManager) => void): this {
    this._onComplete = handler;
    return this;
  }

  public build(): IOrbitalAttackDefinition {
    return {
      id: this._id,
      name: this._name,
      baseRadius: this._baseRadius,
      baseAngularSpeed: this._baseAngularSpeed,
      rotations: this._rotations,
      dexterityScaling: this._dexterityScaling,
      strengthRadiusScaling: this._strengthRadiusScaling,
      hitboxRadius: this._hitboxRadius,
      targetHitCooldownMs: this._targetHitCooldownMs,
      knockbackMode: this._knockbackMode,
      visualEffect: this._visualEffect,
      particleEffect: this._particleEffect,
      particleColor: this._particleColor,
      attackFactory: this._attackFactory,
      onHit: this._onHit,
      onComplete: this._onComplete
    };
  }

  public applyTo(owner: Entity, eventManager: IEventManager, initialAngle?: number): ActiveOrbitalAttack {
    return new ActiveOrbitalAttack(this.build(), owner, eventManager, initialAngle);
  }
}
