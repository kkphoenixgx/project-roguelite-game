import type { EventKey, GameEventMap, IEventManager } from "./IGameEvents";

import type { ITelemetryPort } from "../ports/ITelemetryPort";
import { NullTelemetryPort } from "../ports/ITelemetryPort";

/** * Um dispatcher de eventos genérico e com tipagem forte.*/
export class EventHandler implements IEventManager {
  private listeners: { [K in EventKey]?: ((payload: GameEventMap[K]) => void)[] } = {};
  private telemetry: ITelemetryPort = NullTelemetryPort;

  public setTelemetry(telemetry: ITelemetryPort): void {
    this.telemetry = telemetry;
  }

  /**
   * Registra um ouvinte para um evento específico.
   * @param key O nome do evento.
   * @param listener A função a ser chamada quando o evento for disparado.
   */
  on<K extends EventKey>(key: K, listener: (payload: GameEventMap[K]) => void): void {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key]!.push(listener);
  }

  /**
   * Dispara um evento, notificando todos os ouvintes registrados.
   * @param key O nome do evento.
   * @param payload Os dados a serem enviados para os ouvintes.
   */
  dispatch<K extends EventKey>(key: K, payload: GameEventMap[K]): void {
    this.telemetry.incrementEvent();
    
            //? Registra eventos na channel 'events' filtrando eventos de alta frequência (60fps)
    if (key !== 'log' && key !== 'playerMoved' && key !== 'requestNeighbors') {
            //? Despacha diretamente aos listeners de log evitando recursão infinita
        const logPayload = { channel: 'events', message: `[EventDispatcher] Disparado: ${key}`, params: [payload] };
        this.listeners['log']?.forEach(listener => listener(logPayload as any));
    }

    this.listeners[key]?.forEach(listener => listener(payload));
  }

  /**
   * Remove um ouvinte previamente registrado para um evento.
   * @param key O nome do evento.
   * @param listener A função ouvinte a ser removida.
   */
  off<K extends EventKey>(key: K, listener: (payload: GameEventMap[K]) => void): void {
    if (!this.listeners[key]) return;
    this.listeners[key] = (this.listeners[key] as any[]).filter(l => l !== listener) as any;
  }
}
