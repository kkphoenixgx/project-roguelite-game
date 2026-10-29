import Entity from "../Entity";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import Attributes from "../Attributes";
import Vector2D from "../../../shared/Vector2D";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";
import type ObjectElement from "../../ObjectElement";
import Attack from "../../Items/Attack";
import BurnStatus from "../Status/BurnStatus";
import PoisonStatus from "../Status/PoisonStatus";
import WetStatus from "../Status/WetStatus";
import ParalyzeStatus from "../Status/ParalyzeStatus";
import StunStatus from "../Status/StunStatus";
import { RegisterSpawner, type SpawnPayload } from "../../SpawnRegistry";

@RegisterSpawner('shadowMob')
export default class ShadowMob extends Entity {
    private lastAttackTime: number = 0;
    private attackCooldown: number = 1500; //? Tempo de recarga do golpe em milissegundos

    constructor(
        id: number,
        initialCoordinates: { x: number, y: number },
        attributes: Attributes,
        eventManager: IEventManager
    ) {
        super(id, initialCoordinates, { width: 16, height: 16 }, 'shadowMob' as any, attributes, eventManager);

    //? Ataque mágico que sorteia status elementais onHit
        const shadowAttack = new Attack(this, 8, 'magical', [
            (attacker, target, damageDealt) => {
                const random = Math.random();
    //? Distribuição uniforme de 20% de probabilidade entre os 5 status negativos
                if (random < 0.2) target.applyStatus(new BurnStatus(4, this));
                else if (random < 0.4) target.applyStatus(new PoisonStatus(5, this));
                else if (random < 0.6) target.applyStatus(new WetStatus(6));
                else if (random < 0.8) target.applyStatus(new ParalyzeStatus(2));
                else target.applyStatus(new StunStatus(1.5));
            }
        ]);

        this.hitboxes = [
            new HitBoxCircle(
                { x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 },
                0,
                8,
                (other: ObjectElement) => {
                    if (other.objectId === 'player' && 'takeDamage' in other) {
                        const now = Date.now();
                        if (now - this.lastAttackTime > this.attackCooldown) {
                            this.lastAttackTime = now;
                            const dirX = other.coordinates.x - this.coordinates.x;
                            const dirY = other.coordinates.y - this.coordinates.y;
                            const dir = new Vector2D(dirX, dirY).normalizeMut();
                            shadowAttack.execute(other as Entity, dir);
                        }
                    }
                }
            )
        ];
    }

    public override update(deltaTime: number, player?: any): void {
        this.updateStatuses(deltaTime);

        if (this.activeStatuses.has('stun') || this.activeStatuses.has('paralyze')) return;

        if (player) {
            const dirX = player.coordinates.x - this.coordinates.x;
            const dirY = player.coordinates.y - this.coordinates.y;
            this.direction = new Vector2D(dirX, dirY).normalizeMut();
            
            this.velocity = this.direction.clone().multiplyMut(this.attributes.speed);
            this.move(deltaTime);
        }
    }

    protected override updatePosition(): void {
        super.updatePosition();
        const cx = this.coordinates.x + this.size.width / 2;
        const cy = this.coordinates.y + this.size.height / 2;
        this.hitboxes?.forEach(hb => hb.updatePosition({ x: cx, y: cy }));
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): ShadowMob {
        return new ShadowMob(id, payload.coordinates, new Attributes(10, 5, 10, 10, 20, 10, 10, 10), eventManager);
    }
}