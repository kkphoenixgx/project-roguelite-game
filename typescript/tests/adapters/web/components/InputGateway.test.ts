// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InputGateway from '../../../../adapters/web/components/keyboardModule/InputGateway';

describe('InputGateway', () => {
  let mockDomain: any;
  let onSpellMock: any;
  let onCastSpellMock: any;
  let onInteractMock: any;
  let inputGateway: InputGateway;

  beforeEach(() => {
    mockDomain = {
      handlePlayerInteractions: vi.fn()
    };
    onSpellMock = vi.fn();
    onCastSpellMock = vi.fn();
    onInteractMock = vi.fn();

    inputGateway = new InputGateway(
      mockDomain,
      onSpellMock,
      onCastSpellMock,
      onInteractMock
    );
  });

  it('deve mapear interact para actions e acionar onInteractCallback', () => {
    // Simula a ação interact sendo consumida do InputManager
    vi.spyOn(inputGateway.inputManager, 'consumeAction').mockImplementation((action: string) => {
      return action === 'interact';
    });

    const screenToWorldFn = vi.fn((x: number, y: number) => ({ x: x + 10, y: y + 20 }));

    inputGateway.handleInteractions(screenToWorldFn);

    expect(onInteractMock).toHaveBeenCalledOnce();
    expect(mockDomain.handlePlayerInteractions).toHaveBeenCalledWith(
      { actions: ['interact'] },
      expect.any(Object)
    );
  });

  it('não deve despachar nada se nenhuma ação estiver ativa', () => {
    vi.spyOn(inputGateway.inputManager, 'consumeAction').mockReturnValue(false);
    vi.spyOn(inputGateway.inputManager, 'isActionActive').mockReturnValue(false);

    inputGateway.handleInteractions((x, y) => ({ x, y }));

    expect(mockDomain.handlePlayerInteractions).not.toHaveBeenCalled();
    expect(onInteractMock).not.toHaveBeenCalled();
  });
});
