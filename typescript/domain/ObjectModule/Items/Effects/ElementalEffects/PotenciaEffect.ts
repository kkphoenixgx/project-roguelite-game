import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import Vector2D from "../../../../shared/Vector2D";

export default class PotenciaEffect extends Effect {
    constructor(private source: Entity) { super('Potência', 'Adiciona repulsão fixa massiva.'); }
    public apply(target: Entity): void {
        const dir = Vector2D.sub(target.coordinates, this.source.coordinates).normalizeMut();
        target.applyForce(dir.multiplyMut(50)); //? Aplica vetor de recuo físico de impacto
    }
}