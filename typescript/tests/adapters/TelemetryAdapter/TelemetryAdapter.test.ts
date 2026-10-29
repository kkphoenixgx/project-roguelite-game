// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelemetryAdapter } from '../../../adapters/TelemetryAdapter/TelemetryAdapterSingleton';
import TelemetryUI from '../../../adapters/TelemetryAdapter/TelemetryUI/TelemetryUI';
import type { TelemetrySnapshot } from '../../../adapters/TelemetryAdapter/TelemetrySnapshot';

describe('TelemetryAdapter & TelemetryUI', () => {
  let adapter: TelemetryAdapter;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    TelemetryUI.telemetryUISingleton = undefined;
    TelemetryUI.domainFloatingWindowSingleton = undefined;
    (TelemetryUI as any).lastSnapshot = undefined;
    (TelemetryUI as any).styleInjected = false;
    adapter = TelemetryAdapter.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TelemetryAdapter Core Metrics & FPS Calculation', () => {
    it('deve retornar a mesma instância singleton', () => {
      const instance2 = TelemetryAdapter.getInstance();
      expect(adapter).toBe(instance2);
    });

    it('deve calcular FPS instantâneo, FPS médio e frame times através da janela móvel', () => {
      let mockTime = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      // Frame 0: inicialização
      adapter.beginFrame();
      mockTime += 16.6; // ~60fps
      adapter.endFrame();

      // Frame 1: 16.6ms
      adapter.beginFrame();
      mockTime += 16.6;
      adapter.endFrame();

      // Frame 2: spike de 33.3ms (~30fps)
      adapter.beginFrame();
      mockTime += 33.3;
      adapter.endFrame();

      const snap = adapter.getSnapshot();
      expect(snap.fps).toBeGreaterThan(0);
      expect(snap.avgFps).toBeGreaterThan(0);
      expect(snap.minFps).toBeGreaterThan(0);
      expect(snap.frameTimeMs).toBeCloseTo(33.3, 1);
      expect(snap.maxFrameTimeMs).toBeCloseTo(33.3, 1);
    });

    it('deve capturar entidades ativas, estatísticas espaciais e timings de subsistemas', () => {
      adapter.beginFrame();
      adapter.setActiveEntities(45);
      adapter.recordSubsystemTime('domain', 1.25);
      adapter.recordSubsystemTime('render', 3.40);
      adapter.setSpatialInfo({
        mapId: 'vilgem',
        playerCoords: { x: 512, y: 700 },
        currentChunk: { x: 1, y: 2 },
        activeChunksCount: 9,
        cameraZoom: 3.0,
        rendererType: 'Canvas 2D (Bicubic Lanczos)',
        activeParticles: 150
      });
      adapter.incrementCollisionCheck();
      adapter.incrementCollisionCheck();
      adapter.incrementResolvedCollision();
      adapter.incrementEvent();
      adapter.incrementEvent();
      adapter.incrementEvent();
      adapter.incrementError();

      adapter.endFrame();

      const snap = adapter.getSnapshot();
      expect(snap.activeEntities).toBe(45);
      expect(snap.domainTimeMs).toBe(1.25);
      expect(snap.renderTimeMs).toBe(3.40);
      expect(snap.mapId).toBe('vilgem');
      expect(snap.playerCoords).toEqual({ x: 512, y: 700 });
      expect(snap.currentChunk).toEqual({ x: 1, y: 2 });
      expect(snap.activeChunksCount).toBe(9);
      expect(snap.cameraZoom).toBe(3.0);
      expect(snap.rendererType).toBe('Canvas 2D (Bicubic Lanczos)');
      expect(snap.activeParticles).toBe(150);
      expect(snap.collisionChecks).toBe(2);
      expect(snap.resolvedCollisions).toBe(1);
      expect(snap.eventThroughput).toBe(3);
      expect(snap.errorCount).toBeGreaterThanOrEqual(1);
    });

    it('deve manter buffer circular de logs sem vazamento de memória', () => {
      for (let i = 0; i < 70; i++) {
        adapter.captureLog(`Log entry #${i}`);
      }

      const snap = adapter.getSnapshot();
      expect(snap.recentLogs.length).toBeLessThanOrEqual(50);
      expect(snap.recentLogs[snap.recentLogs.length - 1]).toBe('Log entry #69');
    });
  });

  describe('TelemetryUI Glassmorphism Overlay', () => {
    it('deve criar o elemento singleton da UI com estilos injetados', () => {
      const el = TelemetryUI.getSingleton();
      expect(el).not.toBeNull();
      expect(el.id).toBe('telemetry-hud');
      expect(el.className).toBe('telemetry-hud');
      expect(document.getElementById('telemetry-hud-style')).not.toBeNull();
    });

    it('deve renderizar FPS em destaque com badges de performance e indicadores de subsistemas', () => {
      const el = TelemetryUI.getSingleton();
      el.style.display = 'block';

      const mockSnapshot: TelemetrySnapshot = {
        fps: 60,
        avgFps: 59.8,
        minFps: 55.2,
        frameTimeMs: 16.67,
        avgFrameTimeMs: 16.5,
        maxFrameTimeMs: 18.1,
        p95FrameTimeMs: 17.2,
        p99FrameTimeMs: 17.9,
        frameJitterMs: 0.45,
        droppedFramesCount: 2,
        droppedFramesPct: 3,
        jankCount: 0,
        domainTimeMs: 0.85,
        renderTimeMs: 2.15,
        eventLoopLagMs: 1.2,
        rendererType: 'Canvas 2D (Bicubic Lanczos)',
        drawCalls: 14,
        culledEntities: 5,
        textureCacheCount: 9,
        mapId: 'interior_black_default',
        playerCoords: { x: 512, y: 700 },
        currentChunk: { x: 0, y: 0 },
        activeChunksCount: 1,
        cameraZoom: 2.5,
        activeEntities: 18,
        activeParticles: 42,
        collisionChecks: 12,
        resolvedCollisions: 3,
        eventThroughput: 8,
        gcCount: 1,
        longTasksCount: 0,
        errorCount: 0,
        recentLogs: ['[INIT] Game started', '[DOMAIN] Spawned player', '[ERROR] Failed to load image']
      };

      TelemetryUI.render(mockSnapshot);

      expect(el.innerHTML).toContain('60');
      expect(el.innerHTML).toContain('FPS');
      expect(el.innerHTML).toContain('telemetry-fps-good');
      expect(el.innerHTML).toContain('interior_black_default');
      expect(el.innerHTML).toContain('512, 700');
      expect(el.innerHTML).toContain('Canvas 2D (Bicubic Lanczos)');
      expect(el.innerHTML).toContain('16.67ms');
      expect(el.innerHTML).toContain('0.85ms');
      expect(el.innerHTML).toContain('2.15ms');
      expect(el.innerHTML).toContain('17.20ms'); // P95
      expect(el.innerHTML).toContain('17.90ms'); // P99
      expect(el.innerHTML).toContain('14');      // Draw Calls
      expect(el.innerHTML).toContain('[ERROR] Failed to load image');
    });

    it('deve alterar a cor do FPS para vermelho quando for abaixo de 30 FPS', () => {
      const el = TelemetryUI.getSingleton();
      el.style.display = 'block';

      const lagSnapshot: TelemetrySnapshot = {
        fps: 24,
        avgFps: 25.1,
        minFps: 18.0,
        frameTimeMs: 41.6,
        avgFrameTimeMs: 39.8,
        maxFrameTimeMs: 55.5,
        p95FrameTimeMs: 50.2,
        p99FrameTimeMs: 54.8,
        frameJitterMs: 8.5,
        droppedFramesCount: 45,
        droppedFramesPct: 75,
        jankCount: 12,
        domainTimeMs: 15.2,
        renderTimeMs: 22.0,
        eventLoopLagMs: 25.0,
        rendererType: 'Canvas 2D',
        drawCalls: 120,
        culledEntities: 30,
        textureCacheCount: 25,
        mapId: 'vilgem',
        playerCoords: { x: 0, y: 0 },
        currentChunk: { x: 0, y: 0 },
        activeChunksCount: 9,
        cameraZoom: 1.0,
        activeEntities: 100,
        activeParticles: 500,
        collisionChecks: 50,
        resolvedCollisions: 10,
        eventThroughput: 20,
        gcCount: 4,
        longTasksCount: 3,
        errorCount: 2,
        recentLogs: []
      };

      TelemetryUI.render(lagSnapshot);
      expect(el.innerHTML).toContain('telemetry-fps-bad');
      expect(el.innerHTML).toContain('12'); // Jank spikes
    });

    it('deve calcular métricas de percentis (P95, P99), jitter e dropped frames no TelemetryAdapter', () => {
      const adapter = TelemetryAdapter.getInstance();
      adapter.beginFrame();
      adapter.endFrame();
      const snapshot = adapter.getSnapshot();

      expect(typeof snapshot.p95FrameTimeMs).toBe('number');
      expect(typeof snapshot.p99FrameTimeMs).toBe('number');
      expect(typeof snapshot.frameJitterMs).toBe('number');
      expect(typeof snapshot.droppedFramesCount).toBe('number');
      expect(typeof snapshot.droppedFramesPct).toBe('number');
      expect(typeof snapshot.jankCount).toBe('number');
      expect(typeof snapshot.drawCalls).toBe('number');
      expect(typeof snapshot.eventLoopLagMs).toBe('number');
    });

    it('deve registrar tempos granulares por arquivo e gerar o ranking Top 10 de consumo', () => {
      const adapter = TelemetryAdapter.getInstance();
      adapter.beginFrame();
      adapter.recordFileTiming('CollisionManager.ts', 'Domain / Physics', 4.5, 1);
      adapter.recordFileTiming('WebGPURenderer.ts', 'Adapters / WebGPU', 8.2);
      adapter.recordFileTiming('SceneManager.ts', 'Adapters / Scene', 2.1);
      adapter.recordFileTiming('UIManager.ts', 'Adapters / UI', 1.0);
      adapter.recordFileTiming('Slime.ts', 'Domain / Entities', 3.0, 25);
      adapter.recordFileTiming('Player.ts', 'Domain / Player', 0.8, 1);
      adapter.endFrame();

      const snap = adapter.getSnapshot();
      expect(snap.topFilesBreakdown).toBeDefined();
      expect(snap.topFilesBreakdown!.length).toBe(6);

      // O mais pesado deve ser o primeiro (WebGPURenderer.ts)
      expect(snap.topFilesBreakdown![0]!.file).toBe('WebGPURenderer.ts');
      expect(snap.topFilesBreakdown![0]!.module).toBe('Adapters / WebGPU');
      expect(snap.topFilesBreakdown![0]!.durationMs).toBe(8.2);
      expect(snap.topFilesBreakdown![0]!.pct).toBeGreaterThan(0);

      // O segundo mais pesado deve ser CollisionManager.ts
      expect(snap.topFilesBreakdown![1]!.file).toBe('CollisionManager.ts');
      expect(snap.topFilesBreakdown![1]!.module).toBe('Domain / Physics');

      // Slime.ts deve ter 25 instâncias
      const slimeMetric = snap.topFilesBreakdown!.find(m => m.file === 'Slime.ts');
      expect(slimeMetric).toBeDefined();
      expect(slimeMetric!.instances).toBe(25);

      // Verificação de separação por camada: Domínio vs Adapters
      expect(snap.topDomainFilesBreakdown).toBeDefined();
      expect(snap.topDomainFilesBreakdown!.length).toBe(3); // CollisionManager, Slime, Player
      expect(snap.topDomainFilesBreakdown![0]!.file).toBe('CollisionManager.ts');
      expect(snap.topDomainFilesBreakdown![0]!.layer).toBe('domain');
      expect(snap.topDomainFilesBreakdown![0]!.layerPct).toBeGreaterThan(0);

      expect(snap.topAdapterFilesBreakdown).toBeDefined();
      expect(snap.topAdapterFilesBreakdown!.length).toBe(3); // WebGPURenderer, SceneManager, UIManager
      expect(snap.topAdapterFilesBreakdown![0]!.file).toBe('WebGPURenderer.ts');
      expect(snap.topAdapterFilesBreakdown![0]!.layer).toBe('adapter');
      expect(snap.topAdapterFilesBreakdown![0]!.layerPct).toBeGreaterThan(0);
    });
  });

  describe('Telemetry Dedicated Floating Window (Domínio & Entidades)', () => {
    it('deve renomear o título principal para TELEMETRY no lugar de ALVORADA TELEMETRY', () => {
      const hud = TelemetryUI.getSingleton();
      hud.style.display = 'block';

      TelemetryUI.render({
        fps: 60,
        avgFps: 60,
        minFps: 60,
        frameTimeMs: 16.6,
        avgFrameTimeMs: 16.6,
        maxFrameTimeMs: 16.6,
        p95FrameTimeMs: 16.6,
        p99FrameTimeMs: 16.6,
        frameJitterMs: 0.1,
        droppedFramesCount: 0,
        droppedFramesPct: 0,
        jankCount: 0,
        domainTimeMs: 1.0,
        renderTimeMs: 2.0,
        eventLoopLagMs: 0.5,
        drawCalls: 10,
        culledEntities: 0,
        textureCacheCount: 5,
        mapId: 'vilgem',
        rendererType: 'Canvas 2D',
        playerCoords: { x: 0, y: 0 },
        currentChunk: { x: 0, y: 0 },
        activeChunksCount: 1,
        cameraZoom: 1.0,
        activeEntities: 10,
        activeParticles: 20,
        collisionChecks: 5,
        resolvedCollisions: 1,
        eventThroughput: 4,
        gcCount: 0,
        longTasksCount: 0,
        errorCount: 0,
        recentLogs: []
      });

      expect(hud.innerHTML).toContain('TELEMETRY');
      expect(hud.innerHTML).not.toContain('ALVORADA TELEMETRY');
    });

    it('deve criar a janela flutuante de domínio com header arrastável, botão fechar e corpo', () => {
      const win = TelemetryUI.getDomainFloatingWindow();
      expect(win).toBeDefined();
      expect(win.id).toBe('telemetry-domain-window');
      expect(win.classList.contains('telemetry-floating-window')).toBe(true);

      const header = win.querySelector('#telemetry-domain-drag-header');
      expect(header).not.toBeNull();
      expect(header?.textContent).toContain('TELEMETRY — DOMÍNIO & ENTIDADES');

      const closeBtn = win.querySelector('#telemetry-domain-close-btn');
      expect(closeBtn).not.toBeNull();

      const body = win.querySelector('#telemetry-domain-body');
      expect(body).not.toBeNull();
    });

    it('deve alternar a visibilidade da janela flutuante com toggleDomainWindow e botão fechar', () => {
      const win = TelemetryUI.toggleDomainWindow(true);
      expect(win.style.display).toBe('block');
      expect(document.body.contains(win)).toBe(true);

      //? Testa alternância para fechado
      TelemetryUI.toggleDomainWindow();
      expect(win.style.display).toBe('none');

      //? Reabre e clica no botão fechar (✕)
      TelemetryUI.toggleDomainWindow(true);
      expect(win.style.display).toBe('block');
      const closeBtn = win.querySelector('#telemetry-domain-close-btn') as HTMLElement;
      closeBtn?.click();
      expect(win.style.display).toBe('none');
    });

    it('deve alternar a janela flutuante ao clicar no botão da Janela Flutuante no HUD principal', () => {
      const hud = TelemetryUI.getSingleton();
      hud.style.display = 'block';

      TelemetryUI.render({
        fps: 60,
        avgFps: 60,
        minFps: 60,
        frameTimeMs: 16.6,
        avgFrameTimeMs: 16.6,
        maxFrameTimeMs: 16.6,
        p95FrameTimeMs: 16.6,
        p99FrameTimeMs: 16.6,
        frameJitterMs: 0.1,
        droppedFramesCount: 0,
        droppedFramesPct: 0,
        jankCount: 0,
        domainTimeMs: 1.0,
        renderTimeMs: 2.0,
        eventLoopLagMs: 0.5,
        drawCalls: 10,
        culledEntities: 0,
        textureCacheCount: 5,
        mapId: 'vilgem',
        rendererType: 'Canvas 2D',
        playerCoords: { x: 0, y: 0 },
        currentChunk: { x: 0, y: 0 },
        activeChunksCount: 1,
        cameraZoom: 1.0,
        activeEntities: 10,
        activeParticles: 20,
        collisionChecks: 5,
        resolvedCollisions: 1,
        eventThroughput: 4,
        gcCount: 0,
        longTasksCount: 0,
        errorCount: 0,
        recentLogs: []
      });

      const openBtn = hud.querySelector('#telemetry-open-domain-btn') as HTMLElement;
      expect(openBtn).not.toBeNull();

      const win = TelemetryUI.getDomainFloatingWindow();
      win.style.display = 'none';

      openBtn.click();
      expect(win.style.display).toBe('block');

      openBtn.click();
      expect(win.style.display).toBe('none');
    });

    it('deve suportar arrastar a janela flutuante alterando style.left e style.top', () => {
      const win = TelemetryUI.getDomainFloatingWindow();
      win.style.display = 'block';
      win.style.left = '100px';
      win.style.top = '100px';

      const header = win.querySelector('#telemetry-domain-drag-header') as HTMLElement;
      expect(header).not.toBeNull();

      //? Simula início do arrasto via mousedown no header
      const mouseDownEvt = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 120,
        button: 0
      });
      header.dispatchEvent(mouseDownEvt);

      //? Simula movimento do mouse
      const mouseMoveEvt = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 170
      });
      document.dispatchEvent(mouseMoveEvt);

      //? Nova posição: left = 100 + (200 - 150) = 150px, top = 100 + (170 - 120) = 150px
      expect(win.style.left).toBe('150px');
      expect(win.style.top).toBe('150px');

      //? Simula soltura do mouse
      const mouseUpEvt = new MouseEvent('mouseup', {});
      document.dispatchEvent(mouseUpEvt);
    });

    it('regressão: deve renderizar métricas de entidades e ranking de top arquivos de domínio na janela flutuante', () => {
      const win = TelemetryUI.getDomainFloatingWindow();
      win.style.display = 'block';

      const snapshot: TelemetrySnapshot = {
        fps: 60,
        avgFps: 60,
        minFps: 60,
        frameTimeMs: 16.6,
        avgFrameTimeMs: 16.6,
        maxFrameTimeMs: 16.6,
        p95FrameTimeMs: 16.6,
        p99FrameTimeMs: 16.6,
        frameJitterMs: 0.1,
        droppedFramesCount: 0,
        droppedFramesPct: 0,
        jankCount: 0,
        domainTimeMs: 4.82,
        renderTimeMs: 2.15,
        eventLoopLagMs: 0.8,
        drawCalls: 12,
        culledEntities: 3,
        textureCacheCount: 8,
        mapId: 'vilgem',
        rendererType: 'Canvas 2D',
        playerCoords: { x: 50, y: 80 },
        currentChunk: { x: 0, y: 0 },
        activeChunksCount: 4,
        cameraZoom: 2.0,
        activeEntities: 37,
        activeParticles: 128,
        collisionChecks: 45,
        resolvedCollisions: 12,
        eventThroughput: 19,
        gcCount: 2,
        longTasksCount: 0,
        errorCount: 0,
        recentLogs: [],
        topDomainFilesBreakdown: [
          {
            file: 'CollisionManager.ts',
            module: 'Domain / Physics',
            durationMs: 3.2,
            pct: 20,
            layer: 'domain',
            layerPct: 66.4,
            instances: 1
          },
          {
            file: 'Slime.ts',
            module: 'Domain / Entities',
            durationMs: 1.62,
            pct: 10,
            layer: 'domain',
            layerPct: 33.6,
            instances: 15
          }
        ]
      };

      TelemetryUI.render(snapshot);

      const body = win.querySelector('#telemetry-domain-body');
      expect(body).not.toBeNull();
      const content = body?.innerHTML ?? '';

      //? Validação das métricas de entidades e física
      expect(content).toContain('Active Entities:');
      expect(content).toContain('37');
      expect(content).toContain('VFX Particles:');
      expect(content).toContain('128');
      expect(content).toContain('Col. Checks:');
      expect(content).toContain('45');
      expect(content).toContain('Resolved Col.:');
      expect(content).toContain('12');
      expect(content).toContain('Event Bus Throughput:');
      expect(content).toContain('19 evt/f');
      expect(content).toContain('4.82ms / frame');

      //? Validação dos arquivos de domínio no breakdown
      expect(content).toContain('CollisionManager.ts');
      expect(content).toContain('Slime.ts');
      expect(content).toContain('[x15]');
      expect(content).toContain('66.4% Dom');
      expect(content).toContain('33.6% Dom');
    });

    it('regressão: TelemetryAdapter deve expor getDomainFloatingWindow compatível com a interface', () => {
      const adapter = TelemetryAdapter.getInstance();
      const floatWin = adapter.getDomainFloatingWindow();
      expect(floatWin).toBe(TelemetryUI.getDomainFloatingWindow());
    });
  });
});
