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
    // Atributos vazios, o dano real virá do Attack injetado!
    const attrs = new Attributes(10, 1, 10, 10, 10, 10, 0, 0);
    
    // Criamos o leviatã com o tamanho exato da sprite (128x128)
    super(id, initialCoordinates, { width: 128, height: 128 }, 'spawn-leviatã' as any, attrs, eventManager, 'spawn');

    // Se o pescador invocou, usa o ataque dele. Se não, usa um fallback de dano mágico
    this.leviataSpawnAttack = attack || new Attack(this, 50, 'magical', []);

    // PRESET DE HITBOX QUADRADA (128x128) compatível nativamente com o Worker de SAT!
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
            { x: 64, y: 64 }, // Pivot no centro exato da imagem
            (other: ObjectElement) => {
                if (other.id === this.id) return;
                // Previne o Leviatã de esmagar o jogador ou outras invocações aliadas
                if (other.objectId === 'player' || other.objectId === 'spawn-leviatã' || other.objectId === 'spawn-leviata' || other.objectId === 'fishPet') return;
                if (this.leviataSpawnAttack.attacker && other.id === this.leviataSpawnAttack.attacker.id) return;

                // Verifica se já não bateu no inimigo e se tem vida
                if (!this.enemiesHit.has(other.id) && 'takeDamage' in other) {
                    this.enemiesHit.add(other.id);
                    
                    // Direção radial a partir do centro do Leviatã para afastar os inimigos atingidos
                    const dir = new Vector2D(
                        (other.coordinates.x + other.size.width / 2) - (this.coordinates.x + this.size.width / 2),
                        (other.coordinates.y + other.size.height / 2) - (this.coordinates.y + this.size.height / 2)
                    );
                    if (dir.x === 0 && dir.y === 0) dir.x = 1; // Anti-NaN
                    dir.normalizeMut();
                    
                    this.leviataSpawnAttack.execute(other as Entity, dir);
                    this.eventManager.dispatch('particle', { effect: 'waterSplash', x: other.coordinates.x, y: other.coordinates.y });
                }
            }
        )
    ];
  }


  //? ----------- Methods -----------

  // Leviatã é uma invocação mágica de área temporária, imune a dano e debuffs
  public override takeDamage(_damageInfo: DamageInfo): number {
    return 0;
  }

  public override applyStatus(_status: any): void {
    // Imune a status effects
  }

  public override update(deltaTime: number, player?: any): void {
    this.updateStatuses(deltaTime);

    this.spawnLifeTime -= deltaTime;
    if (this.spawnLifeTime <= 0) {
        this.destroy(); // Se mata magicamente da memória ao fim da animação
        return;
    }
  }

  public override destroy(): void {
    this.state = 'dead';
    super.destroy();
  }

  protected override updatePosition(): void {
    super.updatePosition();
    // Sincroniza a hitbox quadrada com a entidade
    this.hitboxes?.forEach(hb => hb.updatePosition({ x: this.coordinates.x, y: this.coordinates.y }));
  }

  public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Leviata {
    // Centraliza a coordenada (que vem do clique do mouse) subtraindo metade do tamanho (128 / 2 = 64)
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