import { RegisterRenderer } from "../../../shared/RenderRegistry";
import GameObjectElement, { type GameObjectConstructorParams } from "../visuals/GameObjectElement";

@RegisterRenderer('fishingHook')
export default class FishingHookVisual extends GameObjectElement {
    public connectedTo: { x: number, y: number } | undefined;

    constructor(params: GameObjectConstructorParams) {
        super(params.initialState, undefined, document.createElement('img'));
        const strategy = GameObjectElement.spritesStrategy(params, 'travelling');
        this.setSprite(strategy.config, strategy.image);
        this.connectedTo = (params.initialState as any).connectedTo;
    }

    public override updateState(newState: any): void {
        super.updateState(newState);
        this.connectedTo = newState.connectedTo;
    }

    public override draw(ctx: CanvasRenderingContext2D): void {
        if (this.connectedTo) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.coordinates.x + this.size.width / 2, this.coordinates.y + this.size.height / 2);
            ctx.lineTo(this.connectedTo.x, this.connectedTo.y);
            ctx.strokeStyle = '#aaddff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }
        
        //? Renderiza o sprite do anzol sobre a linha conectora traçada
        super.draw(ctx);
    }
}