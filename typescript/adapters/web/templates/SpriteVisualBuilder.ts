import type { SpriteConfig, RenderAnchor } from "../components/renderModule/visuals/GameObjectElement";

/**
 * ==============================================================================
 * BUILDER FLUENTE DE CONFIGURAÇÃO DE SPRITES (SpriteVisualBuilder)
 * ==============================================================================
 * Elimina o trabalho manual de calcular frames, proporções e pontos pivô,
 * gerando um `SpriteConfig` perfeitamente compatível com o `GameObjectElement` e
 * com o WebGPU Texture Atlas.
 * ==============================================================================
 */
export class SpriteVisualBuilder {
  private config: SpriteConfig = {
    imageSrc: '',
    frameCount: 1,
    animationSpeed: 8,
    frameWidth: 32,
    frameHeight: 32,
    anchor: 'center'
  };

  public static create(imageSrc: string): SpriteVisualBuilder {
    const builder = new SpriteVisualBuilder();
    builder.config.imageSrc = imageSrc;
    return builder;
  }

  public frames(count: number, width: number, height: number): this {
    this.config.frameCount = count;
    this.config.frameWidth = width;
    this.config.frameHeight = height;
    return this;
  }

  public speed(ticksPerFrame: number): this {
    this.config.animationSpeed = ticksPerFrame;
    return this;
  }

  public anchor(anchor: RenderAnchor): this {
    this.config.anchor = anchor;
    return this;
  }

  public spriteSize(width: number, height: number): this {
    this.config.spriteSize = { width, height };
    return this;
  }

  public renderOffset(x: number, y: number): this {
    this.config.renderOffset = { x, y };
    return this;
  }

  public animatedOffset(offsets: { x: number, y: number }[]): this {
    this.config.renderOffset = offsets;
    return this;
  }

  public rotationOffset(radians: number): this {
    this.config.rotationOffset = radians;
    return this;
  }

  public atlasOffset(x: number, y: number): this {
    this.config.atlasOffset = { x, y };
    return this;
  }

  public build(): SpriteConfig {
    return { ...this.config };
  }
}

export default SpriteVisualBuilder;
