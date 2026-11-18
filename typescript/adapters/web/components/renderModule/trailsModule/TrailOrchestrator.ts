/**
 * @file TrailOrchestrator.ts
 * Gerencia todos os rastros (trail/ribbon) da cena e se integra ao pipeline como um único `IRenderable`
 * de camada global (mesmo padrão do `ParticleOrchestrator`).
 *
 * Uso: a cada frame, `track(chave, x, y, trailId)` para cada objeto com rastro; depois `update(deltaTime)`.
 * Um rastro que deixa de ser rastreado (objeto destruído, projétil que explodiu) é "solto": para de crescer,
 * termina de desaparecer com o fade e só então é removido.
 */
import type IRenderable from "../visuals/IRenderable";
import TrailRibbon from "./TrailRibbon";
import { TrailVisuals, type TrailVisualConfig } from "../../../shared/VisualConfigMap";
import { RenderRegistry } from "../../../shared/RenderRegistry";

export type TrailKey = number | string;

/** Tempo sem receber posição após o qual o rastro é solto do objeto (tolera frames sem sincronização do domínio). */
export const TRAIL_DETACH_GRACE_SECONDS = 0.15;

export default class TrailOrchestrator implements IRenderable {
    //? Mesmo id de camada global do ParticleOrchestrator: o Renderer desenha sem frustum culling
    public id: number = -999999;
    public readonly coordinates = { x: 0, y: 0 };
    public readonly size = { width: 0, height: 0 };
    public readonly rotation: number = 0;

    private readonly active = new Map<TrailKey, TrailRibbon>();
    private readonly detached: TrailRibbon[] = [];

    constructor(
        private readonly catalog: Record<string, TrailVisualConfig> = TrailVisuals,
        private readonly loadImage: (src: string) => HTMLImageElement = TrailOrchestrator.loadCachedImage
    ) {}

    /** Carrega (uma única vez) a imagem do rastro usando o cache global de imagens da renderização. */
    public static loadCachedImage(src: string): HTMLImageElement {
        let img = RenderRegistry.imageCache.get(src);
        if (!img) {
            img = new Image();
            img.src = src;
            RenderRegistry.imageCache.set(src, img);
        }
        return img;
    }

    /** Quantidade de rastros ainda presos a objetos. */
    public get activeTrailsCount(): number { return this.active.size; }

    /** Quantidade de rastros soltos que ainda estão desaparecendo. */
    public get detachedTrailsCount(): number { return this.detached.length; }

    /** Retorna o rastro ativo de uma chave (útil para testes e depuração). */
    public getTrail(key: TrailKey): TrailRibbon | undefined {
        return this.active.get(key);
    }

    /** Informa a posição atual (centro) de um objeto que deixa rastro. `trailId` desconhecido é ignorado. */
    public track(key: TrailKey, x: number, y: number, trailId: string): void {
        const config = this.catalog[trailId];
        if (!config) return;

        let ribbon = this.active.get(key);
        if (ribbon && ribbon.trailId !== trailId) {
            //? Troca de visual em runtime: o rastro antigo termina de sumir e um novo começa
            ribbon.detach();
            this.detached.push(ribbon);
            ribbon = undefined;
        }
        if (!ribbon) {
            ribbon = new TrailRibbon(trailId, config, this.loadImage(config.imageSrc));
            this.active.set(key, ribbon);
        }
        ribbon.setHead(x, y);
    }

    /** Avança o tempo dos rastros, solta os que não foram rastreados e remove os que já sumiram. */
    public update(deltaTime: number): void {
        for (let i = this.detached.length - 1; i >= 0; i--) {
            const ribbon = this.detached[i]!;
            ribbon.update(deltaTime);
            if (ribbon.isFinished) {
                //? Remoção O(1) por swap com o último elemento
                this.detached[i] = this.detached[this.detached.length - 1]!;
                this.detached.pop();
            }
        }

        for (const [key, ribbon] of this.active) {
            ribbon.update(deltaTime);
            if (ribbon.timeSinceTracked > TRAIL_DETACH_GRACE_SECONDS) {
                ribbon.detach();
                this.active.delete(key);
                this.detached.push(ribbon);
            }
        }
    }

    /** Satisfaz o contrato IRenderable: rastros são alimentados por `track`, não por DTOs. */
    public updateState(_newState: any): void {}

    public draw(ctx: CanvasRenderingContext2D): void {
        for (let i = 0; i < this.detached.length; i++) this.detached[i]!.draw(ctx);
        for (const ribbon of this.active.values()) ribbon.draw(ctx);
    }

    public clear(): void {
        this.active.clear();
        this.detached.length = 0;
    }
}
