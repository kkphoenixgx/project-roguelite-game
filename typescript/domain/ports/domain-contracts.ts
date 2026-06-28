/** @file Define a fronteira da Arquitetura Hexagonal, contendo os contratos (DTOs e a Porta) que governam a comunicação entre as camadas de Domínio e Adaptação. */

import type { HitboxDebugShape } from "../hitBox/HitBox";
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
}

export interface ClassDTO {
  name: string;
  isUnlocked: boolean;
  isActive: boolean;
}

export interface ActiveStatusDTO {
  id: string;
  description: string;
  remaining: number;
}

/** DTO (Data Transfer Object) que representa o estado imutável do mundo do jogo, usado para transferir informações do domínio para a apresentação sem expor a entidade `World` interna. */
export interface WorldState {
  /** A largura total do mundo do jogo em unidades (pixels). */
  width: number;
  /** A altura total do mundo do jogo em unidades (pixels). */
  height: number;
  /** Identificador do mapa para carregar o cenário desenhado no adaptador (ex: 'vilgem'). */
  mapId: string;
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
  entityTypeId: objectTypeId; // Ex: 'player', 'goblin', 'chest'
  /** Descreve o estado comportamental da entidade (ex: 'idle') para que a apresentação possa selecionar a animação correta. */
  state? : string;
  /** Uma lista opcional de formas de hitbox para depuração visual. */
  hitboxes?: readonly HitboxDebugShape[];

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

  backpack?: any[];
  equipment?: any;
  hasBeard?: boolean;
  activeClass?: string | null;
  unlockedClasses?: string[];
  classes?: ClassDTO[];
  skillTree?: SkillNodeDTO[];
  activeLoadout?: (string | null)[];
  unlockedActiveSkills?: SkillNodeDTO[];
  
  /** Elementos mágicos embutidos na entidade para guiar o Motor de Partículas (O Lego Visual) */
  spellElements?: string[];
  /** Lista de buffs e debuffs ativos atualmente na entidade. */
  activeStatuses?: ActiveStatusDTO[];
  /** Prompt de UI caso o jogador esteja perto de um NPC interativo. */
  interactablePrompt?: { npcId: number; text: string; npcName: string };
  /** Referência visual para desenhar cordas/conexões entre entidades (Canvas 2D) */
  connectedTo?: { x: number, y: number };
}

/** Tipo união para todos os possíveis estados de objetos renderizáveis, permitindo que o sistema seja estendido com outros tipos (ex: partículas) no futuro. */
export type RenderableState = EntityRenderableState; // Por enquanto, só temos entidades

/** @interface IGameDomain Define a "Porta" de entrada para o domínio. A camada de apresentação (GameAdapter) interage com o domínio *exclusivamente* através desta interface, garantindo o desacoplamento. */
export interface IGameDomain {
  /** Aciona a atualização de estado de todas as entidades do domínio a cada tick do game loop. @param deltaTime O tempo, em segundos, desde a última atualização. */
  update(deltaTime: number): void;
  /** Instruí o domínio a carregar um mapa específico (instanciando a classe World correspondente e gerando suas hitboxes). Este é um método assíncrono pois carrega dados de colisão. */
  loadWorld(mapId: string): Promise<void>;
  /** Traduz uma intenção do usuário (capturada pela apresentação) em um comando que o domínio entende. @param command O comando de movimento. */
  handlePlayerInteractions(command: { actions: Array<action> }, mouseLastCoordinates: {x:number,y:number}): void; // eslint-disable-line
  /** Executa um comando de inventário, como equipar ou desequipar um item. */
  manageInventory(action: 'equip' | 'unequip' | 'consume' | 'delete', payload: { index?: number; slot?: string }): void;
  /** Executa um comando relacionado à árvore de habilidades, como trocar de classe selecionada ou comprar um nó. */
  manageSkillTree(action: 'unlock' | 'changeClass' | 'equip', payload: { className?: string; skillId?: string; slotIndex?: number }): void;
  /** Solicita o gasto de um ponto de habilidade em um atributo primário. */
  allocateAttribute(attribute: string): void;
  /** Solicita ao domínio uma "fotografia" do estado atual de todos os objetos visíveis, formatada como DTOs puros para a renderização. @returns Um objeto com o estado do mundo e uma lista de DTOs renderizáveis. */
  getRenderState(): { world: WorldState; renderables: readonly RenderableState[] };
  /** Envia uma mensagem de texto digitada pelo jogador para a Inteligência Artificial processar. */
  sendDialogue(message: string, targetNpcId?: number): void;
}