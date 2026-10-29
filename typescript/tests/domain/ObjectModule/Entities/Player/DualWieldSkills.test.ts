import { describe, it, expect, vi } from 'vitest';
import Player from '../../../../../../typescript/domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../../../../../typescript/domain/ObjectModule/Entities/Attributes';
import SimpleSword from '../../../../../../typescript/domain/ObjectModule/Items/Weapons/MeleeWeapons/SimpleSword';
import FishingRod from '../../../../../../typescript/domain/ObjectModule/Items/Weapons/RangedWeapons/FishingRod';
import ActionManager from '../../../../../../typescript/domain/eventDispacher/ActionManager';

describe('Dual-Wield & Secondary Weapon Skill Execution (Domain)', () => {
  const createMockEventManager = () => {
    const listeners: Record<string, Function[]> = {};
    return {
      listeners,
      on: vi.fn((event: string, cb: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      dispatch: vi.fn((event: string, payload: any) => {
        if (listeners[event]) {
          listeners[event].forEach(cb => cb(payload));
        }
      })
    };
  };

  it('deve bater com a espada normal e executar Fúria do Leviatã no slot 3 com vara de pesca na mão secundária', () => {
    const eventManager = createMockEventManager();
    const logger = { log: vi.fn() };

    const player = new Player(
      1,
      { x: 100, y: 100 },
      new Attributes(8, 10, 10, 10, 10, 10, 10, 10),
      eventManager as any
    );

    const actionManager = new ActionManager(player, logger as any, eventManager as any);

    const sword = new SimpleSword(); // unlocksClass: 'Guerreiro'
    const fishingRod = new FishingRod(); // unlocksClass: 'Pescador'

    // 1. Equipa Espada na mão principal
    player.backpack.push(sword);
    player.equipItem(0);

    expect(player.equipment.mainHand).toBe(sword);
    expect(player.activeClass).toBe('Guerreiro');

    // 2. Equipa Vara de Pesca na mão secundária
    player.backpack.push(fishingRod);
    player.equipItem(0);

    expect(player.equipment.secondHand).toBe(fishingRod);
    // A classe ativa básica continua sendo Guerreiro para o ataque normal de espada!
    expect(player.activeClass).toBe('Guerreiro');
    // A classe Pescador foi desbloqueada pela vara
    expect(player.unlockedClasses).toContain('Pescador');

    // 3. Desbloqueia e equipa Fúria do Leviatã no slot 3 do Loadout
    player.unlockSkill('pesc_t3_leviata');
    player.equipSkillInLoadout('pesc_t3_leviata', 2); // índice 2 = slot 3
    expect(player.activeLoadout[2]).toBe('pesc_t3_leviata');

    // 4. Executa o comando da tecla 3 (slot_3)
    const mouseTarget = { x: 300, y: 300 };
    actionManager.checkEvent(['slot_3'], mouseTarget);

    // Deve ter invocado o spawn do Leviatã com sucesso!
    expect(eventManager.dispatch).toHaveBeenCalledWith('spawn', expect.objectContaining({
      type: 'spawn-leviatã',
      coordinates: mouseTarget
    }));

    // 5. Ataque normal com clique esquerdo continua funcionando na espada do Guerreiro
    player.update(0.1);
    expect(player.activeClass).toBe('Guerreiro');
  });

  it('deve bloquear a habilidade da mão secundária caso a arma secundária seja desequipada', () => {
    const eventManager = createMockEventManager();
    const logger = { log: vi.fn() };

    const player = new Player(
      1,
      { x: 100, y: 100 },
      new Attributes(8, 10, 10, 10, 10, 10, 10, 10),
      eventManager as any
    );

    const actionManager = new ActionManager(player, logger as any, eventManager as any);
    const sword = new SimpleSword();
    const fishingRod = new FishingRod();

    player.backpack.push(sword);
    player.equipItem(0);
    player.backpack.push(fishingRod);
    player.equipItem(0);

    player.unlockSkill('pesc_t3_leviata');
    player.equipSkillInLoadout('pesc_t3_leviata', 2);

    // Desequipa a vara de pesca
    player.unequipItem('secondHand');
    expect(player.equipment.secondHand).toBeUndefined();

    // Tenta usar o slot 3 sem a arma secundária correspondente
    actionManager.checkEvent(['slot_3'], { x: 200, y: 200 });

    expect(eventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      channel: 'error',
      message: expect.stringContaining("requer a classe 'Pescador'")
    }));
  });

  it('deve bloquear Fan the Hammer se a arma do Gunslinger estiver na mão secundária mas a skill exigir arma na main hand', () => {
    const eventManager = createMockEventManager();
    const logger = { log: vi.fn() };

    const player = new Player(
      1,
      { x: 100, y: 100 },
      new Attributes(8, 10, 10, 10, 10, 10, 10, 10),
      eventManager as any
    );

    const actionManager = new ActionManager(player, logger as any, eventManager as any);
    const sword = new SimpleSword(); // unlocksClass: 'Guerreiro'
    const gun = {
      name: 'Revolver',
      category: 'weapon',
      unlocksClass: 'Gunslinger',
      durability: 100
    } as any;

    // 1. Equipa Espada na mainHand
    player.backpack.push(sword);
    player.equipItem(0);
    expect(player.equipment.mainHand).toBe(sword);

    // 2. Equipa Arma na secondHand
    player.backpack.push(gun);
    player.equipItem(0);
    expect(player.equipment.secondHand).toBe(gun);
    expect(player.unlockedClasses).toContain('Gunslinger');

    // 3. Desbloqueia e equipa Fan the Hammer no slot 1
    player.unlockSkill('gs_t2_fanhammer');
    player.equipSkillInLoadout('gs_t2_fanhammer', 0);

    // 4. Dispara slot_1: Mesmo tendo a arma do Gunslinger na secondHand, Fan the Hammer EXIGE a arma na mainHand!
    actionManager.checkEvent(['slot_1'], { x: 200, y: 200 });

    expect(eventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      channel: 'error',
      message: expect.stringContaining("requer a arma da classe 'Gunslinger' equipada na mão principal")
    }));

    // 5. Agora desequipa a espada e equipa o revólver na mainHand
    player.unequipItem('mainHand');
    player.unequipItem('secondHand');
    player.backpack.length = 0;
    player.backpack.push(gun);
    player.equipItem(0);
    expect(player.equipment.mainHand).toBe(gun);

    // 6. Dispara novamente: Agora deve ser executado com sucesso!
    actionManager.checkEvent(['slot_1'], { x: 200, y: 200 });
    expect(eventManager.dispatch).toHaveBeenCalledWith('log', expect.objectContaining({
      channel: 'domain',
      message: expect.stringContaining("[Gunslinger] Habilidade gs_t2_fanhammer executada com sucesso")
    }));
  });
});
