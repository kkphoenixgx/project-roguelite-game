import ObjectElement from "../ObjectElement";
import Vector2D from "../../shared/Vector2D";

import type { objectTypeId } from "../objectType.type";
import type Attributes from "./Attributes";
import type { HitBox } from "../../hitBox/HitBox";
import type { DamageType } from "../../ports/domain-contracts";
import type { IEventManager } from "../../eventDispacher/IGameEvents";

export interface DamageInfo {
  totalDamage: number;
  damageType: DamageType;
  isCritical: boolean;
  direction: Vector2D;
  attacker: Entity;
}

export default abstract class Entity extends ObjectElement {
  public velocity: Vector2D = new Vector2D(0, 0);
  public direction: Vector2D = new Vector2D(0, 0);
  public hitBox :HitBox[] | null = null
  public activeStatuses: Map<string, any> = new Map();
  public activeStatusesList: any[] = [];
  public currentSpeedModifier: number = 1;
  public visualTint?: string | undefined;
  public visualScale?: number | undefined;
  protected _centerCache: {x: number, y: number} = {x: 0, y: 0};

  constructor(
    id: number,
    coordinates: { x: number; y: number; },
    size: { width: number; height: number; },
    objectId: objectTypeId,
    public attributes :Attributes,
    eventManager: IEventManager,
    state :string = "",
    public elementalType?: DamageType,
    protected accelerator:Vector2D = new Vector2D(0,0),
    protected hurtLaunchFactor:number = 10
  ){ 
    super(size, coordinates, id, objectId, eventManager, state) 
  }

  //? ----------- Methods -----------

  /** Avança o estado interno da entidade. Pode ser sobrescrito por subclasses. * @param deltaTime O tempo em segundos decorrido desde o último frame. * @param player Instância do jogador, se necessária para cálculo de IA. */
  public abstract override update(deltaTime: number, player?: any): void;
  
  public applyStatus(status: any): void {
    const existing = this.activeStatuses.get(status.id);
    if (existing) {
        existing.duration = Math.max(existing.duration, status.duration);
        existing.elapsed = 0;
    } else {
        this.activeStatuses.set(status.id, status);
        this.activeStatusesList.push(status);
        status.apply(this);
        (this as any).eventManager?.dispatch('log', { channel: 'domain', message: `Status ${status.id} aplicado em ${this.objectId}`, params: [] });
    }
  }

  public removeStatus(statusId: string): boolean {
    const status = this.activeStatuses.get(statusId);
    if (!status) return false;

    this.activeStatuses.delete(statusId);
    const idx = this.activeStatusesList.indexOf(status);
    if (idx !== -1) {
      this.activeStatusesList.splice(idx, 1);
    }

    if (typeof status.onRemove === 'function') {
      status.onRemove(this);
    } else if (typeof status.remove === 'function') {
      status.remove(this);
    }

    (this as any).eventManager?.dispatch('log', { channel: 'domain', message: `Status ${statusId} purgado/removido de ${this.objectId}`, params: [] });
    return true;
  }

  public updateStatuses(deltaTime: number): void {
    for (let i = this.activeStatusesList.length - 1; i >= 0; i--) {
        const status = this.activeStatusesList[i]!;
        if (status.update(deltaTime, this)) {
            this.activeStatuses.delete(status.id);
            this.activeStatusesList.splice(i, 1);
            (this as any).eventManager?.dispatch('log', { channel: 'domain', message: `Status ${status.id} removido de ${this.objectId}`, params: [] });
        }
    }
  }

  protected updatePosition() {
    this.coordinates.x += this.velocity.x;
    this.coordinates.y += this.velocity.y;
    
    if (this.hitboxes) {
      this._centerCache.x = this.coordinates.x + this.size.width / 2;
      this._centerCache.y = this.coordinates.y + this.size.height / 2;
      for (let i = 0; i < this.hitboxes.length; i++) {
        this.hitboxes[i]!.update(this._centerCache, this.rotation);
      }
    }
  }

