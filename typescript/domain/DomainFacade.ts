/** @file Implementa a fachada do domínio, o único ponto de entrada para a lógica de negócio do jogo. */
import type { ILogger } from "./ports/ILogger";
import { type ITelemetryPort, NullTelemetryPort } from "./ports/ITelemetryPort";
import type { IGameDomain, RenderableState, WorldState, CustomLLMPresetDTO, ChunkCoordDTO, WorldBoundsDTO } from "./ports/domain-contracts";
import type { PlayerSaveState, ISaveRepository } from "./ports/ISaveRepository";
import { type ILLMConfigPort, NullLLMConfigPort } from "./ports/ILLMConfigPort";
import { AutoSaveService } from "./services/AutoSaveService";

import Player from "./ObjectModule/Entities/Player/Player";
import ObjectElementManager from "./ObjectModule/ObjectElementManager";
import GameWorld from "./ObjectModule/GameWorld";
import VilgemWorld from "./ObjectModule/Maps/VilgemWorld";
import AlunWorld from "./ObjectModule/Maps/AlunWorld";
import CemiiWorld from "./ObjectModule/Maps/CemiiWorld";
import { IntermapRegistry } from "./ObjectModule/Maps/IntermapConfig";
import IntermapWorld from "./ObjectModule/Maps/IntermapWorld";
import Attributes from "./ObjectModule/Entities/Attributes";
import BroochRegistry from "./ObjectModule/Entities/Player/components/BroochRegistry";
import type { action } from "./eventDispacher/actions.type";
import ActionManager from "./eventDispacher/ActionManager";
import type { IEventManager } from "./eventDispacher/IGameEvents";
import type { ICollisionService } from "./ports/ICollisionService";
import DialogueGateway from "./DialogueGateway";
import InventoryGateway from "./facadeComponents/InventoryGateway";
import SkillTreeGateway from "./facadeComponents/SkillTreeGateway";
import DomainRenderState from "./facadeComponents/DomainRenderState";
import DomainMCPAdapter from "./facadeComponents/DomainMCPAdapter";
import MetaProgressionManager from "./facadeComponents/MetaProgressionManager";
import ToolActionGateway from "./facadeComponents/ToolActionGateway";
import { generateRandomLocalRewards } from "./facadeComponents/LocalRewardGenerator";
import { TauriPanteaoBridge } from "./facadeComponents/TauriPanteaoBridge";

/** Define a estrutura de dados para a configuração inicial do domínio. */
interface DomainConfig {
  /** Configurações específicas do jogador. */
  player: { id: number; level: number; initialPos: { x: number; y: number } };
}

/** @class DomainFacade @implements {IGameDomain} Atua como o guardião e orquestrador da camada de domínio, implementando a porta `IGameDomain` para proteger a integridade das entidades internas e expor apenas operações de alto nível. */
export default class DomainFacade implements IGameDomain {
  private world!: GameWorld; /** @private A instância do `GameWorld` que representa o ambiente do jogo. */
  public player!: Player; /** A instância do `Player` que representa o jogador. */
  private objectManager!: ObjectElementManager; /** @private O gerenciador de todas as outras entidades dinâmicas (inimigos, itens, etc.). */
  private dialogueGateway!: DialogueGateway;
  private config: DomainConfig; /** @private A configuração inicial do domínio. */
  private logger: ILogger; /** @private A instância do logger, injetada via construtor. */

  private actionManager!: ActionManager;
  private inventoryGateway!: InventoryGateway;
  private skillTreeGateway!: SkillTreeGateway;
  private toolActionGateway!: ToolActionGateway;
  private renderStateBuilder!: DomainRenderState;
  private mcpAdapter!: DomainMCPAdapter;
  public metaProgressionManager!: MetaProgressionManager;
  public autoSaveService!: AutoSaveService;
  public viewedClass: string | null = null;
  /** Rastreia as coordenadas seguras de retorno por mapa de origem quando o jogador entra em um InnerMap compartilhado */
  private lastEnteredPortalReturnByMap: Map<string, { x: number; y: number }> = new Map();

