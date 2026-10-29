import Class from "../ObjectModule/Entities/Player/Classes/Class";
import type IXPTable from "../ObjectModule/Entities/IXPTable";
import type Skill from "../Skills/Skill";
import type { IPlayer } from "../ports/domain-contracts";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import type MetaProgressionManager from "../facadeComponents/MetaProgressionManager";

export interface IEvolvingStageDefinition {
  readonly stage: number;
  readonly stageTitle: string;
  readonly description: string;
  readonly visualTint?: string | undefined;
  readonly visualScale?: number | undefined;
  readonly attributeBonuses?: Partial<Record<'strength' | 'constitution' | 'dexterity' | 'intelligence' | 'wisdom' | 'charisma', number>> | undefined;
  readonly skillsByLevel: Map<number, Skill>;
  readonly evolutionRequirements?: {
    readonly requiredMilestones?: string[] | undefined;
    readonly minPlayerLevel?: number | undefined;
    readonly customCheck?: ((player: IPlayer, metaManager?: MetaProgressionManager) => boolean) | undefined;
  } | undefined;
  readonly onStageEnter?: ((player: IPlayer, eventManager: IEventManager) => void) | undefined;
  readonly onStageExit?: ((player: IPlayer, eventManager: IEventManager) => void) | undefined;
}

/**
 * ==============================================================================
 * CLASSE BASE EVOLUTIVA (EvolvingClassBase)
 * ==============================================================================
 * Permite modelar classes não-estáticas que progridem através de ESTÁGIOS
 * narrativos e de transcendência (ex: Estágio 1 -> Estágio 2 -> Estágio Final).
 * 
 * Filosofia de Design & Garantias:
 * - Pureza Hexagonal: Desacoplada de UI/Canvas, reage via eventos tipados.
 * - Zero-GC: Consultas de skills e estados utilizam coleções internas indexadas.
 * - Metamorfose de Árvore de Habilidades: Cada estágio possui seu conjunto próprio
 *   de habilidades ou variantes evoluídas, notificando a UI automaticamente.
 * - Integração Narrativa: Verifica marcos persistentes em `MetaProgressionManager`.
 * - Evolução Visual: Emite `classStageAscended` e aplica tints/auras ao jogador.
 * ==============================================================================
 */
export default class EvolvingClassBase extends Class {
  public readonly isEvolving: boolean = true;
  private _currentStage: number = 1;
  private _stages: Map<number, IEvolvingStageDefinition> = new Map();

  constructor(
    name: string,
    xpTable: IXPTable,
    player: IPlayer,
    eventManager: IEventManager,
    stages: IEvolvingStageDefinition[] = [],
    initialStage: number = 1
  ) {
    super(name, xpTable, player, eventManager);

    for (const stageDef of stages) {
      this._stages.set(stageDef.stage, stageDef);
    }

    if (this._stages.size > 0 && this._stages.has(initialStage)) {
      this._currentStage = initialStage;
    } else if (this._stages.size > 0) {
      const minKey = Math.min(...Array.from(this._stages.keys()));
      this._currentStage = minKey;
    }

    const currentDef = this.currentStageDefinition;
    if (currentDef && currentDef.visualTint && (this.player as any)) {
      (this.player as any).visualTint = currentDef.visualTint;
    }
  }

  public get currentStage(): number {
    return this._currentStage;
  }

  public get maxStage(): number {
    if (this._stages.size === 0) return 1;
    return Math.max(...Array.from(this._stages.keys()));
  }

  public get stageTitle(): string {
    return this.currentStageDefinition?.stageTitle || `Estágio ${this._currentStage}`;
  }

  public get currentStageDefinition(): IEvolvingStageDefinition | undefined {
    return this._stages.get(this._currentStage);
  }

  public getStageDefinition(stage: number): IEvolvingStageDefinition | undefined {
    return this._stages.get(stage);
  }

  public getSkillForLevel(level: number): Skill | null {
    const currentDef = this.currentStageDefinition;
    if (!currentDef) return null;
    return currentDef.skillsByLevel.get(level) || null;
  }

  public get allSkills(): Skill[] {
    const currentDef = this.currentStageDefinition;
    if (!currentDef) return [];
    return Array.from(currentDef.skillsByLevel.values());
  }

