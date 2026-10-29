import type { ITelemetryPort } from '../../domain/ports/ITelemetryPort';
import type { TelemetrySnapshot, FilePerformanceMetric } from './TelemetrySnapshot';
import TelemetryUI from './TelemetryUI/TelemetryUI';
import type { ITelemetryAdapter, TelemetrySpatialInfo } from './ITelemetryAdapter';

export class TelemetryAdapter implements ITelemetryAdapter {
  private static instance: TelemetryAdapter;

  // Frame Timing & FPS
  private lastFrameTime: number = 0;
  private currentFrameStartTime: number = 0;
  private readonly sampleSize: number = 60;
  private frameDeltas: Float32Array = new Float32Array(this.sampleSize);
  private sortScratch: Float32Array = new Float32Array(this.sampleSize);
  private frameDeltaIndex: number = 0;
  private totalFramesSampled: number = 0;
  private currentFps: number = 60;

  // Subsystem Timings (ms)
  private domainTimeMs: number = 0;
  private renderTimeMs: number = 0;
  private syncTimeMs: number = 0;
  private uiTimeMs: number = 0;
  private rendererType: string = 'Canvas 2D';

  // Granular File Timings (Zero-GC)
  private fileTimingsMap: Map<string, FilePerformanceMetric> = new Map();
  private topFilesScratch: FilePerformanceMetric[] = [];
  private topDomainScratch: FilePerformanceMetric[] = [];
  private topAdapterScratch: FilePerformanceMetric[] = [];

  // Thread & Event Loop Health
  private eventLoopLagMs: number = 0;
  private eventLoopTimer: any = null;
  private longTasksCount: number = 0;
  private observer: any = null;

  // Memory & GC Health
  private lastHeapBytes: number = 0;
  private peakHeapBytes: number = 0;
  private gcCount: number = 0;
  private lastAllocCheckTime: number = 0;
  private lastAllocHeapBytes: number = 0;
  private currentAllocRateMbSec: number = 0;

  // Draw & Rendering Metrics
  private drawCalls: number = 0;
  private culledEntities: number = 0;
  private textureCacheCount: number = 0;

  // Spatial & World
  private mapId: string = 'vilgem';
  private playerCoords: { x: number; y: number } = { x: 0, y: 0 };
  private currentChunk: { x: number; y: number } = { x: 0, y: 0 };
  private activeChunksCount: number = 0;
  private cameraZoom: number = 1.0;
  private activeParticles: number = 0;

  // Counters
  private collisionChecksCounter: number = 0;
  private resolvedCollisionsCounter: number = 0;
  private eventThroughputCounter: number = 0;
  private activeEntitiesCounter: number = 0;
  private errorCount: number = 0;

  // Circular log buffer
  private readonly maxLogs: number = 50;
  private recentLogsBuffer: string[] = new Array(this.maxLogs).fill('');
  private logHead: number = 0;

  private snapshotState: TelemetrySnapshot = {
    fps: 60,
    avgFps: 60,
    minFps: 60,
    frameTimeMs: 16.6,
    avgFrameTimeMs: 16.6,
    maxFrameTimeMs: 16.6,
    p95FrameTimeMs: 16.6,
    p99FrameTimeMs: 16.6,
    frameJitterMs: 0,
    droppedFramesCount: 0,
    droppedFramesPct: 0,
    jankCount: 0,
    domainTimeMs: 0,
    renderTimeMs: 0,
    eventLoopLagMs: 0,
    rendererType: 'Canvas 2D',
    drawCalls: 0,
    culledEntities: 0,
    textureCacheCount: 0,
    mapId: 'vilgem',
    playerCoords: { x: 0, y: 0 },
    currentChunk: { x: 0, y: 0 },
    activeChunksCount: 0,
    cameraZoom: 1.0,
    activeEntities: 0,
    activeParticles: 0,
    collisionChecks: 0,
    resolvedCollisions: 0,
    eventThroughput: 0,
    gcCount: 0,
    longTasksCount: 0,
    errorCount: 0,
    recentLogs: []
  };

  private constructor() {
    this.setupPerformanceObserver();
    this.startEventLoopMonitoring();
  }