  /** Aplica dano à entidade e retorna se ela foi derrotada. * @param damageInfo DTO contendo as informações do dano a ser aplicado - objeto simplificado do ataque. * @returns O dano real causado após a aplicação das defesas. */
  public takeDamage(damageInfo: DamageInfo): number {

    let finalDamage = damageInfo.totalDamage;

    //? Processa sinergias elementais, debuffs e resistências intrínsecas (ver ARCHITECTURE.md 3.6)
    if (this.activeStatuses.has('wet')) {
        if (damageInfo.damageType === 'dark') finalDamage *= 1.5;
        if (damageInfo.damageType === 'fire') finalDamage *= 0.5;
    }
    if (this.activeStatuses.has('poison')) {
        finalDamage *= 1.15;
    }
    if (damageInfo.damageType === 'light' && ['skeleton', 'zombie', 'vampire', 'lich', 'demon', 'bdiAgent', 'shadowmob'].includes(this.objectId)) {
        finalDamage *= 2.0;
    }

    if (this.elementalType) {
        const weaknesses: { [key in DamageType]?: DamageType } = {
            'ground': 'fire',
            'fire': 'water',
            'water': 'dark'
        };
        const resistances: { [key in DamageType]?: DamageType } = {
            'fire': 'ground',
            'water': 'fire',
            'dark': 'light'
        };

        if (weaknesses[this.elementalType] === damageInfo.damageType) {
            finalDamage *= 1.5;
        } else if (resistances[this.elementalType] === damageInfo.damageType) {
            finalDamage *= 0.5;
        } else if (this.elementalType === damageInfo.damageType) {
            finalDamage *= 0.5;
        }
    }

    let currentDefence = this.attributes.defence;
    if (this.activeStatuses.has('vulnerable')) currentDefence -= 8;

    if (damageInfo.damageType !== 'true' && damageInfo.damageType !== 'dark') {
      finalDamage = Math.max(1, finalDamage - currentDefence);
    }

    this.attributes.hp -= finalDamage;
    
    const centerX = this.coordinates.x + this.size.width / 2;
    const centerY = this.coordinates.y + this.size.height / 2;

    if (this.attributes.hp <= 0) {
      this.state = 'dead';
      
      //? Despacha evento semântico de domínio (entityDied) desacoplado da apresentação visual
      this.eventManager.dispatch('entityDied', { 
         entityId: this.id, 
         objectId: this.objectId,
         isOverkill: damageInfo.totalDamage >= this.attributes.maxHp * 1.5,
         coordinates: { x: centerX, y: centerY } 
      });
      
      super.destroy()
      return finalDamage;
    }

    this.eventManager.dispatch('entityDamaged', {
      entityId: this.id,
      damage: finalDamage,
      isCritical: damageInfo.isCritical,
      damageType: damageInfo.damageType,
      coordinates: { x: centerX, y: centerY }
    });

    //? Calcula impulso de knockback com base no fator de lançamento (hurtLaunchFactor) da entidade
    const safeDirection = damageInfo.direction instanceof Vector2D ? damageInfo.direction : new Vector2D((damageInfo.direction as any).x || 0, (damageInfo.direction as any).y || 0);
    const acceleratorVectorInfluency = safeDirection.clone().multiplyMut(this.hurtLaunchFactor);
    this.accelerator.addMut(acceleratorVectorInfluency)

    setTimeout(() => {
      this.accelerator.resetMut()
    }, 100);

    return finalDamage;
  }

  /** Resolve colisão física sólida empurrando a entidade para fora de obstáculos do ambiente. */
  public resolveEnvironmentCollision(env: any, radius: number): void {
    if (env.passable !== false) {
        if (env.speedModifier !== undefined) {
            this.currentSpeedModifier = Math.min(this.currentSpeedModifier, env.speedModifier);
        }
        return;
    }

    const px = this.coordinates.x + this.size.width / 2;
    const py = this.coordinates.y + this.size.height / 2;

    if (env.hitboxes && env.hitboxes.length > 0) {
        for (let i = 0; i < env.hitboxes.length; i++) {
            const hb = env.hitboxes[i];
            if (!hb) continue;
            const shape = hb.getDebugShape();
            if (shape.type === 'circle') {
                const cx = shape.coordinates?.x ?? env.coordinates.x;
                const cy = shape.coordinates?.y ?? env.coordinates.y;
                const cr = shape.radius || 16;
                const curPx = this.coordinates.x + this.size.width / 2;
                const curPy = this.coordinates.y + this.size.height / 2;
                const dx = curPx - cx;
                const dy = curPy - cy;
                const distance = Math.hypot(dx, dy);
                const minDist = radius + cr;
                if (distance < minDist && distance > 0.0001) {
                    const overlap = minDist - distance;
                    this.coordinates.x += (dx / distance) * overlap;
                    this.coordinates.y += (dy / distance) * overlap;
                } else if (distance <= 0.0001) {
                    this.coordinates.y += minDist;
                }
            } else if (shape.type === 'polygon' && shape.points && shape.points.length > 0) {
                const pts = shape.points;
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (let k = 0; k < pts.length; k++) {
                    const p = pts[k]!;
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                }

                const curPx = this.coordinates.x + this.size.width / 2;
                const curPy = this.coordinates.y + this.size.height / 2;

                //? Broadphase rápida via AABB expandida pelo raio
                if (curPx + radius < minX || curPx - radius > maxX || curPy + radius < minY || curPy - radius > maxY) {
                    continue;
                }

                //? 1. Ray-casting para detectar se o centro do círculo está contido dentro do polígono
                let inside = false;
                for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                    const xi = pts[i]!.x, yi = pts[i]!.y;
                    const xj = pts[j]!.x, yj = pts[j]!.y;
                    const intersect = ((yi > curPy) !== (yj > curPy)) &&
                        (curPx < (xj - xi) * (curPy - yi) / (yj - yi || 0.00001) + xi);
                    if (intersect) inside = !inside;
                }

                //? 2. Busca pelo ponto mais próximo no perímetro do polígono
                let closestDistSq = Infinity;
                let closestX = curPx;
                let closestY = curPy;

                for (let i = 0; i < pts.length; i++) {
                    const nextIdx = (i + 1) % pts.length;
                    const pA = pts[i]!;
                    const pB = pts[nextIdx]!;
                    const segDx = pB.x - pA.x;
                    const segDy = pB.y - pA.y;
                    const segLenSq = segDx * segDx + segDy * segDy;
                    if (segLenSq === 0) continue;

                    const t = Math.max(0, Math.min(1, ((curPx - pA.x) * segDx + (curPy - pA.y) * segDy) / segLenSq));
                    const projX = pA.x + t * segDx;
                    const projY = pA.y + t * segDy;
                    const distSq = (curPx - projX) * (curPx - projX) + (curPy - projY) * (curPy - projY);

                    if (distSq < closestDistSq) {
                        closestDistSq = distSq;
                        closestX = projX;
                        closestY = projY;
                    }
                }

                const dist = Math.sqrt(closestDistSq);

                if (inside) {
                    //? Centro dentro do obstáculo sólido: empurra na direção de saída mais curta
                    const dx = curPx - closestX;
                    const dy = curPy - closestY;
                    if (dist > 0.0001) {
                        const overlap = dist + radius;
                        this.coordinates.x -= (dx / dist) * overlap;
                        this.coordinates.y -= (dy / dist) * overlap;
                    } else {
                        this.coordinates.y += radius;
                    }
                } else if (dist < radius && dist > 0.0001) {
                    //? Centro fora do obstáculo: raio intercepta segmento do polígono
                    const dx = curPx - closestX;
                    const dy = curPy - closestY;
                    const overlap = radius - dist;
                    this.coordinates.x += (dx / dist) * overlap;
                    this.coordinates.y += (dy / dist) * overlap;
                }
            }
        }
        return;
    }

