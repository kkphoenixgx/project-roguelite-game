/** @file Contém a classe GameAdapter, o orquestrador principal da camada de Adaptação (apresentação). */
import type { IEventManager } from "../../../domain/eventDispacher/IGameEvents";
import { logger } from "../shared/Logger";
import type {IGameDomain } from "../../../domain/ports/domain-contracts";

import { initializeGame } from "./Game";

import Camera from "./renderModule/scene/Camera";
import Canvas from "./renderModule/engine/Canvas";
import WebGPURenderer from "./renderModule/engine/WebGPURenderer";
import Renderer from "./renderModule/engine/Renderer";
import type IRenderer from "./renderModule/engine/IRenderer";
import GameMap from "./renderModule/scene/Map";

import SceneManager from "./renderModule/scene/SceneManager";
import UIManager from "./UiManager/UIManager";
import InputGateway from "./keyboardModule/InputGateway";
import MainMenuGui from "../GUIS/mainMenuHudModule/MainMenuGui";
import type IRenderable from "./renderModule/visuals/IRenderable";
import { Telemetry } from "../../../tests/Telemetry"; 
import { saveTelemetryLog } from "../shared/TauriIPC";
import { VisualConfigMap } from "../shared/VisualConfigMap";

/** @class GameAdapter O "Adaptador" principal que conecta a lógica de domínio (`IGameDomain`) com as tecnologias da web (Canvas, Input, DOM), traduzindo eventos e dados entre as camadas e gerenciando o ciclo de vida dos componentes de apresentação. */
export default class GameAdapter {
  private isDebugMode = false; /** @private Flag para controlar a renderização de elementos de depuração, como hitboxes. */
  private renderer!: IRenderer<any>; /** @private A instância do `Renderer` responsável por desenhar no canvas. */
  private camera!: Camera; /** @private A instância da `Camera` que controla a viewport do jogo. */
  private map?: GameMap; /** @private A instância do `GameMap` que gerencia o mapa de fundo, opcional. */
  
  private sceneManager!: SceneManager;
  private uiManager!: UIManager;
  private inputGateway!: InputGateway;
  
  private currentFrameState: { world: any; renderables: readonly any[] } | null = null;
  private canvasRenderBuffer: IRenderable[] = []; // Para Zero-GC no Canvas2D
  private isGameStarted: boolean = false;

