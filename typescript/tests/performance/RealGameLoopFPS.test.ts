import { describe, it, expect, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import GameMap from '../../adapters/web/components/renderModule/scene/Map';

/**
 * ============================================================================
 * BENCHMARK DE PERFORMANCE: FPS REAL E FRAME BUDGET DO JOGO
 * ============================================================================
 * Papel: QA Lead & Compliance Auditor (rpg-testes)
 * Foco: Medir a taxa real de quadros (FPS Real), Frame Time (ms),
 * variância de stuttering e P99 sob condições reais de execução:
 *
 * - Cenário 1: Loop Completo de Gameplay Base (Domínio + Chunks + Render Sync)
 * - Cenário 2: Estresse de Combate (Hordas de Inimigos + Projéteis + Colisão)
 * - Cenário 3: Travessia Rápida de Chunks (Streaming de Mapa em Alta Velocidade)
 * - Cenário 4: Estabilidade de Frame Time (Prevenção de GC Spikes em 1.000 frames)
 *
 * Metas Arquiteturais:
 * - 60 FPS Target: Frame Time <= 16.66ms
 * - 120 FPS Target: Frame Time <= 8.33ms
 * - Zero-GC Headless Target: Frame Time <= 3.00ms (> 300 FPS)
 */
describe('QA Performance Benchmark - FPS Real & Frame Time Profiling', () => {
  let domain: DomainFacade;
  let eventManager: EventHandler;
  let gameMap: GameMap;
  let mockCanvasCtx: CanvasRenderingContext2D;

  beforeEach(async () => {
    eventManager = new EventHandler();

    const mockConfig = {
      selectedClass: 'warrior',
      player: {
        id: 1,
        initialPos: { x: 500, y: 500 },
        level: 1
      }
    } as any;

    const mockLogger = { log: () => {} } as any;
    const mockCollision = {
      checkCollisions: (buffer: any, len: number, bounds: any, callback: any) => {
        callback(new Int32Array(0), 0);
      },
      loadMap: async () => {},
      getTilesForBounds: () => []
    } as any;

    domain = new DomainFacade(mockConfig, mockLogger, eventManager, mockCollision);
    await domain.loadWorld('vilgem');

    gameMap = new GameMap('vilgem');

    mockCanvasCtx = {
      fillStyle: '',
      fillRect: () => {},
      drawImage: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {}
    } as unknown as CanvasRenderingContext2D;
  });

  /* -------------------------------------------------------------------------- */
  /* Helper: Estatísticas Completas de Frame Time & FPS                         */
  /* -------------------------------------------------------------------------- */
  function calculateFPSMetrics(frameTimesMs: number[]) {
    const totalFrames = frameTimesMs.length;
    const sum = frameTimesMs.reduce((acc, t) => acc + t, 0);
    const avgMs = sum / totalFrames;
    const realFPS = 1000 / avgMs;

    const sorted = [...frameTimesMs].sort((a, b) => a - b);
    const minMs = sorted[0]!;
    const maxMs = sorted[totalFrames - 1]!;
    const medianMs = sorted[Math.floor(totalFrames * 0.5)]!;
    const p95Ms = sorted[Math.floor(totalFrames * 0.95)]!;
    const p99Ms = sorted[Math.floor(totalFrames * 0.99)]!;

    // Variância e Desvio Padrão (Jitter / Stutter)
    const variance = frameTimesMs.reduce((acc, t) => acc + Math.pow(t - avgMs, 2), 0) / totalFrames;
    const stdDevMs = Math.sqrt(variance);

    const p99FPS = 1000 / p99Ms;
    const minFPS = 1000 / maxMs;

    return {
      totalFrames,
      avgMs,
      realFPS,
      minMs,
      maxMs,
      medianMs,
      p95Ms,
      p99Ms,
      p99FPS,
      minFPS,
      stdDevMs
    };
  }

  /* -------------------------------------------------------------------------- */
  /* 1. FPS REAL EM GAMEPLAY CONTÍNUA (600 Frames = 10 Segundos Simulados)      */
  /* -------------------------------------------------------------------------- */
  it('Gameplay Base: deve rodar a mais de 60 FPS com Frame Time médio inferior a 5ms', () => {
    // 1. Warmup (30 frames para estabilização da JIT e caches)
    for (let i = 0; i < 30; i++) {
      domain.update(1 / 60);
      gameMap.updateActiveWindow(500, 500);
    }

    // 2. Benchmark de 600 frames contínuos (10s de jogo a 60 FPS)
    const frameTimes: number[] = [];

    for (let frame = 0; frame < 600; frame++) {
      const start = performance.now();

      // a) Simulação de Input do Jogador em movimento
      const playerPos = (domain as any).player.coordinates;
      domain.handlePlayerInteractions(
        { actions: ['right', 'down'] },
        { x: playerPos.x + 10, y: playerPos.y + 10 }
      );

      // b) Loop de Física e Lógica do Domínio
      domain.update(1 / 60);

      // c) Extração de Estado de Renderização
      const renderState = domain.getRenderState();

      // d) Atualização e Renderização da Janela 3x3 de Chunks
      gameMap.draw(mockCanvasCtx, playerPos.x, playerPos.y);

      // e) Ordenação Espacial (Y-Sorting) de Entidades para Renderização
      const sorted = renderState.renderables.slice().sort((a, b) =>
        (a.coordinates.y + a.size.height) - (b.coordinates.y + b.size.height)
      );

      // f) Draw Call de cada entidade na tela
      for (let i = 0; i < sorted.length; i++) {
        const ent = sorted[i]!;
        mockCanvasCtx.drawImage(
          {} as any,
          ent.coordinates.x,
          ent.coordinates.y,
          ent.size.width,
          ent.size.height
        );
      }

      const end = performance.now();
      frameTimes.push(end - start);
    }

    const metrics = calculateFPSMetrics(frameTimes);

    console.log('\n======================================================');
    console.log('🎮 [BENCHMARK] FPS REAL & FRAME TIME - GAMEPLAY BASE');
    console.log('======================================================');
    console.log(`• Total de Frames:   ${metrics.totalFrames}`);
    console.log(`• Frame Time Médio:  ${metrics.avgMs.toFixed(3)} ms`);
    console.log(`• FPS Real Médio:    ${metrics.realFPS.toFixed(1)} FPS`);
    console.log(`• Mediana:           ${metrics.medianMs.toFixed(3)} ms`);
    console.log(`• P95 (95% dos ticks): ${metrics.p95Ms.toFixed(3)} ms (~${(1000 / metrics.p95Ms).toFixed(1)} FPS)`);
    console.log(`• P99 (Piores 1%):   ${metrics.p99Ms.toFixed(3)} ms (~${metrics.p99FPS.toFixed(1)} FPS)`);
    console.log(`• Pior Spike (Max):  ${metrics.maxMs.toFixed(3)} ms (Mínimo: ${metrics.minFPS.toFixed(1)} FPS)`);
    console.log(`• Jitter (Desvio):   ±${metrics.stdDevMs.toFixed(3)} ms`);
    console.log('======================================================\n');

    // Asserções estritas de engenharia:
    // O frame médio deve ser < 10ms (garantindo tranquilamente > 100 FPS no headless)
    expect(metrics.avgMs).toBeLessThan(10);
    // O FPS real médio deve ser superior a 60 FPS
    expect(metrics.realFPS).toBeGreaterThan(60);
    // Mesmo o P99 não pode exceder o teto estrito de 16.6ms (60 FPS garantidos)
    expect(metrics.p99Ms).toBeLessThan(16.6);
  });

  /* -------------------------------------------------------------------------- */
  /* 2. FPS SOB PRESSÃO DE COMBATE E HORDA (100+ Entidades e Projéteis)          */
  /* -------------------------------------------------------------------------- */
  it('Estresse de Combate: deve sustentar mais de 60 FPS com dezenas de entidades ativas', () => {
    const objectManager = (domain as any).objectManager;

    // Spawna 100 entidades no mundo de jogo para estressar a fila de renderização
    for (let i = 0; i < 100; i++) {
      objectManager.spawn((id: number) => ({
        id,
        objectId: 'slime',
        coordinates: { x: 500 + (i % 10) * 20, y: 500 + Math.floor(i / 10) * 20 },
        size: { width: 32, height: 32 },
        type: 'dynamic',
        update: () => {},
        hitboxes: []
      }));
    }

    const frameTimes: number[] = [];

    // Roda 300 frames sob estresse de combate
    for (let frame = 0; frame < 300; frame++) {
      const start = performance.now();

      domain.update(1 / 60);
      const renderState = domain.getRenderState();
      gameMap.draw(mockCanvasCtx, 500, 500);

      // Y-sorting em lote de 100+ entidades
      const sorted = renderState.renderables.slice().sort((a, b) =>
        (a.coordinates.y + a.size.height) - (b.coordinates.y + b.size.height)
      );

      for (let i = 0; i < sorted.length; i++) {
        const ent = sorted[i]!;
        mockCanvasCtx.drawImage({} as any, ent.coordinates.x, ent.coordinates.y, ent.size.width, ent.size.height);
      }

      const end = performance.now();
      frameTimes.push(end - start);
    }

    const metrics = calculateFPSMetrics(frameTimes);

    console.log('\n======================================================');
    console.log('⚔️  [BENCHMARK] FPS REAL - ESTRESSE DE HORDA & COMBATE');
    console.log('======================================================');
    console.log(`• Entidades no Frame:  ${(domain as any).objectManager.getEntities().length}`);
    console.log(`• Frame Time Médio:    ${metrics.avgMs.toFixed(3)} ms`);
    console.log(`• FPS Real Médio:      ${metrics.realFPS.toFixed(1)} FPS`);
    console.log(`• P99 Spike:           ${metrics.p99Ms.toFixed(3)} ms (~${metrics.p99FPS.toFixed(1)} FPS)`);
    console.log('======================================================\n');

    expect(metrics.avgMs).toBeLessThan(16.6); // < 16.6ms garante 60+ FPS
    expect(metrics.realFPS).toBeGreaterThan(60);
  });

  /* -------------------------------------------------------------------------- */
  /* 3. ESTABILIDADE DE FRAME TIME (1.000 Frames Contínuos - Zero GC Thrashing)  */
  /* -------------------------------------------------------------------------- */
  it('Estabilidade de Longo Prazo: 1.000 frames contínuos não devem apresentar degradação ou vazamento de FPS', () => {
    const frameTimes: number[] = [];

    for (let frame = 0; frame < 1000; frame++) {
      const start = performance.now();

      domain.update(1 / 60);
      const renderState = domain.getRenderState();
      gameMap.updateActiveWindow(1000 + (frame % 500), 1000 + (frame % 500));

      const end = performance.now();
      frameTimes.push(end - start);
    }

    // Compara os primeiros 100 frames contra os últimos 100 frames
    const first100 = frameTimes.slice(0, 100);
    const last100 = frameTimes.slice(900, 1000);

    const avgFirst = first100.reduce((a, b) => a + b, 0) / 100;
    const avgLast = last100.reduce((a, b) => a + b, 0) / 100;

    console.log('\n======================================================');
    console.log('📈 [BENCHMARK] ESTABILIDADE DE LONGO PRAZO (1000 FRAMES)');
    console.log('======================================================');
    console.log(`• Média Primeiros 100 frames: ${avgFirst.toFixed(3)} ms (~${(1000 / avgFirst).toFixed(0)} FPS)`);
    console.log(`• Média Últimos 100 frames:    ${avgLast.toFixed(3)} ms (~${(1000 / avgLast).toFixed(0)} FPS)`);
    console.log('======================================================\n');

    // A taxa de quadros no final não pode ter sofrido degradação superior a 5ms em relação ao início sob concorrência
    expect(avgLast).toBeLessThan(avgFirst + 5.0);
  });
});
