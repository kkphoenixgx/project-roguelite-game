import { describe, it, expect, vi, beforeEach } from 'vitest';
import DomainRenderState from '../../domain/facadeComponents/DomainRenderState';
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import ObjectElementManager from '../../domain/ObjectModule/ObjectElementManager';
import SkillBranchManager from '../../domain/Skills/SkillBranchManager';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';
import type { ICollisionService } from '../../domain/ports/ICollisionService';
import type { ILogger } from '../../domain/ports/ILogger';

describe('DomainRenderStatePerformanceRegression - Zero-GC & Dirty Checking', () => {
    let eventManager: IEventManager;
    let collisionService: ICollisionService;
    let logger: ILogger;
    let player: Player;
    let objectManager: ObjectElementManager;
    let viewedClass: string | null = null;
    let renderStateBuilder: DomainRenderState;
    let mockWorld: any;

    beforeEach(() => {
        const listeners = new Map<string, Function[]>();
        eventManager = {
            on: vi.fn((key, cb) => {
                if (!listeners.has(key)) listeners.set(key, []);
                listeners.get(key)!.push(cb);
            }),
            dispatch: vi.fn((key, payload) => {
                listeners.get(key)?.forEach(cb => cb(payload));
            })
        };
        collisionService = {
            checkCollisions: vi.fn()
        };
        logger = {
            log: vi.fn()
        } as any;

        viewedClass = null;
        player = new Player(1, { x: 100, y: 100 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), eventManager);
        player.unlockClass('Guerreiro');
        player.setActiveClass('Guerreiro');

        objectManager = new ObjectElementManager(eventManager, collisionService);
        renderStateBuilder = new DomainRenderState(logger, () => viewedClass);
        mockWorld = { width: 2048, height: 2048, mapId: 'vilgem' };
    });

    it('[Regression / Memoization] deve computar a árvore de habilidades apenas no primeiro frame e reutilizar em O(1) nos frames subsequentes sem mudanças', () => {
        const branchSpy = vi.spyOn(SkillBranchManager, 'isSkillBlockedByBranchSelection');

        // Frame 1: Cache frio -> deve computar a árvore de skills do Guerreiro
        const state1 = renderStateBuilder.getRenderState(mockWorld, player, objectManager);
        const p1 = state1.renderables[0] as any;

        expect(p1.skillTree).toBeDefined();
        expect(p1.skillTree.length).toBeGreaterThan(0);
        const firstFrameCalls = branchSpy.mock.calls.length;
        expect(firstFrameCalls).toBeGreaterThan(0);

        branchSpy.mockClear();

        // Frames 2 a 60: Movimento e combate contínuos sem alteração de level/skills/classe
        for (let frame = 2; frame <= 60; frame++) {
            player.coordinates.x += 2;
            player.coordinates.y += 1;
            player.attributes.hp = Math.max(1, player.attributes.hp - 0.1);
            const stateN = renderStateBuilder.getRenderState(mockWorld, player, objectManager);
            const pN = stateN.renderables[0] as any;
            expect(pN.skillTree.length).toBe(p1.skillTree.length);
            expect(pN.classes.length).toBe(player.classes.length);
        }

        // Nenhuma chamada redundante ao SkillBranchManager nos 59 frames seguintes!
        expect(branchSpy).toHaveBeenCalledTimes(0);
        branchSpy.mockRestore();
    });

    it('[Regression / Dirty-Checking] deve recomputar imediatamente a skillTree e unlockedActiveSkills quando o jogador subir de nível, desbloquear skill ou trocar de aba de classe', () => {
        const branchSpy = vi.spyOn(SkillBranchManager, 'isSkillBlockedByBranchSelection');

        // Frame inicial
        const state1 = renderStateBuilder.getRenderState(mockWorld, player, objectManager);
        const p1 = state1.renderables[0] as any;
        expect(p1.unlockedActiveSkills.length).toBe(0);
        branchSpy.mockClear();

        // 1. Jogador desbloqueia uma habilidade ativa
        const firstActiveSkill = player.classes.find(c => c.name === 'Guerreiro')!.allSkills.find(s => s.type === 'active')!;
        player.unlockSkill(firstActiveSkill.id);

        const stateAfterUnlock = renderStateBuilder.getRenderState(mockWorld, player, objectManager);
        const pAfterUnlock = stateAfterUnlock.renderables[0] as any;

        expect(branchSpy.mock.calls.length).toBeGreaterThan(0);
        expect(pAfterUnlock.unlockedActiveSkills.some((s: any) => s.id === firstActiveSkill.id)).toBe(true);
        expect(pAfterUnlock.skillTree.find((s: any) => s.id === firstActiveSkill.id)?.unlocked).toBe(true);

        branchSpy.mockClear();

        // 2. Jogador troca a classe visualizada na UI para Gunslinger
        viewedClass = 'Gunslinger';
        const stateAfterSwitch = renderStateBuilder.getRenderState(mockWorld, player, objectManager);
        const pAfterSwitch = stateAfterSwitch.renderables[0] as any;

        expect(branchSpy.mock.calls.length).toBeGreaterThan(0);
        expect(pAfterSwitch.skillTree.some((s: any) => s.id === 'gs_t1_quickdraw')).toBe(true);
        expect(pAfterSwitch.skillTree.find((s: any) => s.id === 'gs_t1_quickdraw')?.requiresMainHandWeapon).toBe(true);

        branchSpy.mockClear();

        // 3. Jogador sobe de nível
        player.attributes.addXp(5000, player.classes[0]!.xpTable);
        renderStateBuilder.getRenderState(mockWorld, player, objectManager);
        expect(branchSpy.mock.calls.length).toBeGreaterThan(0);

        branchSpy.mockRestore();
    });

    it('[Regression / Interactive NPC Proximity] deve detectar o NPC interativo mais próximo usando distância quadrática exata dentro do raio de 50px', () => {
        // Spawna 2 NPCs: um a 30px de distância e outro a 45px
        objectManager.spawn((id) => ({
            id,
            objectId: 'npc_far',
            npcName: 'Aldeão Distante',
            coordinates: { x: 130, y: 130 }, // ~42.4px de distância
            size: { width: 16, height: 16 },
            state: 'idle',
            rotation: 0,
            update: () => {}
        } as any));

        const nearNpc = objectManager.spawn((id) => ({
            id,
            objectId: 'npc_near',
            npcName: 'Ferreiro Próximo',
            coordinates: { x: 115, y: 115 }, // ~21.2px de distância
            size: { width: 16, height: 16 },
            state: 'idle',
            rotation: 0,
            update: () => {}
        } as any));

        const state = renderStateBuilder.getRenderState(mockWorld, player, objectManager);
        const ps = state.renderables[0] as any;

        expect(ps.interactablePrompt).toBeDefined();
        expect(ps.interactablePrompt.npcId).toBe(nearNpc.id);
        expect(ps.interactablePrompt.npcName).toBe('Ferreiro Próximo');

        // Move o jogador para longe (> 50px de ambos)
        player.coordinates.x = 500;
        player.coordinates.y = 500;

        const stateFar = renderStateBuilder.getRenderState(mockWorld, player, objectManager);
        const psFar = stateFar.renderables[0] as any;
        expect(psFar.interactablePrompt).toBeUndefined();
    });
});
