import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import type { baseAttributes } from "../../../Entities/Attributes";
import type Bullet from "../../../Entities/projectiles/Bullet";
import type { IAtack } from "../../IAtack";
import Item, { type ItemRarity } from "../../Item";
import Weapon from "../Weapon";
import Attack from "../../Attack";
import type Vector2D from "../../../../shared/Vector2D";
import type Entity from "../../../Entities/Entity";

export default abstract class RangedWeapon extends Weapon {
  
  //? ----------- Constructor -----------
  
  constructor(
    baseDamage: number,
    attackSpeed: number,
    name: string,
    description: string,
    itemId: number,
    rarity: ItemRarity,
    iconId: number,
    price: number,
    durability: number,
    effects: any[],
    requiredLevel: number = 1,
    requiredAttributes: Partial<baseAttributes> = {},
    isUnique: boolean = false,
    isTradable: boolean = true,
    unlocksClass?: string
  ) {
    super(baseDamage, attackSpeed, name, description, itemId, rarity, iconId, price, durability, effects, requiredLevel, requiredAttributes, isUnique, isTradable, unlocksClass);
  }
  
  //? ----------- Methods -----------
  
  /**
   * Implementa o ataque para armas de longo alcance.
   * Dispara um evento para que o ObjectElementManager crie o projétil (munição) no mundo.
   * @param attack - Contém informações sobre o ataque (quem atirou, direção, etc.).
   * @param ammoFactory - Uma função que sabe como criar a instância da munição a ser disparada.
   */
  public attack(attacker: Entity, direction: Vector2D, eventManager: IEventManager): void {
    const baseDamage = this.baseDamage + Math.floor(attacker.attributes.strength / 2);
    const weaponAttack = new Attack(attacker, baseDamage, 'physical', this.onHitActions);
    const projType = this.projectileType || 'simpleBullet';
    
    const spawnCoordinates = {
        x: attacker.coordinates.x + attacker.size.width / 2,
        y: attacker.coordinates.y + attacker.size.height / 2
    };

    eventManager.dispatch('spawn', {
      type: projType,
      coordinates: spawnCoordinates,
      direction: direction.clone().normalizeMut(),
      attack: weaponAttack
    });
  }

  //? ----------- Getters and Setters -----------

}