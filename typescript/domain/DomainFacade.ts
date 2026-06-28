/** @file Implementa a fachada do domínio, o único ponto de entrada para a lógica de negócio do jogo. */
import type { ILogger } from "./ports/ILogger";
import type { IGameDomain, RenderableState, WorldState } from "./ports/domain-contracts";

import Player from "./ObjectModule/Entities/Player/Player";
import ObjectElementManager from "./ObjectModule/ObjectElementManager";
import GameWorld from "./ObjectModule/GameWorld";
import VilgemWorld from "./ObjectModule/Maps/VilgemWorld";
import Attributes from "./ObjectModule/Entities/Attributes";
import type { action } from "./eventDispacher/actions.type";
import ActionManager from "./eventDispacher/ActionManager";
import type { IEventManager } from "./eventDispacher/IGameEvents";
import type { ICollisionService } from "./ports/ICollisionService";

/** Define a estrutura de dados para a configuração inicial do domínio. */
interface DomainConfig {
  /** Configurações específicas do jogador. */
  player: { id: number; level: number; initialPos: { x: number; y: number } };
}

/** @class DomainFacade @implements {IGameDomain} Atua como o guardião e orquestrador da camada de domínio, implementando a porta `IGameDomain` para proteger a integridade das entidades internas e expor apenas operações de alto nível. */
export default class DomainFacade implements IGameDomain {
  private world!: GameWorld; /** @private A instância do `GameWorld` que representa o ambiente do jogo. */
  private player!: Player; /** @private A instância do `Player` que representa o jogador. */
  private objectManager!: ObjectElementManager; /** @private O gerenciador de todas as outras entidades dinâmicas (inimigos, itens, etc.). */
  private config: DomainConfig; /** @private A configuração inicial do domínio. */
  private logger: ILogger; /** @private A instância do logger, injetada via construtor. */

  private actionManager!: ActionManager;
  private cachedRenderState = {
    world: { width: 0, height: 0, mapId: 'vilgem' },
    renderables: [] as any[]
  };
  private cachedPlayerState: any = null;
  private viewedClass: string | null = null;

  /** @constructor @param config O objeto de configuração com os dados iniciais para a criação das entidades do jogo. @param logger Uma instância de um logger que implementa a interface `ILogger`. @param collisionTileService Uma instância de um serviço para carregar dados de colisão de tiles do mapa. */
  constructor(
    config: DomainConfig, 
    logger: ILogger, 
    private eventManager: IEventManager, 
    private collisionService: ICollisionService
  ) {
    this.config = config;
    this.logger = logger;
    this.logger.log('init', 'DomainFacade instantiated.');

    this.objectManager = new ObjectElementManager(this.eventManager, this.collisionService);
  }


  /** Fase de Update (Lógica): Avança o estado de todas as entidades do domínio. Chamado a cada frame pelo Adapter. @param deltaTime O tempo em segundos decorrido desde o último frame. */
  public update(deltaTime: number): void {
    // Limita o deltaTime a um valor máximo razoável (ex: 1/30 de segundo)
    // para evitar "saltos" de física se o jogo engasgar.
    const clampedDeltaTime = Math.min(deltaTime, 1 / 30);

    this.logger.log('update-cycles', 'Update cycle started (deltaTime:)', clampedDeltaTime);

    this.player.update(clampedDeltaTime);
    
    // Regeneração passiva do Jogador (Apenas se estiver vivo)
    const attrs = this.player.attributes;
    if (attrs.hp > 0 && attrs.hp < attrs.maxHp) {
        attrs.hp = Math.min(attrs.maxHp, attrs.hp + (attrs.constitution * 0.1) * clampedDeltaTime);
    }
    if (attrs.mana < attrs.maxMana) {
        attrs.mana = Math.min(attrs.maxMana, attrs.mana + (attrs.wisdom * 0.5) * clampedDeltaTime);
    }

    this.objectManager.updateAll(clampedDeltaTime, this.player);
  }

  /** Fase de Inicialização: Cria as instâncias das entidades de domínio e orquestra a montagem do cenário. */
  public async loadWorld(mapId: string, collisionData?: any[]): Promise<void> {
    this.logger.log('domain', `Loading world: ${mapId}`);
    
    if (mapId === 'vilgem') {
        this.world = new VilgemWorld(this.eventManager);
    } else {
        // Fallback genérico caso viaje para mapas sem classe registrada ainda
        this.world = new VilgemWorld(this.eventManager); 
    }
    
    // Aguarda a geração do mundo (agora async)
    await this.world.generate(collisionData);
    
    this.objectManager.setWorldBounds(this.world.width, this.world.height);
    
    this.player = new Player(
      this.config.player.id,
      this.config.player.initialPos,
      new Attributes(8, this.config.player.level, 10, 10, 10, 10, 10, 10),
      this.eventManager
    );
    this.actionManager = new ActionManager(this.player, this.logger, this.eventManager);
    this.logger.log('domain', 'Player entity created:', this.player);
  }

