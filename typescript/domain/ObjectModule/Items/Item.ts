import type Effect from "./Effects/Effect";
import {type baseAttributes} from "../Entities/Attributes"

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemCategory = 'weapon' | "food" | "potion" | "storage" | 'armor' | 'material' | 'quest' | 'currency' | 'tool' | 'belt';

export default abstract class Item {

  constructor(
    public name: string,
    public readonly description :string,
    public readonly itemId: number,
    public readonly rarity: ItemRarity,
    public readonly category: ItemCategory,
    public readonly iconId: number,

    public readonly price: number,
    public readonly isStackable: boolean = false,
    public readonly maxStackSize: number = 1,

    private _durability: number,
    private _effects: Effect[],

    public readonly requiredLevel: number = 0,
    public readonly requiredAttributes: Partial<baseAttributes> = {},
    public readonly isUnique: boolean = false,
    public readonly isTradable: boolean = true
  ){}

  public get durability(): number { return this._durability; }
  /** @param value number to add to current durability */
  public set durability(value: number) {  if( this.durability + value > 0) this._durability += value  }

  public get effects(): Effect[] { return this._effects; }
  public set effects(value: Effect[]) { this._effects = value; }

}