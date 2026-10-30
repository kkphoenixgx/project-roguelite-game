import Attributes from "../ObjectModule/Entities/Attributes";
import type { ILogger } from "../ports/ILogger";
import { 
    GlobalStatPool, GlobalBroochPool, RarityMultipliers, 
    type GeneratedGlobalNode, type Rarity 
} from "./MetaProgressionMap";

import type { IEventManager } from "../eventDispacher/IGameEvents";

export interface GlobalState {
  globalEssence: number;
  /** IDs dos nós desbloqueados na árvore procedural ativa */
  unlockedGlobalNodes: string[];
  /** Histórico cumulativo de todos os nós comprados em gerações anteriores */
  purchasedPermanentNodes: GeneratedGlobalNode[];
  /** IDs de todos os broches permanentes coletados */
  unlockedBrooches: string[];
  generatedTree: GeneratedGlobalNode[];
  treeGenerationCount: number;
  spentSkillPoints?: number | undefined;
  /** Histórico de marcos narrativos desbloqueados */
  unlockedStoryMilestones?: string[] | undefined;
  /** Flags narrativas persistentes */
  storyFlags?: Record<string, any> | undefined;
}
export default class MetaProgressionManager {
  private globalEssence: number = 50000;
  private unlockedGlobalNodes: Set<string> = new Set();
  private purchasedPermanentNodes: GeneratedGlobalNode[] = [];
  private unlockedBrooches: Set<string> = new Set();
  private unlockedStoryMilestones: Set<string> = new Set();
  private storyFlags: Map<string, any> = new Map();
  private generatedTree: GeneratedGlobalNode[] = [];
  private treeGenerationCount: number = 0;
  private logger: ILogger;

  /** Rastreador de proezas e nível alcançado na run ativa */
  private currentRunFeats: { name: string, value: number }[] = [];
  private maxLevelReached: number = 1;

  public reset(): void {
    this.globalEssence = 0;
    this.unlockedGlobalNodes.clear();
    this.purchasedPermanentNodes = [];
    this.unlockedBrooches.clear();
    this.unlockedStoryMilestones.clear();
    this.storyFlags.clear();
    this.spentSkillPoints = 0;
    this.currentRunFeats = [];
    this.maxLevelReached = 1;
    this.treeGenerationCount = 0;
    this.generatedTree = [];
    this.generateNewTree();
    this.logger.log('domain', 'MetaProgressionManager reset to initial state.');
  }

  constructor(logger: ILogger, private eventManager?: IEventManager) {
    this.logger = logger;
    this.generateTreeIfEmpty();
  }

  private generateTreeIfEmpty() {
      if (this.generatedTree.length > 0) return;
      this.generateNewTree();
  }

