// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlayerRenderable from '../../../../adapters/web/components/renderModule/customRenderables/Player';
import type { SpriteConfig } from '../../../../adapters/web/components/renderModule/visuals/GameObjectElement';
import type { EntityRenderableState } from '../../../../domain/ports/domain-contracts';
import { setPauseGame } from '../../../../adapters/web/components/Game';

describe('PlayerRenderable - 8 Lados de Rolagem (Canvas 2D)', () => {
  let configs: Map<string, SpriteConfig>;
  let imageCache: Map<string, HTMLImageElement>;
  let mockCtx: any;

  beforeEach(() => {
    configs = new Map();
    imageCache = new Map();

    const rollConfig: SpriteConfig = {
      imageSrc: 'http://localhost/assets/entities/player/player-roll.png',
      frameCount: 8,
      animationSpeed: 8,
      frameWidth: 32,
      frameHeight: 32
    };

    const idleConfig: SpriteConfig = {
      imageSrc: 'http://localhost/assets/entities/player/player-idle.png',
      frameCount: 2,
      animationSpeed: 20,
      frameWidth: 32,
      frameHeight: 32
    };

    configs.set('player-roll', rollConfig);
    configs.set('player-dodge', rollConfig);
    configs.set('player-idle', idleConfig);

    const dummyImg = document.createElement('img');
    Object.defineProperty(dummyImg, 'width', { value: 256 });
    Object.defineProperty(dummyImg, 'height', { value: 32 });
    imageCache.set('http://localhost/assets/entities/player/player-roll.png', dummyImg);
    imageCache.set('http://localhost/assets/entities/player/player-idle.png', dummyImg);

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      imageSmoothingEnabled: false
    };
  });

  it('deve desenhar o sprite de rolagem em direção Leste (0 rad) sem espelhamento horizontal', () => {
    const initialState: EntityRenderableState = {
      id: 1,
      entityTypeId: 'player',
      coordinates: { x: 100, y: 100 },
      size: { width: 32, height: 32 },
      state: 'roll',
      rotation: 0
    };

    const player = new PlayerRenderable({ initialState, configs, imageCache });
    player.draw(mockCtx);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.translate).toHaveBeenCalledWith(116, 116);
    expect(mockCtx.scale).not.toHaveBeenCalledWith(-1, 1);
    expect(mockCtx.rotate).toHaveBeenCalledWith(0);
    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });

  it('deve aplicar scale(-1, 1) e corrigir o angulo ao rolar para o Oeste (Math.PI rad) para manter os pes no chao', () => {
    const initialState: EntityRenderableState = {
      id: 1,
      entityTypeId: 'player',
      coordinates: { x: 100, y: 100 },
      size: { width: 32, height: 32 },
      state: 'roll',
      rotation: Math.PI
    };

    const player = new PlayerRenderable({ initialState, configs, imageCache });
    player.draw(mockCtx);

    expect(mockCtx.scale).toHaveBeenCalledWith(-1, 1);
    // No espaco espelhado, o angulo para Oeste e 0 (roll horizontal para a esquerda com cabeca para cima)
    expect(mockCtx.rotate.mock.calls[0][0]).toBeCloseTo(0, 4);
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it('deve renderizar com sucesso os 8 lados de rolagem', () => {
    const angles = [
      { name: 'Leste', angle: 0, expectFlip: false, expectedDrawAngle: 0 },
      { name: 'Sudeste', angle: Math.PI / 4, expectFlip: false, expectedDrawAngle: Math.PI / 4 },
      { name: 'Sul', angle: Math.PI / 2, expectFlip: false, expectedDrawAngle: Math.PI / 2 },
      { name: 'Sudoeste', angle: (3 * Math.PI) / 4, expectFlip: true, expectedDrawAngle: Math.PI / 4 },
      { name: 'Oeste', angle: Math.PI, expectFlip: true, expectedDrawAngle: 0 },
      { name: 'Noroeste', angle: (-3 * Math.PI) / 4, expectFlip: true, expectedDrawAngle: -Math.PI / 4 },
      { name: 'Norte', angle: -Math.PI / 2, expectFlip: false, expectedDrawAngle: -Math.PI / 2 },
      { name: 'Nordeste', angle: -Math.PI / 4, expectFlip: false, expectedDrawAngle: -Math.PI / 4 },
    ];

    for (const d of angles) {
      vi.clearAllMocks();
      const state: EntityRenderableState = {
        id: 1,
        entityTypeId: 'player',
        coordinates: { x: 50, y: 50 },
        size: { width: 32, height: 32 },
        state: 'roll',
        rotation: d.angle
      };

      const player = new PlayerRenderable({ initialState: state, configs, imageCache });
      player.draw(mockCtx);

      if (d.expectFlip) {
        expect(mockCtx.scale, `${d.name} deveria aplicar scale(-1, 1)`).toHaveBeenCalledWith(-1, 1);
      } else {
        expect(mockCtx.scale, `${d.name} nao deveria aplicar scale(-1, 1)`).not.toHaveBeenCalledWith(-1, 1);
      }

      const rotateCall = mockCtx.rotate.mock.calls[0][0];
      expect(rotateCall, `Angulo incorreto para ${d.name}`).toBeCloseTo(d.expectedDrawAngle, 4);
      expect(mockCtx.drawImage).toHaveBeenCalled();
    }
  });

  it('deve sincronizar o tempo de animacao exatamente com os 300ms do dash', () => {
    setPauseGame(false);
    vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
    const now = 1000;
    vi.setSystemTime(now);

    const state: EntityRenderableState = {
      id: 1,
      entityTypeId: 'player',
      coordinates: { x: 50, y: 50 },
      size: { width: 32, height: 32 },
      state: 'idle',
      rotation: 0
    };

    const player = new PlayerRenderable({ initialState: state, configs, imageCache });
    
    // Inicia roll no t=0
    player.updateState({ ...state, state: 'roll' });

    // No inicio (t = 0), frame deve ser 0 (antecipacao / mergulho)
    player.draw(mockCtx);
    let drawCall = mockCtx.drawImage.mock.calls[0];
    let sourceX = drawCall[1];
    expect(sourceX).toBe(0 * 32); // Frame 0

    // No meio do dash (t = 150ms = 50% de 300ms), frame deve ser 4 (impuso pelvico)
    vi.advanceTimersByTime(150);
    vi.clearAllMocks();
    player.draw(mockCtx);
    drawCall = mockCtx.drawImage.mock.calls[0];
    sourceX = drawCall[1];
    expect(sourceX).toBe(4 * 32); // Frame 4

    // Próximo ao fim do dash (t = 280ms), frame deve ser 7 (recomposição)
    vi.advanceTimersByTime(130);
    vi.clearAllMocks();
    player.draw(mockCtx);
    drawCall = mockCtx.drawImage.mock.calls[0];
    sourceX = drawCall[1];
    expect(sourceX).toBe(7 * 32); // Frame 7

    vi.useRealTimers();
  });

  it('deve manter armaduras e colar visiveis durante a rolagem usando fallback idle e Socket Rig (Modo A: Tucked Limbs)', () => {
    setPauseGame(false);
    vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(2000);

    // Registra apenas os sprites 'idle' dos equipamentos (igual ao VisualConfigMap real, sem chaves '*-roll')
    const equipConfigs: Record<string, SpriteConfig> = {
      'iron-helmet-idle': { imageSrc: 'helmet.png', frameCount: 1, animationSpeed: 20, frameWidth: 22, frameHeight: 16, renderOffset: [{ x: 5, y: 0 }, { x: 5, y: 1 }] },
      'iron-chestplate-idle': { imageSrc: 'chest.png', frameCount: 1, animationSpeed: 20, frameWidth: 18, frameHeight: 10, renderOffset: [{ x: 7, y: 17 }] },
      'simple-amulet-idle': { imageSrc: 'amulet.png', frameCount: 1, animationSpeed: 20, frameWidth: 16, frameHeight: 16, renderOffset: [{ x: 8, y: 17 }] },
      'iron-gloves-idle': { imageSrc: 'gloves.png', frameCount: 1, animationSpeed: 20, frameWidth: 18, frameHeight: 10, renderOffset: [{ x: 7, y: 18 }] },
      'iron-pants-idle': { imageSrc: 'pants.png', frameCount: 1, animationSpeed: 20, frameWidth: 10, frameHeight: 3, renderOffset: [{ x: 11, y: 27 }] },
      'iron-boots-idle': { imageSrc: 'boots.png', frameCount: 1, animationSpeed: 20, frameWidth: 10, frameHeight: 2, renderOffset: [{ x: 11, y: 31 }] },
    };

    for (const [key, cfg] of Object.entries(equipConfigs)) {
      configs.set(key, cfg);
      const img = document.createElement('img');
      Object.defineProperty(img, 'width', { value: cfg.frameWidth });
      Object.defineProperty(img, 'height', { value: cfg.frameHeight });
      imageCache.set(cfg.imageSrc, img);
    }

    const equippedState: EntityRenderableState = {
      id: 1,
      entityTypeId: 'player',
      coordinates: { x: 100, y: 100 },
      size: { width: 32, height: 32 },
      state: 'roll',
      rotation: 0,
      equipment: {
        helmet: { iconId: 10 } as any,
        chestplate: { iconId: 11 } as any,
        pants: { iconId: 12 } as any,
        boots: { iconId: 13 } as any,
        gloves: { iconId: 14 } as any,
        amulet: { iconId: 15 } as any,
      }
    };

    const player = new PlayerRenderable({ initialState: equippedState, configs, imageCache });

    // Frame 0 (agachamento inicial): corpo + todas as 6 peças visíveis = 7 chamadas a drawImage
    player.draw(mockCtx);
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(7);

    // Frame 2 (bola da cambalhota, t = 80ms): pants e boots ficam recolhidos (alpha=0),
    // enquanto body, chestplate, amulet, helmet (cúpula recortada 5px) e gloves são desenhados = 5 chamadas
    vi.advanceTimersByTime(80);
    vi.clearAllMocks();
    player.draw(mockCtx);
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(5);

    // Verifica que o capacete no frame de bola teve sua altura de origem recortada para a cúpula superior (5px de 16px)
    const helmetDrawCall = mockCtx.drawImage.mock.calls.find((call: any[]) => call[0] === imageCache.get('helmet.png'));
    expect(helmetDrawCall).toBeDefined();
    expect(helmetDrawCall![3]).toBe(22); // srcWidth
    expect(helmetDrawCall![4]).toBe(5);  // srcHeight recortada (16 * 0.3125 = 5)

    // Frame 6 (recuperação, t = 230ms): todas as 7 camadas voltam a aparecer
    vi.advanceTimersByTime(150);
    vi.clearAllMocks();
    player.draw(mockCtx);
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(7);

    vi.useRealTimers();
  });

  it('deve posicionar os broches no tronco por debaixo da armadura (zIndex 5, renderSize 3x3) em idle/walking e oculta-los na rolagem', () => {
    setPauseGame(false);

    // Registra peitoral (zIndex 30) e 2 slots de broches (zIndex 5, 40x40 -> renderSize 3x3)
    const chestCfg: SpriteConfig = {
      imageSrc: 'chest.png',
      frameCount: 1,
      animationSpeed: 20,
      frameWidth: 18,
      frameHeight: 10,
      renderOffset: [{ x: 7, y: 17 }]
    };
    const brooch0Cfg: SpriteConfig = {
      imageSrc: 'brooch_heal.png',
      frameCount: 1,
      animationSpeed: 20,
      frameWidth: 40,
      frameHeight: 40,
      renderSize: { width: 3, height: 3 },
      renderOffset: [{ x: 10, y: 18 }, { x: 10, y: 19 }]
    };
    const brooch1Cfg: SpriteConfig = {
      imageSrc: 'brooch_titan.png',
      frameCount: 1,
      animationSpeed: 20,
      frameWidth: 40,
      frameHeight: 40,
      renderSize: { width: 3, height: 3 },
      renderOffset: [{ x: 13, y: 18 }, { x: 13, y: 19 }]
    };

    configs.set('iron-chestplate-idle', chestCfg);
    configs.set('wearable-brooch-brooch_active_heal-slot-0-idle', brooch0Cfg);
    configs.set('wearable-brooch-brooch_titan-slot-1-idle', brooch1Cfg);

    for (const src of ['chest.png', 'brooch_heal.png', 'brooch_titan.png']) {
      const img = document.createElement('img');
      Object.defineProperty(img, 'width', { value: 40 });
      Object.defineProperty(img, 'height', { value: 40 });
      imageCache.set(src, img);
    }

    const stateIdle: EntityRenderableState = {
      id: 1,
      entityTypeId: 'player',
      coordinates: { x: 100, y: 100 },
      size: { width: 32, height: 32 },
      state: 'idle',
      rotation: 0,
      globalActiveLoadout: ['brooch_heal', null],
      passiveLoadout: ['brooch_titan', null, null, null],
      equipment: {
        chestplate: { iconId: 11 } as any
      }
    };

    const player = new PlayerRenderable({ initialState: stateIdle, configs, imageCache });
    player.draw(mockCtx);

    // Ordem de pintura deve ser estritamente: 0=body -> 1=brooch0 -> 2=brooch1 -> 3=chestplate (peitoral por cima dos broches!)
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(4);
    expect(mockCtx.drawImage.mock.calls[0][0]).toBe(imageCache.get('http://localhost/assets/entities/player/player-idle.png'));
    expect(mockCtx.drawImage.mock.calls[1][0]).toBe(imageCache.get('brooch_heal.png'));
    expect(mockCtx.drawImage.mock.calls[2][0]).toBe(imageCache.get('brooch_titan.png'));
    expect(mockCtx.drawImage.mock.calls[3][0]).toBe(imageCache.get('chest.png'));

    // Verifica que os broches 40x40 foram desenhados reduzidos como detalhes 3x3 no tronco (destWidth = 3, destHeight = 3)
    expect(mockCtx.drawImage.mock.calls[1][3]).toBe(40); // srcWidth
    expect(mockCtx.drawImage.mock.calls[1][4]).toBe(40); // srcHeight
    expect(mockCtx.drawImage.mock.calls[1][7]).toBe(3);  // destWidth (renderSize.width)
    expect(mockCtx.drawImage.mock.calls[1][8]).toBe(3);  // destHeight (renderSize.height)

    // Ao entrar em 'roll', os broches devem ser ocultados, restando apenas body + chestplate = 2 chamadas
    vi.clearAllMocks();
    player.updateState({ ...stateIdle, state: 'roll' });
    player.draw(mockCtx);
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(2);
    expect(mockCtx.drawImage.mock.calls[0][0]).toBe(imageCache.get('http://localhost/assets/entities/player/player-roll.png'));
    expect(mockCtx.drawImage.mock.calls[1][0]).toBe(imageCache.get('chest.png'));
  });
});