  public get skillsByLevel(): Map<number, Skill> {
    const currentDef = this.currentStageDefinition;
    if (!currentDef) return new Map();
    return currentDef.skillsByLevel;
  }

  /**
   * Verifica se o jogador cumpre todos os requisitos para ascender ao próximo estágio.
   */
  public canAscend(metaManager?: MetaProgressionManager): boolean {
    if (this._currentStage >= this.maxStage) return false;

    const nextStage = this._currentStage + 1;
    const nextDef = this._stages.get(nextStage);
    if (!nextDef) return false;

    const reqs = nextDef.evolutionRequirements;
    if (!reqs) return true;

    if (reqs.minPlayerLevel && this.player.attributes.level < reqs.minPlayerLevel) {
      return false;
    }

    if (reqs.requiredMilestones && reqs.requiredMilestones.length > 0) {
      if (!metaManager) return false;
      for (const milestone of reqs.requiredMilestones) {
        if (!metaManager.hasStoryMilestone(milestone)) {
          return false;
        }
      }
    }

    if (reqs.customCheck && !reqs.customCheck(this.player, metaManager)) {
      return false;
    }

    return true;
  }

  /**
   * Executa a transcendência para o próximo estágio evolutivo da classe.
   * Atualiza a árvore de habilidades, aplica bônus de atributos, tints visuais e emite eventos.
   */
  public ascend(metaManager?: MetaProgressionManager): boolean {
    if (!this.canAscend(metaManager)) {
      this.eventManager.dispatch('log', {
        channel: 'domain',
        message: `⚠️ [Ascensão] Requisitos não atendidos para evoluir a classe ${this.name}!`,
        params: []
      });
      return false;
    }

    const prevStage = this._currentStage;
    const oldDef = this.currentStageDefinition;
    if (oldDef?.onStageExit) {
      oldDef.onStageExit(this.player, this.eventManager);
    }

    this._currentStage++;
    const newDef = this.currentStageDefinition!;

    if (newDef.visualTint && (this.player as any)) {
      (this.player as any).visualTint = newDef.visualTint;
    }
    if (newDef.visualScale && (this.player as any)) {
      (this.player as any).visualScale = newDef.visualScale;
    }

    if (newDef.attributeBonuses && this.player.attributes) {
      const b = newDef.attributeBonuses;
      if (b.strength) this.player.attributes.strength += b.strength;
      if (b.constitution) this.player.attributes.constitution += b.constitution;
      if (b.dexterity) this.player.attributes.dexterity += b.dexterity;
      if (b.intelligence) this.player.attributes.intelligence += b.intelligence;
      if (b.wisdom) this.player.attributes.wisdom += b.wisdom;
      if (b.charisma) this.player.attributes.charisma += b.charisma;
    }

    if (newDef.onStageEnter) {
      newDef.onStageEnter(this.player, this.eventManager);
    }

    this.eventManager.dispatch('classStageAscended', {
      className: this.name,
      oldStage: prevStage,
      newStage: this._currentStage,
      stageTitle: newDef.stageTitle,
      visualTint: newDef.visualTint
    });

    this.eventManager.dispatch('log', {
      channel: 'domain',
      message: `🌟 [Ascensão de Classe: ${this.name}] Transcendeu para o Estágio ${this._currentStage}: "${newDef.stageTitle}"!`,
      params: []
    });

    this.eventManager.dispatch('skillTreeUpdated', {
      skills: Array.from((this.player as any).unlockedSkills || []),
      loadout: (this.player as any).activeLoadout,
      passiveLoadout: (this.player as any).passiveLoadout,
      globalActiveLoadout: (this.player as any).globalActiveLoadout
    });

    return true;
  }

  /**
   * Força a definição do estágio atual (útil ao recarregar saves do disco).
   */
  public setStageDirectly(stageNumber: number): void {
    if (this._stages.has(stageNumber)) {
      this._currentStage = stageNumber;
      const def = this.currentStageDefinition;
      if (def?.visualTint && (this.player as any)) {
        (this.player as any).visualTint = def.visualTint;
      }
    }
  }
}