  constructor(
    config: DomainConfig, 
    logger: ILogger, 
    private eventManager: IEventManager, 
    private collisionService: ICollisionService,
    private telemetryPort: ITelemetryPort = NullTelemetryPort,
    private llmConfigPort: ILLMConfigPort = NullLLMConfigPort,
    private saveRepository: ISaveRepository = {
      saveProgress: async () => {},
      loadProgress: async () => null
    }
  ) {
    this.config = config;
    this.logger = logger;
    this.logger.log('init', 'DomainFacade instantiated.');

    this.objectManager = new ObjectElementManager(this.eventManager, this.collisionService, this.telemetryPort);
    this.dialogueGateway = new DialogueGateway(this.objectManager, this.logger);
    this.renderStateBuilder = new DomainRenderState(this.logger, () => this.viewedClass);
    this.metaProgressionManager = new MetaProgressionManager(this.logger, this.eventManager);
    
    this.initPlayer();

    this.eventManager.on('featAchieved', (payload) => {
        this.metaProgressionManager.recordFeat(payload.name, payload.essenceReward);
    });

    this.eventManager.on('playerDied', () => {
        if (this.player) {
            this.metaProgressionManager.calculateAndClaimRunReward(this.player.attributes.level);
            this.resetRunState();
        }
    });

    this.autoSaveService = new AutoSaveService(
      this.eventManager,
      this.saveRepository,
      this.logger,
      () => {
        if (!this.player) return null;
        const playerState = this.player.serializeState();
        if (!playerState) return null;
        return {
          playerState,
          metaProgressionState: this.metaProgressionManager.getGlobalState(),
          mapId: (this.world as any)?.mapId || 'vilgem',
          characterName: 'Aventureiro',
          world: (this.world as any)?.mapId || 'vilgem',
          globalMetaSummary: this.metaProgressionManager.getAggregatedMetaStats()
        };
      }
    );

    this.eventManager.on('mapTransitionRequested', (payload: any) => {
        const currentWorldId = (this.world as any)?.mapId || 'vilgem';
        if (this.player && !IntermapRegistry.has(currentWorldId) && IntermapRegistry.has(payload.targetMapId)) {
          //? Quando o jogador entra em um InnerMap a partir de um mundo raiz (ex: Vilgem -> interior_black_default),
          //? registra a coordenada segura em frente à porta usada para que a saída do InnerMap
          //? devolva o jogador na frente da mesma casa (a menos que haja destino customizado).
          const entities = this.objectManager.getEntities();
          let entrancePortal: any = null;
          let minDist = Infinity;
          for (const el of entities) {
            if ((el.objectId === 'portalLink' || el.objectId === 'portalLinkRequest') && (el as any).targetMapId === payload.targetMapId) {
              const d = Math.hypot(el.coordinates.x - this.player.coordinates.x, el.coordinates.y - this.player.coordinates.y);
              if (d < minDist) {
                minDist = d;
                entrancePortal = el;
              }
            }
          }
          if (entrancePortal) {
            const returnX = Math.round(entrancePortal.coordinates.x);
            const returnY = Math.round(entrancePortal.coordinates.y + Math.max(48, (entrancePortal.size?.height ?? 48) + 12));
            this.lastEnteredPortalReturnByMap.set(currentWorldId, { x: returnX, y: returnY });
          }
        }

        //? Permite que adaptadores externos (ex: GameAdapter) orquestrem a transição com collisionData e assets.
        //? Se após um microtask nenhuma transição foi iniciada pelo adaptador, o domínio executa o fallback autônomo (ex: em testes headless).
        queueMicrotask(() => {
          if (payload?.handledByAdapter) {
            return;
          }
          if (!this.activeTransitionPromise) {
            this.transitionWorld(payload.targetMapId, payload.targetCoordinates).catch(err => {
              this.logger.log('error', 'Falha na transição de mapa:', err);
            });
          }
        });
    });

    TauriPanteaoBridge.setupIpcListeners(this.logger, this.eventManager, this.objectManager, (p) => this.updateLLMPreset(p), this.config);
  }

