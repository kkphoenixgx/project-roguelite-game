import { describe, it, expect, vi, beforeEach } from 'vitest';
import Attributes from '../../../../domain/ObjectModule/Entities/Attributes';
import Dice from '../../../../domain/shared/Dice';
import type IXPTable from '../../../../domain/ObjectModule/Entities/IXPTable';

// Mock da tabela de XP para testes
const mockXpTable: IXPTable = {
  fixedBase: 100,
  levelScale: 1.2,
  getRewardsForLevel: vi.fn(),
};

describe('Attributes', () => {
  beforeEach(() => {
    // Reseta o mock do dado antes de cada teste
    vi.spyOn(Dice, 'rollDice').mockReturnValue(5); // Retorna um valor fixo para determinismo
  });

  it('deve inicializar HP e Mana corretamente', () => {
    // Level 1, 10 CON, Dado de 8 faces. HP = 1 * (5 + 10) = 15
    const attrs = new Attributes(8, 1, 10, 10, 10, 10, 10, 10);
    expect(attrs.maxHp).toBe(15);
    expect(attrs.hp).toBe(15);
    // Max Mana = best of (INT, WIS, CHA) * 10 = 10 * 10 = 100
    expect(attrs.maxMana).toBe(100);
    expect(attrs.mana).toBe(100);
  });

  describe('Cálculo de Atributos Derivados', () => {
    it('deve calcular a defesa corretamente', () => {
      const attrs = new Attributes(8, 1, 10, 10, 10, 10, 10, 10); // CON 10, DEX 10
      // Defence = (10/10) + (10/10) = 2
      expect(attrs.defence).toBe(2);
    });

    it('deve calcular a chance de crítico corretamente', () => {
      const attrs = new Attributes(8, 1, 10, 10, 10, 20, 15, 12); // Best: 20, Lucky: floor(((12+15)/2)/10) = 1
      // CritChance = 3 + (20/10) + 1 = 3 + 2 + 1 = 6
      expect(attrs.critChance).toBe(6);
    });
    
    it('deve calcular o dano crítico corretamente', () => {
        const attrs = new Attributes(8, 1, 10, 10, 10, 20, 15, 12); // Best: 20
        // CritDamage = 150 + (20 * 1) = 170
        expect(attrs.critDamage).toBe(170);
    });
  });

  describe('Progressão de XP e Level Up', () => {
    it('deve adicionar XP sem subir de nível', () => {
      // Sabedoria em 0 para garantir que o multiplicador de Insight seja estritamente 0% nestes cenários
      const attrs = new Attributes(8, 1, 10, 10, 10, 10, 0, 10);
      attrs.addXp(50, mockXpTable);
      expect(attrs.level).toBe(1);
      expect(attrs.currentXp).toBe(50);
      expect(attrs.xpToNextLevel).toBe(100); // 100 * 1.2^0
    });

    it('deve subir de nível ao atingir o XP necessário', () => {
      // Sabedoria em 0 para garantir ganho exato de 100 XP
      const attrs = new Attributes(8, 1, 10, 10, 10, 10, 0, 10);
      const initialMaxHp = attrs.maxHp;
      attrs.addXp(100, mockXpTable);

      expect(attrs.level).toBe(2);
      expect(attrs.currentXp).toBe(0);
      expect(attrs.xpToNextLevel).toBe(120); // 100 * 1.2^1
      // HP Gain = max(1, 5 + 10) = 15
      expect(attrs.maxHp).toBe(initialMaxHp + 15);
      expect(attrs.hp).toBe(attrs.maxHp); // HP é restaurado
    });

    it('deve subir múltiplos níveis de uma vez', () => {
      // Sabedoria em 0 para ganho exato
      const attrs = new Attributes(8, 1, 10, 10, 10, 10, 0, 10);
      // XP para Lvl 2: 100. XP para Lvl 3: 120. Total: 220
      attrs.addXp(250, mockXpTable);
      expect(attrs.level).toBe(3);
      expect(attrs.currentXp).toBe(30); // 250 - 100 - 120 = 30
      expect(attrs.xpToNextLevel).toBeCloseTo(144); // 100 * 1.2^2
    });

    it('deve aplicar o bônus de Insight ao ganho de XP', () => {
        const attrs = new Attributes(8, 1, 10, 10, 10, 10, 100, 10); // WIS 100 -> Insight 10%
        expect(attrs.insight).toBe(10);
        attrs.addXp(100, mockXpTable); // Ganha 100 + 10% = 110
        expect(attrs.level).toBe(2);
        // Usar toBeCloseTo previne quebras decorrentes da imprecisão de float do Javascript
        expect(attrs.currentXp).toBeCloseTo(10); // 110 - 100
    });
  });

  describe('Distribuição de Pontos', () => {
    it('deve gastar um ponto de atributo e aumentar o atributo base', () => {
      const attrs = new Attributes(8, 1, 10, 10, 10, 10, 10, 10);
      attrs.grantAvailablePoint();
      expect(attrs.availablePoints).toBe(2);
      
      const success = attrs.spendPoint('strength');
      expect(success).toBe(true);
      expect(attrs.strength).toBe(11);
      expect(attrs.availablePoints).toBe(1);
    });

    it('não deve gastar um ponto se não houver disponíveis', () => {
      const attrs = new Attributes(8, 1, 10, 10, 10, 10, 10, 10);
      attrs.spendPoint('strength'); // Gasta o 1º ponto inicial
      const success = attrs.spendPoint('strength');
      expect(success).toBe(false);
      expect(attrs.strength).toBe(11);
    });

    it('deve aumentar o HP retroativamente ao gastar ponto em constituição', () => {
      const attrs = new Attributes(8, 5, 10, 10, 10, 10, 10, 10); // Level 5
      const initialMaxHp = attrs.maxHp;
      attrs.grantAvailablePoint();
      attrs.spendPoint('constitution');
      
      expect(attrs.constitution).toBe(11);
      // Aumento = +5 (bônus retroativo de +1 por nível)
      expect(attrs.maxHp).toBe(initialMaxHp + 5);
    });
  });
});