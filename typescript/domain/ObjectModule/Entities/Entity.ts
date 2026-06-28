import ObjectElement from "../ObjectElement";
import Vector2D from "../../shared/Vector2D";

import type { objectTypeId } from "../objectType.type";
import type Attributes from "./Attributes";
import type { HitBox } from "../../hitBox/HitBox";
import type { DamageType } from "../Items/IAtack";;
import type { IEventManager } from "../../eventDispacher/IGameEvents";
import type StatusEffect from "./Status/StatusEffect";
import RewardGenerator from "../Items/RewardGenerator";

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
  public activeStatuses: Map<string, StatusEffect> = new Map();
  public activeStatusesList: StatusEffect[] = [];
  public currentSpeedModifier: number = 1;
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
  
  public applyStatus(status: StatusEffect): void {
    const existing = this.activeStatuses.get(status.id);
    if (existing) {
        existing.duration = Math.max(existing.duration, status.duration); // Renova a duração
        existing.elapsed = 0;
    } else {
        this.activeStatuses.set(status.id, status);
        this.activeStatusesList.push(status);
        status.apply(this);
        (this as any).eventManager?.dispatch('log', { channel: 'domain', message: `Status ${status.id} aplicado em ${this.objectId}`, params: [] });
    }
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

    // VULNERABILIDADES ELEMENTAIS (A Sinergia)
    if (this.activeStatuses.has('wet')) {
        if (damageInfo.damageType === 'dark') finalDamage *= 1.5; // Água conduz eletricidade (Trovão virou Trevas)
        if (damageInfo.damageType === 'fire') finalDamage *= 0.5;    // Água apaga fogo
    }
    // DEBUFF DE VENENO
    if (this.activeStatuses.has('poison')) {
        finalDamage *= 1.15; // 15% a mais de dano recebido de todas as fontes
    }
    // DANO SAGRADO VS MORTOS-VIVOS
    if (damageInfo.damageType === 'light' && ['skeleton', 'zombie', 'vampire', 'lich', 'demon', 'bdiAgent', 'shadowmob'].includes(this.objectId)) {
        finalDamage *= 2.0;
    }

    // FRAQUEZAS E RESISTÊNCIAS INTRÍNSECAS DA ENTIDADE
    if (this.elementalType) {
        const weaknesses: { [key in DamageType]?: DamageType } = {
            'ground': 'fire', // Fogo > Terra
            'fire': 'water',  // Água > Fogo
            'water': 'dark'   // Trevas > Água
        };
        const resistances: { [key in DamageType]?: DamageType } = {
            'fire': 'ground', // Terra resiste a Fogo
            'water': 'fire',  // Fogo resiste a Água
            'dark': 'light'   // Luz resiste a Trevas
        };

        if (weaknesses[this.elementalType] === damageInfo.damageType) {
            finalDamage *= 1.5; // 50% a mais de dano
        } else if (resistances[this.elementalType] === damageInfo.damageType) {
            finalDamage *= 0.5; // 50% de resistência
        } else if (this.elementalType === damageInfo.damageType) {
            finalDamage *= 0.5; // Dano do mesmo tipo também é resistido
        }
    }

    let currentDefence = this.attributes.defence;
    if (this.activeStatuses.has('vulnerable')) currentDefence -= 8;

    if (damageInfo.damageType !== 'true' && damageInfo.damageType !== 'dark') {
      finalDamage = Math.max(1, finalDamage - currentDefence);
    }

    // Aplica o dano ao HP
    this.attributes.hp -= finalDamage;
    
    const centerX = this.coordinates.x + this.size.width / 2;
    const centerY = this.coordinates.y + this.size.height / 2;

    if (this.attributes.hp <= 0) {
      this.state = 'dead';
      
      // GERAÇÃO DE SAQUE (LOOT): Drasticamente reduzido (apenas 15% de chance de rolar um drop!)
      if (this.objectId !== 'player' && this.objectId !== 'bdiAgent' && Math.random() < 0.15) {
         RewardGenerator.generateDrop({ x: centerX, y: centerY }, this.eventManager);
      }

      // Despacha evento puro de negócio ao invés de acoplar as partículas visualmente
      this.eventManager.dispatch('entityDied', { 
         entityId: this.id, 
         isOverkill: damageInfo.totalDamage >= this.attributes.maxHp * 1.5,
         coordinates: { x: centerX, y: centerY } 
      });
      
      super.destroy()
      return finalDamage;
    }

    // Informa aos adaptadores sobre o dano recebido para tocarem sons e efeitos
    this.eventManager.dispatch('entityDamaged', {
      entityId: this.id,
      damage: finalDamage,
      isCritical: damageInfo.isCritical,
      damageType: damageInfo.damageType,
      coordinates: { x: centerX, y: centerY }
    });

    // Calcula a força do knockback com base no fator de lançamento, não mais na vida do alvo.
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

    let boxX = env.coordinates.x;
    let boxY = env.coordinates.y;
    let boxW = env.size?.width || 32;
    let boxH = env.size?.height || 32;

    if (env.hitboxes && env.hitboxes[0]) {
        const shape = env.hitboxes[0].getDebugShape();
        if (shape.type === 'polygon' && shape.points && shape.points.length > 0) {
            const pts = shape.points;
            const minX = Math.min(...pts.map((p: any) => p.x));
            const maxX = Math.max(...pts.map((p: any) => p.x));
            const minY = Math.min(...pts.map((p: any) => p.y));
            const maxY = Math.max(...pts.map((p: any) => p.y));
            boxX = minX;
            boxY = minY;
            boxW = maxX - minX;
            boxH = maxY - minY;
        }
    }

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
        // Centro perfeitamente dentro do AABB (Penetração Profunda devido a Física Atrasada)
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
        // Controle de Grupo! A entidade perde a vontade própria de se mover
        this.velocity.resetMut();
    }

    //? Calcula o deslocamento base para este frame (velocidade * tempo)
    this.velocity.multiplyMut(deltaTime * this.currentSpeedModifier);
    this.currentSpeedModifier = 1; // Reseta para ler novo terreno no próx frame
    
    // A física reage: Adiciona Forças Externas (Knockback/Pull) como deslocamento absoluto
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
    // Usa o Teorema de Pitágoras para encontrar a distância
    return Math.sqrt(dx * dx + dy * dy);
  }

}