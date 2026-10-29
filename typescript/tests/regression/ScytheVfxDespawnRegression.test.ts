import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import Scythe from '../../domain/ObjectModule/Items/Weapons/MeleeWeapons/Scythe';
import Gun from '../../domain/ObjectModule/Items/Weapons/RangedWeapons/Gun';
import type { ICollisionService } from '../../domain/ports/ICollisionService';
import type { ILogger } from '../../domain/ports/ILogger';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';
import type { EntityRenderableState } from '../../domain/ports/domain-contracts';

describe('Scythe VFX and Attack Despawn Regression Suite', () => {
  let collisionService: ICollisionService;
  let logger: ILogger;
  let eventManager: IEventManager;

  beforeEach(() => {
    const listeners: Record<string, ((payload: any) => void)[]> = {};
    eventManager = {
      on: vi.fn((event, cb) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event]!.push(cb);
      }),
      dispatch: vi.fn((event, payload) => {
        if (listeners[event]) {
          listeners[event]!.forEach(cb => cb(payload));
        }
      }),
      off: vi.fn((event, cb) => {
        if (listeners[event]) {
          listeners[event] = listeners[event]!.filter(c => c !== cb);
        }
      })
    };

    collisionService = {
      checkCollisions: vi.fn(),
      checkRaycast: vi.fn().mockResolvedValue(null)
    } as any;

    logger = {
      log: vi.fn()
    };
  });

  it('deve spawnar o VFX/Entidade ScytheSlash e removê-lo completamente de renderables e chunks após a animação', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    const player = domain.player;
    const scythe = new Scythe();
    player.equipment.mainHand = scythe;

    // Dispara o ataque com a Foice
    player.onLeftClickAction({ x: player.coordinates.x + 100, y: player.coordinates.y });

    // RenderState deve conter o ScytheSlash
    let renderState = domain.getRenderState();
    let slashRenderable = renderState.renderables.find((r: EntityRenderableState) => r.entityTypeId === 'scythe-slash');
    expect(slashRenderable).toBeDefined();
    const slashId = slashRenderable!.id;

    // Simula alguns quadros intermediários (0.15s no total)
    domain.update(0.05);
    domain.update(0.05);
    domain.update(0.05);

    renderState = domain.getRenderState();
    slashRenderable = renderState.renderables.find((r: EntityRenderableState) => r.id === slashId);
    expect(slashRenderable).toBeDefined();

    // Simula a conclusão da animação (avança mais de 0.4s com clampedDeltaTime)
    for (let f = 0; f < 25; f++) {
      domain.update(0.02);
    }

    // O ScytheSlash DEVE ter sumido completamente
    renderState = domain.getRenderState();
    slashRenderable = renderState.renderables.find((r: EntityRenderableState) => r.id === slashId || r.entityTypeId === 'scythe-slash');
    expect(slashRenderable).toBeUndefined();

    // Mais updates de jogo NÃO devem ressuscitar o elemento na malha de chunks ou renderables
    for (let i = 0; i < 20; i++) {
      domain.update(0.016);
    }

    renderState = domain.getRenderState();
    slashRenderable = renderState.renderables.find((r: EntityRenderableState) => r.entityTypeId === 'scythe-slash');
    expect(slashRenderable).toBeUndefined();
  });

  it('não deve acumular instâncias zumbis após múltiplos ataques sucessivos com a Foice', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    const player = domain.player;
    const scythe = new Scythe();
    player.equipment.mainHand = scythe;

    // Executa 3 ataques sucessivos, avançando o tempo o suficiente para cada um expirar
    for (let swing = 0; swing < 3; swing++) {
      player.onLeftClickAction({ x: player.coordinates.x + 100, y: player.coordinates.y });
      let state = domain.getRenderState();
      expect(state.renderables.filter((r: EntityRenderableState) => r.entityTypeId === 'scythe-slash').length).toBe(1);

      // Avança além do tempo da animação e cooldown
      for (let f = 0; f < 50; f++) {
        domain.update(0.02);
      }

      state = domain.getRenderState();
      expect(state.renderables.filter((r: EntityRenderableState) => r.entityTypeId === 'scythe-slash').length).toBe(0);
    }

    // Ao final dos 3 ataques, nenhum scythe-slash deve permanecer
    const finalState = domain.getRenderState();
    expect(finalState.renderables.filter((r: EntityRenderableState) => r.entityTypeId === 'scythe-slash').length).toBe(0);
  });

  it('deve garantir que projéteis disparados também sumam de renderables ao atingir alcance máximo', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      logger,
      eventManager,
      collisionService
    );
    await domain.loadWorld('vilgem');

    const player = domain.player;
    const gun = new Gun();
    player.equipment.mainHand = gun;

    // Dispara a arma de fogo
    player.onLeftClickAction({ x: player.coordinates.x + 100, y: player.coordinates.y });

    let renderState = domain.getRenderState();
    let bulletRenderable = renderState.renderables.find((r: EntityRenderableState) => r.entityTypeId === 'simpleBullet');
    expect(bulletRenderable).toBeDefined();

    // Avança o tempo até o projétil atingir a distância máxima e se destruir (com velocidade ~400px/s e max distance 600)
    for (let f = 0; f < 100; f++) {
      domain.update(0.02);
    }

    renderState = domain.getRenderState();
    bulletRenderable = renderState.renderables.find((r: EntityRenderableState) => r.entityTypeId === 'simpleBullet');
    expect(bulletRenderable).toBeUndefined();
  });
});
