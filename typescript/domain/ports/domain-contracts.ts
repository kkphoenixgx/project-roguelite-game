export interface HitboxDebugShape { type: "circle" | "polygon"; coordinates: {x: number, y: number}; rotation?: number; radius?: number; points?: { x: number, y: number }[]; color?: string; }
/** @file Define a fronteira da Arquitetura Hexagonal, contendo os contratos (DTOs e a Porta) que governam a comunicação entre as camadas de Domínio e Adaptação. */

import type { action } from "../eventDispacher/actions.type";
import type { objectTypeId } from "../ObjectModule/objectType.type";

export interface SkillNodeDTO {
  id: string;
  name: string;
  description: string;
  type: 'active' | 'passive' | 'rare' | 'essential' | 'attribute';
  tier: number;
  unlocked: boolean;
  canUnlock: boolean;
  isBranchBlocked?: boolean;
  dependencies?: string[];
  requiredSkillId?: string;
  requiresMainHandWeapon?: boolean;
}

export interface ClassDTO {
  name: string;
  isUnlocked: boolean;
  isActive: boolean;
  isEvolving?: boolean | undefined;
  currentStage?: number | undefined;
  stageTitle?: string | undefined;
}

import type { CustomLLMPresetDTO, ILLMConfigPort } from "./ILLMConfigPort";
export type { CustomLLMPresetDTO, ILLMConfigPort };
export { NullLLMConfigPort } from "./ILLMConfigPort";

export interface ActiveStatusDTO {
  id: string;
  description: string;
  remaining: number;
}

export interface SkillCooldownData {
  totalMs: number;
  remainingMs: number;
}

/** DTO que representa uma coordenada discreta de Chunk (1024px x 1024px) no espaço inteiro assinado (cx, cy) ∈ ℤ × ℤ. */
export interface ChunkCoordDTO {
  cx: number;
  cy: number;
}

/** DTO que descreve os limites espaciais completos (retângulo contínuo assinado) do mundo do jogo. */
export interface WorldBoundsDTO {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  originChunk?: ChunkCoordDTO | undefined;
  chunks?: (string | undefined | null)[][] | undefined;
  chunkSize?: number | undefined;
}

/** DTO (Data Transfer Object) que representa o estado imutável do mundo do jogo, usado para transferir informações do domínio para a apresentação sem expor a entidade `World` interna. */
export interface WorldState {
  /** A largura total do mundo do jogo em unidades (pixels). */
  width: number;
  /** A altura total do mundo do jogo em unidades (pixels). */
  height: number;
  /** Identificador do mapa para carregar o cenário desenhado no adaptador (ex: 'vilgem'). */
  mapId: string;
  /** Limite horizontal mínimo (ex: -1024 no modelo centralizado). */
  minX?: number | undefined;
  /** Limite vertical mínimo (ex: -1024 no modelo centralizado). */
  minY?: number | undefined;
  /** Limite horizontal máximo (ex: 2048). */
  maxX?: number | undefined;
  /** Limite vertical máximo (ex: 2048). */
  maxY?: number | undefined;
  /** Chunk de origem/spawn central (ex: { cx: 0, cy: 0 }). */
  originChunk?: ChunkCoordDTO | undefined;
  /** Chunk atualmente ocupado pelo jogador. */
  activeChunk?: ChunkCoordDTO | undefined;
  /** Lista de chunks que compõem a janela ativa 3x3 de simulação ao redor do jogador. */
  activeChunks?: readonly ChunkCoordDTO[] | undefined;
  /** Estrutura consolidada de limites do mundo. */
  bounds?: WorldBoundsDTO | undefined;
}

/** DTO que representa um InnerMap (interior, sala ou masmorra estritamente derivado de um mundo). */
export interface InnerMapDTO {
  id: string;
  name?: string | undefined;
  /** Identificador explícito do mundo de onde este innerMap deriva (ex: 'vilgem'). */
  parentWorldId: string;
  width: number;
  height: number;
  backgroundColor?: string | undefined;
  chunks?: string[][] | undefined;
  chunkSize?: number | undefined;
  defaultSpawn?: { x: number; y: number } | undefined;
  portals?: any[] | undefined;
}

/** DTO base para o estado de qualquer objeto que pode ser renderizado. */
interface BaseRenderableState {
  /** Identificador numérico único da entidade no domínio, usado para rastreamento. */
  id: number;
  /** As coordenadas {x, y} atuais do objeto no mundo do jogo. */
  coordinates: { x: number; y: number };
  /** As dimensões {width, height} do objeto. */
  size: { width: number; height: number };

