import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameMap from '../../adapters/web/components/renderModule/scene/Map';
import { VisualConfigMap, type MapVisualConfig } from '../../adapters/web/shared/VisualConfigMap';
import VilgemWorld from '../../domain/ObjectModule/Maps/VilgemWorld';
import type Camera from '../../adapters/web/components/renderModule/scene/Camera';

describe('MapVisualChunkAlignmentRegression - Alinhamento Perfeito de Chunks e Cenário', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('VisualConfigMap["vilgem"].originChunk deve coincidir com VilgemWorld.originChunk', () => {
    const vilgemVisual = VisualConfigMap['vilgem'] as MapVisualConfig;
    expect(vilgemVisual).toBeDefined();
    expect(vilgemVisual.originChunk).toBeDefined();

    const mockEventManager = { on: vi.fn(), dispatch: vi.fn(), off: vi.fn() };
    const vilgemWorld = new VilgemWorld(mockEventManager);

    expect(vilgemVisual.originChunk).toEqual(vilgemWorld.originChunk);
    expect(vilgemVisual.originChunk).toEqual({ cx: 2, cy: 3 });
  });

  it('GameMap("vilgem") deve posicionar os chunks nas coordenadas corretas sem deslocamento de 1 chunk', () => {
    const map = new GameMap('vilgem');
    const vilgemVisual = VisualConfigMap['vilgem'] as MapVisualConfig;
    expect(map.originChunk).toEqual(vilgemVisual.originChunk);
    expect(map.chunkSize).toBe(1024);

    const drawnChunks: { imageUrl: string; x: number; y: number }[] = [];
    const mockCtx = {
      drawImage: vi.fn((img: any, x: number, y: number) => {
        drawnChunks.push({ imageUrl: img.src, x, y });
      })
    } as unknown as CanvasRenderingContext2D;

    const mockCamera = {
      isInViewport: vi.fn(() => true)
    } as unknown as Camera;

    // Simula desenho quando o jogador está na coordenada central (0, 0)
    map.draw(mockCtx, 0, 0, mockCamera);

    // O chunk central (originChunk) DEVE ficar em x: 0, y: 0 (Origem do Spawn)
    const expectedCenterUrl = vilgemVisual.chunks[map.originChunk.cy]![map.originChunk.cx]!;
    const groundCenter = drawnChunks.find(c => c.x === 0 && c.y === 0);
    expect(groundCenter, 'chunk central deve estar em (0, 0)').toBeDefined();
    expect(groundCenter!.imageUrl).toBe(expectedCenterUrl);

    // O chunk oeste (-1, 0) DEVE ficar em x: -1024, y: 0
    const expectedWestUrl = vilgemVisual.chunks[map.originChunk.cy]![map.originChunk.cx - 1]!;
    const groundWest = drawnChunks.find(c => c.x === -1024 && c.y === 0);
    expect(groundWest, 'chunk oeste deve estar em (-1024, 0)').toBeDefined();
    expect(groundWest!.imageUrl).toBe(expectedWestUrl);

    // O chunk noroeste (-1, -1) DEVE ficar em x: -1024, y: -1024
    const expectedNwUrl = vilgemVisual.chunks[map.originChunk.cy - 1]![map.originChunk.cx - 1]!;
    const groundNorthWest = drawnChunks.find(c => c.x === -1024 && c.y === -1024);
    expect(groundNorthWest, 'chunk noroeste deve estar em (-1024, -1024)').toBeDefined();
    expect(groundNorthWest!.imageUrl).toBe(expectedNwUrl);

    // O chunk norte (0, -1) DEVE ficar em x: 0, y: -1024
    const expectedNorthUrl = vilgemVisual.chunks[map.originChunk.cy - 1]![map.originChunk.cx]!;
    const groundNorth = drawnChunks.find(c => c.x === 0 && c.y === -1024);
    expect(groundNorth, 'chunk norte deve estar em (0, -1024)').toBeDefined();
    expect(groundNorth!.imageUrl).toBe(expectedNorthUrl);
  });

  it('deve garantir que o chunk (-1, -1) não seja renderizado como vazio no lugar de (-2, -1)', () => {
    const map = new GameMap('vilgem');
    const vilgemVisual = VisualConfigMap['vilgem'] as MapVisualConfig;
    // Jogador no chunk (-1, -1) em x: -500, y: -500
    const drawnChunks: { imageUrl: string; x: number; y: number }[] = [];
    const mockCtx = {
      drawImage: vi.fn((img: any, x: number, y: number) => {
        drawnChunks.push({ imageUrl: img.src, x, y });
      })
    } as unknown as CanvasRenderingContext2D;

    const mockCamera = {
      isInViewport: vi.fn(() => true)
    } as unknown as Camera;

    map.draw(mockCtx, -500, -500, mockCamera);

    // Na posição (-1024, -1024), a imagem DEVE ser o chunk correspondente de vilgemVisual, NUNCA vazia
    const nwChunk = drawnChunks.find(c => c.x === -1024 && c.y === -1024);
    expect(nwChunk).toBeDefined();
    expect(nwChunk!.imageUrl).toBe(vilgemVisual.chunks[map.originChunk.cy - 1]![map.originChunk.cx - 1]!);
  });
});
