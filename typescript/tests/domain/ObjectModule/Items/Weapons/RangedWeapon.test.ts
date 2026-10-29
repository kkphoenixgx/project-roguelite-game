import { describe, it, expect, vi, beforeEach } from 'vitest';
import RangedWeapon from '../../../../../domain/ObjectModule/Items/Weapons/RangedWeapons/RangedWeapon';
import Entity from '../../../../../domain/ObjectModule/Entities/Entity';
import Attributes from '../../../../../domain/ObjectModule/Entities/Attributes';
import type { IEventManager } from '../../../../../domain/eventDispacher/IGameEvents';
import Vector2D from '../../../../../domain/shared/Vector2D';

class DummyRanged extends RangedWeapon {
  constructor() {
    super(10, 1.0, 'Ranged', 'Desc', 1, 'common', 1, 100, 50, []);
    this.projectileType = 'simpleBullet';
  }
}

class MockEntity extends Entity {
  constructor(id: number) {
    super(id, { x: 0, y: 0 }, { width: 10, height: 10 }, 'dummy' as any, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), { dispatch: vi.fn(), on: vi.fn() });
  }
  update() {}
}

describe('RangedWeapon', () => {
  let attacker: MockEntity;
  let eventManager: IEventManager;

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0); // Anula Roguelite Modifiers
    attacker = new MockEntity(1);
    eventManager = { dispatch: vi.fn(), on: vi.fn() };
  });

  it('deve disparar evento de spawn de projétil com as coordenadas centralizadas', () => {
    const weapon = new DummyRanged();
    const dispatchSpy = vi.spyOn(eventManager, 'dispatch');
    
    weapon.attack(attacker, new Vector2D(1, 0), eventManager);

    expect(dispatchSpy).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: 'simpleBullet',
    }));
  });

  it('deve usar fallback de projectileType quando não definido na arma', () => {
    class FallbackRanged extends RangedWeapon {
      constructor() {
        super(20, 1.0, 'Ranged No Type', 'Desc', 2, 'common', 2, 100, 50, []);
      }
    }
    const fallbackWeapon = new FallbackRanged();
    const dispatchSpy = vi.spyOn(eventManager, 'dispatch');
    
    fallbackWeapon.attack(attacker, new Vector2D(0, 1), eventManager);

    expect(dispatchSpy).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: 'simpleBullet',
      coordinates: { x: 5, y: 5 },
      attack: expect.objectContaining({ baseDamage: 25 }) // 20 + floor(10/2) = 25
    }));
  });
});