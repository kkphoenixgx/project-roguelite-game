import type Entity from "../Entity";
import StatusEffect from "./StatusEffect";

export default class FearStatus extends StatusEffect {
    //? Alta frequência de pulso (0.02s) para inversão vetorial contínua

    constructor(duration: number) { super('fear', 'Vetores de movimento invertidos.', duration, 0.02); }
    
    protected override onTick(target: Entity): void {
        //? Inverte o vetor de movimentação da entidade sob pavor
        target.velocity.invertMut();
        
        const cx = target.coordinates.x + target.size.width / 2; const cy = target.coordinates.y + target.size.height / 2;
        if (Math.random() < 0.1) (target as any).eventManager?.dispatch('particle', { effect: 'magicAura', x: cx, y: cy, color: '#dc143c' });
    }
}