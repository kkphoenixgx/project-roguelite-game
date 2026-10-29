import Entity, { type DamageInfo } from "../Entity";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import Attributes from "../Attributes";
import Vector2D from "../../../shared/Vector2D";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";
import type ObjectElement from "../../ObjectElement";
import { RegisterSpawner, type SpawnPayload } from "../../SpawnRegistry";

@RegisterSpawner('fishPet')
export default class FishPet extends Entity {
    private lifeTime: number = 5.0; //? Tempo de vida ativo do peixe evocado em segundos

    constructor(
        id: number,
        initialCoordinates: { x: number, y: number },
        eventManager: IEventManager
    ) {
    //? Velocidade elevada para acompanhar a movimentação do jogador ao segui-lo
        const attrs = new Attributes(10, 1, 10, 10, 10, 10, 0, 150);
        
        super(id, initialCoordinates, { width: 16, height: 16 }, 'fishPet', attrs, eventManager);

        this.hitboxes = [
            new HitBoxCircle(
                { x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 },
                0,
                8,
                (other: ObjectElement) => {} //? Invocação puramente passiva; não ataca inimigos
            )
        ];
        
        this.eventManager.dispatch('particle', { effect: 'waterSplash', x: this.coordinates.x, y: this.coordinates.y });
    }

    public override update(deltaTime: number, player?: any): void {
        this.updateStatuses(deltaTime);

        this.lifeTime -= deltaTime;
        if (this.lifeTime <= 0) {
            this.eventManager.dispatch('particle', { effect: 'waterSplash', x: this.coordinates.x, y: this.coordinates.y });
            this.destroy();
            return;
        }

        if (this.activeStatuses.has('stun') || this.activeStatuses.has('paralyze')) return;

        if (player) {
            const px = player.coordinates.x + player.size.width / 2;
            const py = player.coordinates.y + player.size.height / 2;
            const cx = this.coordinates.x + this.size.width / 2;
            const cy = this.coordinates.y + this.size.height / 2;

            const dist = Math.hypot(px - cx, py - cy);
            if (dist > 40) {
                const dir = new Vector2D(px - cx, py - cy).normalizeMut();
                this.direction = dir;
                this.velocity = dir.clone().multiplyMut(this.attributes.speed * deltaTime);
                this.move(deltaTime);
            } else {
                this.velocity.resetMut();
            }
        }
    }

    protected override updatePosition(): void {
        super.updatePosition();
        const cx = this.coordinates.x + this.size.width / 2;
        const cy = this.coordinates.y + this.size.height / 2;
        this.hitboxes?.forEach(hb => hb.updatePosition({ x: cx, y: cy }));
    }

    //? Imortalidade total: ignora o dano mas emite partículas táteis de colisão
    public override takeDamage(damageInfo: DamageInfo): number {
        const centerX = this.coordinates.x + this.size.width / 2;
        const centerY = this.coordinates.y + this.size.height / 2;
        
        this.eventManager.dispatch('particle', { effect: 'waterSplash', x: centerX, y: centerY });
        return 0; //? Permanece indestrutível durante o seu tempo de vida
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): FishPet {
        return new FishPet(id, payload.coordinates, eventManager);
    }
}