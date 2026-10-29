import { describe, it, expect, vi, beforeEach } from 'vitest';
import ObjectElementManager from '../../../domain/ObjectModule/ObjectElementManager';
import type { IEventManager } from '../../../domain/eventDispacher/IGameEvents';
import type { ICollisionService } from '../../../domain/ports/ICollisionService';
import { SpawnRegistry, type SpawnFactory } from '../../../domain/ObjectModule/SpawnRegistry';
import ObjectElement from '../../../domain/ObjectModule/ObjectElement';
import Player from '../../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../../domain/ObjectModule/Entities/Attributes';
import { HitBoxCircle } from '../../../domain/hitBox/HitBoxCircle';

// --- Mocks e Fakes ---
class MockEventManager implements IEventManager {
  listeners: Map<string, Function[]> = new Map();
  on(key: string, callback: Function) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(callback);
  }
  dispatch(key: string, payload: any) {
    this.listeners.get(key)?.forEach(cb => cb(payload));
  }
}

class MockCollisionService implements ICollisionService {
  checkCollisions = vi.fn(async () => new Int32Array([]));
}

// Dummy class para testes de spawn
class DummyElement extends ObjectElement {
  static createSpawn: SpawnFactory = (id, payload, eventManager) => new DummyElement(id, payload.coordinates, eventManager);
  constructor(id: number, coords: {x: number, y: number}, eventManager: IEventManager) {
    super({width: 10, height: 10}, coords, id, 'dummy', eventManager, 'idle', [new HitBoxCircle(coords, 0, 5, vi.fn())]);
  }
}
SpawnRegistry.strategies.set('dummy', DummyElement.createSpawn);


describe('ObjectElementManager', () => {
  let manager: ObjectElementManager;
  let eventManager: MockEventManager;
  let collisionService: MockCollisionService;
  let player: Player;

  beforeEach(() => {
    eventManager = new MockEventManager();
    vi.spyOn(eventManager, 'dispatch');
    vi.spyOn(eventManager, 'on');
    collisionService = new MockCollisionService();
    manager = new ObjectElementManager(eventManager, collisionService);
    manager.setWorldBounds(1000, 1000);
    
    player = new Player(1, {x: 500, y: 500}, new Attributes(8, 1, 10,10,10,10,10,10), eventManager as any);
  });

  it('deve se inscrever nos eventos de spawn, despawn e requestNeighbors', () => {
    expect(eventManager.on).toHaveBeenCalledWith('spawn', expect.any(Function));
    expect(eventManager.on).toHaveBeenCalledWith('despawn', expect.any(Function));
    expect(eventManager.on).toHaveBeenCalledWith('requestNeighbors', expect.any(Function));
  });

  it('deve spawnar um elemento ao receber o evento "spawn"', () => {
    eventManager.dispatch('spawn', { type: 'dummy', coordinates: { x: 10, y: 10 } });
    const element = manager.getElementById(100); // O primeiro ID é 100
    expect(element).toBeInstanceOf(DummyElement);
    expect(element?.coordinates).toEqual({ x: 10, y: 10 });
  });

  it('deve remover um elemento ao receber o evento "despawn"', () => {
    const spawned = manager.spawn(id => new DummyElement(id, {x: 20, y: 20}, eventManager));
    expect(manager.getElementById(spawned.id)).toBeDefined();
    
    eventManager.dispatch('despawn', { objectId: spawned.id });
    expect(manager.getElementById(spawned.id)).toBeUndefined();
  });

  it('deve chamar o update de todos os elementos e a checagem de colisão', () => {
    const el1 = manager.spawn(id => new DummyElement(id, {x: 1, y: 1}, eventManager));
    const el2 = manager.spawn(id => new DummyElement(id, {x: 2, y: 2}, eventManager));
    const spy1 = vi.spyOn(el1, 'update');
    const spy2 = vi.spyOn(el2, 'update');

    manager.updateAll(0.016, player);

    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
    expect(collisionService.checkCollisions).toHaveBeenCalledOnce();
  });

  it('deve resolver colisões pendentes no início do próximo update', () => {
    const el1 = manager.spawn(id => new DummyElement(id, {x: 1, y: 1}, eventManager));
    const el2 = manager.spawn(id => new DummyElement(id, {x: 2, y: 2}, eventManager));
    const spyCol1 = vi.spyOn(el1.hitboxes![0]!, 'onColision');
    const spyCol2 = vi.spyOn(el2.hitboxes![0]!, 'onColision');

    (manager as any).collisionManager.pendingCollisions = new Int32Array([el1.id, el2.id]);

    manager.updateAll(0.016, player);

    expect(spyCol1).toHaveBeenCalledWith(el2);
    expect(spyCol2).toHaveBeenCalledWith(el1);
    expect((manager as any).collisionManager.pendingCollisions.length).toBe(0);
  });

  it('deve retornar vizinhos dentro de um raio em "requestNeighbors"', () => {
    const centerEl = manager.spawn(id => new DummyElement(id, {x: 100, y: 100}, eventManager));
    const nearEl = manager.spawn(id => new DummyElement(id, {x: 110, y: 100}, eventManager)); // dist 10
    const farEl = manager.spawn(id => new DummyElement(id, {x: 200, y: 200}, eventManager)); // dist > 100
    const callback = vi.fn();

    eventManager.dispatch('requestNeighbors', { requester: centerEl, radius: 20, callback });

    expect(callback).toHaveBeenCalledOnce();
    const neighbors = callback.mock.calls[0]![0];
    expect(neighbors).toContain(nearEl);
    expect(neighbors).not.toContain(farEl);
    expect(neighbors).not.toContain(centerEl);
    expect(neighbors.length).toBe(1);
  });

  it('deve manter os elementos dentro dos limites do mundo', () => {
    const element = manager.spawn(id => new DummyElement(id, {x: -50, y: 1100}, eventManager));
    manager.setWorldBounds(800, 600);
    
    manager.updateAll(0.016, player);

    expect(element.coordinates.x).toBe(0);
    expect(element.coordinates.y).toBe(590);
  });
});