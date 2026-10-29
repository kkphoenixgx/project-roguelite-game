import type { EntityRenderableState } from "../../../../../domain/ports/domain-contracts";
import type IRenderableObject from "../visuals/IRenderable";
import { RenderableFactory } from "./RenderableFactory";
import DebugCircle from "../customRenderables/DebugCircle";
import DebugPolygon from "../customRenderables/DebugPolygon";
import DebugRectangle from "../customRenderables/DebugRectangle";
import { AnimationManager } from "../visuals/AnimationManager";
import WebGPURenderer from "../engine/WebGPURenderer";
import { RenderRegistry } from "../../../shared/RenderRegistry";
import type IRenderer from "../engine/IRenderer";
import ParticleOrchestrator from "../particlesModule/ParticleOrchestrator";

/** @class SceneManager Gerencia as instâncias visuais e a sincronização entre o estado do Domínio e as entidades gráficas na tela. */
export default class SceneManager {
  public renderables: Map<number, IRenderableObject> = new Map();
  public debugRenderables: Map<number, IRenderableObject> = new Map();
  public animationManagers: Map<number, AnimationManager> = new Map();
  private activeIds = new Set<number>();
  private activeDebugIds = new Set<number>();
  private renderableFactory: RenderableFactory;
  
  public transientVisuals: Map<number, { state: EntityRenderableState, renderable?: IRenderableObject, animationManager?: AnimationManager, timeRemaining: number }> = new Map();
  private nextTransientId: number = -1;
  
  public particleOrchestrator: ParticleOrchestrator;

  constructor(private renderer: IRenderer<any>, private isDebugMode: boolean) {
    this.renderableFactory = new RenderableFactory();
    this.particleOrchestrator = new ParticleOrchestrator();
  }

  public async initialize(): Promise<void> {
    await this.renderableFactory.preloadAssets();
  }

  public setDebugMode(debug: boolean): void {
    this.isDebugMode = debug;
    if (!debug) {
      this.debugRenderables.clear();
      this.activeDebugIds.clear();
    }
  }

  public get isDebugModeActive(): boolean {
    return this.isDebugMode;
  }

  /** Limpa todos os efeitos visuais transitórios e partículas ativas da cena. */
  public clearTransientVisuals(): void {
    for (const id of this.transientVisuals.keys()) {
      if (this.debugRenderables.has(id)) this.debugRenderables.delete(id);
    }
    this.transientVisuals.clear();
    this.particleOrchestrator.clear();
  }

  public updateAnimations(deltaTime: number, mouseWorldPos?: {x: number, y: number}): void {
    this.particleOrchestrator.updateAnimations(deltaTime);

    for (const animManager of this.animationManagers.values()) {
      animManager.update(deltaTime);
    }

    const playerRenderable = this.renderables.get(1);

    for (const [id, visual] of this.transientVisuals.entries()) {
      visual.timeRemaining -= deltaTime;
      if (visual.timeRemaining <= 0) {
        this.transientVisuals.delete(id);
        if (this.debugRenderables.has(id)) this.debugRenderables.delete(id);
      } else {
        if (visual.animationManager) {
            visual.animationManager.update(deltaTime);
        }
        
        //? Vincula VFX à entidade e orienta rotação continuamente em direção ao cursor do mouse
        const config = RenderRegistry.spriteConfigs.get(`${visual.state.entityTypeId}-active`) || RenderRegistry.spriteConfigs.get(`${visual.state.entityTypeId}-travelling`);
        if (playerRenderable && config && config.anchor && config.anchor !== 'center') {
            const pCenterX = playerRenderable.coordinates.x + playerRenderable.size.width / 2;
            const pCenterY = playerRenderable.coordinates.y + playerRenderable.size.height / 2;

            let anchorX = 0.0;
            let anchorY = 0.0;
            switch(config.anchor) {
                case 'top-left': anchorX = -0.5; anchorY = -0.5; break;
                case 'top-right': anchorX = 0.5; anchorY = -0.5; break;
                case 'bottom-left': anchorX = -0.5; anchorY = 0.5; break;
                case 'bottom-right': anchorX = 0.5; anchorY = 0.5; break;
                case 'center-left': anchorX = -0.5; anchorY = 0.0; break;
                case 'center-right': anchorX = 0.5; anchorY = 0.0; break;
                case 'top-center': anchorX = 0.0; anchorY = -0.5; break;
                case 'bottom-center': anchorX = 0.0; anchorY = 0.5; break;
            }

            visual.state.coordinates.x = pCenterX - (visual.state.size.width / 2) - (anchorX * visual.state.size.width);
            visual.state.coordinates.y = pCenterY - (visual.state.size.height / 2) - (anchorY * visual.state.size.height);

            if (mouseWorldPos) {
                visual.state.rotation = Math.atan2(mouseWorldPos.y - pCenterY, mouseWorldPos.x - pCenterX);
            }

            if (visual.renderable) {
                visual.renderable.updateState(visual.state);
            }
            if (this.isDebugMode && this.debugRenderables.has(id)) {
                this.debugRenderables.get(id)!.updateState(visual.state);
            }
        }
      }
    }
  }

