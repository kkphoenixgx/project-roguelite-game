import type Skill from "./Skill";

/**
 * Utilitário determinístico para identificação e resolução de ramos conflitantes
 * em árvores de habilidades de classe.
 * 
 * Regra:
 * Quando um nó da árvore de habilidades possui dois ou mais filhos imediatos (fork/bifurcação),
 * cada filho representa a raiz de um ramo independente. A escolha (desbloqueio) de qualquer
 * habilidade pertencente a um dos ramos bloqueia permanentemente o acesso a todas as habilidades
 * dos ramos concorrentes derivados do mesmo nó de bifurcação.
 */
export default class SkillBranchManager {
    // Cache em memória das análises de ramos para garantir Zero-GC em tempo de execução
    private static branchCache = new Map<string, Array<Set<string>[]>>();

    /**
     * Analisa as habilidades de uma classe e retorna os grupos de ramos mutuamente exclusivos.
     * Cada elemento retornado é um array de ramos concorrentes (cada ramo sendo um Set de IDs de skill).
     */
    public static getMutuallyExclusiveBranchGroups(skills: Skill[], cacheKey?: string): Array<Set<string>[]> {
        if (cacheKey && this.branchCache.has(cacheKey)) {
            return this.branchCache.get(cacheKey)!;
        }

        const parentToChildren = new Map<string, string[]>();
        const allSkillIds = new Set<string>();

        for (let i = 0; i < skills.length; i++) {
            const skill = skills[i]!;
            allSkillIds.add(skill.id);
            const prereqs = skill.dependencies && skill.dependencies.length > 0
                ? skill.dependencies
                : (skill.requiredSkillId ? [skill.requiredSkillId] : (skill.prerequisiteId ? [skill.prerequisiteId] : []));

            for (let p = 0; p < prereqs.length; p++) {
                const parentId = prereqs[p]!;
                let list = parentToChildren.get(parentId);
                if (!list) {
                    list = [];
                    parentToChildren.set(parentId, list);
                }
                if (!list.includes(skill.id)) {
                    list.push(skill.id);
                }
            }
        }

        // Descobre nós de bifurcação (onde há 2 ou mais filhos)
        const groups: Array<Set<string>[]> = [];

        parentToChildren.forEach((children, forkNodeId) => {
            if (children.length >= 2) {
                const branchesForFork: Set<string>[] = [];

                for (let c = 0; c < children.length; c++) {
                    const branchRoot = children[c]!;
                    const branchMembers = new Set<string>();
                    this.collectDescendants(branchRoot, parentToChildren, branchMembers);
                    branchesForFork.push(branchMembers);
                }

                groups.push(branchesForFork);
            }
        });

        if (cacheKey) {
            this.branchCache.set(cacheKey, groups);
        }

        return groups;
    }

    /**
     * Coleta recursivamente todos os descendentes a partir de uma raiz de ramo.
     */
    private static collectDescendants(
        currentId: string, 
        parentToChildren: Map<string, string[]>, 
        collected: Set<string>
    ): void {
        collected.add(currentId);
        const children = parentToChildren.get(currentId);
        if (!children) return;

        for (let i = 0; i < children.length; i++) {
            const childId = children[i]!;
            if (!collected.has(childId)) {
                this.collectDescendants(childId, parentToChildren, collected);
            }
        }
    }

    /**
     * Verifica se uma habilidade está bloqueada porque o jogador já escolheu
     * um ramo concorrente/oposto na mesma bifurcação.
     */
    public static isSkillBlockedByBranchSelection(
        skillId: string, 
        classSkills: Skill[], 
        unlockedSkills: Set<string>,
        cacheKey?: string
    ): boolean {
        const groups = this.getMutuallyExclusiveBranchGroups(classSkills, cacheKey);

        for (let g = 0; g < groups.length; g++) {
            const branches = groups[g]!;
            let targetBranchIndex = -1;

            for (let b = 0; b < branches.length; b++) {
                if (branches[b]!.has(skillId)) {
                    targetBranchIndex = b;
                    break;
                }
            }

            // Se a skill procurada faz parte de um dos ramos bifurcados desse fork
            if (targetBranchIndex !== -1) {
                // Checa se qualquer OUTRO ramo irmão dessa bifurcação já possui skills desbloqueadas
                for (let b = 0; b < branches.length; b++) {
                    if (b === targetBranchIndex) continue;
                    const opposingBranch = branches[b]!;
                    for (const unlockedId of unlockedSkills) {
                        if (opposingBranch.has(unlockedId)) {
                            return true; // Bloqueado pelo ramo concorrente!
                        }
                    }
                }
            }
        }

        return false;
    }
}
