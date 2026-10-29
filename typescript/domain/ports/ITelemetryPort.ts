/** @file Define a porta de telemetria para que o Domínio possa reportar métricas sem conhecer a implementação do Adapter. */

/** Interface que o Domínio usa para reportar métricas de performance. A implementação real vive na camada de Adapters (TelemetryAdapter). */
export interface ITelemetryPort {
  /** Incrementa o contador de checks de colisão broadphase por frame. */
  incrementCollisionCheck(): void;
  /** Incrementa o contador de colisões resolvidas (narrowphase confirmadas). */
  incrementResolvedCollision(): void;
  /** Incrementa o contador de eventos disparados no frame. */
  incrementEvent(): void;
  /** Define a contagem de entidades ativas no mundo. */
  setActiveEntities(count: number): void;
  /** Captura um log de texto no buffer circular da telemetria. */
  captureLog(message: string): void;
  /** Registra o tempo de execução (ms) consumido por um arquivo/componente específico do módulo, com contagem opcional de instâncias ativas. */
  recordFileTiming?(file: string, module: string, durationMs: number, instances?: number): void;
}

/** Implementação nula (No-Op) da porta de telemetria. Usada quando a telemetria não está habilitada, garante Zero overhead na produção. */
export const NullTelemetryPort: ITelemetryPort = {
  incrementCollisionCheck() {},
  incrementResolvedCollision() {},
  incrementEvent() {},
  setActiveEntities() {},
  captureLog() {},
  recordFileTiming() {},
};
