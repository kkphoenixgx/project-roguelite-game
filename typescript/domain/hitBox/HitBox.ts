import type { HitboxDebugShape } from "../ports/domain-contracts";
import type { IObjectElement } from "../ports/domain-contracts";

/**
 * DTO que descreve a forma de uma hitbox para fins de depuração/renderização.
 */

/**
 * Define as propriedades básicas comuns a todas as HitBoxes.
 * Esta classe é abstrata e não pode ser instanciada diretamente.
 */
export abstract class HitBox {
    
    constructor(
        public coordinates:  {x:number, y:number}, 
        public rotation:number = 0,
        public onColision: (otherElement: IObjectElement) => void
    ){}

    /** * Atualiza a posição da HitBox junto com a rotação * @param coodinates Novo conjunto de coordenadas x e y da posição da HitBox. * @param rotation Novo ângulo em radianos da HitBox. */
    public update(coodinates: {x:number, y:number}, rotation:number): void {
        //! Nunca usa console.log no domínio console.log("[HitBoxCircule] update")
        this.updatePosition(coodinates)
        this.updateRotation(rotation)
    }
    /** * Atualiza a posição da HitBox. * @param coordinates Novo conjunto de coordenadas x e y da posição da HitBox. */
    public updatePosition(coodinates: {x:number, y:number}): void {
        this.coordinates.x = coodinates.x;
        this.coordinates.y = coodinates.y;
    }
    /** Atualiza a rotação. * @param rotation Novo ângulo em radianos da HitBox. */
    public updateRotation(rotation: number): void {
        this.rotation = rotation;
    }

    /**
     * MÉTODO OBRIGATÓRIO: Verifica se esta HitBox está colidindo com outra HitBox.
     * A implementação específica depende do tipo de HitBox (círculo, polígono, etc.).
     * @param other A outra HitBox com a qual verificar a colisão.
     * @returns True se houver colisão, false caso contrário.
     */
    public abstract intersects(other: HitBox): boolean;

    /**
     * MÉTODO OBRIGATÓRIO: Retorna um DTO com os dados da forma da hitbox para depuração.
     * @returns Um objeto `HitboxDebugShape`.
     */
    public abstract getDebugShape(): HitboxDebugShape;
}