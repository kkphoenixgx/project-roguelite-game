import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import BurnStatus from "../../../Entities/Status/BurnStatus";

export default class FireEffect extends Effect {
    constructor(private source: Entity) { super('Fire', 'Aplica chamas no alvo.'); }
    public apply(target: Entity): void {
        target.applyStatus(new BurnStatus(4, this.source)); //? Aplica queimadura contínua por 4 segundos
    }
}