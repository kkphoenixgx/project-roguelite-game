import type Skill from "../Skills/Skill";
import type IXPTable from "../ObjectModule/Entities/IXPTable";

export interface IClass {
  name: string;
  xpTable: IXPTable;
  getSkillForLevel(level: number): Skill | null;
  get allSkills(): Skill[];
  executeSkill?: (skillId: string, targetCoords?: {x: number, y: number}) => void;
  update?: (deltaTime: number) => void;
}
