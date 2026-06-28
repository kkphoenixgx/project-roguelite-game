export type SkillType = 'active' | 'passive' | 'rare' | 'essential' | 'attribute';

export class SkillOld {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly description: string,
        public readonly type: SkillType,
        public readonly tier: number,
        public readonly requiredSkillId?: string,
        public readonly effect?: any,
        public readonly keybind?: any
    ) {}
}

const s = new SkillOld('w_t2_cleave', 'Corte', 'Desc', 'active', 2, 'w_t1_strike');
console.log("Old syntax requiredSkillId:", s.requiredSkillId);
