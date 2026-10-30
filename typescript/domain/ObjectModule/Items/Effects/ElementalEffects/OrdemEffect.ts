import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import type Attack from "../../Attack";
import Vector2D from "../../../../shared/Vector2D";

export default class OrdemEffect extends Effect {
    constructor(private source: Entity, private attack: Attack, private elements: string[]) { 
        super('Ordem', 'Causa +1/2 do dano se focado. Anulado se houver Caos na receita.'); 
    }
    public apply(target: Entity): void {
        //? Ordem e Caos são mutuamente excludentes

        if (this.elements.includes('caos')) return;
        
        const baseDmg = (this.attack as any).baseDamage || 10;
        const extraDamage = baseDmg * 0.5; //? Bônus axiomático de +50% de dano
        
        target.takeDamage({ totalDamage: extraDamage, damageType: 'true', isCritical: false, direction: new Vector2D(0,0), attacker: this.source });
        const cx = target.coordinates.x + target.size.width / 2; const cy = target.coordinates.y + target.size.height / 2;
        (target as any).eventManager?.dispatch('particle', { effect: 'criticalStrike', x: cx, y: cy });
    }
}