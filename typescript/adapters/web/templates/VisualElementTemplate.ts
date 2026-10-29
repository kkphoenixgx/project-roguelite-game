import type { SpriteConfig } from "../components/renderModule/visuals/GameObjectElement";
import GameObjectElement from "../components/renderModule/visuals/GameObjectElement";
import type { EntityRenderableState } from "../../../domain/ports/domain-contracts";

/**
 * ==============================================================================
 * CLASSE BASE CANÔNICA PARA RENDERÁVEIS VISUAIS CUSTOMIZADOS
 * ==============================================================================
 * Simplifica a criação de elementos gráficos no mundo 2D, provendo atualização
 * in-place de estado e integração perfeita com a câmera e com o pipeline de render.
 * ==============================================================================
 */
export abstract class VisualElementTemplate extends GameObjectElement {
  constructor(
    initialState: EntityRenderableState,
    initialConfig?: SpriteConfig,
    initialImage?: HTMLImageElement
  ) {
    super(initialState, initialConfig, initialImage);
  }

  /**
   * Atualização padrão a partir do DTO de domínio emitido pelo motor.
   */
  public override updateState(newState: EntityRenderableState): void {
    this.coordinates.x = newState.coordinates.x;
    this.coordinates.y = newState.coordinates.y;
    this.size.width = newState.size.width;
    this.size.height = newState.size.height;
    if (newState.rotation !== undefined) {
      this.rotation = newState.rotation;
    }
  }

  /**
   * Hook customizável para desenhar efeitos adicionais sob ou sobre o sprite.
   */
  public override draw(ctx: CanvasRenderingContext2D): void {
    this.preDraw(ctx);
    super.draw(ctx);
    this.postDraw(ctx);
  }

  protected preDraw(_ctx: CanvasRenderingContext2D): void {}
  protected postDraw(_ctx: CanvasRenderingContext2D): void {}
}

export default VisualElementTemplate;
