import ObjectElement from "../../../ObjectElement";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import { HitboxParser, type HitboxJSON } from "../../../../hitBox/HitboxParser";
import type HitBoxPolygon from "../../../../hitBox/HitBoxPolygon";
import type Entity from "../../../Entities/Entity";
import type Vector2D from "../../../../shared/Vector2D";

export interface AnimatedAttackConfig {
    width: number;
    height: number;
    typeId: string;
    totalFrames: number;
    frameDuration: number;
    pivot: { x: number, y: number };
    scale: number;
    originalFrameWidth: number;
    rawHitboxes: HitboxJSON[][];
    rotationOffset?: number;
}

/**
 * Classe Base para todos os ataques Melee que possuem Hitboxes animadas frame a frame.
 * Ela abstrai a matemática complexa de escala, rotação e offsets de spritesheet.
 */
export default abstract class AnimatedMeleeAttack extends ObjectElement {
    protected attacker: Entity;
    protected attackObj: any;
    protected lifeTime: number = 0;
    protected direction: Vector2D;
    
    protected hitboxesPerFrame: HitBoxPolygon[][] = [];
    protected enemiesHit: Set<number> = new Set();
    protected config: AnimatedAttackConfig;

    constructor(id: number, payload: any, eventManager: IEventManager, config: AnimatedAttackConfig) {
        
    //? Escala sprites e hitboxes de armas corpo a corpo animadas com base no multiplicador de área
        const areaMult = payload.attack?.attacker?.attributes?.areaMultiplier || 1;
        config.scale *= areaMult;
        super({ width: config.width * areaMult, height: config.height * areaMult }, payload.coordinates, id, config.typeId as any, eventManager, 'active');
        
        this.config = config;
        this.attacker = payload.attacker;
        this.attackObj = payload.attack;
        this.direction = payload.direction;
        
        this.rotation = Math.atan2(this.direction.y, this.direction.x) + (config.rotationOffset || 0);

        const onCollide = (other: ObjectElement) => {
            const isFriendly = other.id === this.attacker.id || 
                other.objectId === 'player' || 
                other.objectId === 'spawn-leviatã' || 
                other.objectId === 'spawn-leviata' || 
                other.objectId === 'fishPet';

            if (!isFriendly && !this.enemiesHit.has(other.id) && 'takeDamage' in other) {
                this.enemiesHit.add(other.id);
                this.attackObj.execute(other, this.direction);
            }
        };

        this.hitboxesPerFrame = config.rawHitboxes.map((hitboxesArray, index) => {
            const frameOffsetX = index * config.originalFrameWidth;
            const adjustedHitboxes = hitboxesArray.map(hb => {
                const newPoints = hb.points?.map((p: any) => ({ 
                    x: (p.x - frameOffsetX) * config.scale, 
                    y: p.y * config.scale 
                }));
                return { 
                    ...hb, 
                    points: newPoints, 
                    coordinates: { x: (hb.coordinates.x - frameOffsetX) * config.scale, y: hb.coordinates.y * config.scale } 
                };
            });
            return HitboxParser.parse(adjustedHitboxes as any, config.pivot, onCollide) as HitBoxPolygon[];
        });

        this.hitboxes = this.hitboxesPerFrame[0] || [];
        this.syncPosition();
    }

    protected syncPosition(): void {
        if (this.attacker) {
            const pCenterX = this.attacker.coordinates.x + this.attacker.size.width / 2;
            const pCenterY = this.attacker.coordinates.y + this.attacker.size.height / 2;
            this.coordinates.x = pCenterX;
            this.coordinates.y = pCenterY - this.config.height; 
        }
    }

    public override update(deltaTime: number): void {
        this.lifeTime += deltaTime;
        const currentFrame = Math.floor(this.lifeTime / this.config.frameDuration);
        
        if (currentFrame >= this.config.totalFrames) {
            this.destroy(); return;
        }
        this.syncPosition();

        this.hitboxes = this.hitboxesPerFrame[currentFrame] || [];
        for (const hb of this.hitboxes) { (hb as HitBoxPolygon).update(this.coordinates, this.rotation); }
    }
}