/** @file Contém a classe Camera, responsável por gerenciar a viewport do jogo (zoom, posicionamento e seguir um alvo). */
import type { WorldState } from "../../../../../domain/ports/domain-contracts"; 
import type Canvas from "../engine/Canvas";
import type IRenderable from "../visuals/IRenderable";

/** @class Camera Gerencia a viewport do jogo. Seu papel é calcular a translação e o zoom necessários para seguir um objeto alvo (`IRenderable`) e garantir que a visão não ultrapasse os limites do mundo. */
export default class Camera {
  private canvas: Canvas;
  private target: IRenderable | null = null;
  /** Zoom de referência pedido pelo jogo, em pixels de tela por pixel do mundo numa tela com escala de 100%. */
  public baseZoom: number;
  private camX:number = 0;
  private camY:number = 0;

  /** @constructor @param canvas A instância do `Canvas` cujas dimensões definem a viewport. @param zoom O nível de magnificação inicial da câmera (em escala de 100%). */
  constructor(canvas: Canvas, zoom: number = 1) {
    this.canvas = canvas;
    this.baseZoom = zoom;
  }

  /** Quantos pixels físicos do buffer cada pixel do mundo ocupa. Sempre inteiro (para zoom >= 1), para que cada pixel da pixel art vire um bloco uniforme na tela. Ex: zoom 3 com escala de 125% do Windows -> round(3.75) = 4. */
  public get renderScale(): number {
    const ratio = this.canvas.pixelRatio || 1;
    const scaled = this.baseZoom * ratio;
    return scaled >= 1 ? Math.round(scaled) : scaled;
  }

  /** Zoom efetivo em pixels CSS por pixel do mundo (mesmo sistema de coordenadas do mouse). Usado para converter coordenadas de tela <-> mundo. */
  public get zoom(): number {
    return this.renderScale / (this.canvas.pixelRatio || 1);
  }

  public set zoom(value: number) {
    this.baseZoom = value;
  }

  /** Fase de Update: Define o objeto `IRenderable` que a câmera deve seguir. Geralmente chamado a cada frame para rastrear o jogador. @param target O objeto a ser seguido. */
  public setTarget(target: IRenderable): void {
    this.target = target;
  }

  /** Fase de Desenho: Calcula e aplica as transformações de translação e escala ao contexto do canvas para centralizar o alvo e aplicar o zoom, restringindo a visão aos limites do mundo. @param ctx O contexto de renderização 2D onde a transformação será aplicada. @param world O estado do mundo, usado para obter os limites para o clamping da câmera. */
  public applyTransform(ctx: CanvasRenderingContext2D, world: WorldState): void {
    if (!this.target) return;

    const scale = this.renderScale;
    const viewWidth = this.canvas.element.width / scale;
    const viewHeight = this.canvas.element.height / scale;

    let camX = (this.target.coordinates.x + this.target.size.width / 2) - viewWidth / 2;
    let camY = (this.target.coordinates.y + this.target.size.height / 2) - viewHeight / 2;

    const minX = world.bounds?.minX ?? world.minX ?? 0;
    const minY = world.bounds?.minY ?? world.minY ?? 0;
    const maxX = world.bounds?.maxX ?? world.maxX ?? (minX + world.width);
    const maxY = world.bounds?.maxY ?? world.maxY ?? (minY + world.height);
    const totalW = maxX - minX;
    const totalH = maxY - minY;

    const clampedCamX = totalW < viewWidth 
      ? minX + (totalW - viewWidth) / 2 
      : Math.max(minX, Math.min(camX, maxX - viewWidth));
    const clampedCamY = totalH < viewHeight 
      ? minY + (totalH - viewHeight) / 2 
      : Math.max(minY, Math.min(camY, maxY - viewHeight));

    //! Encaixa a câmera na grade de pixels físicos: sem isso, posições fracionárias deslocam as bordas dos pixels a cada frame
    const snappedCamX = Math.round(clampedCamX * scale) / scale;
    const snappedCamY = Math.round(clampedCamY * scale) / scale;

    this.camX = snappedCamX;
    this.camY = snappedCamY;

    ctx.scale(scale, scale);
    ctx.translate(-snappedCamX, -snappedCamY);
  }

  /** Verifica se uma caixa delimitadora no mundo está dentro da área visível da câmera (Frustum Culling). */
  public isInViewport(x: number, y: number, width: number, height: number, padding: number = 128): boolean {
    const scale = this.renderScale;
    const viewWidth = this.canvas.element.width / scale;
    const viewHeight = this.canvas.element.height / scale;

    const minX = this.camX - padding;
    const maxX = this.camX + viewWidth + padding;
    const minY = this.camY - padding;
    const maxY = this.camY + viewHeight + padding;

    return x + width >= minX && x <= maxX && y + height >= minY && y <= maxY;
  }
}