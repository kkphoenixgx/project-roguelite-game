import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActionManager from '../../../domain/eventDispacher/ActionManager';
import { ClassActionBindings } from '../../../domain/eventDispacher/ActionBindings';
import type Player from '../../../domain/ObjectModule/Entities/Player/Player';
import type { ILogger } from '../../../domain/ports/ILogger';
import type { IEventManager } from '../../../domain/eventDispacher/IGameEvents';

class MockLogger implements ILogger {
  log = vi.fn();
}

class MockEventManager implements IEventManager {
  private listeners: Record<string, Function[]> = {};
  on = vi.fn((key, cb) => {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(cb);
  });
  dispatch = vi.fn((key, payload) => {
    this.listeners[key]?.forEach(cb => cb(payload));
  });
}

describe('ActionManager', () => {
  let player: any;
  let logger: MockLogger;
  let eventManager: MockEventManager;
  let actionManager: ActionManager;

  beforeEach(() => {
    ClassActionBindings.clear();
    
    player = {
      constructor: { name: 'PlayerClass' },
      activeClass: 'WarriorClass',
      classes: [{
        constructor: { name: 'WarriorClass' },
        slash: vi.fn(),
        name: 'WarriorClass'
      }],
      activeLoadout: ['magicMissile', null, null, null],
      executeActiveSkill: vi.fn(),
      moveUp: vi.fn()
    };

    // Forçando a simulação dos Bindings que teriam sido gerados via Decorator no Runtime
    const pBindings = new Map();
    pBindings.set('up', 'moveUp');
    ClassActionBindings.set('PlayerClass', pBindings);

    const wBindings = new Map();
    wBindings.set('spell_1', 'slash');
    ClassActionBindings.set('WarriorClass', wBindings);

    logger = new MockLogger();
    eventManager = new MockEventManager();
    actionManager = new ActionManager(player as unknown as Player, logger, eventManager);
  });

  it('deve rotear uma ação básica da classe do Player', () => {
    actionManager.checkEvent(['up'], { x: 10, y: 10 });
    expect(player.moveUp).toHaveBeenCalledOnce();
    expect(player.moveUp).toHaveBeenCalledWith({ x: 10, y: 10 }, 'up');
  });

  it('deve rotear uma ação sobrescrita/adicionada pela Classe Ativa do Player', () => {
    actionManager.checkEvent(['spell_1'], { x: 20, y: 20 });
    expect(player.classes[0].slash).toHaveBeenCalledOnce();
    expect(player.classes[0].slash).toHaveBeenCalledWith({ x: 20, y: 20 }, 'spell_1');
  });

  it('deve rotear ações dinâmicas de Loadout (Deck Building) para executeActiveSkill', () => {
    actionManager.checkEvent(['slot_1'], { x: 30, y: 30 });
    expect(player.executeActiveSkill).toHaveBeenCalledOnce();
    expect(player.executeActiveSkill).toHaveBeenCalledWith('magicMissile', { x: 30, y: 30 });
  });

  it('não deve fazer nada se o slot de Loadout estiver vazio', () => {
    actionManager.checkEvent(['slot_2'], { x: 30, y: 30 });
    expect(player.executeActiveSkill).not.toHaveBeenCalled();
  });

  it('deve reconstruir os bindings ao receber o evento classChanged', () => {
    player.activeClass = 'MageClass';
    player.classes.push({
      constructor: { name: 'MageClass' },
      castMagic: vi.fn(),
      name: 'MageClass'
    });

    const mBindings = new Map();
    mBindings.set('spell_1', 'castMagic');
    ClassActionBindings.set('MageClass', mBindings);

    eventManager.dispatch('classChanged', {} as any);

    // O botão 'spell_1' agora deve acionar o MageClass e não mais o WarriorClass
    actionManager.checkEvent(['spell_1'], { x: 40, y: 40 });
    expect(player.classes[1].castMagic).toHaveBeenCalledOnce();
    expect(player.classes[0].slash).not.toHaveBeenCalled();
  });

  it('deve disparar portalInteract vazio quando nenhuma prompt de portal estiver ativa', () => {
    actionManager.checkEvent(['interact'], { x: 0, y: 0 });
    expect(eventManager.dispatch).toHaveBeenCalledWith('portalInteract', {});
  });

  it('deve calcular o portal mais próximo por distância euclidiana e enviar { portalId } no evento interact', () => {
    player.coordinates = { x: 100, y: 100 };

    // Portal distante (id 1 em 500, 500)
    eventManager.dispatch('portalPromptShow', {
      portalId: 1,
      coordinates: { x: 500, y: 500 }
    });

    // Portal próximo (id 2 em 110, 105)
    eventManager.dispatch('portalPromptShow', {
      portalId: 2,
      coordinates: { x: 110, y: 105 }
    });

    actionManager.checkEvent(['interact'], { x: 0, y: 0 });
    expect(eventManager.dispatch).toHaveBeenCalledWith('portalInteract', { portalId: 2 });
  });

  it('deve remover portal inativo ao receber portalPromptHide', () => {
    player.coordinates = { x: 100, y: 100 };

    eventManager.dispatch('portalPromptShow', {
      portalId: 1,
      coordinates: { x: 110, y: 100 }
    });
    eventManager.dispatch('portalPromptShow', {
      portalId: 2,
      coordinates: { x: 200, y: 200 }
    });

    // Esconde o portal 1
    eventManager.dispatch('portalPromptHide', { portalId: 1 });

    actionManager.checkEvent(['interact'], { x: 0, y: 0 });
    expect(eventManager.dispatch).toHaveBeenCalledWith('portalInteract', { portalId: 2 });
  });

  it('deve limpar portais ativos ao transicionar mapa', () => {
    eventManager.dispatch('portalPromptShow', {
      portalId: 1,
      coordinates: { x: 100, y: 100 }
    });

    eventManager.dispatch('mapTransitionRequested', {} as any);

    actionManager.checkEvent(['interact'], { x: 0, y: 0 });
    expect(eventManager.dispatch).toHaveBeenCalledWith('portalInteract', {});
  });

  it('deve limpar portais ativos ao completar a transição de mapa (mapTransitionCompleted)', () => {
    eventManager.dispatch('portalPromptShow', {
      portalId: 1,
      coordinates: { x: 100, y: 100 }
    });

    eventManager.dispatch('mapTransitionCompleted', {} as any);

    actionManager.checkEvent(['interact'], { x: 0, y: 0 });
    expect(eventManager.dispatch).toHaveBeenCalledWith('portalInteract', {});
  });

  it('deve executar broche ativo nos slots 5 a 8 quando executeActiveBrooch estiver definido', () => {
    player.globalActiveLoadout = ['brooch_vampiric', 'brooch_shield'];
    player.executeActiveBrooch = vi.fn();

    // slot_5 mapeia para índice 0 de brooch
    actionManager.checkEvent(['slot_5' as any], { x: 50, y: 60 });
    expect(player.executeActiveBrooch).toHaveBeenCalledWith('brooch_vampiric', { x: 50, y: 60 });

    // slot_6 mapeia para índice 1 de brooch
    actionManager.checkEvent(['slot_6' as any], { x: 70, y: 80 });
    expect(player.executeActiveBrooch).toHaveBeenCalledWith('brooch_shield', { x: 70, y: 80 });
  });

  it('não deve quebrar se o slot de broche 5 a 8 estiver vazio ou executeActiveBrooch for ausente', () => {
    player.globalActiveLoadout = [null, null];
    player.executeActiveBrooch = vi.fn();

    actionManager.checkEvent(['slot_5' as any], { x: 10, y: 10 });
    expect(player.executeActiveBrooch).not.toHaveBeenCalled();
  });

  it('deve executar habilidade primordial ao acionar spell_f caso executePrimordialSkill esteja definido', () => {
    player.executePrimordialSkill = vi.fn();

    actionManager.checkEvent(['spell_f' as any], { x: 15, y: 25 });
    expect(player.executePrimordialSkill).toHaveBeenCalledWith({ x: 15, y: 25 });
  });

  it('deve logar evento não gerenciado quando ação desconhecida for enviada', () => {
    actionManager.checkEvent(['unknown_action_xyz' as any], { x: 0, y: 0 });
    expect(eventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      channel: 'actions',
      message: '(ActionManager) event not managed: unknown_action_xyz'
    }));
  });

  it('deve lidar graciosamente quando player não tem classe ativa correspondente', () => {
    player.activeClass = 'NonExistentClass';
    // Reconstrói bindings via classChanged
    eventManager.dispatch('classChanged', {} as any);
    expect(logger.log).toHaveBeenCalledWith('actions', expect.stringContaining("Nenhuma classe ativa definida ou em transição ('NonExistentClass')"));
  });
});