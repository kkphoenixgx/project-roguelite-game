import type { ParticleEmitterConfig } from "../components/renderModule/particlesModule/ParticleEmitterConfig";
import ParticleOrchestrator from "../components/renderModule/particlesModule/ParticleOrchestrator";

/**
 * ==============================================================================
 * BUILDER FLUENTE PARA CONFIGURAÇÃO DE EMISSORES DE PARTÍCULAS
 * ==============================================================================
 * Simplifica drasticamente a criação de VFX seratoninérgicos, permitindo configurar
 * física, dispersão, cones, cores e tempo de vida de forma declarativa e legível.
 * ==============================================================================
 */
export class ParticleConfigBuilder {
  private config: ParticleEmitterConfig = {
    x: 0,
    y: 0,
    count: 20,
    colors: ['#ffffff'],
    speedMin: 50,
    speedMax: 150,
    sizeMin: 2,
    sizeMax: 5,
    lifeMin: 0.3,
    lifeMax: 0.8,
    angle: 0,
    spread: Math.PI * 2,
    gravity: 0,
    friction: 0.95,
    fade: true,
    isCircle: true
  };

  public static at(x: number, y: number): ParticleConfigBuilder {
    const builder = new ParticleConfigBuilder();
    builder.config.x = x;
    builder.config.y = y;
    return builder;
  }

  public count(amount: number): this {
    this.config.count = amount;
    return this;
  }

  public colors(...palette: string[]): this {
    this.config.colors = palette.length > 0 ? palette : ['#ffffff'];
    return this;
  }

  public speed(min: number, max: number): this {
    this.config.speedMin = min;
    this.config.speedMax = max;
    return this;
  }

  public size(min: number, max: number): this {
    this.config.sizeMin = min;
    this.config.sizeMax = max;
    return this;
  }

  public life(minSeconds: number, maxSeconds: number): this {
    this.config.lifeMin = minSeconds;
    this.config.lifeMax = maxSeconds;
    return this;
  }

  public directional(angleRadians: number, spreadRadians: number): this {
    this.config.angle = angleRadians;
    this.config.spread = spreadRadians;
    return this;
  }

  public omnidirectional(): this {
    this.config.angle = 0;
    this.config.spread = Math.PI * 2;
    return this;
  }

  public gravity(yAcceleration: number): this {
    this.config.gravity = yAcceleration;
    return this;
  }

  public friction(frictionFactor: number): this {
    this.config.friction = frictionFactor;
    return this;
  }

  public asCircle(enabled: boolean = true): this {
    this.config.isCircle = enabled;
    return this;
  }

  public asSquare(): this {
    this.config.isCircle = false;
    return this;
  }

  public fade(enabled: boolean = true): this {
    this.config.fade = enabled;
    return this;
  }

  /**
   * Retorna o DTO estrito ParticleEmitterConfig pronto para o orchestrator.
   */
  public build(): ParticleEmitterConfig {
    return { ...this.config };
  }

  /**
   * Dispara imediatamente o efeito no ParticleOrchestrator informado.
   */
  public emitOn(orchestrator: ParticleOrchestrator): void {
    const cfg = this.build();
    (orchestrator as any).particles.emit(cfg);
  }
}

/**
 * ==============================================================================
 * TEMPLATES PRÉ-CONFIGURADOS DE PARTÍCULAS (PRESETS DE ALTO IMPACTO)
 * ==============================================================================
 */
export const ParticleVfxPresets = {
  bloodSplatter: (x: number, y: number) =>
    ParticleConfigBuilder.at(x, y)
      .count(16)
      .colors('#8a0303', '#bf0000', '#ff2a2a')
      .speed(80, 220)
      .size(2, 6)
      .life(0.3, 0.7)
      .omnidirectional()
      .gravity(550)
      .friction(0.92)
      .asCircle(true),

  magicSparks: (x: number, y: number, color: string = '#00e5ff') =>
    ParticleConfigBuilder.at(x, y)
      .count(24)
      .colors(color, '#ffffff', '#76ffff')
      .speed(40, 180)
      .size(1, 4)
      .life(0.4, 0.9)
      .omnidirectional()
      .gravity(-120) // Flutua suavemente para cima
      .friction(0.94)
      .asCircle(true),

  levelUpBurst: (x: number, y: number) =>
    ParticleConfigBuilder.at(x, y)
      .count(40)
      .colors('#ffd700', '#fff3a8', '#ffaa00')
      .speed(100, 320)
      .size(3, 7)
      .life(0.6, 1.4)
      .omnidirectional()
      .gravity(200)
      .friction(0.93)
      .asCircle(true),

  criticalHitSparks: (x: number, y: number, angle: number = 0) =>
    ParticleConfigBuilder.at(x, y)
      .count(22)
      .colors('#ffea00', '#ff5722', '#ffffff')
      .speed(150, 400)
      .size(2, 5)
      .life(0.15, 0.45)
      .directional(angle, Math.PI / 3) // Cone de impacto direcional
      .friction(0.88)
      .asSquare()
};

export default ParticleConfigBuilder;
