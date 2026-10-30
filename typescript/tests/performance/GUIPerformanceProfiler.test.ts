// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PlayerStatusGui from '../../adapters/web/GUIS/playerStatusHudModule/PlayerStatusGui';
import XpBarGui from '../../adapters/web/GUIS/xpBarHudModule/XpBarGui';
import WeaponHudGui from '../../adapters/web/GUIS/weaponHudModule/WeaponHudGui';
import EquippedWeaponsHudGui from '../../adapters/web/GUIS/equippedWeaponsHudModule/EquippedWeaponsHudGui';
import SkillCooldownHudGui from '../../adapters/web/GUIS/skillCooldownHudModule/SkillCooldownHudGui';
import SpellBufferHudGui from '../../adapters/web/GUIS/spellBufferHudModule/SpellBufferHudGui';
import CharacterMenuGui from '../../adapters/web/GUIS/characterMenuHudModule/CharacterMenuGui';
import SkillTreeGui from '../../adapters/web/GUIS/skillTreeHudModule/SkillTreeGUI';
import FloatingChatGui from '../../adapters/web/GUIS/floatingChatHudModule/FloatingChatGui';
import DialogueAdapter from '../../adapters/web/components/DialogueAdapter';
import UIManager from '../../adapters/web/components/UiManager/UIManager';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import type { EntityRenderableState, IGameDomain } from '../../domain/ports/domain-contracts';

/**
 * ============================================================================
 * BENCHMARK DE PERFORMANCE: PERFILADOR EXATO DE GUIS & FRAME BUDGET (60 FPS)
 * ============================================================================
 * Papel: QA Lead & Compliance Auditor (rpg-testes)
 * Foco: Medir a latência exata (avg, p95, p99, max spike, FPS estimado) de cada
 * GUI individual e do loop consolidado UIManager.update(), diagnosticando
 * precisamente quais módulos violam o orçamento de 16.66ms (60 FPS).
 *
 * Frame Budget Alocado:
 * - Total por Frame (60 FPS): 16.66 ms
 * - Cota Máxima para o Subsistema de UI/HUD: 5.00 ms (sobrando 11.66ms para WebGPU/Canvas e Física)
 * - Cota Máxima para cada GUI isolada aberta: 2.00 ms
 * - Cota Máxima para cada HUD estático/fechado: 0.50 ms
 * ============================================================================
 */

interface BenchmarkStats {
    name: string;
    iterations: number;
    avgMs: number;
    medianMs: number;
    p95Ms: number;
    p99Ms: number;
    maxMs: number;
    minMs: number;
    estimatedFps: number;
    status: 'PASS' | 'WARN' | 'FAIL';
    budgetMs: number;
}

function runBenchmark(
    name: string,
    iterations: number,
    budgetMs: number,
    fn: (index: number) => void
): BenchmarkStats {
    // Warmup
    for (let i = 0; i < 30; i++) {
        fn(i);
    }

    const times: number[] = new Array(iterations);
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        fn(i);
        const end = performance.now();
        times[i] = end - start;
    }

    times.sort((a, b) => a - b);
    const sum = times.reduce((acc, t) => acc + t, 0);
    const avgMs = sum / iterations;
    const medianMs = times[Math.floor(iterations * 0.5)]!;
    const p95Ms = times[Math.floor(iterations * 0.95)]!;
    const p99Ms = times[Math.floor(iterations * 0.99)]!;
    const minMs = times[0]!;
    const maxMs = times[times.length - 1]!;
    const estimatedFps = avgMs > 0 ? 1000 / avgMs : 99999;

    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    // Se a média ultrapassar o orçamento alocado
    if (avgMs > budgetMs) {
        status = 'FAIL';
    } else if (p99Ms > budgetMs || maxMs > 16.66) {
        status = 'WARN';
    }

    return {
        name,
        iterations,
        avgMs,
        medianMs,
        p95Ms,
        p99Ms,
        maxMs,
        minMs,
        estimatedFps,
        status,
        budgetMs
    };
}

