import type Effect from "../ObjectModule/Items/Effects/Effect";
import type { action } from "../eventDispacher/actions.type";

export type SkillType = 'active' | 'passive' | 'rare' | 'essential' | 'attribute';

export default class Skill {
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;
    public readonly type: SkillType;
    public readonly tier: number;
    public readonly requiredSkillId?: string;
    public readonly effect?: Effect;
    public readonly keybind?: action;

    constructor(
        id: string,
        name: string,
        description: string,
        type: SkillType,
        tier: number,
        requiredSkillId?: string,
        effect?: Effect,
        keybind?: action
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type;
        this.tier = tier;
        this.requiredSkillId = requiredSkillId;
        this.effect = effect;
        this.keybind = keybind;
    }
}