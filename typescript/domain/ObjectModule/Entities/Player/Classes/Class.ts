import type { IClass } from "../../../../ports/IClass";
import type IXPTable from "../../IXPTable";
import type Skill from "../../../../Skills/Skill";
import type { IPlayer } from "../../../../ports/domain-contracts";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents"; 

export default abstract class Class implements IClass {
  
  constructor(
    public readonly name: string,
    public xpTable : IXPTable,
    protected player: IPlayer,
    protected eventManager: IEventManager
  ) {}

  public abstract getSkillForLevel(level: number): Skill | null;
  public abstract get allSkills(): Skill[];
}