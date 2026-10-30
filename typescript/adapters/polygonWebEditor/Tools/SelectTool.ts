import type { ITool } from "./ITool";
import type { HitboxModel, Point } from "../Models/HitboxModel";

function isPointInPolygon(p: Point, poly: Point[]): boolean {
    if (!poly || poly.length < 3) return false;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i]!.x, yi = poly[i]!.y;
        const xj = poly[j]!.x, yj = poly[j]!.y;

        const intersect = ((yi > p.y) !== (yj > p.y))
            && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function distToSegmentSquared(p: Point, v: Point, w: Point): number {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
}

function isPointNearPolyEdge(p: Point, poly: Point[], threshold: number): boolean {
    if (!poly || poly.length < 2) return false;
    const threshSq = threshold * threshold;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        if (distToSegmentSquared(p, poly[j]!, poly[i]!) <= threshSq) {
            return true;
        }
    }
    return false;
}

function isPointInCircle(p: Point, center: Point, radius: number, threshold: number): boolean {
    const dist = Math.hypot(p.x - center.x, p.y - center.y);
    return dist <= (radius + threshold);
}

export class SelectTool implements ITool {
    public selectedHitbox: HitboxModel | null = null;
    public selectedVertex: Point | null = null;

    private hoverTarget: { type: 'vertex'; point: Point; hitbox: HitboxModel } | { type: 'hitbox'; hitbox: HitboxModel } | null = null;
    private dragMode: 'none' | 'vertex' | 'hitbox' = 'none';
    private dragStartPos: Point = { x: 0, y: 0 };
    private initialPolygonPoints: Point[] = [];
    private initialCircleCoords: Point = { x: 0, y: 0 };

    constructor(
        private hitboxes: HitboxModel[],
        private onChange: () => void,
        private onSelectionChange?: (selected: HitboxModel | null) => void
    ) {}

    /**
     * Procura por um vértice sob o cursor (dando preferência aos vértices da hitbox selecionada).
     */
    private getVertexAt(x: number, y: number, zoom: number): { point: Point; hitbox: HitboxModel } | null {
        const threshold = Math.max(5, 12 / zoom);

        if (this.selectedHitbox) {
            if (this.selectedHitbox.type === 'polygon' && this.selectedHitbox.points) {
                for (const p of this.selectedHitbox.points) {
                    if (Math.hypot(p.x - x, p.y - y) <= threshold) {
                        return { point: p, hitbox: this.selectedHitbox };
                    }
                }
            } else if (this.selectedHitbox.type === 'circle') {
                if (Math.hypot(this.selectedHitbox.coordinates.x - x, this.selectedHitbox.coordinates.y - y) <= threshold) {
                    return { point: this.selectedHitbox.coordinates, hitbox: this.selectedHitbox };
                }
            }
        }

        for (let i = this.hitboxes.length - 1; i >= 0; i--) {
            const hb = this.hitboxes[i]!;
            if (hb === this.selectedHitbox) continue;
            if (hb.type === 'polygon' && hb.points) {
                for (const p of hb.points) {
                    if (Math.hypot(p.x - x, p.y - y) <= threshold) {
                        return { point: p, hitbox: hb };
                    }
                }
            } else if (hb.type === 'circle') {
                if (Math.hypot(hb.coordinates.x - x, hb.coordinates.y - y) <= threshold) {
                    return { point: hb.coordinates, hitbox: hb };
                }
            }
        }
        return null;
    }

    /**
     * Procura por uma hitbox inteira (corpo interno ou borda) sob o cursor.
     */
    private getHitboxAt(worldPos: Point, zoom: number): HitboxModel | null {
        const threshold = Math.max(4, 10 / zoom);

        for (let i = this.hitboxes.length - 1; i >= 0; i--) {
            const hb = this.hitboxes[i]!;
            if (hb.type === 'polygon' && hb.points) {
                if (isPointInPolygon(worldPos, hb.points) || isPointNearPolyEdge(worldPos, hb.points, threshold)) {
                    return hb;
                }
            } else if (hb.type === 'circle') {
                const radius = hb.radius || 10;
                if (isPointInCircle(worldPos, hb.coordinates, radius, threshold)) {
                    return hb;
                }
            }
        }
        return null;
    }

