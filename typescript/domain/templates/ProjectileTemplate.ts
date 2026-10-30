import Bullet from "../ObjectModule/Entities/projectiles/Bullet";
import type Vector2D from "../shared/Vector2D";
import type Attack from "../ObjectModule/Items/Attack";
import type Effect from "../ObjectModule/Items/Effects/Effect";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import { HitBoxCircle } from "../hitBox/HitBoxCircle";
import type ObjectElement from "../ObjectModule/ObjectElement";
import { RegisterSpawner, type SpawnPayload } from "../ObjectModule/SpawnRegistry";

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: PROJÉTIL DO DOMÍNIO
 * ==============================================================================
 * Regras Obrigatórias para quem está criando um novo Projétil:
 * 1. Anote a classe com `@RegisterSpawner('nome_do_tipo')`.
 * 2. Implemente o método estático fábrica `createSpawn()`.
 * 3. Gerencie velocidade, alcance máximo e `distanceTraveled`.
 * 4. Use `hitTargets` (Set) para projéteis perfurantes, ou dê `despawn` no primeiro toque.
 * 5. No `update(deltaTime)`:
 *    - Avance as coordenadas via mutação in-place: `pos.x += dir.x * speed * dt`.
 *    - Atualize a posição das hitboxes sem recriar instâncias.
 *    - Dispare evento `despawn` quando ultrapassar o alcance máximo.
 * ==============================================================================
 */
@RegisterSpawner('templateProjectile')
export default class TemplateProjectileTemplate extends Bullet {
  private speed: number = 400;
  private maxRange: number = 800;
  private distanceTraveled: number = 0;
  private hitTargets: Set<number> = new Set();

  public effects: Effect[];
  public attack: Attack;

  public static readonly BASE_SIZE = { width: 12, height: 12 };

  constructor(
    id: number,
    coordinates: { x: number; y: number },
    direction: Vector2D,
    attack: Attack,
    effects: Effect[] = [],
    eventManager: IEventManager,
    size: { width: number; height: number } = TemplateProjectileTemplate.BASE_SIZE
  ) {
    super(id, coordinates, size, 'templateProjectile' as any, eventManager, 'travelling');
    this.direction = direction;
    this.attack = attack;
    this.effects = effects;
    this.rotation = this.direction.angle();
    this.hitboxes = [this.createHitbox(size)];
  }

  /**
   * Fábrica estática requerida pelo `@RegisterSpawner`
   */
  public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): TemplateProjectileTemplate {
    return new TemplateProjectileTemplate(
      id,
      payload.coordinates,
      payload.direction,
      payload.attack,
      payload.effects || [],
      eventManager,
      payload.size || TemplateProjectileTemplate.BASE_SIZE
    );
  }

  /**
   * Atualização cinemática por frame (Hot Path)
   */
  public update(deltaTime: number): void {
    const step = this.speed * deltaTime;
    this.coordinates.x += this.direction.x * step;
    this.coordinates.y += this.direction.y * step;
    this.distanceTraveled += step;

    const cx = this.coordinates.x + this.size.width / 2;
    const cy = this.coordinates.y + this.size.height / 2;

    if (this.hitboxes) {
      for (let i = 0; i < this.hitboxes.length; i++) {
        this.hitboxes[i]!.update({ x: cx, y: cy }, this.rotation);
      }
    }

    if (this.distanceTraveled >= this.maxRange) {
      this.destroy();
    }
  }

  /**
   * Cria a HitBox circular com callback de impacto
   */
  private createHitbox(size: { width: number; height: number }): HitBoxCircle {
    const radius = size.width / 2;
    const cx = this.coordinates.x + radius;
    const cy = this.coordinates.y + radius;

    return new HitBoxCircle(
      { x: cx, y: cy },
      0,
      radius,
      (other: ObjectElement) => {
      //? Ignora o disparador do projétil e alvos já atingidos por disparos perfurantes
        if ('takeDamage' in other && other.id !== this.attack.attacker.id) {
          if (this.hitTargets.has(other.id)) return;
          this.hitTargets.add(other.id);

          this.attack.execute(other as any, this.direction);
          for (let i = 0; i < this.effects.length; i++) {
            this.effects[i]!.apply(other as any);
          }

      //? Emite evento semântico de partículas desacoplado do renderizador visual
          this.eventManager.dispatch('particle', {
            effect: 'magicPulse',
            x: other.coordinates.x + other.size.width / 2,
            y: other.coordinates.y + other.size.height / 2
          });

          this.destroy();
        }
      }
    );
  }

  public override destroy(): void {
    super.destroy();
    this.eventManager.dispatch('despawn', { objectId: this.id });
  }
}
