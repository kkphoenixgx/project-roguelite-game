import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import WetStatus from "../../../Entities/Status/WetStatus";

export default class WaterEffect extends Effect {
    constructor() { super('Water', 'Deixa o alvo molhado.'); }
    public apply(target: Entity): void {
        target.applyStatus(new WetStatus(6)); //? Aplica status Molhado por 6 segundos ampliando condutividade
    }
}