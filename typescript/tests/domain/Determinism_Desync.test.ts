import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// @ts-ignore - Suprime erro de tipagem de lib nativa caso @types/node não esteja no workspace
import crypto from 'crypto';
import DomainFacade from '../../domain/DomainFacade';
import Dice from '../../domain/shared/Dice';
import type { ILogger } from '../../domain/ports/ILogger';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';
import type { ICollisionService } from '../../domain/ports/ICollisionService';

// Fakes (Isolamento de Portas Secundárias)
class FakeLogger implements ILogger {
  log() {}
}

class FakeEventManager implements IEventManager {
  private listeners = new Map<string, Function[]>();
  on(key: string, cb: Function) {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key)!.push(cb);
  }
  dispatch(key: string, payload: any) {
    this.listeners.get(key)?.forEach(cb => cb(payload));
  }
}

class FakeCollisionService implements ICollisionService {
  async checkCollisions() { return new Int32Array([]); }
}

describe('Métrica 12: Determinismo Numérico e Detecção de Desync', () => {
  beforeEach(() => {
    // Congela a entropia da engine (Sementes RNG fixas)
    vi.spyOn(Dice, 'rollDice').mockReturnValue(5);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve assegurar que duas simulações paralelas sob os mesmos estímulos gerem o mesmo Hash de Renderização (Zero-Desync)', async () => {
    const simulateRun = async (): Promise<string> => {
      const eventManager = new FakeEventManager();
      const domain = new DomainFacade(
        { player: { id: 1, level: 1, initialPos: { x: 100, y: 100 } } },
        new FakeLogger(),
        eventManager,
        new FakeCollisionService()
      );

      await domain.loadWorld('vilgem');

      // Simula 120 frames exatos (2 segundos simulados a 60 FPS)
      for (let frame = 0; frame < 120; frame++) {
        // Input determinístico injetado em frames estritos
        if (frame === 30) domain.handlePlayerInteractions({ actions: ['right'] as any[] }, { x: 0, y: 0 });
        if (frame === 60) domain.handlePlayerInteractions({ actions: ['leftClick'] as any[] }, { x: 200, y: 100 });
        
        domain.update(0.0166);
      }

      const renderState = domain.getRenderState();
      return crypto.createHash('sha256').update(JSON.stringify(renderState)).digest('hex');
    };

    const runAlphaHash = await simulateRun();
    const runBetaHash = await simulateRun();

    // Asserção: Falhas de Float flutuante, iteradores de Set() não-ordenados ou Race Conditions quebram essa igualdade.
    expect(runAlphaHash).toStrictEqual(runBetaHash);
    expect(runAlphaHash).toMatch(/^[a-f0-9]{64}$/); // Valida integridade do formato SHA-256
  });
});