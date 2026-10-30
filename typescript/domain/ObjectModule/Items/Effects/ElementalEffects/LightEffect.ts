import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import Vector2D from "../../../../shared/Vector2D";

export default class LightEffect extends Effect {
    constructor(private source: Entity) { super('Light', 'Dano explosivo extra da luz.'); }
    public apply(target: Entity): void {
        //? Radiação de luz escala com Sabedoria e dobra o dano contra mortos-vivos
        target.takeDamage({
            totalDamage: this.source.attributes.wisdom * 1.5,
            damageType: 'light',
            isCritical: false,
            direction: new Vector2D(0, 0),
            attacker: this.source
        });
    }
}