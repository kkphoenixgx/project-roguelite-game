import Enemy from "../ObjectModule/Entities/Enemies/Enemy";
import Attributes from "../ObjectModule/Entities/Attributes";
import { HitBoxCircle } from "../hitBox/HitBoxCircle";
import Dice from "../shared/Dice";
import Vector2D from "../shared/Vector2D";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import { RegisterSpawner, type SpawnPayload } from "../ObjectModule/SpawnRegistry";
import type ObjectElement from "../ObjectModule/ObjectElement";

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: INIMIGO DO DOMÍNIO
 * ==============================================================================
 * Regras Obrigatórias para quem está criando um novo Inimigo:
 * 1. Anote a classe com `@RegisterSpawner('nome_do_tipo')`.
 * 2. Implemente o método estático fábrica `createSpawn()`.
 * 3. No construtor, use `HitBoxCircle` ou `HitBoxPolygon`.
 * 4. No `update(deltaTime, player)`:
 *    - Chame `this.updateStatuses(deltaTime)`.
 *    - Atualize a posição das hitboxes sem instanciar novos objetos no heap.
 *    - Nunca use `.map()` ou `.filter()` no frame (Zero-GC).
 *    - Use `requestNeighbors` para IA de separação/bando sem colisão estática travada.
 * 5. Não importe nada de UI, som, WebGPU ou Canvas aqui!
 * ==============================================================================
 */
@RegisterSpawner('templateEnemy')
export default class TemplateEnemyTemplate extends Enemy {
  /** Armazena a última posição do alvo em vetor reutilizável (Zero-GC) */
  private targetPos: { x: number; y: number } = { x: 0, y: 0 };
  
  /** Velocidade relativa da entidade */
  private readonly speedMultiplier: number = 0.6;

  constructor(
    id: number,
    level: number,
    baseXp: number,
    coordinates: { x: number; y: number },
    attributes: Attributes,
    eventManager: IEventManager,
    objectId: any = "templateEnemy"
  ) {
    super(id, level, baseXp, coordinates, objectId, attributes, eventManager, "waiting");

    this.attributes.hp = this.attributes.maxHp;
    this.hitboxes = [this.createHitbox()];
  }

  /**
   * Fábrica estática requerida pelo `@RegisterSpawner`
   */
  public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): TemplateEnemyTemplate {
    const level = payload.level || 1;
    const baseXp = payload.baseXp || 25;
    
    const attrs = new Attributes(
      8,
      level,
      10,
      10,
      10,
      8,
      8,
      8
    );

    return new TemplateEnemyTemplate(
      id,
      level,
      baseXp,
      payload.coordinates,
      attrs,
      eventManager,
      payload.type || "templateEnemy"
    );
  }

  /**
   * Ciclo de Atualização por Frame (Hot Path - Atenção ao Zero-GC!)
   */
  public update(deltaTime: number, player?: any): void {
    this.updateStatuses(deltaTime);

    //? Entidade atordoada suspende a execução da IA cinemática e steering.
    if (this.activeStatuses.has('stun') || this.activeStatuses.has('freeze')) {
      return;
    }

    if (player) {
      this.targetPos.x = player.coordinates.x + player.size.width / 2;
      this.targetPos.y = player.coordinates.y + player.size.height / 2;
    }

    const centerX = this.coordinates.x + this.size.width / 2;
    const centerY = this.coordinates.y + this.size.height / 2;

    if (this.hitboxes) {
      for (let i = 0; i < this.hitboxes.length; i++) {
        this.hitboxes[i]!.update({ x: centerX, y: centerY }, this.rotation);
      }
    }

    //? Query espacial de vizinhança para repulsão de flocking e prevenção de aglomeração.
    this.eventManager.dispatch('requestNeighbors', {
      requester: this,
      radius: this.size.width * 1.5,
      callback: (neighbors) => this.performBehavior(deltaTime, neighbors as any)
    });
  }

  /**
   * Executa comportamento cinemático após resposta dos vizinhos
   */
  private performBehavior(deltaTime: number, neighbors: ObjectElement[]): void {
    const centerX = this.coordinates.x + this.size.width / 2;
    const centerY = this.coordinates.y + this.size.height / 2;

    const dx = this.targetPos.x - centerX;
    const dy = this.targetPos.y - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      let vx = (dx / dist) * this.attributes.speed * this.speedMultiplier;
      let vy = (dy / dist) * this.attributes.speed * this.speedMultiplier;

      for (let i = 0; i < neighbors.length; i++) {
        const other = neighbors[i]!;
        if (other.id === this.id) continue;

        const ox = centerX - (other.coordinates.x + other.size.width / 2);
        const oy = centerY - (other.coordinates.y + other.size.height / 2);
        const oDist = Math.hypot(ox, oy);

        if (oDist > 0 && oDist < this.size.width) {
          const pushFactor = (1 - (oDist / this.size.width)) * 30;
          vx += (ox / oDist) * pushFactor;
          vy += (oy / oDist) * pushFactor;
        }
      }

      //! Mutação in-place de coordenadas para manter alocação Zero-GC no loop de movimento.
      this.coordinates.x += vx * deltaTime;
      this.coordinates.y += vy * deltaTime;
      this.rotation = Math.atan2(vy, vx);
      this.state = "walking";
    } else {
      this.state = "idle";
    }
  }

  /**
   * Cria a HitBox circular da criatura
   */
  private createHitbox(): HitBoxCircle {
    const radius = this.size.width / 2;
    return new HitBoxCircle(
      { x: this.coordinates.x + radius, y: this.coordinates.y + radius },
      0,
      radius,
      (other: ObjectElement) => {
        if (other && 'takeDamage' in other && other.id !== this.id && other.objectId === 'player') {
          const attack = this.onStrike();
          if (attack) {
            attack.execute(other as any, new Vector2D(this.targetPos.x - this.coordinates.x, this.targetPos.y - this.coordinates.y).normalizeMut());
          }
        }
      }
    );
  }
}
