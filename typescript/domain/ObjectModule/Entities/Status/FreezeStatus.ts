import type Entity from "../Entity";
import StatusEffect from "./StatusEffect";

export default class FreezeStatus extends StatusEffect {
    constructor(duration: number) { super('freeze', 'Congelado no gelo absoluto.', duration, 0.5); }
    protected override onTick(target: Entity): void {
        target.velocity.resetMut(); //? Anula velocidade impedindo locomoção durante congelamento
        const cx = target.coordinates.x + target.size.width / 2; const cy = target.coordinates.y + target.size.height / 2;
        (target as any).eventManager?.dispatch('particle', { effect: 'magicAura', x: cx, y: cy, color: '#D6FFFA' });
    }
}