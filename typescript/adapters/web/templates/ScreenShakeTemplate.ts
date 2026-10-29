export interface ScreenShakeConfig {
  intensity: number;
  duration: number;
  decay?: 'linear' | 'exponential';
  frequency?: number;
}

/**
 * ==============================================================================
 * BUILDER E CONTROLADOR DE SCREEN SHAKE (ScreenShakeBuilder)
 * ==============================================================================
 * Provê tremores e feedback háptico visual para impactos, explosões e magias,
 * calculando o offset {offsetX, offsetY} com decaimento suave sem quebrar a câmera.
 * ==============================================================================
 */
export class ScreenShakeBuilder {
  private config: ScreenShakeConfig = {
    intensity: 6,
    duration: 0.25,
    decay: 'exponential',
    frequency: 30
  };

  public static create(): ScreenShakeBuilder {
    return new ScreenShakeBuilder();
  }

  public intensity(pixels: number): this {
    this.config.intensity = pixels;
    return this;
  }

  public duration(seconds: number): this {
    this.config.duration = seconds;
    return this;
  }

  public decay(type: 'linear' | 'exponential'): this {
    this.config.decay = type;
    return this;
  }

  public frequency(hz: number): this {
    this.config.frequency = hz;
    return this;
  }

  public build(): ScreenShakeController {
    return new ScreenShakeController(this.config);
  }
}

/**
 * Controlador de tempo de vida de um ScreenShake.
 */
export class ScreenShakeController {
  private elapsed: number = 0;
  public isFinished: boolean = false;
  public offsetX: number = 0;
  public offsetY: number = 0;

  constructor(private config: ScreenShakeConfig) {}

  public update(deltaTime: number): void {
    if (this.isFinished) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    this.elapsed += deltaTime;
    if (this.elapsed >= this.config.duration) {
      this.isFinished = true;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    const t = this.elapsed / this.config.duration; // 0.0 -> 1.0
    const damp = this.config.decay === 'linear' 
      ? (1 - t) 
      : Math.pow(1 - t, 2);

    const currentIntensity = this.config.intensity * damp;
    const freq = this.config.frequency ?? 30;

    // Ruído harmônico pseudo-aleatório com decaimento
    this.offsetX = (Math.sin(this.elapsed * freq * 1.5) * currentIntensity) + ((Math.random() - 0.5) * currentIntensity * 0.4);
    this.offsetY = (Math.cos(this.elapsed * freq * 1.8) * currentIntensity) + ((Math.random() - 0.5) * currentIntensity * 0.4);
  }
}

export default ScreenShakeBuilder;
