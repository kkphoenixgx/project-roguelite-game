import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import ParalyzeStatus from "../../../Entities/Status/ParalyzeStatus";

export default class ThunderEffect extends Effect {
    constructor() { super('Thunder', 'Pode paralisar o alvo.'); }
    public apply(target: Entity): void {
        if (Math.random() < 0.25) { //? 25% de chance de atrofiar locomoção
            target.applyStatus(new ParalyzeStatus(2)); //? Paralisa o alvo por 2 segundos
        }
    }
}