/** @file Contém a classe base `GameObjectElement`, que implementa a lógica padrão de renderização de sprites animados. */
import type { EntityRenderableState } from "../../../../../domain/ports/domain-contracts";
import { logger } from "../../../shared/Logger";
import type IRenderable from "./IRenderable";
import { isGamePaused } from "../../Game";
import { RenderRegistry } from "../../../shared/RenderRegistry";

export type RenderAnchor = 'center' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center-left' | 'center-right' | 'top-center' | 'bottom-center';

export interface SpriteConfig {
  /** O caminho ou URL (import estático) da imagem do spritesheet. */
  imageSrc: string;
  /** O número total de frames que compõem a animação completa. */
  frameCount: number;
  /** A velocidade da animação (número de atualizações/ticks do motor antes de avançar para o próximo frame). */
  animationSpeed: number;
  /** A largura real de um único frame recortado dentro da imagem original. */
  frameWidth: number;
  /** A altura real de um único frame recortado dentro da imagem original. */
  frameHeight: number;
  
  /* Específicos do WebGPU Texture Atlas (Opcionais para o fallback 2D) */
  /** O deslocamento (coordenadas {x, y}) desta imagem dentro da grande imagem do Atlas de Textura Global (usado pelo WebGPURenderer). */
  atlasOffset?: { x: number, y: number };
  /** O tamanho final {width, height} na qual o sprite será de fato escalado e renderizado na tela. */
  spriteSize?: { width: number, height: number };
  /** Dimensões lógicas opcionais (na grade 32x32 da entidade) para desenhar camadas reduzidas (ex: broches 3x3 a partir de PNG 40x40). */
  renderSize?: { width: number, height: number };
  /** Deslocamento opcional {x,y} para alinhar equipamentos. Se for um Array, acompanhará os frames de animação do objeto base! */
  renderOffset?: { x: number, y: number } | { x: number, y: number }[];
  /** Deslocamento opcional da rotação (em radianos) para corrigir sprites desenhados fora do eixo padrão (ex: diagonais). */
  rotationOffset?: number;
  /** Define o ponto de pivô para a rotação matemática do sprite. O padrão é 'center'. */
  anchor?: RenderAnchor;
}

export interface GameObjectConstructorParams {
  /** O DTO de estado inicial contendo as coordenadas, identificador, rotação e status base (recebidos do Domínio). */
  initialState: EntityRenderableState;
  /** Um dicionário contendo todas as configurações de sprite disponíveis pelo sistema de Auto-Registro, mapeadas por tipo e estado (ex: 'player-idle'). */
  configs: Map<string, SpriteConfig>;
  /** Um cache global contendo as instâncias de `HTMLImageElement` já pré-carregadas na memória para garantir uma troca de sprites instantânea. */
  imageCache: Map<string, HTMLImageElement>;
}

/**
 * @class GameObjectElement
 * Classe base para todos os objetos visuais do jogo.
 * Por padrão, ela sabe como carregar, animar e desenhar um spritesheet.
 * Classes filhas podem estendê-la para usar essa funcionalidade ou sobrescrever
 * o método `draw` para implementar um comportamento de renderização completamente diferente.
 */
export default class GameObjectElement implements IRenderable {
  public id: number;
  public coordinates: { x: number; y: number };
  public size: { width: number; height: number };
  public rotation:number

  protected image: HTMLImageElement | undefined;
  protected config: SpriteConfig | undefined;

  protected currentFrame: number = 0;
  protected frameCounter: number = 0;

  protected visualTint?: string | undefined;
  protected visualScale?: number | undefined;
  protected spellElements?: string[] | undefined;
  protected activeStatuses?: { id: string; description: string; remaining: number }[] | undefined;
  protected hasAirAura: boolean = false;
  protected hasLightAura: boolean = false;
  protected currentRenderState: string = '';

