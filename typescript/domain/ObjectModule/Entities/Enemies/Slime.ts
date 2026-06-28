import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import { HitBoxCircle } from "../../../hitBox/HitBoxCircle";
import Dice from "../../../shared/Dice";
import Vector2D from "../../../shared/Vector2D";
import type { objectTypeId } from "../../objectType.type";
import Enemy from "./Enemy";
import ObjectElement from "../../ObjectElement";
import Attributes from "../Attributes";
import { RegisterSpawner, type SpawnPayload } from "../../SpawnRegistry";

@RegisterSpawner('slime')
export default class Slime extends Enemy {
  /** @private Armazena a última posição conhecida do jogador para a perseguição. */
  private lastPlayerPos: {x: number; y: number} = {x:0,y:0}
  /** @private Um multiplicador para ajustar a velocidade de movimento específica do Slime. */
  private readonly speedModifier: number = 0.50; // Reduz a velocidade para 50% do valor base.

  //? ----------- Constructor -----------
  constructor(
    id :number,
    level :number,
    baseXp: number,
    coordinates :{ x:number, y:number },
    attributes: Attributes,
    eventManager: IEventManager,
    objectId :objectTypeId = "slime",
  ){ 
    super(id, level, baseXp, coordinates, objectId, attributes, eventManager, "waiting") 
    
    this.hitboxes = [this.setHitbox()];
    this.attributes.hp = (Dice.rollDice(8) * level ) + this.attributes.constitution
      
  }

  //? ----------- Methods -----------

  public update(deltaTime: number, player?: any): void {
    this.updateStatuses(deltaTime);

    if (player) {
      this.lastPlayerPos.x = player.coordinates.x + player.size.width / 2;
      this.lastPlayerPos.y = player.coordinates.y + player.size.height / 2;
    }

    this.hitboxes?.forEach(hb => hb.update(
      { x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 }, this.rotation
    ));
    
    this.eventManager.dispatch('requestNeighbors', {
      requester: this,
      radius: this.size.width,
      callback: (neighbors) => this.moveSlime(deltaTime, neighbors)
    });
  }

  /** * Cria e configura a HitBox do Slime. * A sua principal responsabilidade na colisão é se afastar de outros inimigos * para evitar que fiquem empilhados, usando o método `disperseFrom`. * @returns Uma instância de `HitBoxCircle`. */
  private setHitbox() :HitBoxCircle {
    
    return new HitBoxCircle(
      { x: this.coordinates.x + super.size.width / 2, y: this.coordinates.y + this.size.height / 2 },
      0,
      8,
      (otherElement: ObjectElement) => {

        if ('onStrike' in otherElement && otherElement.id !== this.id) {
          super.disperseFrom(otherElement)
        }

      }
    )

  }

  /** * Contém a lógica de IA (Inteligência Artificial) para o movimento do Slime. * Ele tenta se mover em direção ao jogador, mas usa uma técnica de "steering" * para desviar de outros Slimes que estejam em seu caminho. Fazendo isso em 5 etapas:  * 1. Define linha reta até a última posição conhecida do jogador.* 2. Verifica se vai colidir simplesmente usando essa reta * 3. Se a rota principal está bloqueada, tenta desviar. * 4. Se tiver bloqueada, tenta para esquerda, depois apra a dieita * 5. Aplica o movimento se uma direção válida foi encontrada. * @param deltaTime O tempo decorrido desde o último frame. * @param neighbors Uma lista de `ObjectElement`s próximos, fornecida pelo `ObjectElementManager`. */
  public moveSlime(deltaTime: number, neighbors: ObjectElement[]): void {
    this.state = 'walking';
  
    //* 1. Define linha reta até a última posição conhecida do jogador.
    const primaryDirection = new Vector2D(
      this.lastPlayerPos.x - (this.coordinates.x + this.size.width / 2),
      this.lastPlayerPos.y - (this.coordinates.y + this.size.height / 2)
    ).normalizeMut();
  
    //* 2. Verifica se vai colidir
    const willCollideInDirection = (direction: Vector2D): boolean => {

      const dx = direction.x * (this.attributes.speed * this.speedModifier * deltaTime);
      const dy = direction.y * (this.attributes.speed * this.speedModifier * deltaTime);
      const futureX = this.coordinates.x + this.size.width / 2 + dx;
      const futureY = this.coordinates.y + this.size.height / 2 + dy;
  
      for (let i = 0; i < neighbors.length; i++) {
        const other = neighbors[i];
        if (other instanceof Slime && other.id !== this.id) {
          // Usa a matemática direta ao invés de instanciar novas Hitboxes de forma descartável
          const otherX = other.coordinates.x + other.size.width / 2;
          const otherY = other.coordinates.y + other.size.height / 2;
          const distSq = (futureX - otherX) * (futureX - otherX) + (futureY - otherY) * (futureY - otherY);
          if (distSq < 256) { // (8 + 8)^2 = 256. Assumindo raio de colisão de 8 para cada Slime
            return true;
          }
        }
      }
      return false;
    };
  
    let finalDirection = null;
  
    //* 3. Tenta a direção primária primeiro
    if (!willCollideInDirection(primaryDirection)) {
      finalDirection = primaryDirection;
    } 
    else { //* 4. Se a rota principal está bloqueada, tenta desviar.
      
      //? 45 graus para a esquerda e 45 para a direita.
      const leftDirection = primaryDirection.clone().rotateMut(-45);
      const rightDirection = primaryDirection.clone().rotateMut(45);
  
      //* Tenta a rota da esquerda
      if (!willCollideInDirection(leftDirection)) finalDirection = leftDirection; 
      //* Se não der, rota da direita
      else if (!willCollideInDirection(rightDirection)) finalDirection = rightDirection;

      //* Se todas as três direções (frente, esquerda, direita) estiverem bloqueadas, fica parado mesmo
    }
  
    //* 5. Aplica o movimento se uma direção válida foi encontrada.
    if (finalDirection) {
      this.velocity = finalDirection.clone().multiplyMut(this.attributes.speed * this.speedModifier * deltaTime);
      super.updatePosition();
    } 
    else this.velocity.resetMut();
    
  }

  public onLastPlayerPos( playerCoordinates: {x: number; y: number} ) {
    this.lastPlayerPos.x = playerCoordinates.x
    this.lastPlayerPos.y = playerCoordinates.y

    this.hitboxes?.forEach(hb => hb.update(
      { x: this.coordinates.x + this.size.width / 2, y: this.coordinates.y + this.size.height / 2 }, this.rotation
    ));
  }

  public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Slime {
    return new Slime(id, payload.level || 1, payload.baseXp || 50, payload.coordinates, new Attributes(8, 3, 12, 8, 5, 5, 2, 15), eventManager);
  }
}