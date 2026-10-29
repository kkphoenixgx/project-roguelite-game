import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameEventBinder } from '../../../../adapters/web/components/GameEventBinder';
import { EventHandler } from '../../../../domain/eventDispacher/eventDispacher';

describe('GameEventBinder (Ciclo de Vida de Eventos e Portas do Frontend)', () => {
  let eventHandler: EventHandler;
  let mockUiManager: any;
  let mockSceneManager: any;
  let mockOnPlayerDied: any;
  let mockOnMapTransition: any;
  let isGameStarted: boolean;
  let binder: GameEventBinder;

  beforeEach(() => {
    eventHandler = new EventHandler();

    mockUiManager = {
      showPortalPrompt: vi.fn(),
      hidePortalPrompt: vi.fn(),
      showLevelUpReward: vi.fn(),
      showToast: vi.fn(),
      spellBufferHudGui: {
        triggerShatter: vi.fn()
      }
    };

    mockSceneManager = {
      addVisualEffect: vi.fn(),
      particleOrchestrator: {
        executeEffect: vi.fn()
      }
    };

    mockOnPlayerDied = vi.fn();
    mockOnMapTransition = vi.fn().mockResolvedValue(undefined);
    isGameStarted = true;

    binder = new GameEventBinder(
      eventHandler,
      mockUiManager,
      mockSceneManager,
      () => isGameStarted,
      mockOnPlayerDied,
      mockOnMapTransition
    );
  });

  describe('Conexão de Eventos (bindEvents)', () => {
    beforeEach(() => {
      binder.bindEvents();
    });

    it('deve despachar playerDied para o callback de morte do jogador', () => {
      eventHandler.dispatch('playerDied', {});
      expect(mockOnPlayerDied).toHaveBeenCalledOnce();
    });

    it('deve despachar mapTransitionRequested para o callback de transição de mapa', async () => {
      const payload = { targetMapId: 'vilgem_forest', targetCoordinates: { x: 500, y: 300 } };
      eventHandler.dispatch('mapTransitionRequested', payload);

      expect(mockOnMapTransition).toHaveBeenCalledOnce();
      expect(mockOnMapTransition).toHaveBeenCalledWith('vilgem_forest', { x: 500, y: 300 });
    });

    it('deve rotear portalPromptShow e portalPromptHide para o UIManager', () => {
      const showPayload = {
        portalId: 101,
        targetMapId: 'dungeon_01',
        text: 'Entrar na Caverna',
        actionKey: 'E',
        coordinates: { x: 120, y: 80 }
      };

      eventHandler.dispatch('portalPromptShow', showPayload);
      expect(mockUiManager.showPortalPrompt).toHaveBeenCalledWith(showPayload);

      eventHandler.dispatch('portalPromptHide', { portalId: 101 });
      expect(mockUiManager.hidePortalPrompt).toHaveBeenCalledWith(101);
    });

    it('deve armazenar coordenadas do levelUp e passar para showLevelUpRewards', () => {
      eventHandler.dispatch('levelUp', { newLevel: 3, coordinates: { x: 250, y: 400 } });

      const rewardChoices = [{ id: 'slash_mastery', description: '+20% dano', type: 'skill' as const }];
      eventHandler.dispatch('showLevelUpRewards', { choices: rewardChoices });

      expect(mockUiManager.showLevelUpReward).toHaveBeenCalledWith(
        { x: 250, y: 400 },
        rewardChoices
      );
    });

    it('deve rotear spawnVisual e particle para o SceneManager', () => {
      const visualPayload = { type: 'magic_burst', coordinates: { x: 10, y: 10 }, duration: 500, size: { width: 32, height: 32 } };
      eventHandler.dispatch('spawnVisual', visualPayload);
      expect(mockSceneManager.addVisualEffect).toHaveBeenCalledWith(visualPayload);

      const particlePayload = { effect: 'bloodSplatter' as const, x: 50, y: 60 };
      eventHandler.dispatch('particle', particlePayload);
      expect(mockSceneManager.particleOrchestrator.executeEffect).toHaveBeenCalledWith(particlePayload);
    });

    it('deve acionar triggerShatter no hud ao receber log de input com overflow ou broken', () => {
      eventHandler.dispatch('log', {
        channel: 'input',
        message: 'Buffer overflow detected in key combination',
        params: []
      });

      expect(mockUiManager.spellBufferHudGui.triggerShatter).toHaveBeenCalledOnce();
    });

    it('não deve acionar triggerShatter para logs comuns ou de outros canais', () => {
      eventHandler.dispatch('log', {
        channel: 'general',
        message: 'overflow in data stream',
        params: []
      });

      expect(mockUiManager.spellBufferHudGui.triggerShatter).not.toHaveBeenCalled();
    });

    it('deve chamar showToast com variant error quando receber log com channel error', () => {
      const errorMsg = "A habilidade 'Fan the Hammer' requer a arma da classe 'Gunslinger' equipada na mão principal!";
      eventHandler.dispatch('log', {
        channel: 'error',
        message: errorMsg,
        params: []
      });

      expect(mockUiManager.showToast).toHaveBeenCalledWith(errorMsg, 'error');
    });

    it('não deve chamar showToast para canais que não sejam error', () => {
      eventHandler.dispatch('log', {
        channel: 'info',
        message: 'Info message',
        params: []
      });

      expect(mockUiManager.showToast).not.toHaveBeenCalled();
    });
  });

  describe('Desinscrição e Prevenção de Vazamento de Memória (unbindAll)', () => {
    it('deve desinscrever todos os listeners e não invocar callbacks após unbindAll', () => {
      binder.bindEvents();

      // Dispara uma vez para confirmar atividade
      eventHandler.dispatch('playerDied', {});
      expect(mockOnPlayerDied).toHaveBeenCalledTimes(1);

      // Desinscreve tudo
      binder.unbindAll();

      // Dispara novamente todos os eventos
      eventHandler.dispatch('playerDied', {});
      eventHandler.dispatch('portalPromptHide', { portalId: 99 });
      eventHandler.dispatch('spawnVisual', { type: 'slash', coordinates: { x: 0, y: 0 }, duration: 100, size: { width: 10, height: 10 } });

      // Nenhum callback deve ter sido invocado novamente
      expect(mockOnPlayerDied).toHaveBeenCalledTimes(1);
      expect(mockUiManager.hidePortalPrompt).not.toHaveBeenCalled();
      expect(mockSceneManager.addVisualEffect).not.toHaveBeenCalled();
    });

    it('deve permitir chamar unbindAll repetidamente sem causar erros', () => {
      binder.bindEvents();
      expect(() => {
        binder.unbindAll();
        binder.unbindAll();
      }).not.toThrow();
    });
  });
});