  /** @constructor @param domain Uma instância que implementa a interface do domínio. A injeção de dependência via interface permite que o Adapter seja agnóstico à implementação do domínio. */
  constructor(private domain: IGameDomain, private eventManager: IEventManager) {
    logger.log('init', 'GameAdapter instantiated.');

    // Expõe a função global para alternar o modo de depuração no console
    (window as any).toggleDebugMode = () => {
      this.isDebugMode = !this.isDebugMode;
      if (this.sceneManager) this.sceneManager.setDebugMode(this.isDebugMode);
      console.log(`%c[Debug] %cModo de depuração de HitBoxes: ${this.isDebugMode ? 'ATIVADO' : 'DESATIVADO'}`, 'color: orange', 'color: white');
    };

    // Expõe a função global para abrir o Hitbox Editor Tool
    (window as any).openHitboxEditor = () => {
      window.open('/typescript/adapters/polygonWebEditor/index.html', '_blank');
      console.log('%c[Editor] %cHitbox Editor Tool aberto em uma nova aba.', 'color: #55aaff', 'color: white');
    };

    // Gatilho de Telemetria: Salva os logs quando a janela do Tauri (ou navegador) for fechada
    window.addEventListener('beforeunload', () => {
      const report = Telemetry.mountReport();
      saveTelemetryLog(report, false);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        logger.log('ipc', '[Telemetry] Ejeção manual de log iniciada (F2)...');
        saveTelemetryLog(Telemetry.mountReport(), true);
      }
    });
  }


  private isPaused: boolean = true; // Inicia pausado aguardando o Menu Principal
  public togglePauseGame = (): void => {
    if (!this.isGameStarted || !this.uiManager) return;
    this.isPaused = this.uiManager.isAnyMenuOpen(); // O jogo pausa rigidamente baseado no estado real das UIs
    logger.log('init', `Game paused state: ${this.isPaused}`);
  };

  //? ----------- Lifecycle -----------

  /** Fase de Inicialização: Orquestra a criação dos subsistemas da web (Canvas, Câmera, Renderer), carrega assets, informa o domínio sobre o mundo e inicia o game loop. @async @returns {Promise<void>} Resolve quando os assets essenciais são carregados. */
  public async initialize(){
    logger.log('init', 'GameAdapter initializing...');
    this.uiManager = new UIManager(
      this.togglePauseGame,
      (index: number) => this.domain.manageInventory('equip', { index }),
      (slot: string, index?: number) => this.domain.manageInventory('unequip', index !== undefined ? { slot, index } : { slot }),
      (action: 'unlock' | 'changeClass' | 'equip', payload: any) => this.domain.manageSkillTree(action, payload),
      (attribute: string) => this.domain.allocateAttribute(attribute),
      () => {
        logger.log('domain', 'Restarting game via UI command...');
        window.location.href = window.location.pathname; // Força recarregamento limpo escapando do Vite
      },
      (index: number) => this.domain.manageInventory('delete', { index }),
      (message: string, npcId?: number) => this.domain.sendDialogue(message, npcId)
    );
    this.inputGateway = new InputGateway(this.domain);
    this.setupEventListeners();
    
    const canvas = new Canvas(document.body, 0, 0);
    
    this.camera = new Camera(canvas, 3);
    
    try {
      this.renderer = new WebGPURenderer(canvas, this.camera);
      await this.renderer.initialize();
      logger.log('init', 'Successfully initialized WebGPU renderer.');
    } catch (error) {
      logger.log('error', `WebGPU initialization failed: ${(error as Error).message}. Falling back to Canvas 2D renderer.`);
      this.renderer = new Renderer(canvas, this.camera);
      await this.renderer.initialize(); // O initialize do Renderer antigo é síncrono, mas o await não causa problemas.
      logger.log('init', 'Initialized Canvas 2D renderer and loaded map.');
    }

    this.sceneManager = new SceneManager(this.renderer, this.isDebugMode);
    await this.sceneManager.initialize();

    logger.log('init', 'All assets preloaded.');
    
    const engineWorlds = [
        { id: 'cemii', name: 'Cemii', cx: 150, cy: 300, scale: 1.0, path: 'M 100 200 L 150 200 L 200 250 L 200 350 L 150 400 L 100 350 Z' },
        { id: 'vilgem', name: 'Vilgem', cx: 400, cy: 320, scale: 1.0, path: 'M 300 220 L 450 220 L 500 280 L 500 400 L 400 450 L 300 400 Z' },
        { id: 'alun', name: 'Alun', cx: 650, cy: 300, scale: 1.0, path: 'M 600 200 L 700 200 L 750 280 L 700 380 L 600 350 Z' }
    ];

    // O Jogo só começa quando o botão TELEtrans é clicado na aba do mapa!
    new MainMenuGui(async (mapId) => {
        logger.log('init', `Map selected: ${mapId}. Instructing domain to generate world...`);
        
        // Lemos o JSON desenhado no Polygon Web Editor
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
        await this.domain.loadWorld(mapId, collisionData);
        
        // 2. Lemos o DTO do mundo recém-gerado
        const { world } = this.domain.getRenderState();
        
        // 3. Se estivermos no Canvas2D, carregamos a imagem física correspondente ao mapId
        if (this.renderer instanceof Renderer) {
            this.map = new GameMap(world.mapId);
        }

        this.isGameStarted = true;
        this.togglePauseGame(); // Descongela a lógica com segurança
        initializeGame(this.update.bind(this), this.draw.bind(this));
    }, engineWorlds);
    window.dispatchEvent(new Event('resize'));
  }

  /** Fase de Update (Lógica do Adapter): Função principal do ciclo de vida, chamada a cada frame para processar inputs, delegar a atualização de lógica para o domínio, sincronizar o estado visual e atualizar a câmera. @private @param deltaTime O tempo em segundos desde o último frame. */
  private update(deltaTime: number): void {
    Telemetry.performance.recordFrame(deltaTime * 1000);
    Telemetry.profiler.start('Engine Update Total');
    
    if (this.inputGateway.inputManager.consumeAction('interact')) {
      this.uiManager.handleInteract();
    }

    if (this.inputGateway.inputManager.consumeAction('toggle_attributes')) {
      this.uiManager.toggleCharacterMenu();
    }

    if (this.inputGateway.inputManager.consumeAction('toggle_skill_tree')) {
      this.uiManager.toggleSkillTree();
    }

    const mousePos = this.inputGateway.inputManager.mouseLastCoordinates;
    const mouseWorldPos = this.screenToWorld(mousePos.x, mousePos.y);

    if (!this.isPaused) {
      Telemetry.profiler.start('Domain Math & Physics');
      this.handlePlayerInteractions();
      this.domain.update(deltaTime);
      Telemetry.profiler.end('Domain Math & Physics');
      this.sceneManager.updateAnimations(deltaTime, mouseWorldPos);
    }

    // Requisita o DTO do domínio apenas UMA vez por frame para garantir Zero-GC e performance!
    Telemetry.profiler.start('Render State Sync');
    this.currentFrameState = this.domain.getRenderState();
    this.syncScene(this.currentFrameState);
    Telemetry.profiler.end('Render State Sync');

    const playerState = this.currentFrameState.renderables.find(r => r.id === 1);
    
    let playerScreenPos = { x: 0, y: 0 };
    if (playerState) {
        playerScreenPos = this.worldToScreen(playerState.coordinates.x + playerState.size.width / 2, playerState.coordinates.y + playerState.size.height / 2);
    }
    this.uiManager.update(playerState, playerScreenPos, mousePos);

    Telemetry.activeEntities = this.currentFrameState.renderables.length;
    Telemetry.profiler.end('Engine Update Total');
  }

  /** Fase de Desenho: Função final do ciclo de vida, chamada a cada frame após o `update` para delegar a responsabilidade de desenhar o frame atual para o `Renderer`. */
  private async draw(): Promise<void> {
    if (!this.currentFrameState) return;
    logger.log('render', 'Drawing frame...');
    Telemetry.profiler.start('GPU Render Pipeline');

    const domainState = this.currentFrameState;
    const cameraTarget = domainState.renderables.find(r => r.id === 1); 

    if (this.renderer instanceof WebGPURenderer) {
      // Lógica para WebGPU
      // Evita o spread operator clonando superficialmente apenas o array base
      const sortedRenderables = [...domainState.renderables];

      // Adiciona os efeitos transientes para WebGPU
      for (const visual of this.sceneManager.transientVisuals.values()) {
        sortedRenderables.push(visual.state);
      }
      
      // Aplica ordenação espacial (Y-Sorting) para criar ilusão de profundidade (pseudo-3D)
      sortedRenderables.sort((a, b) => (a.coordinates.y + a.size.height) - (b.coordinates.y + b.size.height));

      const webGpuDomainState = { world: domainState.world, renderables: sortedRenderables };
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
      this.canvasRenderBuffer.sort((a, b) => (a.coordinates.y + a.size.height) - (b.coordinates.y + b.size.height));

      // Adiciona elementos que devem estar sempre no topo (Partículas e Debug)
      this.canvasRenderBuffer.push(this.sceneManager.particleOrchestrator);
      if (this.isDebugMode) for (const d of this.sceneManager.debugRenderables.values()) this.canvasRenderBuffer.push(d);

      // Passa a lista de objetos visuais (IRenderableObject) para o renderer antigo.
      const canvasDomainState = { world: domainState.world, renderables: this.canvasRenderBuffer };
      await (this.renderer as Renderer).drawFrame(canvasDomainState, cameraTarget, undefined, this.map);
    }
    Telemetry.profiler.end('GPU Render Pipeline');
  }

  //? ----------- Main Methods -----------

  private isReloading :boolean = false;
  private setupEventListeners(): void {
    this.eventManager.on('playerDied', () => {
      logger.log('domain', 'Player has died. Showing Game Over screen...');
      if(!this.isReloading){ 
        this.isPaused = true; // Congela as entidades no fundo
        this.inputGateway.inputManager.setPreventUnload(false); // Desativa o aviso antes de recarregar
        this.uiManager.showGameOver();
      }
    });

    // Escuta quando a LLM gera uma fala para os NPCs e ativa a janela de diálogo
    this.eventManager.on('npcSpoke', (payload) => {
      if (!this.isGameStarted) return; // Previne que a IA fale enquanto o Menu Principal estiver aberto
      
      const npcName = payload.npcName || "Desconhecido";
      this.uiManager.dialogueGui.show(npcName, payload.message, payload.npcId);
    });

    this.eventManager.on('spawnVisual', (payload) => {
      this.sceneManager.addVisualEffect(payload);
    });

    this.eventManager.on('levelUp', (payload) => {
      // Envia a cor Azul Mágico para o efeito de Level Up
      this.eventManager.dispatch('particle', { effect: 'levelUp', x: payload.coordinates.x, y: payload.coordinates.y, color: '#00aaff' });
    });

    // Ouvinte oficial do sistema de partículas semântico!
    this.eventManager.on('particle', (payload) => {
      this.sceneManager.particleOrchestrator.executeEffect(payload);
    });
  }

  /** Fase de Update (Sincronização): Compara o estado do domínio com os objetos visuais (`IRenderable`), criando/atualizando-os para refletir o estado atual do jogo. @private @async */
  private syncScene(domainState: { world: any; renderables: readonly any[] }): void {
    logger.log('sync', 'Syncing renderables...');
    this.sceneManager.syncRenderables(domainState.renderables);
  }

  /** Fase de Update (Input): Verifica as teclas atualmente pressionadas e traduz em chamadas para `domain.handlePlayerMovement`, passando o `deltaTime` para garantir um movimento consistente. @private @param deltaTime O tempo em segundos desde o último frame. */
  private handlePlayerInteractions(): void {
    this.inputGateway.handleInteractions((screenX, screenY) => this.screenToWorld(screenX, screenY));
  }

  /** * Converte as coordenadas de clique da tela (pixels do canvas) para as coordenadas do mundo do jogo. * @param screenX Coordenada X do clique (e.g., event.clientX). * @param screenY Coordenada Y do clique (e.g., event.clientY). * @returns Um objeto com as coordenadas do mundo { worldX, worldY }. */
  private screenToWorld(screenX: number, screenY: number): { x: number, y: number } {

    const zoom = this.camera.zoom;
    const { world } = this.domain.getRenderState();
    const playerRenderable = this.sceneManager.renderables.get(1);

    // Define um alvo padrão se o jogador não existir, evitando duplicação de código.
    const target = playerRenderable 
        ? { coordinates: playerRenderable.coordinates, size: playerRenderable.size }
        : { coordinates: { x: 0, y: 0 }, size: { width: 0, height: 0 } };

    const viewWidth = this.renderer.canvas.element.width / zoom;
    const viewHeight = this.renderer.canvas.element.height / zoom;

    const camX = (target.coordinates.x + target.size.width / 2) - viewWidth / 2;
    const camY = (target.coordinates.y + target.size.height / 2) - viewHeight / 2;

    const clampedCamX = Math.max(0, Math.min(camX, world.width - viewWidth));
    const clampedCamY = Math.max(0, Math.min(camY, world.height - viewHeight));
    
    return { x: (screenX / zoom) + clampedCamX, y: (screenY / zoom) + clampedCamY };
  }

  private worldToScreen(worldX: number, worldY: number): { x: number, y: number } {
    const zoom = this.camera.zoom;
    const { world } = this.domain.getRenderState();
    const playerRenderable = this.sceneManager.renderables.get(1);

    const target = playerRenderable 
        ? { coordinates: playerRenderable.coordinates, size: playerRenderable.size }
        : { coordinates: { x: 0, y: 0 }, size: { width: 0, height: 0 } };

    const viewWidth = this.renderer.canvas.element.width / zoom;
    const viewHeight = this.renderer.canvas.element.height / zoom;

    const camX = (target.coordinates.x + target.size.width / 2) - viewWidth / 2;
    const camY = (target.coordinates.y + target.size.height / 2) - viewHeight / 2;

    const clampedCamX = Math.max(0, Math.min(camX, world.width - viewWidth));
    const clampedCamY = Math.max(0, Math.min(camY, world.height - viewHeight));
    
    return { x: (worldX - clampedCamX) * zoom, y: (worldY - clampedCamY) * zoom };
  }
}
