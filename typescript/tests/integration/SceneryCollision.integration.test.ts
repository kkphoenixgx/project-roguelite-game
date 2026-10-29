import { describe, it, expect, beforeEach, vi } from 'vitest';
import DomainFacade from "../../domain/DomainFacade";
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { CollisionAdapter } from '../../domain/ports/CollisionAdapter';
import { logger } from '../../adapters/web/shared/Logger';
import type Player from '../../domain/ObjectModule/Entities/Player/Player';
import SceneryElement from '../../domain/ObjectModule/Scenery/SceneryElement';

// Mock Worker para testes em Node.js
vi.stubGlobal('Worker', class WorkerMock { postMessage() {} terminate() {} });

describe('Integration Test: Colisões de Cenário e Props de Alvorada de Vilgem', () => {
  let domain: DomainFacade;
  let eventManager: EventHandler;
  let collisionAdapter: CollisionAdapter;

  beforeEach(async () => {
    eventManager = new EventHandler();
    collisionAdapter = new CollisionAdapter();

    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 500, y: 500 } } },
      logger,
      eventManager,
      collisionAdapter
    );

    // Carrega mundo básico para inicializar o jogador
    await domain.loadWorld('vilgem');

    // Limpa os elementos do mapa para testar as mecânicas de colisão em isolamento puro
    const om = (domain as any).objectManager;
    const cm = om.collisionManager;
    om.elements.clear();
    om.elementsArray.length = 0;
    cm.staticCollidersCache.length = 0;
    cm.staticGrid.clear();
  });

  it('deve registrar SceneryElement como collider estático no ObjectElementManager', () => {
    const objectManager = (domain as any).objectManager;
    const fountain = objectManager.spawn((id: number) => 
      new SceneryElement(id, { x: 1000, y: 1000 }, eventManager, 'fountain_awakening')
    );

    expect(fountain).toBeDefined();
    expect(fountain.objectId).toBe('fountain_awakening');
    expect(fountain.passable).toBe(false);

    const collisionManager = (objectManager as any).collisionManager;
    const statics = (collisionManager as any).staticCollidersCache;
    expect(statics).toContain(fountain);
  });

  it('deve empurrar o jogador para fora da Fonte Circular (HitBoxCircle) quando colidir', () => {
    const objectManager = (domain as any).objectManager;
    const player = (domain as any).player as Player;

    // Fonte em (1000, 1000). Centro do círculo em (1000 + 85, 1000 + 90) = (1085, 1090), raio 70
    const fountain = objectManager.spawn((id: number) => 
      new SceneryElement(id, { x: 1000, y: 1000 }, eventManager, 'fountain_awakening')
    );

    // Posiciona o jogador a 50px do centro (dentro da fonte!)
    player.coordinates.x = 1085 - 50 - player.size.width / 2;
    player.coordinates.y = 1090 - player.size.height / 2;

    const initialDistance = Math.hypot(
      (player.coordinates.x + player.size.width / 2) - 1085,
      (player.coordinates.y + player.size.height / 2) - 1090
    );
    expect(initialDistance).toBeLessThan(70); // Começou dentro da fonte!

    // Executa tick de colisão estática
    domain.update(16);

    const finalDistance = Math.hypot(
      (player.coordinates.x + player.size.width / 2) - 1085,
      (player.coordinates.y + player.size.height / 2) - 1090
    );

    // O jogador deve ter sido empurrado para a borda externa da fonte!
    expect(finalDistance).toBeGreaterThanOrEqual(70);
  });

  it('deve bloquear o jogador na base da Casa Carmim (HitBoxPolygon) e permitir passar pelo telhado', () => {
    const objectManager = (domain as any).objectManager;
    const player = (domain as any).player as Player;

    // Casa em (1000, 1000). Hitbox base: Y de 208 a 336 (relativo), X de 32 a 192.
    // Em coordenadas do mundo: X de 1032 a 1192, Y de 1208 a 1336.
    const house = objectManager.spawn((id: number) => 
      new SceneryElement(id, { x: 1000, y: 1000 }, eventManager, 'house_red_boro')
    );

    // 1. Testa colisão com a parede/base (X = 1100, Y = 1250 - dentro da hitbox)
    player.coordinates.x = 1100;
    player.coordinates.y = 1250;

    domain.update(16);

    // Jogador foi empurrado para fora da caixa de colisão da parede
    const inWallX = player.coordinates.x + player.size.width / 2 >= 1032 && player.coordinates.x + player.size.width / 2 <= 1192;
    const inWallY = player.coordinates.y + player.size.height / 2 >= 1208 && player.coordinates.y + player.size.height / 2 <= 1336;
    expect(inWallX && inWallY).toBe(false);

    // 2. Testa passagem pelo telhado (X = 1100, Y = 1050 - fora da hitbox, na cumeeira/telhado)
    player.coordinates.x = 1100;
    player.coordinates.y = 1050;
    const roofX = player.coordinates.x;
    const roofY = player.coordinates.y;

    domain.update(16);

    // A posição do jogador no telhado NÃO deve ter sido alterada (passagem livre por trás do telhado)
    expect(player.coordinates.x).toBe(roofX);
    expect(player.coordinates.y).toBe(roofY);
  });

  it('deve bloquear o jogador no tronco da Árvore de Carvalho mas liberar a copa', () => {
    const objectManager = (domain as any).objectManager;
    const player = (domain as any).player as Player;

    // Árvore em (2000, 2000). Tronco em coords.x + 55, coords.y + 108 (2055, 2108), raio 14.
    const tree = objectManager.spawn((id: number) => 
      new SceneryElement(id, { x: 2000, y: 2000 }, eventManager, 'tree_oak')
    );

    // 1. Colisão no tronco
    player.coordinates.x = 2055 - player.size.width / 2;
    player.coordinates.y = 2108 - player.size.height / 2; // Dentro do tronco!

    domain.update(16);

    const trunkDist = Math.hypot(
      (player.coordinates.x + player.size.width / 2) - 2055,
      (player.coordinates.y + player.size.height / 2) - 2108
    );
    expect(trunkDist).toBeGreaterThanOrEqual(14);

    // 2. Passagem livre pela copa da árvore (Y = 2020)
    player.coordinates.x = 2055;
    player.coordinates.y = 2020;
    const canopyX = player.coordinates.x;
    const canopyY = player.coordinates.y;

    domain.update(16);

    expect(player.coordinates.x).toBe(canopyX);
    expect(player.coordinates.y).toBe(canopyY);
  });

  it('deve remover o collider estático ao destruir ou remover o elemento', () => {
    const objectManager = (domain as any).objectManager;
    const tree = objectManager.spawn((id: number) => 
      new SceneryElement(id, { x: 2000, y: 2000 }, eventManager, 'tree_pine')
    );

    const collisionManager = (objectManager as any).collisionManager;
    expect((collisionManager as any).staticCollidersCache).toContain(tree);

    objectManager.removeByID(tree.id);
    expect((collisionManager as any).staticCollidersCache).not.toContain(tree);
  });
});
