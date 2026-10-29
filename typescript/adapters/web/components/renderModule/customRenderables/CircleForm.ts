import { RegisterRenderer } from "../../../shared/RenderRegistry";
import GameObjectElement,  { type GameObjectConstructorParams }  from "../visuals/GameObjectElement";

//? Esse type é muito importante
export type BulletConstructorParams = GameObjectConstructorParams;

@RegisterRenderer('circle')
export default class CircleForm extends GameObjectElement {

    constructor({ initialState }: BulletConstructorParams) {
        super(initialState, undefined, document.createElement('img'));
    }

    public override draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
            this.coordinates.x,
            this.coordinates.y,
            this.size.width,
            0,
            2 * Math.PI
        );
        ctx.stroke();
        ctx.restore();
    }
}