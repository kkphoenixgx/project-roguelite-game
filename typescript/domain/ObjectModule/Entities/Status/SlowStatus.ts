import type Entity from "../Entity";
import StatusEffect from "./StatusEffect";

export default class SlowStatus extends StatusEffect {
    constructor(duration: number) { super('slow', 'Lentidão severa pelos ventos.', duration, 0.2); }
    protected override onTick(target: Entity): void {
        target.velocity.multiplyMut(0.4); //? Aplica desaceleração proporcional ao vetor de velocidade
        const cx = target.coordinates.x + target.size.width / 2; const cy = target.coordinates.y + target.size.height / 2;
        if (Math.random() < 0.2) (target as any).eventManager?.dispatch('particle', { effect: 'magicAura', x: cx, y: cy, color: '#DBF4E0' });
    }
}