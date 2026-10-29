// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Player from '../../../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../../../domain/ObjectModule/Entities/Attributes';
import { EventHandler } from '../../../../domain/eventDispacher/eventDispacher';
import ActionManager from '../../../../domain/eventDispacher/ActionManager';
import Necromancer from '../../../../domain/ObjectModule/Entities/Player/Classes/Necromancer';
import SkillTreeGateway from '../../../../domain/facadeComponents/SkillTreeGateway';
import DomainRenderState from '../../../../domain/facadeComponents/DomainRenderState';

describe('QA Graybox - Validação de Menu, Broches e Sprites', () => {
    let eventManager: EventHandler;
    let mockLogger: any;
    let player: Player;
    let actionManager: ActionManager;

    beforeEach(() => {
        eventManager = new EventHandler();
        mockLogger = { log: vi.fn() };
        player = new Player(1, { x: 100, y: 100 }, new Attributes(10, 10, 10, 10, 10, 10, 10, 10), eventManager);
        actionManager = new ActionManager(player, mockLogger, eventManager);
    });

    it('deve acionar broche ativo pelo atalho de teclado 5 a 8 (slot_5 a slot_8)', () => {
        player.equipGlobalActiveBrooch('brooch_active_heal', 0); // Slot 5
        expect(player.globalActiveLoadout[0]).toBe('brooch_active_heal');

        const executeSpy = vi.spyOn(player, 'executeActiveBrooch');
        actionManager.checkEvent(['slot_5'], { x: 150, y: 150 });

        expect(executeSpy).toHaveBeenCalledWith('brooch_active_heal', { x: 150, y: 150 });
    });

    it('Necromante deve disparar spawnVisual com os tipos corretos para Garras do Além e Clamor da Banshee', () => {
        const dummyXpTable = {
            getLevelForXp: vi.fn(() => 10),
            getXpForLevel: vi.fn(() => 100),
            getMaxLevel: vi.fn(() => 50)
        };
        const necro = new Necromancer(dummyXpTable as any, player, eventManager);

        const visualEvents: any[] = [];
        eventManager.on('spawnVisual', (payload) => {
            visualEvents.push(payload);
        });

        // Garras do Além
        (necro as any).executeGraspOfTheDead('n_t3_grasp_of_dead', { x: 200, y: 100 });
        const graspEvent = visualEvents.find(e => e.type === 'n_t3_grasp_of_dead');
        expect(graspEvent).toBeDefined();

        // Clamor da Banshee
        (necro as any).executeWailOfBanshee('n_t5_wail_of_banshee');
        const bansheeEvent = visualEvents.find(e => e.type === 'n_t5_wail_of_banshee');
        expect(bansheeEvent).toBeDefined();
    });

    it('deve expor isBranchBlocked na árvore de habilidades após desbloquear um ramo', () => {
        player.unlockClass('Necromante');
        player.setActiveClass('Necromante');
        (player.attributes as any)._level = 20;
        (player.attributes as any)._availablePoints = 10;

        const gateway = new SkillTreeGateway(player, mockLogger, eventManager, vi.fn());
        const renderState = new DomainRenderState(mockLogger, () => 'Necromante');

        // Desbloqueia fundação
        gateway.manage('unlock', { skillId: 'n_t1_reap' });
        gateway.manage('unlock', { skillId: 'n_t1_death_aura' });

        // Escolhe o Ramo dos Ossos (n_t2_bone_spear)
        gateway.manage('unlock', { skillId: 'n_t2_bone_spear' });
        expect(player.unlockedSkills.has('n_t2_bone_spear')).toBe(true);

        const mockWorld = { width: 1000, height: 1000, mapId: 'test', chunks: [] } as any;
        const mockObjManager = { getNearActiveElements: () => [], getAllRenderableStates: () => [] } as any;
        renderState.getRenderState(mockWorld, player, mockObjManager);

        const state = (renderState as any).cachedPlayerState;
        const soulLeechNode = state.skillTree.find((s: any) => s.id === 'n_t1_soul_leech');
        expect(soulLeechNode?.isBranchBlocked).toBe(true);
        expect(soulLeechNode?.canUnlock).toBe(false);
    });

    it('deve aplicar is-best-attr e a tag Melhor para o maior atributo preservando controles intactos', async () => {
        const { default: CharacterMenuGui } = await import('../../../../adapters/web/GUIS/characterMenuHudModule/CharacterMenuGui');
        const mockDomain: any = {
            getPlayerState: vi.fn(),
            getInventory: vi.fn(() => ({ items: [] })),
            subscribe: vi.fn()
        };
        const menu = new CharacterMenuGui(mockDomain, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {});

        menu.toggle();

        const mockState: any = {
            attributes: {
                strength: 10,
                dexterity: 10,
                intelligence: 15,
                constitution: 10,
                wisdom: 10,
                charisma: 10,
                availablePoints: 3
            },
            derivedAttributes: {
                hp: 20, maxHp: 20, mana: 100, maxMana: 100, hpRegen: 1, manaRegen: 1, defence: 5, speed: 100,
                critChance: 5, critDamage: 150, dodge: 2, accuracy: 5, recharge: 2, piercing: 1, splashDamage: 2,
                tenacity: 5, vigor: 5, lucky: 1, insight: 1
            },
            backpack: [],
            equipment: {}
        };

        menu.update(mockState);

        const rowInt = document.getElementById('row-int');
        expect(rowInt).not.toBeNull();
        expect(rowInt?.classList.contains('is-best-attr')).toBe(true);

        const bestTag = rowInt?.querySelector('.best-attr-tag');
        expect(bestTag).not.toBeNull();
        expect(bestTag?.textContent).toBe('Melhor');

        const controls = rowInt?.querySelector('.attr-controls');
        expect(controls).not.toBeNull();
        const addBtn = controls?.querySelector('.attr-add-btn');
        expect(addBtn).not.toBeNull();
        expect(addBtn?.getAttribute('data-attr')).toBe('intelligence');

        const otherRows = ['row-str', 'row-dex', 'row-con', 'row-wis', 'row-cha'];
        for (const rId of otherRows) {
            const r = document.getElementById(rId);
            expect(r?.classList.contains('is-best-attr')).toBe(false);
            expect(r?.querySelector('.best-attr-tag')).toBeNull();
        }
    });
});
