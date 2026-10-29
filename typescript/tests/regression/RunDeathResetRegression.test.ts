// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import Warrior from '../../domain/ObjectModule/Entities/Player/Classes/Warrior';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve([]))
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {}))
}));

describe('Regressão de Roguelite: Reset de Run na Morte com Preservação da Árvore Global', () => {
  let eventManager: EventHandler;
  let mockLogger: any;
  let mockCollision: any;
  let savedData: any = null;
  let mockSaveRepo: any;
  let domain: DomainFacade;

  beforeEach(() => {
    savedData = null;
    eventManager = new EventHandler();
    mockLogger = { log: vi.fn() };
    mockCollision = {
      checkCollisions: vi.fn(),
      getPossibleCollisions: vi.fn(),
      updateEntityPosition: vi.fn(),
      removeEntity: vi.fn(),
      clear: vi.fn()
    };

    mockSaveRepo = {
      saveProgress: vi.fn(),
      loadProgress: vi.fn(),
      saveSlot: vi.fn(async (_slot: number, data: any) => {
        savedData = JSON.parse(JSON.stringify(data));
      }),
      loadSlot: vi.fn(async () => savedData)
    };

    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 1536, y: 1615 } } } as any,
      mockLogger,
      eventManager,
      mockCollision,
      undefined,
      undefined,
      mockSaveRepo
    );
  });

  it('Blindagem de Morte: O jogador morre, o XP da run é reivindicado na meta-progressão e o personagem reseta no level 1', () => {
    const player = domain.player;

    // Registra classe Guerreiro
    const dummyXpTable = {
      getLevelForXp: vi.fn(() => 1),
      getXpForLevel: vi.fn(() => 100),
      getMaxLevel: vi.fn(() => 50)
    };
    new Warrior(dummyXpTable as any, player, eventManager);
    player.unlockClass('Guerreiro');
    player.setActiveClass('Guerreiro');

    // 1. Desbloqueia nós na árvore global e equipa broche
    domain.metaProgressionManager.loadGlobalState({
      globalEssence: 500,
      purchasedPermanentNodes: [
        {
          id: 'global_node_str',
          name: 'Força Titânica (+4 FOR)',
          description: '+4 de Força',
          level: 1,
          cost: 100,
          dependencies: [],
          rarity: 'incomum',
          statType: 'str',
          statValue: 4
        }
      ],
      unlockedBrooches: ['brooch_reroll_master', 'brooch_active_heal']
    });

    // Aplica bônus globais e equipa broches
    domain.metaProgressionManager.applyGlobalBonuses(player.attributes);
    player.equipPassiveInLoadout('brooch_reroll_master', 0);
    player.equipGlobalActiveBrooch('brooch_active_heal', 0);

    expect(player.attributes.strength).toBe(14); // 10 base + 4 da árvore global
    expect(player.passiveLoadout[0]).toBe('brooch_reroll_master');
    expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');

    // 2. Progresso da Run 1: Sobe para level 5, ganha moedas, desbloqueia skill de run, ganha feat
    (player.attributes as any)._level = 5;
    player.coins = 250;
    player.inventory.backpack = [
      { id: 10, name: 'Armadura Pesada', type: 'chestplate' } as any,
      { id: 11, name: 'Espada Enferrujada', type: 'weapon' } as any
    ];
    player.equipmentManager.equipment.chestplate = { id: 10, name: 'Armadura Pesada', type: 'chestplate' } as any;
    player.equipmentManager.syncEquipedItens();
    player.unlockSkill('w_t1_strike');
    player.equipSkillInLoadout('w_t1_strike', 0);

    eventManager.dispatch('featAchieved', {
      featId: 'boss_goblin',
      name: 'Goblin Líder Derrotado',
      essenceReward: 150
    });

    const previousGlobalEssence = domain.metaProgressionManager.getGlobalState().globalEssence;

    // 3. Jogador Morre na Run 1
    eventManager.dispatch('playerDied', {});

    // [VERIFICAÇÃO 1: XP Reivindicado Corretamente]
    // Nível 5 = 250 XP + Feat 150 XP = 400 XP adicionados
    const summary = domain.metaProgressionManager.lastRunSummary;
    expect(summary).not.toBeNull();
    expect(summary?.breakdown.levelReward).toBe(250);
    expect(summary?.breakdown.featsReward).toBe(150);
    expect(summary?.totalReward).toBe(400);

    const currentGlobalEssence = domain.metaProgressionManager.getGlobalState().globalEssence;
    expect(currentGlobalEssence).toBe(previousGlobalEssence + 400);

    // [VERIFICAÇÃO 2: Reset do Personagem da Run]
    expect(player.attributes.level).toBe(1);
    expect(player.attributes.currentXp).toBe(0);
    expect(player.attributes.availablePoints).toBe(1);
    expect(player.inventory.backpack.length).toBe(0);
    expect(player.coins).toBe(0);
    expect(player.equipment.chestplate).toBeUndefined();
    expect(player.unlockedSkills.size).toBe(0);
    expect(player.activeLoadout[0]).toBeNull();

    // [VERIFICAÇÃO 3: O que FICA são as coisas da árvore global]
    // Bônus permanente de Força (+4) deve continuar ativo no nível 1
    expect(player.attributes.strength).toBe(14);
    // Broches equipados continuam equipados no loadout
    expect(player.passiveLoadout[0]).toBe('brooch_reroll_master');
    expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');
    // Estado motor não fica travado como 'dead'
    expect(player.state).toBe('idle');
    expect(player.attributes.hp).toBe(player.attributes.maxHp);
  });

  it('Persistência via AutoSave: O snapshot salvo após a morte reflete o reset da run e a essência atualizada', async () => {
    const player = domain.player;

    domain.metaProgressionManager.loadGlobalState({
      globalEssence: 200,
      purchasedPermanentNodes: [],
      unlockedBrooches: ['brooch_reroll_master']
    });
    player.equipPassiveInLoadout('brooch_reroll_master', 0);

    // Jogador chega ao nível 6 e junta 500 moedas
    (player.attributes as any)._level = 6;
    player.coins = 500;
    player.inventory.backpack = [{ id: 1, name: 'Item Efêmero' } as any];

    // Dispara a morte do jogador (o AutoSave imediato é acionado via playerDied)
    eventManager.dispatch('playerDied', {});

    // Aguarda o flush imediato
    await domain.flushAutoSave('testFlush');

    // O repositório deve ter recebido o snapshot com o estado limpo da run e XP atualizado
    expect(savedData).not.toBeNull();
    expect(savedData.metaProgressionState.globalEssence).toBe(200 + (6 * 50)); // 200 + 300 = 500 XP
    expect(savedData.playerState.attributes.level).toBe(1);
    expect(savedData.playerState.coins).toBe(0);
    expect(savedData.playerState.backpack.length).toBe(0);
    expect(savedData.playerState.classes.passiveLoadout[0]).toBe('brooch_reroll_master');

    // Simula restauração de um novo ciclo de jogo através do restoreGameState
    domain.restoreGameState(savedData);
    expect(domain.player.attributes.level).toBe(1);
    expect(domain.player.coins).toBe(0);
    expect(domain.player.passiveLoadout[0]).toBe('brooch_reroll_master');
    expect(domain.metaProgressionManager.getGlobalState().globalEssence).toBe(500);
  });
});
