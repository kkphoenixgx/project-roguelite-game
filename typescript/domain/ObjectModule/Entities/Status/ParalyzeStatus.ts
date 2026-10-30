import type Entity from "../Entity";
import StatusEffect from "./StatusEffect";

export default class ParalyzeStatus extends StatusEffect {
    constructor(duration: number) { super('paralyze', 'Movement completely prevented by electric shocks.', duration, 0.4); } 
    
    protected override onTick(target: Entity): void {
        const cx = target.coordinates.x + target.size.width / 2; const cy = target.coordinates.y + target.size.height / 2;
        (target as any).eventManager?.dispatch('particle', { effect: 'slashSparks', x: cx, y: cy, angle: Math.random() * Math.PI * 2 });
    }
}