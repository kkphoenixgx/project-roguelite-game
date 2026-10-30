import { HitBoxCircle } from "./HitBoxCircle";
import HitBoxPolygon from "./HitBoxPolygon";
import type { HitBox } from "./HitBox";

export interface HitboxJSON {
    id: string;
    type: 'circle' | 'polygon';
    coordinates: { x: number; y: number };
    rotation: number;
    radius?: number;
    points?: { x: number; y: number }[];
}

export class HitboxParser {
    public static parse(
        jsonArray: HitboxJSON[], 
        pivot: {x: number, y: number} = {x: 0, y: 0}, 
        onCollisionCallback: (other: any) => void
    ): HitBox[] {
        return jsonArray.map(data => {
            if (data.type === 'circle' && data.radius !== undefined) {
                return new HitBoxCircle({ x: data.coordinates.x, y: data.coordinates.y }, data.rotation || 0, data.radius, onCollisionCallback);
            } else if (data.type === 'polygon' && data.points) {
    //? Vincula as hitboxes calculadas com o pivot do sprite
                return new HitBoxPolygon({ x: 0, y: 0 }, 0, data.points, pivot, onCollisionCallback);
            }
            throw new Error(`Invalid hitbox data or unsupported type: ${data.type}`);
        });
    }
}