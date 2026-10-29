/** @file Contém a classe GameAdapter, o orquestrador principal da camada de Adaptação (apresentação). */
import type { IEventManager } from "../../../domain/eventDispacher/IGameEvents";
import { logger } from "../shared/Logger";
import type { IGameDomain } from "../../../domain/ports/domain-contracts";

import { initializeGame, setPauseGame, isGamePaused } from "./Game";

import { Camera, Canvas, WebGPURenderer, Renderer, type IRenderer, GameMap, SceneManager, type IRenderable, RenderThrottlePolicy, type IRenderThrottlePolicy } from "./renderModule";

import UIManager from "./UiManager/UIManager";
import InputGateway from "./keyboardModule/InputGateway";
import DialogueAdapter from "./DialogueAdapter";
import MainMenuGui from "../GUIS/mainMenuHudModule/MainMenuGui";
import { Telemetry } from "../../../tests/Telemetry";
import type { ITelemetryAdapter } from "../../TelemetryAdapter/ITelemetryAdapter";

import ViewportTransformer from "./ViewportTransformer";
import { GameEventBinder } from "./GameEventBinder";
import WebWindowManager from "./WebWindowManager";
import PauseMenuGui from "../GUIS/pauseMenuModule/PauseMenuGui";
import { safeInvoke } from "../shared/TauriIPC";
import intermapsMap from "../assets/maps/intermapsMap.json";
import { IntermapRegistry } from "../../../domain/ObjectModule/Maps/IntermapConfig";

declare const __CLI_NO_GPU__: boolean | undefined;

/** @class GameAdapter O "Adaptador" principal que conecta a lógica de domínio (`IGameDomain`) com as tecnologias da web (Canvas, Input, DOM), traduzindo eventos e dados entre as camadas e gerenciando o ciclo de vida dos componentes de apresentação. */
export default class GameAdapter {
  private isDebugMode = false; /** @private Flag para controlar a renderização de elementos de depuração, como hitboxes. */
  private isNoGpuMode = false; /** @private Flag para forçar o uso exclusivo do Canvas 2D quando --no-gpu for passado. */
  private renderer!: IRenderer<any>; /** @private A instância do `Renderer` responsável por desenhar no canvas. */
  private camera!: Camera; /** @private A instância da `Camera` que controla a viewport do jogo. */
  private map?: GameMap; /** @private A instância do `GameMap` que gerencia o mapa de fundo, opcional. */
  
  private sceneManager!: SceneManager;
  private uiManager!: UIManager;
  private inputGateway!: InputGateway;
  private pauseMenuGui!: PauseMenuGui;

  private currentFrameState: { world: any; renderables: readonly any[] } | null = null;
  private canvasRenderBuffer: IRenderable[] = [];
  private webGpuRenderBuffer: any[] = [];
  private static readonly ySortComparator = (a: any, b: any): number =>
    (a.coordinates.y + a.size.height) - (b.coordinates.y + b.size.height);
  private isGameStarted: boolean = false;
  private isReloading: boolean = false;
  private checkpointTimer: number = 0;
  private currentCycle: number = 1;
  private lastDrawCalls: number = 0;
  private lastCulledEntities: number = 0;

  private viewportTransformer!: ViewportTransformer;
  private eventBinder!: GameEventBinder;
  private webWindowManager!: WebWindowManager;
  private renderThrottlePolicy: IRenderThrottlePolicy;

  /** @constructor @param domain Uma instância que implementa a interface do domínio. A injeção de dependência via interface permite que o Adapter seja agnóstico à implementação do domínio. */
  constructor(private domain: IGameDomain, private eventManager: IEventManager, private telemetryAdapter: ITelemetryAdapter) {
    logger.log('init', 'GameAdapter instantiated.');
    this.renderThrottlePolicy = new RenderThrottlePolicy(60, false);
  }

  //? ----------- Lifecycle -----------

  /** Fase de Inicialização: Orquestra a criação dos subsistemas da web (Canvas, Câmera, Renderer), carrega assets, informa o domínio sobre o mundo e inicia o game loop. @async @returns {Promise<void>} Resolve quando os assets essenciais são carregados. */
  public async initialize() {
    logger.log('init', 'GameAdapter initializing...');

    const togglePauseGame = (): void => {
      if (!this.isGameStarted || !this.uiManager) return;
      const wasPaused = isGamePaused();
      const isAnyMenuOpen = this.uiManager.isAnyMenuOpen() || (this.pauseMenuGui?.isOpen ?? false);
      setPauseGame(isAnyMenuOpen);
      const isPaused = isGamePaused();
      this.renderThrottlePolicy.notifyMenuStateChanged(isAnyMenuOpen);
      if (wasPaused !== isPaused) {
        this.domain.notifyPauseState(isPaused);
        logger.log('init', `Game paused state: ${isPaused}`);
      }
    };

    this.initializeUIAndInput(togglePauseGame);
    await this.initializeRenderer();
    await this.initializeScene();
    this.bindEvents();
    this.initializeMainMenu(togglePauseGame);

    window.dispatchEvent(new Event('resize'));
  }

