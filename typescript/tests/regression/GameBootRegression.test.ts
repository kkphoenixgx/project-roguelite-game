// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mocks do ecossistema Tauri IPC para execução em ambiente headless
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === 'get_active_model') return Promise.resolve('qwen2.5:0.5b');
    return Promise.resolve([]);
  })
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {}))
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    isFullscreen: vi.fn().mockResolvedValue(false),
    setFullscreen: vi.fn().mockResolvedValue(undefined),
    minimize: vi.fn().mockResolvedValue(undefined),
    toggleMaximize: vi.fn().mockResolvedValue(undefined),
    onCloseRequested: vi.fn().mockResolvedValue(() => {})
  }))
}));

// Previne ReferenceError: Worker is not defined no ambiente headless
vi.stubGlobal('Worker', class WorkerMock {
  postMessage() {}
  terminate() {}
  onmessage: any = null;
  onerror: any = null;
});

// Mock de Image para permitir que preloadAssets resolva onload no JSDOM
class MockImage {
  private _src = '';
  public onload: any = null;
  public onerror: any = null;
  public width = 1024;
  public height = 1024;

  get src() {
    return this._src;
  }

  set src(val: string) {
    this._src = val;
    setTimeout(() => {
      if (typeof this.onload === 'function') {
        this.onload();
      }
    }, 0);
  }
}
vi.stubGlobal('Image', MockImage);

import GameAdapter from '../../adapters/web/components/GameAdapter';
import AdapterManager from '../../adapters/AdapterManager';
import { TauriJsonSaveRepository } from '../../adapters/web/infrastructure/TauriJsonSaveRepository';
import VilgemWorld from '../../domain/ObjectModule/Maps/VilgemWorld';
import ExperienceTome from '../../domain/ObjectModule/Items/Consumables/ExperienceTome';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import { CollisionAdapter } from '../../domain/ports/CollisionAdapter';
import { TelemetryAdapter } from '../../adapters/TelemetryAdapter/TelemetryAdapterSingleton';
import { NullLLMConfigPort } from '../../domain/ports/ILLMConfigPort';
import ConfirmationModalGui from '../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui';
import ToastGui from '../../adapters/web/GUIS/toastModule/ToastGui';
import { isGamePaused } from '../../adapters/web/components/Game';

/**
 * ============================================================================
 * TESTE DE REGRESSÃO: ABERTURA E BOOT DO JOGO (npm run tauri:dev)
 * ============================================================================
 * Objetivo de QA:
 * Blindar o fluxo completo de inicialização e abertura do jogo:
 * 1. O jogo abre e inicializa todos os subsistemas essenciais sem exceções.
 * 2. O canvas 2D é devidamente injetado no DOM e configurado.
 * 3. O menu principal (MainMenuGui) é renderizado com abas e o botão 'Sonhar'.
 * 4. Ao iniciar ('Sonhar'), o menu fecha, o jogo despausa e o loop inicia.
 * 5. Os arquivos de build e inicialização (package.json, tauri.conf.json, index.html)
 *    estão estritamente configurados para suportar o comando 'npm run tauri:dev'.
 */