  /** Interface de comunicação que passa a responsabilidade para o domínio. @param command O objeto de comando vindo da camada de apresentação. @param deltaTime O tempo desde o último frame, usado para calcular o movimento. */
  public handlePlayerInteractions(command: { actions: Array<action> }, mouseLastCoordinates: {x:number,y:number}): void {
    this.logger.log('actions', 'Handling actions in domain:', command);
    this.actionManager.checkEvent(command.actions, mouseLastCoordinates)
  }

  public manageInventory(action: 'equip' | 'unequip' | 'consume' | 'delete', payload: { index?: number; slot?: string }): void {
    if (action === 'equip' && payload.index !== undefined) {
      this.player.equipItem(payload.index);
      
      // Game Feel (UX): Auto-equipa a classe associada à arma para poupar cliques na UI!
      const equipment = (this.player as any).equipment;
      const handItem = equipment?.mainHand || equipment?.hand || equipment?.weapon; // O slot real no Player.ts é 'mainHand'!
      
      this.logger.log('actions', `[DomainFacade] Item equipado. Arma atual: ${handItem?.name} | Desbloqueia: ${handItem?.unlocksClass}`);

      if (handItem && 'unlocksClass' in handItem && handItem.unlocksClass) {
          if (!this.player.unlockedClasses.includes(handItem.unlocksClass)) {
              this.player.unlockedClasses.push(handItem.unlocksClass);
          }
          this.player.setActiveClass(handItem.unlocksClass);
          this.viewedClass = null; // Reseta a classe visualizada para acompanhar a arma atual
          this.logger.log('actions', `[DomainFacade] Forçando classe do jogador para: ${handItem.unlocksClass}`);
                  this.eventManager.dispatch('classChanged', { oldClassInstance: null, newClassInstance: null });
      }
    }
    if (action === 'unequip' && payload.slot !== undefined) {
      this.player.unequipItem(payload.slot as string);
    }
    if (action === 'consume' && payload.index !== undefined) {
      this.player.consumeItem(payload.index);
    }
    if (action === 'delete' && payload.index !== undefined) {
      this.player.deleteItem(payload.index);
    }
  }

