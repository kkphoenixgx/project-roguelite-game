export interface MinimapPinConfig {
  targetWorldX: number;
  targetWorldY: number;
  playerWorldX: number;
  playerWorldY: number;
  radarRadiusPx: number;
  radarCenterX: number;
  radarCenterY: number;
  iconType?: 'boss' | 'exit' | 'npc' | 'chest' | 'elite';
  color?: string;
}

export interface MinimapPinResult {
  pinScreenX: number;
  pinScreenY: number;
  isOffscreen: boolean;
  angleToTargetRad: number;
  distanceWorld: number;
}

/**
 * ==============================================================================
 * PROJETOR CANÔNICO DE MARCADORES DE RADAR / MINIMAPA (MinimapPinTemplate)
 * ==============================================================================
 * Converte coordenadas absolutas de mundo em posições radiais relativas ao radar
 * do jogador, computando rotação de bússola caso o objetivo esteja fora do campo.
 * ==============================================================================
 */
export class MinimapPinTemplate {
  /**
   * Projeta uma posição de mundo em coordenadas polares dentro do círculo do minimapa.
   */
  public static project(config: MinimapPinConfig, worldScale: number = 0.08): MinimapPinResult {
    const dx = config.targetWorldX - config.playerWorldX;
    const dy = config.targetWorldY - config.playerWorldY;
    const distanceWorld = Math.hypot(dx, dy);
    const angleToTargetRad = Math.atan2(dy, dx);

    const scaledDist = distanceWorld * worldScale;
    const maxRadius = config.radarRadiusPx - 4; // Margem interna de segurança

    if (scaledDist <= maxRadius) {
      // Alvo está dentro do raio do radar
      return {
        pinScreenX: config.radarCenterX + Math.cos(angleToTargetRad) * scaledDist,
        pinScreenY: config.radarCenterY + Math.sin(angleToTargetRad) * scaledDist,
        isOffscreen: false,
        angleToTargetRad,
        distanceWorld
      };
    } else {
      // Alvo está fora: trava o pino na borda do círculo (bússola)
      return {
        pinScreenX: config.radarCenterX + Math.cos(angleToTargetRad) * maxRadius,
        pinScreenY: config.radarCenterY + Math.sin(angleToTargetRad) * maxRadius,
        isOffscreen: true,
        angleToTargetRad,
        distanceWorld
      };
    }
  }

  /**
   * Renderiza diretamente o marcador no Canvas do minimapa.
   */
  public static drawPin(ctx: CanvasRenderingContext2D, pin: MinimapPinResult, color: string = '#ffd700', radius: number = 4): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    if (pin.isOffscreen) {
      // Seta triangular apontando na direção do alvo
      ctx.translate(pin.pinScreenX, pin.pinScreenY);
      ctx.rotate(pin.angleToTargetRad);
      ctx.beginPath();
      ctx.moveTo(radius + 2, 0);
      ctx.lineTo(-radius, -radius);
      ctx.lineTo(-radius, radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Círculo normal
      ctx.beginPath();
      ctx.arc(pin.pinScreenX, pin.pinScreenY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

export default MinimapPinTemplate;