  /** Fase de Update (Lógica): Avança o estado de todas as entidades do domínio. Chamado a cada frame pelo Adapter. @param deltaTime O tempo em segundos decorrido desde o último frame. */
  public update(deltaTime: number): void {
    //? Limita o deltaTime a no máximo 1/30s para evitar saltos bruscos ou tunnelling de física se houver engasgo.
    const clampedDeltaTime = Math.min(deltaTime, 1 / 30);

    this.logger.log('update-cycles', 'Update cycle started (deltaTime:)', clampedDeltaTime);

    const tPlayer = typeof performance !== 'undefined' ? performance.now() : 0;
    this.player.update(clampedDeltaTime);
    
    const attrs = this.player.attributes;
    if (attrs.hp > 0 && attrs.hp < attrs.maxHp) {
        attrs.hp = Math.min(attrs.maxHp, attrs.hp + (attrs.constitution * 0.1) * clampedDeltaTime);
    }
    if (attrs.mana < attrs.maxMana) {
        attrs.mana = Math.min(attrs.maxMana, attrs.mana + (attrs.wisdom * 0.5) * clampedDeltaTime);
    }
    if (tPlayer > 0) {
        this.telemetryPort.recordFileTiming?.('Player.ts', 'Domain / Player', performance.now() - tPlayer, 1);
    }

    const tObj = typeof performance !== 'undefined' ? performance.now() : 0;
    this.objectManager.updateAll(clampedDeltaTime, this.player);
    if (tObj > 0) {
        this.telemetryPort.recordFileTiming?.('ObjectElementManager.ts', 'Domain / ObjectModule', performance.now() - tObj, 1);
    }
  }

