/** @file Contém a classe `Renderer`, responsável por desenhar o estado do jogo no canvas a cada frame. */
import type { EntityRenderableState, WorldState } from "../../../../../domain/ports/domain-contracts";
import type Camera from "../scene/Camera";
import type Canvas from "./Canvas";
import type IRenderableObject from "../visuals/IRenderable";
import type IRenderer from "./IRenderer";
import type GameMap from "../scene/Map";
import type { AnimationManager } from "../visuals/AnimationManager";

/** @class Renderer Orquestra o processo de desenho no canvas 2D. Ele interage com a `Câmera` para aplicar transformações de viewport e itera sobre os objetos `IRenderable` para desenhar um frame completo. */
export default class Renderer implements IRenderer<IRenderableObject> {
  public canvas: Canvas;
  private camera: Camera;
  public lastDrawnCount: number = 0;
  public lastCulledCount: number = 0;

  /** @constructor @param canvas A instância do `Canvas` onde o desenho ocorrerá. @param camera A instância da `Câmera` que define a viewport. */
  constructor(canvas: Canvas, camera: Camera) {
    this.canvas = canvas;
    this.camera = camera;
  }

  public async initialize(): Promise<void> {
    // O renderizador Canvas 2D não precisa de inicialização assíncrona,
    // então apenas retornamos uma promessa resolvida.
    return Promise.resolve();
  }

  /** Fase de Desenho: Limpa o canvas completamente, preparando-o para o desenho do próximo frame. */
  public clear(): void {
    this.canvas.clear();
  }

  /** Fase de Desenho: Orquestra o desenho de um único frame, aplicando a transformação da câmera e delegando o desenho do mapa e de cada objeto `IRenderable`. @param map O mapa do jogo a ser desenhado. @param world O estado do mundo, usado pela câmera. @param renderables Uma lista de objetos `IRenderable` a serem desenhados. */
  public async drawFrame(
    domainState: { world: WorldState; renderables: readonly IRenderableObject[] },
    cameraTarget: EntityRenderableState | undefined,
    animationManagers?: Map<number, AnimationManager>,
    map?: GameMap
  ): Promise<void> {
    const { ctx } = this.canvas;
    const { world, renderables } = domainState;

    ctx.save();
    this.camera.applyTransform(ctx, world);
    
    // Pixel-art nítido e renderização ultrarrápida: desativa interpolação pesada na CPU
    ctx.imageSmoothingEnabled = false;

    // Desenha a matriz dinâmica de 9 chunks em volta do jogador
    let targetX = 0; let targetY = 0;
    if (cameraTarget) {
        targetX = cameraTarget.coordinates.x + cameraTarget.size.width / 2;
        targetY = cameraTarget.coordinates.y + cameraTarget.size.height / 2;
    }
    map?.draw(ctx, targetX, targetY, this.camera);
    
    // Frustum Culling: Renderiza apenas objetos dentro da viewport da câmera (Zero-GC loop)
    this.lastDrawnCount = 0;
    this.lastCulledCount = 0;

    for (let i = 0; i < renderables.length; i++) {
      const renderable = renderables[i]!;
      if (renderable.id === -999999) {
        renderable.draw(ctx);
        this.lastDrawnCount++;
        continue;
      }
      if (renderable.coordinates && renderable.size) {
        if (!this.camera.isInViewport(
          renderable.coordinates.x,
          renderable.coordinates.y,
          renderable.size.width,
          renderable.size.height,
          128
        )) {
          this.lastCulledCount++;
          continue;
        }
      }
      renderable.draw(ctx);
      this.lastDrawnCount++;
    }

    ctx.restore();
  }
}