  public static getInstance(): TelemetryAdapter {
    if (!TelemetryAdapter.instance) {
      TelemetryAdapter.instance = new TelemetryAdapter();
    }
    return TelemetryAdapter.instance;
  }

  //? ----------- Main Lifecycle Methods -----------

  public beginFrame(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime;
      // Filtra pausas de segundo plano ou congelamento de navegador (> 2000ms) para não distorcer estatísticas
      if (delta > 0 && delta < 2000) {
        this.frameDeltas[this.frameDeltaIndex] = delta;
        this.frameDeltaIndex = (this.frameDeltaIndex + 1) % this.sampleSize;
        if (this.totalFramesSampled < this.sampleSize) {
          this.totalFramesSampled++;
        }
        this.currentFps = 1000 / delta;
      }
    }

    this.lastFrameTime = now;
    this.currentFrameStartTime = now;

    // Reseta métricas de subsistemas por frame para evitar acúmulo residual quando pausado
    this.domainTimeMs = 0;
    this.renderTimeMs = 0;
    this.syncTimeMs = 0;
    this.uiTimeMs = 0;

    // Reseta os contadores efêmeros por frame
    this.collisionChecksCounter = 0;
    this.resolvedCollisionsCounter = 0;
    this.eventThroughputCounter = 0;

