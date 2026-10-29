import type { objectTypeId } from "../../objectType.type";
import Entity from "../Entity";
import Attributes from "../Attributes";
import Attack from "../../Items/Attack";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";

export default abstract class Enemy extends Entity {

  private lastAttackTimestamp: number = 0;
  private readonly attackCooldown: number = 500;
  protected baseContactDamage: number = 10;
    
  constructor (
    id: number,
    public level :number,
    private baseXp: number,
    coordinates : { x: number, y :number },
    objectId: objectTypeId,
    attributes: Attributes,
    eventManager: IEventManager,
    state: string = "idle"
  ){
    const size = { width: 16, height: 16 };
    super(id, coordinates, size, objectId, attributes, eventManager, state);
  }

  /** * Calcula a quantidade de XP que este inimigo concede ao ser derrotado. * A fórmula pode ser ajustada para um balanceamento mais complexo. */
  public get xpGiven(): number {
    return Math.floor(this.baseXp * (1 + (this.level - 1) * 0.2));
  }

  public onStrike(): Attack | null {
    //? Efeitos de controle de grupo (stun/paralyze) impedem ataques inimigos

    if (this.activeStatuses.has('stun') || this.activeStatuses.has('paralyze')) return null;

    const now = Date.now();
    if (now - this.lastAttackTimestamp < this.attackCooldown) return null;
    this.lastAttackTimestamp = now;

    const selfKnockbackAction = () => {
      const knockbackDirection = this.direction.clone().multiplyMut(-1);
       //? Define distância da força da empurrada
      this.accelerator.addMut(knockbackDirection.clone().multiplyMut(8));
    };

    const totalContactDamage = this.baseContactDamage * (this.level + 2);

    return new Attack(this, totalContactDamage, 'physical', [selfKnockbackAction]);
  }
}