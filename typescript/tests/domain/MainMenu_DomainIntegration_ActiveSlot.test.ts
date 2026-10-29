// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainFacade from '../../domain/DomainFacade';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import LoadoutTabController from '../../adapters/web/GUIS/mainMenuHudModule/partials/loadout/LoadoutTabController';

describe('Integracao de Save Ativo no Menu Principal e Dominio', () => {
  let eventManager: EventHandler;
  let domain: DomainFacade;
  let mockLogger: any;
  let mockCollisionService: any;

  beforeEach(() => {
    eventManager = new EventHandler();
    mockLogger = { log: vi.fn() };
    mockCollisionService = {
      isAreaFree: vi.fn().mockReturnValue(true),
      getCollisions: vi.fn().mockReturnValue([]),
      registerBody: vi.fn(),
      unregisterBody: vi.fn()
    };

    domain = new DomainFacade(
      { player: { id: 1, level: 1, initialPos: { x: 100, y: 100 } } },
      mockLogger,
      eventManager,
      mockCollisionService
    );
  });

  it('Gargalo A: deve possuir entidade player instanciada desde o boot sem depender de loadWorld()', () => {
    expect(domain.player).toBeDefined();
    expect(domain.player.attributes).toBeDefined();
    expect(domain.player.coordinates).toEqual({ x: 100, y: 100 });
  });

  it('Gargalo A: LoadoutTabController sincroniza do player do dominio sem erros e mantem slots corretos', () => {
    const container = document.createElement('div');
    const controller = new LoadoutTabController(container, domain as any);

    // Deve inicializar com 4 slots
    expect(controller.selectedActiveLoadout).toEqual([null, null, null, null]);
    expect(controller.selectedPassiveLoadout).toEqual([null, null, null, null]);

    // Simula equipamento de skill (desbloqueando antes de equipar)
    domain.player.unlockSkill('w_t1_strike');
    domain.player.equipSkillInLoadout('w_t1_strike', 0);
    controller.syncFromDomain();

    expect(controller.selectedActiveLoadout[0]).toBe('w_t1_strike');
  });

  it('Gargalo B: resetToInitialState limpa progresso, essencias, nos e skills do jogador', () => {
    // Aplica progresso avancado
    domain.metaProgressionManager.addEssence(5000);
    domain.player.restoreState({
      attributes: {
        level: 20,
        strength: 25,
        constitution: 25,
        dexterity: 20,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        hp: 250,
        maxHp: 250
      },
      activeLoadout: ['w_t1_strike', null, null, null]
    });

    // Reseta estado (selecionou slot vazio)
    domain.resetToInitialState();

    expect(domain.player.attributes.level).toBe(1);
    expect(domain.player.activeLoadout).toEqual([null, null, null, null]);
    const xpState = domain.metaProgressionManager.getXPState();
    expect(xpState.level).toBe(1);
  });

  it('Gargalo C: restoreGameState aceita formato AutoSave e formato Manual (com activeCheckpoint)', () => {
    const autoSavePayload = {
      slot: 1,
      playerState: {
        attributes: {
          level: 12,
          strength: 15,
          constitution: 15,
          dexterity: 12,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
          hp: 150,
          maxHp: 150
        },
        activeLoadout: ['w_t1_strike', 'w_t1_heavy_blow', null, null]
      },
      metaProgressionState: {
        globalEssence: 1200
      }
    };

    domain.restoreGameState(autoSavePayload);
    expect(domain.player.attributes.level).toBe(12);
    expect(domain.player.activeLoadout[0]).toBe('w_t1_strike');
    expect(domain.metaProgressionManager.getGlobalState().globalEssence).toBe(1200);

    const manualSavePayload = {
      slot: 2,
      activeCheckpoint: {
        mapId: 'vilgem',
        player: {
          attributes: {
            level: 25,
            strength: 30,
            constitution: 30,
            dexterity: 25,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
            hp: 300,
            maxHp: 300
          },
          activeLoadout: ['w_t3_berserk', null, null, null]
        },
        metaProgressionState: {
          globalEssence: 9000
        }
      }
    };

    domain.restoreGameState(manualSavePayload);
    expect(domain.player.attributes.level).toBe(25);
    expect(domain.player.activeLoadout[0]).toBe('w_t3_berserk');
    expect(domain.metaProgressionManager.getGlobalState().globalEssence).toBe(9000);
  });

  it('Gargalo B & C: passar data nulo para restoreGameState reseta o dominio para valores iniciais', () => {
    domain.player.restoreState({
      attributes: {
        level: 15,
        strength: 20,
        constitution: 20,
        dexterity: 15,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      }
    });
    domain.restoreGameState(null);

    expect(domain.player.attributes.level).toBe(1);
  });

  it('Gargalo D: getMetaProgressionState expoe o estado da meta-progressao e restoreGameState aceita fallback', () => {
    const initialEssence = domain.getMetaProgressionState().globalEssence;
    domain.metaProgressionManager.addEssence(3500);
    const metaState = domain.getMetaProgressionState();
    expect(metaState).toBeDefined();
    expect(metaState.globalEssence).toBe(initialEssence + 3500);

    domain.resetToInitialState();
    expect(domain.getMetaProgressionState().globalEssence).toBe(0);

    // Restaura com fallback de globalMetaSummary
    domain.restoreGameState({
      globalMetaSummary: {
        metaProgressionState: { globalEssence: 7700 }
      }
    });
    expect(domain.getMetaProgressionState().globalEssence).toBe(7700);
  });

  it('Gargalo E: LoadoutTabController sincroniza diretamente de slotData (syncFromSlotData)', () => {
    const container = document.createElement('div');
    const controller = new LoadoutTabController(container, domain as any);

    const slotPayload = {
      slot: 3,
      playerState: {
        globalActiveLoadout: ['brooch_active_meteor', 'brooch_active_heal', null, null],
        globalPassiveLoadout: ['brooch_luck', null, null, null]
      }
    };

    controller.syncFromSlotData(slotPayload);
    expect(controller.selectedActiveLoadout[0]).toBe('brooch_active_meteor');
    expect(controller.selectedActiveLoadout[1]).toBe('brooch_active_heal');
    expect(controller.selectedPassiveLoadout[0]).toBe('brooch_luck');
  });

  it('Meta-Progression: deve preservar a arvore gerada e os pontos gastos sem regenerar ou devolver pontos indevidamente', () => {
    // 1. Obtem a árvore gerada inicial
    const initialTree = domain.metaProgressionManager.getAvailableNodesMap();
    expect(initialTree.length).toBeGreaterThan(0);
    const baseNode = initialTree.find(n => n.level === 1);
    expect(baseNode).toBeDefined();

    // Adiciona XP para ter pontos
    domain.metaProgressionManager.addEssence(1000);
    const xpStateInitial = domain.metaProgressionManager.getXPState();
    expect(xpStateInitial.availablePoints).toBeGreaterThan(0);

    // Gasta 1 ponto e desbloqueia o nó
    domain.metaProgressionManager.spendEssence(1);
    domain.metaProgressionManager.unlockNode(baseNode!.id);

    const xpStateAfterUnlock = domain.metaProgressionManager.getXPState();
    expect(xpStateAfterUnlock.availablePoints).toBe(xpStateInitial.availablePoints - 1);

    // 2. Extrai estado global
    const savedGlobalState = domain.metaProgressionManager.getGlobalState();
    expect(savedGlobalState.generatedTree).toEqual(initialTree);
    expect(savedGlobalState.spentSkillPoints).toBe(1);
    expect(savedGlobalState.unlockedGlobalNodes).toContain(baseNode!.id);

    // 3. Recarrega o estado em um novo gerenciador ou re-carrega globalState
    domain.metaProgressionManager.loadGlobalState({
      globalEssence: savedGlobalState.globalEssence,
      purchasedPermanentNodes: savedGlobalState.purchasedPermanentNodes,
      unlockedBrooches: savedGlobalState.unlockedBrooches,
      unlockedGlobalNodes: savedGlobalState.unlockedGlobalNodes,
      generatedTree: savedGlobalState.generatedTree,
      spentSkillPoints: savedGlobalState.spentSkillPoints
    });

    // 4. Valida que a árvore NÃO mudou e os pontos NÃO foram devolvidos
    expect(domain.metaProgressionManager.getAvailableNodesMap()).toEqual(initialTree);
    const xpStateReloaded = domain.metaProgressionManager.getXPState();
    expect(xpStateReloaded.availablePoints).toBe(xpStateAfterUnlock.availablePoints);
    expect(domain.metaProgressionManager.getUnlockedNodes()).toContain(baseNode!.id);

    // 5. Simula save legado sem generatedTree: se a árvore já existe na memória, ela DEVE ser mantida
    domain.metaProgressionManager.loadGlobalState({
      globalEssence: savedGlobalState.globalEssence,
      unlockedGlobalNodes: savedGlobalState.unlockedGlobalNodes
    });
    expect(domain.metaProgressionManager.getAvailableNodesMap()).toEqual(initialTree);
  });

  it('Garantia de Save Novo: save novo inicia estritamente com ZERO broches', async () => {
    // 1. Simula que o domínio já tinha broches desbloqueados em uma sessão anterior
    domain.metaProgressionManager.unlockBrooch('brooch_sol_invictus');
    domain.player.equipGlobalActiveBrooch('brooch_sol_invictus', 0);
    expect(domain.globalMetaSummary.brooches.length).toBeGreaterThan(0);

    // 2. Agora cria um novo MainMenuGui e gera um novo slot (Slot 2)
    const MainMenuGui = (await import('../../adapters/web/GUIS/mainMenuHudModule/MainMenuGui')).default;
    const gui = new MainMenuGui(domain as any, () => {});
    await gui.initActiveSlotPromise;

    // 3. Cria um save padrão novo no Slot 2
    const newSlotPayload = await gui.createAndPersistDefaultSlot(2);

    // 4. Valida payload do save novo
    expect(newSlotPayload.globalMetaSummary.brooches).toEqual([]);
    expect(newSlotPayload.unlockedBrooches).toEqual([]);
    expect(newSlotPayload.metaProgressionState.unlockedBrooches).toEqual([]);
    expect(newSlotPayload.playerState.globalActiveLoadout).toEqual([null, null, null, null]);
    expect(newSlotPayload.playerState.passiveLoadout).toEqual([null, null, null, null]);

    // 5. Ativa o Slot 2 na interface
    await gui.setActiveSlot(2, true);

    // 6. Valida que o LoadoutTabController tem ZERO broches consolidados
    expect(gui.loadoutController.getConsolidatedBrooches()).toEqual([]);
    expect(gui.loadoutController.selectedActiveLoadout).toEqual([null, null, null, null]);
    expect(gui.loadoutController.selectedPassiveLoadout).toEqual([null, null, null, null]);

    // 7. Valida que a aba de estatísticas exibe 0 desbloqueados
    const broochesCounter = document.getElementById('stats-unlocked-brooches-count');
    if (broochesCounter) {
      expect(broochesCounter.textContent).toBe('0 Desbloqueados');
    }
  });
});
