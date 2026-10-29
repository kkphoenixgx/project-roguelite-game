// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FloatingChatGui from '../../../../adapters/web/GUIS/floatingChatHudModule/FloatingChatGui';
import DialogueAdapter from '../../../../adapters/web/components/DialogueAdapter';
import UIManager from '../../../../adapters/web/components/UiManager/UIManager';
import { GameEventBinder } from '../../../../adapters/web/components/GameEventBinder';
import GameMap from '../../../../adapters/web/components/renderModule/scene/Map';
import PortalLinkRequest from '../../../../domain/ObjectModule/Maps/PortalLinkRequest';

describe('QA Graybox Audit - Map Transitions, Intermaps & Portal Prompts', () => {

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('1. FloatingChatGui - Requisitos de Balões e Coordenadas Mundiais', () => {
    it('[QA-REQ-1.1] Deve formatar o texto estritamente como [actionKey] text e aplicar classe portal-prompt', () => {
      const chatGui = new FloatingChatGui();
      chatGui.showPortalPrompt(42, 'Abrir Portão', 'F', { x: 120, y: 340 });

      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      expect(bubble).not.toBeNull();
      expect(bubble.textContent).toBe('[F] Abrir Portão');
      expect(bubble.classList.contains('active')).toBe(true);
      expect(bubble.style.display).toBe('block');
    });

    it('[QA-REQ-1.2] Deve projetar coordenadas mundiais usando a função worldToScreen independente da lista renderables', () => {
      const chatGui = new FloatingChatGui();
      chatGui.showPortalPrompt(10, 'Entrar', 'E', { x: 500, y: 600 });

      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      const worldToScreenMock = vi.fn((wx: number, wy: number) => ({ x: wx * 1.5, y: wy * 1.5 }));

      // Lista de renderables vazia (simulando portal que não é entidade renderável viva)
      chatGui.update([], worldToScreenMock);

      expect(worldToScreenMock).toHaveBeenCalledWith(500, 600);
      expect(bubble.style.left).toBe('750px');
      expect(bubble.style.top).toBe('900px');
      expect(bubble.style.display).toBe('block');
    });

    it('[QA-REQ-1.3] Deve acionar o callback onInteract e parar a propagação do evento no clique', () => {
      const chatGui = new FloatingChatGui();
      const onInteractSpy = vi.fn();
      chatGui.showPortalPrompt(10, 'Entrar', 'E', { x: 100, y: 100 }, onInteractSpy);

      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const stopPropSpy = vi.spyOn(clickEvent, 'stopPropagation');

      bubble.dispatchEvent(clickEvent);

      expect(onInteractSpy).toHaveBeenCalledOnce();
      expect(stopPropSpy).toHaveBeenCalled();
    });

    it('[QA-REQ-1.4] Deve remover a classe active no hidePortalPrompt e destruir o elemento DOM após o fade de 300ms', () => {
      const chatGui = new FloatingChatGui();
      chatGui.showPortalPrompt(10, 'Entrar', 'E', { x: 100, y: 100 });

      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      expect(bubble.classList.contains('active')).toBe(true);

      chatGui.hidePortalPrompt(10);
      expect(bubble.classList.contains('active')).toBe(false);
      // Elemento ainda existe durante a transição CSS de 300ms
      expect(document.querySelector('.floating-bubble.portal-prompt')).not.toBeNull();

      vi.advanceTimersByTime(300);
      // Após 300ms, o elemento deve ter sido completamente expurgado do DOM
      expect(document.querySelector('.floating-bubble.portal-prompt')).toBeNull();
    });

    it('[QA-REQ-1.5] Deve reutilizar elemento e cancelar timeout anterior se o prompt for reaberto antes do fim do fade', () => {
      const chatGui = new FloatingChatGui();
      chatGui.showPortalPrompt(10, 'Entrar', 'E', { x: 100, y: 100 });

      chatGui.hidePortalPrompt(10);
      vi.advanceTimersByTime(150); // Metade do fade-out

      // Jogador re-entra na hitbox antes dos 300ms
      chatGui.showPortalPrompt(10, 'Entrar Novamente', 'E', { x: 100, y: 100 });

      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      expect(bubble.classList.contains('active')).toBe(true);
      expect(bubble.textContent).toBe('[E] Entrar Novamente');

      vi.advanceTimersByTime(200); // Passa o tempo do primeiro timeout
      // O elemento NÃO deve ter sido removido porque a classe 'active' foi restabelecida
      expect(document.querySelector('.floating-bubble.portal-prompt')).not.toBeNull();
    });

    it('[QA-REQ-1.6] Deve realizar teardown completo e Zero Leaks no clear()', () => {
      const chatGui = new FloatingChatGui();
      chatGui.showPortalPrompt(1, 'Portal 1', 'E', { x: 10, y: 10 });
      chatGui.showPortalPrompt(2, 'Portal 2', 'E', { x: 20, y: 20 });
      chatGui.showBubble(99, 'Fala NPC');

      expect(document.querySelectorAll('.floating-bubble').length).toBe(3);

      chatGui.clear();

      expect(document.querySelectorAll('.floating-bubble').length).toBe(0);
    });
  });

  describe('2. DialogueAdapter - Orquestração Semântica de Portais', () => {
    it('[QA-REQ-2.1] Deve despachar portalInteract com o portalId correto ao interagir com o prompt', () => {
      const eventManagerMock = {
        on: vi.fn(),
        dispatch: vi.fn(),
        off: vi.fn()
      };

      const dialogueAdapter = new DialogueAdapter(
        eventManagerMock as any,
        () => {},
        () => {},
        () => true
      );

      dialogueAdapter.showPortalPrompt({
        portalId: 88,
        targetMapId: 'interior_black_default',
        text: 'Descer Masmorra',
        actionKey: 'E',
        coordinates: { x: 600, y: 700 }
      });

      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      expect(bubble).not.toBeNull();

      bubble.click();

      expect(eventManagerMock.dispatch).toHaveBeenCalledWith('portalInteract', { portalId: 88 });
    });

    it('[QA-REQ-2.2] Deve delegar hidePortalPrompt e clear corretamente ao floatingChatGui', () => {
      const eventManagerMock = { on: vi.fn(), dispatch: vi.fn(), off: vi.fn() };
      const dialogueAdapter = new DialogueAdapter(eventManagerMock as any, () => {}, () => {}, () => true);

      const hideSpy = vi.spyOn(dialogueAdapter.floatingChatGui, 'hidePortalPrompt');
      const clearSpy = vi.spyOn(dialogueAdapter.floatingChatGui, 'clear');

      dialogueAdapter.hidePortalPrompt(88);
      expect(hideSpy).toHaveBeenCalledWith(88);

      dialogueAdapter.clear();
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('3. UIManager - Ponto de Integração de UI', () => {
    it('[QA-REQ-3.1] Deve delegar showPortalPrompt, hidePortalPrompt e clearFloatingBubbles para o DialogueAdapter', () => {
      const mockDialogueAdapter = {
        showPortalPrompt: vi.fn(),
        hidePortalPrompt: vi.fn(),
        floatingChatGui: { clear: vi.fn() },
        isAnyMenuOpen: vi.fn().mockReturnValue(false),
        clear: vi.fn(),
        update: vi.fn()
      } as any;

      const uiManager = new UIManager(
        {} as any,
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        mockDialogueAdapter
      );

      const promptPayload = {
        portalId: 55,
        targetMapId: 'vilgem',
        text: 'Viajar',
        actionKey: 'E',
        coordinates: { x: 300, y: 300 }
      };

      uiManager.showPortalPrompt(promptPayload);
      expect(mockDialogueAdapter.showPortalPrompt).toHaveBeenCalledWith(promptPayload);

      uiManager.hidePortalPrompt(55);
      expect(mockDialogueAdapter.hidePortalPrompt).toHaveBeenCalledWith(55);

      uiManager.clearFloatingBubbles();
      expect(mockDialogueAdapter.floatingChatGui.clear).toHaveBeenCalledOnce();

      uiManager.clearTransientDialogues();
      expect(mockDialogueAdapter.clear).toHaveBeenCalledOnce();
    });

    it('[QA-REQ-3.2] No ciclo update(), deve repassar a projeção worldToScreen para o dialogueAdapter', () => {
      const mockDialogueAdapter = {
        update: vi.fn(),
        isAnyMenuOpen: vi.fn().mockReturnValue(false)
      } as any;

      const uiManager = new UIManager(
        {} as any,
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        mockDialogueAdapter
      );

      const playerState = { id: 1, coordinates: { x: 10, y: 10 } } as any;
      const renderables = [playerState];
      const worldToScreenMock = (wx: number, wy: number) => ({ x: wx, y: wy });

      uiManager.update(playerState, renderables, { x: 0, y: 0 }, { x: 0, y: 0 }, worldToScreenMock);

      expect(mockDialogueAdapter.update).toHaveBeenCalledWith(renderables, worldToScreenMock);
    });
  });

  describe('4. GameEventBinder - Contratos de Eventos', () => {
    it('[QA-REQ-4.1] Deve conectar portalPromptShow e portalPromptHide com o UIManager e permitir unbindAll limpo', () => {
      const eventHandlers = new Map<string, Function>();
      const mockEventManager = {
        on: vi.fn((event: string, handler: Function) => eventHandlers.set(event, handler)),
        off: vi.fn()
      };
      const mockUiManager = {
        showPortalPrompt: vi.fn(),
        hidePortalPrompt: vi.fn()
      } as any;

      const binder = new GameEventBinder(
        mockEventManager as any,
        mockUiManager,
        {} as any,
        () => true,
        () => {}
      );

      binder.bindEvents();

      const showHandler = eventHandlers.get('portalPromptShow');
      const hideHandler = eventHandlers.get('portalPromptHide');

      expect(showHandler).toBeDefined();
      expect(hideHandler).toBeDefined();

      const payload = { portalId: 100, targetMapId: 'vilgem', text: 'Entrar', actionKey: 'E', coordinates: { x: 0, y: 0 } };
      showHandler!(payload);
      expect(mockUiManager.showPortalPrompt).toHaveBeenCalledWith(payload);

      hideHandler!({ portalId: 100 });
      expect(mockUiManager.hidePortalPrompt).toHaveBeenCalledWith(100);

      binder.unbindAll();
      expect(mockEventManager.off).toHaveBeenCalledWith('portalPromptShow', expect.any(Function));
      expect(mockEventManager.off).toHaveBeenCalledWith('portalPromptHide', expect.any(Function));
    });
  });

  describe('5. Integração Graybox Cruzada: Domínio (PortalLinkRequest) ↔ Adaptador Web', () => {
    it('[QA-REQ-5.1] O ciclo completo de colisão, prompt, interação por clique e transição deve ocorrer de forma determinística', () => {
      const eventsDispatched: { event: string, payload: any }[] = [];
      const listeners = new Map<string, Function[]>();

      const eventManagerMock = {
        on: vi.fn((event: string, handler: Function) => {
          if (!listeners.has(event)) listeners.set(event, []);
          listeners.get(event)!.push(handler);
        }),
        dispatch: vi.fn((event: string, payload: any) => {
          eventsDispatched.push({ event, payload });
          const handlers = listeners.get(event) || [];
          handlers.forEach(h => h(payload));
        }),
        off: vi.fn((event: string, handler: Function) => {
          const list = listeners.get(event) || [];
          const idx = list.indexOf(handler);
          if (idx !== -1) list.splice(idx, 1);
        })
      };

      // 1. Instancia o PortalLinkRequest no Domínio
      const portal = new PortalLinkRequest(
        777,
        { x: 400, y: 400 },
        { width: 64, height: 64 },
        eventManagerMock as any,
        'interior_black_default',
        { x: 512, y: 700 },
        null,
        1000,
        'Entrar na Loja',
        'E'
      );

      // 2. Instancia o DialogueAdapter no Adaptador Web ouvindo os eventos
      const dialogueAdapter = new DialogueAdapter(
        eventManagerMock as any,
        () => {},
        () => {},
        () => true
      );

      const uiManager = new UIManager(
        {} as any,
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        dialogueAdapter
      );

      const binder = new GameEventBinder(
        eventManagerMock as any,
        uiManager,
        {} as any,
        () => true,
        () => {}
      );
      binder.bindEvents();

      // 3. Simula colisão do Player com a Hitbox do Portal no Domínio
      const mockPlayer = { id: 1, objectId: 'player' };
      portal.handleCollision(mockPlayer);

      // Valida que o evento portalPromptShow foi emitido pelo domínio
      const showEvent = eventsDispatched.find(e => e.event === 'portalPromptShow');
      expect(showEvent).toBeDefined();
      expect(showEvent!.payload.portalId).toBe(777);
      expect(showEvent!.payload.text).toBe('Entrar na Loja');

      // Valida que o balão foi criado no DOM pelo FloatingChatGui
      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      expect(bubble).not.toBeNull();
      expect(bubble.textContent).toBe('[E] Entrar na Loja');

      // 4. Jogador clica no balão na tela
      bubble.click();

      // Valida que portalInteract foi disparado com { portalId: 777 }
      const interactEvent = eventsDispatched.find(e => e.event === 'portalInteract');
      expect(interactEvent).toBeDefined();
      expect(interactEvent!.payload.portalId).toBe(777);

      // Valida que a transição foi requisitada para o mapa correto
      const transitionEvent = eventsDispatched.find(e => e.event === 'mapTransitionRequested');
      expect(transitionEvent).toBeDefined();
      expect(transitionEvent!.payload.targetMapId).toBe('interior_black_default');
      expect(transitionEvent!.payload.targetCoordinates).toEqual({ x: 512, y: 700 });

      // Teardown
      portal.destroy();
      binder.unbindAll();
      dialogueAdapter.clear();
    });

    it('[QA-REQ-5.2] Jogador afastando-se do portal sem interagir deve disparar portalPromptHide e remover o balão', () => {
      const listeners = new Map<string, Function[]>();
      const eventManagerMock = {
        on: vi.fn((event: string, handler: Function) => {
          if (!listeners.has(event)) listeners.set(event, []);
          listeners.get(event)!.push(handler);
        }),
        dispatch: vi.fn((event: string, payload: any) => {
          const handlers = listeners.get(event) || [];
          handlers.forEach(h => h(payload));
        }),
        off: vi.fn()
      };

      const portal = new PortalLinkRequest(
        500,
        { x: 100, y: 100 },
        { width: 32, height: 32 },
        eventManagerMock as any,
        'vilgem'
      );

      const dialogueAdapter = new DialogueAdapter(eventManagerMock as any, () => {}, () => {}, () => true);
      const uiManager = new UIManager({} as any, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, dialogueAdapter);
      const binder = new GameEventBinder(eventManagerMock as any, uiManager, {} as any, () => true, () => {});
      binder.bindEvents();

      // Tick 1: Jogador colide com o portal
      portal.handleCollision({ id: 1, objectId: 'player' });
      portal.update(0.016);
      expect(document.querySelector('.floating-bubble.portal-prompt.active')).not.toBeNull();

      // Tick 2: Jogador se afastou da hitbox (nenhuma colisão ocorreu neste tick)
      portal.update(0.3);

      const bubble = document.querySelector('.floating-bubble.portal-prompt') as HTMLElement;
      expect(bubble.classList.contains('active')).toBe(false);

      vi.advanceTimersByTime(300);
      expect(document.querySelector('.floating-bubble.portal-prompt')).toBeNull();

      portal.destroy();
    });

    it('[QA-REQ-5.3] Tecla "E" (handleInteract) NÃO deve abrir o menu de personagem se o jogador estiver diante de um PortalLink ativo', () => {
      const listeners = new Map<string, Function[]>();
      const eventManagerMock = {
        on: vi.fn((event: string, handler: Function) => {
          if (!listeners.has(event)) listeners.set(event, []);
          listeners.get(event)!.push(handler);
        }),
        dispatch: vi.fn((event: string, payload: any) => {
          const handlers = listeners.get(event) || [];
          handlers.forEach(h => h(payload));
        }),
        off: vi.fn()
      };

      const dialogueAdapter = new DialogueAdapter(eventManagerMock as any, () => {}, () => {}, () => true);
      const mockDomain: any = {
        getPlayerState: vi.fn().mockReturnValue(null),
        subscribe: vi.fn(),
        getInventory: vi.fn().mockReturnValue({ items: [] })
      };
      const uiManager = new UIManager(mockDomain, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, dialogueAdapter);
      const binder = new GameEventBinder(eventManagerMock as any, uiManager, {} as any, () => true, () => {});
      binder.bindEvents();

      const toggleMenuSpy = vi.spyOn(uiManager, 'toggleCharacterMenu');

      // Sem portal ativo: apertar E alterna o menu do personagem
      expect(uiManager.hasActivePortalPrompt()).toBe(false);
      uiManager.handleInteract();
      expect(toggleMenuSpy).toHaveBeenCalledTimes(1);

      // Agora ativa o prompt do portal (jogador entra na área do portal)
      eventManagerMock.dispatch('portalPromptShow', {
        portalId: 100,
        targetMapId: 'interior_black_default',
        text: 'Entrar',
        actionKey: 'E',
        coordinates: { x: 500, y: 500 }
      });

      expect(uiManager.hasActivePortalPrompt()).toBe(true);

      // Com o portal ativo: apertar E NÃO deve chamar toggleCharacterMenu
      uiManager.handleInteract();
      expect(toggleMenuSpy).toHaveBeenCalledTimes(1);

      // Jogador sai do portal (portalPromptHide)
      eventManagerMock.dispatch('portalPromptHide', { portalId: 100 });
      expect(uiManager.hasActivePortalPrompt()).toBe(false);

      // Fora do portal: apertar E volta a alternar o menu normalmente
      uiManager.handleInteract();
      expect(toggleMenuSpy).toHaveBeenCalledTimes(2);
    });
  });
});
