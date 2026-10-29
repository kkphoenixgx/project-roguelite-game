import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import SceneryElement from '../../domain/ObjectModule/Scenery/SceneryElement';
import ObjectElementManager from '../../domain/ObjectModule/ObjectElementManager';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import CognitiveNPC from '../../domain/ObjectModule/Entities/NPCs/CognitiveNPC';

class DummyCognitiveNPC extends CognitiveNPC {
  public npcName: string = 'Guarda do Castelo';
  public agentName: string = 'guard_npc';

  constructor(id: number, coords: { x: number; y: number }, eventManager: any) {
    super(id, coords, { width: 32, height: 32 }, 'guard', new Attributes(10, 1, 10, 10, 10, 10, 10, 10), eventManager);
  }
}

describe('Unit Tests: AssetStateTrigger & Scenery State Transitions', () => {
  let eventManager: EventHandler;
  let mockCollisionService: any;
  let mockTelemetry: any;

  beforeEach(() => {
    eventManager = new EventHandler();
    mockCollisionService = {
      isPointInPolygon: vi.fn(),
      isPointInCircle: vi.fn(),
      checkCollision: vi.fn(),
      getIntersectingPoints: vi.fn()
    };
    mockTelemetry = {
      recordFrame: vi.fn(),
      recordSubsystemTime: vi.fn(),
      setSpatialInfo: vi.fn(),
      recordFileTiming: vi.fn(),
      setActiveEntities: vi.fn()
    };
  });

  it('1. SceneryElement: deve alterar estado e emitir assetStateChanged via setState, open e close', () => {
    const emittedEvents: any[] = [];
    eventManager.on('assetStateChanged', payload => {
      emittedEvents.push(payload);
    });

    const gate = new SceneryElement(10, { x: 500, y: 500 }, eventManager, 'stone_wall_gate');
    expect(gate.state).toBe('static');
    expect(gate.passable).toBe(false);

    // Abre o portão
    gate.open();
    expect(gate.state).toBe('open');
    expect(gate.passable).toBe(true);
    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0]).toEqual({
      elementId: 10,
      presetType: 'stone_wall_gate',
      previousState: 'static',
      currentState: 'open',
      passable: true
    });

    // Fecha o portão
    gate.close();
    expect(gate.state).toBe('static');
    expect(gate.passable).toBe(false);
    expect(emittedEvents.length).toBe(2);
    expect(emittedEvents[1].currentState).toBe('static');
    expect(emittedEvents[1].passable).toBe(false);
  });

  it('2. ObjectElementManager: handleTriggerAssetState deve filtrar por ID e atualizar colisão estática', () => {
    const manager = new ObjectElementManager(eventManager, mockCollisionService, mockTelemetry);
    const gate = new SceneryElement(101, { x: 100, y: 100 }, eventManager, 'stone_wall_gate');
    (manager as any).elements.set(101, gate);
    (manager as any).elementsArray.push(gate);
    manager.getCollisionManager().addStaticCollider(gate);

    expect(manager.getCollisionManager().getStaticColliders().includes(gate)).toBe(true);

    const changed = manager.handleTriggerAssetState({
      elementId: 101,
      targetState: 'open',
      passable: true
    });

    expect(changed).toBe(true);
    expect(gate.state).toBe('open');
    expect(gate.passable).toBe(true);
    // Como passable é true, foi removido dos colisores estáticos bloqueantes
    expect(manager.getCollisionManager().getStaticColliders().includes(gate)).toBe(false);

    // Agora fecha
    manager.handleTriggerAssetState({
      elementId: 101,
      targetState: 'static',
      passable: false
    });
    expect(gate.state).toBe('static');
    expect(gate.passable).toBe(false);
    expect(manager.getCollisionManager().getStaticColliders().includes(gate)).toBe(true);
  });

  it('3. ObjectElementManager: handleTriggerAssetState deve filtrar por presetType e nearCoordinates', () => {
    const manager = new ObjectElementManager(eventManager, mockCollisionService, mockTelemetry);
    const gateNear = new SceneryElement(201, { x: 300, y: 300 }, eventManager, 'stone_wall_gate');
    const gateFar = new SceneryElement(202, { x: 1800, y: 1800 }, eventManager, 'stone_wall_gate');

    (manager as any).elements.set(201, gateNear);
    (manager as any).elementsArray.push(gateNear);
    (manager as any).elements.set(202, gateFar);
    (manager as any).elementsArray.push(gateFar);

    // Trigger de um NPC localizado em (320, 310) com raio de 150
    const matched = manager.handleTriggerAssetState({
      presetType: 'stone_wall_gate',
      targetState: 'open',
      passable: true,
      nearCoordinates: { x: 320, y: 310, radius: 150 }
    });

    expect(matched).toBe(true);
    expect(gateNear.state).toBe('open');
    expect(gateNear.passable).toBe(true);

    // O portão distante em (1800, 1800) não deve ter sido afetado
    expect(gateFar.state).toBe('static');
    expect(gateFar.passable).toBe(false);
  });

  it('4. CognitiveNPC: comandos openGate e triggerAssetState devem despachar triggerAssetState com raio contextual', () => {
    const dispatchedEvents: any[] = [];
    eventManager.on('triggerAssetState', payload => {
      dispatchedEvents.push(payload);
    });

    const guard = new DummyCognitiveNPC(50, { x: 450, y: 480 }, eventManager);

    // NPC executa intenção de abrir portão
    guard.openGate('stone_wall_gate');

    expect(dispatchedEvents.length).toBe(1);
    expect(dispatchedEvents[0]).toEqual({
      targetState: 'open',
      presetType: 'stone_wall_gate',
      elementId: undefined,
      passable: true,
      nearCoordinates: { x: 450, y: 480, radius: 400 }
    });

    // NPC fecha portão
    guard.closeGate('stone_wall_gate');
    expect(dispatchedEvents.length).toBe(2);
    expect(dispatchedEvents[1]).toEqual({
      targetState: 'static',
      presetType: 'stone_wall_gate',
      elementId: undefined,
      passable: false,
      nearCoordinates: { x: 450, y: 480, radius: 400 }
    });
  });
});
