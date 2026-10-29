import Effect from "./Effect";
import type Entity from "../../Entities/Entity";

export default class SizeBoostEffect extends Effect {
    constructor(private areaAmount: number) {
        super('Aumento de Área', `Aumenta o tamanho e alcance de todos os seus ataques em ${areaAmount}%.`);
    }

    public apply(target: Entity): void {
        if ('bonusArea' in target.attributes) {
            (target.attributes as any).bonusArea = this.areaAmount; //? Modificador aditivo de área de efeito
            
            const attackerAny = target as any;
            if (attackerAny.eventManager) {
                const cx = target.coordinates.x + target.size.width / 2;
                const cy = target.coordinates.y + target.size.height / 2;
                attackerAny.eventManager.dispatch('particle', { effect: 'levelUp', x: cx, y: cy, color: '#32CD32' });
            }
        }
    }
}