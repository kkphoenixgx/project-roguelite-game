import type Entity from "../Entity";
import StatusEffect from "./StatusEffect";

export default class StunStatus extends StatusEffect {
    constructor(duration: number) { super('stun', 'Completely incapacitated and unable to act.', duration, 0.5); } 
    
    protected override onTick(target: Entity): void {
        const cx = target.coordinates.x + target.size.width / 2; const cy = target.coordinates.y + target.size.height / 2;
        (target as any).eventManager?.dispatch('particle', { effect: 'magicAura', x: cx, y: cy, color: '#9400D3' });
    }
}