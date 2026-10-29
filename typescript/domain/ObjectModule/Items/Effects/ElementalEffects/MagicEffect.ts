import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import StunStatus from "../../../Entities/Status/StunStatus";

export default class MagicEffect extends Effect {
    constructor() { super('Magic', 'Pode atordoar pesadamente o alvo.'); }
    public apply(target: Entity): void {
        if (Math.random() < 0.15) { //? 15% de chance de ativação do efeito mágico
            target.applyStatus(new StunStatus(1.5));
        }
    }
}