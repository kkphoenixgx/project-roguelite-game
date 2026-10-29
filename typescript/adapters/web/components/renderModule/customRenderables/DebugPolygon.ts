import type { HitboxDebugShape } from "../../../../../domain/ports/domain-contracts";
import type IRenderable from "../visuals/IRenderable";

export default class DebugPolygon implements IRenderable {
    id: number;
    coordinates: { x: number; y: number } = { x: 0, y: 0 };
    size: { width: number; height: number } = { width: 0, height: 0 };
    rotation: number = 0;
    points: { x: number; y: number }[];

    constructor(id: number, state: HitboxDebugShape) {
        this.id = id; 
        this.rotation = state.rotation || 0;
        this.points = state.points || [];
        this.updateBounds();
    }

    updateState(newState: HitboxDebugShape): void {
        this.rotation = newState.rotation || 0;
        this.points = newState.points || [];
        this.updateBounds();
    }

    private updateBounds(): void {
        if (!this.points || this.points.length === 0) {
            this.coordinates = { x: 0, y: 0 };
            this.size = { width: 0, height: 0 };
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i]!;
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        this.coordinates = { x: minX, y: minY };
        this.size = { width: maxX - minX, height: maxY - minY };
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.points.length === 0) return;
        
        ctx.save();
        // 1. Polígono real configurado
        ctx.beginPath();
        ctx.moveTo(this.points[0]!.x, this.points[0]!.y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i]!.x, this.points[i]!.y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 255, 180, 0.75)';
        ctx.fillStyle = 'rgba(0, 255, 180, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // 2. Envelope físico AABB para tornar visíveis quaisquer barreiras invisíveis nos cantos
        if (this.size.width > 0 && this.size.height > 0) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(this.coordinates.x, this.coordinates.y, this.size.width, this.size.height);
        }
        ctx.restore();
    }
}