  public addVisualEffect(payload: { type: string, coordinates: {x:number, y:number}, duration: number, size: {width:number, height:number}, rotation?: number, direction?: {x:number, y:number} }): void {
    let finalRotation = payload.rotation || 0;
    if (payload.direction) {
        finalRotation = Math.atan2(payload.direction.y, payload.direction.x);
    }

    //? Alinha a âncora visual do sprite com as coordenadas de origem enviadas pelo Domínio
    let anchor: any = 'center';
    const config = RenderRegistry.spriteConfigs.get(`${payload.type}-active`) || RenderRegistry.spriteConfigs.get(`${payload.type}-travelling`);
    if (config && config.anchor) {
        anchor = config.anchor;
    }

    let anchorX = 0.0;
    let anchorY = 0.0;
    switch(anchor) {
        case 'top-left': anchorX = -0.5; anchorY = -0.5; break;
        case 'top-right': anchorX = 0.5; anchorY = -0.5; break;
        case 'bottom-left': anchorX = -0.5; anchorY = 0.5; break;
        case 'bottom-right': anchorX = 0.5; anchorY = 0.5; break;
        case 'center-left': anchorX = -0.5; anchorY = 0.0; break;
        case 'center-right': anchorX = 0.5; anchorY = 0.0; break;
        case 'top-center': anchorX = 0.0; anchorY = -0.5; break;
        case 'bottom-center': anchorX = 0.0; anchorY = 0.5; break;
    }

    //? O Domínio envia o Top-Left da caixa; calcula o centro real geométrico no mundo
    let targetCenterX = payload.coordinates.x + payload.size.width / 2;
    let targetCenterY = payload.coordinates.y + payload.size.height / 2;

    const playerRenderable = this.renderables.get(1);
    if (playerRenderable) {
        const pCenterX = playerRenderable.coordinates.x + playerRenderable.size.width / 2;
        const pCenterY = playerRenderable.coordinates.y + playerRenderable.size.height / 2;
        
        //? Para VFX com ancoragem corporal, centraliza o pivô visual exatamente no centro da entidade
        if (config?.anchor && config.anchor !== 'center') {
            targetCenterX = pCenterX;
            targetCenterY = pCenterY;
        } else if (payload.coordinates.x === playerRenderable.coordinates.x && payload.coordinates.y === playerRenderable.coordinates.y) {
            targetCenterX = pCenterX;
            targetCenterY = pCenterY;
        }
    }

    //? Calcula o novo Top-Left da sprite para que a âncora caia milimetricamente no alvo
    const topLeftX = targetCenterX - (payload.size.width / 2) - (anchorX * payload.size.width);
    const topLeftY = targetCenterY - (payload.size.height / 2) - (anchorY * payload.size.height);

    const state: EntityRenderableState = {
      id: this.nextTransientId--,
      entityTypeId: payload.type as any,
      coordinates: { x: topLeftX, y: topLeftY },
      size: payload.size,
      rotation: finalRotation,
      state: 'active'
    };

    const transientData: any = { state, timeRemaining: payload.duration };

    if (this.renderer instanceof WebGPURenderer) {
      const config = this.renderer.getSpriteConfig(state.entityTypeId, state.state);
      if (config) {
        transientData.animationManager = new AnimationManager(config);
      }
    } else {
      const renderable = this.renderableFactory.create(state);
      if (renderable) {
        transientData.renderable = renderable;
      }
    }

    this.transientVisuals.set(state.id, transientData);

    if (this.isDebugMode) {
        let anchor: any = 'center';
        let rotationOffset: number = 0;
        if (this.renderer instanceof WebGPURenderer) {
            const config = this.renderer.getSpriteConfig(state.entityTypeId, state.state);
            if (config) { anchor = config.anchor; rotationOffset = config.rotationOffset || 0; }
        } else if (transientData.renderable) {
            const config = (transientData.renderable as any).config;
            if (config) { anchor = config.anchor; rotationOffset = config.rotationOffset || 0; }
        }
        this.debugRenderables.set(state.id, new DebugRectangle(state.id, state, anchor, rotationOffset));
    }
  }

