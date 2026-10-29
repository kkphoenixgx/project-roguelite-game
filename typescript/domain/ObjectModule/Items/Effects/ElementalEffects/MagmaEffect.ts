import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import BurnStatus from "../../../Entities/Status/BurnStatus";
import Vector2D from "../../../../shared/Vector2D";

export default class MagmaEffect extends Effect {
    constructor(private source: Entity) { super('Magma', 'Dano físico massivo + Queimadura.'); }
    public apply(target: Entity): void {
    //? Adiciona componente de dano físico e status de Queimadura ao impacto mágico
        target.takeDamage({ totalDamage: this.source.attributes.strength * 0.8, damageType: 'physical', isCritical: false, direction: new Vector2D(0,0), attacker: this.source });
        target.applyStatus(new BurnStatus(4, this.source));
    }
}