  private bindEvents(): void {
    this.eventBinder = new GameEventBinder(
      this.eventManager,
      this.uiManager,
      this.sceneManager,
      () => this.isGameStarted,
      () => {
        logger.log('domain', 'Player has died. Showing Game Over screen...');
        if (!this.isReloading) {
          setPauseGame(true);
          this.inputGateway.inputManager.setPreventUnload(false);
          this.uiManager.showGameOver();
        }
      },
      (targetMapId: string, targetCoordinates?: { x: number; y: number }) => {
        return this.handleMapTransition(targetMapId, targetCoordinates);
      }
    );
    this.eventBinder.bindEvents();
    logger.log('init', 'All assets preloaded.');
  }

  /**
   * Orquestra a transição de mundo/intermap no Adaptador.
   * Transiciona o Domínio, recria a instância de GameMap para Canvas 2D e purga visuais transitórios.
   */
  private async handleMapTransition(targetMapId: string, spawnCoords?: { x: number; y: number }): Promise<void> {
    logger.log('domain', `[GameAdapter] Iniciando transição para o mapa: ${targetMapId}`);

    // Sincroniza definições de Intermaps em tempo de execução no Domínio (catálogo do disco e edições no Assets Adapter)
    // Executa sincronicamente antes de qualquer yield/await para garantir que o Domínio use as definições atualizadas
    try {
      if (intermapsMap && typeof intermapsMap === 'object') {
        for (const [id, def] of Object.entries(intermapsMap)) {
          if (def && typeof def === 'object') {
            IntermapRegistry.register(def as any);
          }
        }
      }
      if (typeof localStorage !== 'undefined') {
        const cachedIntermaps = localStorage.getItem('rpg_assets_adapter_intermaps');
        if (cachedIntermaps) {
          const parsed = JSON.parse(cachedIntermaps);
          for (const [id, def] of Object.entries(parsed)) {
            if (def && typeof def === 'object') {
              IntermapRegistry.register(def as any);
            }
          }
        }
        const cachedChunksRaw = localStorage.getItem(`assets_adapter_chunks_${targetMapId}`);
        if (cachedChunksRaw) {
          const cachedChunks = JSON.parse(cachedChunksRaw);
          const existing = IntermapRegistry.get(targetMapId);
          if (existing && cachedChunks.chunks) {
            existing.chunks = cachedChunks.chunks;
            if (cachedChunks.width) existing.width = cachedChunks.width;
            if (cachedChunks.height) existing.height = cachedChunks.height;
            IntermapRegistry.register(existing);
          }
        }
      }
    } catch (err) {
      logger.log('error', `[GameAdapter] Erro ao sincronizar IntermapRegistry: ${err}`);
    }

    // Consulta a API do Vite para capturar chunks e intermaps editados em tempo real no Assets Editor
    try {
      if (typeof fetch === 'function') {
        const intermapsRes = await fetch('/api/assets-adapter?target=intermaps').catch(() => null);
        if (intermapsRes && intermapsRes.ok) {
          const data = await intermapsRes.json();
          if (data.intermaps) {
            for (const [id, def] of Object.entries(data.intermaps)) {
              if (def && typeof def === 'object') {
                IntermapRegistry.register(def as any);
              }
            }
          }
        }
        const chunksRes = await fetch(`/api/assets-adapter?target=chunks&mapId=${encodeURIComponent(targetMapId)}`).catch(() => null);
        if (chunksRes && chunksRes.ok) {
          const cData = await chunksRes.json();
          const existing = IntermapRegistry.get(targetMapId);
          if (existing && cData.chunks) {
            existing.chunks = cData.chunks;
            if (cData.width) existing.width = cData.width;
            if (cData.height) existing.height = cData.height;
            IntermapRegistry.register(existing);
          }
        }
      }
    } catch (_) {}

    let collisionData: any[] | undefined = undefined;
    try {
      const VisualConfigMap = (await import('../shared/VisualConfigMap')).VisualConfigMap;
      const mapConfig = (VisualConfigMap as any)[targetMapId];
      if (mapConfig && mapConfig.collisionJsonUrl) {
        const response = await fetch(mapConfig.collisionJsonUrl);
        const json = await response.json();
        collisionData = json.hitboxes;
      }
    } catch (err) {
      logger.log('error', `[GameAdapter] Erro ao carregar dados de colisão para ${targetMapId}: ${err}`);
    }

    // 1. Chamar transição no Domínio
    await this.domain.transitionWorld(targetMapId, spawnCoords, collisionData);

    // 2. Atualizar a referência do mapa no renderizador
    this.map?.dispose();
    this.map = new GameMap(targetMapId);

    // 3. Limpar entidades residuais do SceneManager (efeitos transitórios, balões de fala órfãos)
    this.sceneManager.clearTransientVisuals();
    this.uiManager.clearTransientDialogues();
    this.uiManager.clearFloatingBubbles();

    // 4. Sincronizar imediatamente o estado visual para o novo mapa
    this.currentFrameState = this.domain.getRenderState();
    if (this.currentFrameState) {
      this.sceneManager.syncRenderables(this.currentFrameState.renderables);
    }
    this.renderThrottlePolicy.markWorldDirty();

    logger.log('domain', `[GameAdapter] Transição concluída com sucesso para: ${targetMapId}`);
  }

