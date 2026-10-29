import type Entity from "../Entity";
import StatusEffect from "./StatusEffect";

export default class WetStatus extends StatusEffect {
    //? Intervalo curto de tick (0.5s) para emissão de partículas de umidade

    constructor(duration: number) { super('wet', 'Vulnerable to Thunder. Resistant to Fire.', duration, 0.5); }
    
    protected override onTick(target: Entity): void {
        const cx = target.coordinates.x + target.size.width / 2; const cy = target.coordinates.y + target.size.height / 2;
        (target as any).eventManager?.dispatch('particle', { effect: 'magicAura', x: cx, y: cy, color: '#00BFFF' });
    }
}