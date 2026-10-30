import GameObjectElement, { type GameObjectConstructorParams, type SpriteConfig }  from "./GameObjectElement";
import VisualComposer from "./VisualComposer";
import type { EntityRenderableState } from "../../../../../domain/ports/domain-contracts";
import { logger } from "../../../shared/Logger";
import { isGamePaused } from "../../Game";

export default class LayeredGameObjectElement extends GameObjectElement {
    protected allConfigs: Map<string, SpriteConfig>;
    protected imageCache: Map<string, HTMLImageElement>;
    
    protected composedLayers: { config: SpriteConfig, image: HTMLImageElement, zIndex: number, type?: string }[] = [];
    private lastCompositionHash: string = '';

    constructor(params: GameObjectConstructorParams) {
        super(params.initialState, undefined, document.createElement('img'));
        this.allConfigs = params.configs;
        this.imageCache = params.imageCache;
        this.lastCompositionHash = LayeredGameObjectElement.computeCompositionHash(params.initialState);
        this.recompose(params.initialState);
    }

    private static computeCompositionHash(state: EntityRenderableState): string {
        const equipHash = state.equipment ? Object.values(state.equipment).map((e: any) => e?.iconId).join('-') : '';
        const activeBroochHash = Array.isArray(state.globalActiveLoadout) ? state.globalActiveLoadout.join(',') : '';
        const passiveBroochHash = Array.isArray(state.passiveLoadout) ? state.passiveLoadout.join(',') : '';
        return `${state.state || 'idle'}-${equipHash}-${state.hasBeard}-${activeBroochHash}-${passiveBroochHash}`;
    }

    protected recompose(state: EntityRenderableState) {
        const layers = VisualComposer.extractLayers(state);
        const composed = VisualComposer.compose(layers, this.allConfigs, state.state || 'idle');
        
        this.composedLayers = composed.map(c => {
            const image = this.imageCache.get(c.config.imageSrc);
            if (!image) logger.log('error', `Imagem de equipamento faltando no cache: ${c.config.imageSrc}`);
            return { config: c.config, image: image!, zIndex: c.zIndex, type: c.type };
        }).filter(c => c.image !== undefined);
    }

    public override updateState(newState: EntityRenderableState): void {
        super.updateState(newState);
        const stateHash = LayeredGameObjectElement.computeCompositionHash(newState);
        if (this.lastCompositionHash !== stateHash) {
            this.lastCompositionHash = stateHash;
            this.currentFrame = 0;
            this.frameCounter = 0;
            this.recompose(newState);
        }
    }

    protected override updateAnimation(): void {
        if (this.composedLayers.length > 0) {
            const baseConfig = this.composedLayers[0]!.config;
            this.frameCounter++;
            if (this.frameCounter >= baseConfig.animationSpeed) {
                this.frameCounter = 0;
                this.currentFrame = (this.currentFrame + 1) % baseConfig.frameCount;
            }
        } else {
            super.updateAnimation();
        }
    }

    public override draw(ctx: CanvasRenderingContext2D): void {
        if (this.composedLayers.length === 0) {
            super.draw(ctx);
            return;
        }

        ctx.save();
        const baseConfig = this.composedLayers[0]!.config;
        let pivotX = this.coordinates.x + this.size.width / 2;
        let pivotY = this.coordinates.y + this.size.height / 2;

        if (baseConfig.anchor) {
            switch(baseConfig.anchor) {
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

        ctx.translate(pivotX, pivotY);
        ctx.rotate(this.rotation + (baseConfig.rotationOffset || 0));
        ctx.translate(-pivotX, -pivotY);

        if (!isGamePaused()) {
            this.updateAnimation();
        }
        ctx.imageSmoothingEnabled = false;

        const scale = (this.visualScale !== undefined && this.visualScale > 0) ? this.visualScale : 1;
        const drawOffsetX = ((this.size.width * scale) - this.size.width) / 2;
        const drawOffsetY = (this.size.height * scale) - this.size.height;

        for (const layer of this.composedLayers) {
            const layerFrame = this.currentFrame % layer.config.frameCount;
            const columns = Math.max(1, Math.floor(layer.image.width / layer.config.frameWidth));
            const sourceX = (layerFrame % columns) * layer.config.frameWidth;
            const sourceY = Math.floor(layerFrame / columns) * layer.config.frameHeight;
            
            //? Calcula proporção e escala visual baseando-se no frame base da hitbox
            const baseFrameWidth = this.composedLayers[0]!.config.frameWidth;
            const baseFrameHeight = this.composedLayers[0]!.config.frameHeight;
            const scaleX = (this.size.width / baseFrameWidth) * scale;
            const scaleY = (this.size.height / baseFrameHeight) * scale;

            const rawOffset = layer.config.renderOffset;
            const currentOffset = (Array.isArray(rawOffset) ? rawOffset[this.currentFrame % rawOffset.length] : rawOffset) || { x: 0, y: 0 };

            const logicalWidth = layer.config.renderSize?.width ?? layer.config.frameWidth;
            const logicalHeight = layer.config.renderSize?.height ?? layer.config.frameHeight;

            //? Preserva ancoragem bottom-center ao calcular coordenadas de destino
            const destX = (this.coordinates.x - drawOffsetX) + currentOffset.x * scaleX;
            const destY = (this.coordinates.y - drawOffsetY) + currentOffset.y * scaleY;
            const destWidth = logicalWidth * scaleX;
            const destHeight = logicalHeight * scaleY;

            ctx.drawImage(layer.image, sourceX, sourceY, layer.config.frameWidth, layer.config.frameHeight, destX, destY, destWidth, destHeight);
        }

        //! Aplicação de visualTint via blend mode Canvas 2D source-atop sem alocações de GC
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