function printReportTable(title: string, results: BenchmarkStats[]) {
    console.log(`\n========================================================================================================`);
    console.log(`📊 [QA PERF REPORT] ${title}`);
    console.log(`========================================================================================================`);
    console.log(
        `| ${'GUI / Subsystem'.padEnd(28)} | ${'Avg (ms)'.padStart(9)} | ${'P95 (ms)'.padStart(9)} | ${'P99 (ms)'.padStart(9)} | ${'Max (ms)'.padStart(9)} | ${'Est. FPS'.padStart(10)} | ${'Budget'.padStart(8)} | ${'Status'.padEnd(6)} |`
    );
    console.log(`|${'-'.repeat(30)}|${'-'.repeat(11)}|${'-'.repeat(11)}|${'-'.repeat(11)}|${'-'.repeat(11)}|${'-'.repeat(12)}|${'-'.repeat(10)}|${'-'.repeat(8)}|`);

    for (const r of results) {
        const avg = r.avgMs.toFixed(3);
        const p95 = r.p95Ms.toFixed(3);
        const p99 = r.p99Ms.toFixed(3);
        const max = r.maxMs.toFixed(3);
        const fps = r.estimatedFps > 9999 ? '>9999' : r.estimatedFps.toFixed(0);
        const budget = `${r.budgetMs.toFixed(1)}ms`;
        const icon = r.status === 'PASS' ? '✅ PASS' : r.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL';

        console.log(
            `| ${r.name.padEnd(28)} | ${avg.padStart(9)} | ${p95.padStart(9)} | ${p99.padStart(9)} | ${max.padStart(9)} | ${fps.padStart(10)} | ${budget.padStart(8)} | ${icon.padEnd(6)} |`
        );
    }
    console.log(`========================================================================================================\n`);
}

