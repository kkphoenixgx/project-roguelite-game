import Entity from "../Entity";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import type Attributes from "../Attributes";
import type { BdiIntention, IBdiGateway } from "../../../ports/IBdiGateway";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";

/**
 * Entidade controlada por um Motor BDI (Belief-Desire-Intention) externo.
 * NPCs neutros que podem interagir, vagar ou até mesmo atacar dependendo de suas crenças.
 */
export default class BdiAgentEntity extends Entity {
    private currentIntention: BdiIntention = { action: 'idle' };
    private perceptionTimer: number = 0;

    constructor(
        id: number,
        initialCoordinates: { x: number, y: number },
        attributes: Attributes,
        eventManager: IEventManager,
        private bdiGateway: IBdiGateway
    ) {
        super(id, initialCoordinates, { width: 16, height: 16 }, 'bdiAgent', attributes, eventManager);
        
        this.hitboxes = [
            new HitBoxCircle(
                { x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 },
                0,
                8,
                (_otherElement) => {}
            )
        ];
    }

    /** Necessário para a engine reconhecer o NPC como um ser atacável pelas magias do jogador. */
    public onStrike(): any {
        return null;
    }

    /** Chamado pelo Adaptador de Sockets quando o Athena envia uma nova decisão. */
    public setIntention(intention: BdiIntention): void {
        this.currentIntention = intention;
    }

    public override update(deltaTime: number): void {
      this.updateStatuses(deltaTime);

      //? Envia percepções ao Motor BDI a cada ~0.5s para evitar inundação do socket/IPC.
      this.perceptionTimer += deltaTime;
      if (this.perceptionTimer >= 0.5) {
          this.perceptionTimer = 0;
          this.bdiGateway.sendPerceptions({
              agentId: this.id,
              hpPercentage: this.attributes.hp / this.attributes.maxHp,
              isColliding: false
          });
      }

      //? Executa fisicamente a intenção BDI recebida (o motor atua como o efetor do agente).
      if ((this.currentIntention.action === 'move_to' || this.currentIntention.action === 'flee') && this.currentIntention.targetPos) {
          this.direction.x = this.currentIntention.targetPos.x - this.coordinates.x;
          this.direction.y = this.currentIntention.targetPos.y - this.coordinates.y;
          this.velocity = this.direction.clone().normalizeMut().multiplyMut(this.attributes.speed * deltaTime);
            this.updatePosition(); 
      }
        
      this.hitboxes?.forEach(hb => hb.updatePosition({ x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 }));
    }
}