    let boxX = env.coordinates.x;
    let boxY = env.coordinates.y;
    let boxW = env.size?.width || 32;
    let boxH = env.size?.height || 32;

    const closestX = Math.max(boxX, Math.min(px, boxX + boxW));
    const closestY = Math.max(boxY, Math.min(py, boxY + boxH));

    const dx = px - closestX;
    const dy = py - closestY;
    const distance = Math.hypot(dx, dy);

    if (distance < radius && distance > 0) {
        const overlap = radius - distance;
        this.coordinates.x += (dx / distance) * overlap;
        this.coordinates.y += (dy / distance) * overlap;
    } else if (distance === 0) {
        //? Centro contido no AABB: resolve penetração profunda direcionando para a aresta mais próxima
        const distLeft = px - boxX;
        const distRight = (boxX + boxW) - px;
        const distTop = py - boxY;
        const distBottom = (boxY + boxH) - py;
        
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        
        if (minDist === distLeft) {
            this.coordinates.x -= (distLeft + radius);
        } else if (minDist === distRight) {
            this.coordinates.x += (distRight + radius);
        } else if (minDist === distTop) {
            this.coordinates.y -= (distTop + radius);
        } else {
            this.coordinates.y += (distBottom + radius);
        }
    }
  }

  public resetAccelerator(): void {
    this.accelerator.resetMut();
  }

  public applyForce(force: Vector2D): void {
    this.accelerator.addMut(force);
  }


  public move(deltaTime: number):void {
    if (this.activeStatuses.has('stun') || this.activeStatuses.has('paralyze')) {
        //? Efeito de controle de grupo (CC): zera velocidade intencional do alvo
        this.velocity.resetMut();
    }

    //? Calcula o deslocamento base para este frame (velocidade * tempo)
    this.velocity.multiplyMut(deltaTime * this.currentSpeedModifier);
    this.currentSpeedModifier = 1; //? Reseta modificador para amostragem do próximo frame
    
    //? Adiciona forças externas (knockback/puxão) acumuladas no acelerador
    this.velocity.addMut(this.accelerator);
    
    this.updatePosition();
  }

  protected disperseFrom(otherElement: ObjectElement) {
    const dX = (this.coordinates.x + this.size.width / 2) - (otherElement.coordinates.x + otherElement.size.width / 2);
    const dY = (this.coordinates.y + this.size.height / 2) - (otherElement.coordinates.y + otherElement.size.height / 2);

    this.velocity.x = dX;
    this.velocity.y = dY;
    this.velocity.normalizeMut().addMut(this.accelerator);

    this.updatePosition();
  }
  /** * Calcula a distância euclidiana do centro desta entidade até o centro de outro elemento. * @param otherElement O outro elemento para o qual a distância será medida. * @returns A distância como um número. */
  public getDistanceTo(otherElement: ObjectElement): number {
    const dx = (this.coordinates.x + this.size.width / 2) - (otherElement.coordinates.x + otherElement.size.width / 2);
    const dy = (this.coordinates.y + this.size.height / 2) - (otherElement.coordinates.y + otherElement.size.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

}