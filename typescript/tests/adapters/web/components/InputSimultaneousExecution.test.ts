// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import InputGateway from '../../../../adapters/web/components/keyboardModule/InputGateway';

describe('InputGateway - Execucao de Broches e Habilidades em Movimento', () => {
  let mockDomain: any;
  let inputGateway: InputGateway;

  beforeEach(() => {
    mockDomain = {
      handlePlayerInteractions: vi.fn()
    };
    inputGateway = new InputGateway(mockDomain);
  });

  it('deve despachar comandos de movimento e atalhos de habilidades simultaneamente sem exigir que o jogador pare', () => {
    // Simula teclas de movimento pressionadas (ex: W + D)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));

    // Simula tecla de habilidade de classe / broche pressionada no mesmo frame (ex: slot 1 ou slot 5)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

    const screenToWorldFn = (x: number, y: number) => ({ x, y });
    inputGateway.handleInteractions(screenToWorldFn);

    expect(mockDomain.handlePlayerInteractions).toHaveBeenCalledTimes(1);

    const callArgs = mockDomain.handlePlayerInteractions.mock.calls[0][0];
    const actions: string[] = callArgs.actions;

    // Movimento ativo
    expect(actions).toContain('up');
    expect(actions).toContain('right');

    // Habilidade e broche ativados no mesmo despacho
    expect(actions).toContain('slot_1');
    expect(actions).toContain('slot_5');
  });

  it('deve suportar teclas em maiúsculo (Caps Lock ou Shift) sem ignorar ativação de habilidades', () => {
    // Shift pressionado + tecla de slot
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

    inputGateway.handleInteractions((x, y) => ({ x, y }));

    const callArgs = mockDomain.handlePlayerInteractions.mock.calls[0][0];
    expect(callArgs.actions).toContain('shift');
    expect(callArgs.actions).toContain('slot_2');
  });
});
