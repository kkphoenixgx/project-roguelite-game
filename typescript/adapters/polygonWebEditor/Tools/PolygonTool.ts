import type { ITool } from "./ITool";
import type { HitboxModel, Point } from "../Models/HitboxModel";

export class PolygonTool implements ITool {
    private points: Point[] = [];
    private undonePoints: Point[] = [];
    private mousePos: Point | null = null;
    
    constructor(private onComplete: (hitbox: HitboxModel) => void) {}

    public onMouseDown(e: MouseEvent, worldPos: Point, zoom: number): void {
        if (e.button === 0) {
            this.points.push({ x: worldPos.x, y: worldPos.y });
            this.undonePoints = [];
        } else if (e.button === 2 && this.points.length > 0) {
            this.onUndo();
        }
    }

    public onMouseMove(e: MouseEvent, worldPos: Point, zoom: number): void {
        this.mousePos = { x: worldPos.x, y: worldPos.y };
    }

    public onMouseUp(e: MouseEvent, worldPos: Point, zoom: number): void {}

    public onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter' && this.points.length >= 3) {
            const hitbox: HitboxModel = {
                id: `poly_${Date.now()}`,
                type: 'polygon',
                coordinates: { x: this.points[0]!.x, y: this.points[0]!.y },
                rotation: 0,
                points: [...this.points]
            };
            this.onComplete(hitbox);
            this.reset();
        }
        if (e.key === 'Escape') {
            this.reset();
        }
    }

    public onUndo(): boolean {
        if (this.points.length > 0) {
            const p = this.points.pop()!;
            this.undonePoints.push(p);
            return true;
        }
        return false;
    }

    public onRedo(): boolean {
        if (this.undonePoints.length > 0) {
            const p = this.undonePoints.pop()!;
            this.points.push(p);
            return true;
        }
        return false;
    }

    public draw(ctx: CanvasRenderingContext2D, panX: number, panY: number, zoom: number): void {
        if (this.points.length === 0) return;

        const pX = (x: number) => x * zoom + panX;
        const pY = (y: number) => y * zoom + panY;

        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pX(this.points[0]!.x), pY(this.points[0]!.y));
        for (let i = 1; i < this.points.length; i++) ctx.lineTo(pX(this.points[i]!.x), pY(this.points[i]!.y));
        if (this.mousePos) ctx.lineTo(pX(this.mousePos.x), pY(this.mousePos.y));
        ctx.stroke();

        ctx.fillStyle = '#FF0000';
        for (const p of this.points) {
            ctx.beginPath(); ctx.arc(pX(p.x), pY(p.y), 4, 0, Math.PI * 2); ctx.fill();
        }
    }

    public reset(): void {
        this.points = [];
        this.undonePoints = [];
    }
}