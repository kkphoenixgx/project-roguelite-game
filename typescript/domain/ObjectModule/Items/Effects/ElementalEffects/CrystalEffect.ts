import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Attack from "../../Attack";
import Vector2D from "../../../../shared/Vector2D";

export default class CrystalEffect extends Effect {
    constructor(private eventManager: IEventManager, private source: Entity, private originalAttack: Attack, private elements: string[]) { 
        super('Crystal', 'Ao terminar, spawna a mesma magia em 8 direções com 1/8 do dano.'); 
    }
    
    public apply(target: Entity): void {
      //? Filtra elemento 'crystal' para evitar estilhaçamento recursivo infinito
        const shrapnelElements = this.elements.filter(e => e !== 'crystal'); 
        
        const originalDamage = (this.originalAttack as any).baseDamage || 10;
        const shrapnelDamage = Math.max(1, originalDamage / 8);
        
        for (let i = 0; i < 8; i++) {
            const dir = new Vector2D(1, 0).rotateMut(i * 45);
            const shrapnelAttack = new Attack(this.source, shrapnelDamage, 'magical', []);
            this.eventManager.dispatch('spawn', {
                type: 'dynamicSpell', coordinates: { x: target.coordinates.x, y: target.coordinates.y },
                direction: dir, attack: shrapnelAttack, spellElements: shrapnelElements
            });
        }
    }
}