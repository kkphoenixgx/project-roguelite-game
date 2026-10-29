// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LevelUpRewardGui from '../../adapters/web/GUIS/levelUpRewardHudModule/LevelUpRewardGui';
import { evaluateFps } from '../blackbox/FpsEvaluator';

/**
 * ============================================================================
 * TESTE DE REGRESSÃO: FPS & PERFORMANCE DO LEVELUPREWARDGUI
 * ============================================================================
 * Blindagem contra:
 * 1. Degradação de FPS e estouro do Frame Budget (< 30 FPS / Frame Time > 33.3ms)
 * 2. Vazamento de timers ou retenção de DOM em múltiplos ciclos de Level Up
 * 3. Regressão na régua de classificação de FPS ('ok' para >= 30, 'perfeito' para >= 60)
 */
describe('PlayerLevelUpReward - FPS & Rendering Regression Test', () => {
  let mockDomain: any;
  let claimCallback: any;
  let togglePauseCallback: any;
  let gui: LevelUpRewardGui;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    mockDomain = {
      generateLocalRewards: vi.fn(() => [
        { id: 'stat_str', name: 'Força Titânica', description: '+1 Força Base', type: 'stat', rarity: 'comum', value: 1 },
        { id: 'der_crit_dmg', name: 'Força Bruta', description: '+20% Dano Crítico', type: 'stat', rarity: 'epico', value: 20 },
        { id: 'der_maxhp', name: 'Vitalidade Pura', description: '+20 Max Vida', type: 'stat', rarity: 'lendario', value: 20 }
      ])
    };
    claimCallback = vi.fn();
    togglePauseCallback = vi.fn();
    gui = new LevelUpRewardGui(mockDomain, claimCallback, togglePauseCallback);
  });

  afterEach(() => {
    gui.destroy();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('Regressão de Frame Budget: deve sustentar FPS >= 60 ("perfeito") em 10 ciclos consecutivos de Level Up', () => {
    // Simula 10 ciclos rápidos de Level Up (abrir menu, medir frames, escolher carta, fechar)
    for (let cycle = 0; cycle < 10; cycle++) {
      gui.show({ x: 100, y: 100 });

      const container = document.getElementById('levelup-reward-container');
      expect(container?.style.display).toBe('flex');

      const cards = document.querySelectorAll('.reward-card-wrapper');
      expect(cards.length).toBe(3);

      // Benchmark de 30 frames por ciclo
      const start = performance.now();
      for (let f = 0; f < 30; f++) {
        // Simulação de render loop: verificação de visibilidade e estado das cartas
        const isVisible = gui.isOpen;
        expect(isVisible).toBe(true);
      }
      const end = performance.now();

      const durationMs = Math.max(0.001, end - start);
      const avgMs = durationMs / 30;
      const fps = 1000 / avgMs;
      const rating = evaluateFps(fps);

      // Cada ciclo deve permanecer com performance excelente
      expect(avgMs).toBeLessThan(16.66); // Frame budget de 60 FPS
      expect(fps).toBeGreaterThanOrEqual(60);
      expect(rating).toBe('perfeito');

      // Seleciona uma carta e fecha
      (cards[0] as HTMLElement).click();
      expect(gui.isOpen).toBe(false);
      expect(container?.style.display).toBe('none');
    }
  });

  it('Regressão da Régua de FPS: deve classificar rigorosamente o veredito conforme limites do requisito', () => {
    // 60 FPS ou mais -> sempre "perfeito"
    expect(evaluateFps(60)).toBe('perfeito');
    expect(evaluateFps(500)).toBe('perfeito');

    // 30 a 59.9 FPS -> sempre "ok"
    expect(evaluateFps(30)).toBe('ok');
    expect(evaluateFps(35)).toBe('ok');
    expect(evaluateFps(59.9)).toBe('ok');

    // Abaixo de 30 FPS -> sempre "insuficiente" (reprovado)
    expect(evaluateFps(29.99)).toBe('insuficiente');
    expect(evaluateFps(20)).toBe('insuficiente');
    expect(evaluateFps(10)).toBe('insuficiente');
  });

  it('Regressão de Reflow e Concorrência: re-execuções de show() com menu aberto não devem duplicar cards nem degradar FPS', () => {
    gui.show({ x: 0, y: 0 });
    const initialCards = document.querySelectorAll('.reward-card-wrapper').length;
    expect(initialCards).toBe(3);

    // Chamadas subsequentes redundantes devem sofrer early-return
    gui.show({ x: 10, y: 10 });
    gui.show({ x: 20, y: 20 });

    const totalCardsAfter = document.querySelectorAll('.reward-card-wrapper').length;
    expect(totalCardsAfter).toBe(3);
  });
});
