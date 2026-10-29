/** @file Contém a classe `Player`, a representação visual do jogador com suporte aos 8 lados de rolagem. */
import LayeredGameObjectElement from "../visuals/LayeredGameObjectElement";
import { type GameObjectConstructorParams } from "../visuals/GameObjectElement";
import { RegisterRenderer } from "../../../shared/RenderRegistry";
import type { EntityRenderableState } from "../../../../../domain/ports/domain-contracts";
import { isGamePaused } from "../../Game";
import { getRollSocketTransform } from "./PlayerRollSocketRig";

const ZERO_OFFSET = { x: 0, y: 0 } as const;

@RegisterRenderer('player')
export default class Player extends LayeredGameObjectElement {
  private currentState: string = 'idle';
  private rollStartTime: number = 0;
  private readonly rollDurationMs: number = 300;

  constructor(params: GameObjectConstructorParams) {
    super(params);
    this.currentState = params.initialState.state || 'idle';
    if (this.currentState === 'roll' || this.currentState === 'dodge') {
      this.rollStartTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    }
  }

  public override updateState(newState: EntityRenderableState): void {
    const prevState = this.currentState;
    super.updateState(newState);
    this.currentState = newState.state || 'idle';
    if ((this.currentState === 'roll' || this.currentState === 'dodge') && prevState !== this.currentState) {
      this.rollStartTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      this.currentFrame = 0;
      this.frameCounter = 0;
    }
  }

  protected override updateAnimation(): void {
    const isRoll = this.currentState === 'roll' || this.currentState === 'dodge';
    if (isRoll) {
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      const elapsed = Math.max(0, now - this.rollStartTime);
      const progress = Math.min(0.999, elapsed / this.rollDurationMs);
      this.currentFrame = Math.floor(progress * 8);
    } else {
      super.updateAnimation();
    }
  }

  public override draw(ctx: CanvasRenderingContext2D): void {
    const isRoll = this.currentState === 'roll' || this.currentState === 'dodge';

    if (!isRoll || this.composedLayers.length === 0) {
      super.draw(ctx);
      return;
    }

    // Suporte aos 8 lados de rolagem
    ctx.save();
    const baseConfig = this.composedLayers[0]!.config;
    const pivotX = this.coordinates.x + this.size.width / 2;
    const pivotY = this.coordinates.y + this.size.height / 2;

    const cosTheta = Math.cos(this.rotation);
    const flipX = cosTheta < -0.01;
    // Ângulo ajustado no espaço espelhado quando flipX está ativo
    const drawAngle = flipX 
      ? Math.atan2(Math.sin(this.rotation), -Math.cos(this.rotation))
      : this.rotation;

    ctx.translate(pivotX, pivotY);
    if (flipX) {
      ctx.scale(-1, 1);
    }
    ctx.rotate(drawAngle + (baseConfig.rotationOffset || 0));
    ctx.translate(-pivotX, -pivotY);

    if (!isGamePaused()) {
      this.updateAnimation();
    }
    ctx.imageSmoothingEnabled = false;

    const scale = (this.visualScale !== undefined && this.visualScale > 0) ? this.visualScale : 1;
    const drawOffsetX = ((this.size.width * scale) - this.size.width) / 2;
    const drawOffsetY = (this.size.height * scale) - this.size.height;
    const baseFrameWidth = baseConfig.frameWidth;
    const baseFrameHeight = baseConfig.frameHeight;
    const scaleX = (this.size.width / baseFrameWidth) * scale;
    const scaleY = (this.size.height / baseFrameHeight) * scale;
    const originX = this.coordinates.x - drawOffsetX;
    const originY = this.coordinates.y - drawOffsetY;

    for (const layer of this.composedLayers) {
      const isAccessoryUsingStaticFallback = layer.type !== undefined && layer.type !== 'body' && layer.config.frameCount < 8;

      if (!isAccessoryUsingStaticFallback) {
        const layerFrame = this.currentFrame % layer.config.frameCount;
        const columns = Math.max(1, Math.floor(layer.image.width / layer.config.frameWidth));
        const sourceX = (layerFrame % columns) * layer.config.frameWidth;
        const sourceY = Math.floor(layerFrame / columns) * layer.config.frameHeight;

        const rawOffset = layer.config.renderOffset;
        const currentOffset = (Array.isArray(rawOffset) ? rawOffset[this.currentFrame % rawOffset.length] : rawOffset) || ZERO_OFFSET;

        const destX = originX + currentOffset.x * scaleX;
        const destY = originY + currentOffset.y * scaleY;
        const destWidth = layer.config.frameWidth * scaleX;
        const destHeight = layer.config.frameHeight * scaleY;

        ctx.drawImage(layer.image, sourceX, sourceY, layer.config.frameWidth, layer.config.frameHeight, destX, destY, destWidth, destHeight);
        continue;
      }

      const socket = getRollSocketTransform(layer.type, this.currentFrame);
      if (socket.alpha <= 0) {
        continue;
      }

      const rawOffset = layer.config.renderOffset;
      const baseOffset = (Array.isArray(rawOffset) ? rawOffset[0] : rawOffset) || ZERO_OFFSET;

      const srcWidth = layer.config.frameWidth;
      const srcHeight = Math.max(1, Math.round(layer.config.frameHeight * socket.cropHeightRatio));
      const logicalWidth = layer.config.renderSize?.width ?? srcWidth;
      const croppedLogicalHeight = (layer.config.renderSize?.height ?? layer.config.frameHeight) * socket.cropHeightRatio;

      const centerX = originX + (baseOffset.x + logicalWidth * 0.5 + socket.dx) * scaleX;
      const centerY = originY + (baseOffset.y + croppedLogicalHeight * 0.5 + socket.dy) * scaleY;
      const destWidth = logicalWidth * socket.scaleX * scaleX;
      const destHeight = croppedLogicalHeight * socket.scaleY * scaleY;

      if (socket.rotation !== 0 || socket.alpha < 1) {
        ctx.save();
        if (socket.alpha < 1) {
          ctx.globalAlpha *= socket.alpha;
        }
        ctx.translate(centerX, centerY);
        if (socket.rotation !== 0) {
          ctx.rotate(socket.rotation);
        }
        ctx.drawImage(
          layer.image,
          0,
          0,
          srcWidth,
          srcHeight,
          -destWidth * 0.5,
          -destHeight * 0.5,
          destWidth,
          destHeight
        );
        ctx.restore();
      } else {
        ctx.drawImage(
          layer.image,
          0,
          0,
          srcWidth,
          srcHeight,
          centerX - destWidth * 0.5,
          centerY - destHeight * 0.5,
          destWidth,
          destHeight
        );
      }
    }

    if (this.visualTint) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = this.visualTint;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(this.coordinates.x - drawOffsetX, this.coordinates.y - drawOffsetY, this.size.width * scale, this.size.height * scale);
      ctx.restore();
    }

    this.drawElementalAura(ctx, pivotX, pivotY, this.size.width * scale, this.size.height * scale);

    ctx.restore();
  }
}