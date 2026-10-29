import { describe, it, expect, vi } from 'vitest';
import HitBoxPolygon from '../../../domain/hitBox/HitBoxPolygon';
import { HitBoxCircle } from '../../../domain/hitBox/HitBoxCircle';

describe('HitBoxPolygon', () => {
  const mockCallback = vi.fn();

  it('deve inicializar e retornar a forma de depuração correta sem mutar origem', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    const hitbox = new HitBoxPolygon({ x: 100, y: 100 }, 0, points, { x: 0, y: 0 }, mockCallback);
    
    const shape = hitbox.getDebugShape();
    expect(shape.type).toBe('polygon');
    expect(shape.coordinates.x).toBe(100);
    expect(shape.rotation).toBe(0);
    expect(shape.points!.length).toBe(3);
  });

  describe('Matemática de Transformação de Matriz (Rotação e Translação)', () => {
    it('deve transladar e rotacionar pontos de 90 graus em torno do pivô exato', () => {
      // Um ponto localizado a {x: 10, y: 0} em relação ao pivô
      const points = [{ x: 10, y: 0 }];
      const pivot = { x: 0, y: 0 }; // Pivô na origem da forma
      
      // Coloca a hitbox no mundo em {x: 50, y: 50} com rotação de 90 graus (PI/2 radianos)
      const hitbox = new HitBoxPolygon({ x: 50, y: 50 }, Math.PI / 2, points, pivot, mockCallback);
      
      const rotated = hitbox.getRotatedPoints();
      
      // Ponto (10,0) rotacionado 90° vira (0,10). Somado à posição global (50,50) = (50, 60)
      expect(rotated[0]?.x).toBeCloseTo(50);
      expect(rotated[0]?.y).toBeCloseTo(60);
    });

    it('deve transladar os pontos corretamente quando o pivô possui offset', () => {
      const points = [{ x: 20, y: 20 }];
      const pivot = { x: 10, y: 10 }; // Pivô no centro geométrico fictício
      const hitbox = new HitBoxPolygon({ x: 100, y: 100 }, 0, points, pivot, mockCallback);
      
      const transformed = hitbox.getRotatedPoints();
      // T = (20 - 10) = 10. Rx = 10. Global = 100 + 10 + 10 = 120.
      expect(transformed[0]?.x).toBeCloseTo(120);
      expect(transformed[0]?.y).toBeCloseTo(120);
    });

    it('deve utilizar cache/memoization em chamadas consecutivas de getRotatedPoints sem alteração de coordenadas/rotação', () => {
      const points = [{ x: 5, y: 5 }];
      const pivot = { x: 0, y: 0 };
      const hitbox = new HitBoxPolygon({ x: 10, y: 10 }, 0, points, pivot, mockCallback);
      
      const firstResult = hitbox.getRotatedPoints();
      const secondResult = hitbox.getRotatedPoints();
      expect(secondResult).toBe(firstResult); // Mesma referência em memória (Zero-GC cache hit)
    });
  });

  it('intersects deve retornar false estritamente para delegar o cálculo SAT ao Worker', () => {
    const hitbox = new HitBoxPolygon({ x: 0, y: 0 }, 0, [], { x: 0, y: 0 }, mockCallback);
    const dummyTarget = new HitBoxCircle({ x: 0, y: 0 }, 0, 10, mockCallback);
    expect(hitbox.intersects(dummyTarget)).toBe(false);
  });

  it('deve atualizar posição e rotação via update() da classe base HitBox', () => {
    const hitbox = new HitBoxPolygon({ x: 0, y: 0 }, 0, [{ x: 5, y: 5 }], { x: 0, y: 0 }, mockCallback);
    hitbox.update({ x: 40, y: 80 }, 1.57);
    expect(hitbox.coordinates.x).toBe(40);
    expect(hitbox.coordinates.y).toBe(80);
    expect(hitbox.rotation).toBe(1.57);
  });
});