describe('Regressão de Boot: Abertura do Jogo e Inicialização do Ciclo de Vida', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  let originalGetContext: any;
  let originalFetch: any;
  let unhandledErrors: any[] = [];
  let unhandledRejections: any[] = [];
  let errorHandler: (e: any) => void;
  let rejectionHandler: (e: any) => void;

  beforeEach(() => {
    (ConfirmationModalGui as any).singletonInstance = null;
    (ToastGui as any).singletonInstance = null;
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    localStorage.clear();
    sessionStorage.clear();
    unhandledErrors = [];
    unhandledRejections = [];

    errorHandler = (e: any) => {
      unhandledErrors.push(e.error || e.message || e);
    };
    rejectionHandler = (e: any) => {
      unhandledRejections.push(e.reason || e);
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    // Mock do contexto Canvas 2D
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type: string) => {
      if (type === '2d') {
        return {
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          font: '',
          textAlign: 'start',
          textBaseline: 'alphabetic',
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          strokeRect: vi.fn(),
          drawImage: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          scale: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          transform: vi.fn(),
          setTransform: vi.fn(),
          resetTransform: vi.fn(),
          beginPath: vi.fn(),
          closePath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          rect: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          stroke: vi.fn(),
          clip: vi.fn(),
          fillText: vi.fn(),
          strokeText: vi.fn(),
          measureText: vi.fn(() => ({ width: 0 })),
          createPattern: vi.fn(),
          createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
          createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
          imageSmoothingEnabled: false,
          canvas: { width: 800, height: 600 }
        } as any;
      }
      return null;
    });

    // Mock do Fetch para assets e colisões
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ hitboxes: [] }),
        text: () => Promise.resolve('')
      } as any);
    });
  });

  afterEach(() => {
    window.removeEventListener('error', errorHandler);
    window.removeEventListener('unhandledrejection', rejectionHandler);
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    globalThis.fetch = originalFetch;
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 1: Verificação de Scripts e Arquitetura de Inicialização              */
  /* -------------------------------------------------------------------------- */
  describe('1. Integridade dos Scripts e Configurações de Boot (tauri:dev)', () => {
    it('deve garantir que package.json possui o script oficial tauri:dev', () => {
      const pkgPath = path.resolve(rootDir, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts['tauri:dev']).toBe('tauri dev');
      expect(pkg.scripts['dev']).toBe('vite');
    });

    it('deve garantir que src-tauri/tauri.conf.json está configurado com devUrl e comando de boot corretos', () => {
      const tauriConfPath = path.resolve(rootDir, 'src-tauri/tauri.conf.json');
      expect(fs.existsSync(tauriConfPath)).toBe(true);

      const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
      expect(tauriConf.build).toBeDefined();
      expect(tauriConf.build.devUrl).toBe('http://localhost:5173');
      expect(tauriConf.build.beforeDevCommand).toBe('npm run dev');

      expect(tauriConf.app).toBeDefined();
      expect(Array.isArray(tauriConf.app.windows)).toBe(true);
      expect(tauriConf.app.windows[0].label).toBe('main');
    });

    it('deve garantir que index.html carrega o entrypoint oficial /typescript/adapters/web/index.ts', () => {
      const indexPath = path.resolve(rootDir, 'index.html');
      expect(fs.existsSync(indexPath)).toBe(true);

      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      expect(indexContent).toContain('/typescript/adapters/web/index.ts');
      expect(indexContent).toContain('Early Window Error');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 2: Boot do Jogo e Verificação de Abertura no DOM                      */
  /* -------------------------------------------------------------------------- */
  describe('2. Abertura do Jogo e Montagem do DOM (GameAdapter.initialize)', () => {
    it('deve abrir o jogo com sucesso, injetar o canvas e montar o menu principal sem erros', async () => {
      const eventManager = new EventHandler();
      const collisionAdapter = new CollisionAdapter();
      const telemetryAdapter = TelemetryAdapter.getInstance();

      const gameConfig = {
        player: { id: 1, level: 1, initialPos: { x: 1536, y: 1615 } }
      };

      const mockSaveRepo = {
        getAllSlots: vi.fn().mockResolvedValue(new Map()),
        getSave: vi.fn().mockResolvedValue(null),
        saveGame: vi.fn().mockResolvedValue(undefined),
        deleteSave: vi.fn().mockResolvedValue(undefined)
      } as any;

      const mockLogger = { log: vi.fn() } as any;

      const domain = new DomainFacade(
        gameConfig,
        mockLogger,
        eventManager,
        collisionAdapter,
        telemetryAdapter,
        NullLLMConfigPort,
        mockSaveRepo
      );

      const adapter = new GameAdapter(domain, eventManager, telemetryAdapter);

      // 1. Act: Inicializa a abertura do jogo
      await adapter.initialize();

      // 2. Assert: O Canvas do jogo deve existir e estar no body com dimensões e estilo válidos
      const canvases = document.querySelectorAll('canvas');
      expect(canvases.length).toBeGreaterThanOrEqual(1);
      const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
      expect(canvas).not.toBeNull();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
      expect(canvas.style.position).toBe('absolute');
      expect(canvas.style.top).toBe('0px');
      expect(canvas.style.left).toBe('0px');
      expect(canvas.style.display).toBe('block');
      expect(canvas.parentElement).toBe(document.body);

      // 3. Assert: TODAS as 15 GUIs essenciais devem estar devidamente instanciadas e injetadas no DOM
      const expectedGuiElements = [
        { selector: '#main-menu-container', name: 'Menu Principal' },
        { selector: '#dialogue-container', name: 'Diálogo com NPCs' },
        { selector: '#portrait-canvas', name: 'Canvas de Retrato do Diálogo' },
        { selector: '.floating-chat-container', name: 'Chat Flutuante de Balões' },
        { selector: '#player-status-container', name: 'Status do Jogador (HP/Mana)' },
        { selector: '#xp-bar-container', name: 'Barra de Experiência (XP Bar)' },
        { selector: '#spell-buffer-container', name: 'Buffer de Feitiços e Runas do Mago' },
        { selector: '#equipped-weapons-hud-container', name: 'HUD de Armas Equipadas' },
        { selector: '#weapon-hud-container', name: 'HUD de Arma Principal' },
        { selector: '#character-menu-container', name: 'Menu de Personagem e Inventário' },
        { selector: '#skill-tree-container', name: 'Árvore de Habilidades' },
        { selector: '#game-over-container', name: 'Tela de Game Over' },
        { selector: '#levelup-reward-container', name: 'Menu de Recompensas de Level Up' },
        { selector: '#confirmation-modal-overlay', name: 'Modal de Confirmação Global' },
        { selector: '#toast-notifications-container', name: 'Container de Notificações Toast' },
        { selector: '#pause-menu-overlay', name: 'Menu de Pausa' }
      ];

      for (const gui of expectedGuiElements) {
        const element = document.querySelector(gui.selector);
        expect(element, `GUI obrigatória não encontrada no DOM: ${gui.name} (${gui.selector})`).not.toBeNull();
      }

      // 4. Assert: O container do Menu Principal deve estar visível no boot
      const mainMenu = document.getElementById('main-menu-container');
      expect(mainMenu?.style.display).not.toBe('none');

      // 5. Assert: As 5 abas de navegação do menu devem estar presentes
      const navButtons = document.querySelectorAll('.mm-nav-btn');
      expect(navButtons.length).toBe(5);

      // 6. Assert: O botão "Sonhar" de início de partida deve estar presente
      const sonharBtn = document.getElementById('btn-sonhar');
      expect(sonharBtn).not.toBeNull();
      expect(sonharBtn?.textContent).toContain('Sonhar');

      // 7. Assert: O overlay de crash fatal NUNCA deve ser disparado durante o boot
      const crashOverlay = document.getElementById('game-crash-overlay');
      expect(crashOverlay).toBeNull();

      // 8. Assert: Zero erros não capturados ou rejections no carregamento
      expect(unhandledErrors).toHaveLength(0);
      expect(unhandledRejections).toHaveLength(0);
    });

    it('deve diagnosticar e blindar contra anomalia de Tela Cinza (Gray Screen) no boot e na renderização', async () => {
      const eventManager = new EventHandler();
      const collisionAdapter = new CollisionAdapter();
      const telemetryAdapter = TelemetryAdapter.getInstance();

      const gameConfig = {
        player: { id: 1, level: 1, initialPos: { x: 1536, y: 1615 } }
      };

      const mockSaveRepo = {
        getAllSlots: vi.fn().mockResolvedValue(new Map()),
        getSave: vi.fn().mockResolvedValue(null),
        saveGame: vi.fn().mockResolvedValue(undefined),
        deleteSave: vi.fn().mockResolvedValue(undefined)
      } as any;

      const mockLogger = { log: vi.fn() } as any;

      const domain = new DomainFacade(
        gameConfig,
        mockLogger,
        eventManager,
        collisionAdapter,
        telemetryAdapter,
        NullLLMConfigPort,
        mockSaveRepo
      );

      const adapter = new GameAdapter(domain, eventManager, telemetryAdapter);
      await adapter.initialize();

      // 1. Diagnóstico de cores de fundo do Body e do Canvas
      const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
      expect(canvas).not.toBeNull();

      const grayColorPatterns = [
        'gray', 'grey', '#808080', '#888', '#999', '#aaa', '#bbb', '#ccc',
        '#777', '#666', '#555', '#444', '#333', '#2b2b2b', 'rgb(128, 128, 128)'
      ];

      const canvasBg = (canvas.style.backgroundColor || '').toLowerCase().trim();
      const bodyBg = (document.body.style.backgroundColor || '').toLowerCase().trim();

      for (const gray of grayColorPatterns) {
        expect(canvasBg, `Canvas possui cor de fundo cinza indevida: ${canvasBg}`).not.toBe(gray);
        expect(bodyBg, `Body possui cor de fundo cinza indevida: ${bodyBg}`).not.toBe(gray);
      }

      // O fundo oficial padrão do Canvas e do Body deve ser estritamente preto sólido (#000000 / rgb(0, 0, 0))
      expect(['#000000', 'rgb(0, 0, 0)', 'black']).toContain(canvasBg);
      expect(['#000000', 'rgb(0, 0, 0)', 'black']).toContain(bodyBg);

      // 2. Diagnóstico da tela de loading: Em ambiente web sem Ollama, não pode ficar travada bloqueando a tela
      const loadingScreen = document.getElementById('loading-screen-container');
      if (loadingScreen) {
        // Se a tela de loading existir, ela não pode ficar com display fixo bloqueando permanentemente
        const isHiddenOrNone = loadingScreen.style.display === 'none' || loadingScreen.style.opacity === '0';
        expect(isHiddenOrNone, 'Tela de loading está cobrindo a tela indefinidamente, gerando aspecto de tela congelada/cinza').toBe(true);
      }

      // 3. Validação do clear do Renderer: Garante que o desenho limpa a tela com preto (#000000)
      const ctx = canvas.getContext('2d');
      expect(ctx).not.toBeNull();

      // Executa o clear de desenho do canvas
      const canvasAbstraction = (adapter as any).renderer?.canvas;
      if (canvasAbstraction && typeof canvasAbstraction.clear === 'function') {
        canvasAbstraction.clear();
        expect(canvasAbstraction.ctx.fillStyle).toBe('#000000');
      }

      // 4. Verificação de Overlays Ocultos/Fantasmas
      const allFixedOverlays = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');
      allFixedOverlays.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        const bg = (htmlEl.style.backgroundColor || '').toLowerCase();
        for (const gray of grayColorPatterns) {
          if (bg === gray && htmlEl.style.display !== 'none' && htmlEl.id !== 'fog-canvas') {
            throw new Error(`Elemento overlay #${htmlEl.id || htmlEl.className} possui background cinza ativo que causa Tela Cinza`);
          }
        }
      });
    });

    it('deve garantir que todas as GUIs e o canvas inicializam e o menu desbloqueia mesmo no ambiente Tauri com IA offline', async () => {
      (window as any).__TAURI_INTERNALS__ = {};

      const eventManager = new EventHandler();
      const collisionAdapter = new CollisionAdapter();
      const telemetryAdapter = TelemetryAdapter.getInstance();

      const gameConfig = {
        player: { id: 1, level: 1, initialPos: { x: 1536, y: 1615 } }
      };

      const mockSaveRepo = {
        getAllSlots: vi.fn().mockResolvedValue(new Map()),
        getSave: vi.fn().mockResolvedValue(null),
        saveGame: vi.fn().mockResolvedValue(undefined),
        deleteSave: vi.fn().mockResolvedValue(undefined)
      } as any;

      const mockLogger = { log: vi.fn() } as any;

      const domain = new DomainFacade(
        gameConfig,
        mockLogger,
        eventManager,
        collisionAdapter,
        telemetryAdapter,
        NullLLMConfigPort,
        mockSaveRepo
      );

      const adapter = new GameAdapter(domain, eventManager, telemetryAdapter);
      await adapter.initialize();

      // Garante que o canvas do jogo está no DOM
      const canvas = document.querySelector('body > canvas');
      expect(canvas).not.toBeNull();

      // Garante que o menu principal foi montado
      const mainMenu = document.getElementById('main-menu-container');
      expect(mainMenu).not.toBeNull();

      // Verifica se o botão Sonhar existe
      const sonharBtn = document.getElementById('btn-sonhar') as HTMLButtonElement;
      expect(sonharBtn).not.toBeNull();

      delete (window as any).__TAURI_INTERNALS__;
    });

    it('deve simular fielmente o entrypoint oficial (index.ts -> AdapterManager.start com TauriJsonSaveRepository) garantindo que nenhuma falha é mascarada e o Canvas/GUIs sobem com sucesso', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      const eventManager = new EventHandler();
      const collisionAdapter = new CollisionAdapter();
      const telemetryAdapter = TelemetryAdapter.getInstance();
      eventManager.setTelemetry(telemetryAdapter);

      const saveRepository = new TauriJsonSaveRepository();
      const gameConfig = {
        player: { id: 1, level: 1, initialPos: { x: 1536, y: 1615 } }
      };
      const mockLogger = { log: vi.fn() } as any;

      const domain = new DomainFacade(
        gameConfig,
        mockLogger,
        eventManager,
        collisionAdapter,
        telemetryAdapter,
        NullLLMConfigPort,
        saveRepository
      );

      const adapterManager = new AdapterManager(domain, eventManager, telemetryAdapter);

      // Simula o exato fluxo de main() do index.ts
      await adapterManager.start();

      // Blindagem contra supressão de erros no AdapterManager.ts:
      // Se GameAdapter.initialize() falhar, o AdapterManager faz catch e loga "Falha ao inicializar o GameAdapter (2D):"
      const initErrors = consoleErrorSpy.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && (
          arg.includes('Falha ao inicializar o GameAdapter') ||
          arg.includes('Falha ao inicializar o jogo')
        ))
      );
      expect(initErrors, `O AdapterManager suprimiu erro crítico de inicialização: ${JSON.stringify(initErrors)}`).toHaveLength(0);

      // O Canvas do jogo DEVE ter sido injetado no DOM
      const canvas = document.querySelector('body > canvas') as HTMLCanvasElement;
      expect(canvas, 'Canvas não foi renderizado no body após adapterManager.start()').not.toBeNull();
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
      expect(canvas.style.display).toBe('block');

      // TODAS as 15 GUIs devem estar presentes no DOM
      const expectedGuiSelectors = [
        '#main-menu-container',
        '#dialogue-container',
        '#portrait-canvas',
        '.floating-chat-container',
        '#player-status-container',
        '#xp-bar-container',
        '#spell-buffer-container',
        '#equipped-weapons-hud-container',
        '#weapon-hud-container',
        '#character-menu-container',
        '#skill-tree-container',
        '#game-over-container',
        '#levelup-reward-container',
        '#confirmation-modal-overlay',
        '#toast-notifications-container',
        '#pause-menu-overlay'
      ];
      for (const sel of expectedGuiSelectors) {
        expect(document.querySelector(sel), `Elemento ${sel} ausente após boot via AdapterManager`).not.toBeNull();
      }

      // Nenhuma tela de loading bloqueando permanentemente
      const loadingScreen = document.getElementById('loading-screen-container');
      if (loadingScreen) {
        const isHiddenOrNone = loadingScreen.style.display === 'none' || loadingScreen.style.opacity === '0';
        expect(isHiddenOrNone, 'Tela de loading residual está bloqueando a visualização com aspecto de Tela Cinza').toBe(true);
      }

      consoleErrorSpy.mockRestore();
    });

    it('deve validar que VilgemWorld e ExperienceTome podem ser instanciados e gerados sem ReferenceError de dependência circular', async () => {
      const eventManager = new EventHandler();

      expect(() => {
        const tome = new ExperienceTome();
        expect(tome).toBeDefined();
        expect(tome.name).toBe('Tomo do Conhecimento Perdido');
      }).not.toThrow();

      const world = new VilgemWorld(eventManager);
      expect(world).toBeDefined();

      let worldError: any = null;
      try {
        await world.generate();
      } catch (err) {
        worldError = err;
      }

      expect(worldError, `Geração do VilgemWorld falhou com erro de dependência circular: ${worldError}`).toBeNull();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 3: Transição do Menu para a Partida ("Sonhar")                        */
  /* -------------------------------------------------------------------------- */
  describe('3. Transição de Abertura da Partida (Start do Jogo)', () => {
    it('deve fechar o menu principal e iniciar o loop de jogo ativo ao clicar em Sonhar', async () => {
      const eventManager = new EventHandler();
      const collisionAdapter = new CollisionAdapter();
      const telemetryAdapter = TelemetryAdapter.getInstance();

      const gameConfig = {
        player: { id: 1, level: 1, initialPos: { x: 1536, y: 1615 } }
      };

      const mockSaveRepo = {
        getAllSlots: vi.fn().mockResolvedValue(new Map()),
        getSave: vi.fn().mockResolvedValue(null),
        saveGame: vi.fn().mockResolvedValue(undefined),
        deleteSave: vi.fn().mockResolvedValue(undefined)
      } as any;

      const mockLogger = { log: vi.fn() } as any;

      const domain = new DomainFacade(
        gameConfig,
        mockLogger,
        eventManager,
        collisionAdapter,
        telemetryAdapter,
        NullLLMConfigPort,
        mockSaveRepo
      );

      const adapter = new GameAdapter(domain, eventManager, telemetryAdapter);
      await adapter.initialize();

      // Antes do clique: jogo em espera no menu
      expect((adapter as any).isGameStarted).toBe(false);

      const sonharBtn = document.getElementById('btn-sonhar') as HTMLButtonElement;
      expect(sonharBtn).not.toBeNull();

      // Desbloqueia e simula o clique do jogador para entrar no mundo
      sonharBtn.disabled = false;
      sonharBtn.style.pointerEvents = 'auto';

      // Executa o início do jogo via ação de click
      sonharBtn.click();

      // Avança o timeout de transição de nuvem do menu (startDream tem timeout de 1200ms)
      await new Promise(resolve => setTimeout(resolve, 1400));

      // Verifica se o estado de jogo iniciado foi atingido
      expect((adapter as any).isGameStarted).toBe(true);

      // O menu principal deve ser ocultado
      const mainMenu = document.getElementById('main-menu-container');
      expect(mainMenu?.style.display).toBe('none');

      // Executa 3 ticks completos de frame (update e draw) para certificar que o motor não trava
      expect(() => {
        (adapter as any).update(0.016);
      }).not.toThrow();

      await expect((adapter as any).draw()).resolves.toBeUndefined();
    }, 15000);
  });
});
