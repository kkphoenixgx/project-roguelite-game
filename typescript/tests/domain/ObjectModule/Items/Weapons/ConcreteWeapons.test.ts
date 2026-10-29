import { describe, it, expect, vi } from 'vitest';
import SimpleSword from '../../../../../domain/ObjectModule/Items/Weapons/MeleeWeapons/SimpleSword';
import Scythe from '../../../../../domain/ObjectModule/Items/Weapons/MeleeWeapons/Scythe';
import SimpleStaff from '../../../../../domain/ObjectModule/Items/Weapons/RangedWeapons/Staffs/SimpleStaff';
import Gun from '../../../../../domain/ObjectModule/Items/Weapons/RangedWeapons/Gun';
import FishingRod from '../../../../../domain/ObjectModule/Items/Weapons/RangedWeapons/FishingRod';

describe('Concrete Weapons Instantiation', () => {
  // Anula os modificadores de Roguelite para atestar os construtores em estado puro
  vi.spyOn(Math, 'random').mockReturnValue(1.0);

  it('SimpleSword deve pertencer à classe melee e desbloquear Guerreiro', () => {
    const sword = new SimpleSword();
    expect(sword.weaponType).toBe('melee');
    expect(sword.unlocksClass).toBe('Guerreiro');
  });

  it('Scythe deve pertencer ao tipo scythe, ser MeleeWeapon e desbloquear Necromante', () => {
    const scythe = new Scythe();
    expect(scythe.weaponType).toBe('scythe');
    expect(scythe.unlocksClass).toBe('Necromante');
    expect(scythe.attackRange).toBe(80);
    expect(scythe.attackAngle).toBe(180);
    expect(scythe.onHitActions.length).toBe(1);

    // Testa ação de roubo de vida (15%)
    const mockAttacker = { attributes: { hp: 50, strength: 10 }, coordinates: { x: 10, y: 20 } } as any;
    scythe.onHitActions[0]!(mockAttacker, {} as any, 100);
    expect(mockAttacker.attributes.hp).toBe(65); // 50 + (100 * 0.15) = 65

    // Testa método attack de Scythe disparando spawn de scytheSlash
    const mockEventManager = { dispatch: vi.fn(), on: vi.fn() } as any;
    scythe.attack(mockAttacker, { x: 1, y: 0 } as any, mockEventManager);
    expect(mockEventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: 'scytheSlash',
      coordinates: { x: 10, y: 20 }
    }));
  });

  it('ScytheSlash deve instanciar corretamente e registrar spawner', async () => {
    const ScytheSlash = (await import('../../../../../domain/ObjectModule/Items/Weapons/MeleeWeapons/ScytheSlash')).default;
    const mockEventManager = { dispatch: vi.fn(), on: vi.fn() } as any;
    const slash = ScytheSlash.createSpawn(999, {
      coordinates: { x: 50, y: 50 },
      direction: { x: 1, y: 0 },
      attack: { execute: vi.fn() },
      attacker: { coordinates: { x: 50, y: 50 }, size: { width: 32, height: 32 } }
    }, mockEventManager);

    expect(slash).toBeDefined();
    expect(slash.objectId).toBe('scythe-slash');
  });

  it('Sword abstrata deve configurar attackRange e attackAngle adequados', async () => {
    const Sword = (await import('../../../../../domain/ObjectModule/Items/Weapons/MeleeWeapons/Sword')).default;
    class ConcreteSword extends Sword {
      constructor() {
        super(15, 1.0, 'Longsword', 'Desc', 10, 'rare', 10, 50, 100, []);
      }
    }
    const sword = new ConcreteSword();
    expect(sword.attackRange).toBe(60);
    expect(sword.attackAngle).toBe(160);
  });

  it('Staff abstrata deve instanciar como RangedWeapon', async () => {
    const Staff = (await import('../../../../../domain/ObjectModule/Items/Weapons/RangedWeapons/Staffs/Staff')).default;
    class ConcreteStaff extends Staff {
      constructor() {
        super(18, 1.2, 'Elder Staff', 'Desc', 11, 'epic', 11, 100, 100, []);
      }
    }
    const staff = new ConcreteStaff();
    expect(staff.baseDamage).toBe(18);
  });

  it('SimpleStaff deve gerar magicMissile e desbloquear Mago', () => {
    const staff = new SimpleStaff();
    expect(staff.projectileType).toBe('magicMissile');
    expect(staff.unlocksClass).toBe('Mago');
  });

  it('Gun deve pertencer ao tipo gun, gerar simpleBullet e desbloquear Gunslinger', () => {
    const gun = new Gun();
    expect(gun.weaponType).toBe('gun');
    expect(gun.projectileType).toBe('simpleBullet');
    expect(gun.unlocksClass).toBe('Gunslinger');
  });

  it('FishingRod deve gerar fishingHook e desbloquear Pescador', () => {
    const rod = new FishingRod();
    expect(rod.projectileType).toBe('fishingHook');
    expect(rod.unlocksClass).toBe('Pescador');
  });
});