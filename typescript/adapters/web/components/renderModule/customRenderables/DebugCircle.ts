import type { HitboxDebugShape } from "../../../../../domain/ports/domain-contracts";
import type IRenderable from "../visuals/IRenderable";

/**
 * Uma implementação de IRenderable específica para desenhar uma hitbox circular para depuração.
 */
export default class DebugCircle implements IRenderable {
    id: number;
    coordinates: { x: number; y: number };
    size: { width: number; height: number };
    rotation: number = 0;

    private radius: number;
    private center: { x: number; y: number };

    constructor(id: number, state: HitboxDebugShape) {
        this.id = id;
        this.radius = state.radius || 0;
        this.center = state.coordinates;
        this.coordinates = { x: this.center.x - this.radius, y: this.center.y - this.radius };
        this.size = { width: this.radius * 2, height: this.radius * 2 };
    }

    updateState(newState: HitboxDebugShape): void {
        this.radius = newState.radius || 0;
        this.center = newState.coordinates;
        this.coordinates = { x: this.center.x - this.radius, y: this.center.y - this.radius };
        this.size = { width: this.radius * 2, height: this.radius * 2 };
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}