  constructor(initialState: EntityRenderableState, initialConfig: SpriteConfig | undefined, initialImage: HTMLImageElement | undefined) {
    this.id = initialState.id;
    this.coordinates = { x: initialState.coordinates.x, y: initialState.coordinates.y };
    this.size = initialState.size;
    this.config = initialConfig;
    this.image = initialImage;
    this.currentRenderState = initialState.state || '';
    this.rotation = initialState.rotation || 0;
    this.visualTint = initialState.visualTint;
    this.visualScale = initialState.visualScale;
    this.spellElements = initialState.spellElements;
    this.activeStatuses = initialState.activeStatuses;
    this.recomputeAuraFlags();
  }

  private recomputeAuraFlags(): void {
    let air = false;
    let light = false;
    if (this.spellElements) {
      for (let i = 0; i < this.spellElements.length; i++) {
        const el = this.spellElements[i];
        if (el === 'air') air = true;
        else if (el === 'light') light = true;
      }
    }
    if (this.activeStatuses && (!air || !light)) {
      for (let i = 0; i < this.activeStatuses.length; i++) {
        const sid = this.activeStatuses[i]?.id;
        if (sid === 'blade_infusion_air') air = true;
        else if (sid === 'blade_infusion_light') light = true;
      }
    }
    this.hasAirAura = air;
    this.hasLightAura = light;
  }

  /**
   * Define ou troca o sprite do objeto, gerenciando o processo de carregamento.
   * @param config A nova configuração de sprite. Se for undefined, remove o sprite.
   * @param newImage A instância da imagem já carregada do cache.
   */
  protected setSprite(config: SpriteConfig | undefined, newImage: HTMLImageElement): void {
    this.config = config;
    this.image = newImage;
  }

  /**
   * Estratégia padrão para encontrar a configuração de sprite e a imagem em cache.
   * @param params Os parâmetros de construção do objeto.
   * @param fallbackState O estado a ser usado como padrão se nenhum for fornecido (ex: 'idle', 'travelling').
   * @returns A configuração de sprite e a imagem correspondente.
   */
  protected static spritesStrategy({ initialState, configs, imageCache }: GameObjectConstructorParams, fallbackState: string): { config: SpriteConfig, image: HTMLImageElement } {
    const configKey = `${initialState.entityTypeId}-${initialState.state || fallbackState}`;
    const config = configs.get(configKey);
    if (!config) throw new Error(`Configuration not found for key: ${configKey}`);
    const image = imageCache.get(config.imageSrc);
    if (!image) throw new Error(`Image not found in cache for src: ${config.imageSrc}`);
    return { config, image };
  }

  protected updateAnimation(): void {
    if (!this.config) return;
    this.frameCounter++;
    if (this.frameCounter >= this.config.animationSpeed) {
      this.frameCounter = 0;
      this.currentFrame = (this.currentFrame + 1) % this.config.frameCount;
    }
  }

