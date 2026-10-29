import { describe, it, expect } from 'vitest';
import Vector2D from '../../../domain/shared/Vector2D';

describe('Vector2D', () => {

  //? --- Testes de Métodos Estáticos (Imutabilidade) ---

  describe('Métodos Estáticos', () => {
    it('sub() deve subtrair vetores e retornar uma nova instância', () => {
      const a = { x: 5, y: 10 };
      const b = { x: 2, y: 3 };
      const result = Vector2D.sub(a, b);

      expect(result).toBeInstanceOf(Vector2D);
      expect(result.x).toBe(3);
      expect(result.y).toBe(7);
      // Garante que os originais não foram mutados
      expect(a.x).toBe(5);
      expect(b.x).toBe(2);
    });

    it('add() deve somar vetores e retornar uma nova instância', () => {
      const a = new Vector2D(1, 2);
      const b = new Vector2D(3, 4);
      const result = Vector2D.add(a, b);

      expect(result).toBeInstanceOf(Vector2D);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
      // Garante que os originais não foram mutados
      expect(a.x).toBe(1);
      expect(b.x).toBe(3);
    });
  });

  //? --- Testes de Métodos de Mutação (Alteram `this`) ---

  describe('Métodos de Mutação (*Mut)', () => {
    it('normalizeMut() deve normalizar o vetor para magnitude ~1', () => {
      const v = new Vector2D(3, 4); // Magnitude 5
      const result = v.normalizeMut();

      expect(result).toBe(v); // Deve retornar a própria instância
      expect(v.magnitude()).toBeCloseTo(1);
      expect(v.x).toBeCloseTo(0.6);
      expect(v.y).toBeCloseTo(0.8);
    });

    it('normalizeMut() de um vetor zero deve resultar em (0, 0)', () => {
      const v = new Vector2D(0, 0);
      v.normalizeMut();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('multiplyMut() deve escalar o vetor', () => {
      const v = new Vector2D(2, 3);
      const result = v.multiplyMut(3);
      expect(result).toBe(v);
      expect(v.x).toBe(6);
      expect(v.y).toBe(9);
    });

    it('addMut() deve somar outro vetor a ele mesmo', () => {
      const v1 = new Vector2D(1, 2);
      const v2 = new Vector2D(3, 4);
      const result = v1.addMut(v2);

      expect(result).toBe(v1);
      expect(v1.x).toBe(4);
      expect(v1.y).toBe(6);
      // Garante que o outro vetor não foi mutado
      expect(v2.x).toBe(3);
    });

    it('subtractMut() deve subtrair outro vetor dele mesmo', () => {
        const v1 = new Vector2D(5, 5);
        const v2 = new Vector2D(1, 2);
        const result = v1.subtractMut(v2);
        expect(result).toBe(v1);
        expect(v1.x).toBe(4);
        expect(v1.y).toBe(3);
    });

    it('resetMut() deve zerar o vetor', () => {
        const v = new Vector2D(10, 20);
        const result = v.resetMut();
        expect(result).toBe(v);
        expect(v.x).toBe(0);
        expect(v.y).toBe(0);
    });

    it('invertMut() deve inverter os componentes do vetor', () => {
        const v = new Vector2D(5, -10);
        const result = v.invertMut();
        expect(result).toBe(v);
        expect(v.x).toBe(-5);
        expect(v.y).toBe(10);
    });

    it('rotateMut() deve rotacionar o vetor corretamente', () => {
        const v = new Vector2D(10, 0);
        v.rotateMut(90); // Rotaciona 90 graus
        expect(v.x).toBeCloseTo(0);
        expect(v.y).toBeCloseTo(10);
    });

    it('divideMut() deve dividir o vetor por um escalar', () => {
        const v = new Vector2D(10, -20);
        v.divideMut(2);
        expect(v.x).toBe(5);
        expect(v.y).toBe(-10);
    });
  });

  //? --- Testes de Métodos de Retorno (Não alteram `this`) ---

  describe('Métodos de Retorno (Imutáveis)', () => {
    it('clone() deve retornar uma nova instância com os mesmos valores', () => {
      const v1 = new Vector2D(10, 20);
      const v2 = v1.clone();

      expect(v2).not.toBe(v1); // Não é a mesma instância
      expect(v2.x).toBe(v1.x);
      expect(v2.y).toBe(v1.y);
    });

    it('magnitude() deve calcular o comprimento do vetor corretamente', () => {
      const v = new Vector2D(3, 4);
      expect(v.magnitude()).toBe(5);
    });

    it('dot() deve calcular o produto escalar corretamente', () => {
      const v1 = new Vector2D(2, 3);
      const v2 = new Vector2D(4, 5);
      // 2*4 + 3*5 = 8 + 15 = 23
      expect(v1.dot(v2)).toBe(23);
    });

    it('perpendicularDireita() deve retornar o vetor rotacionado 90 graus à direita (-y, x)', () => {
      const v = new Vector2D(3, 4);
      const perp = v.perpendicularDireita();
      expect(perp).toBeInstanceOf(Vector2D);
      expect(perp.x).toBe(-4);
      expect(perp.y).toBe(3);
      // Produto escalar de vetores perpendiculares é 0
      expect(v.dot(perp)).toBe(0);
    });

    it('perpendicularEsquerda() deve retornar o vetor rotacionado -90 graus à esquerda (y, -x)', () => {
      const v = new Vector2D(3, 4);
      const perp = v.perpendicularEsquerda();
      expect(perp).toBeInstanceOf(Vector2D);
      expect(perp.x).toBe(4);
      expect(perp.y).toBe(-3);
      expect(v.dot(perp)).toBe(0);
    });

    it('angle() deve calcular o ângulo do vetor em relação ao eixo X considerando o referencial perpendicular', () => {
      const v = new Vector2D(1, 0);
      // perpendicularDireita de (1, 0) é (0, 1), Math.atan2(1, 0) = PI / 2
      expect(v.angle()).toBeCloseTo(Math.PI / 2);
    });

    it('divideMut() não deve alterar o vetor se o divisor for zero', () => {
      const v = new Vector2D(10, 20);
      v.divideMut(0);
      expect(v.x).toBe(10);
      expect(v.y).toBe(20);
    });
  });
});