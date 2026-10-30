import type IXPTable from "./IXPTable";
import type { ProgressionReward } from "./IXPTable";

export default class DefaultXPTable implements IXPTable {
    public fixedBase = 100; //? Experiência base necessária para alcançar o nível 2
    public levelScale = 1.3; //? Fator de escala exponencial da progressão de experiência por nível

    public getRewardsForLevel(level: number): ProgressionReward[] {
        const rewards: ProgressionReward[] = [];
        
        //? Níveis múltiplos de 5 concedem recompensa ampliada de 3 pontos de atributo
        if (level % 5 === 0) rewards.push('attribute_point', 'attribute_point', 'attribute_point');
        else rewards.push('attribute_point');

        if (level % 2 === 0) { //? Níveis pares concedem pontos de habilidade de classe
            rewards.push('class_skill');
        }
        return rewards;
    }
}