  /** Compara o estado do domínio com os objetos visuais, criando/atualizando-os. */
  public syncRenderables(domainStates: readonly EntityRenderableState[]): void {
    this.activeIds.clear();
    this.activeDebugIds.clear();

    for (const state of domainStates) {
      this.activeIds.add(state.id);
      
      //? Emite partículas elementais contínuas vinculadas à entidade quando houver elementos ativos
      if (state.spellElements && state.spellElements.length > 0) {
          const centerX = state.coordinates.x + state.size.width / 2;
          const centerY = state.coordinates.y + state.size.height / 2;
          this.particleOrchestrator.dynamicSpellTrail(centerX, centerY, state.spellElements);
      }

      if (this.renderer instanceof WebGPURenderer) {
        if (this.animationManagers.has(state.id)) {
          const config = this.renderer.getSpriteConfig(state.entityTypeId, state.state);
          if (config) {
            this.animationManagers.get(state.id)!.setConfig(config);
          }
        } else {
          const config = this.renderer.getSpriteConfig(state.entityTypeId, state.state);
          if (config) {
            this.animationManagers.set(state.id, new AnimationManager(config));
          }
        }
      } else {
        if (this.renderables.has(state.id)) {
          this.renderables.get(state.id)!.updateState(state);
        } else {
          const newRenderable = this.renderableFactory.create(state);
          if (newRenderable) {
            this.renderables.set(state.id, newRenderable);
          }
        }
      }

      if (this.isDebugMode) {
        state.hitboxes?.forEach((hitboxState, index) => {
          //! Otimização Zero-GC: hash numérico com bitwise shift substitui interpolação de string
          const debugId = (state.id << 4) | index;
          this.activeDebugIds.add(debugId);

          if (this.debugRenderables.has(debugId)) {
            this.debugRenderables.get(debugId)!.updateState(hitboxState);
          } else {
            if (hitboxState.type === 'circle') {
              this.debugRenderables.set(debugId, new DebugCircle(state.id, hitboxState));
            } else if (hitboxState.type === 'polygon') {
              this.debugRenderables.set(debugId, new DebugPolygon(state.id, hitboxState));
            }
          }
        });
      }
    }

    if (this.renderer instanceof WebGPURenderer) {
      for (const id of this.animationManagers.keys()) {
        if (!this.activeIds.has(id)) this.animationManagers.delete(id);
      }
    } else {
      for (const id of this.renderables.keys()) {
        if (!this.activeIds.has(id)) this.renderables.delete(id);
      }
    }
    if (this.isDebugMode) {
      for (const id of this.debugRenderables.keys()) {
        //? IDs transitórios de VFX são preservados da limpeza de entidades ativas
        if (id >= 0 && !this.activeDebugIds.has(id)) {
            this.debugRenderables.delete(id);
        }
      }
    }
  }
}