import type { IEventManager } from "../../../domain/eventDispacher/IGameEvents";
import { logger } from "../shared/Logger";

type GameEventMap = import("../../../domain/eventDispacher/IGameEvents").GameEventMap;

export interface RegisteredBinding {
  event: keyof GameEventMap;
  listener: (payload: any) => void;
}

/**
 * ==============================================================================
 * BUILDER FLUENTE PARA BINDINGS DE EVENTOS DOMÍNIO -> APRESENTAÇÃO
 * ==============================================================================
 * Centraliza o registro de listeners entre o motor de domínio e a camada de UI
 * ou cena, gerando automaticamente uma lista segura para o teardown (unbindAll).
 * Impede vazamentos de memória (memory leaks) e listeners zumbis.
 * ==============================================================================
 */
export class EventBindingBuilder {
  private bindings: RegisteredBinding[] = [];

  constructor(private eventManager: IEventManager) {}

  public static for(eventManager: IEventManager): EventBindingBuilder {
    return new EventBindingBuilder(eventManager);
  }

  /**
   * Conecta um evento do Domínio a um callback de apresentação.
   */
  public on<K extends keyof GameEventMap>(event: K, handler: (payload: GameEventMap[K]) => void): this {
    this.eventManager.on(event, handler);
    this.bindings.push({ event, listener: handler });
    return this;
  }

  /**
   * Desregistra todos os listeners gerenciados por este builder.
   */
  public unbindAll(): void {
    let count = 0;
    for (const { event, listener } of this.bindings) {
      if (typeof this.eventManager.off === 'function') {
        this.eventManager.off(event, listener);
        count++;
      }
    }
    this.bindings = [];
    logger.log('init', `[EventBindingBuilder] ${count} listeners desvinculados com sucesso.`);
  }

  /**
   * Retorna os bindings ativos atualmente.
   */
  public get activeBindings(): readonly RegisteredBinding[] {
    return this.bindings;
  }
}

export default EventBindingBuilder;
