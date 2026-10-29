import Bullet from "./Bullet";
import type Vector2D from "../../../shared/Vector2D";
import type Attack from "../../Items/Attack";
import type Effect from "../../Items/Effects/Effect";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";
import type ObjectElement from "../../ObjectElement";
import type { objectTypeId } from "../../objectType.type";
import { RegisterSpawner, type SpawnPayload } from "../../SpawnRegistry";
import AreaDamageEffect from "../../Items/Effects/AreaDamageEffect";
import VisualEffect from "../../Items/Effects/VisualEffect/VisualEffect";

@RegisterSpawner('fireball')
export class Fireball extends Bullet {
    private speed: number = 250;
    private distanceTraveled: number = 0;
    private hitTargets: Set<number> = new Set();
    
    public effects: Effect[];
    public attack: Attack;

    constructor(
        id: number, coordinates: { x: number; y: number; }, direction: Vector2D,
        attack: Attack, effects: Effect[] = [], eventManager: IEventManager,
        objectId: objectTypeId = 'fireball', size: { width: number, height: number } = { width: 24, height: 24 }
    ) {
        super(id, coordinates, size, objectId, eventManager, 'travelling');
        this.direction = direction;
        this.attack = attack;
        this.effects = effects;
        this.hitboxes = [...this.setHitboxes(size)];
        
        this.rotation = this.direction.angle();
    }

    private setHitboxes(size: { width: number, height: number }): HitBoxCircle[] {
        return [new HitBoxCircle({ x: this.coordinates.x + size.width / 2, y: this.coordinates.y + size.height / 2 }, 0, size.width / 2, (otherElement: ObjectElement) => {
            if ('takeDamage' in otherElement && otherElement.id !== this.attack.attacker.id) {
                if (this.hitTargets.has(otherElement.id)) return;
                this.hitTargets.add(otherElement.id);
                
                this.attack.execute(otherElement as any, this.direction);
                this.effects.forEach(effect => effect.apply(otherElement as any));
                super.destroy();
            }
        })];
    }

    public update(deltaTime: number): void {
        const displacement = this.speed * deltaTime;
        this.distanceTraveled += displacement;
        if (this.distanceTraveled >= 350) super.destroy();
        this.velocity = this.direction.clone().normalizeMut().multiplyMut(displacement);
        this.rotation = this.direction.angle();
        
        super.updatePosition();
        this.hitboxes?.forEach(hb => hb.updatePosition({ x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 }));
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Fireball {
        const areaMult = payload.attack?.attacker?.attributes?.areaMultiplier || 1;
        const effects = [
            new AreaDamageEffect(eventManager, 80 * areaMult, payload.attack!), 
            new VisualEffect(eventManager, 'explosion', 0.25, { width: 80 * areaMult, height: 80 * areaMult }) 
        ];
        
        const size = { width: 24 * areaMult, height: 24 * areaMult };
        
        const centeredCoordinates = {
            x: payload.coordinates.x - size.width / 2,
            y: payload.coordinates.y - size.height / 2
        };
        
        return new Fireball(id, centeredCoordinates, payload.direction!, payload.attack!, effects, eventManager, 'fireball', size);
    }
}