    public onMouseDown(e: MouseEvent, worldPos: Point, zoom: number): void {
        const vertexTarget = this.getVertexAt(worldPos.x, worldPos.y, zoom);

        if (vertexTarget) {
            if (e.button === 0) {
                this.selectedHitbox = vertexTarget.hitbox;
                this.selectedVertex = vertexTarget.point;
                this.dragMode = 'vertex';
                this.dragStartPos = { x: worldPos.x, y: worldPos.y };
                this.onSelectionChange?.(this.selectedHitbox);
                return;
            } else if (e.button === 2) {
                if (vertexTarget.hitbox.type === 'polygon' && vertexTarget.hitbox.points) {
                    const ptIdx = vertexTarget.hitbox.points.indexOf(vertexTarget.point);
                    if (ptIdx > -1) {
                        if (vertexTarget.hitbox.points.length > 3) {
                            vertexTarget.hitbox.points.splice(ptIdx, 1);
                        } else {
                            const hbIdx = this.hitboxes.indexOf(vertexTarget.hitbox);
                            if (hbIdx > -1) this.hitboxes.splice(hbIdx, 1);
                            if (this.selectedHitbox === vertexTarget.hitbox) {
                                this.selectedHitbox = null;
                                this.onSelectionChange?.(null);
                            }
                        }
                    }
                } else if (vertexTarget.hitbox.type === 'circle') {
                    const hbIdx = this.hitboxes.indexOf(vertexTarget.hitbox);
                    if (hbIdx > -1) this.hitboxes.splice(hbIdx, 1);
                    if (this.selectedHitbox === vertexTarget.hitbox) {
                        this.selectedHitbox = null;
                        this.onSelectionChange?.(null);
                    }
                }
                this.selectedVertex = null;
                this.onChange();
                return;
            }
        }

        const hitboxTarget = this.getHitboxAt(worldPos, zoom);
        if (hitboxTarget) {
            if (e.button === 0) {
                this.selectedHitbox = hitboxTarget;
                this.selectedVertex = null;
                this.dragMode = 'hitbox';
                this.dragStartPos = { x: worldPos.x, y: worldPos.y };

                if (hitboxTarget.type === 'polygon' && hitboxTarget.points) {
                    this.initialPolygonPoints = hitboxTarget.points.map(p => ({ x: p.x, y: p.y }));
                } else if (hitboxTarget.type === 'circle') {
                    this.initialCircleCoords = { x: hitboxTarget.coordinates.x, y: hitboxTarget.coordinates.y };
                }
                this.onSelectionChange?.(this.selectedHitbox);
                return;
            } else if (e.button === 2) {
                const hbIdx = this.hitboxes.indexOf(hitboxTarget);
                if (hbIdx > -1) {
                    this.hitboxes.splice(hbIdx, 1);
                }
                if (this.selectedHitbox === hitboxTarget) {
                    this.selectedHitbox = null;
                    this.selectedVertex = null;
                    this.onSelectionChange?.(null);
                }
                this.onChange();
                return;
            }
        }

        if (e.button === 0) {
            this.selectedHitbox = null;
            this.selectedVertex = null;
            this.dragMode = 'none';
            this.onSelectionChange?.(null);
        }
    }

    public onMouseMove(e: MouseEvent, worldPos: Point, zoom: number): void {
        if (this.dragMode === 'vertex' && this.selectedVertex) {
            this.selectedVertex.x = Math.round(worldPos.x);
            this.selectedVertex.y = Math.round(worldPos.y);
            return;
        }

        if (this.dragMode === 'hitbox' && this.selectedHitbox) {
            const dx = Math.round(worldPos.x - this.dragStartPos.x);
            const dy = Math.round(worldPos.y - this.dragStartPos.y);

            if (this.selectedHitbox.type === 'polygon' && this.selectedHitbox.points && this.initialPolygonPoints.length === this.selectedHitbox.points.length) {
                for (let i = 0; i < this.selectedHitbox.points.length; i++) {
                    this.selectedHitbox.points[i]!.x = this.initialPolygonPoints[i]!.x + dx;
                    this.selectedHitbox.points[i]!.y = this.initialPolygonPoints[i]!.y + dy;
                }
                this.selectedHitbox.coordinates.x = this.selectedHitbox.points[0]!.x;
                this.selectedHitbox.coordinates.y = this.selectedHitbox.points[0]!.y;
            } else if (this.selectedHitbox.type === 'circle') {
                this.selectedHitbox.coordinates.x = this.initialCircleCoords.x + dx;
                this.selectedHitbox.coordinates.y = this.initialCircleCoords.y + dy;
            }
            return;
        }

        const vTarget = this.getVertexAt(worldPos.x, worldPos.y, zoom);
        if (vTarget) {
            this.hoverTarget = { type: 'vertex', point: vTarget.point, hitbox: vTarget.hitbox };
        } else {
            const hTarget = this.getHitboxAt(worldPos, zoom);
            if (hTarget) {
                this.hoverTarget = { type: 'hitbox', hitbox: hTarget };
            } else {
                this.hoverTarget = null;
            }
        }
    }