  /** Fase de Inicialização: Cria as instâncias das entidades de domínio e orquestra a montagem do cenário. */
  private warmUpLLM(): void {
      this.logger.log('domain', 'Iniciando warm-up do modelo qwen2.5:0.5b...');
      fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              model: "qwen2.5:0.5b",
              prompt: "A",
              stream: false,
              options: { num_predict: 1 }
          })
      }).then(() => {
          this.logger.log('domain', 'Warm-up do LLM concluído com sucesso!');
      }).catch(err => {
          this.logger.log('error', `Falha no warm-up do LLM: ${err}`);
      });
  }

  private createWorldInstance(mapId: string): GameWorld {
    if (mapId === 'vilgem') {
      return new VilgemWorld(this.eventManager);
    }
    if (mapId === 'alun') {
      return new AlunWorld(this.eventManager);
    }
    if (mapId === 'cemii') {
      return new CemiiWorld(this.eventManager);
    }
    if (IntermapRegistry.has(mapId)) {
      const def = IntermapRegistry.get(mapId)!;
      return new IntermapWorld(def, this.eventManager);
    }
    //? Fallback genérico caso viaje para mapas sem classe concreta registrada.
    return new VilgemWorld(this.eventManager);
  }

  private resolveInitialSpawn(mapId: string, customPos?: { x: number; y: number }): { x: number; y: number } {
    if (customPos) {
      if (mapId === 'vilgem' && ((customPos.x === 1536 && customPos.y === 1615) || (customPos.x === 0 && customPos.y === 0))) {
        return { x: 512, y: 591 };
      }
      //? Se customPos for o initialPos global de Vilgem e estivermos carregando outro mundo com defaultSpawn próprio, prioriza o defaultSpawn do mundo.
      if (mapId !== 'vilgem' && this.world?.defaultSpawn && customPos === this.config?.player?.initialPos) {
        return { ...this.world.defaultSpawn };
      }
      return { x: customPos.x, y: customPos.y };
    }
    if (this.world?.defaultSpawn) {
      return { ...this.world.defaultSpawn };
    }
    return mapId === 'vilgem' ? { x: 512, y: 591 } : { x: 0, y: 0 };
  }

  private initPlayer(): void {
    const playerId = this.config?.player?.id ?? 1;
    const initialPos = this.resolveInitialSpawn(this.world?.mapId || 'vilgem', this.config?.player?.initialPos);
    const level = this.config?.player?.level ?? 1;

    this.player = new Player(
      playerId,
      { x: initialPos.x, y: initialPos.y },
      new Attributes(8, level, 10, 10, 10, 10, 10, 10),
      this.eventManager
    );
    this.actionManager = new ActionManager(this.player, this.logger, this.eventManager);
    this.inventoryGateway = new InventoryGateway(this.player, this.logger, this.eventManager, (cls) => { this.viewedClass = cls; });
    this.skillTreeGateway = new SkillTreeGateway(this.player, this.logger, this.eventManager, (cls) => { this.viewedClass = cls; });
    this.toolActionGateway = new ToolActionGateway(this.player, this.logger, this.eventManager);
    this.mcpAdapter = new DomainMCPAdapter(this.player, this.objectManager, this.eventManager);
    this.metaProgressionManager.applyGlobalBonuses(this.player.attributes);
    this.logger.log('domain', 'Player entity created/reinitialized:', this.player);
  }

  public async loadWorld(mapId: string, collisionData?: any[]): Promise<void> {
    this.logger.log('domain', `Loading world: ${mapId}`);
    this.warmUpLLM();
    
    this.world = this.createWorldInstance(mapId);

    if (this.player && this.player.collectedWorldItems) {
      this.objectManager.setCollectedWorldItems(this.player.collectedWorldItems);
    }
    
    await this.world.generate(collisionData);
    
    this.objectManager.setWorldBounds(this.world.bounds);
    this.objectManager.getChunkManager().initForWorld(this.world);
    
    if (!this.player) {
      this.initPlayer();
    } else {
      const initPos = this.resolveInitialSpawn(mapId, this.config?.player?.initialPos);
      this.player.coordinates = { x: initPos.x, y: initPos.y };
      if (this.player.hitboxes) {
        for (let i = 0; i < this.player.hitboxes.length; i++) {
          this.player.hitboxes[i]?.update(
            { x: this.player.coordinates.x + this.player.size.width / 2, y: this.player.coordinates.y + this.player.size.height / 2 },
            this.player.rotation
          );
        }
      }
    }
    this.objectManager.getChunkManager().updatePlayerPosition(this.player.coordinates.x, this.player.coordinates.y);
  }

  private activeTransitionPromise: Promise<void> | null = null;

  public async transitionWorld(targetMapId: string, spawnCoords?: { x: number; y: number }, collisionData?: any[]): Promise<void> {
    if (this.activeTransitionPromise) {
      return this.activeTransitionPromise;
    }

    this.activeTransitionPromise = (async () => {
      this.logger.log('domain', `Transitioning to world: ${targetMapId}`);

      //? 1. Limpa todas as entidades antigas preservando o jogador (ver ARCHITECTURE.md 3.16)
      this.objectManager.clearWorldElements(true);

      //? 2. Sincroniza os itens coletados pelo jogador antes de gerar o novo mundo
      if (this.player && this.player.collectedWorldItems) {
        this.objectManager.setCollectedWorldItems(this.player.collectedWorldItems);
      }

      //? 3. Instancia o novo mundo
      this.world = this.createWorldInstance(targetMapId);

      //? 4. Atualiza os limites do mundo e reinicia o gerenciador de chunks
      this.objectManager.setWorldBounds(this.world.bounds);
      this.objectManager.getChunkManager().initForWorld(this.world);

      //? 5. Reposiciona o jogador no ponto de spawn especificado ou default do mundo antes de gerar entidades
      let targetX = 0;
      let targetY = 0;

      const recordedReturn = this.lastEnteredPortalReturnByMap.get(targetMapId);

      if (spawnCoords !== undefined && spawnCoords !== null) {
        const isDefaultSharedReturn =
          targetMapId === 'vilgem' &&
          ((spawnCoords.x === 700 && spawnCoords.y === 450) || (spawnCoords.x === 1536 && spawnCoords.y === 1615) || (spawnCoords.x === -324 && spawnCoords.y === -574) || (spawnCoords.x === 512 && spawnCoords.y === 591));

        if (isDefaultSharedReturn && recordedReturn) {
          targetX = recordedReturn.x;
          targetY = recordedReturn.y;
          this.lastEnteredPortalReturnByMap.delete(targetMapId);
        } else {
          const resolved = this.resolveInitialSpawn(targetMapId, spawnCoords);
          targetX = resolved.x;
          targetY = resolved.y;
          this.lastEnteredPortalReturnByMap.delete(targetMapId);
        }
      } else if (recordedReturn) {
        targetX = recordedReturn.x;
        targetY = recordedReturn.y;
        this.lastEnteredPortalReturnByMap.delete(targetMapId);
      } else if (IntermapRegistry.has(targetMapId)) {
        const def = IntermapRegistry.get(targetMapId)!;
        if (def.defaultSpawn) {
          targetX = def.defaultSpawn.x;
          targetY = def.defaultSpawn.y;
        }
      } else {
        const initPos = this.resolveInitialSpawn(targetMapId, this.config?.player?.initialPos);
        targetX = initPos.x;
        targetY = initPos.y;
      }

      if (this.player) {
        this.player.coordinates.x = targetX;
        this.player.coordinates.y = targetY;
        this.objectManager.getChunkManager().updatePlayerPosition(targetX, targetY);
        if (this.player.hitboxes) {
          for (let i = 0; i < this.player.hitboxes.length; i++) {
            this.player.hitboxes[i]?.update(
              { x: targetX + this.player.size.width / 2, y: targetY + this.player.size.height / 2 },
              this.player.rotation
            );
          }
        }
      }

      //? 6. Gera os elementos do novo mundo
      await this.world.generate(collisionData);

      //? 7. Notifica os adaptadores sobre a conclusão da transição
      this.eventManager.dispatch('mapTransitionCompleted', {
        mapId: targetMapId,
        coordinates: { x: targetX, y: targetY }
      });
    })().finally(() => {
      this.activeTransitionPromise = null;
    });

    return this.activeTransitionPromise;
  }

  /** Interface de comunicação que passa a responsabilidade para o domínio. @param command O objeto de comando vindo da camada de apresentação. @param deltaTime O tempo desde o último frame, usado para calcular o movimento. */
  public handlePlayerInteractions(command: { actions: Array<action> }, mouseLastCoordinates: {x:number,y:number}): void {
    this.logger.log('actions', 'Handling actions in domain:', command);
    this.actionManager.checkEvent(command.actions, mouseLastCoordinates)
  }

  //? [ARCH] Os métodos manageInventory, manageSkillTree e allocateAttribute foram delegados a gateways e eventos semânticos no EventBus para evitar o antipattern God Class (ver ARCHITECTURE.md 3.18).

  public sendDialogue(message: string, targetNpcId?: number): void {
    this.dialogueGateway.sendDialogue(message, targetNpcId);
  }

  public notifyPauseState(isPaused: boolean): void {
      if ((window as any).__TAURI_INTERNALS__) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
              const payload = isPaused ? 'game_paused(true)' : '~game_paused(true)';
              invoke('panteao_send', { agent: 'broadcast', ilf: 'tell', content: payload }).catch(err => {
                  this.logger.log('error', 'Falha ao notificar pausa ao Panteão:', err);
              });
          }).catch(err => {
              this.logger.log('error', 'Falha ao carregar Tauri API para notificar pausa:', err);
          });
      }
  }

  /**
   * Atualiza as configurações de LLM/IA no Domínio e propaga para todos os NPCs cognitivos
   * de forma desacoplada via EventBus e IPC do Panteão.
   */
  public updateLLMPreset(preset: CustomLLMPresetDTO): void {
      this.logger.log('domain', 'Aplicando novo preset de LLM no Domínio:', preset);

      (this.config as any).activeLlmModel = preset.llm_model;
      (this.config as any).llmPreset = preset;

      this.eventManager.dispatch('llmPresetChanged', { preset });

      this.llmConfigPort.applyPreset(preset).catch((err: any) => {
          this.logger.log('error', 'Falha ao aplicar preset na porta ILLMConfigPort:', err);
      });

      const npcs = this.objectManager.getEntities().filter(e => (e as any).agentName != null);
      npcs.forEach(npc => {
          const agentName = (npc as any).agentName;
          if (agentName) {
              this.llmConfigPort.notifyAgent(agentName, preset).catch((e: any) => {
                  this.logger.log('error', `Falha ao atualizar agente ${agentName}:`, e);
              });
          }
      });
  }

  /** Fase de Desenho (Coleta de Dados): Constrói e retorna uma representação em DTOs do estado atual do jogo para a camada de renderização. @throws {Error} Se o mundo não foi inicializado. @returns Um objeto com o estado do mundo e uma lista de DTOs renderizáveis. */
  public getRenderState(): { world: WorldState; renderables: readonly RenderableState[] } {
    return this.renderStateBuilder.getRenderState(this.world, this.player, this.objectManager);
  }

  public getAvailableWorlds(): { id: string, name: string, cx: number, cy: number, scale: number, path: string }[] {
    return [
        { id: 'cemii', name: 'Cemii', cx: 150, cy: 300, scale: 1.0, path: 'M 100 200 L 150 200 L 200 250 L 200 350 L 150 400 L 100 350 Z' },
        { id: 'vilgem', name: 'Vilgem', cx: 400, cy: 320, scale: 1.0, path: 'M 300 220 L 450 220 L 500 280 L 500 400 L 400 450 L 300 400 Z' },
        { id: 'alun', name: 'Alun', cx: 650, cy: 300, scale: 1.0, path: 'M 600 200 L 700 200 L 750 280 L 700 380 L 600 350 Z' }
    ];
  }

  public get worldBounds(): WorldBoundsDTO | undefined {
    return this.world?.bounds;
  }

  public get activeChunk(): ChunkCoordDTO | undefined {
    return this.objectManager.getChunkManager()?.getCurrentChunk();
  }

  public get activeChunks(): readonly ChunkCoordDTO[] | undefined {
    return this.objectManager.getChunkManager()?.getActiveChunks();
  }

  public get unlockedGlobalNodes(): string[] {
    return this.metaProgressionManager.getUnlockedNodes();
  }

  public get globalNodesMap(): Record<string, any> {
    return this.metaProgressionManager.getAvailableNodesMap();
  }

  public get globalMetaSummary() {
      return this.metaProgressionManager ? (this.metaProgressionManager.getAggregatedMetaStats() ?? { stats: [], brooches: [] }) : { stats: [], brooches: [] };
  }

  public generateLocalRewards(): { id: string, name: string, desc: string, iconSvg: string }[] {
      return generateRandomLocalRewards(3);
  }

  public serializePlayerState(): PlayerSaveState | null {
    return this.player ? this.player.serializeState() : null;
  }

  public resetToInitialState(): void {
    this.metaProgressionManager.reset();
    this.initPlayer();
    this.objectManager.setCollectedWorldItems(new Set());
    this.eventManager.dispatch('inventoryUpdated', {
      backpack: this.player.backpack,
      equipment: this.player.equipment
    });
    this.eventManager.dispatch('skillTreeUpdated', {
      skills: Array.from(this.player.unlockedSkills),
      loadout: (this.player as any).activeLoadout,
      passiveLoadout: (this.player as any).passiveLoadout,
      globalActiveLoadout: (this.player as any).globalActiveLoadout
    });
    this.logger.log('domain', 'Domain state reset to initial values.');
  }

  public resetRunState(): void {
    if (!this.player) return;

    //? 1. Preserva o loadout atual de broches (passivos e ativos globais da meta-progressão) - ver ARCHITECTURE.md 3.17
    const preservedPassiveLoadout = [...(this.player.classManager?.passiveLoadout || [])];
    const preservedGlobalActiveLoadout = [...(this.player.classManager?.globalActiveLoadout || [])];

    //? 2. Reseta os atributos para o nível 1 base da run
    const level = this.config?.player?.level ?? 1;
    this.player.attributes = new Attributes(8, level, 10, 10, 10, 10, 10, 10);
    //? Re-aplica os bônus permanentes da árvore global
    this.metaProgressionManager.applyGlobalBonuses(this.player.attributes);
    this.player.attributes.hp = this.player.attributes.maxHp;
    this.player.attributes.mana = this.player.attributes.maxMana;

    //? 3. Reseta inventário da run (mochila e moedas)
    this.player.inventory.backpack = [];
    this.player.inventory.coins = 0;

    //? 4. Reseta equipamentos da run
    this.player.equipmentManager.equipment = {
      mainHand: undefined,
      secondHand: undefined,
      helmet: undefined,
      chestplate: undefined,
      pants: undefined,
      boots: undefined,
      gloves: undefined,
      amulet: undefined,
      bag: undefined,
      belt: undefined,
      leftHandRings: [],
      rightHandRings: []
    };
    this.player.equipmentManager.syncEquipedItens();

    //? 5. Reseta habilidades e cooldowns da classe para a nova run
    this.player.classManager.resetRun();

    //? 6. Restaura os broches da meta-progressão no loadout
    for (let i = 0; i < 4; i++) {
      this.player.classManager.equipPassiveInLoadout(preservedPassiveLoadout[i] || null, i);
      this.player.classManager.equipGlobalActiveBrooch(preservedGlobalActiveLoadout[i] || null, i);
    }
    BroochRegistry.resetAll();

    //? 7. Revive e reseta cinemática, estado motor e coordenadas de spawn
    this.player.revive();
    const initPos = this.resolveInitialSpawn(this.world?.mapId || 'vilgem', this.config?.player?.initialPos);
    this.player.coordinates = { x: initPos.x, y: initPos.y };
    if (this.player.hitboxes) {
      for (let i = 0; i < this.player.hitboxes.length; i++) {
        this.player.hitboxes[i]?.update(
          { x: this.player.coordinates.x + this.player.size.width / 2, y: this.player.coordinates.y + this.player.size.height / 2 },
          this.player.rotation
        );
      }
    }
    this.player.collectedWorldItems.clear();
    this.objectManager.setCollectedWorldItems(new Set());

    //? 8. Despacha eventos de sincronização para a interface
    this.eventManager.dispatch('inventoryUpdated', {
      backpack: this.player.backpack,
      equipment: this.player.equipment
    });
    this.eventManager.dispatch('skillTreeUpdated', {
      skills: Array.from(this.player.unlockedSkills),
      loadout: this.player.activeLoadout,
      passiveLoadout: this.player.passiveLoadout,
      globalActiveLoadout: this.player.globalActiveLoadout
    });
    this.eventManager.dispatch('runResetCompleted', {});
    this.logger.log('domain', 'Run reset completed: Player reset to level 1, preserving global meta progression and brooches.');
  }

  public restorePlayerState(state: any): void {
    if (!state) {
      this.resetToInitialState();
      return;
    }
    const metaState = state.metaProgressionState || state.activeCheckpoint?.metaProgressionState || state.checkpoint?.metaProgressionState;
    if (metaState) {
      this.metaProgressionManager.loadGlobalState(metaState);
      if (this.player && this.player.attributes) {
        this.metaProgressionManager.applyGlobalBonuses(this.player.attributes);
      }
    }
    const pState = state.playerState || state.player || state.activeCheckpoint?.playerState || state.activeCheckpoint?.player || state.checkpoint?.playerState || state.checkpoint?.player || state;
    if (this.player) {
      this.player.restoreState(pState);
      this.sanitizePlayerCoordinatesForCurrentWorld(state);
      if (this.player.attributes && this.player.attributes.hp <= 0) {
        this.player.attributes.hp = this.player.attributes.maxHp;
      }
      (this.player as any).state = 'idle';
      if (this.player.collectedWorldItems) {
        this.objectManager.setCollectedWorldItems(this.player.collectedWorldItems);
      }
    }
  }

  public getMetaProgressionState(): any {
    return this.metaProgressionManager ? this.metaProgressionManager.getGlobalState() : null;
  }

  private sanitizePlayerCoordinatesForCurrentWorld(saveData?: any): void {
    if (!this.player) return;
    const currentMapId = this.world?.mapId || 'vilgem';
    const rawSavedMapId = saveData?.mapId
      || (typeof saveData?.world === 'string' ? saveData.world : saveData?.world?.mapId)
      || saveData?.activeCheckpoint?.mapId
      || saveData?.checkpoint?.mapId
      || 'vilgem';
    const savedMapId = rawSavedMapId.toString().toLowerCase();

    //? 1. Se o jogador escolheu iniciar em outro mundo diferente do save, usa o spawn do mundo atual
    if (this.world && savedMapId && savedMapId !== currentMapId) {
      const spawn = this.resolveInitialSpawn(currentMapId, this.world.defaultSpawn);
      this.player.coordinates.x = spawn.x;
      this.player.coordinates.y = spawn.y;
    } else if (currentMapId === 'vilgem') {
      const cx = this.player.coordinates.x;
      const cy = this.player.coordinates.y;
      //? 2. Migra apenas coordenadas legadas da antiga grade positiva [0..3072] ou (0, 0) para a Praça Central (512, 591) no Chunk (0, 0).
      if ((cx === 1536 && cy === 1615) || (cx === 0 && cy === 0)) {
        this.player.coordinates.x = 512;
        this.player.coordinates.y = 591;
      }
    }

    if (this.player.hitboxes) {
      for (let i = 0; i < this.player.hitboxes.length; i++) {
        this.player.hitboxes[i]?.update(
          { x: this.player.coordinates.x + this.player.size.width / 2, y: this.player.coordinates.y + this.player.size.height / 2 },
          this.player.rotation
        );
      }
    }
    this.objectManager.getChunkManager().updatePlayerPosition(this.player.coordinates.x, this.player.coordinates.y);
  }

  public restoreGameState(data: any): void {
    if (!data) {
      this.resetToInitialState();
      return;
    }
    const metaState = data.metaProgressionState || 
                      data.activeCheckpoint?.metaProgressionState || 
                      data.checkpoint?.metaProgressionState ||
                      data.globalMetaSummary?.metaProgressionState ||
                      (data.globalMetaSummary?.unlockedNodes ? data.globalMetaSummary : undefined);
    if (metaState) {
      this.metaProgressionManager.loadGlobalState(metaState);
      if (this.player && this.player.attributes) {
        this.metaProgressionManager.applyGlobalBonuses(this.player.attributes);
      }
    }
    const pState = data.playerState || data.player || data.activeCheckpoint?.playerState || data.activeCheckpoint?.player || data.checkpoint?.playerState || data.checkpoint?.player || data;
    if (this.player) {
      this.player.restoreState(pState);
      this.sanitizePlayerCoordinatesForCurrentWorld(data);
      if (this.player.attributes && this.player.attributes.hp <= 0) {
        this.player.attributes.hp = this.player.attributes.maxHp;
      }
      (this.player as any).state = 'idle';
      if (this.player.collectedWorldItems) {
        this.objectManager.setCollectedWorldItems(this.player.collectedWorldItems);
      }
    }

    //? Garante que todos os broches equipados no loadout ou salvos no save sejam registrados pela meta-progressão.
    const broochesToUnlock = new Set<string>();
    if (Array.isArray(metaState?.unlockedBrooches)) metaState.unlockedBrooches.forEach((b: string) => b && broochesToUnlock.add(b));
    [
      pState?.classes?.globalActiveLoadout, pState?.classes?.passiveLoadout,
      pState?.globalActiveLoadout, pState?.passiveLoadout,
      data?.globalActiveLoadout, data?.passiveLoadout,
      data?.unlockedBrooches, data?.globalMetaSummary?.brooches
    ].flat().filter(Boolean).forEach((b: any) => {
      const id = typeof b === 'string' ? b : b?.id;
      if (id?.startsWith?.('brooch_')) broochesToUnlock.add(id);
    });
    for (const bId of broochesToUnlock) this.metaProgressionManager.unlockBrooch(bId);
  }

  public async flushAutoSave(reason: string = 'manualFlush'): Promise<void> {
    if (this.autoSaveService) await this.autoSaveService.scheduleAutoSave(reason, true);
  }

  public triggerAssetState(payload: import("./ports/domain-contracts").TriggerAssetStateDTO): boolean {
    return this.objectManager.handleTriggerAssetState(payload);
  }
}
