import type Player from "../ObjectModule/Entities/Player/Player";
import type { ILogger } from "../ports/ILogger";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import BroochRegistry from "../ObjectModule/Entities/Player/components/BroochRegistry";
import SkillBranchManager from "../Skills/SkillBranchManager";

export default class SkillTreeGateway {
    constructor(
        private player: Player,
        private logger: ILogger,
        private eventManager: IEventManager,
        private setViewedClass: (cls: string | null) => void
    ) {
    //? Reage a intenções da UI de forma reativa desacoplada da Facade
        this.eventManager.on('skillTreeAction', (payload) => {
            this.manage(payload.action, payload.payload);
            this.broadcastState();
        });
    }

    private broadcastState() {
        this.eventManager.dispatch('skillTreeUpdated', {
            skills: Array.from(this.player.unlockedSkills),
            loadout: (this.player as any).activeLoadout,
            passiveLoadout: (this.player as any).passiveLoadout,
            globalActiveLoadout: (this.player as any).globalActiveLoadout
        });
    }

    public manage(action: 'unlock' | 'changeClass' | 'equip', payload: { className?: string; skillId?: string; slotIndex?: number }): void {
        if (action === 'changeClass' && payload.className) {
    //? Atualiza a classe inspecionada na interface sem alterar a classe armada ativa do jogador
            this.setViewedClass(payload.className as string);
            this.logger.log('actions', `[DomainFacade] UI está agora visualizando a árvore da classe: ${payload.className}`);
            this.eventManager.dispatch('classChanged', { oldClassInstance: null, newClassInstance: null });
        } else if (action === 'unlock' && payload.skillId) {
            let activeClassInstance = undefined;
            for (const cls of this.player.classes) {
                const map = (cls as any).skillsByLevel as Map<number, any>;
                if (map) {
                    for (const sk of map.values()) {
                        if (sk.id === payload.skillId) {
                            activeClassInstance = cls;
                            break;
                        }
                    }
                }
                if (!activeClassInstance && Array.isArray((cls as any).allSkills)) {
                    if ((cls as any).allSkills.some((s: any) => s.id === payload.skillId)) {
                        activeClassInstance = cls;
                    }
                }
                if (activeClassInstance) break;
            }

            if (!activeClassInstance || !this.player.unlockedClasses.includes(activeClassInstance.name)) {
                this.logger.log('error', `Acesso negado: Classe '${activeClassInstance?.name || 'Desconhecida'}' não está desbloqueada pelo jogador.`);
                return;
            }
            
            let requiredLevel = 1;
            
            let targetSkill: any = null;
            if (activeClassInstance) {
                const skillsMap = (activeClassInstance as any).skillsByLevel as Map<number, any>;
                if (skillsMap) {
                    for (const [lvl, skill] of skillsMap.entries()) {
                        if (skill.id === payload.skillId) {
                            targetSkill = skill;
                            requiredLevel = lvl;
                            break;
                        }
                    }
                }
                if (!targetSkill && Array.isArray((activeClassInstance as any).allSkills)) {
                    targetSkill = (activeClassInstance as any).allSkills.find((s: any) => s.id === payload.skillId);
                    if (targetSkill && targetSkill.tier) {
                        const tierLevelMap: Record<number, number> = { 1: 1, 2: 4, 3: 7, 4: 10 };
                        requiredLevel = tierLevelMap[targetSkill.tier] ?? 1;
                    }
                }
            }

            if (targetSkill) {
                const prereqs: string[] = targetSkill.dependencies && targetSkill.dependencies.length > 0
                    ? targetSkill.dependencies
                    : (targetSkill.requiredSkillId ? [targetSkill.requiredSkillId] : (targetSkill.prerequisiteId ? [targetSkill.prerequisiteId] : []));

                for (const dep of prereqs) {
                    if (!this.player.unlockedSkills.has(dep)) {
                        this.logger.log('error', `Acesso negado: Habilidade ${dep} deve ser destravada primeiro.`);
                        return;
                    }
                }
            }

            const classSkillsList: any[] = Array.isArray((activeClassInstance as any).allSkills)
                ? (activeClassInstance as any).allSkills
                : Array.from(((activeClassInstance as any).skillsByLevel?.values?.() || []));

            if (SkillBranchManager.isSkillBlockedByBranchSelection(payload.skillId as string, classSkillsList, this.player.unlockedSkills, activeClassInstance.name)) {
                this.logger.log('error', `Acesso negado: Ramo concorrente da arvore de habilidades ja foi escolhido.`);
                return;
            }
            
            if (this.player.attributes.level >= requiredLevel) {
                if (this.player.attributes.availablePoints > 0) {
                    (this.player.attributes as any)._availablePoints--;
                    this.player.unlockSkill(payload.skillId as string);
                    this.eventManager.dispatch('skillPointSpent', { 
                        skillId: payload.skillId as string, 
                        remainingPoints: this.player.attributes.availablePoints 
                    });
                    this.eventManager.dispatch('classChanged', { oldClassInstance: null, newClassInstance: null });
                } else {
                    this.logger.log('error', `Acesso negado: Pontos de habilidade insuficientes para a skill ${payload.skillId}.`);
                }
            } else {
                this.logger.log('error', `Acesso negado: Nível insuficiente para destravar a skill. (Nível atual: ${this.player.attributes.level}, Necessário: ${requiredLevel})`);
            }
        } else if (action === 'equip' && payload.slotIndex !== undefined) {
            if (!payload.skillId) {
                const targetType = (payload as any).type;
                if (targetType === 'passive' || targetType === 'passivo') {
                    this.player.equipPassiveInLoadout(null, payload.slotIndex);
                } else if (targetType === 'active' || targetType === 'ativo') {
                    this.player.equipGlobalActiveBrooch(null, payload.slotIndex);
                } else {
                    this.player.equipSkillInLoadout(null as any, payload.slotIndex);
                }
                this.eventManager.dispatch('classChanged', { oldClassInstance: null, newClassInstance: null });
                return;
            }
            const brooch = BroochRegistry.get(payload.skillId);
            const isBroochActive = brooch?.type === 'ativo' || payload.skillId.startsWith('brooch_active_');
            const isBroochPassive = brooch?.type === 'passivo' || (payload.skillId.startsWith('brooch_') && !payload.skillId.startsWith('brooch_active_'));

            if (isBroochActive) {
                this.player.equipGlobalActiveBrooch(payload.skillId, payload.slotIndex);
            } else if (isBroochPassive) {
                this.player.equipPassiveInLoadout(payload.skillId, payload.slotIndex);
            } else if ((payload as any).type === 'passive' || (payload as any).type === 'passivo') {
                this.logger.log('error', `A habilidade '${payload.skillId}' é uma passiva de classe e não pode ser equipada como broche.`);
            } else {
                this.player.equipSkillInLoadout(payload.skillId, payload.slotIndex);
            }
            this.eventManager.dispatch('classChanged', { oldClassInstance: null, newClassInstance: null });
        }
    }
}