  /** Rotação em radianos do objeto */
  rotation:number
}
/** DTO que representa o estado de uma entidade renderizável. A camada de apresentação usa `entityTypeId` e `state` para decidir qual sprite e animação usar. */
export interface EntityRenderableState extends BaseRenderableState {
  /** Identifica o tipo da entidade (ex: 'player') para que a apresentação possa carregar o asset visual correto. */
  entityTypeId: objectTypeId; //? Identificador de tipo da entidade (ex: 'player', 'goblin', 'chest')
  /** Descreve o estado comportamental da entidade (ex: 'idle') para que a apresentação possa selecionar a animação correta. */
  state? : string;
  /** Uma lista opcional de formas de hitbox para depuração visual. */
  hitboxes?: readonly HitboxDebugShape[];

  isInteractiveNpc?: boolean;
  npcName?: string;

  //? Propriedades específicas para a UI, como a barra de XP.
  /** O nível atual da entidade, se aplicável. */
  level?: number;
  currentXp?: number;
  xpToNextLevel?: number;
  hp?: number;
  maxHp?: number;
  mana?: number;
  maxMana?: number;
  coins?: number;
  maxBackpackSize?: number;
  attributes?: {
    strength: number;
    constitution: number;
    dexterity: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    availablePoints: number;
  };
  derivedAttributes?: {
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    hpRegen: number;
    manaRegen: number;
    defence: number;
    speed: number;
    critChance: number;
    critDamage: number;
    dodge: number;
    accuracy: number;
    recharge: number;
    piercing: number;
    splashDamage: number;
    tenacity: number;
    vigor: number;
    lucky: number;
    insight: number;
  };

  backpack?: any[];
  equipment?: any;
  hasBeard?: boolean;
  activeClass?: string | null;
  unlockedClasses?: string[];
  classes?: ClassDTO[];
  skillTree?: SkillNodeDTO[];
  activeLoadout?: (string | null)[];
  passiveLoadout?: (string | null)[];
  globalActiveLoadout?: (string | null)[];
  unlockedActiveSkills?: SkillNodeDTO[];
  
  /** Elementos mágicos embutidos na entidade para guiar o Motor de Partículas (O Lego Visual) */
  spellElements?: string[] | undefined;
  /** Lista de buffs e debuffs ativos atualmente na entidade. */
  activeStatuses?: ActiveStatusDTO[] | undefined;
  /** Rastreamento de tempo de recarga das habilidades ativas e broches */
  skillCooldowns?: Record<string, SkillCooldownData> | undefined;
  /** Tintura de cor ou aura sobre o renderizável (ex: '#00E5FF' para forma azul/estase) */
  visualTint?: string | undefined;
  /** Escala visual multiplicativa para transformações ou auras */
  visualScale?: number | undefined;
  /** Prompt de UI caso o jogador esteja perto de um NPC interativo. */
  interactablePrompt?: { npcId: number; text: string; npcName: string; entityTypeId: string };
  /** Referência visual para desenhar cordas/conexões entre entidades (Canvas 2D) */
  connectedTo?: { x: number, y: number };
}

/** Tipo união para todos os possíveis estados de objetos renderizáveis, permitindo que o sistema seja estendido com outros tipos (ex: partículas) no futuro. */
export type RenderableState = EntityRenderableState;

export interface EngineWorldDTO {
  id: string;
  name: string;
  cx: number;
  cy: number;
  scale: number;
  path: string;
}

/** @interface IGameDomain Define a "Porta" de entrada para o domínio. A camada de apresentação (GameAdapter) interage com o domínio *exclusivamente* através desta interface, garantindo o desacoplamento. */
export interface IGameDomain {
  readonly unlockedGlobalNodes: string[];
  readonly globalNodesMap: Record<string, any>;
  readonly globalMetaSummary: { stats: { type?: string, category?: string, name: string, desc?: string, totalValue: number }[], brooches: any[] };
  readonly metaProgressionManager?: any;
  /** Limites contínuos atuais do mundo carregado. */
  readonly worldBounds?: WorldBoundsDTO | undefined;
  /** Chunk discreto ocupado atualmente pelo jogador. */
  readonly activeChunk?: ChunkCoordDTO | undefined;
  /** Chunks atualmente incluídos na janela 3x3 de simulação ativa. */
  readonly activeChunks?: readonly ChunkCoordDTO[] | undefined;
  generateLocalRewards(): { id: string, name: string, desc: string, iconSvg: string }[];
  /** Aciona a atualização de estado de todas as entidades do domínio a cada tick do game loop. @param deltaTime O tempo, em segundos, desde a última atualização. */
  update(deltaTime: number): void;
  /** Instruí o domínio a carregar um mapa específico (instanciando a classe World correspondente e gerando suas hitboxes). Este é um método assíncrono pois carrega dados de colisão. */
  loadWorld(mapId: string, collisionData?: any[]): Promise<void>;
  /** Transiciona o jogador para um novo mapa ou intermap, preservando atributos, inventário e habilidades. */
  transitionWorld(targetMapId: string, spawnCoords?: { x: number; y: number }, collisionData?: any[]): Promise<void>;
  /** Traduz uma intenção do usuário (capturada pela apresentação) em um comando que o domínio entende. @param command O comando de movimento. */
  handlePlayerInteractions(command: { actions: Array<action> }, mouseLastCoordinates: {x:number,y:number}): void;
  