  public manageSkillTree(action: 'unlock' | 'changeClass' | 'equip', payload: { className?: string; skillId?: string; slotIndex?: number }): void {
    if (action === 'changeClass' && payload.className) {
       // Apenas muda a classe que está sendo visualizada na UI, NÃO a classe ativa (armada) do jogador!
       this.viewedClass = payload.className as string;
       this.logger.log('actions', `[DomainFacade] UI está agora visualizando a árvore da classe: ${payload.className}`);
       this.eventManager.dispatch('classChanged', { oldClassInstance: null, newClassInstance: null }); // Atualiza UI
    } else if (action === 'unlock' && payload.skillId) {
       // Procura a skill em qualquer classe (já que podemos comprar de outras árvores)
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
           if (activeClassInstance) break;
       }
       
       let requiredLevel = 1;
       
       if (activeClassInstance) {
           const skillsMap = (activeClassInstance as any).skillsByLevel as Map<number, any>;
           if (skillsMap) {
               for (const [lvl, skill] of skillsMap.entries()) {
                   if (skill.id === payload.skillId) {
                       requiredLevel = lvl;
                       break;
                   }
               }
           }
       }
       
       if (this.player.attributes.level >= requiredLevel) {
           if (this.player.attributes.availablePoints > 0) {
               (this.player.attributes as any)._availablePoints--; // Gasta o ponto de habilidade!
               this.player.unlockSkill(payload.skillId as string);
           } else {
               this.logger.log('error', `Acesso negado: Pontos de habilidade insuficientes para a skill ${payload.skillId}.`);
           }
       } else {
           this.logger.log('error', `Acesso negado: Nível insuficiente para destravar a skill. (Nível atual: ${this.player.attributes.level}, Necessário: ${requiredLevel})`);
       }
    } else if (action === 'equip' && payload.skillId && payload.slotIndex !== undefined) {
       this.player.equipSkillInLoadout(payload.skillId, payload.slotIndex);
    }
  }

  public allocateAttribute(attribute: string): void {
    this.player.allocateAttribute(attribute as any);
  }

  public sendDialogue(message: string, targetNpcId?: number): void {
    this.logger.log('input', `Player says: "${message}" to NPC ${targetNpcId}`);
    if (targetNpcId) {
        const npc = this.objectManager.getElementById(targetNpcId) as any;
        if (npc && typeof npc.receiveMessage === 'function') {
            npc.receiveMessage(message);
        }
    }
  }

  /** Fase de Desenho (Coleta de Dados): Constrói e retorna uma representação em DTOs do estado atual do jogo para a camada de renderização. @throws {Error} Se o mundo não foi inicializado. @returns Um objeto com o estado do mundo e uma lista de DTOs renderizáveis. */
  public getRenderState(): { world: WorldState; renderables: readonly RenderableState[] } {
    this.logger.log('sync', 'DomainFacade getting render state...');
    if (!this.world) throw new Error("O mundo do domínio não foi inicializado. Chame loadWorld() antes de getRenderState().");

    this.cachedRenderState.world.width = this.world.width;
    this.cachedRenderState.world.height = this.world.height;
    this.cachedRenderState.world.mapId = this.world.mapId;

    if (!this.cachedPlayerState) {
      this.cachedPlayerState = {
        id: this.player.id,
        entityTypeId: this.player.objectId,
        coordinates: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
        attributes: {},
        equipment: {}
      };
    }

    const ps = this.cachedPlayerState;
    ps.coordinates.x = this.player.coordinates.x;
    ps.coordinates.y = this.player.coordinates.y;
    ps.size.width = this.player.size.width;
    ps.size.height = this.player.size.height;
    ps.state = this.player.state;
    ps.rotation = this.player.rotation;
    ps.hasBeard = this.player.hasBeard;
    ps.facingDirection = this.player.facingDirection;
    
    ps.level = this.player.attributes.level;
    ps.currentXp = this.player.attributes.currentXp;
    ps.xpToNextLevel = this.player.attributes.xpToNextLevel;
    ps.hp = this.player.attributes.hp;
    ps.maxHp = this.player.attributes.maxHp;
    ps.mana = this.player.attributes.mana;
    ps.maxMana = this.player.attributes.maxMana;
    ps.coins = this.player.coins;
    
    // Object Pooling para Hitboxes do Player
    if (!ps.hitboxes) ps.hitboxes = [];
    const playerHitboxes = this.player.hitboxes || [];
    for (let i = 0; i < playerHitboxes.length; i++) {
        ps.hitboxes[i] = playerHitboxes[i]!.getDebugShape();
    }
    ps.hitboxes.length = playerHitboxes.length;

    // Object Pooling para Status Ativos (Sem instanciar novos objetos por frame)
    if (!ps.activeStatuses) ps.activeStatuses = [];
    let statusIndex = 0;
    const statusesList = this.player.activeStatusesList || [];
    for (let i = 0; i < statusesList.length; i++) {
        const s = statusesList[i]!;
        if (!ps.activeStatuses[statusIndex]) ps.activeStatuses[statusIndex] = { id: '', description: '', remaining: 0 };
        const uiStatus = ps.activeStatuses[statusIndex];
        uiStatus.id = s.id;
        uiStatus.description = s.description;
        uiStatus.remaining = Math.max(0, s.duration - s.elapsed);
        statusIndex++;
    }
    ps.activeStatuses.length = statusIndex;
    
    ps.attributes.strength = this.player.attributes.strength;
    ps.attributes.constitution = this.player.attributes.constitution;
    ps.attributes.dexterity = this.player.attributes.dexterity;
    ps.attributes.intelligence = this.player.attributes.intelligence;
    ps.attributes.wisdom = this.player.attributes.wisdom;
    ps.attributes.charisma = this.player.attributes.charisma;
    ps.attributes.availablePoints = this.player.attributes.availablePoints;

    ps.backpack = this.player.backpack;
    ps.equipment = this.player.equipment;

    ps.activeClass = this.player.activeClass;
    ps.unlockedClasses = this.player.unlockedClasses;
    
    // Object Pooling para Classes
    if (!ps.classes) ps.classes = [];
    for (let i = 0; i < this.player.classes.length; i++) {
        const c = this.player.classes[i]!;
        if (!ps.classes[i]) ps.classes[i] = { name: '', isUnlocked: false, isActive: false };
        const uiClass = ps.classes[i];
        uiClass.name = c.name;
        uiClass.isUnlocked = this.player.unlockedClasses.includes(c.name);
        uiClass.isActive = this.player.activeClass === c.name;
    }
    ps.classes.length = this.player.classes.length;
    
    // Mapeia as skills da Classe que a UI está VENDO para a interface da Árvore
    const classToView = this.viewedClass || this.player.activeClass;
    let viewedClassInstance = undefined;
    for (let i = 0; i < this.player.classes.length; i++) {
        if (this.player.classes[i]!.name === classToView) {
            viewedClassInstance = this.player.classes[i];
            break;
        }
    }
    
    // Atualiza a flag visual de qual classe está ativa na aba "Classes" da árvore
    for (const c of ps.classes) {
        c.isActive = c.name === classToView;
    }

    if (!ps.skillTree) ps.skillTree = [];
    if (viewedClassInstance) {
        const skillsMap = (viewedClassInstance as any).skillsByLevel as Map<number, any>;
        
        let stIndex = 0;
        for (let s = 0; s < viewedClassInstance.allSkills.length; s++) {
            const skill = viewedClassInstance.allSkills[s]!;
            
            // Find required level for this skill
            let requiredLevel = 1;
            for (const [lvl, sk] of skillsMap.entries()) {
                if (sk.id === skill.id) {
                    requiredLevel = lvl;
                    break;
                }
            }
            
            if (!ps.skillTree[stIndex]) ps.skillTree[stIndex] = { id: '', name: '', description: '', type: 'active', tier: 1, unlocked: false, canUnlock: false };
            const uiNode = ps.skillTree[stIndex];
            
            uiNode.id = skill.id;
            uiNode.name = skill.name;
            uiNode.description = skill.description || '';
            uiNode.type = skill.type;
            uiNode.tier = skill.tier || 1;
            uiNode.unlocked = this.player.unlockedSkills.has(skill.id);
            
            const hasPrereq = !skill.requiredSkillId || this.player.unlockedSkills.has(skill.requiredSkillId);
            uiNode.canUnlock = !uiNode.unlocked && this.player.attributes.level >= requiredLevel && hasPrereq;
            
            stIndex++;
        }
        ps.skillTree.length = stIndex;
    } else {
        ps.skillTree.length = 0;
    }

    // Preenche o Loadout Ativo e a "Mochila de Magias" para o Deck Building
    if (!ps.activeLoadout) ps.activeLoadout = [];
    for (let i = 0; i < this.player.activeLoadout.length; i++) {
        ps.activeLoadout[i] = this.player.activeLoadout[i];
    }
    ps.activeLoadout.length = this.player.activeLoadout.length;

    if (!ps.unlockedActiveSkills) ps.unlockedActiveSkills = [];
    let activeSkillIndex = 0;
    for (let c = 0; c < this.player.classes.length; c++) {
        const cls = this.player.classes[c]!;
        for (let s = 0; s < cls.allSkills.length; s++) {
            const skill = cls.allSkills[s]!;
            if (skill.type === 'active' && this.player.unlockedSkills.has(skill.id)) {
                if (!ps.unlockedActiveSkills[activeSkillIndex]) ps.unlockedActiveSkills[activeSkillIndex] = {} as any;
                const uiSkill = ps.unlockedActiveSkills[activeSkillIndex];
                uiSkill.id = skill.id;
                uiSkill.name = skill.name;
                uiSkill.description = skill.description || '';
                uiSkill.type = skill.type;
                uiSkill.tier = skill.tier || 1;
                uiSkill.unlocked = true;
                uiSkill.canUnlock = false;
                activeSkillIndex++;
            }
        }
    }
    ps.unlockedActiveSkills.length = activeSkillIndex;

    const otherStates = this.objectManager.getAllRenderableStates();
    
    // Lógica de Proximidade (Interação com NPCs)
    let nearestDist = 50; // Range máximo para interação (em pixels)
    let nearestNpc = null;
    const px = ps.coordinates.x + ps.size.width / 2;
    const py = ps.coordinates.y + ps.size.height / 2;

    for (let i = 0; i < otherStates.length; i++) {
        const st = otherStates[i]!;
        if (st.entityTypeId === 'molor' || st.entityTypeId === 'interactiveNpc') {
            const ex = st.coordinates.x + st.size.width / 2;
            const ey = st.coordinates.y + st.size.height / 2;
            const dist = Math.hypot(px - ex, py - ey);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestNpc = st;
            }
        }
    }

    if (nearestNpc) {
        const npcName = nearestNpc.entityTypeId === 'molor' ? 'Diretor Molor' : 'NPC';
        if (!ps.interactablePrompt) ps.interactablePrompt = { npcId: 0, text: '', npcName: '' };
        ps.interactablePrompt.npcId = nearestNpc.id;
        ps.interactablePrompt.text = '[Z] Falar';
        ps.interactablePrompt.npcName = npcName;
    } else {
        ps.interactablePrompt = undefined;
    }
    
    this.cachedRenderState.renderables.length = otherStates.length + 1;
    this.cachedRenderState.renderables[0] = ps;
    for (let i = 0; i < otherStates.length; i++) {
        this.cachedRenderState.renderables[i + 1] = otherStates[i];
    }
    return this.cachedRenderState;
  }

}
