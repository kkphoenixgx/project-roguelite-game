/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import PauseMenuGui from '../../adapters/web/GUIS/pauseMenuModule/PauseMenuGui';
import GameAdapter from '../../adapters/web/components/GameAdapter';

describe('Regressão: Salvamento Obrigatório ao Quitar e Preservação Estrita de Coordenadas', () => {
  let eventManager: EventHandler;
  let mockLogger: any;
  let mockCollision: any;
  let mockTelemetry: any;

  beforeEach(() => {
    eventManager = new EventHandler();
    mockLogger = { log: vi.fn() };
    mockCollision = {
      isPointInPolygon: vi.fn(),
      isPointInCircle: vi.fn(),
      checkCollision: vi.fn(),
      getIntersectingPoints: vi.fn()
    };
    mockTelemetry = {
      recordFrame: vi.fn(),
      recordSubsystemTime: vi.fn(),
      setSpatialInfo: vi.fn(),
      recordFileTiming: vi.fn(),
      setActiveEntities: vi.fn()
    };
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('1. DomainFacade: restoreGameState NÃO deve deslocar o player para o centro (0, 0) quando ele estiver no Chunk (1, 1) (ex: 1200, 1300)', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      mockLogger,
      eventManager,
      mockCollision,
      mockTelemetry
    );
    await domain.loadWorld('vilgem');

    // Jogador moveu para o Chunk (1, 1) [1024..2048, 1024..2048]
    domain.player.coordinates = { x: 1200, y: 1300 };
    expect(domain.player.coordinates).toEqual({ x: 1200, y: 1300 });

    const modernSave = {
      world: 'vilgem',
      mapId: 'vilgem',
      playerState: {
        coordinates: { x: 1200, y: 1300 }
      }
    };

    domain.restoreGameState(modernSave);

    // O jogador deve permanecer exatamente em (1200, 1300), e NÃO ser subtraído por 1024 para (176, 276)
    expect(domain.player.coordinates).toEqual({ x: 1200, y: 1300 });
    expect(domain.activeChunk).toEqual({ cx: 1, cy: 1 });
  });

  it('2. DomainFacade: restoreGameState deve manter coordenadas arbitrárias em qualquer quadrante de Vilgem', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      mockLogger,
      eventManager,
      mockCollision,
      mockTelemetry
    );
    await domain.loadWorld('vilgem');

    const testPositions = [
      { x: -500, y: -400, expectedChunk: { cx: -1, cy: -1 } },
      { x: 250, y: 350, expectedChunk: { cx: 0, cy: 0 } },
      { x: 1500, y: 200, expectedChunk: { cx: 1, cy: 0 } },
      { x: 800, y: 1800, expectedChunk: { cx: 0, cy: 1 } },
      { x: 1800, y: 1900, expectedChunk: { cx: 1, cy: 1 } }
    ];

    for (const pos of testPositions) {
      domain.restoreGameState({
        mapId: 'vilgem',
        player: { coordinates: { x: pos.x, y: pos.y } }
      });
      expect(domain.player.coordinates).toEqual({ x: pos.x, y: pos.y });
      expect(domain.activeChunk).toEqual(pos.expectedChunk);
    }
  });

  it('3. DomainFacade: apenas coordenadas legadas explícitas (1536, 1615) ou (0, 0) devem migrar para o spawn oficial (512, 591)', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      mockLogger,
      eventManager,
      mockCollision,
      mockTelemetry
    );
    await domain.loadWorld('vilgem');

    // Spawn legado 1536, 1615
    domain.restoreGameState({
      mapId: 'vilgem',
      playerState: { coordinates: { x: 1536, y: 1615 } }
    });
    expect(domain.player.coordinates).toEqual({ x: 512, y: 591 });

    // Spawn nulo / zerado (0, 0)
    domain.restoreGameState({
      mapId: 'vilgem',
      playerState: { coordinates: { x: 0, y: 0 } }
    });
    expect(domain.player.coordinates).toEqual({ x: 512, y: 591 });
  });

  it('4. PauseMenuGui: clicar em #pm-btn-quit deve disparar salvamento do jogo antes de chamar o callback de quit', async () => {
    const eventsSequence: string[] = [];
    const onResumeMock = vi.fn();
    const onQuitMock = vi.fn().mockImplementation(() => {
      eventsSequence.push('quit');
    });
    const onSaveMock = vi.fn().mockImplementation(async () => {
      eventsSequence.push('save');
    });

    const pauseMenu = new PauseMenuGui(onResumeMock, onQuitMock, onSaveMock);
    pauseMenu.show();

    const btnQuit = document.getElementById('pm-btn-quit') as HTMLButtonElement;
    expect(btnQuit).not.toBeNull();

    btnQuit.click();
    await new Promise(r => setTimeout(r, 10));

    expect(onSaveMock).toHaveBeenCalledOnce();
    expect(onQuitMock).toHaveBeenCalledOnce();
    expect(eventsSequence).toEqual(['save', 'quit']);
  });

  it('5. GameAdapter: ao executar saveGameSlot e recarregar, o save gerado deve reter as coordenadas atuais do player', async () => {
    const domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      mockLogger,
      eventManager,
      mockCollision,
      mockTelemetry
    );
    await domain.loadWorld('vilgem');

    // Simula GameAdapter com container DOM mínimo
    const root = document.createElement('div');
    root.id = 'game-root';
    document.body.appendChild(root);

    const adapter = new GameAdapter(domain, eventManager, mockTelemetry as any);
    // Jogador andou até o canto sudeste de Vilgem (1450, 1650)
    domain.player.coordinates = { x: 1450, y: 1650 };

    await adapter.saveGameSlot(1);

    const savedRaw = localStorage.getItem('game_slot_1');
    expect(savedRaw).not.toBeNull();
    const saved = JSON.parse(savedRaw!);

    // O save deve conter as coordenadas fiéis
    const checkpointCoords = saved.activeCheckpoint?.player?.coordinates || saved.checkpoint?.player?.coordinates || saved.player?.coordinates;
    expect(checkpointCoords).toEqual({ x: 1450, y: 1650 });

    // Restaura um novo domínio simulando reabertura do jogo após quitar
    const newDomain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 512, y: 591 } } },
      mockLogger,
      eventManager,
      mockCollision,
      mockTelemetry
    );
    await newDomain.loadWorld('vilgem');
    newDomain.restoreGameState(saved);

    expect(newDomain.player.coordinates).toEqual({ x: 1450, y: 1650 });
    expect(newDomain.player.coordinates).not.toEqual({ x: 512, y: 591 });
  });
});