  //? Métodos de UI desacoplados em eventos semânticos tipados no barramento de eventos

  /** Solicita ao domínio uma "fotografia" do estado atual de todos os objetos visíveis, formatada como DTOs puros para a renderização. @returns Um objeto com o estado do mundo e uma lista de DTOs renderizáveis. */
  getRenderState(): { world: WorldState; renderables: readonly RenderableState[] };
  /** Envia uma mensagem de texto digitada pelo jogador para a Inteligência Artificial processar. */
  sendDialogue(message: string, targetNpcId?: number): void;
  /** Retorna a lista de mundos disponíveis para o menu de seleção. */
  getAvailableWorlds(): EngineWorldDTO[];
  /** Notifica os agentes BDI no backend que o jogo foi pausado ou despausado. */
  notifyPauseState(isPaused: boolean): void;
  /** Atualiza o preset de LLM/IA customizado no domínio e propaga para entidades cognitivas. */
  updateLLMPreset(preset: CustomLLMPresetDTO): void;
  /** Serializa o estado completo do jogador (atributos, moedas, mochila, equipamentos e classes). */
  serializePlayerState?(): any;
  /** Restaura o estado completo do jogador a partir de dados salvos. */
  restorePlayerState?(state: any): void;
  /** Restaura o estado do jogo (meta-progressão + jogador) a partir de um snapshot salvo. */
  restoreGameState?(data: any): void;
  /** Obtém o snapshot do estado global de meta-progressão para persistência. */
  getMetaProgressionState?(): any;
  /** Reseta o domínio para o estado inicial padrão (usado ao selecionar slot vazio). */
  resetToInitialState?(): void;
  /** Reseta o estado da run do jogador após a morte, preservando broches e bônus da árvore global. */
  resetRunState?(): void;
  /** Serviço de salvamento automático orquestrado pelo domínio. */
  readonly autoSaveService?: any;
  /** Força o salvamento imediato do estado atual do jogo. */
  flushAutoSave?(reason?: string): Promise<void>;
  /** Dispara um gatilho para alterar o estado/sprite de um asset de cenário ou entidade (ex: abrir portão do castelo). */
  triggerAssetState?(payload: TriggerAssetStateDTO): boolean;
}

export interface TriggerAssetStateDTO {
  elementId?: number | undefined;
  presetType?: string | undefined;
  targetState: string;
  passable?: boolean | undefined;
  nearCoordinates?: { x: number; y: number; radius?: number | undefined } | undefined;
}

export interface AssetStateChangedDTO {
  elementId: number;
  presetType: string;
  previousState: string;
  currentState: string;
  passable: boolean;
}
export type DamageType = 'physical' | 'magical' | 'true' | 'fire' | 'water' | 'nature' | 'thunder' | 'light' | 'magic' | 'ground' | 'dark';

export interface IPlayer {
  id: number;
  coordinates: { x: number, y: number };
  size: { width: number, height: number };
  attributes: any;
  serializeState?(): any;
  restoreState?(state: any): void;
  backpack: any[];
  equipedItens: any[];
  equipment: any;
  unlockedClasses: string[];
  activeClass: string | null;
  getDistanceTo(other: any): number;
  facingDirection: any;
  unlockedSkills: any;
  classes: any[];
  heal(amount: number): void;
  takeDamage(damageInfo: any): number;
  eventManager: any;
  gainXp(amount: number): void;
  activeStatuses: Map<string, any>;
  activeStatusesList: any[];
  globalActiveLoadout?: (string | null)[];
  setSkillCooldown?: (skillId: string, durationMs: number) => void;
  isSkillOnCooldown?: (skillId: string) => boolean;
  getActiveCooldowns?: () => Record<string, SkillCooldownData>;
  executeActiveBrooch?: (broochId: string, mouseCoordinates: { x: number, y: number }) => void;
  executePrimordialSkill?: (mouseCoordinates: { x: number, y: number }) => void;
  equipGlobalActiveBrooch?: (broochId: string, slotIndex: number) => void;
  hasPassiveBrooch?: (broochId: string) => boolean;
  resetDashCooldown?: () => void;
  applyStatus?: (status: any) => void;
  removeStatus?: (statusId: string) => boolean;
}


export type StatusCategory = 'magical' | 'physical' | 'innate';

export interface IStatusEffect {
  id: string;
  duration: number;
  elapsed: number;
  category?: StatusCategory;
  tier?: number;
  apply(target: any): void;
  update(deltaTime: number, target: any): boolean;
  onRemove?(target: any): void;
}

export interface IObjectElement {
  id: number;
  coordinates: { x: number, y: number };
  objectId: string;
  size: { width: number, height: number };
}