function createRealisticPlayerData(): EntityRenderableState {
    return {
        id: 1,
        entityTypeId: 'player',
        rotation: 0,
        coordinates: { x: 500, y: 500 },
        size: { width: 32, height: 32 },
        hp: 85,
        maxHp: 100,
        mana: 45,
        maxMana: 50,
        level: 12,
        currentXp: 350,
        xpToNextLevel: 1000,
        coins: 1250,
        maxBackpackSize: 24,
        activeStatuses: [
            { id: 'burn', description: 'Queimando', remaining: 2.5 },
            { id: 'blade_infusion_light', description: 'Luz Sagrada', remaining: 4.0 }
        ],
        attributes: {
            strength: 25,
            dexterity: 14,
            intelligence: 8,
            constitution: 18,
            wisdom: 10,
            charisma: 12,
            availablePoints: 3
        },
        derivedAttributes: {
            hp: 85,
            maxHp: 100,
            mana: 45,
            maxMana: 50,
            hpRegen: 2.5,
            manaRegen: 1.2,
            defence: 15.0,
            speed: 120,
            critChance: 12.5,
            critDamage: 150,
            dodge: 8.0,
            accuracy: 95.0,
            recharge: 10.0,
            piercing: 2,
            splashDamage: 15.0,
            tenacity: 20.0,
            vigor: 5.0,
            lucky: 10,
            insight: 5.0
        },
        equipment: {
            mainHand: {
                id: 'sword_iron',
                name: 'Espada de Ferro',
                iconId: 101,
                weaponType: 'sword',
                rarity: 'rare',
                baseDamage: 24,
                description: 'Uma lâmina afiada forjada no aço de Vilgem.'
            },
            secondaryHand: {
                id: 'shield_iron',
                name: 'Escudo de Carvalho',
                iconId: 102,
                category: 'equipment',
                rarity: 'uncommon',
                description: 'Protege contra golpes frontais.'
            },
            helmet: { id: 'helm_iron', name: 'Elmo de Ferro', iconId: 103, rarity: 'common', description: 'Proteção sólida.' },
            chest: { id: 'armor_iron', name: 'Cota de Malha', iconId: 104, rarity: 'rare', description: 'Armadura pesada.' },
            pants: { id: 'legs_iron', name: 'Grevas de Aço', iconId: 105, rarity: 'common', description: 'Perneiras reforçadas.' },
            boots: { id: 'boots_leather', name: 'Botas Leves', iconId: 106, rarity: 'common', description: 'Confortáveis.' },
            gloves: { id: 'gloves_leather', name: 'Luvas de Couro', iconId: 107, rarity: 'common', description: 'Aperto firme.' },
            amulet: { id: 'amulet_ruby', name: 'Amuleto Rubro', iconId: 108, rarity: 'epic', description: 'Pulsa com calor arcano.' },
            bag: { id: 'bag_medium', name: 'Mochila de Couro', iconId: 109, rarity: 'rare', capacityBonus: 8, description: 'Mais espaço.' },
            belt: { id: 'belt_utility', name: 'Cinto de Utilidades', iconId: 110, rarity: 'rare', description: 'Slots extras.' },
            rings: [
                { id: 'ring_str', name: 'Anel do Titã', iconId: 111, rarity: 'rare', description: '+5 Força' },
                { id: 'ring_def', name: 'Anel Protetor', iconId: 112, rarity: 'common', description: '+2 Defesa' }
            ]
        },
        backpack: Array.from({ length: 24 }, (_, i) => {
            if (i < 16) {
                return {
                    id: `item_${i}`,
                    name: `Poção ou Relíquia #${i}`,
                    iconId: 101 + (i % 8),
                    rarity: i % 3 === 0 ? 'rare' : 'common',
                    description: `Item de inventário com número ${i}`
                };
            }
            return null;
        }),
        skillCooldowns: {
            'w_t1_heavy_blow': { remainingMs: 2500, totalMs: 5000 },
            'w_t2_cleave': { remainingMs: 1200, totalMs: 8000 }
        },
        activeLoadout: ['w_t1_heavy_blow', 'w_t2_cleave', null, null],
        classes: [
            { name: 'Guerreiro', isActive: true, isUnlocked: true },
            { name: 'Mago', isActive: false, isUnlocked: true }
        ],
        skillTree: [
            { id: 'w_t1_strike', name: 'Golpe', description: 'Golpe básico', type: 'active', tier: 1, unlocked: true, canUnlock: true, isBranchBlocked: false },
            { id: 'w_t1_heavy_blow', name: 'Pancada Pesada', description: 'Golpe pesado', type: 'active', tier: 1, unlocked: true, canUnlock: true, isBranchBlocked: false },
            { id: 'w_t2_cleave', name: 'Turbilhão', description: 'Giro cortante', type: 'active', tier: 2, unlocked: true, canUnlock: true, isBranchBlocked: false },
            { id: 'w_t3_berserk', name: 'Fúria', description: 'Fúria incontrolável', type: 'active', tier: 3, unlocked: false, canUnlock: true, isBranchBlocked: false }
        ]
    };
}