    // Reseta métricas granulares de arquivos por frame (Zero-GC)
    for (const metric of this.fileTimingsMap.values()) {
      metric.durationMs = 0;
      metric.pct = 0;
      metric.layerPct = 0;
      if (metric.instances !== undefined) {
        metric.instances = 0;
      }
    }
  }

  public endFrame(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const frameTime = now - this.currentFrameStartTime;

    if (frameTime > 50 && !this.observer) {
      this.longTasksCount++;
    }

    // Estatísticas da janela móvel de frames (últimos 60 frames)
    let sumDeltas = 0;
    let maxDelta = 0;
    const count = this.totalFramesSampled;

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const d = this.frameDeltas[i]!;
        this.sortScratch[i] = d;
        sumDeltas += d;
        if (d > maxDelta) maxDelta = d;
      }
      if (frameTime > maxDelta) maxDelta = frameTime;
      const avgDelta = sumDeltas / count;

      // Ordena scratch buffer para percentis P95 e P99 (Zero-GC)
      const activeSorted = this.sortScratch.subarray(0, count);
      activeSorted.sort();

      const p95Idx = Math.min(count - 1, Math.floor(count * 0.95));
      const p99Idx = Math.min(count - 1, Math.floor(count * 0.99));
      const p95 = activeSorted[p95Idx] ?? frameTime;
      const p99 = activeSorted[p99Idx] ?? frameTime;

      // Jitter (desvio padrão) e frames caídos (>16.7ms e >33.3ms)
      let varianceSum = 0;
      let droppedCount = 0;
      let jankSpikes = 0;

      for (let i = 0; i < count; i++) {
        const d = this.frameDeltas[i]!;
        const diff = d - avgDelta;
        varianceSum += diff * diff;
        if (d > 16.7) droppedCount++;
        if (d > 33.33) jankSpikes++;
      }

      const jitter = Math.sqrt(varianceSum / count);

      this.snapshotState.fps = this.currentFps;
      this.snapshotState.avgFps = avgDelta > 0 ? 1000 / avgDelta : 0;
      this.snapshotState.minFps = maxDelta > 0 ? 1000 / maxDelta : 0;
      this.snapshotState.avgFrameTimeMs = avgDelta;
      this.snapshotState.maxFrameTimeMs = maxDelta;
      this.snapshotState.p95FrameTimeMs = p95;
      this.snapshotState.p99FrameTimeMs = p99;
      this.snapshotState.frameJitterMs = jitter;
      this.snapshotState.droppedFramesCount = droppedCount;
      this.snapshotState.droppedFramesPct = Math.round((droppedCount / count) * 100);
      this.snapshotState.jankCount = jankSpikes;
    } else {
      this.snapshotState.fps = this.currentFps;
      this.snapshotState.avgFps = this.currentFps;
      this.snapshotState.minFps = this.currentFps;
      this.snapshotState.avgFrameTimeMs = frameTime;
      this.snapshotState.maxFrameTimeMs = frameTime;
      this.snapshotState.p95FrameTimeMs = frameTime;
      this.snapshotState.p99FrameTimeMs = frameTime;
      this.snapshotState.frameJitterMs = 0;
      this.snapshotState.droppedFramesCount = frameTime > 16.7 ? 1 : 0;
      this.snapshotState.droppedFramesPct = frameTime > 16.7 ? 100 : 0;
      this.snapshotState.jankCount = frameTime > 33.33 ? 1 : 0;
    }

    this.snapshotState.frameTimeMs = frameTime;
    this.snapshotState.domainTimeMs = this.domainTimeMs;
    this.snapshotState.renderTimeMs = this.renderTimeMs;
    this.snapshotState.syncTimeMs = this.syncTimeMs;
    this.snapshotState.uiTimeMs = this.uiTimeMs;
    this.snapshotState.eventLoopLagMs = this.eventLoopLagMs;
    this.snapshotState.rendererType = this.rendererType;

    // Cálculo em tempo real do breakdown de recursos consumidos (% do tempo total dos módulos)
    const trackedTotal = this.domainTimeMs + this.renderTimeMs + this.syncTimeMs + this.uiTimeMs;
    const baseBudget = trackedTotal > 0 ? trackedTotal : Math.max(0.001, frameTime);

    const breakdown = [
      { name: 'Domain (Física/IA)', durationMs: this.domainTimeMs, pct: Math.min(100, Math.round((this.domainTimeMs / baseBudget) * 100)) },
      { name: 'GPU Render Pipeline', durationMs: this.renderTimeMs, pct: Math.min(100, Math.round((this.renderTimeMs / baseBudget) * 100)) },
      { name: 'Render State Sync', durationMs: this.syncTimeMs, pct: Math.min(100, Math.round((this.syncTimeMs / baseBudget) * 100)) },
      { name: 'UI / HUD Updates', durationMs: this.uiTimeMs, pct: Math.min(100, Math.round((this.uiTimeMs / baseBudget) * 100)) }
    ];

    // Ordena decrescente: do módulo que mais consome para o que menos consome
    breakdown.sort((a, b) => b.durationMs - a.durationMs);
    this.snapshotState.moduleBreakdown = breakdown;

    // Cálculo em tempo real dos Top Arquivos Mais Pesados (% do tempo do frame e da própria camada)
    this.topFilesScratch.length = 0;
    this.topDomainScratch.length = 0;
    this.topAdapterScratch.length = 0;

    let totalTrackedFilesDuration = 0;
    let totalDomainTrackedDuration = 0;
    let totalAdapterTrackedDuration = 0;

    for (const metric of this.fileTimingsMap.values()) {
      if (metric.durationMs > 0) {
        totalTrackedFilesDuration += metric.durationMs;
        this.topFilesScratch.push(metric);

        if (metric.layer === 'domain' || metric.module.toLowerCase().startsWith('domain')) {
          totalDomainTrackedDuration += metric.durationMs;
          this.topDomainScratch.push(metric);
        } else {
          totalAdapterTrackedDuration += metric.durationMs;
          this.topAdapterScratch.push(metric);
        }
      }
    }

    const fileBaseBudget = totalTrackedFilesDuration > 0 ? totalTrackedFilesDuration : Math.max(0.001, frameTime);
    const domainBaseBudget = totalDomainTrackedDuration > 0 ? totalDomainTrackedDuration : (this.domainTimeMs > 0 ? this.domainTimeMs : 0.001);
    const adapterBaseBudget = totalAdapterTrackedDuration > 0 ? totalAdapterTrackedDuration : (frameTime > 0 ? frameTime : 0.001);

    for (let i = 0; i < this.topFilesScratch.length; i++) {
      const item = this.topFilesScratch[i]!;
      item.pct = Math.min(100, Math.round((item.durationMs / fileBaseBudget) * 100));
      if (item.layer === 'domain' || item.module.toLowerCase().startsWith('domain')) {
        item.layerPct = Math.min(100, Math.round((item.durationMs / domainBaseBudget) * 100));
      } else {
        item.layerPct = Math.min(100, Math.round((item.durationMs / adapterBaseBudget) * 100));
      }
    }

    this.topFilesScratch.sort((a, b) => b.durationMs - a.durationMs);
    this.topDomainScratch.sort((a, b) => b.durationMs - a.durationMs);
    this.topAdapterScratch.sort((a, b) => b.durationMs - a.durationMs);

    this.snapshotState.topFilesBreakdown = this.topFilesScratch.slice(0, 10);
    this.snapshotState.topDomainFilesBreakdown = this.topDomainScratch.slice(0, 10);
    this.snapshotState.topAdapterFilesBreakdown = this.topAdapterScratch.slice(0, 10);

    // Métricas de render e cena
    this.snapshotState.drawCalls = this.drawCalls;
    this.snapshotState.culledEntities = this.culledEntities;
    this.snapshotState.textureCacheCount = this.textureCacheCount;

    // Métricas espaciais
    this.snapshotState.mapId = this.mapId;
    this.snapshotState.playerCoords = this.playerCoords;
    this.snapshotState.currentChunk = this.currentChunk;
    this.snapshotState.activeChunksCount = this.activeChunksCount;
    this.snapshotState.cameraZoom = this.cameraZoom;

    // Entidades e física
    this.snapshotState.activeEntities = this.activeEntitiesCounter;
    this.snapshotState.activeParticles = this.activeParticles;
    this.snapshotState.collisionChecks = this.collisionChecksCounter;
    this.snapshotState.resolvedCollisions = this.resolvedCollisionsCounter;
    this.snapshotState.eventThroughput = this.eventThroughputCounter;
    this.snapshotState.longTasksCount = this.longTasksCount;
    this.snapshotState.errorCount = this.errorCount;
    this.snapshotState.gcCount = this.gcCount;

    // Métricas de Heap e Detecção de GC
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      const usedBytes = mem.usedJSHeapSize;
      const totalBytes = mem.totalJSHeapSize;

      this.snapshotState.memoryUsedMb = Math.round((usedBytes / (1024 * 1024)) * 10) / 10;
      this.snapshotState.memoryTotalMb = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;

      if (usedBytes > this.peakHeapBytes) {
        this.peakHeapBytes = usedBytes;
      }
      this.snapshotState.memoryPeakMb = Math.round((this.peakHeapBytes / (1024 * 1024)) * 10) / 10;

      // Se a memória usada caiu mais de 200KB, o Garbage Collector realizou uma coleta
      if (this.lastHeapBytes > 0 && usedBytes < this.lastHeapBytes - 200 * 1024) {
        this.gcCount++;
      }

      // Taxa de Alocação de Heap (MB/s)
      if (this.lastAllocCheckTime === 0) {
        this.lastAllocCheckTime = now;
        this.lastAllocHeapBytes = usedBytes;
      } else {
        const timeSinceAlloc = now - this.lastAllocCheckTime;
        if (timeSinceAlloc >= 1000) {
          const diffBytes = Math.max(0, usedBytes - this.lastAllocHeapBytes);
          this.currentAllocRateMbSec = Math.round((diffBytes / (1024 * 1024) / (timeSinceAlloc / 1000)) * 10) / 10;
          this.lastAllocCheckTime = now;
          this.lastAllocHeapBytes = usedBytes;
        }
      }
      this.lastHeapBytes = usedBytes;
      this.snapshotState.allocationRateMbSec = this.currentAllocRateMbSec;
    } else {
      this.snapshotState.memoryUsedMb = undefined;
      this.snapshotState.memoryTotalMb = undefined;
      this.snapshotState.memoryPeakMb = undefined;
      this.snapshotState.allocationRateMbSec = undefined;
    }
  }

  public recordSubsystemTime(subsystem: 'domain' | 'render' | 'sync' | 'ui' | string, durationMs: number): void {
    if (subsystem === 'domain') {
      this.domainTimeMs = durationMs;
    } else if (subsystem === 'render') {
      this.renderTimeMs = durationMs;
    } else if (subsystem === 'sync') {
      this.syncTimeMs = durationMs;
    } else if (subsystem === 'ui') {
      this.uiTimeMs = durationMs;
    }
  }

  public recordFileTiming(file: string, module: string, durationMs: number, instances?: number): void {
    let metric = this.fileTimingsMap.get(file);
    if (!metric) {
      const isDomain = module.toLowerCase().startsWith('domain');
      metric = {
        file,
        module,
        durationMs: 0,
        pct: 0,
        layerPct: 0,
        instances: 0,
        layer: isDomain ? 'domain' : 'adapter'
      };
      this.fileTimingsMap.set(file, metric);
    }
    metric.durationMs += durationMs;
    if (instances !== undefined) {
      metric.instances = (metric.instances ?? 0) + instances;
    }
  }

  public setSpatialInfo(info: TelemetrySpatialInfo): void {
    if (info.mapId !== undefined) this.mapId = info.mapId;
    if (info.playerCoords !== undefined) this.playerCoords = info.playerCoords;
    if (info.currentChunk !== undefined) this.currentChunk = info.currentChunk;
    if (info.activeChunksCount !== undefined) this.activeChunksCount = info.activeChunksCount;
    if (info.cameraZoom !== undefined) this.cameraZoom = info.cameraZoom;
    if (info.rendererType !== undefined) this.rendererType = info.rendererType;
    if (info.activeParticles !== undefined) this.activeParticles = info.activeParticles;
    if (info.drawCalls !== undefined) this.drawCalls = info.drawCalls;
    if (info.culledEntities !== undefined) this.culledEntities = info.culledEntities;
    if (info.textureCacheCount !== undefined) this.textureCacheCount = info.textureCacheCount;
  }

  public incrementError(): void {
    this.errorCount++;
  }

  public incrementLongTask(): void {
    this.longTasksCount++;
  }

  public incrementGc(): void {
    this.gcCount++;
  }

  public captureLog(message: string): void {
    this.recentLogsBuffer[this.logHead] = message;
    this.logHead = (this.logHead + 1) % this.maxLogs;
  }

  public getSnapshot(): TelemetrySnapshot {
    const orderedLogs: string[] = [];
    for (let i = 0; i < this.maxLogs; i++) {
      const idx = (this.logHead + i) % this.maxLogs;
      const log = this.recentLogsBuffer[idx];
      if (log) orderedLogs.push(log);
    }
    this.snapshotState.recentLogs = orderedLogs;
    return this.snapshotState;
  }

  public getTelemetryUI(): HTMLDivElement {
    return TelemetryUI.getSingleton();
  }

  public getDomainFloatingWindow(): HTMLDivElement {
    return (TelemetryUI as any).getDomainFloatingWindow();
  }

  public updateUI(): void {
    TelemetryUI.render(this.getSnapshot());
  }

  //? ----------- Aux Counter Methods -----------

  public incrementCollisionCheck(): void {
    this.collisionChecksCounter++;
  }

  public incrementResolvedCollision(): void {
    this.resolvedCollisionsCounter++;
  }

  public incrementEvent(): void {
    this.eventThroughputCounter++;
  }

  public setActiveEntities(count: number): void {
    this.activeEntitiesCounter = count;
  }

  //? ----------- Performance Observer & Event Loop -----------

  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const supported = (PerformanceObserver as any).supportedEntryTypes;
        if (!supported || supported.includes('longtask')) {
          this.observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'longtask' || (entry as any).duration > 50) {
                this.longTasksCount++;
              }
            }
          });
          this.observer.observe({ entryTypes: ['longtask'] });
        }
      } catch (e) {
        // Fallback silencioso em ambientes sem suporte
      }
    }
  }

  private startEventLoopMonitoring(): void {
    if (typeof setTimeout === 'undefined') return;
    let expected = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 100;
    const tick = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.eventLoopLagMs = Math.max(0, Math.round((now - expected) * 10) / 10);
      expected = now + 100;
      this.eventLoopTimer = setTimeout(tick, 100);
    };
    this.eventLoopTimer = setTimeout(tick, 100);
  }

  public dispose(): void {
    if (this.eventLoopTimer) {
      clearTimeout(this.eventLoopTimer);
      this.eventLoopTimer = null;
    }
    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch (e) {}
      this.observer = null;
    }
  }
}
