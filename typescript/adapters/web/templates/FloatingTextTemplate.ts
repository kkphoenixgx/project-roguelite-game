export type FloatingTextStyle = 'damage' | 'crit' | 'heal' | 'dodge' | 'poison' | 'mana' | 'xp' | 'levelUp';

export interface FloatingTextConfig {
  x: number;
  y: number;
  text: string;
  style?: FloatingTextStyle;
  duration?: number;
  color?: string;
  fontSize?: number;
  driftX?: number;
  bounce?: boolean;
}

/**
 * ==============================================================================
 * BUILDER E GABARITO DE TEXTO FLUTUANTE (FloatingTextBuilder)
 * ==============================================================================
 * Padroniza números de dano, cura, status e popups no Canvas com interpolação
 * suave, arco de subida, bounce de impacto e zero impacto no DOM.
 * ==============================================================================
 */
export class FloatingTextBuilder {
  private config: FloatingTextConfig = {
    x: 0,
    y: 0,
    text: '',
    style: 'damage',
    duration: 0.9,
    bounce: true
  };

  public static at(x: number, y: number): FloatingTextBuilder {
    const builder = new FloatingTextBuilder();
    builder.config.x = x;
    builder.config.y = y;
    return builder;
  }

  public text(content: string | number): this {
    this.config.text = String(content);
    return this;
  }

  public style(type: FloatingTextStyle): this {
    this.config.style = type;
    return this;
  }

  public duration(seconds: number): this {
    this.config.duration = seconds;
    return this;
  }

  public color(colorCode: string): this {
    this.config.color = colorCode;
    return this;
  }

  public fontSize(sizePx: number): this {
    this.config.fontSize = sizePx;
    return this;
  }

  public withDrift(driftX: number): this {
    this.config.driftX = driftX;
    return this;
  }

  public build(): FloatingTextConfig {
    return { ...this.config };
  }
}

/**
 * Entidade de renderização efêmera para textos flutuantes no SceneManager/Canvas.
 */
export class FloatingTextEntity {
  public x: number;
  public y: number;
  public initialY: number;
  public text: string;
  public style: FloatingTextStyle;
  public duration: number;
  public elapsed: number = 0;
  public isDead: boolean = false;
  public color: string;
  public fontSize: number;
  public driftX: number;

  constructor(config: FloatingTextConfig) {
    this.x = config.x;
    this.y = config.y;
    this.initialY = config.y;
    this.text = config.text;
    this.style = config.style ?? 'damage';
    this.duration = config.duration ?? 0.9;
    this.driftX = config.driftX ?? (Math.random() * 20 - 10);

    const styleDefaults = this.resolveStyle(this.style);
    this.color = config.color ?? styleDefaults.color;
    this.fontSize = config.fontSize ?? styleDefaults.fontSize;
  }

  private resolveStyle(style: FloatingTextStyle): { color: string; fontSize: number } {
    switch (style) {
      case 'crit': return { color: '#ffea00', fontSize: 20 };
      case 'heal': return { color: '#00ff88', fontSize: 16 };
      case 'dodge': return { color: '#76ffff', fontSize: 14 };
      case 'poison': return { color: '#99ff33', fontSize: 15 };
      case 'mana': return { color: '#3399ff', fontSize: 15 };
      case 'xp': return { color: '#d4af37', fontSize: 14 };
      case 'levelUp': return { color: '#ffd700', fontSize: 24 };
      default: return { color: '#ffffff', fontSize: 16 };
    }
  }

  public update(deltaTime: number): void {
    this.elapsed += deltaTime;
    if (this.elapsed >= this.duration) {
      this.isDead = true;
      return;
    }

    const t = this.elapsed / this.duration; // 0.0 -> 1.0
    // Subida com desaceleração e pequeno arco
    const rise = (1 - Math.pow(1 - t, 2)) * 40;
    this.y = this.initialY - rise;
    this.x += (this.driftX * deltaTime);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.isDead) return;

    const t = this.elapsed / this.duration;
    const alpha = Math.max(0, 1 - Math.pow(t, 2));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${this.fontSize}px 'PixelArtFont', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Borda preta de contraste para legibilidade em qualquer fundo
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(this.text, this.x, this.y);

    // Preenchimento com cor vibrante
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);

    ctx.restore();
  }
}

export default FloatingTextBuilder;
