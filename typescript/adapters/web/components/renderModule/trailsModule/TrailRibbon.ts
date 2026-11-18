/**
 * @file TrailRibbon.ts
 * Um rastro individual: guarda o caminho (`TrailPath`) e desenha o sprite horizontal "dobrado" ao longo dele.
 */
import TrailPath from "./TrailPath";
import { computeTrailSlices, type TrailSlice } from "./TrailSlices";
import type { TrailVisualConfig } from "../../../shared/VisualConfigMap";

/** Sobreposição (px do mundo) entre fatias vizinhas para não abrir frestas nas curvas. */
const SLICE_OVERLAP = 0.5;

export default class TrailRibbon {
    public readonly path: TrailPath;
    private readonly slices: TrailSlice[] = [];
    /** Tempo desde a última vez que o objeto informou sua posição (usado para soltar o rastro). */
    public timeSinceTracked: number = 0;
    /** Tempo acumulado de vida do rastro (relógio da animação por quadros e da rolagem). */
    public elapsed: number = 0;

    constructor(
        public readonly trailId: string,
        public readonly config: TrailVisualConfig,
        private readonly image: HTMLImageElement
    ) {
        this.path = new TrailPath(config.maxPoints, config.lifetime, config.minSegmentLength);
    }

    public setHead(x: number, y: number): void {
        this.timeSinceTracked = 0;
        this.path.setHead(x, y);
    }

    public update(deltaTime: number): void {
        this.timeSinceTracked += deltaTime;
        this.elapsed += deltaTime;
        this.path.update(deltaTime);
    }

    /** Quadro atual da animação por quadros (0 quando o rastro não é animado). */
    public get currentFrame(): number {
        const frames = Math.max(1, Math.floor(this.config.frameCount ?? 1));
        if (frames === 1 || !this.config.animationSpeed) return 0;
        return Math.floor(this.elapsed * this.config.animationSpeed) % frames;
    }

    /** Deslocamento atual da rolagem da textura, em pixels da imagem. */
    public get scrollTexels(): number {
        return this.config.scrollSpeed ? this.elapsed * this.config.scrollSpeed : 0;
    }

    public detach(): void {
        this.path.detach();
    }

    public get isDetached(): boolean { return this.path.isDetached; }

    /** Rastro solto que já desapareceu por completo (pode ser removido). */
    public get isFinished(): boolean { return this.path.isDetached && this.path.isEmpty; }

    /** Desenha o rastro no contexto (a transformação da câmera já foi aplicada pelo Renderer). */
    public draw(ctx: CanvasRenderingContext2D): void {
        const img = this.image;
        const imageWidth = img.naturalWidth || img.width;
        const imageHeight = img.naturalHeight || img.height;
        if (!imageWidth || !imageHeight) return;

        //? Spritesheet animado: quadros empilhados na vertical, cada um com a altura de um quadro
        const frames = Math.max(1, Math.floor(this.config.frameCount ?? 1));
        const frameHeight = this.config.frameHeight ?? imageHeight / frames;
        const sy = this.currentFrame * frameHeight;

        //? Rolagem mantida dentro de uma volta da imagem para não perder precisão com o tempo
        const scroll = this.scrollTexels % imageWidth;

        const total = computeTrailSlices(this.path, this.config, imageWidth, frameHeight, this.slices, scroll);
        if (total === 0) return;

        ctx.imageSmoothingEnabled = false;
        for (let i = 0; i < total; i++) {
            const s = this.slices[i]!;
            ctx.save();
            ctx.globalAlpha = s.alpha;
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);
            ctx.drawImage(img, s.sx, sy, Math.max(s.sw, 0.0001), frameHeight, 0, -s.thickness / 2, s.length + SLICE_OVERLAP, s.thickness);
            ctx.restore();
        }
    }
}
