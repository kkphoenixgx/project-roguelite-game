// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { GuiBuilder } from '../../../../adapters/web/templates/GuiBuilder';
import { ParticleConfigBuilder, ParticleVfxPresets } from '../../../../adapters/web/templates/ParticleConfigBuilder';
import { SpriteVisualBuilder } from '../../../../adapters/web/templates/SpriteVisualBuilder';
import { EventBindingBuilder } from '../../../../adapters/web/templates/EventBindingBuilder';
import { StorybookGuiBuilder } from '../../../../adapters/web/templates/StorybookGuiBuilder';

describe('WebAdapterTemplates (Corporate Toolkit)', () => {
  describe('GuiBuilder', () => {
    it('deve construir uma GUI funcional com injeção no DOM, eventos e hooks', () => {
      const onOpen = vi.fn();
      const onHide = vi.fn();
      const onBtnClick = vi.fn();

      const gui = GuiBuilder.create('test-dialog')
        .withTemplate(
          '<div id="test-dialog-box"><button id="btn-close">Fechar</button></div>',
          '#test-dialog-box { display: none; }'
        )
        .onButtonClick('#btn-close', onBtnClick)
        .onShown(onOpen)
        .onHidden(onHide)
        .build();

      expect(gui.isOpen).toBe(false);

      gui.show();
      expect(gui.isOpen).toBe(true);
      expect(onOpen).toHaveBeenCalledTimes(1);

      const btn = document.querySelector('#btn-close') as HTMLButtonElement;
      expect(btn).not.toBeNull();
      btn.click();
      expect(onBtnClick).toHaveBeenCalledTimes(1);

      gui.hide();
      expect(gui.isOpen).toBe(false);
      expect(onHide).toHaveBeenCalledTimes(1);

      gui.destroy();
      expect(document.querySelector('#test-dialog-box')).toBeNull();
    });
  });

  describe('ParticleConfigBuilder & Presets', () => {
    it('deve gerar configurações de partículas válidas via builder fluente', () => {
      const cfg = ParticleConfigBuilder.at(150, 300)
        .count(40)
        .colors('#ff0000', '#00ff00')
        .speed(100, 250)
        .size(2, 6)
        .gravity(400)
        .asCircle(true)
        .build();

      expect(cfg.x).toBe(150);
      expect(cfg.y).toBe(300);
      expect(cfg.count).toBe(40);
      expect(cfg.colors).toEqual(['#ff0000', '#00ff00']);
      expect(cfg.gravity).toBe(400);
      expect(cfg.isCircle).toBe(true);
    });

    it('deve fornecer presets canônicos prontos para uso', () => {
      const blood = ParticleVfxPresets.bloodSplatter(10, 20).build();
      expect(blood.count).toBeGreaterThan(0);
      expect(blood.colors).toContain('#8a0303');
      expect(blood.isCircle).toBe(true);

      const levelUp = ParticleVfxPresets.levelUpBurst(50, 50).build();
      expect(levelUp.colors).toContain('#ffd700');
    });
  });

  describe('SpriteVisualBuilder', () => {
    it('deve configurar sprites com ancoragem, offsets e velocidade', () => {
      const sprite = SpriteVisualBuilder.create('assets/test.png')
        .frames(4, 48, 48)
        .speed(6)
        .anchor('bottom-center')
        .renderOffset(0, -10)
        .build();

      expect(sprite.imageSrc).toBe('assets/test.png');
      expect(sprite.frameCount).toBe(4);
      expect(sprite.frameWidth).toBe(48);
      expect(sprite.frameHeight).toBe(48);
      expect(sprite.animationSpeed).toBe(6);
      expect(sprite.anchor).toBe('bottom-center');
      expect(sprite.renderOffset).toEqual({ x: 0, y: -10 });
    });
  });

  describe('EventBindingBuilder', () => {
    it('deve registrar listeners e desvinculá-los no unbindAll sem vazamento', () => {
      const listeners: Record<string, any> = {};
      const mockEventManager: any = {
        on: vi.fn((event, handler) => { listeners[event] = handler; }),
        off: vi.fn((event, handler) => { delete listeners[event]; })
      };

      const handlerDeath = vi.fn();
      const binder = EventBindingBuilder.for(mockEventManager)
        .on('playerDied', handlerDeath);

      expect(mockEventManager.on).toHaveBeenCalledWith('playerDied', handlerDeath);
      expect(binder.activeBindings.length).toBe(1);

      binder.unbindAll();
      expect(mockEventManager.off).toHaveBeenCalledWith('playerDied', handlerDeath);
      expect(binder.activeBindings.length).toBe(0);
    });
  });

  describe('StorybookGuiBuilder', () => {
    it('deve gerar meta e story com wrapper e limpeza de containers', () => {
      const builder = StorybookGuiBuilder.forGui('HUD/Exemplo', () => ({
        container: document.createElement('div')
      }))
        .withBackground('#000000')
        .withContainerSelector('#exemplo-hud');

      const meta = builder.buildMeta();
      expect(meta.title).toBe('HUD/Exemplo');
      expect(typeof meta.render).toBe('function');

      const story = builder.buildDefaultStory();
      expect(story).toHaveProperty('args');
    });
  });

  describe('SmokeParticleTemplate', () => {
    it('deve instanciar SmokeParticleRenderer e desenhar com lóbulos sem estourar exceção', async () => {
      const { SmokeParticleRenderer, SmokeVfxPresets } = await import('../../../../adapters/web/templates/SmokeParticleTemplate');
      const renderer = SmokeParticleRenderer.create({ expandFactor: 3.0 });
      const mockCtx: any = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn()
      };

      const mockParticle: any = {
        x: 100,
        y: 200,
        size: 20,
        color: '#333333'
      };

      renderer.draw(mockCtx, mockParticle, 0.5);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalledWith(100, 200);
      expect(mockCtx.restore).toHaveBeenCalled();

      const chimneyPreset = SmokeVfxPresets.grimdarkChimney(0, 0).build();
      expect(chimneyPreset.gravity).toBeLessThan(0); // Empuxo para subir
    });
  });

  describe('FloatingTextTemplate', () => {
    it('deve calcular arco de subida e descarte de texto flutuante', async () => {
      const { FloatingTextBuilder, FloatingTextEntity } = await import('../../../../adapters/web/templates/FloatingTextTemplate');
      const config = FloatingTextBuilder.at(100, 100)
        .text('99!')
        .style('crit')
        .duration(0.5)
        .build();

      const entity = new FloatingTextEntity(config);
      expect(entity.color).toBe('#ffea00');
      expect(entity.fontSize).toBe(20);
      expect(entity.isDead).toBe(false);

      entity.update(0.25);
      expect(entity.y).toBeLessThan(100); // Subiu
      expect(entity.isDead).toBe(false);

      entity.update(0.3);
      expect(entity.isDead).toBe(true);
    });
  });

  describe('TooltipManagerTemplate', () => {
    it('deve gerenciar tooltip flutuante com clamping de tela', async () => {
      const { TooltipManagerTemplate } = await import('../../../../adapters/web/templates/TooltipManagerTemplate');
      const tooltip = TooltipManagerTemplate.getInstance();

      tooltip.show({
        title: 'Foice da Ruína',
        subtitle: 'Arma Ancestral',
        rarity: 'lendario',
        stats: [{ label: 'Dano', value: 120, isPositive: true }]
      }, 50, 50);

      const el = document.getElementById('global-game-tooltip');
      expect(el).not.toBeNull();
      expect(el?.innerHTML).toContain('Foice da Ruína');
      expect(el?.innerHTML).toContain('rarity-lendario');

      tooltip.hide();
      expect(el?.classList.contains('is-hidden')).toBe(true);
    });
  });

  describe('ScreenShakeTemplate', () => {
    it('deve computar offset de tremor e finalizar após a duração', async () => {
      const { ScreenShakeBuilder } = await import('../../../../adapters/web/templates/ScreenShakeTemplate');
      const shake = ScreenShakeBuilder.create()
        .intensity(10)
        .duration(0.2)
        .build();

      expect(shake.isFinished).toBe(false);
      shake.update(0.1);
      expect(shake.isFinished).toBe(false);
      expect(shake.offsetX !== 0 || shake.offsetY !== 0).toBe(true);

      shake.update(0.15);
      expect(shake.isFinished).toBe(true);
      expect(shake.offsetX).toBe(0);
      expect(shake.offsetY).toBe(0);
    });
  });

  describe('MinimapPinTemplate', () => {
    it('deve projetar alvos próximos dentro do radar e alvos distantes na borda', async () => {
      const { MinimapPinTemplate } = await import('../../../../adapters/web/templates/MinimapPinTemplate');
      
      // Alvo próximo
      const nearPin = MinimapPinTemplate.project({
        playerWorldX: 100,
        playerWorldY: 100,
        targetWorldX: 150,
        targetWorldY: 100,
        radarCenterX: 50,
        radarCenterY: 50,
        radarRadiusPx: 40
      });
      expect(nearPin.isOffscreen).toBe(false);

      // Alvo muito distante
      const farPin = MinimapPinTemplate.project({
        playerWorldX: 100,
        playerWorldY: 100,
        targetWorldX: 2000,
        targetWorldY: 2000,
        radarCenterX: 50,
        radarCenterY: 50,
        radarRadiusPx: 40
      });
      expect(farPin.isOffscreen).toBe(true);
      expect(farPin.angleToTargetRad).toBeCloseTo(Math.PI / 4, 1);
    });
  });

  describe('SoundFxAdapterTemplate', () => {
    it('deve gerenciar canais de volume e persistência', async () => {
      const { SoundFxAdapterTemplate } = await import('../../../../adapters/web/templates/SoundFxAdapterTemplate');
      const sound = SoundFxAdapterTemplate.getInstance();
      sound.setVolume('sfx', 0.75);
      expect(sound.getVolume('sfx')).toBe(0.75);
    });
  });
});
