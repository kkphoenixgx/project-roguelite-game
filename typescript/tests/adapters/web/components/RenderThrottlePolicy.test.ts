// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RenderThrottlePolicy } from '../../../../adapters/web/components/renderModule/engine/RenderThrottlePolicy';

describe('RenderThrottlePolicy - Politica de Renderizacao e Throttling em Menus', () => {
  let policy: RenderThrottlePolicy;

  beforeEach(() => {
    policy = new RenderThrottlePolicy(5, true); // Modo de teste com idle freeze habilitado
  });

  it('deve permitir desenho constante (taxa total) durante gameplay normal sem menus', () => {
    // Menus fechados, jogo rodando
    expect(policy.shouldRenderWorldFrame(false, false, false)).toBe(true);
    policy.notifyFrameDrawn();
    expect(policy.shouldRenderWorldFrame(false, false, false)).toBe(true);
  });

  it('no modo padrão de alta performance (enableIdleFreeze: false): deve manter renderização contínua a 60 FPS mesmo em menus', () => {
    const perfPolicy = new RenderThrottlePolicy(60, false);
    expect(perfPolicy.shouldRenderWorldFrame(true, true, false)).toBe(true);
    perfPolicy.notifyFrameDrawn();
    expect(perfPolicy.shouldRenderWorldFrame(true, true, false)).toBe(true);
  });

  it('em singleplayer pausado com menu aberto e freeze habilitado: deve desenhar apenas 1 frame de fundo e congelar o mundo', () => {
    // Jogador abre o menu de personagem / pause menu
    policy.notifyMenuStateChanged(true);

    // Primeiro frame após abrir menu: deve desenhar o frame de congelamento do mapa
    expect(policy.shouldRenderWorldFrame(true, true, false)).toBe(true);
    policy.notifyFrameDrawn();

    // Quadros subsequentes com menu aberto: deve retornar false (Zero-Draw no mapa)
    expect(policy.shouldRenderWorldFrame(true, true, false)).toBe(false);
    expect(policy.shouldRenderWorldFrame(true, true, false)).toBe(false);

    // Se o menu for fechado, marca o mundo como sujo e volta a desenhar imediatamente
    policy.notifyMenuStateChanged(false);
    expect(policy.shouldRenderWorldFrame(false, false, false)).toBe(true);
  });

  it('se o mundo for marcado como dirty externamente (ex: transicao), deve permitir novo desenho mesmo em menu', () => {
    policy.notifyMenuStateChanged(true);
    policy.notifyFrameDrawn();
    expect(policy.shouldRenderWorldFrame(true, true, false)).toBe(false);

    policy.markWorldDirty();
    expect(policy.shouldRenderWorldFrame(true, true, false)).toBe(true);
    policy.notifyFrameDrawn();
    expect(policy.shouldRenderWorldFrame(true, true, false)).toBe(false);
  });

  it('em modo multiplayer (onde o jogo nao pausa): deve limitar o processamento do mundo a taxa minima de 5 FPS durante menus', () => {
    const isMenuOpen = true;
    const isGamePaused = false;
    const isMultiplayer = true;

    // Primeiro frame desenha
    expect(policy.shouldRenderWorldFrame(isMenuOpen, isGamePaused, isMultiplayer)).toBe(true);
    policy.notifyFrameDrawn();

    // Imediatamente a seguir (sem tempo transcorrido): deve segurar/bloquear o desenho do mundo
    expect(policy.shouldRenderWorldFrame(isMenuOpen, isGamePaused, isMultiplayer)).toBe(false);
  });
});
