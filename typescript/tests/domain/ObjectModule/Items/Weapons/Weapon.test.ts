import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Weapon from '../../../../../domain/ObjectModule/Items/Weapons/Weapon';
import type Entity from '../../../../../domain/ObjectModule/Entities/Entity';
import type Vector2D from '../../../../../domain/shared/Vector2D';
import type { IEventManager } from '../../../../../domain/eventDispacher/IGameEvents';

class DummyWeapon extends Weapon {
  constructor() {
    super(10, 1.0, 'Espada Base', 'Teste', 1, 'common', 1, 100, 50, []);
  }
  attack(attacker: Entity, direction: Vector2D, eventManager: IEventManager): void {}
}

describe('Weapon (Abstract Base) & Roguelite Modifiers', () => {
  let randomSpy: any;

  beforeEach(() => {
    randomSpy = vi.spyOn(Math, 'random');
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('não deve aplicar modificadores se a chance (25%) não for atingida', () => {
    randomSpy.mockReturnValue(0.5); // > 0.25 (Sem modificador)
    const weapon = new DummyWeapon();
    
    expect(weapon.baseDamage).toBe(10);
    expect(weapon.name).toBe('Espada Base');
    expect(weapon.onHitActions.length).toBe(0);
  });

  it('deve aplicar Buff de dano se o modificador for ativado e a chance de buff (70%) for atingida', () => {
    randomSpy
      .mockReturnValueOnce(0.1)  // < 0.25 (Ativa Modificador)
      .mockReturnValueOnce(0.5)  // > 0.3  (É um Buff)
      .mockReturnValueOnce(0.2)  // Multiplicador de dano (1 + 0.2 * 0.4 = 1.08)
      .mockReturnValueOnce(0.9); // > 0.4  (Sem efeito elemental)

    const weapon = new DummyWeapon();
    
    // Base 10 * 1.08 = 10 (floor)
    expect(weapon.name).toBe('Poderosa Espada Base');
    expect(weapon.baseDamage).toBeGreaterThanOrEqual(10);
    expect(weapon.onHitActions.length).toBe(0);
  });

  it('deve aplicar Nerf de dano se a chance de buff falhar', () => {
    randomSpy
      .mockReturnValueOnce(0.1)  // < 0.25 (Ativa Modificador)
      .mockReturnValueOnce(0.1)  // < 0.3  (É um Nerf)
      .mockReturnValueOnce(0.5); // Multiplicador (1 - 0.5 * 0.3 = 0.85)

    const weapon = new DummyWeapon();
    
    expect(weapon.name).toBe('Enferrujada Espada Base');
    expect(weapon.baseDamage).toBe(8); // Math.floor(10 * 0.85)
  });

  it('deve adicionar Efeito Elemental (Fogo) se buffado e atingir a chance elemental', () => {
    randomSpy
      .mockReturnValueOnce(0.1)  // < 0.25 (Ativa Modificador)
      .mockReturnValueOnce(0.5)  // > 0.3  (É um Buff)
      .mockReturnValueOnce(0.5)  // Dano: 1 + 0.5 * 0.4 = 1.2 -> 12 de Dano
      .mockReturnValueOnce(0.1)  // < 0.4  (Ativa Efeito Elemental)
      .mockReturnValueOnce(0.0); // 0 = 'fire' (array: fire, poison, thunder)

    const weapon = new DummyWeapon();
    
    expect(weapon.name).toBe('Flamejante Poderosa Espada Base');
    expect(weapon.baseDamage).toBe(12);
    expect(weapon.onHitActions.length).toBe(1);

    // Test onHitAction for fire
    const mockAttacker = {} as any;
    const mockTarget = { applyStatus: vi.fn() } as any;
    randomSpy.mockReturnValue(0.1); // < 0.3 triggers status
    weapon.onHitActions[0]!(mockAttacker, mockTarget, 10);
    expect(mockTarget.applyStatus).toHaveBeenCalled();
  });

  it('deve adicionar Efeito Elemental (Veneno) se buffado e cair poison', () => {
    randomSpy
      .mockReturnValueOnce(0.1)  // < 0.25 (Ativa Modificador)
      .mockReturnValueOnce(0.5)  // > 0.3  (É um Buff)
      .mockReturnValueOnce(0.5)  // Dano boost
      .mockReturnValueOnce(0.1)  // < 0.4  (Ativa Efeito Elemental)
      .mockReturnValueOnce(0.4); // index 1 = 'poison' (array: fire, poison, thunder)

    const weapon = new DummyWeapon();
    
    expect(weapon.name).toBe('Tóxica Poderosa Espada Base');
    expect(weapon.onHitActions.length).toBe(1);

    // Test onHitAction for poison
    const mockAttacker = {} as any;
    const mockTarget = { applyStatus: vi.fn() } as any;
    randomSpy.mockReturnValue(0.1); // < 0.3 triggers status
    weapon.onHitActions[0]!(mockAttacker, mockTarget, 10);
    expect(mockTarget.applyStatus).toHaveBeenCalled();
  });

  it('deve adicionar Efeito Elemental (Trovão) se buffado e cair thunder', () => {
    randomSpy
      .mockReturnValueOnce(0.1)  // < 0.25 (Ativa Modificador)
      .mockReturnValueOnce(0.5)  // > 0.3  (É um Buff)
      .mockReturnValueOnce(0.5)  // Dano boost
      .mockReturnValueOnce(0.1)  // < 0.4  (Ativa Efeito Elemental)
      .mockReturnValueOnce(0.8); // index 2 = 'thunder' (array: fire, poison, thunder)

    const weapon = new DummyWeapon();
    
    expect(weapon.name).toBe('Chocante Poderosa Espada Base');
    expect(weapon.onHitActions.length).toBe(1);

    // Test onHitAction for thunder
    const mockAttacker = {} as any;
    const mockTarget = { applyStatus: vi.fn() } as any;
    randomSpy.mockReturnValue(0.1); // < 0.2 triggers status
    weapon.onHitActions[0]!(mockAttacker, mockTarget, 10);
    expect(mockTarget.applyStatus).toHaveBeenCalled();
  });

  it('deve inicializar propriedades padrões herdadas', () => {
    randomSpy.mockReturnValue(0.9); // Ignora RNG
    const weapon = new DummyWeapon();
    expect(weapon.weaponType).toBe('melee'); // Padrão da classe base abstrata
  });
});