import { describe, it, expect, vi, beforeEach } from 'vitest';
import MeleeWeapon from '../../../../../domain/ObjectModule/Items/Weapons/MeleeWeapons/MeleeWeapon';
import Entity from '../../../../../domain/ObjectModule/Entities/Entity';
import Attributes from '../../../../../domain/ObjectModule/Entities/Attributes';
import type { IEventManager } from '../../../../../domain/eventDispacher/IGameEvents';
import Vector2D from '../../../../../domain/shared/Vector2D';

class MockEventManager implements IEventManager {
  listeners = new Map();
  on(key: string, cb: Function) { this.listeners.set(key, cb); }
  dispatch = vi.fn();
}

class DummyMelee extends MeleeWeapon {
  constructor() {
    super(10, 1.0, 'Melee', 'Desc', 1, 'common', 1, 100, 50, []);
    this.attackRange = 50;
    this.attackAngle = 90; // Cone de 90 graus (45 pra cada lado)
  }
}

class MockEntity extends Entity {
  constructor(id: number, x: number, y: number) {
    super(id, { x, y }, { width: 10, height: 10 }, 'dummy' as any, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), new MockEventManager());
  }
  update() {}
  override takeDamage = vi.fn();
}

describe('MeleeWeapon', () => {
  let attacker: MockEntity;
  let targetInFront: MockEntity;
  let targetBehind: MockEntity;
  let eventManager: MockEventManager;

  beforeEach(() => {
    // Anula o sistema Roguelite do construtor da base Weapon para testes consistentes
    vi.spyOn(Math, 'random').mockReturnValue(1.0);
    
    eventManager = new MockEventManager();
    attacker = new MockEntity(1, 0, 0);       // Centro do atacante: (5, 5)
    targetInFront = new MockEntity(2, 30, 0); // Centro: (35, 5) -> Frente absoluta (Vector 1, 0)
    targetBehind = new MockEntity(3, -30, 0); // Centro: (-25, 5) -> Atrás
    
    vi.clearAllMocks();
  });

  it('deve disparar evento visual (slash) e de partícula ao atacar', () => {
    const weapon = new DummyMelee();
    const dispatchSpy = vi.spyOn(eventManager, 'dispatch');
    
    weapon.attack(attacker, new Vector2D(1, 0), eventManager);

    // requestNeighbors, spawnVisual e particle
    expect(dispatchSpy).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({ type: 'slash' }));
    expect(dispatchSpy).toHaveBeenCalledWith('particle', expect.objectContaining({ effect: 'slashSparks' }));
  });

  it('deve usar Produto Escalar (Dot Product) para atingir apenas alvos dentro do Cone de Visão Frontal', () => {
    const weapon = new DummyMelee();
    
    // Intercepta e simula o Spatial Query com os dois alvos
    vi.spyOn(eventManager, 'dispatch').mockImplementation((key, payload: any) => {
      if (key === 'requestNeighbors') {
        payload.callback([targetInFront, targetBehind]);
      }
    });

    const takeDamageSpyFront = vi.spyOn(targetInFront, 'takeDamage');
    const takeDamageSpyBehind = vi.spyOn(targetBehind, 'takeDamage');

    // Ataca para a direita (1, 0)
    weapon.attack(attacker, new Vector2D(1, 0), eventManager);

    // Alvo na frente foi atingido com dano físico duplamente escalado: 
    // Base (10) + MeleeWeapon bônus (10) + Attack bônus intrínseco (10 * 0.5 = 5) = 25
    expect(takeDamageSpyFront).toHaveBeenCalledOnce();
    expect(takeDamageSpyFront).toHaveBeenCalledWith(expect.objectContaining({ totalDamage: 25 }));
    
    // Alvo atrás foi ignorado graças à limitação do attackAngle de 90 graus
    expect(takeDamageSpyBehind).not.toHaveBeenCalled();
  });

  it('deve respeitar areaMultiplier do atacante se configurado', () => {
    const weapon = new DummyMelee();
    vi.spyOn(attacker.attributes, 'areaMultiplier', 'get').mockReturnValue(2.0);

    const dispatchSpy = vi.spyOn(eventManager, 'dispatch');
    weapon.attack(attacker, new Vector2D(1, 0), eventManager);

    // requestNeighbors deve ter radius = attackRange * areaMultiplier = 50 * 2 = 100
    expect(dispatchSpy).toHaveBeenCalledWith('requestNeighbors', expect.objectContaining({
      radius: 100
    }));
    expect(dispatchSpy).toHaveBeenCalledWith('spawnVisual', expect.objectContaining({
      size: { width: 64, height: 64 }
    }));
  });

  it('deve ignorar vizinho quando for o próprio atacante ou se distance for 0', () => {
    const weapon = new DummyMelee();
    const samePositionTarget = new MockEntity(4, 0, 0); // Mesma coordenada que attacker
    const takeDamageSpy = vi.spyOn(samePositionTarget, 'takeDamage');

    vi.spyOn(eventManager, 'dispatch').mockImplementation((key, payload: any) => {
      if (key === 'requestNeighbors') {
        payload.callback([attacker, samePositionTarget]);
      }
    });

    weapon.attack(attacker, new Vector2D(1, 0), eventManager);
    expect(takeDamageSpy).not.toHaveBeenCalled();
  });
});