import { HitBox } from './HitBox';
import type { HitboxDebugShape } from '../ports/domain-contracts';
import type ObjectElement from '../ObjectModule/ObjectElement';

export default class HitBoxPolygon extends HitBox {
    private points: {x: number, y: number}[];
    private pivot: {x: number, y: number};
    private debugShape: HitboxDebugShape;
    private rotatedPoints: {x: number, y: number}[];
    private lastX: number = -Infinity;
    private lastY: number = -Infinity;
    private lastRot: number = -Infinity;
    
    constructor(
        coordinates: {x: number, y: number},
        rotation: number,
        points: {x: number, y: number}[],
        pivot: {x: number, y: number},
        onColision: (otherElement: any) => void
    ) {
        super(coordinates, rotation, onColision);
        this.points = points;
        this.pivot = pivot;
        this.rotatedPoints = points.map(() => ({x: 0, y: 0}));
        this.debugShape = { type: 'polygon', coordinates: { x: coordinates.x, y: coordinates.y }, points: this.rotatedPoints, rotation };
    }

    public getRotatedPoints(): {x: number, y: number}[] {
  //! Memoization rigorosa para evitar realocações dinâmicas de vértices (Zero-GC)
        if (this.rotation === this.lastRot && this.coordinates.x === this.lastX && this.coordinates.y === this.lastY) {
            return this.rotatedPoints;
        }
        this.lastRot = this.rotation;
        this.lastX = this.coordinates.x;
        this.lastY = this.coordinates.y;

        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i]!;
            const tx = p.x - this.pivot.x;
            const ty = p.y - this.pivot.y;
            this.rotatedPoints[i]!.x = this.coordinates.x + (tx * cos - ty * sin) + this.pivot.x;
            this.rotatedPoints[i]!.y = this.coordinates.y + (tx * sin + ty * cos) + this.pivot.y;
        }
        return this.rotatedPoints;
    }

    public intersects(other: HitBox): boolean { return false; /* Delegado 100% para o CollisionWorker de alta performance */ }

    public override getDebugShape(): HitboxDebugShape {
        this.debugShape.coordinates.x = this.coordinates.x;
        this.debugShape.coordinates.y = this.coordinates.y;
        this.debugShape.rotation = this.rotation;
        this.getRotatedPoints(); //! Computa ou obtém vértices do cache memoizado
        return this.debugShape;
    }
}