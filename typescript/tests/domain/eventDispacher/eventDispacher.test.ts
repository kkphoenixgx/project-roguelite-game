import { describe, it, expect, vi } from 'vitest';
import { EventHandler } from '../../../domain/eventDispacher/eventDispacher';

describe('EventHandler', () => {
  it('deve registrar e disparar um evento corretamente', () => {
    const handler = new EventHandler();
    const mockCallback = vi.fn();
    
    handler.on('playerDied', mockCallback);
    handler.dispatch('playerDied', {});
    
    expect(mockCallback).toHaveBeenCalledOnce();
    expect(mockCallback).toHaveBeenCalledWith({});
  });

  it('deve registrar telemetria e incrementar contador ao disparar eventos', () => {
    const handler = new EventHandler();
    const mockTelemetry = {
      incrementEvent: vi.fn(),
      recordMetric: vi.fn(),
      getMetrics: vi.fn(),
    };
    handler.setTelemetry(mockTelemetry as any);
    handler.dispatch('playerDied', {});
    expect(mockTelemetry.incrementEvent).toHaveBeenCalledOnce();
  });

  it('deve disparar um evento log automaticamente para eventos gerais', () => {
    const handler = new EventHandler();
    const mockLogCallback = vi.fn();
    
    handler.on('log', mockLogCallback);
    handler.dispatch('spawn', { type: 'test', coordinates: { x: 0, y: 0 } } as any);
    
    expect(mockLogCallback).toHaveBeenCalledOnce();
    expect(mockLogCallback).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'events',
      message: '[EventDispatcher] Disparado: spawn'
    }));
  });

  it('não deve disparar um evento log para eventos frequentes (ex: playerMoved)', () => {
    const handler = new EventHandler();
    const mockLogCallback = vi.fn();
    
    handler.on('log', mockLogCallback);
    handler.dispatch('playerMoved', { x: 10, y: 10 });
    
    expect(mockLogCallback).not.toHaveBeenCalled();
  });
  
  it('não deve causar loop infinito ao disparar o evento de log diretamente', () => {
    const handler = new EventHandler();
    const mockLogCallback = vi.fn();
    handler.on('log', mockLogCallback);
    handler.dispatch('log', { channel: 'test', message: 'test message', params: [] });
    expect(mockLogCallback).toHaveBeenCalledOnce();
  });

  it('Métrica 14: deve monitorar a Profundidade de Cascata (Cascade Depth) e estourar erro protegendo o Loop contra Spaghetti de Eventos', () => {
    const handler = new EventHandler();
    
    // Simulando uma cadeia de dependência invisível mal estruturada: A -> B -> C -> D -> A
    handler.on('A' as any, () => handler.dispatch('B' as any, {}));
    handler.on('B' as any, () => handler.dispatch('C' as any, {}));
    handler.on('C' as any, () => handler.dispatch('D' as any, {}));
    handler.on('D' as any, () => handler.dispatch('A' as any, {})); // Fio terra do Loop Infinito

    // O Dispatcher rigoroso deve rastrear a call stack efêmera e ejetar a execução
    // se a profundidade da mesma árvore de dispatch for maior que a tolerância arquitetural.
    expect(() => {
      handler.dispatch('A' as any, {});
    }).toThrow(/Cascade Depth|Maximum call stack/i);
    // Nota de Implementação: O seu `EventHandler` precisa agora ter um `private depth = 0;` 
    // que incrementa a cada .dispatch e decrementa ao final, lançando um erro se depth > 5.
  });

  describe('Padrão Observer Notify (Sem Loop de Espera / Execução Síncrona Direta)', () => {
    it('deve executar todos os listeners registrados na ordem exata de registro (FIFO) de forma síncrona e imediata', () => {
      const handler = new EventHandler();
      const executionOrder: number[] = [];
      let isExecutionSynchronous = false;

      handler.on('playerDied', () => {
        executionOrder.push(1);
      });
      handler.on('playerDied', () => {
        executionOrder.push(2);
      });
      handler.on('playerDied', () => {
        executionOrder.push(3);
      });

      // Disparo imediato do padrão Observer (Notify)
      handler.dispatch('playerDied', {});
      isExecutionSynchronous = true;

      // Se houvesse qualquer loop de espera, setTimeout ou fila assíncrona,
      // executionOrder estaria vazio ou incompleto neste exato instante síncrono.
      expect(executionOrder).toEqual([1, 2, 3]);
      expect(isExecutionSynchronous).toBe(true);
    });

    it('não deve adiar ou enfileirar em microtasks / promises garantindo Zero-Wait Loop', () => {
      const handler = new EventHandler();
      let flag = false;

      handler.on('levelUp', () => {
        flag = true;
      });

      handler.dispatch('levelUp', { newLevel: 2, coordinates: { x: 100, y: 200 } });

      // Verificação estrita: o listener já rodou antes de qualquer microtask ou tick seguinte
      expect(flag).toBe(true);
    });
  });

  describe('Ciclo de Desinscrição (off)', () => {
    it('deve remover um listener registrado impedindo que seja notificado em despachos subsequentes', () => {
      const handler = new EventHandler();
      const listener = vi.fn();

      handler.on('playerDied', listener);
      handler.dispatch('playerDied', {});
      expect(listener).toHaveBeenCalledTimes(1);

      // Desinscreve o listener
      handler.off('playerDied', listener);
      handler.dispatch('playerDied', {});

      // Não deve ter sido chamado novamente
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('deve remover apenas o listener especificado, mantendo os demais ouvintes ativos', () => {
      const handler = new EventHandler();
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      handler.on('playerDied', listenerA);
      handler.on('playerDied', listenerB);

      handler.off('playerDied', listenerA);
      handler.dispatch('playerDied', {});

      expect(listenerA).not.toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalledOnce();
    });

    it('não deve lançar exceção ao chamar off para evento ou listener não cadastrado', () => {
      const handler = new EventHandler();
      const orphanListener = vi.fn();

      expect(() => {
        handler.off('playerDied', orphanListener);
        handler.off('spawn' as any, orphanListener);
      }).not.toThrow();
    });
  });
});
