import Projectile from "./Projectile";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";
import { RegisterSpawner, type SpawnPayload } from "../../SpawnRegistry";
import type Attack from "../../Items/Attack";
import type Vector2D from "../../../shared/Vector2D";
import type ObjectElement from "../../ObjectElement";

@RegisterSpawner('fishingHook')
export default class FishingHook extends Projectile {
    private attack: Attack;
    private hookedTarget: ObjectElement | null = null;
    private distanceTraveled: number = 0;
    private maxRange: number = 400; // Alcance máximo do anzol lançado
    public connectedTo: { x: number, y: number } | null = null;

    constructor(
        id: number,
        coordinates: { x: number, y: number },
        direction: Vector2D,
        attack: Attack,
        eventManager: IEventManager
    ) {
        super(id, coordinates, { width: 16, height: 16 }, 'fishingHook' as any, eventManager, 'travelling');
        
        this.direction = direction;
        this.attack = attack;
        this.rotation = this.direction.angle();
        
        // Hitbox simples circular
        this.hitboxes = [
            new HitBoxCircle(
                { x: this.coordinates.x + 8, y: this.coordinates.y + 8 }, 
                0, // Rotação da HitBox (necessário na assinatura)
                8, 
                this.onColision.bind(this)
            )
        ];

        // Destrói o anzol silenciosamente quando o Pescador soltar a linha
        this.eventManager.on('releaseFishingHook', (payload: any) => {
            if (payload.playerId === this.attack.attacker.id) {
                this.destroy();
            }
        });
    }

    public override update(deltaTime: number): void {
        if (this.hookedTarget) {
            // Se o alvo morreu (por veneno, outro tiro, etc) antes de soltar a linha, solta o anzol!
            if ('attributes' in this.hookedTarget && (this.hookedTarget as any).attributes.hp <= 0) {
                this.destroy();
                return;
            }

            // 1. Mantém o anzol grudado na posição atual do alvo
            this.coordinates.x = this.hookedTarget.coordinates.x + this.hookedTarget.size.width / 2 - this.size.width / 2;
            this.coordinates.y = this.hookedTarget.coordinates.y + this.hookedTarget.size.height / 2 - this.size.height / 2;
            
            const player = this.attack.attacker;
            this.connectedTo = { 
                x: player.coordinates.x + player.size.width / 2, 
                y: player.coordinates.y + player.size.height / 2 
            };

            return; // Interrompe a lógica de balística, pois ele está cravado!
        }

        const speed = 600;
        const displacement = speed * deltaTime;
        
        this.distanceTraveled += displacement;
        if (this.distanceTraveled > this.maxRange) {
            this.destroy();
        }
        
        this.velocity = this.direction.clone().normalizeMut().multiplyMut(displacement);
        
        const player = this.attack.attacker;
        this.connectedTo = { 
            x: player.coordinates.x + player.size.width / 2, 
            y: player.coordinates.y + player.size.height / 2 
        };

        super.updatePosition();
        
        this.hitboxes?.forEach(hb => hb.updatePosition({ 
            x: this.coordinates.x + this.size.width / 2, 
            y: this.coordinates.y + this.size.height / 2 
        }));
    }

    private onColision(otherElement: ObjectElement): void {
        if (this.hookedTarget) return; // Só fisga um por vez

        // Aplica o ataque no alvo (o que engatilhará a "pesca") e destrói o anzol
        const isFriendly = otherElement.id === this.attack.attacker.id || 
            otherElement.objectId === 'player' || 
            otherElement.objectId === 'spawn-leviatã' || 
            otherElement.objectId === 'spawn-leviata' || 
            otherElement.objectId === 'fishPet';

        if ('takeDamage' in otherElement && !isFriendly) {
            
            // Bate em chefes apenas com dano (não ancora)
            if (otherElement.objectId.toString().toLowerCase().includes('boss')) {
                this.attack.execute(otherElement as any, this.direction);
                this.destroy();
                return;
            }

            this.hookedTarget = otherElement;
            this.velocity.resetMut(); // Freio instantâneo do projétil
            this.attack.execute(otherElement as any, this.direction);
            
            // Emite a partícula de engate APENAS UMA VEZ no momento do acerto!
            this.eventManager.dispatch('particle', { effect: 'magicAura', x: this.coordinates.x, y: this.coordinates.y, color: '#aaddff' }); 
        }
    }

    protected override destroy(): void {
        this.eventManager.dispatch('hookDestroyed', { playerId: this.attack.attacker.id });
        super.destroy();
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): FishingHook {
        const size = { width: 16, height: 16 };
        
        // Centraliza a saída do anzol em relação ao atacante/player
        const centeredCoordinates = {
            x: payload.coordinates.x - size.width / 2,
            y: payload.coordinates.y - size.height / 2
        };
        
        return new FishingHook(id, centeredCoordinates, payload.direction!, payload.attack!, eventManager);
    }
}