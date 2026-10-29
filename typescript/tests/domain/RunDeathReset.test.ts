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

describe('Run Death Reset - Unidade do Domínio', () => {
  let eventManager: EventHandler;
  let mockLogger: any;
  let mockCollision: any;
  let domain: DomainFacade;

  beforeEach(() => {
    eventManager = new EventHandler();
    mockLogger = { log: vi.fn() };
    mockCollision = {
      checkCollisions: vi.fn(),
      getPossibleCollisions: vi.fn(),
      updateEntityPosition: vi.fn(),
      removeEntity: vi.fn(),
      clear: vi.fn()
    };

    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 500, y: 600 } } } as any,
      mockLogger,
      eventManager,
      mockCollision
    );
  });

  it('PlayerClassManager.resetRun deve limpar skills e loadout da run, preservando broches equipados', () => {
    const player = domain.player;
    const dummyXpTable = {
      getLevelForXp: vi.fn(() => 1),
      getXpForLevel: vi.fn(() => 100),
      getMaxLevel: vi.fn(() => 50)
    };
    new Warrior(dummyXpTable as any, player, eventManager);
    player.unlockClass('Guerreiro');
    player.setActiveClass('Guerreiro');

    // Desbloqueia e equipa skill da run
    player.unlockSkill('w_t1_strike');
    player.equipSkillInLoadout('w_t1_strike', 0);
    expect(player.unlockedSkills.has('w_t1_strike')).toBe(true);
    expect(player.activeLoadout[0]).toBe('w_t1_strike');

    // Equipa broches (árvore global)
    player.equipPassiveInLoadout('brooch_reroll_master', 0);
    player.equipGlobalActiveBrooch('brooch_active_heal', 0);
    expect(player.passiveLoadout[0]).toBe('brooch_reroll_master');
    expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');

    // Executa resetRun
    player.classManager.resetRun();

    // Skills da run devem ser resetadas
    expect(player.unlockedSkills.size).toBe(0);
    expect(player.activeLoadout[0]).toBeNull();

    // Broches no loadout devem permanecer equipados
    expect(player.passiveLoadout[0]).toBe('brooch_reroll_master');
    expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');
  });

  it('DomainFacade.resetRunState deve restaurar atributos base + bônus da árvore global e limpar inventário', () => {
    const player = domain.player;

    // Simula compras na árvore global de meta-progressão
    domain.metaProgressionManager.loadGlobalState({
      globalEssence: 1000,
      purchasedPermanentNodes: [
        {
          id: 'test_node_1',
          name: 'Vigor Ancestral (+5 CON)',
          description: '+5 de Constituição',
          level: 1,
          cost: 100,
          dependencies: [],
          rarity: 'raro',
          statType: 'con',
          statValue: 5
        }
      ],
      unlockedBrooches: ['brooch_reroll_master', 'brooch_active_heal']
    });

    // Equipa broches
    player.equipPassiveInLoadout('brooch_reroll_master', 0);
    player.equipGlobalActiveBrooch('brooch_active_heal', 0);

    // Simula progresso na run: sobe de nível, pega moedas, adiciona itens
    (player.attributes as any)._level = 7;
    player.coins = 350;
    player.inventory.backpack = [
      { id: 1, name: 'Espada de Ferro', type: 'weapon' } as any
    ];
    player.equipmentManager.equipment.mainHand = { id: 2, name: 'Machado da Run', type: 'weapon' } as any;
    player.equipmentManager.syncEquipedItens();
    player.unlockSkill('w_t1_strike');
    player.equipSkillInLoadout('w_t1_strike', 0);

    // Executa resetRunState
    domain.resetRunState();

    // 1. Nível deve voltar para 1
    expect(player.attributes.level).toBe(1);
    expect(player.attributes.currentXp).toBe(0);
    expect(player.attributes.availablePoints).toBe(1);

    // 2. Constituição deve ser a base (10) + o bônus permanente da árvore global (5) = 15
    expect(player.attributes.constitution).toBe(15);
    expect(player.attributes.hp).toBe(player.attributes.maxHp);

    // 3. Mochila, moedas e equipamentos devem ser limpos
    expect(player.inventory.backpack.length).toBe(0);
    expect(player.coins).toBe(0);
    expect(player.equipment.mainHand).toBeUndefined();

    // 4. Skills da run limpas, mas broches da árvore global mantidos
    expect(player.unlockedSkills.size).toBe(0);
    expect(player.activeLoadout[0]).toBeNull();
    expect(player.passiveLoadout[0]).toBe('brooch_reroll_master');
    expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');

    // 5. Estado do jogador vivo e coordenadas de spawn
    expect(player.state).toBe('idle');
    expect(player.coordinates.x).toBe(500);
    expect(player.coordinates.y).toBe(600);
  });

  it('Disparo de playerDied deve calcular XP da run antes de resetar e atualizar a essência global', () => {
    const player = domain.player;
    const initialEssence = domain.metaProgressionManager.getGlobalState().globalEssence;

    // Jogador chega ao nível 4 durante a run
    (player.attributes as any)._level = 4;
    player.coins = 120;
    player.inventory.backpack = [{ id: 99, name: 'Poção de Cura', type: 'consumable' } as any];

    const runResetSpy = vi.fn();
    eventManager.on('runResetCompleted', runResetSpy);

    // Dispara a morte do jogador
    eventManager.dispatch('playerDied', {});

    // 1. A recompensa de XP deve ter sido calculada com base no nível 4 (4 * 50 = 200 XP)
    expect(domain.metaProgressionManager.lastRunSummary).not.toBeNull();
    expect(domain.metaProgressionManager.lastRunSummary?.breakdown.levelReward).toBe(200);

    // 2. A essência global deve ter aumentado em 200
    const newEssence = domain.metaProgressionManager.getGlobalState().globalEssence;
    expect(newEssence).toBe(initialEssence + 200);

    // 3. O jogador agora está resetado no nível 1 para a próxima run
    expect(player.attributes.level).toBe(1);
    expect(player.inventory.backpack.length).toBe(0);
    expect(player.coins).toBe(0);
    expect(player.state).toBe('idle');
    expect(runResetSpy).toHaveBeenCalledTimes(1);
  });
});
