import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorldChunkManager from '../../domain/ObjectModule/Maps/WorldChunkManager';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';
import ObjectElement from '../../domain/ObjectModule/ObjectElement';

class MockElement extends ObjectElement {
  public override update(): void {}
}

describe('WorldChunkManager Unit Tests', () => {
  let eventManager: IEventManager;
  let chunkManager: WorldChunkManager;

  beforeEach(() => {
    eventManager = {
      on: vi.fn(),
      dispatch: vi.fn(),
      off: vi.fn()
    };
    chunkManager = new WorldChunkManager(eventManager);
  });

  describe('Conversão de Coordenadas e Hashing Espacial 32-bit Zero-GC', () => {
    it('deve converter coordenadas contínuas positivas e negativas em coordenadas discretas de chunk', () => {
      expect(WorldChunkManager.getChunkCoord(0, 0)).toEqual({ cx: 0, cy: 0 });
      expect(WorldChunkManager.getChunkCoord(512, 591)).toEqual({ cx: 0, cy: 0 });
      expect(WorldChunkManager.getChunkCoord(1024, 2048)).toEqual({ cx: 1, cy: 2 });
      expect(WorldChunkManager.getChunkCoord(-1, -1)).toEqual({ cx: -1, cy: -1 });
      expect(WorldChunkManager.getChunkCoord(-500, -1024)).toEqual({ cx: -1, cy: -1 });
      expect(WorldChunkManager.getChunkCoord(-1025, 500)).toEqual({ cx: -2, cy: 0 });
    });

    it('deve empacotar e desempacotar chaves inteiras de 32 bits sem perda para coordenadas assinadas', () => {
      const testCases = [
        { cx: 0, cy: 0 },
        { cx: 1, cy: 1 },
        { cx: -1, cy: -1 },
        { cx: -10, cy: 25 },
        { cx: 32767, cy: -32768 },
        { cx: -500, cy: -1200 }
      ];

      for (const tc of testCases) {
        const key = WorldChunkManager.getChunkKey(tc.cx, tc.cy);
        expect(typeof key).toBe('number');
        const unpacked = WorldChunkManager.unpackChunkKey(key);
        expect(unpacked).toEqual(tc);
      }
    });
  });

  describe('Janela Ativa 3x3 e Transição de Fronteiras', () => {
    it('deve inicializar com o chunk central em (0,0) e 9 chunks ativos na janela 3x3', () => {
      expect(chunkManager.getCurrentChunk()).toEqual({ cx: 0, cy: 0 });
      const activeChunks = chunkManager.getActiveChunks();
      expect(activeChunks.length).toBe(9);

      const keys = chunkManager.getActiveChunkKeys();
      expect(keys.size).toBe(9);
      expect(keys.has(WorldChunkManager.getChunkKey(0, 0))).toBe(true);
      expect(keys.has(WorldChunkManager.getChunkKey(-1, -1))).toBe(true);
      expect(keys.has(WorldChunkManager.getChunkKey(1, 1))).toBe(true);
    });

    it('não deve recalcular nem disparar evento quando o jogador se move dentro do mesmo chunk', () => {
      const moved = chunkManager.updatePlayerPosition(100, 200);
      expect(moved).toBe(false);
      expect(eventManager.dispatch).not.toHaveBeenCalledWith('activeChunkChanged', expect.anything());
    });

    it('deve recalcular a janela 3x3 e disparar activeChunkChanged ao cruzar para um novo chunk', () => {
      // Cruzar para cx = 1, cy = 0 (x = 1050, y = 500)
      const moved = chunkManager.updatePlayerPosition(1050, 500);
      expect(moved).toBe(true);
      expect(chunkManager.getCurrentChunk()).toEqual({ cx: 1, cy: 0 });

      expect(eventManager.dispatch).toHaveBeenCalledWith('activeChunkChanged', {
        previousChunk: { cx: 0, cy: 0 },
        currentChunk: { cx: 1, cy: 0 },
        activeChunks: expect.arrayContaining([
          { cx: 0, cy: -1 }, { cx: 1, cy: -1 }, { cx: 2, cy: -1 },
          { cx: 0, cy: 0 },  { cx: 1, cy: 0 },  { cx: 2, cy: 0 },
          { cx: 0, cy: 1 },  { cx: 1, cy: 1 },  { cx: 2, cy: 1 }
        ])
      });
    });
  });

  describe('Particionamento Espacial de Entidades e Culling', () => {
    it('deve registrar entidades em seus respectivos chunks e recuperá-las via getActiveElements', () => {
      const elCenter = new MockElement({ width: 32, height: 32 }, { x: 500, y: 500 }, 101, 'scenery', eventManager);
      const elFar = new MockElement({ width: 32, height: 32 }, { x: 5000, y: 5000 }, 102, 'scenery', eventManager);

      chunkManager.registerElement(elCenter);
      chunkManager.registerElement(elFar);

      expect(chunkManager.isElementInActiveWindow(elCenter)).toBe(true);
      expect(chunkManager.isElementInActiveWindow(elFar)).toBe(false);

      const active = chunkManager.getActiveElements();
      expect(active).toContain(elCenter);
      expect(active).not.toContain(elFar);
    });

    it('deve atualizar o chunk de uma entidade quando ela cruza a fronteira', () => {
      const mob = new MockElement({ width: 32, height: 32 }, { x: 900, y: 500 }, 105, 'slime', eventManager);
      chunkManager.registerElement(mob);

      expect(chunkManager.isElementInActiveWindow(mob)).toBe(true);

      // Move entidade para muito longe
      mob.coordinates.x = 4000;
      mob.coordinates.y = 4000;
      chunkManager.updateElementPosition(mob);

      expect(chunkManager.isElementInActiveWindow(mob)).toBe(false);
      expect(chunkManager.getActiveElements()).not.toContain(mob);
    });

    it('deve remover entidade do particionador ao ser destruída/despawnada', () => {
      const el = new MockElement({ width: 32, height: 32 }, { x: 100, y: 100 }, 110, 'scenery', eventManager);
      chunkManager.registerElement(el);
      expect(chunkManager.getActiveElements()).toContain(el);

      chunkManager.removeElement(110);
      expect(chunkManager.getActiveElements()).not.toContain(el);
    });

    it('deve sempre considerar o Jogador (id 1 ou objectId player) como ativo', () => {
      const player = new MockElement({ width: 32, height: 32 }, { x: 9999, y: 9999 }, 1, 'player', eventManager);
      expect(chunkManager.isElementInActiveWindow(player)).toBe(true);
    });

    it('deve retornar todos os elementos quando o particionamento estiver desabilitado', () => {
      const elFar = new MockElement({ width: 32, height: 32 }, { x: 9999, y: 9999 }, 120, 'scenery', eventManager);
      chunkManager.registerElement(elFar);

      expect(chunkManager.isElementInActiveWindow(elFar)).toBe(false);

      chunkManager.setPartitioningEnabled(false);
      expect(chunkManager.isElementInActiveWindow(elFar)).toBe(true);
      expect(chunkManager.getActiveElements([elFar])).toContain(elFar);
    });
  });

  describe('Geração Procedural sob Demanda', () => {
    it('deve disparar o callback procedural apenas para chunks ainda não gerados', () => {
      const generatorMock = vi.fn();
      chunkManager.setProceduralGenerator(generatorMock);

      // Movimentar para o leste cx = 2 (deve pedir geração para cx = 3)
      chunkManager.updatePlayerPosition(2048 + 512, 512);

      expect(generatorMock).toHaveBeenCalled();
      const calls = generatorMock.mock.calls;
      // Os novos chunks na coluna cx = 3 (cy = -1, 0, 1) devem ter sido solicitados
      expect(calls.some(call => call[0] === 3)).toBe(true);
    });
  });
});