describe('QA Performance Benchmark - Profiling de GUIs e Frame Budget (60 FPS)', () => {
    let mockDomain: IGameDomain;
    let eventManager: EventHandler;

    beforeEach(() => {
        document.body.innerHTML = '';
        eventManager = new EventHandler();
        mockDomain = {
            eventManager,
            getEquippedItems: vi.fn().mockReturnValue([]),
            getInventoryItems: vi.fn().mockReturnValue([]),
            getAttributes: vi.fn().mockReturnValue({}),
            generateLocalRewards: vi.fn().mockReturnValue([]),
            classesManager: { getClasses: vi.fn().mockReturnValue([]) },
            getRenderState: vi.fn().mockReturnValue({ renderables: [] })
        } as unknown as IGameDomain;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('Diagnóstico de GUIs do HUD Ativo (Loop Normal de Gameplay)', () => {
        const playerState = createRealisticPlayerData();
        const screenPos = { x: 400, y: 300 };
        const mousePos = { x: 450, y: 320 };
        const results: BenchmarkStats[] = [];

        // 1. PlayerStatusGui
        const statusGui = new PlayerStatusGui();
        const statusBench = runBenchmark('PlayerStatusGui', 400, 1.0, (i) => {
            playerState.hp = 70 + (i % 20);
            playerState.mana = 30 + (i % 15);
            statusGui.update(playerState);
        });
        results.push(statusBench);

        // 2. XpBarGui
        const xpGui = new XpBarGui();
        const xpBench = runBenchmark('XpBarGui', 400, 0.3, (i) => {
            playerState.currentXp = 350 + (i % 50);
            xpGui.update(playerState);
        });
        results.push(xpBench);

        // 3. WeaponHudGui
        const weaponGui = new WeaponHudGui();
        const weaponBench = runBenchmark('WeaponHudGui', 400, 0.8, (i) => {
            mousePos.x = 400 + (i % 100);
            mousePos.y = 300 + (i % 80);
            weaponGui.update(playerState, screenPos, mousePos);
        });
        results.push(weaponBench);

        // 4. EquippedWeaponsHudGui
        const eqWeaponsGui = new EquippedWeaponsHudGui();
        const eqWeaponsBench = runBenchmark('EquippedWeaponsHudGui', 400, 0.4, () => {
            eqWeaponsGui.update(playerState);
        });
        results.push(eqWeaponsBench);

        // 5. SkillCooldownHudGui
        const cdGui = new SkillCooldownHudGui(mockDomain);
        const cdBench = runBenchmark('SkillCooldownHudGui', 400, 0.8, (i) => {
            playerState.skillCooldowns = {
                'w_t1_heavy_blow': { remainingMs: Math.max(0, 3000 - i * 5), totalMs: 5000 },
                'w_t2_cleave': { remainingMs: Math.max(0, 5000 - i * 8), totalMs: 8000 }
            };
            cdGui.update(playerState);
        });
        results.push(cdBench);

        // 6. FloatingChatGui (com 5 balões ativos de NPCs)
        const chatGui = new FloatingChatGui();
        chatGui.showBubble(10, 'Saudações, forasteiro!');
        chatGui.showBubble(11, 'Cuidado com os lobos na floresta!');
        chatGui.showBubble(12, 'Belas armas à venda!');
        const dummyRenderables = [
            { id: 10, coordinates: { x: 100, y: 100 }, size: { width: 32, height: 32 } },
            { id: 11, coordinates: { x: 200, y: 200 }, size: { width: 32, height: 32 } },
            { id: 12, coordinates: { x: 300, y: 300 }, size: { width: 32, height: 32 } }
        ];
        const worldToScreen = (wx: number, wy: number) => ({ x: wx + 50, y: wy + 50 });
        const chatBench = runBenchmark('FloatingChatGui (3 bubbles)', 400, 1.0, () => {
            chatGui.update(dummyRenderables, worldToScreen);
        });
        results.push(chatBench);

        printReportTable('HUD ATIVO NO LOOP DE GAMEPLAY', results);

        // Assegura que nenhuma GUI do HUD estático consome mais que 1.5ms
        for (const res of results) {
            expect(res.avgMs, `${res.name} excedeu a média máxima permitida!`).toBeLessThan(1.5);
            expect(res.status).not.toBe('FAIL');
        }
    });

    it('Diagnóstico de Janelas Complexas Abertas (CharacterMenuGui & SkillTreeGui)', () => {
        const playerState = createRealisticPlayerData();
        const results: BenchmarkStats[] = [];

        // 1. CharacterMenuGui Aberto (Atualizando Atributos, 24 slots de mochila, status derivados)
        const charMenu = new CharacterMenuGui(
            mockDomain,
            () => {},
            () => {},
            () => {},
            () => {},
            () => {}
        );
        charMenu.toggle(); // Abre a janela

        const charMenuOpenBench = runBenchmark('CharacterMenuGui (ABERTO)', 300, 2.0, (i) => {
            // Simula pequenas variações de atributos durante o jogo
            playerState.attributes!.availablePoints = i % 4;
            charMenu.update(playerState);
        });
        results.push(charMenuOpenBench);

        // 2. CharacterMenuGui Fechado (Early-exit check)
        charMenu.hide();
        const charMenuClosedBench = runBenchmark('CharacterMenuGui (FECHADO)', 400, 0.1, () => {
            charMenu.update(playerState);
        });
        results.push(charMenuClosedBench);

        // 3. SkillTreeGui Aberto
        const skillTree = new SkillTreeGui(() => {}, () => {});
        skillTree.toggle(); // Abre a árvore

        const skillTreeOpenBench = runBenchmark('SkillTreeGui (ABERTO)', 300, 2.0, (i) => {
            playerState.attributes!.availablePoints = i % 5;
            skillTree.update(playerState);
        });
        results.push(skillTreeOpenBench);

        // 4. SkillTreeGui Fechado (Early-exit check)
        skillTree.hide();
        const skillTreeClosedBench = runBenchmark('SkillTreeGui (FECHADO)', 400, 0.1, () => {
            skillTree.update(playerState);
        });
        results.push(skillTreeClosedBench);

        printReportTable('MENUS COMPLEXOS (ABERTO vs FECHADO)', results);

        expect(charMenuClosedBench.avgMs).toBeLessThan(0.1);
        expect(skillTreeClosedBench.avgMs).toBeLessThan(0.1);
        expect(charMenuOpenBench.avgMs).toBeLessThan(2.0);
        expect(skillTreeOpenBench.avgMs).toBeLessThan(2.0);
    });

    it('Diagnóstico Integrado: UIManager.update() em Carga Máxima (Frame Budget <= 5.0ms)', () => {
        const fakeDialogueAdapter = new DialogueAdapter(
            eventManager,
            () => {},
            () => {},
            () => true
        );

        const uiManager = new UIManager(
            mockDomain,
            vi.fn(),
            vi.fn(),
            vi.fn(),
            vi.fn(),
            vi.fn(),
            vi.fn(),
            vi.fn(),
            fakeDialogueAdapter
        );

        const playerState = createRealisticPlayerData();
        const renderables = [playerState];
        const screenPos = { x: 400, y: 300 };
        const mousePos = { x: 450, y: 320 };
        const worldToScreen = (wx: number, wy: number) => ({ x: wx + 10, y: wy + 10 });

        const results: BenchmarkStats[] = [];

        // Cenário A: Gameplay normal (HUD ativo, Menus fechados)
        const hudOnlyBench = runBenchmark('UIManager (HUD Normal)', 500, 3.0, (i) => {
            mousePos.x = 400 + (i % 60);
            uiManager.update(playerState, renderables, screenPos, mousePos, worldToScreen);
        });
        results.push(hudOnlyBench);

        // Cenário B: Gameplay com Menu de Personagem Aberto
        uiManager.toggleCharacterMenu();
        const menuOpenBench = runBenchmark('UIManager (Com Menu Aberto)', 400, 5.0, (i) => {
            mousePos.x = 400 + (i % 60);
            uiManager.update(playerState, renderables, screenPos, mousePos, worldToScreen);
        });
        results.push(menuOpenBench);
        uiManager.toggleCharacterMenu(); // Fecha o menu

        // Cenário C: Gameplay com Árvore de Habilidades Aberta
        uiManager.toggleSkillTree();
        const skillTreeOpenBench = runBenchmark('UIManager (Com SkillTree)', 400, 5.0, (i) => {
            mousePos.x = 400 + (i % 60);
            uiManager.update(playerState, renderables, screenPos, mousePos, worldToScreen);
        });
        results.push(skillTreeOpenBench);
        uiManager.toggleSkillTree(); // Fecha a skill tree

        printReportTable('LOOP CONSOLIDADO DO UIMANAGER', results);

        // Conformidade com a Meta de 60 FPS:
        // Todo o loop de UI deve rodar confortavelmente abaixo de 5.0ms
        expect(hudOnlyBench.avgMs).toBeLessThan(3.0);
        expect(menuOpenBench.avgMs).toBeLessThan(5.0);
        expect(skillTreeOpenBench.avgMs).toBeLessThan(5.0);
    });
});
