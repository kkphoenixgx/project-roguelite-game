import type { IWeapon } from "../../../ports/IWeapon";
import type { baseAttributes } from "../../Entities/Attributes";
import type Effect from "../Effects/Effect";
import type Bullet from "../../Entities/projectiles/Bullet";
import type { IAtack } from "../IAtack";
import Item, { type ItemRarity } from "../Item";
import type { OnHitAction } from "../IAtack";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import type { objectTypeId } from "../../objectType.type";
import type Vector2D from "../../../shared/Vector2D";
import type Entity from "../../Entities/Entity";
import BurnStatus from "../../Entities/Status/BurnStatus";
import PoisonStatus from "../../Entities/Status/PoisonStatus";
import ParalyzeStatus from "../../Entities/Status/ParalyzeStatus";

export default abstract class Weapon extends Item implements IWeapon {
  public unlocksClass?: string | undefined;
  public onHitActions: OnHitAction[] = []; // Permite injetar efeitos de impacto (ex: roubo de vida) na arma
  public projectileType?: objectTypeId;
  public weaponType: string = 'melee'; // Campo discriminador para o DTO (UI e lógicas)

  constructor(
    public baseDamage: number,
    public attackSpeed: number,
    
    name: string,
    description: string,
    itemId: number,
    rarity: ItemRarity,
    iconId: number,
    price: number,
    durability: number,
    effects: Effect[],
    requiredLevel: number = 1,
    requiredAttributes: Partial<baseAttributes> = {},
    isUnique: boolean = false,
    isTradable: boolean = true,
    unlocksClass?: string
  ) {
    super( name, description, itemId, rarity, 'weapon', iconId, price, false, 1, durability, effects, requiredLevel, requiredAttributes, isUnique, isTradable );
    this.unlocksClass = unlocksClass;

    // 25% de chance de rolar modificadores de status e dano na criação da arma! (Roguelite puro)
    if (Math.random() < 0.25) {
      this.applyRandomModifiers();
    }
  }

  private applyRandomModifiers(): void {
    const isBuff = Math.random() > 0.3; // 70% de chance de ser um buff, 30% de vir com defeito
    
    if (isBuff) {
      const damageBoost = 1 + (Math.random() * 0.4); // +0% a +40% de dano
      this.baseDamage = Math.floor(this.baseDamage * damageBoost);
      this.name = `Poderosa ${this.name}`;
    } else {
      const damageNerf = 1 - (Math.random() * 0.3); // -0% a -30% de dano
      this.baseDamage = Math.floor(this.baseDamage * damageNerf);
      this.name = `Enferrujada ${this.name}`;
    }

    // Se foi buffada, tem 40% de chance de vir com um encantamento elemental!
    if (isBuff && Math.random() < 0.4) {
      const effects = ['fire', 'poison', 'thunder'];
      const chosen = effects[Math.floor(Math.random() * effects.length)];
      
      if (chosen === 'fire') {
        this.name = `Flamejante ${this.name}`;
        this.onHitActions.push((attacker, target, damageDealt) => { if (Math.random() < 0.3) target.applyStatus(new BurnStatus(3, attacker)); });
      } else if (chosen === 'poison') {
        this.name = `Tóxica ${this.name}`;
        this.onHitActions.push((attacker, target, damageDealt) => { if (Math.random() < 0.3) target.applyStatus(new PoisonStatus(4, attacker)); });
      } else if (chosen === 'thunder') {
        this.name = `Chocante ${this.name}`;
        this.onHitActions.push((attacker, target, damageDealt) => { if (Math.random() < 0.2) target.applyStatus(new ParalyzeStatus(1.5)); });
      }
    }
  }

  /** * Define o contrato de ataque para todas as armas. O atacante a utiliza passando a sua própria referência e direção. */
  public abstract attack(attacker: Entity, direction: Vector2D, eventManager: IEventManager): void;

}