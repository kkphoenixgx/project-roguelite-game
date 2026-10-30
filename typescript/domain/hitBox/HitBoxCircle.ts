import { HitBox } from './HitBox';
import type { HitboxDebugShape } from '../ports/domain-contracts'; 
import Vector2D from '../shared/Vector2D';
import type ObjectElement from '../ObjectModule/ObjectElement';


//! TODO Intersecção com polígono

export class HitBoxCircle extends HitBox {
    private debugShape: HitboxDebugShape;

    constructor(
        coordinates: {x:number, y:number}, 
        rotation: number = 0,
        public radius: number,
        onColision: (otherElement: any) => void,
    ) 
    {
        super( coordinates, rotation, onColision );

        this.debugShape = { type: 'circle', coordinates: { x: coordinates.x, y: coordinates.y }, radius };
    }

    public override update(coodinates: {x:number, y:number}, rotation:number): void {
        this.updatePosition(coodinates)
        this.updateRotation(rotation)
    }

    //! Está funcionando apenas para intersecções do tipo: (HitBoxCircle <-> HitBoxCircle) 
    public intersects(other: HitBox): boolean {
        if (other instanceof HitBoxCircle) {
            const dx = this.coordinates.x - other.coordinates.x;
            const dy = this.coordinates.y - other.coordinates.y;
            const distanceSquared = dx * dx + dy * dy;
            
            const radiiSum = this.radius + other.radius;
            return distanceSquared <= (radiiSum * radiiSum);
        }
        
        
        return false;
    }

    public override getDebugShape(): HitboxDebugShape {
        this.debugShape.coordinates.x = this.coordinates.x;
        this.debugShape.coordinates.y = this.coordinates.y;
        this.debugShape.radius = this.radius;
        return this.debugShape;
    }
}