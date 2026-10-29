import type { IPlayer } from "../../../ports/domain-contracts";
import type Attributes from "../Attributes";
import type Item from "../../Items/Item";

export default interface IPlayerContext extends IPlayer {
  attributes: Attributes;
  backpack: Item[];
  consumeItem(index: number): void;
  equipItem(index: number): void;
  unlockClass(className: string): void;
  setActiveClass(className: string): void;
}
