import { describe, it, expect, beforeEach, vi } from 'vitest';
import DomainFacade from "../domain/DomainFacade";
import { EventHandler } from '../domain/eventDispacher/eventDispacher';
import { CollisionAdapter } from '../domain/ports/CollisionAdapter';
import { logger } from '../adapters/web/shared/Logger';
import EnvironmentCollider from '../domain/ObjectModule/EnvironmentCollider';
import Player from '../domain/ObjectModule/Entities/Player/Player';

// Mock do Parser de Imagem para rodar no Node.js sem Canvas API nativa.
vi.mock('../adapters/web/shared/CollisionLayerParser', () => ({
    parseCollisionLayerImage: vi.fn().mockResolvedValue({
        tiles: [{ type: 'wall', x: 4096, y: 3600, tileSize: 32 }],
        width: 8192, height: 8192, tileSize: 32
    }),
    aggregateCollisionTiles: (tiles: any[]) => tiles
}));

// Previne o ReferenceError: Worker is not defined
vi.stubGlobal('Worker', class WorkerMock { postMessage() {} terminate() {} });

/**
 * NOTA: Este teste de integração requer um mock da API Canvas para rodar em um ambiente Node.js,
 * já que o CollisionTileAdapter precisa carregar e analisar dados de pixels de uma imagem.
 * Bibliotecas como 'jest-canvas-mock' devem ser configuradas no setup dos testes.
 *
 * NOTA 2: Se você vir erros como "Cannot find name 'describe'", certifique-se de que '@types/jest'
 * está instalado e que 'jest' está incluído no array 'types' do seu tsconfig.json.
 * A importação de '@jest/globals' no topo do arquivo também resolve isso de forma explícita.
 */
describe('Integration Test: Camada de Colisão a partir do PNG', () => {
  let domain: DomainFacade;
  let collisionAdapter: CollisionAdapter;
  let eventManager: EventHandler;

  beforeEach(async () => {
    // 1. Configuração das dependências
    eventManager = new EventHandler();
    collisionAdapter = new CollisionAdapter();

    // Força a detecção da colisão mockando o adaptador, para não precisarmos do Worker rodando matemática real
    vi.spyOn(collisionAdapter, 'checkCollisions').mockImplementation((_data: Float32Array, _len: number, _bounds: any, callback: (res: Int32Array) => void) => {
      if (!domain) { callback(new Int32Array(0)); return; }
      const objectManager = (domain as any).objectManager;
      if (!objectManager || !objectManager.elements) { callback(new Int32Array(0)); return; }
      
      const elements = objectManager.elements instanceof Map 
        ? Array.from(objectManager.elements.values()) 
        : Object.values(objectManager.elements);
      
      const wall = elements.find(e => e instanceof EnvironmentCollider) as any;
      const player = (domain as any).player;

      if (wall && player) {
        // AABB bem simples apenas para validar o teste de forma um pouco mais honesta
        const pLeft = player.coordinates.x;
        const pRight = player.coordinates.x + player.size.width;
        const pTop = player.coordinates.y;
        const pBottom = player.coordinates.y + player.size.height;

        const wLeft = wall.coordinates.x;
        const wRight = wall.coordinates.x + wall.size.width;
        const wTop = wall.coordinates.y;
        const wBottom = wall.coordinates.y + wall.size.height;

        if (pLeft <= wRight && pRight >= wLeft && pTop <= wBottom && pBottom >= wTop) {
            callback(new Int32Array([player.id, wall.id]));
            return;
        }
      }
      callback(new Int32Array(0));
    });

    // 2. Instancia o Domínio.
    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 512 } } },
      logger,
      eventManager,
      collisionAdapter
    );

    // 5. Carrega o mundo no domínio injetando as hitboxes JSON simuladas.
    const mockJson = [{ type: 'polygon', coordinates: {x:0, y:0}, points: [{x:4096, y:3600}, {x:4128, y:3600}, {x:4128, y:3632}, {x:4096, y:3632}] }];
    await domain.loadWorld('vilgem', mockJson);
  });

  it('deve ter criado EnvironmentColliders dentro do domínio', () => {
    const objectManager = (domain as any).objectManager;
    expect(objectManager).toBeDefined();
    
    const elements = objectManager.elements instanceof Map 
      ? Array.from(objectManager.elements.values()) 
      : Object.values(objectManager.elements);
      
    const wallColliders = elements.filter(e => e instanceof EnvironmentCollider);
    expect(wallColliders.length).toBeGreaterThan(0);
  });

  it('deve detectar uma colisão quando o jogador é posicionado dentro de um tile de PAREDE', async () => {
    // Arrange
    // Acessando a instância do jogador diretamente para fins de teste de integração.
    // Isso é um acoplamento intencional para validar a interação.
    const player = (domain as any).player as Player;
    if (!player) {
      throw new Error('Não foi possível obter o jogador do domínio. A propriedade `player` pode não estar acessível.');
    }

    const wallPosition = { x: 4096, y: 3600 };
    player.coordinates.x = wallPosition.x;
    player.coordinates.y = wallPosition.y;

    if (!player.hitboxes || !player.hitboxes[0]) {
      throw new Error('O jogador não possui hitboxes configuradas.');
    }

    const onCollisionSpy = vi.spyOn(player, 'resolveEnvironmentCollision');

    // Act
    // O sistema de colisão usa "Resolução Atrasada" (Delayed Resolution).
    // Precisamos rodar o loop de update duas vezes.

    // Frame N: O domínio atualiza posições e envia dados de colisão para o worker.
    domain.update(16.6);

    // Aguarda a resolução da Promise do worker mockado (Esvazia a fila de Microtasks)
    await new Promise(resolve => setTimeout(resolve, 0));

    // Frame N+1: O domínio processa os resultados de colisão recebidos do worker.
    domain.update(16.6);

    // Assert
    expect(onCollisionSpy).toHaveBeenCalled();

    const firstCallArgs = onCollisionSpy.mock.calls[0] as any[] | undefined;
    expect(firstCallArgs).toBeDefined();

    const collidedWith = firstCallArgs![0];
    expect(collidedWith).toBeInstanceOf(EnvironmentCollider);
  });
});