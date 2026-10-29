// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import ActionManager from '../../domain/eventDispacher/ActionManager';
import Warrior from '../../domain/ObjectModule/Entities/Player/Classes/Warrior';
import MainMenuGui from '../../adapters/web/GUIS/mainMenuHudModule/MainMenuGui';
import LoadoutTabController from '../../adapters/web/GUIS/mainMenuHudModule/partials/loadout/LoadoutTabController';
import CharacterMenuGui from '../../adapters/web/GUIS/characterMenuHudModule/CharacterMenuGui';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve([]))
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => {}))
}));

describe('Testes de Regressao - Casos de Requisitos Solicitados pelo Usuario', () => {
    let eventManager: EventHandler;
    let mockLogger: any;
    let player: Player;
    let actionManager: ActionManager;

    beforeEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
        eventManager = new EventHandler();
        mockLogger = { log: vi.fn() };
        player = new Player(1, { x: 100, y: 100 }, new Attributes(10, 10, 10, 10, 10, 10, 10, 10), eventManager);
        actionManager = new ActionManager(player, mockLogger, eventManager);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    // =========================================================================
    // CASO 1: Habilidades e broches podem ser ativados em movimento (sem travar)
    // =========================================================================
    describe('Caso 1: Ativacao de Habilidades e Broches em Movimento', () => {
        it('deve permitir ativar habilidades ativas (slots 1-4) enquanto o jogador se move', () => {
            const dummyXpTable = {
                getLevelForXp: vi.fn(() => 1),
                getXpForLevel: vi.fn(() => 100),
                getMaxLevel: vi.fn(() => 50)
            };
            new Warrior(dummyXpTable as any, player, eventManager);
            player.unlockClass('Guerreiro');
            player.setActiveClass('Guerreiro');

            // Desbloqueia e equipa habilidade no slot 1
            player.unlockSkill('w_t1_strike');
            player.equipSkillInLoadout('w_t1_strike', 0);
            expect(player.activeLoadout[0]).toBe('w_t1_strike');

            const executeSkillSpy = vi.spyOn(player, 'executeActiveSkill');

            // Simula acionamento conjunto de movimento ('up', 'right') e tecla de habilidade ('slot_1')
            actionManager.checkEvent(['up', 'right', 'slot_1'], { x: 250, y: 180 });

            // A habilidade deve ter sido executada mesmo com o movimento ativo simultaneamente
            expect(executeSkillSpy).toHaveBeenCalledTimes(1);
            expect(executeSkillSpy).toHaveBeenCalledWith('w_t1_strike', { x: 250, y: 180 });
        });

        it('deve permitir acionar broches ativos (slots 5-8) em pleno deslocamento sem exigir estar parado', () => {
            player.equipGlobalActiveBrooch('brooch_active_heal', 0); // Tecla 5 / slot_5
            player.equipGlobalActiveBrooch('brooch_active_dash', 1); // Tecla 6 / slot_6

            expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');
            expect(player.globalActiveLoadout[1]).toBe('brooch_active_dash');

            const executeBroochSpy = vi.spyOn(player, 'executeActiveBrooch');

            // Dispara movimento para a esquerda juntamente com o broche no slot_5
            actionManager.checkEvent(['left', 'slot_5'], { x: 50, y: 100 });
            expect(executeBroochSpy).toHaveBeenCalledWith('brooch_active_heal', { x: 50, y: 100 });

            // Dispara movimento para baixo juntamente com o broche no slot_6
            actionManager.checkEvent(['down', 'slot_6'], { x: 100, y: 300 });
            expect(executeBroochSpy).toHaveBeenCalledWith('brooch_active_dash', { x: 100, y: 300 });

            expect(executeBroochSpy).toHaveBeenCalledTimes(2);
        });
    });

    // =========================================================================
    // CASO 2: Broche equipado no menu refletido na tecla de atalho e in-game
    // =========================================================================
    describe('Caso 2: Sincronizacao de Broche Equipado entre Menu, Teclas e Character Menu', () => {
        it('deve sincronizar o broche do loadout para as teclas 5-8 e refletir no CharacterMenuGui', () => {
            const container = document.createElement('div');
            container.id = 'tab-loadout';
            document.body.appendChild(container);

            const mockDomain: any = {
                globalMetaSummary: {
                    brooches: [
                        { id: 'brooch_active_heal', name: 'Curativo Ancestral', type: 'ativo', description: 'Cura vida.', tags: ['cura', 'ativo'] }
                    ]
                },
                getPlayerState: vi.fn(() => ({
                    globalActiveLoadout: ['brooch_active_heal', null, null, null],
                    passiveLoadout: [null, null, null, null],
                    backpack: [],
                    equipment: {},
                    attributes: { level: 1, strength: 10, dexterity: 10, intelligence: 10, constitution: 10, wisdom: 10, charisma: 10, availablePoints: 0 }
                })),
                getInventory: vi.fn(() => ({ items: [] })),
                subscribe: vi.fn()
            };

            const loadoutController = new LoadoutTabController(container, mockDomain);
            // Simula configuracao do broche no slot 0 do menu de loadout
            loadoutController.selectedActiveLoadout[0] = 'brooch_active_heal';

            // Propaga para a entidade de player (fluxo executado pelo GameAdapter)
            player.equipGlobalActiveBrooch(loadoutController.selectedActiveLoadout[0]!, 0);

            // 1. Validacao na Tecla: Tecla 5 (slot_5) dispara a execucao do broche configurado
            const executeSpy = vi.spyOn(player, 'executeActiveBrooch');
            actionManager.checkEvent(['slot_5'], { x: 300, y: 300 });
            expect(executeSpy).toHaveBeenCalledWith('brooch_active_heal', { x: 300, y: 300 });

            // 2. Validacao no Character Menu: renderizacao in-game exibe o broche no slot 5 e na lista de broches
            const characterMenu = new CharacterMenuGui(mockDomain, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {});
            characterMenu.toggle();
            characterMenu.update({
                globalActiveLoadout: ['brooch_active_heal', null, null, null],
                passiveLoadout: [null, null, null, null],
                backpack: [],
                equipment: {},
                attributes: { level: 1, strength: 10, dexterity: 10, intelligence: 10, constitution: 10, wisdom: 10, charisma: 10, availablePoints: 0 },
                derivedAttributes: {
                    hp: 20, maxHp: 20, mana: 100, maxMana: 100, hpRegen: 1, manaRegen: 1, defence: 5, speed: 100,
                    critChance: 5, critDamage: 150, dodge: 2, accuracy: 5, recharge: 2, piercing: 1, splashDamage: 2,
                    tenacity: 5, vigor: 5, lucky: 1, insight: 1
                }
            } as any);

            const activeSlotsContainer = document.querySelector('#global-active-brooch-slots');
            expect(activeSlotsContainer).not.toBeNull();
            const slot5 = activeSlotsContainer?.querySelector('.sun-brooch-slot.filled');
            expect(slot5).not.toBeNull();
            expect(slot5?.getAttribute('data-tooltip')).toContain('BROCHE ATIVO [TECLA 5]');

            // Verifica indicacao de broche equipado na lista de broches disponiveis
            const availableBroochesContainer = document.querySelector('#global-available-brooches-list');
            const equippedItem = availableBroochesContainer?.querySelector('.available-brooch-item.is-equipped');
            expect(equippedItem).not.toBeNull();
            expect(equippedItem?.getAttribute('data-tooltip')).toContain('[EQUIPADO no slot 5]');
        });
    });

    // =========================================================================
    // CASO 3: Exibicao correta do numero de broches e ciclos nos slots do System
    // =========================================================================
    describe('Caso 3: Contagem Real de Broches e Ciclos nos Slots do System', () => {
        it('deve exibir fielmente os ciclos e broches nos cards e no banner ativo do System', async () => {
            const slot1Data = {
                slot: 1,
                characterName: 'Heroi de Teste 1',
                cycle: 3,
                world: 'Vilgem',
                savedAt: '15/10 14:00',
                metaProgressionState: {
                    unlockedBrooches: ['brooch_active_heal', 'brooch_phoenix']
                },
                globalMetaSummary: {
                    brooches: ['brooch_active_heal', 'brooch_phoenix'],
                    stats: []
                }
            };

            const slot2Data = {
                slot: 2,
                characterName: 'Heroi de Teste 2',
                cycle: 8,
                world: 'Alun',
                savedAt: '15/10 15:30',
                metaProgressionState: {
                    unlockedBrooches: ['brooch_active_heal', 'brooch_active_dash', 'brooch_phoenix']
                },
                globalMetaSummary: {
                    brooches: ['brooch_active_heal', 'brooch_active_dash', 'brooch_phoenix'],
                    stats: []
                }
            };

            localStorage.setItem('game_slot_1', JSON.stringify(slot1Data));
            localStorage.setItem('game_slot_2', JSON.stringify(slot2Data));

            const mockDomain: any = {
                globalMetaSummary: slot1Data.globalMetaSummary,
                unlockedGlobalNodes: [],
                globalNodesMap: {},
                getAvailableWorlds: () => []
            };

            const gui = new MainMenuGui(mockDomain, vi.fn());
            await (gui as any).setupSaveSystem();

            // Aguarda renderizacao dos cards
            await vi.waitFor(() => {
                const card1 = document.querySelector('.ds-slot-card[data-slot="1"]');
                const card2 = document.querySelector('.ds-slot-card[data-slot="2"]');
                expect(card1).not.toBeNull();
                expect(card2).not.toBeNull();
                expect(card1?.innerHTML).toContain('Ciclo:</strong> 3');
                expect(card1?.innerHTML).toContain('Broches:</strong> 2');
                expect(card2?.innerHTML).toContain('Ciclo:</strong> 8');
                expect(card2?.innerHTML).toContain('Broches:</strong> 3');
            });

            // Ativa o Slot 2 e verifica o banner do sistema
            await gui.setActiveSlot(2, true);
            const bannerDetails = document.querySelector('#ds-active-slot-details');
            expect(bannerDetails?.textContent).toContain('Ciclo 8');
            expect(bannerDetails?.textContent).toContain('Local: Alun');
        });
    });

    // =========================================================================
    // CASO 4: Save novo inicia estritamente sem broches
    // =========================================================================
    describe('Caso 4: Save Novo Inicia Estritamente Sem Broches', () => {
        it('deve gerar payload de novo save com zero broches desbloqueados e nenhum equipado', async () => {
            const mockDomain: any = {
                globalMetaSummary: { stats: [], brooches: [] },
                unlockedGlobalNodes: [],
                globalNodesMap: {},
                getAvailableWorlds: () => [],
                metaProgressionManager: {
                    getGlobalState: () => ({
                        unlockedBrooches: [],
                        purchasedPermanentNodes: [],
                        unlockedGlobalNodes: [],
                        spentSkillPoints: 0
                    }),
                    getXPState: () => ({
                        currentEssence: 0,
                        requiredEssence: 100,
                        currentLevel: 1
                    })
                },
                resetToInitialState: vi.fn(),
                serializePlayerState: () => ({
                    level: 1,
                    attributes: { level: 1 },
                    classes: { activeClass: 'Aventureiro', unlockedClasses: ['Aventureiro'] }
                })
            };

            const gui = new MainMenuGui(mockDomain, vi.fn());

            // 1. Verifica payload gerado para criacao de save limpo
            const defaultPayload = gui.createDefaultSlotPayload(3);

            expect(defaultPayload.unlockedBrooches).toEqual([]);
            expect(defaultPayload.globalMetaSummary.brooches).toEqual([]);
            expect(defaultPayload.globalActiveLoadout).toEqual([null, null, null, null]);
            expect(defaultPayload.passiveLoadout).toEqual([null, null, null, null]);
            expect(defaultPayload.cycle).toBe(1);

            // 2. Cria e persiste o slot 3
            await gui.createAndPersistDefaultSlot(3);
            const rawStored = localStorage.getItem('game_slot_3');
            expect(rawStored).not.toBeNull();
            const stored = JSON.parse(rawStored!);

            expect(stored.unlockedBrooches).toHaveLength(0);
            expect(stored.globalMetaSummary.brooches).toHaveLength(0);
            expect(stored.globalActiveLoadout).toEqual([null, null, null, null]);
            expect(stored.passiveLoadout).toEqual([null, null, null, null]);

            // 3. Ao sincronizar o LoadoutTabController com o novo save, nenhum broche deve estar presente
            const loadoutContainer = document.createElement('div');
            const loadoutCtrl = new LoadoutTabController(loadoutContainer, {
                globalMetaSummary: stored.globalMetaSummary
            } as any);

            expect(loadoutCtrl.selectedActiveLoadout).toEqual([null, null, null, null]);
            expect(loadoutCtrl.selectedPassiveLoadout).toEqual([null, null, null, null]);
            const availableItems = loadoutContainer.querySelectorAll('.brooch-inventory-item');
            expect(availableItems.length).toBe(0);
        });
    });

    // =========================================================================
    // CASO 5: Criacao e Isolamento de Ate 5 Slots de Save Independentes
    // =========================================================================
    describe('Caso 5: Criacao e Isolamento de Ate 5 Slots Independentes', () => {
        it('deve suportar ate 5 slots de save sem contaminacao mutua e com identificadores exclusivos', async () => {
            const mockDomain: any = {
                globalMetaSummary: { stats: [], brooches: [] },
                unlockedGlobalNodes: [],
                globalNodesMap: {},
                getAvailableWorlds: () => [],
                metaProgressionManager: {
                    getGlobalState: () => ({
                        unlockedBrooches: [],
                        purchasedPermanentNodes: [],
                        unlockedGlobalNodes: [],
                        spentSkillPoints: 0
                    }),
                    getXPState: () => ({
                        currentEssence: 0,
                        requiredEssence: 100,
                        currentLevel: 1
                    })
                },
                resetToInitialState: vi.fn(),
                serializePlayerState: () => ({
                    level: 1,
                    attributes: { level: 1 }
                })
            };

            const gui = new MainMenuGui(mockDomain, vi.fn());
            await gui.initActiveSlotPromise;

            // Cria saves nos slots 1 a 5 sequencialmente
            for (let slot = 1; slot <= 5; slot++) {
                await gui.createAndPersistDefaultSlot(slot);
            }

            // Valida persistencia independente de cada um dos 5 slots
            const savedSlots: any[] = [];
            for (let slot = 1; slot <= 5; slot++) {
                const raw = localStorage.getItem(`game_slot_${slot}`);
                expect(raw).not.toBeNull();
                const parsed = JSON.parse(raw!);
                expect(parsed.slot).toBe(slot);
                expect(parsed.saveId).toContain(`save_slot_${slot}_`);
                savedSlots.push(parsed);
            }

            // Garante que cada saveId gerado eh estritamente unico
            const saveIds = savedSlots.map(s => s.saveId);
            const uniqueSaveIds = new Set(saveIds);
            expect(uniqueSaveIds.size).toBe(5);

            // Modifica apenas o Slot 1 com dados avancados
            savedSlots[0].cycle = 15;
            savedSlots[0].characterName = 'Veterano Lendario';
            localStorage.setItem('game_slot_1', JSON.stringify(savedSlots[0]));
            (gui as any).activeSlotData = savedSlots[0];

            // Verifica que o Slot 2 permanece intacto com seus proprios dados
            const slot2Raw = localStorage.getItem('game_slot_2');
            const slot2Parsed = JSON.parse(slot2Raw!);
            expect(slot2Parsed.cycle).toBe(1);
            expect(slot2Parsed.characterName).toBe('Sonhador 2 (Nvl 1)');

            // Renderiza os slots e valida a presenca dos 5 cards independentes
            await (gui as any).setupSaveSystem();
            await vi.waitFor(() => {
                const card1 = document.querySelector('.ds-slot-card[data-slot="1"]');
                const card2 = document.querySelector('.ds-slot-card[data-slot="2"]');
                expect(card1).not.toBeNull();
                expect(card2).not.toBeNull();
                expect(card1?.textContent).toContain('Veterano Lendario');
                expect(card1?.textContent).toContain('Ciclo: 15');
                expect(card2?.textContent).toContain('Sonhador 2');
                expect(card2?.textContent).toContain('Ciclo: 1');
            });
        });

        it('o botao de criacao rapida no cabecalho deve encontrar o proximo slot vago e criar o save', async () => {
            // Preenche apenas o Slot 1
            localStorage.setItem('game_slot_1', JSON.stringify({
                slot: 1,
                characterName: 'Aventureiro 1',
                cycle: 1,
                saveId: 'save_slot_1_test'
            }));

            const mockDomain: any = {
                globalMetaSummary: { stats: [], brooches: [] },
                unlockedGlobalNodes: [],
                globalNodesMap: {},
                getAvailableWorlds: () => [],
                metaProgressionManager: {
                    getGlobalState: () => ({
                        unlockedBrooches: [],
                        purchasedPermanentNodes: [],
                        unlockedGlobalNodes: [],
                        spentSkillPoints: 0
                    }),
                    getXPState: () => ({
                        currentEssence: 0,
                        requiredEssence: 100,
                        currentLevel: 1
                    })
                },
                resetToInitialState: vi.fn(),
                serializePlayerState: () => ({ level: 1 })
            };

            const gui = new MainMenuGui(mockDomain, vi.fn());
            await (gui as any).setupSaveSystem();

            // Simula clique no botao "+ Novo Save" do cabecalho do system
            const btnCreateSlotSave = document.querySelector('#btn-create-slot-save') as HTMLButtonElement;
            expect(btnCreateSlotSave).not.toBeNull();

            // O proximo slot vago eh o 2
            btnCreateSlotSave.click();

            // Aguarda criacao e renderizacao do Slot 2
            await vi.waitFor(() => {
                const slot2Raw = localStorage.getItem('game_slot_2');
                expect(slot2Raw).not.toBeNull();
                const slot2Parsed = JSON.parse(slot2Raw!);
                expect(slot2Parsed.slot).toBe(2);
                expect(gui.activeSlot).toBe(2);
            });
        });
    });
});
