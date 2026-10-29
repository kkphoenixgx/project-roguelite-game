import type { IObjectElement } from "../ports/domain-contracts";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import type { HitBox } from "../hitBox/HitBox";
import type { objectTypeId } from "./objectType.type";

export default class ObjectElement {

  public rotation:number = 0
  public isDestroyed: boolean = false;

  constructor(
    private readonly _size: { width: number; height: number; },
    private _coordinates: { x: number; y: number; },
    public id: number ,
    private _objectId: objectTypeId,
    public eventManager: IEventManager,
    public state :string = "",
    public hitboxes :HitBox[] | null = null,
  ){}
  
  protected destroy():void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.eventManager.dispatch('despawn', {objectId:this.id})
  }
  
  /** Método virtual de atualização. Pode ser sobrescrito por subclasses (Entidades, Projéteis, Efeitos). */
  public update(deltaTime: number, player?: any): void {}

  //? ----------- Getters and Setters -----------
  
  public get objectId(): objectTypeId { return this._objectId; }
 
  public get size(): { width: number; height: number; } {
    return this._size;
  }

  public get coordinates(): { x: number; y: number; } { return this._coordinates; }
  public set coordinates(value: { x: number; y: number; }) {
    this._coordinates = value;
  }

}