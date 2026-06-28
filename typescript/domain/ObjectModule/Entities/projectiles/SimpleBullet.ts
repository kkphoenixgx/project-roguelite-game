import Vector2D from "../../../shared/Vector2D";
import Attack from "../../Items/Attack";
import type ObjectElement from "../../ObjectElement";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";
import Bullet, { type bulletStates } from "./Bullet";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import type { objectTypeId } from "../../objectType.type";
import { RegisterSpawner, type SpawnPayload } from "../../SpawnRegistry";
import type Entity from "../Entity";

@RegisterSpawner('simpleBullet')
@RegisterSpawner('magicMissile')
export class SimpleBullet extends Bullet {
    public accelerator: Vector2D = new Vector2D(0, 0);
    private speed:number = 150
    private distanceTraveled: number = 0
    private pierceCount: number = 0;
    private hitTargets: Set<number> = new Set();
    private target: Entity | null = null;

    constructor (
        id: number,
        coordinates: { x: number; y: number; },
        direction: Vector2D,
        attack: Attack,
        eventManager: IEventManager,
        state :bulletStates = 'travelling',
        objectId: objectTypeId = 'simpleBullet',
        size: { width: number, height: number } = { width: 8, height: 8 },
        target: Entity | null = null
    ){
    super(id, coordinates, size, objectId, eventManager, state);

        this.hitboxes = [...this.setHitboxes(size, attack)]
        this.direction = direction
        this.rotation = this.direction.angle()
        this.generateRandomNoiseAccelerator()
        this.pierceCount = attack.attacker.attributes.piercing || 0;
        this.target = target;
    }

    private setHitboxes(size :{ width :number, height :number }, attack :Attack ) :HitBoxCircle[]{
        return [ new HitBoxCircle(
            { x: this.coordinates.x + size.width / 2, y: this.coordinates.y + size.height / 2 },
            0, //* rotation
            size.width / 2, //* radius
            (otherElement: ObjectElement) => {

                if ('takeDamage' in otherElement && otherElement.id !== attack.attacker.id) {
                    if (this.hitTargets.has(otherElement.id)) return; // Evita acertar o mesmo inimigo multiplas vezes no mesmo frame
                    
                    this.hitTargets.add(otherElement.id);
                    attack.execute(otherElement as any, this.direction);
                    
                    if (this.pierceCount > 0) {
                        this.pierceCount--; // Atravessa o inimigo e perde força de perfuração
                    } else {
                        super.destroy(); // Destrói se não tiver mais energia de perfuração
                    }
                }
            }
        )]
    }

    public update(deltaTime: number): void {
        this.move(deltaTime)
    }

    protected override updatePosition(): void {
        super.updatePosition();
        this.hitboxes?.forEach(hb => hb.updatePosition({ x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 }));
    }

    public override move(deltaTime: number): void {
        // Lógica de Perseguição (Homing) para o Magic Missile
        if (this.objectId === 'magicMissile' && this.target && this.target.attributes.hp > 0) {
            const targetCenter = {
                x: this.target.coordinates.x + this.target.size.width / 2,
                y: this.target.coordinates.y + this.target.size.height / 2
            };
            const selfCenter = {
                x: this.coordinates.x + this.size.width / 2,
                y: this.coordinates.y + this.size.height / 2
            };
            // Recalcula a direção a cada frame para seguir o alvo
            this.direction = Vector2D.sub(targetCenter, selfCenter).normalizeMut();
        } else {
            // Se o alvo morrer ou não existir, o míssil se torna um projétil reto
            this.target = null;
        }

        const displacement = this.speed * deltaTime
        this.distanceTraveled += displacement

        const maxDistance = this.objectId === 'magicMissile' ? 400 : 150;
        if (this.distanceTraveled >= maxDistance) super.destroy()

        // Define a direção e magnitude da velocidade, mas sem o deltaTime.
        this.velocity = this.direction.clone()
            .normalizeMut()
            .multiplyMut(displacement)
            .addMut(this.accelerator);
        
        this.rotation = this.direction.angle()

        this.updatePosition();
    }

    private generateRandomNoiseAccelerator(): void {
        if (this.objectId !== 'simpleBullet') return; // Magias e foices devem ir sempre em linha reta!

        let lateral_noise_factor = 0.1
        const normalizedDirection = this.direction.clone().normalizeMut();
        
        const random = Math.random() * 100
        let perpendicularDirection = normalizedDirection.perpendicularDireita()
        if (random < 50)
            perpendicularDirection = normalizedDirection.perpendicularDireita(); 
        else
            perpendicularDirection = normalizedDirection.perpendicularEsquerda();
        
        
        const randomFactor = Math.random() * 1 - 1;

        this.accelerator = perpendicularDirection.clone().multiplyMut(randomFactor * lateral_noise_factor).multiplyMut(0.5);
        
        const noiseOffset = perpendicularDirection.clone().multiplyMut(randomFactor * lateral_noise_factor);
        
        this.direction = normalizedDirection.clone().addMut(noiseOffset).normalizeMut(); 
    }

    public static createSpawn(id: number, payload: any, eventManager: IEventManager): SimpleBullet {
        let size = { width: 8, height: 8 };
        if (payload.type === 'scytheProjectile') size = { width: 24, height: 24 };
        if (payload.type === 'magicMissile') size = { width: 12, height: 12 };
        
        const areaMult = payload.attack?.attacker?.attributes?.areaMultiplier || 1;
        size = { width: size.width * areaMult, height: size.height * areaMult };
        
        const centeredCoordinates = {
            x: payload.coordinates.x - size.width / 2,
            y: payload.coordinates.y - size.height / 2
        };

        let initialDirection: Vector2D;
        // Se a magia tem um alvo, calcula a direção inicial, senão, usa a direção do payload (tiro reto)
        if (payload.target) {
            const targetCenter = {
                x: payload.target.coordinates.x + payload.target.size.width / 2,
                y: payload.target.coordinates.y + payload.target.size.height / 2
            };
            initialDirection = Vector2D.sub(targetCenter, payload.coordinates).normalizeMut();
        } else {
            initialDirection = payload.direction!;
        }

        return new SimpleBullet(id, centeredCoordinates, initialDirection, payload.attack!, eventManager, 'travelling', payload.type, size, payload.target || null);
    }
}