import type { IEventManager } from "../eventDispacher/IGameEvents";
import Vector2D from "../shared/Vector2D";
import Entity, { type DamageInfo } from "../ObjectModule/Entities/Entity";
import Attributes from "../ObjectModule/Entities/Attributes";
import Attack from "../ObjectModule/Items/Attack";

export type SummonBehaviorMode = 'follow' | 'aggressive' | 'defensive' | 'stationary';

export interface SummonConfig {
  readonly id: string;
  readonly name: string;
  readonly maxHp: number;
  readonly speed: number;
  readonly duration: number; //? Tempo de permanência do lacaio; <= 0 indica persistência contínua até ser abatido
  readonly behavior: SummonBehaviorMode;
  readonly attackCooldownMs: number;
  readonly attackRange: number;
  readonly leashDistance: number;
  readonly visualTint?: string | undefined;
  readonly visualScale?: number | undefined;
  readonly attackFactory?: ((summon: SummonEntity) => Attack) | undefined;
  readonly onSummon?: ((summon: SummonEntity, master: Entity, eventManager: IEventManager) => void) | undefined;
  readonly onTick?: ((summon: SummonEntity, dt: number, master: Entity, eventManager: IEventManager) => void) | undefined;
  readonly onDeath?: ((summon: SummonEntity, master: Entity, eventManager: IEventManager) => void) | undefined;
  readonly onDespawn?: ((summon: SummonEntity, master: Entity, eventManager: IEventManager) => void) | undefined;
}

/**
 * ==============================================================================
 * ENTIDADE DE INVOCAÇÃO / LACAIOS (SummonEntity)
 * ==============================================================================
 * Entidade controlada que obedece a um mestre e executa ciclo de IA autônomo.
 * Zero-GC: reutiliza vetores de direção sem instanciar novos objetos no update.
 * ==============================================================================
 */
export class SummonEntity extends Entity {
  private _master: Entity;
  private _remainingDuration: number;
  private _lastAttackTime: number = 0;
  private _config: SummonConfig;
  private _isDespawned: boolean = false;
  private _dirCache: Vector2D = new Vector2D(0, 0);

  constructor(
    id: number,
    coordinates: { x: number; y: number },
    master: Entity,
    config: SummonConfig,
    eventManager: IEventManager
  ) {
    const attr = new Attributes(1, 10, 10, 10, 10, 10, 10, 10);
    attr.speed = config.speed;
    (attr as any)._maxHp = config.maxHp;
    attr.hp = config.maxHp;

    super(id, coordinates, { width: 16, height: 16 }, 'summon', attr, eventManager, 'idle');
    this._master = master;
    this._config = config;
    this._remainingDuration = config.duration;

    if (config.visualTint) {
      (this as any).visualTint = config.visualTint;
    }
    if (config.visualScale) {
      (this as any).visualScale = config.visualScale;
    }

    if (config.onSummon) {
      config.onSummon(this, master, eventManager);
    }
  }

  public get master(): Entity {
    return this._master;
  }

  public get isDespawned(): boolean {
    return this._isDespawned;
  }

  public override takeDamage(damageInfo: DamageInfo): number {
    const dmg = super.takeDamage(damageInfo);
    if (this.attributes.hp <= 0 && !this._isDespawned) {
      this._isDespawned = true;
      this.state = 'dead';
      if (this._config.onDeath) {
        this._config.onDeath(this, this._master, this.eventManager);
      }
    }
    return dmg;
  }

  public override update(deltaTime: number): void {
    if (this._isDespawned || this.state === 'dead') return;

    if (this._config.duration > 0) {
      this._remainingDuration -= deltaTime;
      if (this._remainingDuration <= 0) {
        this.despawn();
        return;
      }
    }

    if (this.attributes.hp <= 0) {
      this.state = 'dead';
      if (this._config.onDeath) {
        this._config.onDeath(this, this._master, this.eventManager);
      }
      return;
    }

    this.executeAI(deltaTime);

    if (this._config.onTick) {
      this._config.onTick(this, deltaTime, this._master, this.eventManager);
    }

    this.move(deltaTime);
  }

  private executeAI(deltaTime: number): void {
    if (this._config.behavior === 'stationary') {
      this.tryAttackNearby();
      return;
    }

    const dx = this._master.coordinates.x - this.coordinates.x;
    const dy = this._master.coordinates.y - this.coordinates.y;
    const distSq = dx * dx + dy * dy;
    const leashSq = this._config.leashDistance * this._config.leashDistance;

    //? Prioriza reagrupamento imediato com o invocador caso ultrapasse o raio máximo permitido
    if (distSq > leashSq) {
      this._dirCache.x = dx;
      this._dirCache.y = dy;
      this._dirCache.normalizeMut();
      this.direction.x = this._dirCache.x;
      this.direction.y = this._dirCache.y;
      this.state = 'walking';
      return;
    }

    if (this._config.behavior === 'aggressive' || this._config.behavior === 'defensive') {
      this.tryAttackNearby();
    } else {
      if (distSq > 3600) { //? Distância superior a 60px inicia movimentação de aproximação ao mestre
        this._dirCache.x = dx;
        this._dirCache.y = dy;
        this._dirCache.normalizeMut();
        this.direction.x = this._dirCache.x;
        this.direction.y = this._dirCache.y;
        this.state = 'walking';
      } else {
        this.direction.resetMut();
        this.state = 'idle';
      }
    }
  }

