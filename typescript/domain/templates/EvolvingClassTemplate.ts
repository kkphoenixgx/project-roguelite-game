import EvolvingClassBase, { type IEvolvingStageDefinition } from "./EvolvingClassBase";
import type IXPTable from "../ObjectModule/Entities/IXPTable";
import type { IPlayer } from "../ports/domain-contracts";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import type Skill from "../Skills/Skill";
import type MetaProgressionManager from "../facadeComponents/MetaProgressionManager";
import PlayerClassManager from "../ObjectModule/Entities/Player/components/PlayerClassManager";

export class EvolvingStageBuilder {
  private _stage: number;
  private _stageTitle: string = '';
  private _description: string = '';
  private _visualTint?: string | undefined;
  private _visualScale?: number | undefined;
  private _attributeBonuses?: Partial<Record<'strength' | 'constitution' | 'dexterity' | 'intelligence' | 'wisdom' | 'charisma', number>> | undefined;
  private _skillsByLevel: Map<number, Skill> = new Map();
  private _requiredMilestones: string[] = [];
  private _minPlayerLevel?: number | undefined;
  private _customCheck?: ((player: IPlayer, metaManager?: MetaProgressionManager) => boolean) | undefined;
  private _onStageEnter?: ((player: IPlayer, eventManager: IEventManager) => void) | undefined;
  private _onStageExit?: ((player: IPlayer, eventManager: IEventManager) => void) | undefined;

  constructor(stageNumber: number) {
    this._stage = stageNumber;
    this._stageTitle = `Estágio ${stageNumber}`;
  }

  public setTitle(title: string): this {
    this._stageTitle = title;
    return this;
  }

  public setDescription(desc: string): this {
    this._description = desc;
    return this;
  }

  public withVisualTint(colorHex: string): this {
    this._visualTint = colorHex;
    return this;
  }

  public withVisualScale(scale: number): this {
    this._visualScale = scale;
    return this;
  }

  public withAttributeBonuses(bonuses: Partial<Record<'strength' | 'constitution' | 'dexterity' | 'intelligence' | 'wisdom' | 'charisma', number>>): this {
    this._attributeBonuses = bonuses;
    return this;
  }

  public addSkill(level: number, skill: Skill): this {
    this._skillsByLevel.set(level, skill);
    return this;
  }

  public requireMilestone(milestoneId: string): this {
    this._requiredMilestones.push(milestoneId);
    return this;
  }

  public requirePlayerLevel(level: number): this {
    this._minPlayerLevel = level;
    return this;
  }

  public requireCustom(fn: (player: IPlayer, metaManager?: MetaProgressionManager) => boolean): this {
    this._customCheck = fn;
    return this;
  }

  public onStageEnter(fn: (player: IPlayer, eventManager: IEventManager) => void): this {
    this._onStageEnter = fn;
    return this;
  }

  public onStageExit(fn: (player: IPlayer, eventManager: IEventManager) => void): this {
    this._onStageExit = fn;
    return this;
  }

  public build(): IEvolvingStageDefinition {
    return {
      stage: this._stage,
      stageTitle: this._stageTitle,
      description: this._description,
      visualTint: this._visualTint,
      visualScale: this._visualScale,
      attributeBonuses: this._attributeBonuses,
      skillsByLevel: this._skillsByLevel,
      evolutionRequirements: {
        requiredMilestones: this._requiredMilestones.length > 0 ? this._requiredMilestones : undefined,
        minPlayerLevel: this._minPlayerLevel,
        customCheck: this._customCheck
      },
      onStageEnter: this._onStageEnter,
      onStageExit: this._onStageExit
    };
  }
}

/**
 * ==============================================================================
 * BUILDER FLUENTE DE CLASSE EVOLUTIVA (EvolvingClassTemplate)
 * ==============================================================================
 * Construtor declarativo para configurar classes narrativas de múltiplos estágios,
 * seus requisitos de desbloqueio, árvores metamórficas de habilidades e registro global.
 * ==============================================================================
 */
export default class EvolvingClassTemplate {
  private _stages: Map<number, IEvolvingStageDefinition> = new Map();
  private _initialStage: number = 1;

  private constructor(public readonly className: string) {}

  public static create(className: string): EvolvingClassTemplate {
    return new EvolvingClassTemplate(className);
  }

  public withInitialStage(stageNumber: number): this {
    this._initialStage = stageNumber;
    return this;
  }

  public withStage(
    stageNumber: number,
    configure: (builder: EvolvingStageBuilder) => void
  ): this {
    const builder = new EvolvingStageBuilder(stageNumber);
    configure(builder);
    this._stages.set(stageNumber, builder.build());
    return this;
  }

  public addPrebuiltStage(stageDef: IEvolvingStageDefinition): this {
    this._stages.set(stageDef.stage, stageDef);
    return this;
  }

  /**
   * Instancia uma nova EvolvingClassBase pronta para ser injetada no jogador.
   */
  public buildClass(xpTable: IXPTable, player: IPlayer, eventManager: IEventManager): EvolvingClassBase {
    return new EvolvingClassBase(
      this.className,
      xpTable,
      player,
      eventManager,
      Array.from(this._stages.values()),
      this._initialStage
    );
  }

  /**
   * Registra a classe globalmente no PlayerClassManager para que todos os novos
   * jogadores já instanciem essa classe automaticamente.
   */
  public registerGlobally(): void {
    PlayerClassManager.registerGlobalClass(this.className, (xpTable, player, eventManager) => {
      return this.buildClass(xpTable, player as any, eventManager);
    });
  }
}
