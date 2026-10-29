import type { ITelemetryPort } from "../../domain/ports/ITelemetryPort";
import type { TelemetrySnapshot } from "./TelemetrySnapshot";

export interface TelemetrySpatialInfo {
  mapId?: string;
  playerCoords?: { x: number; y: number };
  currentChunk?: { x: number; y: number };
  activeChunksCount?: number;
  cameraZoom?: number;
  rendererType?: string;
  activeParticles?: number;
  drawCalls?: number;
  culledEntities?: number;
  textureCacheCount?: number;
}

export interface ITelemetryAdapter extends ITelemetryPort {
  beginFrame(): void;
  endFrame(): void;
  recordSubsystemTime(subsystem: 'domain' | 'render' | 'sync' | 'ui' | string, durationMs: number): void;
  recordFileTiming(file: string, module: string, durationMs: number, instances?: number): void;
  setSpatialInfo(info: TelemetrySpatialInfo): void;
  incrementError(): void;
  incrementLongTask?(): void;
  incrementGc?(): void;
  getSnapshot(): TelemetrySnapshot;
  getTelemetryUI(): HTMLDivElement;
  getDomainFloatingWindow?(): HTMLDivElement;
  updateUI(): void;
  dispose?(): void;
}
