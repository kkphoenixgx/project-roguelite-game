export interface FilePerformanceMetric {
  file: string;
  module: string;
  durationMs: number;
  pct: number;
  layerPct?: number;
  instances?: number;
  layer?: 'domain' | 'adapter';
}

export interface TelemetrySnapshot {
  /* FPS & Frame Times */
  fps: number;
  avgFps: number;
  minFps: number;
  frameTimeMs: number;
  avgFrameTimeMs: number;
  maxFrameTimeMs: number;

  /* Frame Pacing & Stability (Microstutters & Jank) */
  p95FrameTimeMs: number;
  p99FrameTimeMs: number;
  frameJitterMs: number;
  droppedFramesCount: number;
  droppedFramesPct: number;
  jankCount: number;

  /* Subsystem Timings (ms) & Thread Health */
  domainTimeMs: number;
  renderTimeMs: number;
  syncTimeMs?: number;
  uiTimeMs?: number;
  eventLoopLagMs: number;
  rendererType: string;

  /* Resource Consumption Breakdown (% do frame time) */
  moduleBreakdown?: {
    name: string;
    durationMs: number;
    pct: number;
  }[];

  /* Top Arquivos Mais Pesados do Frame (Geral e Separados por Camada) */
  topFilesBreakdown?: FilePerformanceMetric[];
  topDomainFilesBreakdown?: FilePerformanceMetric[];
  topAdapterFilesBreakdown?: FilePerformanceMetric[];

  /* Draw & Rendering Metrics */
  drawCalls: number;
  culledEntities: number;
  textureCacheCount: number;

  /* Spatial & World */
  mapId: string;
  playerCoords: { x: number; y: number };
  currentChunk: { x: number; y: number };
  activeChunksCount: number;
  cameraZoom: number;

  /* Entities & Physics */
  activeEntities: number;
  activeParticles: number;
  collisionChecks: number;
  resolvedCollisions: number;
  eventThroughput: number;

  /* Memory & GC Health (MB) */
  memoryUsedMb?: number | undefined;
  memoryTotalMb?: number | undefined;
  memoryPeakMb?: number | undefined;
  allocationRateMbSec?: number | undefined;
  gcCount: number;

  /* Diagnostics & Logs */
  longTasksCount: number;
  errorCount: number;
  recentLogs: string[];
}
