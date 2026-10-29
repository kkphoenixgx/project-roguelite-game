import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import Attributes from "../Attributes";
import Entity, { type DamageInfo } from "../Entity";
import { RegisterSpawner, type SpawnPayload } from "../../SpawnRegistry";
import HitBoxPolygon from "../../../hitBox/HitBoxPolygon";
import type ObjectElement from "../../ObjectElement";
import Attack from "../../Items/Attack";
import Vector2D from "../../../shared/Vector2D";

@RegisterSpawner('spawn-leviatã')
@RegisterSpawner('spawn-leviata')
export default class Leviata extends Entity {
  

  private spawnLifeTime: number = 0.95; 

  private enemiesHit: Set<number> = new Set();
  private leviataSpawnAttack: Attack;


  //? ----------- Constructor -----------

  constructor(
    id: number,
    initialCoordinates: { x: number, y: number },
    eventManager: IEventManager,
    attack?: Attack
  ) {
    const attrs = new Attributes(10, 1, 10, 10, 10, 10, 0, 0);
    super(id, initialCoordinates, { width: 128, height: 128 }, 'spawn-leviatã' as any, attrs, eventManager, 'spawn');

    //? Fallback defensivo de dano mágico se invocado sem Attack customizado pelo Pescador.
    this.leviataSpawnAttack = attack || new Attack(this, 50, 'magical', []);

    //? Hitbox poligonal retangular 128x128 compatível com o worker de colisão SAT.
    const squarePoints = [
      { x: 0, y: 0 },
      { x: 128, y: 0 },
      { x: 128, y: 128 },
      { x: 0, y: 128 }
    ];
    
    this.hitboxes = [
        new HitBoxPolygon(
            { x: this.coordinates.x, y: this.coordinates.y },
            0,
            squarePoints,
            { x: 64, y: 64 },
            (other: ObjectElement) => {
                if (other.id === this.id) return;
                if (other.objectId === 'player' || other.objectId === 'spawn-leviatã' || other.objectId === 'spawn-leviata' || other.objectId === 'fishPet') return;
                if (this.leviataSpawnAttack.attacker && other.id === this.leviataSpawnAttack.attacker.id) return;

                if (!this.enemiesHit.has(other.id) && 'takeDamage' in other) {
                    this.enemiesHit.add(other.id);
                    
                    //? Vetor de repulsão radial a partir do centro do Leviatã.
                    const dir = new Vector2D(
                        (other.coordinates.x + other.size.width / 2) - (this.coordinates.x + this.size.width / 2),
                        (other.coordinates.y + other.size.height / 2) - (this.coordinates.y + this.size.height / 2)
                    );
                    //? Previne NaN em repulsão perfeitamente sobreposta.
                    if (dir.x === 0 && dir.y === 0) dir.x = 1;
                    dir.normalizeMut();
                    
                    this.leviataSpawnAttack.execute(other as Entity, dir);
                    this.eventManager.dispatch('particle', { effect: 'waterSplash', x: other.coordinates.x, y: other.coordinates.y });
                }
            }
        )
    ];
  }


  //? ----------- Methods -----------

  //? Invocação mágica efêmera imune a dano e controle de grupo.
  public override takeDamage(_damageInfo: DamageInfo): number {
    return 0;
  }

  public override applyStatus(_status: any): void {
  }

  public override update(deltaTime: number, player?: any): void {
    this.updateStatuses(deltaTime);

    this.spawnLifeTime -= deltaTime;
    if (this.spawnLifeTime <= 0) {
        this.destroy();
        return;
    }
  }

  public override destroy(): void {
    this.state = 'dead';
    super.destroy();
  }

  protected override updatePosition(): void {
    super.updatePosition();
    this.hitboxes?.forEach(hb => hb.updatePosition({ x: this.coordinates.x, y: this.coordinates.y }));
  }

  public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Leviata {
    //? Centraliza o spawn deslocando metade da dimensão 128x128 em relação ao clique do cursor.
    const px = payload.coordinates?.x ?? 0;
    const py = payload.coordinates?.y ?? 0;
    const centeredCoords = {
        x: px - 64,
        y: py - 64
    };
    return new Leviata(id, centeredCoords, eventManager, payload.attack);
  }


  //? ----------- Getters and Setters -----------

}