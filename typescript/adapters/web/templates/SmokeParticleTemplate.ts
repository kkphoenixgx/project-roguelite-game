import type Particle from "../components/renderModule/particlesModule/Particle";
import type { ParticleEmitterConfig } from "../components/renderModule/particlesModule/ParticleEmitterConfig";
import { ParticleConfigBuilder } from "./ParticleConfigBuilder";

export interface ICustomParticleRenderer {
  draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number): void;
}

/**
 * ==============================================================================
 * TEMPLATE E RENDERIZADOR CANÔNICO DE FUMAÇA ORGÂNICA (Grimdark Smoke Puff)
 * ==============================================================================
 * Cria fumaça volumétrica com expansão contínua, rotação suave (torque)
 * e dissipação não-linear com múltiplos lóbulos sobrepostos.
 * ==============================================================================
 */
export class SmokeParticleRenderer implements ICustomParticleRenderer {
  constructor(
    private options: {
      expandFactor?: number;
      rotationSpeed?: number;
      lobes?: number;
    } = {}
  ) {}

  public static create(options?: { expandFactor?: number; rotationSpeed?: number; lobes?: number }): SmokeParticleRenderer {
    return new SmokeParticleRenderer(options);
  }

  public draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number): void {
    const lifeRatio = 1.0 - progress;
    const expand = 1.0 + (this.options.expandFactor ?? 2.8) * lifeRatio;
    const currentRadius = (p.size / 2) * expand;
    
    //? Opacidade não-linear com curva senoidal para simular dissolução e nascimento orgânico
    const alpha = Math.sin(progress * Math.PI) * 0.45;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    
    const rotSpeed = this.options.rotationSpeed ?? 1.2;
    ctx.rotate(lifeRatio * rotSpeed);

    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;

    //? Renderiza nuvem de fumaça com lóbulos radiais múltiplos para contorno volumétrico
    const lobes = this.options.lobes ?? 3;
    const angleStep = (Math.PI * 2) / lobes;
    const offset = currentRadius * 0.4;

    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 0.7, 0, Math.PI * 2);
    for (let i = 0; i < lobes; i++) {
      const a = i * angleStep;
      const lx = Math.cos(a) * offset;
      const ly = Math.sin(a) * offset;
      ctx.arc(lx, ly, currentRadius * 0.55, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Presets de fumaça prontos para uso no ParticleConfigBuilder
 */
export const SmokeVfxPresets = {
  grimdarkChimney: (x: number, y: number) =>
    ParticleConfigBuilder.at(x, y)
      .count(15)
      .colors('#2a2530', '#3b3244', '#1f1c24')
      .speed(10, 35)
      .size(10, 22)
      .life(1.2, 2.4)
      .directional(-Math.PI / 2, Math.PI / 4)
      .gravity(-25)
      .friction(0.96)
      .asCircle(false),

  poisonCloud: (x: number, y: number) =>
    ParticleConfigBuilder.at(x, y)
      .count(25)
      .colors('#1d401a', '#2e6b28', '#44a339')
      .speed(15, 50)
      .size(12, 28)
      .life(1.8, 3.2)
      .omnidirectional()
      .gravity(-8)
      .friction(0.94)
      .asCircle(false),

  explosionSmokePuff: (x: number, y: number) =>
    ParticleConfigBuilder.at(x, y)
      .count(20)
      .colors('#302d33', '#4a4550', '#635d6b')
      .speed(60, 180)
      .size(16, 34)
      .life(0.8, 1.6)
      .omnidirectional()
      .gravity(-40)
      .friction(0.88)
      .asCircle(false)
};

export default SmokeParticleRenderer;