  private generateNewTree() {
      this.treeGenerationCount++;
      this.generatedTree = [];
      this.unlockedGlobalNodes.clear();

      const rarities: Rarity[] = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
      const generationPrefix = `t${this.treeGenerationCount}`;
      const leftLevel3Ids: string[] = [];
      const rightLevel3Ids: string[] = [];
      
      //? Nível 1: 3 Escolhas (Base da árvore)
      for (let i = 0; i < 3; i++) {
          const l1Stat = GlobalStatPool[Math.floor(Math.random() * GlobalStatPool.length)]!;
          const l1Rarity = rarities[Math.floor(Math.random() * rarities.length)]!;
          const l1Id = `${generationPrefix}_lvl1_base${i}`;
          this.generatedTree.push(this.createProceduralNode(l1Id, 1, l1Stat, l1Rarity, []));

          //? Nível 2: Cada escolha base ramifica em 2 nós filhos
          for (let j = 0; j < 2; j++) {
              const l2Stat = GlobalStatPool[Math.floor(Math.random() * GlobalStatPool.length)]!;
              const l2Rarity = rarities[Math.floor(Math.random() * rarities.length)]!;
              const l2Id = `${generationPrefix}_lvl2_b${i}_c${j}`;
              this.generatedTree.push(this.createProceduralNode(l2Id, 2, l2Stat, l2Rarity, [l1Id]));

              //? Nível 3: Cada nó de Nível 2 ramifica em mais 2 nós
              for (let k = 0; k < 2; k++) {
                  const l3Stat = GlobalStatPool[Math.floor(Math.random() * GlobalStatPool.length)]!;
                  const l3Rarity = rarities[Math.floor(Math.random() * rarities.length)]!;
                  const l3Id = `${generationPrefix}_lvl3_b${i}_c${j}_k${k}`;
                  this.generatedTree.push(this.createProceduralNode(l3Id, 3, l3Stat, l3Rarity, [l2Id]));
                  
                  //? Distribuição das metades da árvore para os 2 broches terminais
                  if (i === 0 || (i === 1 && j === 0)) {
                      leftLevel3Ids.push(l3Id);
                  } else {
                      rightLevel3Ids.push(l3Id);
                  }
              }
          }
      }

      //? Nível 4: 2 escolhas de Broche permanente conectadas aos ramos respectivos
      const shuffledBrooches = [...GlobalBroochPool].sort(() => 0.5 - Math.random());
      
      for (let k = 0; k < 2; k++) {
          const brooch = shuffledBrooches[k] || GlobalBroochPool[0]!;
          const targetDeps = k === 0 ? leftLevel3Ids : rightLevel3Ids;
          const broochNode: GeneratedGlobalNode = {
              id: `${generationPrefix}_lvl4_brooch${k}_${brooch.id}`,
              level: 4,
              name: brooch.name,
              description: brooch.description,
              cost: 1,
              rarity: 'lendario',
              dependencies: targetDeps,
              broochId: brooch.id
          };
          this.generatedTree.push(broochNode);
      }
      
      this.logger.log('domain', `Nova Árvore Global gerada (3 bases -> 6 ramos -> 2 broches). Geração: ${this.treeGenerationCount}`);
  }

  private createProceduralNode(id: string, level: 1|2|3, stat: any, rarity: Rarity, dependencies: string[]): GeneratedGlobalNode {
      const mult = RarityMultipliers[rarity];
      return {
          id,
          level,
          name: `${stat.name} (${rarity})`,
          description: `${stat.desc} em ${stat.baseValue * mult}.`,
          cost: 1,
          rarity,
          dependencies,
          statType: stat.type,
          statValue: stat.baseValue * mult
      };
  }

  public recordFeat(name: string, essenceReward: number): void {
      this.currentRunFeats.push({ name, value: essenceReward });
      this.logger.log('domain', `Feat recorded: ${name} (+${essenceReward} essence)`);
  }

  public lastRunSummary: { totalReward: number, breakdown: any } | null = null;

  public calculateAndClaimRunReward(finalLevel: number): { totalReward: number, breakdown: any } {
      const levelReward = finalLevel * 50;
      let featsReward = 0;
      
      for (const feat of this.currentRunFeats) {
          featsReward += feat.value;
      }
      
      const totalReward = levelReward + featsReward;
      this.addEssence(totalReward);
      
      const breakdown = {
          levelReward,
          featsReward,
          feats: [...this.currentRunFeats]
      };
      
      this.currentRunFeats = [];
      this.maxLevelReached = 1;
      
      const result = { totalReward, breakdown };
      this.lastRunSummary = result;
      
      this.logger.log('domain', `Run terminada! Recompensa total: ${totalReward} XP.`);
      return result;
  }

  private spentSkillPoints: number = 0;

  public getXPState() {
      const BASE_XP = 100;
      let level = 1;
      let xpNeeded = BASE_XP;
      let remainingXp = this.globalEssence;
      
      while (remainingXp >= xpNeeded) {
          remainingXp -= xpNeeded;
          level++;
          xpNeeded = BASE_XP * level;
      }
      
      const totalEarnedPoints = level - 1;
      const availablePoints = totalEarnedPoints - this.spentSkillPoints;
      
      return {
          currentXP: remainingXp,
          xpToNext: xpNeeded,
          level,
          availablePoints
      };
  }

  public addEssence(amount: number): void {
    if (amount > 0) {
      this.globalEssence += amount;
      this.logger.log('domain', `Added ${amount} essence(XP). Total: ${this.globalEssence}`);
    }
  }