  private initializeUIAndInput(togglePauseGame: () => void): void {
    const dialogueAdapter = new DialogueAdapter(
      this.eventManager,
      (message: string, npcId?: number) => this.domain.sendDialogue(message, npcId),
      togglePauseGame,
      () => this.isGameStarted
    );

    this.uiManager = new UIManager(
      this.domain,
      togglePauseGame,
      (index: number) => this.eventManager.dispatch('inventoryAction', { action: 'equip', payload: { index } }),
      (slot: string, index?: number) => this.eventManager.dispatch('inventoryAction', { action: 'unequip', payload: index !== undefined ? { slot, index } : { slot } }),
      (action: 'unlock' | 'changeClass' | 'equip', payload: any) => this.eventManager.dispatch('skillTreeAction', { action, payload }),
      (attribute: string) => this.eventManager.dispatch('attributeAction', { action: 'allocate', payload: { attribute } }),
      () => {
        logger.log('domain', 'Restarting game via UI command...');
        window.location.href = window.location.pathname; // Força recarregamento limpo escapando do Vite
      },
      (index: number) => this.eventManager.dispatch('inventoryAction', { action: 'delete', payload: { index } }),
      dialogueAdapter,
      (rewardId: string, coords: any, amount?: number) => {
          const localPayload: any = { rewardId };
          if (amount !== undefined) localPayload.amount = amount;
          this.eventManager.dispatch('rewardAction', { action: 'claimLocal', payload: localPayload });
          if (coords) {
              this.eventManager.dispatch('particle', { effect: 'levelUp', x: coords.x, y: coords.y, color: '#00aaff' });
          }
      },
      (action: 'equipTool' | 'unequipTool' | 'selectTool', payload: any) => {
          this.eventManager.dispatch('inventoryAction', { action, payload });
      },
      () => {
          this.eventManager.dispatch('inventoryAction', { action: 'swapWeapons', payload: {} });
      }
    );
    const canUseMageBuffer = (): boolean => {
      const renderables = this.currentFrameState?.renderables ?? this.domain.getRenderState().renderables;
      const playerState = renderables.find(r => r.id === 1);
      if (!playerState) return false;
      const unlockedClasses = playerState.unlockedClasses ?? [];
      if (!unlockedClasses.includes('Mago')) return false;
      const mainHand = playerState.equipment?.mainHand;
      if (!mainHand) return false;
      return (
        mainHand.weaponType === 'staff' ||
        mainHand.unlocksClass === 'Mago' ||
        mainHand.projectileType === 'magicMissile' ||
        (typeof mainHand.name === 'string' && mainHand.name.toLowerCase().includes('cajado'))
      );
    };

    this.inputGateway = new InputGateway(
      this.domain,
      (spell) => {
        if (canUseMageBuffer()) {
          this.uiManager.spellBufferHudGui.pushRune(spell);
        }
      },
      () => {
        if (canUseMageBuffer()) {
          this.uiManager.spellBufferHudGui.triggerSuccess();
        }
      },
      () => this.uiManager.handleInteract()
    );

    this.pauseMenuGui = new PauseMenuGui(
      togglePauseGame,
      async () => {
        logger.log('domain', 'Quit game via Pause Menu...');
        try {
          await this.saveGameSlot(this.activeSlotIndex);
        } catch (e) {
          logger.log('error', `[GameAdapter] Erro ao salvar antes de quitar: ${e}`);
        }
        if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
          window.location.reload(); // Simple reload to go back to main menu
        }
      },
      async () => {
        await this.saveGameSlot(this.activeSlotIndex);
      }
    );

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isGameStarted) {
        // 1. Se as configurações internas do PauseMenu estiverem abertas, fecha o painel de configurações
        if (this.pauseMenuGui.isOpen && this.pauseMenuGui.isSettingsOpen()) {
          this.pauseMenuGui.closeSettings();
          return;
        }

        // 2. Se o PauseMenu estiver aberto, fecha o PauseMenu e despausa o jogo
        if (this.pauseMenuGui.isOpen) {
          this.pauseMenuGui.hide();
          togglePauseGame();
          return;
        }

        // 3. Se qualquer outro menu do jogo estiver aberto (Skill Tree, Character Menu, Diálogo, Recompensa, etc.), fecha-o
        if (this.uiManager.closeAnyOpenMenu()) {
          return;
        }

        // 4. Se nenhum menu estiver aberto, abre o PauseMenu e pausa o jogo
        this.pauseMenuGui.show();
        togglePauseGame();
      }
    });

    // Encerramento do jogo: notifica o Domínio para AutoSave imediato antes de fechar
    window.addEventListener('beforeunload', () => {
      try {
        (this.eventManager as any).dispatch('gameClosing', {});
      } catch (err) {
        console.warn('[GameAdapter] Erro ao despachar gameClosing:', err);
      }
    });

    // Feedback visual do salvamento automático in-game
    (this.eventManager as any).on('autoSaveCompleted', (payload: any) => {
      if (payload?.slot) {
        this.activeSlotIndex = payload.slot;
      }
      logger.log('domain', `[AutoSave] Jogo gravado com sucesso no Slot ${payload?.slot} (ID: ${payload?.saveId})`);
      this.showAutoSaveToast(payload?.slot ?? this.activeSlotIndex);
    });
  }
  private async checkIsNoGpuRequested(): Promise<boolean> {
    // 1. Injeção direta pelo bundler Vite (via npm run dev -- --no-gpu)
    if (typeof __CLI_NO_GPU__ !== 'undefined' && __CLI_NO_GPU__) {
      return true;
    }

    // 2. Parâmetro de URL (ex: http://localhost:5173/?no-gpu ou ?nogpu)
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has('no-gpu') || params.has('nogpu') || params.get('gpu') === 'false') {
        return true;
      }
    }

    // 3. Flag persistida em LocalStorage
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('rpg_no_gpu') === 'true') {
        return true;
      }
    } catch (e) {}

    // 4. Argumentos de linha de comando no ambiente nativo Tauri
    try {
      if (typeof window !== 'undefined' && ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)) {
        const isNativeNoGpu = await safeInvoke<boolean>('is_no_gpu');
        if (isNativeNoGpu) return true;
      }
    } catch (e) {}

    // 5. Flag global injetada via window/globalThis
    if (typeof (globalThis as any).__NO_GPU__ !== 'undefined' && (globalThis as any).__NO_GPU__) {
      return true;
    }

    return false;
  }

  private async initializeRenderer(): Promise<void> {
    const canvas = new Canvas(document.body, 0, 0);
    this.camera = new Camera(canvas, 3);

    this.isNoGpuMode = await this.checkIsNoGpuRequested();

    if (this.isNoGpuMode) {
      console.log('[Renderer] Flag --no-gpu detectada: Desativando WebGPU e forçando Canvas 2D Renderer.');
    }

    const hasWebGPU = !this.isNoGpuMode && typeof navigator !== 'undefined' && 'gpu' in navigator && !!(navigator as any).gpu;

    if (hasWebGPU) {
      try {
        this.renderer = new WebGPURenderer(canvas, this.camera);
        await this.renderer.initialize();
        logger.log('init', 'Successfully initialized WebGPU renderer.');
        console.log('[Renderer] Ativo: WebGPURenderer (Aceleração Gráfica por Hardware)');
        return;
      } catch (error) {
        logger.log('error', `WebGPU initialization failed: ${(error as Error).message}. Falling back to Canvas 2D renderer.`);
      }
    } else if (!this.isNoGpuMode) {
      console.log('[Renderer] WebGPU indisponível no ambiente: Utilizando Canvas 2D Renderer.');
    }

    this.renderer = new Renderer(canvas, this.camera);
    await this.renderer.initialize();
    logger.log('init', 'Initialized Canvas 2D renderer and loaded map.');
    console.log(`[Renderer] Ativo: Canvas 2D Renderer (${this.isNoGpuMode ? 'Modo --no-gpu' : 'Otimizado com Frustum Culling'})`);
  }
  private async initializeScene(): Promise<void> {
    this.sceneManager = new SceneManager(this.renderer, this.isDebugMode);
    await this.sceneManager.initialize();

    this.webWindowManager = new WebWindowManager(this.sceneManager, this.telemetryAdapter);
    this.viewportTransformer = new ViewportTransformer(this.camera, this.renderer, this.domain, this.sceneManager);
  }
  private initializeMainMenu(togglePauseGame: () => void): void {
    const engineWorlds = this.domain.getAvailableWorlds();

    new MainMenuGui(this.domain, async (mapId, activeLoadout, passiveLoadout, checkpoint) => {
      logger.log('init', `Map selected: ${mapId}. Instructing domain to generate world...`);

      // Carrega as dependências em runtime para não misturar os dados JSON puros neste arquivo.
      const VisualConfigMap = (await import('../shared/VisualConfigMap')).VisualConfigMap;
      const mapConfig = (VisualConfigMap as any)[mapId];
      let collisionData: any[] | undefined = undefined;

      if (mapConfig && mapConfig.collisionJsonUrl) {
        try {
          const response = await fetch(mapConfig.collisionJsonUrl);
          const json = await response.json();
          collisionData = json.hitboxes;
          logger.log('init', `[Data-Driven] Carregados ${collisionData?.length} hitboxes do JSON do Editor.`);
        } catch (err) {
          logger.log('error', `[Data-Driven] Falha ao carregar JSON de colisões: ${err}`);
        }
      }
      // Sincroniza definições de Intermaps em tempo de execução no Domínio (catálogo do disco e edições no Assets Adapter)
      try {
        if (intermapsMap && typeof intermapsMap === 'object') {
          for (const [id, def] of Object.entries(intermapsMap)) {
            if (def && typeof def === 'object') {
              IntermapRegistry.register(def as any);
            }
          }
        }
        if (typeof localStorage !== 'undefined') {
          const cachedIntermaps = localStorage.getItem('rpg_assets_adapter_intermaps');
          if (cachedIntermaps) {
            const parsed = JSON.parse(cachedIntermaps);
            for (const [k, v] of Object.entries(parsed)) {
              if (v && typeof v === 'object') {
                IntermapRegistry.register(v as any);
              }
            }
          }
        }
      } catch (err) {
        logger.log('error', `[GameAdapter] Erro ao sincronizar IntermapRegistry no loadWorld: ${err}`);
      }

      await (this.domain as any).loadWorld(mapId, collisionData);

      // Aplica o checkpoint (se houver) e em seguida o loadout salvo no Menu ao Player do Domínio
      const player = (this.domain as any).player;
      if (player) {
          if (checkpoint && (checkpoint.metaProgressionState || checkpoint.playerState || checkpoint.player)) {
              if (typeof (this.domain as any).restoreGameState === 'function') {
                  (this.domain as any).restoreGameState(checkpoint);
              } else if (checkpoint.player && typeof (this.domain as any).restorePlayerState === 'function') {
                  (this.domain as any).restorePlayerState(checkpoint.player);
              } else if (checkpoint.player && typeof player.restoreState === 'function') {
                  player.restoreState(checkpoint.player);
              } else if (checkpoint.player) {
                  const cp = checkpoint.player;
                  if (player.attributes && typeof player.attributes.restoreState === 'function') {
                      player.attributes.restoreState({
                          level: cp.level,
                          currentXp: cp.currentXp,
                          availablePoints: cp.availablePoints,
                          maxHp: cp.maxHp,
                          hp: cp.hp,
                          mana: cp.mana,
                          strength: cp.strength,
                          constitution: cp.constitution,
                          dexterity: cp.dexterity,
                          intelligence: cp.intelligence,
                          wisdom: cp.wisdom,
                          charisma: cp.charisma
                      });
                  }
                  if (cp.coins !== undefined) player.coins = cp.coins;
                  if (Array.isArray(cp.unlockedSkills)) {
                      cp.unlockedSkills.forEach((s: string) => player.unlockSkill(s));
                  }
                  if (cp.coordinates) {
                      const savedMap = (checkpoint.mapId || checkpoint.world || 'vilgem').toString().toLowerCase();
                      if (savedMap === mapId) {
                          if (mapId === 'vilgem' && ((cp.coordinates.x === 1536 && cp.coordinates.y === 1615) || (cp.coordinates.x === 0 && cp.coordinates.y === 0))) {
                              player.coordinates.x = 512;
                              player.coordinates.y = 591;
                          } else {
                              player.coordinates.x = cp.coordinates.x;
                              player.coordinates.y = cp.coordinates.y;
                          }
                      }
                  }
              }
              if (player.attributes && player.attributes.hp <= 0) {
                  player.attributes.hp = player.attributes.maxHp;
              }
              if (typeof (player as any).revive === 'function') {
                  (player as any).revive();
              } else {
                  player.state = 'idle';
              }
              const currentLvl = player.attributes?.level ?? checkpoint.player?.level ?? checkpoint.player?.attributes?.level ?? 1;
              const currentHp = player.attributes?.hp ?? 0;
              const maxHp = player.attributes?.maxHp ?? 0;
              logger.log('init', `[Checkpoint] Partida restaurada com sucesso! Nível ${currentLvl}, HP: ${currentHp}/${maxHp}`);
          }

          // Aplica o loadout do Menu com precedência sobre o save restaurado
          activeLoadout.forEach((id, i) => {
              if (!id) return;
              if (id.startsWith('brooch_')) {
                  player.equipGlobalActiveBrooch(id, i % 4);
              } else if (i < 4) {
                  player.equipSkillInLoadout(id, i);
              } else {
                  player.equipGlobalActiveBrooch(id, i - 4);
              }
          });
          passiveLoadout.forEach((id, i) => id && player.equipPassiveInLoadout(id, i));

          const globalActivesToRestore = checkpoint?.globalActiveLoadout || checkpoint?.player?.globalActiveLoadout || checkpoint?.player?.classes?.globalActiveLoadout;
          if (Array.isArray(globalActivesToRestore)) {
              globalActivesToRestore.forEach((id: string, i: number) => {
                  if (id && id.startsWith('brooch_')) {
                      player.equipGlobalActiveBrooch(id, i % 4);
                  }
              });
          }
      }

      if (checkpoint?.slot) {
        this.setActiveSlotIndex(checkpoint.slot);
      }
      this.currentCycle = checkpoint?.cycle ?? checkpoint?.metaProgressionState?.treeGenerationCount ?? 1;

      // Notifica o Domínio que uma nova run começou para AutoSave
      try {
        (this.eventManager as any).dispatch('gameRunStarted', {
          saveId: checkpoint?.saveId || `run_${Date.now()}`,
          slot: this.activeSlotIndex,
          cycle: this.currentCycle,
          mapId
        });
      } catch {}

      const { world } = this.domain.getRenderState();

      if (this.renderer instanceof Renderer) {
        this.map?.dispose();
        this.map = new GameMap(world.mapId);
      }

      this.uiManager.hideGameOver();
      this.isGameStarted = true;
      setPauseGame(false);
      togglePauseGame();
      initializeGame(this.update.bind(this), this.draw.bind(this));
    }, engineWorlds);
  }

  /** Fase de Update (Lógica do Adapter): Função principal do ciclo de vida, chamada a cada frame para processar inputs, delegar a atualização de lógica para o domínio, sincronizar o estado visual e atualizar a câmera. @private @param deltaTime O tempo em segundos desde o último frame. */
  private update(deltaTime: number): void {
    this.telemetryAdapter.beginFrame();
    Telemetry.performance.recordFrame(deltaTime * 1000);
    Telemetry.profiler.start('Engine Update Total');

    if (this.inputGateway.inputManager.consumeAction('toggle_attributes')) {
      this.uiManager.toggleCharacterMenu();
    }

    if (this.inputGateway.inputManager.consumeAction('toggle_skill_tree')) {
      this.uiManager.toggleSkillTree();
    }

    if (this.uiManager?.isAnyMenuOpen?.()) {
      if (this.inputGateway.inputManager.consumeAction('interact')) {
        this.uiManager.closeAnyOpenMenu?.();
      }
    }

    const mousePos = this.inputGateway.inputManager.mouseLastCoordinates;
    const mouseWorldPos = this.viewportTransformer.screenToWorld(mousePos.x, mousePos.y);

    if (!isGamePaused()) {
      const domainStart = performance.now();
      Telemetry.profiler.start('Domain Math & Physics');
      
      const tInput = performance.now();
      this.inputGateway.handleInteractions((screenX, screenY) => this.viewportTransformer.screenToWorld(screenX, screenY));
      this.telemetryAdapter.recordFileTiming('InputGateway.ts', 'Adapters / Input', performance.now() - tInput);

      this.domain.update(deltaTime);
      Telemetry.profiler.end('Domain Math & Physics');
      this.telemetryAdapter.recordSubsystemTime('domain', performance.now() - domainStart);

      const tAnim = performance.now();
      this.sceneManager.updateAnimations(deltaTime, mouseWorldPos);
      this.telemetryAdapter.recordFileTiming('SceneManager.ts', 'Adapters / Scene', performance.now() - tAnim);
    }

    const syncStart = performance.now();
    Telemetry.profiler.start('Render State Sync');

    const tState = performance.now();
    if (!isGamePaused() || !this.currentFrameState) {
      this.currentFrameState = this.domain.getRenderState();
    }
    this.telemetryAdapter.recordFileTiming('DomainRenderState.ts', 'Domain / RenderState', performance.now() - tState);

    if (!isGamePaused()) {
      const tSync = performance.now();
      this.sceneManager.syncRenderables(this.currentFrameState.renderables);
      this.telemetryAdapter.recordFileTiming('SceneManager.ts', 'Adapters / Scene', performance.now() - tSync);
    }
    Telemetry.profiler.end('Render State Sync');
    this.telemetryAdapter.recordSubsystemTime('sync', performance.now() - syncStart);

    const renderables = this.currentFrameState?.renderables || [];
    const playerState = renderables.find(r => r.id === 1);

    let playerScreenPos = { x: 0, y: 0 };
    if (playerState) {
      playerScreenPos = this.viewportTransformer.worldToScreen(playerState.coordinates.x + playerState.size.width / 2, playerState.coordinates.y + playerState.size.height / 2);
    }

    const uiStart = performance.now();
    this.uiManager.update(
      playerState,
      renderables,
      playerScreenPos,
      mousePos,
      (wx: number, wy: number) => this.viewportTransformer.worldToScreen(wx, wy)
    );
    const uiDuration = performance.now() - uiStart;
    this.telemetryAdapter.recordSubsystemTime('ui', uiDuration);
    this.telemetryAdapter.recordFileTiming('UIManager.ts', 'Adapters / UI', uiDuration);

    Telemetry.activeEntities = renderables.length;
    Telemetry.profiler.end('Engine Update Total');

    // Checkpoint periódico da partida para recuperação após falhas/crashes
    if (!isGamePaused() && this.isGameStarted) {
      this.checkpointTimer += deltaTime;
      if (this.checkpointTimer >= 5) {
        this.checkpointTimer = 0;
        this.saveRunCheckpoint();
      }
    }

    // --- Telemetry Adapter ---
    this.telemetryAdapter.setActiveEntities(renderables.length);
    this.telemetryAdapter.setSpatialInfo({
      mapId: this.currentFrameState?.world?.mapId || 'vilgem',
      playerCoords: playerState ? { x: Math.round(playerState.coordinates.x), y: Math.round(playerState.coordinates.y) } : { x: 0, y: 0 },
      currentChunk: this.map?.currentChunkCoords ?? { x: 0, y: 0 },
      activeChunksCount: this.map?.activeChunksCount ?? 0,
      cameraZoom: this.camera ? this.camera.zoom : 1.0,
      rendererType: this.isNoGpuMode
        ? 'Canvas 2D (--no-gpu)'
        : (this.renderer instanceof WebGPURenderer ? 'WebGPU' : 'Canvas 2D (Bicubic Lanczos)'),
      activeParticles: this.sceneManager?.particleOrchestrator?.activeParticlesCount ?? 0,
      drawCalls: this.lastDrawCalls,
      culledEntities: this.lastCulledEntities,
      textureCacheCount: this.map?.getLoadedImagesCount ? this.map.getLoadedImagesCount() : 0
    });
  }

  private buildCurrentCheckpoint(): any {
    const player = (this.domain as any).player;
    if (!player || !player.attributes || player.attributes.hp <= 0) return null;

    let playerData: any = null;
    if (typeof (this.domain as any).serializePlayerState === 'function') {
      playerData = (this.domain as any).serializePlayerState();
    } else if (typeof player.serializeState === 'function') {
      playerData = player.serializeState();
    }

    if (!playerData) {
      playerData = {
        level: player.attributes.level,
        currentXp: player.attributes.currentXp,
        availablePoints: player.attributes.availablePoints,
        maxHp: player.attributes.maxHp,
        hp: player.attributes.hp,
        mana: player.attributes.mana,
        strength: player.attributes.strength,
        constitution: player.attributes.constitution,
        dexterity: player.attributes.dexterity,
        intelligence: player.attributes.intelligence,
        wisdom: player.attributes.wisdom,
        charisma: player.attributes.charisma,
        activeLoadout: player.activeLoadout,
        passiveLoadout: player.passiveLoadout,
        globalActiveLoadout: player.globalActiveLoadout,
        unlockedSkills: Array.from(player.unlockedSkills || []),
        coordinates: { x: player.coordinates.x, y: player.coordinates.y },
        coins: player.coins
      };
    } else {
      // Garantir compatibilidade com leitores de campos na raiz
      if (playerData.attributes) {
        playerData.level = playerData.attributes.level;
        playerData.hp = playerData.attributes.hp;
        playerData.maxHp = playerData.attributes.maxHp;
      }
      if (playerData.classes) {
        playerData.activeLoadout = playerData.classes.activeLoadout;
        playerData.passiveLoadout = playerData.classes.passiveLoadout;
        playerData.globalActiveLoadout = playerData.classes.globalActiveLoadout;
        playerData.unlockedSkills = playerData.classes.unlockedSkills;
      }
    }

    return {
      mapId: this.currentFrameState?.world?.mapId || 'vilgem',
      timestamp: Date.now(),
      globalActiveLoadout: player.globalActiveLoadout,
      player: playerData,
      playerState: playerData
    };
  }

  private activeSlotIndex: number = 1;

  public setActiveSlotIndex(slot: number): void {
    if (slot >= 1 && slot <= 5) this.activeSlotIndex = slot;
  }

  private saveRunCheckpoint(): void {
    try {
      this.saveGameSlot(this.activeSlotIndex).catch(() => {});
    } catch (e) {}
  }

  public async saveGameSlot(slot: number = this.activeSlotIndex): Promise<void> {
    const checkpoint = this.buildCurrentCheckpoint();
    const player = (this.domain as any).player;
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const levelStr = player?.attributes?.level ? ` (Nvl ${player.attributes.level})` : '';

    let saveId = checkpoint?.saveId;
    if (!saveId) {
      saveId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      if (checkpoint) checkpoint.saveId = saveId;
    }

    const metaState = (this.domain as any)?.getMetaProgressionState ? (this.domain as any).getMetaProgressionState() : undefined;
    const effectiveCycle = metaState?.treeGenerationCount ?? this.currentCycle ?? 1;

    const slotPayload = {
      slot,
      saveId,
      characterName: `Aventureiro de Vilgem${levelStr}`,
      cycle: effectiveCycle,
      world: this.currentFrameState?.world?.mapId || 'Vilgem',
      mapId: this.currentFrameState?.world?.mapId || 'vilgem',
      savedAt: dateStr,
      metaProgressionState: metaState,
      globalMetaSummary: this.domain?.globalMetaSummary ?? { stats: [], brooches: [] },
      player: checkpoint?.player,
      playerState: checkpoint?.player,
      activeCheckpoint: checkpoint,
      checkpoint: checkpoint
    };

    const jsonStr = JSON.stringify(slotPayload);

    // Persistência em arquivos JSON no backend nativo Tauri via IPC seguro
    try {
      await safeInvoke('save_game_slot', { slot, payload: jsonStr }).catch(() => {});
    } catch (e) {}

    try {
      localStorage.setItem(`game_slot_${slot}`, jsonStr);
      if (slot === 1) {
        localStorage.setItem('saved_game_state', jsonStr);
      }
      localStorage.setItem('active_game_slot', slot.toString());
    } catch (e) {}

    logger.log('domain', `[GameAdapter] Jogo gravado com sucesso no Slot ${slot}! (saveId: ${saveId})`);
  }

  private showAutoSaveToast(slot: number): void {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('ds-autosave-hud-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ds-autosave-hud-toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '24px';
      toast.style.right = '24px';
      toast.style.zIndex = '99999';
      toast.style.background = 'rgba(15, 23, 42, 0.96)';
      toast.style.border = '1px solid rgba(56, 189, 248, 0.45)';
      toast.style.borderRadius = '9999px';
      toast.style.padding = '7px 16px';
      toast.style.color = '#38bdf8';
      toast.style.fontFamily = "'Cinzel', sans-serif, system-ui";
      toast.style.fontSize = '12px';
      toast.style.fontWeight = '600';
      toast.style.letterSpacing = '0.04em';
      toast.style.display = 'flex';
      toast.style.alignItems = 'center';
      toast.style.gap = '8px';
      toast.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.65), 0 0 12px rgba(56, 189, 248, 0.2)';
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.pointerEvents = 'none';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<span>Jogo Salvo (Registro ${slot})</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    if ((toast as any)._timeout) clearTimeout((toast as any)._timeout);
    (toast as any)._timeout = setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
      }
    }, 2200);
  }

  /** Fase de Desenho: Função final do ciclo de vida, chamada a cada frame após o `update` para delegar a responsabilidade de desenhar o frame atual para o `Renderer`. */
  private async draw(): Promise<void> {
    if (!this.currentFrameState) return;
    const renderStart = performance.now();
    Telemetry.profiler.start('GPU Render Pipeline');

    const domainState = this.currentFrameState;
    const cameraTarget = domainState.renderables.find(r => r.id === 1);

    const isAnyMenuOpen = (this.uiManager?.isAnyMenuOpen?.() ?? false) || (this.pauseMenuGui?.isOpen ?? false);
    const shouldDrawWorld = this.renderThrottlePolicy.shouldRenderWorldFrame(isAnyMenuOpen, isGamePaused(), false);

    if (shouldDrawWorld) {
      if (this.renderer instanceof WebGPURenderer) {
        // Lógica para WebGPU
        // Filtra entidades puramente colisionadoras/invisíveis reutilizando buffer pré-alocado (Zero-GC)
        this.webGpuRenderBuffer.length = 0;
        const rawRenderables = domainState.renderables;
        for (let i = 0; i < rawRenderables.length; i++) {
          const r = rawRenderables[i]!;
          if (r.entityTypeId !== 'environmentCollider' && r.entityTypeId !== 'portalLink' && r.entityTypeId !== 'portalLinkRequest') {
            this.webGpuRenderBuffer.push(r);
          }
        }

        // Adiciona os efeitos transientes para WebGPU
        for (const visual of this.sceneManager.transientVisuals.values()) {
          this.webGpuRenderBuffer.push(visual.state);
        }

        // Aplica ordenação espacial (Y-Sorting) para criar ilusão de profundidade (pseudo-3D)
        this.webGpuRenderBuffer.sort(GameAdapter.ySortComparator);

        const webGpuDomainState = { world: domainState.world, renderables: this.webGpuRenderBuffer };
        this.lastDrawCalls = (this.map?.activeChunksCount ?? 0) + this.webGpuRenderBuffer.length;
        this.lastCulledEntities = Math.max(0, domainState.renderables.length - this.webGpuRenderBuffer.length);
        await this.renderer.drawFrame(webGpuDomainState, cameraTarget, this.sceneManager.animationManagers);
      } else {
        // Lógica para Canvas 2D
        const cameraTargetRenderable = cameraTarget ? this.sceneManager.renderables.get(cameraTarget.id) : undefined;
        if (cameraTargetRenderable) this.camera.setTarget(cameraTargetRenderable);

        this.renderer.clear();

        // Reutiliza o buffer pré-alocado para evitar GC Thrashing no fallback Canvas2D
        this.canvasRenderBuffer.length = 0;
        for (const r of this.sceneManager.renderables.values()) this.canvasRenderBuffer.push(r);
        for (const v of this.sceneManager.transientVisuals.values()) if (v.renderable) this.canvasRenderBuffer.push(v.renderable);

        // Aplica ordenação espacial (Y-Sorting) para criar ilusão de profundidade (pseudo-3D)
        this.canvasRenderBuffer.sort(GameAdapter.ySortComparator);

        // Adiciona elementos que devem estar sempre no topo (Partículas e Debug)
        this.canvasRenderBuffer.push(this.sceneManager.particleOrchestrator);
        if (this.sceneManager.isDebugModeActive) for (const d of this.sceneManager.debugRenderables.values()) this.canvasRenderBuffer.push(d);

        // Passa a lista de objetos visuais (IRenderableObject) para o renderer antigo.
        const canvasDomainState = { world: domainState.world, renderables: this.canvasRenderBuffer };
        await (this.renderer as Renderer).drawFrame(canvasDomainState, cameraTarget, undefined, this.map);

        this.lastDrawCalls = (this.map?.activeChunksCount ?? 0) + ((this.renderer as Renderer).lastDrawnCount || this.canvasRenderBuffer.length);
        this.lastCulledEntities = (this.renderer as Renderer).lastCulledCount || 0;
      }
      this.renderThrottlePolicy.notifyFrameDrawn();
    } else {
      // Frame do mundo ignorado intencionalmente para liberar 100% da CPU/GPU para a interface gráfica
      this.lastDrawCalls = 0;
    }
    Telemetry.profiler.end('GPU Render Pipeline');
    const renderDuration = performance.now() - renderStart;
    this.telemetryAdapter.recordSubsystemTime('render', renderDuration);

    const rendererFile = this.renderer instanceof WebGPURenderer ? 'WebGPURenderer.ts' : 'Renderer.ts';
    const rendererModule = this.renderer instanceof WebGPURenderer ? 'Adapters / WebGPU' : 'Adapters / Canvas2D';
    this.telemetryAdapter.recordFileTiming(rendererFile, rendererModule, renderDuration);

    if (this.map) {
      this.telemetryAdapter.recordFileTiming('GameMap.ts', 'Adapters / Map', (this.map.activeChunksCount || 1) * 0.05);
    }

    this.telemetryAdapter.endFrame();
    this.webWindowManager.updateTelemetryUI();
  }
}

