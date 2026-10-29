import { describe, it, expect, vi, beforeEach } from 'vitest';
import Leviata from '../../../../../domain/ObjectModule/Entities/Casted/Leviata';
import type { IEventManager } from '../../../../../domain/eventDispacher/IGameEvents';
import Attack from '../../../../../domain/ObjectModule/Items/Attack';
import Entity from '../../../../../domain/ObjectModule/Entities/Entity';
import Attributes from '../../../../../domain/ObjectModule/Entities/Attributes';
import Vector2D from '../../../../../domain/shared/Vector2D';

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };

class MockEntity extends Entity {
  constructor(id: number, objectId: string) {
    super(id, { x: 0, y: 0 }, { width: 10, height: 10 }, objectId as any, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), mockEventManager);
  }
  update() {}
}

describe('Leviata', () => {
  let attacker: MockEntity;
  let attack: Attack;

  beforeEach(() => {
    attacker = new MockEntity(1, 'player');
    attack = new Attack(attacker, 50, 'magical');
    vi.clearAllMocks();
  });

  it('deve se destruir após seu tempo de vida', () => {
    const leviata = new Leviata(101, { x: 100, y: 100 }, mockEventManager, attack);
    const destroySpy = vi.spyOn(leviata as any, 'destroy');

    leviata.update(1.0); // Tempo de vida é 0.95s

    expect(destroySpy).toHaveBeenCalledOnce();
  });

  it('deve aplicar dano a um inimigo ao colidir', () => {
    const leviata = new Leviata(101, { x: 100, y: 100 }, mockEventManager, attack);
    const enemy = new MockEntity(2, 'enemy');
    const takeDamageSpy = vi.spyOn(enemy, 'takeDamage');

    leviata.hitboxes![0]!.onColision(enemy);

    expect(takeDamageSpy).toHaveBeenCalledOnce();
  });

  it('não deve sofrer dano (takeDamage deve retornar 0 e não matar o Leviatã)', () => {
    const leviata = new Leviata(101, { x: 100, y: 100 }, mockEventManager, attack);
    const damageDealt = leviata.takeDamage({
      totalDamage: 9999,
      damageType: 'physical',
      isCritical: false,
      direction: new Vector2D(1, 0),
      attacker: attacker as any
    });

    expect(damageDealt).toBe(0);
    expect(leviata.state).not.toBe('dead');
  });

  it('deve ignorar aplicação de status effects (stuns/debuffs)', () => {
    const leviata = new Leviata(101, { x: 100, y: 100 }, mockEventManager, attack);
    leviata.applyStatus({ id: 'stun', duration: 5 });
    expect(leviata.activeStatuses.has('stun')).toBe(false);
  });

  it('não deve aplicar dano a invocações aliadas nem ao jogador', () => {
    const leviata = new Leviata(101, { x: 100, y: 100 }, mockEventManager, attack);
    const otherLeviata = new MockEntity(102, 'spawn-leviata');
    const pet = new MockEntity(103, 'fishPet');
    const playerEntity = new MockEntity(104, 'player');

    const spyOther = vi.spyOn(otherLeviata, 'takeDamage');
    const spyPet = vi.spyOn(pet, 'takeDamage');
    const spyPlayer = vi.spyOn(playerEntity, 'takeDamage');

    leviata.hitboxes![0]!.onColision(otherLeviata);
    leviata.hitboxes![0]!.onColision(pet);
    leviata.hitboxes![0]!.onColision(playerEntity);

    expect(spyOther).not.toHaveBeenCalled();
    expect(spyPet).not.toHaveBeenCalled();
    expect(spyPlayer).not.toHaveBeenCalled();
  });

  it('createSpawn deve criar o Leviatã centralizado corretamente com coordenadas padrão de segurança', () => {
    const spawned = Leviata.createSpawn(105, { type: 'spawn-leviata', coordinates: { x: 200, y: 200 }, attack }, mockEventManager);
    expect(spawned.coordinates.x).toBe(200 - 64);
    expect(spawned.coordinates.y).toBe(200 - 64);
  });
});