  private tryAttackNearby(): void {
    const now = Date.now();
    if (now - this._lastAttackTime < this._config.attackCooldownMs) return;
    if (!this._config.attackFactory) return;

    this.eventManager.dispatch('requestNeighbors', {
      coordinates: this.coordinates,
      radius: this._config.attackRange,
      callback: (neighbors: any[]) => {
        if (!neighbors || neighbors.length === 0) return;

    //? Busca alvo hostil mais próximo ignorando o invocador e lacaios aliados
        let target: any = null;
        for (let i = 0; i < neighbors.length; i++) {
          const n = neighbors[i]!;
          if (n && n.id !== this.id && n.id !== this._master.id && n.objectId !== 'summon' && 'takeDamage' in n && n.attributes?.hp > 0) {
            target = n;
            break;
          }
        }

        if (target) {
          const attack = this._config.attackFactory!(this);
          const tdx = target.coordinates.x - this.coordinates.x;
          const tdy = target.coordinates.y - this.coordinates.y;
          this._dirCache.x = tdx;
          this._dirCache.y = tdy;
          this._dirCache.normalizeMut();

          attack.execute(target, this._dirCache);
          this._lastAttackTime = Date.now();
        }
      }
    });
  }

  public despawn(): void {
    if (this._isDespawned) return;
    this._isDespawned = true;
    this.state = 'dead';

    if (this._config.onDespawn) {
      this._config.onDespawn(this, this._master, this.eventManager);
    }

    this.eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Invocação] '${this._config.name}' encerrou seu tempo e desapareceu.`,
      params: []
    });
  }
}

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: INVOCADOR E LACAIOS (SummonTemplate)
 * ==============================================================================
 * Construtor fluente para definição e spawn de lacaios, totens e companheiros.
 * ==============================================================================
 */
export default class SummonTemplate {
  private _maxHp: number = 50;
  private _speed: number = 80;
  private _duration: number = 30;
  private _behavior: SummonBehaviorMode = 'aggressive';
  private _attackCooldownMs: number = 1500;
  private _attackRange: number = 120;
  private _leashDistance: number = 180;
  private _visualTint?: string | undefined;
  private _visualScale?: number | undefined;
  private _attackFactory?: ((summon: SummonEntity) => Attack) | undefined;
  private _onSummon?: ((summon: SummonEntity, master: Entity, eventManager: IEventManager) => void) | undefined;
  private _onTick?: ((summon: SummonEntity, dt: number, master: Entity, eventManager: IEventManager) => void) | undefined;
  private _onDeath?: ((summon: SummonEntity, master: Entity, eventManager: IEventManager) => void) | undefined;
  private _onDespawn?: ((summon: SummonEntity, master: Entity, eventManager: IEventManager) => void) | undefined;

  private constructor(private readonly _id: string, private readonly _name: string) {}

  public static create(id: string, name: string): SummonTemplate {
    return new SummonTemplate(id, name);
  }

  public withMaxHealth(hp: number): this {
    this._maxHp = hp;
    return this;
  }

  public withSpeed(speed: number): this {
    this._speed = speed;
    return this;
  }

  public withDuration(seconds: number): this {
    this._duration = seconds;
    return this;
  }

  public withBehavior(behavior: SummonBehaviorMode): this {
    this._behavior = behavior;
    return this;
  }

  public withAttackBehavior(attackFactory: (summon: SummonEntity) => Attack, cooldownMs: number = 1500, range: number = 120): this {
    this._attackFactory = attackFactory;
    this._attackCooldownMs = cooldownMs;
    this._attackRange = range;
    return this;
  }

  public withLeashDistance(distance: number): this {
    this._leashDistance = distance;
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

  public onSummon(handler: (summon: SummonEntity, master: Entity, eventManager: IEventManager) => void): this {
    this._onSummon = handler;
    return this;
  }

  public onTick(handler: (summon: SummonEntity, dt: number, master: Entity, eventManager: IEventManager) => void): this {
    this._onTick = handler;
    return this;
  }

  public onDeath(handler: (summon: SummonEntity, master: Entity, eventManager: IEventManager) => void): this {
    this._onDeath = handler;
    return this;
  }

  public onDespawn(handler: (summon: SummonEntity, master: Entity, eventManager: IEventManager) => void): this {
    this._onDespawn = handler;
    return this;
  }

  public build(): SummonConfig {
    return {
      id: this._id,
      name: this._name,
      maxHp: this._maxHp,
      speed: this._speed,
      duration: this._duration,
      behavior: this._behavior,
      attackCooldownMs: this._attackCooldownMs,
      attackRange: this._attackRange,
      leashDistance: this._leashDistance,
      visualTint: this._visualTint,
      visualScale: this._visualScale,
      attackFactory: this._attackFactory,
      onSummon: this._onSummon,
      onTick: this._onTick,
      onDeath: this._onDeath,
      onDespawn: this._onDespawn
    };
  }

  public spawn(master: Entity, coordinates: { x: number; y: number }, eventManager: IEventManager, entityId?: number): SummonEntity {
    const finalId = entityId ?? (Date.now() + Math.floor(Math.random() * 1000));
    return new SummonEntity(finalId, coordinates, master, this.build(), eventManager);
  }
}