  public spendEssence(cost: number): boolean {
      const state = this.getXPState();
      if (state.availablePoints >= cost) {
          this.spentSkillPoints += cost;
          this.logger.log('domain', `Spent ${cost} SP. Total Spent: ${this.spentSkillPoints}`);
          return true;
      }
      return false;
  }

  public unlockNode(nodeId: string): void {
    const node = this.generatedTree.find(n => n.id === nodeId);
    if (!node) return;

    if (this.unlockedGlobalNodes.has(nodeId)) return;

    //? Checagem de dependência: para nós de nível > 1, ao menos um pai deve estar desbloqueado
    if (node.level > 1 && node.dependencies && node.dependencies.length > 0) {
        const hasParentUnlocked = node.dependencies.some(depId => this.unlockedGlobalNodes.has(depId));
        if (!hasParentUnlocked) {
            this.logger.log('domain', `Cannot unlock ${nodeId}: prerequisite not met.`);
            return;
        }
    }

    //? Exclusividade de nível 1: permite selecionar apenas 1 base por ciclo da árvore
    if (node.level === 1) {
        const alreadyHasLevel1 = Array.from(this.unlockedGlobalNodes).some(id => {
            const n = this.generatedTree.find(treeNode => treeNode.id === id);
            return n && n.level === 1;
        });
        if (alreadyHasLevel1) {
            this.logger.log('domain', `Cannot unlock ${nodeId}: base already selected.`);
            return;
        }
    }

    this.unlockedGlobalNodes.add(nodeId);
    this.logger.log('domain', `Unlocked global node: ${nodeId}`);
    if (this.eventManager) {
        this.eventManager.dispatch('globalNodePurchased', { nodeId });
    }

    if (node.level < 4) {
        //? Armazena no histórico de buffs para sempre
        this.purchasedPermanentNodes.push(node);
    } else if (node.level === 4 && node.broochId) {
        //? Broche terminal coletado: desbloqueia o broche e reseta a árvore para nova geração
        this.unlockedBrooches.add(node.broochId);
        this.logger.log('domain', `Broche coletado: ${node.broochId}. Resetando a árvore...`);
        this.generateNewTree();
    }
  }

  public getUnlockedNodes(): string[] {
    return Array.from(this.unlockedGlobalNodes);
  }

  public getGlobalState(): GlobalState {
    const flagsObj: Record<string, any> = {};
    for (const [k, v] of this.storyFlags.entries()) {
      flagsObj[k] = v;
    }

    return {
      globalEssence: this.globalEssence,
      unlockedGlobalNodes: this.getUnlockedNodes(),
      purchasedPermanentNodes: this.purchasedPermanentNodes,
      unlockedBrooches: Array.from(this.unlockedBrooches),
      generatedTree: this.generatedTree,
      treeGenerationCount: this.treeGenerationCount,
      spentSkillPoints: this.spentSkillPoints,
      unlockedStoryMilestones: Array.from(this.unlockedStoryMilestones),
      storyFlags: flagsObj
    };
  }

  public unlockStoryMilestone(
    milestoneId: string,
    eventManager?: IEventManager,
    title?: string,
    description?: string
  ): boolean {
    if (this.unlockedStoryMilestones.has(milestoneId)) return false;
    this.unlockedStoryMilestones.add(milestoneId);
    this.logger.log('domain', `[MetaProgression] Marco de História Desbloqueado: ${milestoneId} (${title || ''})`);
    if (eventManager) {
      const payload: any = { milestoneId };
      if (title) payload.title = title;
      if (description) payload.description = description;
      eventManager.dispatch('storyMilestoneUnlocked', payload);
    }
    return true;
  }

  public hasStoryMilestone(milestoneId: string): boolean {
    return this.unlockedStoryMilestones.has(milestoneId);
  }

  public getUnlockedStoryMilestones(): string[] {
    return Array.from(this.unlockedStoryMilestones);
  }

  public setStoryFlag(key: string, value: any): void {
    this.storyFlags.set(key, value);
  }

