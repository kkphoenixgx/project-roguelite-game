import { describe, it, expect, vi, beforeEach } from 'vitest';
import Player from '../../../../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../../../../domain/ObjectModule/Entities/Attributes';
import type { IEventManager } from '../../../../../domain/eventDispacher/IGameEvents';
import Gun from '../../../../../domain/ObjectModule/Items/Weapons/RangedWeapons/Gun';
import Dice from '../../../../../domain/shared/Dice';
import Potion from '../../../../../domain/ObjectModule/Items/Consumables/Potions/Potions';
import HealEffect from '../../../../../domain/ObjectModule/Items/Effects/HealEffect';
import IronHelmet from '../../../../../domain/ObjectModule/Items/Armors/helmet/IronHelmet';

// Implementação Dummy para testar o consumo, já que a classe Potion é abstrata
class DummyPotion extends Potion {
    constructor(id: string, name: string, effects: HealEffect[]) {
        // name, description, itemId, rarity, iconId, price, effects
        super(name, 'Uma poção de teste', 1, 'common', 1, 10, effects);
        (this as any).id = id;
    }
}

const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };

describe('Player', () => {
  let player: Player;
  let attributes: Attributes;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Dice, 'rollDice').mockReturnValue(8); // HP determinístico
    attributes = new Attributes(8, 1, 10, 10, 10, 10, 10, 10); // 18 HP
    player = new Player(1, { x: 100, y: 100 }, attributes, mockEventManager);
  });

  it('deve mudar o estado para "walking" ao se mover e "idle" ao parar', () => {
    expect(player.getState()).toBe('idle');
    player.onUpAction();
    player.update(0.016);
    expect(player.getState()).toBe('walking');
    
    // Força a neutralização dos inputs cinemáticos no teste
    player.direction.x = 0; player.direction.y = 0;
    
    player.update(0.016); // Frame sem input de movimento
    expect(player.getState()).toBe('idle');
  });

  describe('Combate e Ações', () => {
    it('deve chamar o ataque da arma em onLeftClickAction', () => {
      const gun = new Gun();
      const attackSpy = vi.spyOn(gun, 'attack');
      player.equipment.mainHand = gun;

      player.onLeftClickAction({ x: 200, y: 100 });

      expect(attackSpy).toHaveBeenCalledOnce();
    });

    it('não deve atacar se estiver em cooldown', () => {
      const gun = new Gun();
      const attackSpy = vi.spyOn(gun, 'attack');
      player.equipment.mainHand = gun;

      player.onLeftClickAction({ x: 200, y: 100 }); // Primeiro ataque
      player.onLeftClickAction({ x: 200, y: 100 }); // Tentativa dentro do cooldown

      expect(attackSpy).toHaveBeenCalledOnce();
    });

    it('deve aplicar esquiva e redução de dano ao receber dano', () => {
      const helmet = new IronHelmet(); // 5% de redução de dano
      player.equipment.helmet = helmet;

      // Força o RNG a simular uma esquiva no 1º hit e um acerto no 2º
      const randomSpy = vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.0) // Esquiva garantida
        .mockReturnValue(1.0); // Acerto garantido

      const damageDealt1 = player.takeDamage({ totalDamage: 50, damageType: 'physical', isCritical: false, direction: { x: 1, y: 0 } as any, attacker: {} as any });
      expect(damageDealt1).toBe(0); // Esquivou
      expect(player.attributes.hp).toBe(18);

      const damageDealt2 = player.takeDamage({ totalDamage: 50, damageType: 'physical', isCritical: false, direction: { x: 1, y: 0 } as any, attacker: {} as any });
      // Dano Reduzido = 50 * (1 - 0.05) = 47.5
      // Dano Final = 47.5 - 2 (defesa) = 45.5
      expect(damageDealt2).toBe(45.5);
      expect(player.attributes.hp).toBe(0);
      
      randomSpy.mockRestore();
    });
  });

  describe('Inventário e Equipamentos', () => {
    it('deve equipar uma arma e desequipá-la', () => {
      const gun = new Gun();
      player.backpack.push(gun);
      expect(player.equipment.mainHand).toBeUndefined();

      player.equipItem(0);

      expect(player.equipment.mainHand).toBe(gun);
      expect(player.backpack.length).toBe(0);

      player.unequipItem('mainHand');

      expect(player.equipment.mainHand).toBeUndefined();
      expect(player.backpack[0]).toBe(gun);
    });

    it('deve consumir um item consumível', () => {
      const potion = new DummyPotion('health_potion', 'Poção de Cura', [new HealEffect(10)]);
      player.backpack.push(potion);
      player.attributes.hp = 5;

      player.consumeItem(0);

      expect(player.attributes.hp).toBe(15);
      expect(player.backpack.length).toBe(0);
    });
  });

  describe('Classes e Habilidades', () => {
    it('deve desbloquear e definir uma classe ativa', () => {
      player.unlockClass('Warrior');
      expect(player.unlockedClasses).toContain('Warrior');

      player.setActiveClass('Warrior');
      expect(player.activeClass).toBe('Warrior');
      expect(mockEventManager.dispatch).toHaveBeenCalledWith('classChanged', expect.any(Object));
    });

    it('deve equipar uma skill desbloqueada no loadout', () => {
      player.unlockSkill('test_skill');
      player.equipSkillInLoadout('test_skill', 0);
      expect(player.activeLoadout[0]).toBe('test_skill');
    });
  });

  describe('Dash e Rolagem nos 8 Lados', () => {
    it('deve mudar o estado para "roll" e calcular a rotação correta para cada uma das 8 direções', () => {
      const directions = [
        { name: 'Leste (Direita)', setup: (p: Player) => p.onRightAction(), expectedAngle: 0 },
        { name: 'Sudeste (Baixo-Direita)', setup: (p: Player) => { p.onDownAction(); p.onRightAction(); }, expectedAngle: Math.PI / 4 },
        { name: 'Sul (Baixo)', setup: (p: Player) => p.onDownAction(), expectedAngle: Math.PI / 2 },
        { name: 'Sudoeste (Baixo-Esquerda)', setup: (p: Player) => { p.onDownAction(); p.onLeftAction(); }, expectedAngle: (3 * Math.PI) / 4 },
        { name: 'Oeste (Esquerda)', setup: (p: Player) => p.onLeftAction(), expectedAngle: Math.PI },
        { name: 'Noroeste (Cima-Esquerda)', setup: (p: Player) => { p.onUpAction(); p.onLeftAction(); }, expectedAngle: (-3 * Math.PI) / 4 },
        { name: 'Norte (Cima)', setup: (p: Player) => p.onUpAction(), expectedAngle: -Math.PI / 2 },
        { name: 'Nordeste (Cima-Direita)', setup: (p: Player) => { p.onUpAction(); p.onRightAction(); }, expectedAngle: -Math.PI / 4 },
      ];

      for (const d of directions) {
        // Cria nova instância limpa para cada direção
        const p = new Player(1, { x: 100, y: 100 }, attributes, mockEventManager);
        d.setup(p);
        p.onShiftAction();

        expect(p.getState(), `Falha no estado para ${d.name}`).toBe('roll');
        expect(p.rotation, `Falha no ângulo para ${d.name}`).toBeCloseTo(d.expectedAngle, 4);
      }
    });

    it('deve usar facingDirection se o player usar dash parado sem direção', () => {
      player.facingDirection.x = 0;
      player.facingDirection.y = -1; // Olhando para cima
      player.onShiftAction();

      expect(player.getState()).toBe('roll');
      expect(player.rotation).toBeCloseTo(-Math.PI / 2, 4);
    });

    it('deve manter o estado "roll" durante o dash na chamada de move() e update()', () => {
      player.onRightAction();
      player.onShiftAction();

      expect(player.getState()).toBe('roll');
      player.update(0.016);
      expect(player.getState()).toBe('roll');
    });

    it('deve finalizar o estado "roll" exatamente apos os 300ms do dash', () => {
      player.onRightAction();
      player.onShiftAction();

      expect(player.getState()).toBe('roll');
      // Passa 200ms: ainda no meio do dash
      player.update(0.20);
      expect(player.getState()).toBe('roll');

      // Passa mais 120ms (total 320ms > 300ms): dash e rolagem devem ter terminado e voltado a idle
      player.update(0.12);
      expect(player.getState()).toBe('idle');
      expect(player.rotation).toBe(0);

      // Se houver input de movimento ativo apos o dash, volta a walking
      player.onRightAction();
      player.update(0.016);
      expect(player.getState()).toBe('walking');
    });
  });
});