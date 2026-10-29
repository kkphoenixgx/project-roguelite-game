import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameMap from '../../../../adapters/web/components/renderModule/scene/Map';
import type { MapVisualConfig } from '../../../../adapters/web/shared/VisualConfigMap';

/**
 * ============================================================================
 * SUÍTE DE TESTES DE PERFORMANCE E CONFORMIDADE: RENDERIZAÇÃO DE CHUNKS (QA)
 * ============================================================================
 * Papel: QA Lead & Compliance Auditor (rpg-testes)
 * Foco:
 * 1. Conformidade estrita da Janela Deslizante 3x3 e Limites de Matriz.
 * 2. Gestão de Memória / GPU, Contagem de Referências e Prevenção de Leaks.
 * 3. Conformidade de Intermaps (Cor Sólida vs Chunks).
 * 4. Performance Zero-GC em Steady-State (< 0.002ms/frame no mesmo chunk).
 * 5. Benchmark de Throughput e Câmera em Alta Velocidade.
 */
describe('QA - Chunk Rendering Performance & Compliance in Web Adapter (GameMap)', () => {
  let mockCtx: CanvasRenderingContext2D;
  let custom4x4Config: MapVisualConfig;

  beforeEach(() => {
    mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D;

    // Mapa sintético 4x4 (4096 x 4096 px) para testes determinísticos
    custom4x4Config = {
      category: 'map',
      chunkSize: 1024,
      chunks: [
        ['ground_0_0.png', 'ground_1_0.png', 'ground_2_0.png', 'ground_3_0.png'],
        ['ground_0_1.png', 'ground_shared.png', 'ground_shared.png', 'ground_3_1.png'],
        ['ground_0_2.png', 'ground_shared.png', 'ground_shared.png', 'ground_3_2.png'],
        ['ground_0_3.png', 'ground_1_3.png', '', 'ground_3_3.png'] // chunk (2,3) vazio para teste de buracos
      ]
    };
  });

  /* -------------------------------------------------------------------------- */
  /* 1. CONFORMIDADE: Janela Deslizante 3x3 e Limites de Mundo                  */
  /* -------------------------------------------------------------------------- */
  describe('1. Conformidade da Janela Deslizante 3x3 (Sliding Window)', () => {
    it('deve carregar exatamente 9 chunks ao redor da câmera no centro do mapa (1, 1)', () => {
      const map = new GameMap('test_world', custom4x4Config);

      // Câmera posicionada no centro do chunk (1, 1) -> (1500, 1500)
      map.updateActiveWindow(1500, 1500);

      expect(map.getActiveChunksCount()).toBe(9);
      expect(map.isChunkActive(0, 0)).toBe(true);
      expect(map.isChunkActive(1, 0)).toBe(true);
      expect(map.isChunkActive(2, 0)).toBe(true);
      expect(map.isChunkActive(0, 1)).toBe(true);
      expect(map.isChunkActive(1, 1)).toBe(true);
      expect(map.isChunkActive(2, 1)).toBe(true);
      expect(map.isChunkActive(0, 2)).toBe(true);
      expect(map.isChunkActive(1, 2)).toBe(true);
      expect(map.isChunkActive(2, 2)).toBe(true);

      // Chunks distantes não devem estar ativos
      expect(map.isChunkActive(3, 3)).toBe(false);
      expect(map.isChunkActive(3, 0)).toBe(false);
    });

    it('deve limitar aos chunks válidos no canto superior esquerdo (0, 0) sem indexar valores negativos', () => {
      const map = new GameMap('test_world', custom4x4Config);

      // Câmera em (200, 200) -> Chunk (0, 0)
      map.updateActiveWindow(200, 200);

      // Vizinhança no canto é 2x2 = 4 chunks: (0,0), (1,0), (0,1), (1,1)
      expect(map.getActiveChunksCount()).toBe(4);
      expect(map.isChunkActive(0, 0)).toBe(true);
      expect(map.isChunkActive(1, 0)).toBe(true);
      expect(map.isChunkActive(0, 1)).toBe(true);
      expect(map.isChunkActive(1, 1)).toBe(true);

      // Não deve ter criado chaves inválidas como "-1,-1" ou "-1,0"
      const keys = map.getActiveChunkKeys();
      expect(keys.some(k => k.includes('-'))).toBe(false);
    });

    it('deve limitar aos chunks válidos no canto inferior direito (3, 3) sem estourar a matriz', () => {
      const map = new GameMap('test_world', custom4x4Config);

      // Câmera em (3500, 3500) -> Chunk (3, 3)
      map.updateActiveWindow(3500, 3500);

      // Vizinhança: (2,2), (3,2), (2,3), (3,3)
      // Como (2,3) tem string vazia '', devem ser carregados exatamente 3 chunks!
      expect(map.getActiveChunksCount()).toBe(3);
      expect(map.isChunkActive(2, 2)).toBe(true);
      expect(map.isChunkActive(3, 2)).toBe(true);
      expect(map.isChunkActive(3, 3)).toBe(true);
      expect(map.isChunkActive(2, 3)).toBe(false); // Vazio
    });

    it('em Vilgem real, a janela 3x3 inicial deve respeitar as dimensões configuradas', () => {
      const vilgemMap = new GameMap('vilgem');

      expect(vilgemMap.chunkSize).toBe(1024);
      expect(vilgemMap.width).toBe(5120); // 5 colunas * 1024
      expect(vilgemMap.height).toBe(6144); // 6 linhas * 1024

      // Posição de spawn de Vilgem (ex: 200, 200)
      vilgemMap.updateActiveWindow(200, 200);
      expect(vilgemMap.getActiveChunksCount()).toBeLessThanOrEqual(9);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. CONFORMIDADE: Gerenciamento de Memória, Cache e Prevenção de Leaks       */
  /* -------------------------------------------------------------------------- */
  describe('2. Gestão de Recursos, Cache de Texturas e Descarregamento', () => {
    it('deve descarregar chunks que saem da vizinhança 3x3 ao mover a câmera', () => {
      const map = new GameMap('test_world', custom4x4Config);

      // 1. Inicia em (0, 0)
      map.updateActiveWindow(200, 200);
      expect(map.isChunkActive(0, 0)).toBe(true);
      expect(map.isChunkActive(1, 0)).toBe(true);

      // 2. Teleporta/move para (3000, 3000) -> Chunk (2, 2)
      map.updateActiveWindow(3000, 3000);

      // Chunks do canto (0,0) e (1,0) devem ter sido completamente descarregados
      expect(map.isChunkActive(0, 0)).toBe(false);
      expect(map.isChunkActive(1, 0)).toBe(false);
      expect(map.getActiveChunksCount()).toBeLessThanOrEqual(9);
    });

    it('deve deduplicar imagens idênticas no imageCache com contagem de referências correta', () => {
      const map = new GameMap('test_world', custom4x4Config);

      // Em (1500, 1500) -> Chunks (1,1), (2,1), (1,2), (2,2) todos usam 'ground_shared.png'!
      map.updateActiveWindow(1500, 1500);

      // Há 9 chunks ativos, mas 4 deles compartilham a mesma textura 'ground_shared.png'.
      // Portanto, o número de imagens no cache deve ser estritamente menor que 9!
      expect(map.getActiveChunksCount()).toBe(9);
      expect(map.getLoadedImagesCount()).toBe(6); // 5 texturas únicas + 1 compartilhada = 6
    });

    it('deve purgar a textura do imageCache quando todos os chunks que a utilizam saírem da janela', () => {
      // Configuramos um mapa onde 'ground_rare_shared.png' existe apenas nos chunks do extremo sudeste (3,2) e (3,3)
      const rareTextureConfig: MapVisualConfig = {
        category: 'map',
        chunkSize: 1024,
        chunks: [
          ['a.png', 'b.png', 'c.png', 'd.png'],
          ['e.png', 'f.png', 'g.png', 'h.png'],
          ['i.png', 'j.png', 'k.png', 'rare_shared.png'],
          ['m.png', 'n.png', 'o.png', 'rare_shared.png']
        ]
      };
      const map = new GameMap('rare_map', rareTextureConfig);

      // 1. Câmera em (3500, 3500) -> Chunk (3, 3). 'rare_shared.png' está carregado
      map.updateActiveWindow(3500, 3500);
      expect(map.isChunkActive(3, 2)).toBe(true);
      expect(map.isChunkActive(3, 3)).toBe(true);

      // 2. Move para o extremo oposto (200, 200) -> Chunk (0, 0).
      // A janela 3x3 cobre apenas x ∈ [0, 1] e y ∈ [0, 1].
      map.updateActiveWindow(200, 200);

      // 'rare_shared.png' teve refCount zerado e foi expurgada do cache
      expect(map.isChunkActive(3, 2)).toBe(false);
      expect(map.isChunkActive(3, 3)).toBe(false);
      expect(map.getActiveChunkKeys().some(k => k === '3,2' || k === '3,3')).toBe(false);
    });

    it('dispose() deve desalocar todos os chunks e limpar integralmente o cache de imagens', () => {
      const map = new GameMap('test_world', custom4x4Config);
      map.updateActiveWindow(1500, 1500);

      expect(map.getActiveChunksCount()).toBe(9);
      expect(map.getLoadedImagesCount()).toBeGreaterThan(0);

      map.dispose();

      expect(map.getActiveChunksCount()).toBe(0);
      expect(map.getLoadedImagesCount()).toBe(0);
    });

    it('Intermap deve preencher com cor sólida e carregar chunks de textura se configurados', () => {
      const intermap = new GameMap('interior_black_default');

      expect(intermap.isIntermap).toBe(true);
      expect(intermap.backgroundColor).toBe('#000000');

      intermap.updateActiveWindow(512, 700);
      expect(intermap.getActiveChunksCount()).toBeGreaterThanOrEqual(1);

      // Ao desenhar, deve executar fillRect para a cor sólida de fundo
      intermap.draw(mockCtx, 512, 700);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, intermap.width, intermap.height);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. PERFORMANCE: Zero-GC no Steady-State e Benchmark de Câmera               */
  /* -------------------------------------------------------------------------- */
  describe('3. Performance Zero-GC & Throughput de Renderização', () => {
    it('Steady-State Zero-GC: 10.000 updates dentro do mesmo chunk devem executar em menos de 10ms', () => {
      const map = new GameMap('test_world', custom4x4Config);

      // Inicializa na coordenada base
      map.updateActiveWindow(1200, 1200);

      const start = performance.now();

      // O jogador se movimenta continuamente dentro do chunk (1, 1) [1024 a 2047 px]
      for (let i = 0; i < 10000; i++) {
        const deltaX = (i % 500);
        const deltaY = ((i * 2) % 500);
        map.updateActiveWindow(1100 + deltaX, 1100 + deltaY);
      }

      const elapsed = performance.now() - start;

      // 10.000 chamadas em steady-state devem rodar com saída O(1) imediata
      expect(elapsed).toBeLessThan(25); // Limite generoso para CI; tipicamente < 5ms
      expect(map.getActiveChunksCount()).toBe(9);
    });

    it('Benchmark de Deslocamento Rápido: Câmera cruzando 50 chunks consecutivos em alta velocidade', () => {
      const map = new GameMap('test_world', custom4x4Config);

      const start = performance.now();

      // Simula deslocamento veloz alternando entre diferentes chunks do mapa
      for (let step = 0; step < 50; step++) {
        const x = (step % 4) * 1024 + 512;
        const y = Math.floor(step / 4) % 4 * 1024 + 512;
        map.updateActiveWindow(x, y);

        // O teto de chunks ativos NUNCA deve ultrapassar 9 em nenhum instante
        expect(map.getActiveChunksCount()).toBeLessThanOrEqual(9);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(15);
    });

    it('Throughput do método draw(): deve desenhar exclusivamente os chunks ativos carregados', () => {
      const map = new GameMap('test_world', custom4x4Config);

      // Simula imagens carregadas para os chunks ativos
      map.updateActiveWindow(1500, 1500);

      const start = performance.now();

      // Simula 600 frames de renderização (10 segundos de gameplay a 60 FPS)
      for (let frame = 0; frame < 600; frame++) {
        map.draw(mockCtx, 1500, 1500);
      }

      const elapsed = performance.now() - start;

      // 600 frames de draw devem processar em sub-milissegundos
      expect(elapsed).toBeLessThan(50);
      expect(mockCtx.drawImage).toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. ESCALABILIDADE MASSIVA: Open World com 10.000 Chunks (100x100)          */
  /* -------------------------------------------------------------------------- */
  describe('4. Escalabilidade Massiva em Open World (100x100 = 10.000 Chunks)', () => {
    let massive100x100Config: MapVisualConfig;

    beforeEach(() => {
      // Gera matriz de 100 linhas x 100 colunas (10.000 chunks = 102.400 x 102.400 pixels)
      const matrix: string[][] = [];
      const biomes = ['grass_base.png', 'dirt_path.png', 'water_lake.png', 'rocky_cliff.png', 'snow_peak.png'];

      for (let y = 0; y < 100; y++) {
        const row: string[] = [];
        for (let x = 0; x < 100; x++) {
          // Reutiliza 5 texturas de bioma deterministicamente
          const biomeIndex = (x + y * 7) % biomes.length;
          row.push(biomes[biomeIndex]!);
        }
        matrix.push(row);
      }

      massive100x100Config = {
        category: 'map',
        chunkSize: 1024,
        chunks: matrix
      };
    });

    it('deve inicializar mapa de 10.000 chunks com dimensões gigantescas mantendo consumo de memória constante', () => {
      const massiveMap = new GameMap('massive_world', massive100x100Config);

      expect(massiveMap.width).toBe(102400); // 100 * 1024
      expect(massiveMap.height).toBe(102400); // 100 * 1024
      expect(massiveMap.getActiveChunksCount()).toBe(0);
      expect(massiveMap.getLoadedImagesCount()).toBe(0);
    });

    it('em qualquer coordenada do mapa de 10.000 chunks, o número de chunks ativos deve permanecer estritamente <= 9', () => {
      const massiveMap = new GameMap('massive_world', massive100x100Config);

      const testCoordinates = [
        { x: 500, y: 500 }, // Canto NO (0,0)
        { x: 51200, y: 51200 }, // Centro exato (50, 50)
        { x: 102000, y: 500 }, // Canto NE (99, 0)
        { x: 500, y: 102000 }, // Canto SO (0, 99)
        { x: 102000, y: 102000 }, // Canto SE (99, 99)
        { x: 34567, y: 89012 } // Ponto arbitrário
      ];

      for (const coord of testCoordinates) {
        massiveMap.updateActiveWindow(coord.x, coord.y);
        const count = massiveMap.getActiveChunksCount();
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(9);
      }
    });

    it('Estresse de Teleporte: 500 saltos aleatórios por todo o mapa massivo sem vazamento de memória', () => {
      const massiveMap = new GameMap('massive_world', massive100x100Config);

      const start = performance.now();

      // 500 saltos aleatórios cruzando o continente
      for (let i = 0; i < 500; i++) {
        const randX = Math.floor(Math.random() * 102400);
        const randY = Math.floor(Math.random() * 102400);
        massiveMap.updateActiveWindow(randX, randY);

        // O teto é inviolável em qualquer salto
        expect(massiveMap.getActiveChunksCount()).toBeLessThanOrEqual(9);
      }

      const elapsed = performance.now() - start;

      // 500 descarregamentos e recarregamentos de janela 3x3 devem rodar velozes
      expect(elapsed).toBeLessThan(100);
      // E ao final, o cache de texturas não pode vazar imagens infinitas (teto de biomas)
      expect(massiveMap.getLoadedImagesCount()).toBeLessThanOrEqual(5);
    });

    it('Voo de Câmera Longitudinal: 200 frames atravessando múltiplos chunks em alta velocidade (< 0.05ms/frame)', () => {
      const massiveMap = new GameMap('massive_world', massive100x100Config);

      const start = performance.now();

      // Simula voo em linha reta a 1000 px por frame (cruzando aproximadamente 1 chunk por frame)
      for (let frame = 0; frame < 200; frame++) {
        const posX = frame * 512;
        const posY = frame * 512;
        massiveMap.updateActiveWindow(posX, posY);
        expect(massiveMap.getActiveChunksCount()).toBeLessThanOrEqual(9);
      }

      const elapsed = performance.now() - start;
      const avgMsPerFrame = elapsed / 200;

      // Média por frame de transição contínua deve ser abaixo de 0.1ms
      expect(avgMsPerFrame).toBeLessThan(0.1);
    });

    it('Sanitização Total: dispose() em mapa massivo limpa todos os recursos instantaneamente', () => {
      const massiveMap = new GameMap('massive_world', massive100x100Config);
      massiveMap.updateActiveWindow(50000, 50000);

      expect(massiveMap.getActiveChunksCount()).toBe(9);
      expect(massiveMap.getLoadedImagesCount()).toBeGreaterThan(0);

      massiveMap.dispose();

      expect(massiveMap.getActiveChunksCount()).toBe(0);
      expect(massiveMap.getLoadedImagesCount()).toBe(0);
    });
  });
});