  public updateState(newState: EntityRenderableState): void {
    this.coordinates.x = newState.coordinates.x;
    this.coordinates.y = newState.coordinates.y;
    this.size = newState.size;
    this.rotation = newState.rotation;
    this.visualTint = newState.visualTint;
    this.visualScale = newState.visualScale;
    this.spellElements = newState.spellElements;
    this.activeStatuses = newState.activeStatuses;
    this.recomputeAuraFlags();

    //? Sincroniza em runtime o asset/imagem para seu sprite correspondente ao mudar de estado
    if (newState.state && this.currentRenderState !== newState.state) {
      this.currentRenderState = newState.state;
      const configKey = `${newState.entityTypeId}-${newState.state}`;
      const newConfig = RenderRegistry.spriteConfigs.get(configKey);
      if (newConfig) {
        let newImage = RenderRegistry.imageCache.get(newConfig.imageSrc);
        if (!newImage) {
          newImage = new Image();
          newImage.src = newConfig.imageSrc;
          RenderRegistry.imageCache.set(newConfig.imageSrc, newImage);
        }
        this.config = newConfig;
        this.image = newImage;
        this.currentFrame = 0;
        this.frameCounter = 0;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    //? Fallback visual em modo debug/placeholder quando não há sprite registrado
    if (!this.config || !this.image) {
      logger.log('render', `Rendering fallback black box for ID: ${this.id}`);
      ctx.fillStyle = "black";
      ctx.fillRect(this.coordinates.x, this.coordinates.y, this.size.width, this.size.height);
      return;
    }
    //? Aguarda término do carregamento assíncrono sem interromper o loop de renderização
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
      if (this.image.complete === false && this.image.naturalWidth === 0) {
        return;
      }
    }
    ctx.save();

    const scale = (this.visualScale !== undefined && this.visualScale > 0) ? this.visualScale : 1;
    const drawWidth = this.size.width * scale;
    const drawHeight = this.size.height * scale;
    //? Ancoragem bottom-center para manter os pés da entidade alinhados ao solo durante escalonamento
    const drawX = this.coordinates.x - (drawWidth - this.size.width) / 2;
    const drawY = this.coordinates.y - (drawHeight - this.size.height);

    let pivotX = this.coordinates.x + this.size.width / 2;
    let pivotY = this.coordinates.y + this.size.height / 2;

    if (this.config.anchor) {
        switch(this.config.anchor) {
            case 'bottom-left': pivotX = this.coordinates.x; pivotY = this.coordinates.y + this.size.height; break;
            case 'bottom-right': pivotX = this.coordinates.x + this.size.width; pivotY = this.coordinates.y + this.size.height; break;
            case 'top-left': pivotX = this.coordinates.x; pivotY = this.coordinates.y; break;
            case 'top-right': pivotX = this.coordinates.x + this.size.width; pivotY = this.coordinates.y; break;
            case 'center-left': pivotX = this.coordinates.x; pivotY = this.coordinates.y + this.size.height / 2; break;
            case 'center-right': pivotX = this.coordinates.x + this.size.width; pivotY = this.coordinates.y + this.size.height / 2; break;
            case 'top-center': pivotX = this.coordinates.x + this.size.width / 2; pivotY = this.coordinates.y; break;
            case 'bottom-center': pivotX = this.coordinates.x + this.size.width / 2; pivotY = this.coordinates.y + this.size.height; break;
        }
    }

    const totalRotation = this.rotation + (this.config.rotationOffset || 0);
    if (totalRotation !== 0) {
        ctx.translate(pivotX, pivotY);
        ctx.rotate(totalRotation);
        ctx.translate(-pivotX, -pivotY);
    }
    
    if (!isGamePaused()) {
        this.updateAnimation();
    }
    
    ctx.imageSmoothingEnabled = false;
    
    const columns = Math.max(1, Math.floor(this.image.width / this.config.frameWidth));
    const sourceX = (this.currentFrame % columns) * this.config.frameWidth;
    const sourceY = Math.floor(this.currentFrame / columns) * this.config.frameHeight;
    
    ctx.drawImage(this.image, sourceX, sourceY, this.config.frameWidth, this.config.frameHeight, drawX, drawY, drawWidth, drawHeight);

    //! Aplicação de visualTint via blend mode source-atop sem alocações de GC no Canvas 2D
    if (this.visualTint) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = this.visualTint;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
    }

    if (this.hasAirAura || this.hasLightAura) {
        this.drawElementalAura(ctx, pivotX, pivotY, drawWidth, drawHeight);
    }

    ctx.restore();
  }

  /**
   * Renderiza sobreposições visuais elementais (vento translúcido ou halo radiante de luz)
   */
  protected drawElementalAura(ctx: CanvasRenderingContext2D, pivotX: number, pivotY: number, drawWidth: number, drawHeight: number): void {
    if (this.hasAirAura) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const arcRadius = (drawWidth / 2) * 1.15;
      //! Halo externo traçado sem shadowBlur para evitar computação pesada de Gaussian blur na CPU
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.25)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, arcRadius, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(180, 255, 230, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, arcRadius, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      ctx.restore();
    }

    if (this.hasLightAura) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const auraRadius = Math.max(drawWidth, drawHeight) * 0.75;
      const gradient = ctx.createRadialGradient(pivotX, pivotY, auraRadius * 0.25, pivotX, pivotY, auraRadius);
      gradient.addColorStop(0, 'rgba(255, 255, 210, 0.4)');
      gradient.addColorStop(0.65, 'rgba(255, 215, 0, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, auraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}