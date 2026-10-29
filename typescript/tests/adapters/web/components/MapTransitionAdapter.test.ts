// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameMap from '../../../../adapters/web/components/renderModule/scene/Map';
import { GameEventBinder } from '../../../../adapters/web/components/GameEventBinder';
import SceneManager from '../../../../adapters/web/components/renderModule/scene/SceneManager';
import Camera from '../../../../adapters/web/components/renderModule/scene/Camera';
import FloatingChatGui from '../../../../adapters/web/GUIS/floatingChatHudModule/FloatingChatGui';
import UIManager from '../../../../adapters/web/components/UiManager/UIManager';

describe('Web Adapter - Map Transition & Intermaps', () => {
  describe('GameMap', () => {
    it('deve carregar um intermap a partir do catálogo intermapsMap.json com flag isIntermap e fundo sólido', () => {
      const map = new GameMap('interior_black_default');
      expect(map.isIntermap).toBe(true);
      expect(map.width).toBe(2048);
      expect(map.height).toBe(1024);
      expect(map.backgroundColor).toBe('#000000');
    });

    it('deve desenhar um fundo sólido cobrindo toda a área do mapa quando for intermap', () => {
      const map = new GameMap('interior_black_default');
      const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn()
      } as unknown as CanvasRenderingContext2D;

      map.draw(mockCtx, 512, 700);

      expect(mockCtx.fillStyle).toBe('#000000');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 2048, 1024);
    });

    it('deve carregar um mapa regular como Vilgem a partir do VisualConfigMap com isIntermap falso', () => {
      const map = new GameMap('vilgem');
      expect(map.isIntermap).toBe(false);
      expect(map.width).toBeGreaterThan(0);
      expect(map.height).toBeGreaterThan(0);
    });

    it('deve lançar erro se o mapId não existir nem no intermapsMap nem no VisualConfigMap', () => {
      expect(() => new GameMap('mapa_inexistente_xyz')).toThrow('Configuração visual não encontrada para o mapa: mapa_inexistente_xyz');
    });
  });

  describe('GameEventBinder', () => {
    it('deve registrar o listener para mapTransitionRequested e invocar onMapTransitionCallback', async () => {
      const eventHandlers = new Map<string, Function>();
      const mockEventManager = {
        on: vi.fn((event: string, handler: Function) => {
          eventHandlers.set(event, handler);
        }),
        off: vi.fn()
      };

      const mockUiManager = {} as any;
      const mockSceneManager = {} as any;
      const onMapTransitionCallback = vi.fn().mockResolvedValue(undefined);

      const binder = new GameEventBinder(
        mockEventManager as any,
        mockUiManager,
        mockSceneManager,
        () => true,
        () => {},
        onMapTransitionCallback
      );

      binder.bindEvents();

      expect(mockEventManager.on).toHaveBeenCalledWith('mapTransitionRequested', expect.any(Function));

      const handler = eventHandlers.get('mapTransitionRequested');
      expect(handler).toBeDefined();

      await handler!({ targetMapId: 'interior_black_default', targetCoordinates: { x: 512, y: 700 } });

      expect(onMapTransitionCallback).toHaveBeenCalledWith('interior_black_default', { x: 512, y: 700 });
    });

    it('deve registrar listeners para portalPromptShow e portalPromptHide e despachar para o uiManager', () => {
      const eventHandlers = new Map<string, Function>();
      const mockEventManager = {
        on: vi.fn((event: string, handler: Function) => {
          eventHandlers.set(event, handler);
        }),
        off: vi.fn()
      };

      const mockUiManager = {
        showPortalPrompt: vi.fn(),
        hidePortalPrompt: vi.fn()
      } as any;
      const mockSceneManager = {} as any;

      const binder = new GameEventBinder(
        mockEventManager as any,
        mockUiManager,
        mockSceneManager,
        () => true,
        () => {}
      );

      binder.bindEvents();

      expect(mockEventManager.on).toHaveBeenCalledWith('portalPromptShow', expect.any(Function));
      expect(mockEventManager.on).toHaveBeenCalledWith('portalPromptHide', expect.any(Function));

      const showHandler = eventHandlers.get('portalPromptShow');
      const hideHandler = eventHandlers.get('portalPromptHide');

      const payload = {
        portalId: 101,
        targetMapId: 'interior_black_default',
        text: 'Entrar',
        actionKey: 'E',
        coordinates: { x: 300, y: 400 }
      };

      showHandler!(payload);
      expect(mockUiManager.showPortalPrompt).toHaveBeenCalledWith(payload);

      hideHandler!({ portalId: 101 });
      expect(mockUiManager.hidePortalPrompt).toHaveBeenCalledWith(101);

      binder.unbindAll();
      expect(mockEventManager.off).toHaveBeenCalledWith('portalPromptShow', expect.any(Function));
      expect(mockEventManager.off).toHaveBeenCalledWith('portalPromptHide', expect.any(Function));
    });
  });

  describe('SceneManager - Limpeza de Visuais Transitórios', () => {
    it('deve limpar transientVisuals e resetar o particleOrchestrator ao chamar clearTransientVisuals', () => {
      const mockRenderer = {
        canvas: { element: { width: 800, height: 600 } }
      } as any;

      const sceneManager = new SceneManager(mockRenderer, true);
      
      // Simula um efeito visual transitório
      sceneManager.transientVisuals.set(-1, {
        state: { id: -1, entityTypeId: 'hit', coordinates: { x: 10, y: 10 }, size: { width: 32, height: 32 }, rotation: 0, state: 'active' },
        timeRemaining: 1.0
      });
      sceneManager.debugRenderables.set(-1, {} as any);

      expect(sceneManager.transientVisuals.size).toBe(1);
      expect(sceneManager.debugRenderables.has(-1)).toBe(true);

      sceneManager.clearTransientVisuals();

      expect(sceneManager.transientVisuals.size).toBe(0);
      expect(sceneManager.debugRenderables.has(-1)).toBe(false);
    });
  });

  describe('Camera - Limites e Clamping em Intermaps', () => {
    it('deve restringir os limites da câmera de acordo com as dimensões de 1024x1024 do intermap', () => {
      const mockCanvas = {
        element: { width: 600, height: 600 }
      } as any;
      const camera = new Camera(mockCanvas, 2); // viewWidth = 300, viewHeight = 300
      
      // Alvo no canto inferior direito do intermap (ex: 1000, 1000)
      const mockTarget = {
        id: 1,
        coordinates: { x: 950, y: 950 },
        size: { width: 32, height: 32 },
        rotation: 0,
        draw: vi.fn(),
        updateState: vi.fn()
      };
      camera.setTarget(mockTarget);

      const mockCtx = {
        scale: vi.fn(),
        translate: vi.fn()
      } as unknown as CanvasRenderingContext2D;

      const worldState = { width: 1024, height: 1024, mapId: 'interior_black_default' };

      camera.applyTransform(mockCtx, worldState);

      // viewWidth = 600 / 2 = 300
      // maxCamX = 1024 - 300 = 724
      // camX calculado seria (950 + 16) - 150 = 816 -> deve ser clamped para 724!
      expect(mockCtx.translate).toHaveBeenCalledWith(-724, -724);
    });
  });

  describe('FloatingChatGui - Portal Prompts', () => {
    let chatGui: FloatingChatGui;

    beforeEach(() => {
      document.body.innerHTML = '';
      chatGui = new FloatingChatGui();
    });

    it('deve exibir o balão overhead formatado como [E] Entrar ancorado em coordenadas estáticas', () => {
      chatGui.showPortalPrompt(99, 'Entrar', 'E', { x: 500, y: 400 });

      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      expect(bubble).not.toBeNull();
      expect(bubble.textContent).toBe('[E] Entrar');
      expect(bubble.classList.contains('active')).toBe(true);

      // Simula projeção da câmera via worldToScreen
      const mockWorldToScreen = (wx: number, wy: number) => ({ x: wx * 2, y: wy * 2 });
      chatGui.update([], mockWorldToScreen);

      expect(bubble.style.left).toBe('1000px');
      expect(bubble.style.top).toBe('800px');
      expect(bubble.style.display).toBe('block');
    });

    it('deve disparar onInteract ao clicar no balão de prompt', () => {
      const onInteractSpy = vi.fn();
      chatGui.showPortalPrompt(99, 'Entrar', 'E', { x: 500, y: 400 }, onInteractSpy);

      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      expect(bubble).not.toBeNull();

      bubble.click();
      expect(onInteractSpy).toHaveBeenCalledOnce();
    });

    it('deve remover classe active ao chamar hidePortalPrompt', () => {
      chatGui.showPortalPrompt(99, 'Entrar', 'E', { x: 500, y: 400 });
      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      expect(bubble.classList.contains('active')).toBe(true);

      chatGui.hidePortalPrompt(99);
      expect(bubble.classList.contains('active')).toBe(false);
    });

    it('deve limpar todos os balões e remover elementos do DOM no clear()', () => {
      chatGui.showPortalPrompt(1, 'Entrar', 'E', { x: 100, y: 100 });
      chatGui.showPortalPrompt(2, 'Sair', 'E', { x: 200, y: 200 });

      const bubblesBefore = document.querySelectorAll('.floating-bubble');
      expect(bubblesBefore.length).toBe(2);

      chatGui.clear();

      const bubblesAfter = document.querySelectorAll('.floating-bubble');
      expect(bubblesAfter.length).toBe(0);
    });

    it('deve cancelar hideTimeoutId ao reabrir o prompt ou ao chamar clear() sem deixar timers zumbis', () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      chatGui.showPortalPrompt(99, 'Entrar', 'E', { x: 500, y: 400 });
      chatGui.hidePortalPrompt(99);

      // Reabre em 100ms
      vi.advanceTimersByTime(100);
      chatGui.showPortalPrompt(99, 'Entrar Novamente', 'E', { x: 500, y: 400 });

      // Deve ter cancelado o hideTimeout anterior
      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Clear durante hide
      chatGui.hidePortalPrompt(99);
      chatGui.clear();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('UIManager - Delegação de Portais e Limpeza', () => {
    it('deve delegar showPortalPrompt, hidePortalPrompt e clearFloatingBubbles para o DialogueAdapter', () => {
      const mockDialogueAdapter = {
        showPortalPrompt: vi.fn(),
        hidePortalPrompt: vi.fn(),
        floatingChatGui: {
          clear: vi.fn()
        },
        isAnyMenuOpen: vi.fn().mockReturnValue(false),
        clear: vi.fn()
      } as any;

      const mockDomain = {} as any;

      const uiManager = new UIManager(
        mockDomain,
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        mockDialogueAdapter
      );

      const payload = {
        portalId: 77,
        targetMapId: 'interior_black_default',
        text: 'Entrar',
        actionKey: 'E',
        coordinates: { x: 512, y: 700 }
      };

      uiManager.showPortalPrompt(payload);
      expect(mockDialogueAdapter.showPortalPrompt).toHaveBeenCalledWith(payload);

      uiManager.hidePortalPrompt(77);
      expect(mockDialogueAdapter.hidePortalPrompt).toHaveBeenCalledWith(77);

      uiManager.clearFloatingBubbles();
      expect(mockDialogueAdapter.floatingChatGui.clear).toHaveBeenCalledOnce();
    });
  });
});
