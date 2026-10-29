import type Effect from "../ObjectModule/Items/Effects/Effect";
import type { action } from "../eventDispacher/actions.type";

export type SkillType = 'active' | 'passive' | 'rare' | 'essential' | 'attribute';

export default class Skill {
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;
    public readonly type: SkillType;
    public readonly tier: number;
    public readonly dependencies: string[];
    public readonly requiredSkillId?: string | undefined;
    public readonly prerequisiteId?: string | undefined;
    public readonly effect?: Effect;
    public readonly keybind?: action;
    public readonly requiresMainHandWeapon?: boolean;

    constructor(
        id: string,
        name: string,
        description: string,
        type: SkillType,
        tier: number,
        requiredSkillId?: string | string[],
        effect?: Effect,
        keybind?: action,
        dependencies?: string[],
        requiresMainHandWeapon?: boolean
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type;
        this.tier = tier;

        const deps: string[] = [];
        if (Array.isArray(requiredSkillId)) {
            deps.push(...requiredSkillId);
        } else if (typeof requiredSkillId === 'string' && requiredSkillId.length > 0) {
            deps.push(requiredSkillId);
        }
        if (dependencies && Array.isArray(dependencies)) {
            for (const d of dependencies) {
                if (!deps.includes(d)) deps.push(d);
            }
        }
        this.dependencies = deps;
        const firstDep = deps[0];
        if (firstDep !== undefined) {
            this.requiredSkillId = firstDep;
            this.prerequisiteId = firstDep;
        }

        if (effect !== undefined) this.effect = effect;
        if (keybind !== undefined) this.keybind = keybind;
        if (requiresMainHandWeapon !== undefined) this.requiresMainHandWeapon = requiresMainHandWeapon;
    }
}