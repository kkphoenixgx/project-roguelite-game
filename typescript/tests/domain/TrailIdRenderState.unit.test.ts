/**
 * @file TrailIdRenderState.unit.test.ts
 * Teste unitário do contrato de rastro no domínio: o `trailId` declarado por uma entidade (ObjectElement)
 * deve chegar ao `EntityRenderableState` montado por `ObjectElementManager.getAllRenderableStates`.
 */
import { describe, it, expect } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import ObjectElementManager from '../../domain/ObjectModule/ObjectElementManager';
import ObjectElement from '../../domain/ObjectModule/ObjectElement';
import type { ICollisionService } from '../../domain/ports/ICollisionService';

class NoCollisions implements ICollisionService {
    private empty = new Int32Array(0);
    checkCollisions(_d: Float32Array, _c: number, _b: any, callback: (r: Int32Array) => void): void { callback(this.empty); }
}

function setup() {
    const eventBus = new EventHandler();
    const manager = new ObjectElementManager(eventBus, new NoCollisions());
    manager.setWorldBounds(1000, 1000);
    const element = manager.spawn(id => new ObjectElement({ width: 16, height: 16 }, { x: 100, y: 100 }, id, 'fireball' as any, eventBus));
    return { manager, element };
}

describe('TrailIdRenderState (Unit - Domínio)', () => {
    it('ObjectElement não tem rastro por padrão', () => {
        const { manager, element } = setup();

        const state = manager.getAllRenderableStates().find(s => s.id === element.id);

        expect(element.trailId).toBeUndefined();
        expect(state?.trailId).toBeUndefined();
    });

    it('trailId declarado pela entidade é propagado para o estado renderizável', () => {
        const { manager, element } = setup();
        element.trailId = 'fireball_trail';

        const state = manager.getAllRenderableStates().find(s => s.id === element.id);

        expect(state?.trailId).toBe('fireball_trail');
    });

    it('desligar o rastro em runtime remove o trailId do estado (pool de estados reaproveitado)', () => {
        const { manager, element } = setup();
        element.trailId = 'fireball_trail';
        manager.getAllRenderableStates();

        element.trailId = undefined;
        const state = manager.getAllRenderableStates().find(s => s.id === element.id);

        expect(state?.trailId).toBeUndefined();
    });
});
