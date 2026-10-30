import { describe, it, expect } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import ObjectElementManager from '../../domain/ObjectModule/ObjectElementManager';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import EnvironmentCollider from '../../domain/ObjectModule/EnvironmentCollider';
import HitBoxPolygon from '../../domain/hitBox/HitBoxPolygon';
import Entity from '../../domain/ObjectModule/Entities/Entity';
import { HitBoxCircle } from '../../domain/hitBox/HitBoxCircle';

function forceGC(): void {
  if (typeof (global as any).gc === 'function') {
    (global as any).gc();
    return;
  }
  try {
    const v8 = require('v8');
    const vm = require('vm');
    v8.setFlagsFromString('--expose_gc');
    const gc = vm.runInNewContext('gc');
    if (typeof gc === 'function') {
      gc();
    }
  } catch {
    // Fallback silencioso
  }
}

class StressEnemy extends Entity {
  constructor(id: number, eventManager: any) {
    super(id, { x: 100, y: 100 }, { width: 32, height: 32 }, 'enemy', new Attributes(10, 1, 10, 10, 10, 10, 10, 10), eventManager);
    this.hitboxes = [new HitBoxCircle({ x: 100, y: 100 }, 0, 16, () => {})];
  }
  update() {}
}

describe('Regressão: Zero-GC sob Estresse Contínuo no Hot Path da Engine', () => {
  it('deve manter estabilidade de heap estrita (< 2MB) após centenas de frames de atualização contínua', () => {
    const eventBus = new EventHandler();
    const fakeCollisionService = { checkCollisions: (_data: any, _count: any, _bounds: any, cb: any) => cb(new Int32Array(0)) };
    const engineManager = new ObjectElementManager(eventBus, fakeCollisionService as any);
    engineManager.setWorldBounds(8192, 8192);

    const player = new Player(1, { x: 500, y: 500 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), eventBus);

    // Spawna 25 colisores poligonais e 25 entidades dinâmicas
    for (let i = 0; i < 25; i++) {
      const hitboxes = [new HitBoxPolygon({ x: i * 40, y: 0 }, 0, [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 40 }], { x: 0, y: 0 }, () => {})];
      engineManager.spawn(id => new EnvironmentCollider(id, { x: i * 40, y: 0 }, { width: 40, height: 40 }, eventBus, hitboxes));
      engineManager.spawn(id => new StressEnemy(id, eventBus));
    }

    // Warm-up inicial para estabilização de caches e JIT
    for (let i = 0; i < 150; i++) {
      player.onRightAction();
      player.update(0.016);
      engineManager.updateAll(0.016, player);
      engineManager.getAllRenderableStates();
    }

    forceGC();
    const memBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < 500; i++) {
      player.onRightAction();
      player.update(0.016);
      engineManager.updateAll(0.016, player);
      engineManager.getAllRenderableStates();
    }

    forceGC();
    const memAfter = process.memoryUsage().heapUsed;
    const deltaMB = (memAfter - memBefore) / 1024 / 1024;

    expect(deltaMB).toBeLessThan(2.0);
  });
});
