import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameMap from '../../../../adapters/web/components/renderModule/scene/Map';
import type { MapVisualConfig } from '../../../../adapters/web/shared/VisualConfigMap';

describe('Chunk Streaming & Memory Management (Performance & Zero-GC)', () => {
  // Cria um mapa de teste com grid 5x5 (25 chunks), cada um com uma URL de imagem distinta
  const create5x5MapConfig = (chunkSize: number = 1024): MapVisualConfig => {
    const chunks: string[][] = [];
    for (let y = 0; y < 5; y++) {
      const row: string[] = [];
      for (let x = 0; x < 5; x++) {
        row.push(`https://game.test/assets/maps/chunk_${x}_${y}.png`);
      }
      chunks.push(row);
    }
    return {
      category: 'map',
      chunkSize,
      chunks
    };
  };

  it('deve carregar exatamente os 9 chunks (3x3) ao redor do jogador inicialmente', () => {
    const config = create5x5MapConfig();
    const map = new GameMap('test_map', config);

    // Player no centro do mundo: chunk (2, 2) (x: 2500, y: 2500 com chunkSize 1024)
    map.updateActiveWindow(2500, 2500);

    expect(map.getActiveChunksCount()).toBe(9);
    expect(map.getLoadedImagesCount()).toBe(9);

    // Deve conter os 9 chunks centrais (x: 1..3, y: 1..3)
    const expectedKeys = [
      '1,1', '2,1', '3,1',
      '1,2', '2,2', '3,2',
      '1,3', '2,3', '3,3'
    ];

    for (const key of expectedKeys) {
      const [x, y] = key.split(',').map(Number);
      expect(map.isChunkActive(x!, y!)).toBe(true);
    }

    // Chunks distantes NÃO devem estar carregados
    expect(map.isChunkActive(0, 0)).toBe(false);
    expect(map.isChunkActive(4, 4)).toBe(false);
    expect(map.isChunkActive(0, 2)).toBe(false);
    expect(map.isChunkActive(4, 2)).toBe(false);
  });

  it('deve manter exatamente os mesmos chunks sem recarregamento ou GC quando o jogador se move no mesmo chunk', () => {
    const config = create5x5MapConfig();
    const map = new GameMap('test_map', config);

    // Posiciona em (2050, 2050) -> chunk (2, 2)
    map.updateActiveWindow(2050, 2050);
    const initialKeys = map.getActiveChunkKeys().sort();

    // Movimentação pequena (10px, 100px) permanecendo no chunk (2, 2)
    map.updateActiveWindow(2060, 2055);
    map.updateActiveWindow(2150, 2200);
    map.updateActiveWindow(2990, 2990);

    expect(map.getActiveChunksCount()).toBe(9);
    expect(map.getActiveChunkKeys().sort()).toEqual(initialKeys);
  });

  it('deve descarregar a linha inferior (7, 8, 9) e carregar a superior (A, B, C) ao andar para o chunk de cima', () => {
    const config = create5x5MapConfig();
    const map = new GameMap('test_map', config);

    // 1. Player no chunk (2, 2): Chunks de y=1, y=2, y=3
    map.updateActiveWindow(2500, 2500);
    expect(map.getActiveChunksCount()).toBe(9);

    // Chunks que representam a linha inferior atual (y=3)
    expect(map.isChunkActive(1, 3)).toBe(true); // Chunk 7
    expect(map.isChunkActive(2, 3)).toBe(true); // Chunk 8
    expect(map.isChunkActive(3, 3)).toBe(true); // Chunk 9

    // Chunks da linha superior acima de y=1 (y=0) ainda não existem na janela
    expect(map.isChunkActive(1, 0)).toBe(false); // Chunk A
    expect(map.isChunkActive(2, 0)).toBe(false); // Chunk B
    expect(map.isChunkActive(3, 0)).toBe(false); // Chunk C

    // 2. Player ANDA PARA O CHUNK DE CIMA: de (2, 2) para (2, 1) (ex: y: 1500)
    map.updateActiveWindow(2500, 1500);

    // Agora o total ativo continua estritamente 9!
    expect(map.getActiveChunksCount()).toBe(9);
    expect(map.getLoadedImagesCount()).toBe(9);

    // OS CHUNKS 7, 8, 9 FORAM DESCARREGADOS!
    expect(map.isChunkActive(1, 3)).toBe(false);
    expect(map.isChunkActive(2, 3)).toBe(false);
    expect(map.isChunkActive(3, 3)).toBe(false);

    // OS CHUNKS A, B, C FORAM CARREGADOS!
    expect(map.isChunkActive(1, 0)).toBe(true);
    expect(map.isChunkActive(2, 0)).toBe(true);
    expect(map.isChunkActive(3, 0)).toBe(true);

    // As linhas intermediárias y=1 e y=2 foram preservadas
    expect(map.isChunkActive(1, 1)).toBe(true);
    expect(map.isChunkActive(2, 1)).toBe(true);
    expect(map.isChunkActive(3, 1)).toBe(true);
    expect(map.isChunkActive(1, 2)).toBe(true);
    expect(map.isChunkActive(2, 2)).toBe(true);
    expect(map.isChunkActive(3, 2)).toBe(true);
  });

  it('deve descarregar a coluna esquerda e carregar a coluna direita ao andar para a direita', () => {
    const config = create5x5MapConfig();
    const map = new GameMap('test_map', config);

    // Player no chunk (2, 2): colunas x=1, x=2, x=3
    map.updateActiveWindow(2500, 2500);

    expect(map.isChunkActive(1, 2)).toBe(true);
    expect(map.isChunkActive(4, 2)).toBe(false);

    // Anda para a DIREITA: chunk (3, 2) (ex: x: 3500)
    map.updateActiveWindow(3500, 2500);

    expect(map.getActiveChunksCount()).toBe(9);

    // Coluna x=1 foi descartada
    expect(map.isChunkActive(1, 1)).toBe(false);
    expect(map.isChunkActive(1, 2)).toBe(false);
    expect(map.isChunkActive(1, 3)).toBe(false);

    // Coluna x=4 foi carregada
    expect(map.isChunkActive(4, 1)).toBe(true);
    expect(map.isChunkActive(4, 2)).toBe(true);
    expect(map.isChunkActive(4, 3)).toBe(true);
  });

  it('deve respeitar os limites do mapa no canto (0, 0) carregando apenas chunks válidos', () => {
    const config = create5x5MapConfig();
    const map = new GameMap('test_map', config);

    // Player no canto superior esquerdo: chunk (0, 0)
    map.updateActiveWindow(100, 100);

    // No canto (0, 0), apenas (0,0), (1,0), (0,1), (1,1) são válidos (4 chunks)
    expect(map.getActiveChunksCount()).toBe(4);
    expect(map.isChunkActive(0, 0)).toBe(true);
    expect(map.isChunkActive(1, 0)).toBe(true);
    expect(map.isChunkActive(0, 1)).toBe(true);
    expect(map.isChunkActive(1, 1)).toBe(true);
  });

  it('deve liberar toda a memória e desvincular handlers ao invocar dispose()', () => {
    const config = create5x5MapConfig();
    const map = new GameMap('test_map', config);

    map.updateActiveWindow(2500, 2500);
    expect(map.getActiveChunksCount()).toBe(9);
    expect(map.getLoadedImagesCount()).toBe(9);

    map.dispose();

    expect(map.getActiveChunksCount()).toBe(0);
    expect(map.getLoadedImagesCount()).toBe(0);
  });

  it('deve desenhar todos os chunks da janela ativa no contexto 2D', () => {
    const config = create5x5MapConfig();
    const map = new GameMap('test_map', config);

    const mockCtx = {
      drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D;

    map.draw(mockCtx, 2500, 2500);

    // Deve ter chamado drawImage para cada um dos 9 chunks ativos
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(9);
  });
});
