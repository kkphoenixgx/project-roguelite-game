import Effect from "./Effect";
import type Entity from "../../Entities/Entity";

export default class SpeedBoostEffect extends Effect {
    constructor(private amount: number) {
        super('Frenesi Adrenal', `Aumenta velozmente sua movimentação em +${amount}.`);
    }

    public apply(target: Entity): void {
        target.attributes.speed = this.amount; //? Modificador aditivo de velocidade
        
        const attackerAny = target as any;
        if (attackerAny.eventManager) {
            const cx = target.coordinates.x + target.size.width / 2;
            const cy = target.coordinates.y + target.size.height / 2;
            attackerAny.eventManager.dispatch('particle', { effect: 'magicAura', x: cx, y: cy, color: '#00FFFF' });
        }
    }
}