import { describe, it, expect, vi } from 'vitest';
import { HitBoxCircle } from '../../../domain/hitBox/HitBoxCircle';
import type ObjectElement from '../../../domain/ObjectModule/ObjectElement';

describe('HitBoxCircle', () => {
  const mockCallback = vi.fn();

  it('deve inicializar e retornar a forma de depuração correta', () => {
    const hitbox = new HitBoxCircle({ x: 10, y: 20 }, Math.PI, 15, mockCallback);
    
    const shape = hitbox.getDebugShape();
    expect(shape.type).toBe('circle');
    expect(shape.coordinates.x).toBe(10);
    expect(shape.coordinates.y).toBe(20);
    expect(shape.radius).toBe(15);
  });

  it('deve atualizar posição e rotação mantendo a referência', () => {
    const hitbox = new HitBoxCircle({ x: 0, y: 0 }, 0, 10, mockCallback);
    
    hitbox.update({ x: 50, y: 50 }, Math.PI / 2);
    
    expect(hitbox.coordinates.x).toBe(50);
    expect(hitbox.coordinates.y).toBe(50);
    expect(hitbox.rotation).toBe(Math.PI / 2);
    
    const shape = hitbox.getDebugShape();
    expect(shape.coordinates.x).toBe(50);
  });

  describe('Matemática de Intersecção', () => {
    it('deve retornar true quando dois círculos se sobrepõem', () => {
      const c1 = new HitBoxCircle({ x: 0, y: 0 }, 0, 10, mockCallback);
      const c2 = new HitBoxCircle({ x: 15, y: 0 }, 0, 10, mockCallback); // Distância = 15, Soma dos Raios = 20
      
      expect(c1.intersects(c2)).toBe(true);
    });

    it('deve retornar true quando dois círculos se tocam exatamente na borda', () => {
      const c1 = new HitBoxCircle({ x: 0, y: 0 }, 0, 10, mockCallback);
      const c2 = new HitBoxCircle({ x: 20, y: 0 }, 0, 10, mockCallback); // Distância = 20, Soma dos Raios = 20
      
      expect(c1.intersects(c2)).toBe(true);
    });

    it('deve retornar false quando círculos estão separados', () => {
      const c1 = new HitBoxCircle({ x: 0, y: 0 }, 0, 10, mockCallback);
      const c2 = new HitBoxCircle({ x: 25, y: 0 }, 0, 10, mockCallback); // Distância = 25, Soma dos Raios = 20
      
      expect(c1.intersects(c2)).toBe(false);
    });

    it('deve retornar false quando testado contra outro tipo de HitBox (ex: polígono)', () => {
      const c1 = new HitBoxCircle({ x: 0, y: 0 }, 0, 10, mockCallback);
      const fakePolygon = { coordinates: { x: 0, y: 0 }, rotation: 0 } as any;
      expect(c1.intersects(fakePolygon)).toBe(false);
    });

    it('deve acionar o callback em caso de evento forçado', () => {
      const c1 = new HitBoxCircle({ x: 0, y: 0 }, 0, 10, mockCallback);
      c1.onColision({} as ObjectElement);
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});