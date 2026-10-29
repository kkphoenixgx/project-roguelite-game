/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import SceneryElement from '../../domain/ObjectModule/Scenery/SceneryElement';
import CognitiveNPC from '../../domain/ObjectModule/Entities/NPCs/CognitiveNPC';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import GameObjectElement from '../../adapters/web/components/renderModule/visuals/GameObjectElement';
import { RenderRegistry } from '../../adapters/web/shared/RenderRegistry';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';

class CastleGateGuardNPC extends CognitiveNPC {
  public npcName: string = 'Guarda do Portão';
  public agentName: string = 'castle_gate_guard';

  constructor(id: number, coords: { x: number; y: number }, eventManager: any) {
    super(id, coords, { width: 32, height: 32 }, 'guard', new Attributes(10, 1, 10, 10, 10, 10, 10, 10), eventManager);
  }
}

describe('Regressão: Trigger de Evento de Mudança de Asset para Sprite (Abertura de Portão por NPC)', () => {
  let eventManager: EventHandler;
  let mockLogger: any;
  let mockCollision: any;
  let mockTelemetry: any;

  beforeEach(() => {
    eventManager = new EventHandler();
    mockLogger = { log: vi.fn() };
    mockCollision = {
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. Fluxo Completo: NPC aciona openGate -> evento triggerAssetState -> DomainRenderState reflete "open" -> GameObjectElement troca para sprite animado', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      mockLogger,
      eventManager,
      mockCollision,
      mockTelemetry
    );
    await domain.loadWorld('vilgem');

    // 1. Spawna o portão da muralha (stone_wall_gate) em (600, 600)
    const gate = (domain as any).objectManager.spawn((id: number) => new SceneryElement(id, { x: 600, y: 600 }, eventManager, 'stone_wall_gate'));
    const gateId = gate.id;

    // 2. Spawna o guarda em (620, 620)
    const guard = (domain as any).objectManager.spawn((id: number) => new CastleGateGuardNPC(id, { x: 620, y: 620 }, eventManager));

    // Verifica estado inicial do portão
    expect(gate.state).toBe('static');
    expect(gate.passable).toBe(false);

    // Verifica DTO do RenderState no estado inicial
    const initialRenderState = domain.getRenderState();
    const gateRenderableInitial = initialRenderState.renderables.find(r => r.id === gateId);
    expect(gateRenderableInitial).toBeDefined();
    expect(gateRenderableInitial?.state).toBe('static');

    // 3. Cria o GameObjectElement (simulando a apresentação no Canvas 2D)
    const staticConfig = RenderRegistry.spriteConfigs.get('stone_wall_gate-static')!;
    expect(staticConfig).toBeDefined();
    expect(staticConfig.frameCount).toBe(1);

    const initialImg = new Image();
    initialImg.src = staticConfig.imageSrc;
    const visualElement = new GameObjectElement(gateRenderableInitial!, staticConfig, initialImg);
    expect((visualElement as any).config.frameCount).toBe(1);
    expect((visualElement as any).config.imageSrc).toContain('stone_wall_gate_clean.png');

    // 4. O NPC guarda decide abrir o portão!
    const stateChangeEvents: any[] = [];
    eventManager.on('assetStateChanged', payload => {
      stateChangeEvents.push(payload);
    });

    guard.openGate('stone_wall_gate');

    // Assert: Evento emitido com sucesso
    expect(stateChangeEvents.length).toBe(1);
    expect(stateChangeEvents[0]).toEqual({
      elementId: gateId,
      presetType: 'stone_wall_gate',
      previousState: 'static',
      currentState: 'open',
      passable: true
    });
    expect(gate.state).toBe('open');
    expect(gate.passable).toBe(true);

    // 5. Verifica que o DomainRenderState atualizou para 'open'
    const updatedRenderState = domain.getRenderState();
    const gateRenderableUpdated = updatedRenderState.renderables.find(r => r.id === gateId);
    expect(gateRenderableUpdated?.state).toBe('open');

    // 6. Atualiza o GameObjectElement da camada de apresentação
    visualElement.updateState(gateRenderableUpdated!);

    // Assert visual: o objeto agora usa a spritesheet animada stone_wall_gate_anim.png com 4 frames!
    expect((visualElement as any).config.frameCount).toBe(4);
    expect((visualElement as any).config.imageSrc).toContain('stone_wall_gate_anim.png');

    // 7. Simula colisão física do jogador com o portão aberto
    const player = domain.player;
    player.coordinates = { x: 650, y: 650 };
    const originalSpeed = player.currentSpeedModifier;
    player.resolveEnvironmentCollision(gate, 16);
    // Como passable é true, o jogador NÃO é empurrado nem bloqueado
    expect(player.coordinates).toEqual({ x: 650, y: 650 });

    // 8. O guarda agora fecha o portão
    guard.closeGate('stone_wall_gate');
    expect(gate.state).toBe('static');
    expect(gate.passable).toBe(false);

    const closedRenderState = domain.getRenderState();
    const gateRenderableClosed = closedRenderState.renderables.find(r => r.id === gateId);
    expect(gateRenderableClosed?.state).toBe('static');

    visualElement.updateState(gateRenderableClosed!);
    expect((visualElement as any).config.frameCount).toBe(1);
    expect((visualElement as any).config.imageSrc).toContain('stone_wall_gate_clean.png');
  });

  it('2. Disparo Direto de Evento: eventManager.dispatch("triggerAssetState") deve funcionar globalmente', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      mockLogger,
      eventManager,
      mockCollision,
      mockTelemetry
    );
    await domain.loadWorld('vilgem');

    const gate = (domain as any).objectManager.spawn((id: number) => new SceneryElement(id, { x: 200, y: 200 }, eventManager, 'stone_wall_gate'));
    const gateId = gate.id;

    // Evento disparado por um sistema de quest ou gatilho de mapa
    eventManager.dispatch('triggerAssetState', {
      elementId: gateId,
      targetState: 'idle',
      passable: true
    });

    expect(gate.state).toBe('idle');
    expect(gate.passable).toBe(true);
  });
});