  public getStoryFlag<T = any>(key: string, defaultValue?: T): T | undefined {
    return this.storyFlags.has(key) ? this.storyFlags.get(key) : defaultValue;
  }

  public unlockBrooch(broochId: string): void {
    if (!broochId) return;
    this.unlockedBrooches.add(broochId);
    this.logger.log('domain', `Broche ${broochId} registrado em unlockedBrooches.`);
  }

  public loadGlobalState(state: Partial<GlobalState>): void {
    if (state.globalEssence !== undefined) this.globalEssence = state.globalEssence;
    if (state.purchasedPermanentNodes) this.purchasedPermanentNodes = state.purchasedPermanentNodes;
    if (state.unlockedBrooches) this.unlockedBrooches = new Set(state.unlockedBrooches);
    if (state.unlockedGlobalNodes) {
      this.unlockedGlobalNodes = new Set(state.unlockedGlobalNodes);
    }

    //? Cálculo resiliente e determinístico de pontos de habilidade gastos para evitar duplicação em reload
    if (state.spentSkillPoints !== undefined) {
      this.spentSkillPoints = state.spentSkillPoints;
    } else {
      const permanentCount = this.purchasedPermanentNodes ? this.purchasedPermanentNodes.length : 0;
      const broochCount = this.unlockedBrooches ? this.unlockedBrooches.size : 0;
      const currentUnlockedCount = this.unlockedGlobalNodes ? this.unlockedGlobalNodes.size : 0;
      this.spentSkillPoints = Math.max(permanentCount + broochCount, currentUnlockedCount);
    }

    if (state.generatedTree && state.generatedTree.length > 0) {
      this.generatedTree = state.generatedTree;
    } else if (this.generatedTree.length === 0) {
      this.generateNewTree();
    }
    //? Preserva a árvore existente caso o state não a defina explicitamente

    if (state.treeGenerationCount !== undefined) this.treeGenerationCount = state.treeGenerationCount;
    if (state.unlockedStoryMilestones) this.unlockedStoryMilestones = new Set(state.unlockedStoryMilestones);
    if (state.storyFlags) this.storyFlags = new Map(Object.entries(state.storyFlags));
  }
  
  public getAvailableNodesMap(): GeneratedGlobalNode[] {
      return this.generatedTree;
  }

  public applyGlobalBonuses(attributes: Attributes): void {
    //? Aplica TODOS os buffs comprados em todas as gerações de árvores
    for (const node of this.purchasedPermanentNodes) {
        if (node.statType && node.statValue) {
            const statDef = GlobalStatPool.find(s => s.type === node.statType);
            if (statDef) {
                statDef.apply(attributes, node.statValue);
            }
        }
    }
    this.logger.log('domain', `Aplicado um total de ${this.purchasedPermanentNodes.length} bônus procedurais cumulativos!`);
  }

  public getAggregatedMetaStats() {
      const aggregatedStats: Record<string, { type: string, category?: string, name: string, desc?: string, totalValue: number }> = {};
  
      //? Inicializa todos os atributos conhecidos com 0 para exibição consistente
      for (const stat of GlobalStatPool) {
          aggregatedStats[stat.type] = {
              type: stat.type,
              category: stat.category,
              name: stat.name,
              desc: stat.desc,
              totalValue: 0
          };
      }

      for (const node of this.purchasedPermanentNodes) {
          if (!node.statType || !node.statValue) continue;
          
          const existing = aggregatedStats[node.statType];
          if (existing) {
              existing.totalValue += node.statValue;
          } else {
              const cleanName = node.name.split(' (')[0]; 
              aggregatedStats[node.statType] = { type: node.statType, category: 'derived', name: cleanName!, desc: node.description, totalValue: node.statValue };
          }
      }
      
      const unlockedBroochObjects = Array.from(this.unlockedBrooches).map(broochId => {
          return GlobalBroochPool.find(b => b.id === broochId) || { id: broochId, name: 'Broche Desconhecido', description: '' };
      });
  
      return {
          stats: Object.values(aggregatedStats),
          brooches: unlockedBroochObjects
      };
  }
}