    public onMouseUp(e: MouseEvent, worldPos: Point, zoom: number): void {
        if (this.dragMode !== 'none') {
            this.dragMode = 'none';
            this.onChange();
        }
    }

    public onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (!e.shiftKey) {
                this.deleteSelected();
            }
        } else if (e.key === 'Escape') {
            this.selectedHitbox = null;
            this.selectedVertex = null;
            this.dragMode = 'none';
            this.onSelectionChange?.(null);
        }
    }

    /**
     * Remove o elemento selecionado atualmente (vértice se houver > 3 pontos ou a hitbox inteira).
     */
    public deleteSelected(): boolean {
        if (this.selectedVertex && this.selectedHitbox?.type === 'polygon' && this.selectedHitbox.points && this.selectedHitbox.points.length > 3) {
            const ptIdx = this.selectedHitbox.points.indexOf(this.selectedVertex);
            if (ptIdx > -1) {
                this.selectedHitbox.points.splice(ptIdx, 1);
                this.selectedVertex = null;
                this.onChange();
                return true;
            }
        }

        if (this.selectedHitbox) {
            const hbIdx = this.hitboxes.indexOf(this.selectedHitbox);
            if (hbIdx > -1) {
                this.hitboxes.splice(hbIdx, 1);
            }
            this.selectedHitbox = null;
            this.selectedVertex = null;
            this.dragMode = 'none';
            this.onSelectionChange?.(null);
            this.onChange();
            return true;
        }

        return false;
    }

    public draw(ctx: CanvasRenderingContext2D, panX: number, panY: number, zoom: number): void {
        const pX = (x: number) => x * zoom + panX;
        const pY = (y: number) => y * zoom + panY;

        if (this.hoverTarget && this.dragMode === 'none') {
            if (this.hoverTarget.type === 'hitbox' && this.hoverTarget.hitbox !== this.selectedHitbox) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 120, 0.7)';
                ctx.lineWidth = 2;
                if (ctx.setLineDash) ctx.setLineDash([4, 4]);

                const hb = this.hoverTarget.hitbox;
                if (hb.type === 'polygon' && hb.points && hb.points.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(pX(hb.points[0]!.x), pY(hb.points[0]!.y));
                    for (let i = 1; i < hb.points.length; i++) ctx.lineTo(pX(hb.points[i]!.x), pY(hb.points[i]!.y));
                    ctx.closePath();
                    ctx.stroke();
                } else if (hb.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(pX(hb.coordinates.x), pY(hb.coordinates.y), (hb.radius || 10) * zoom, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            } else if (this.hoverTarget.type === 'vertex' && this.hoverTarget.point !== this.selectedVertex) {
                const px = pX(this.hoverTarget.point.x);
                const py = pY(this.hoverTarget.point.y);
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 230, 0, 0.6)';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }
        }

        if (this.selectedHitbox) {
            ctx.save();
            const hb = this.selectedHitbox;

            if (hb.type === 'polygon' && hb.points && hb.points.length > 1) {
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 3;
                if (ctx.setLineDash) ctx.setLineDash([6, 3]);
                ctx.beginPath();
                ctx.moveTo(pX(hb.points[0]!.x), pY(hb.points[0]!.y));
                for (let i = 1; i < hb.points.length; i++) ctx.lineTo(pX(hb.points[i]!.x), pY(hb.points[i]!.y));
                ctx.closePath();
                ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
                ctx.fill();
                ctx.stroke();
                if (ctx.setLineDash) ctx.setLineDash([]);

                for (const p of hb.points) {
                    const vx = pX(p.x);
                    const vy = pY(p.y);
                    const isSelected = (p === this.selectedVertex);

                    ctx.beginPath();
                    ctx.arc(vx, vy, isSelected ? 7 : 5, 0, Math.PI * 2);
                    ctx.fillStyle = isSelected ? '#ffd700' : '#ffffff';
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = isSelected ? '#ffffff' : '#007acc';
                    ctx.stroke();
                }
            } else if (hb.type === 'circle') {
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 3;
                if (ctx.setLineDash) ctx.setLineDash([6, 3]);
                ctx.beginPath();
                ctx.arc(pX(hb.coordinates.x), pY(hb.coordinates.y), (hb.radius || 10) * zoom, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
                ctx.fill();
                ctx.stroke();
                if (ctx.setLineDash) ctx.setLineDash([]);

                const cx = pX(hb.coordinates.x);
                const cy = pY(hb.coordinates.y);
                ctx.beginPath();
                ctx.arc(cx, cy, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#ffd700';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    public reset(): void {
        this.selectedHitbox = null;
        this.selectedVertex = null;
        this.hoverTarget = null;
        this.dragMode = 'none';
        this.onSelectionChange?.(null);
    }
}