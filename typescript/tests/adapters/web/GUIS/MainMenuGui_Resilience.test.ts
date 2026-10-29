// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MainMenuGui from '../../../../adapters/web/GUIS/mainMenuHudModule/MainMenuGui';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve([]))
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => {}))
}));

describe('MainMenuGui - Resiliência e Tolerância a Falhas', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
    });

    it('não deve quebrar ao inicializar mesmo se domain.globalMetaSummary for undefined', () => {
        const mockDomain: any = {
            globalMetaSummary: undefined,
            unlockedGlobalNodes: [],
            globalNodesMap: {},
            getAvailableWorlds: () => [{ id: 'vilgem', name: 'Vilgem', cx: 0, cy: 0, scale: 1, path: '' }]
        };

        expect(() => {
            new MainMenuGui(mockDomain, vi.fn());
        }).not.toThrow();

        const baseContainer = document.querySelector('#stats-base-container');
        expect(baseContainer).not.toBeNull();
    });

    it('não deve quebrar ao alternar sub-abas mesmo com globalMetaSummary indefinido', () => {
        const mockDomain: any = {
            globalMetaSummary: undefined,
            unlockedGlobalNodes: [],
            globalNodesMap: {},
            getAvailableWorlds: () => []
        };

        const gui = new MainMenuGui(mockDomain, vi.fn());
        expect(() => {
            gui.switchSystemSubtab('saves');
            gui.switchSystemSubtab('models');
        }).not.toThrow();
    });

    it('deve definir e restaurar o save ativo selecionado na aba system', async () => {
        const mockRestoreGameState = vi.fn();
        const mockDomain: any = {
            globalMetaSummary: { stats: [], brooches: [] },
            unlockedGlobalNodes: [],
            globalNodesMap: {},
            getAvailableWorlds: () => [],
            restoreGameState: mockRestoreGameState
        };

        const gui = new MainMenuGui(mockDomain, vi.fn());
        expect(gui.activeSlot).toBe(1);

        await gui.setActiveSlot(3, true);

        expect(gui.activeSlot).toBe(3);
        expect(localStorage.getItem('active_game_slot')).toBe('3');

        const bannerName = document.querySelector('#ds-active-slot-name');
        expect(bannerName?.textContent).toContain('Registro 3');
    });

    it('deve mover e transformar a camada do mapa com translate3d e classe is-dragging', () => {
        const mockDomain: any = {
            globalMetaSummary: { stats: [], brooches: [] },
            unlockedGlobalNodes: [],
            globalNodesMap: {},
            getAvailableWorlds: () => [{ id: 'vilgem', name: 'Vilgem', cx: 400, cy: 320, scale: 1, path: '' }]
        };

        new MainMenuGui(mockDomain, vi.fn());

        const viewport = document.querySelector('#map-viewport') as HTMLElement;
        const mapLayer = document.querySelector('#map-layer') as HTMLElement;

        expect(viewport).not.toBeNull();
        expect(mapLayer).not.toBeNull();
        expect(mapLayer.style.transform).toContain('translate3d');

        // Simula mousedown para iniciar o arrasto
        viewport.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0 }));

        // Simula mousemove que ultrapassa o threshold de arraste (> 6px)
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120 }));
        expect(viewport.classList.contains('is-dragging')).toBe(true);

        // Simula mouseup para finalizar arrasto
        window.dispatchEvent(new MouseEvent('mouseup'));
        expect(viewport.classList.contains('is-dragging')).toBe(false);
        expect(mapLayer.style.transform).toContain('translate3d');
    });

    it('deve refletir atributos reais e broches do save ativo na aba Stats', async () => {
        const mockDomain: any = {
            globalMetaSummary: { stats: [], brooches: [] },
            unlockedGlobalNodes: [],
            globalNodesMap: {},
            getAvailableWorlds: () => [],
            restoreGameState: vi.fn(),
            player: {
                attributes: {
                    level: 18,
                    strength: 169,
                    constitution: 18.5,
                    dexterity: 15,
                    intelligence: 31,
                    wisdom: 14.5,
                    charisma: 10,
                    maxHp: 451.5,
                    hp: 451.5,
                    mana: 310
                }
            }
        };

        const gui = new MainMenuGui(mockDomain, vi.fn());

        // Configura dados do save ativo
        gui.activeSlotData = {
            playerState: {
                attributes: {
                    level: 18,
                    strength: 169,
                    constitution: 18.5,
                    dexterity: 15,
                    intelligence: 31,
                    wisdom: 14.5,
                    charisma: 10,
                    maxHp: 451.5,
                    mana: 310
                },
                classes: {
                    globalActiveLoadout: ['brooch_active_meteor', 'brooch_active_heal'],
                    passiveLoadout: ['brooch_luck_charm']
                }
            },
            metaProgressionState: {
                globalEssence: 50000,
                unlockedBrooches: ['brooch_active_meteor', 'brooch_active_heal', 'brooch_luck_charm']
            }
        };

        // Atualiza a aba stats
        (gui as any).setupStatsTab();

        const baseContainer = document.querySelector('#stats-base-container');
        const derivedContainer = document.querySelector('#stats-derived-container');
        const broochesContainer = document.querySelector('#stats-brooches-container');

        expect(baseContainer?.textContent).toContain('169');
        expect(baseContainer?.textContent).toContain('18.5');
        expect(baseContainer?.textContent).toContain('15');
        expect(baseContainer?.textContent).toContain('31');
        expect(baseContainer?.textContent).toContain('14.5');
        expect(baseContainer?.textContent).toContain('10');

        expect(derivedContainer?.textContent).toContain('18');
        expect(derivedContainer?.textContent).toContain('451.5');
        expect(derivedContainer?.textContent).toContain('310');

        expect(broochesContainer?.children.length).toBeGreaterThanOrEqual(1);
        expect(broochesContainer?.textContent).toContain('Chamado do Meteoro');
    });

    it('deve exibir corretamente o ciclo e o número de broches no slot da aba system', async () => {
        const slotData = {
            slot: 2,
            characterName: 'Aventureiro Experiente',
            cycle: 4,
            world: 'Vilgem',
            savedAt: '15/10 11:30',
            metaProgressionState: {
                treeGenerationCount: 4,
                unlockedBrooches: ['brooch_active_heal', 'brooch_active_dash', 'brooch_phoenix']
            },
            player: {
                classes: {
                    globalActiveLoadout: ['brooch_active_heal', 'brooch_active_dash'],
                    passiveLoadout: ['brooch_phoenix']
                }
            }
        };

        localStorage.setItem('game_slot_2', JSON.stringify(slotData));

        const mockDomain: any = {
            globalMetaSummary: { stats: [], brooches: [] },
            unlockedGlobalNodes: [],
            globalNodesMap: {},
            getAvailableWorlds: () => []
        };

        const gui = new MainMenuGui(mockDomain, vi.fn());
        await (gui as any).setupSaveSystem();

        // Aguarda renderização dos slots
        await vi.waitFor(() => {
            const cardSlot2 = document.querySelector('.ds-slot-card[data-slot="2"]');
            expect(cardSlot2).not.toBeNull();
            expect(cardSlot2?.innerHTML).toContain('Ciclo:</strong> 4');
            expect(cardSlot2?.innerHTML).toContain('Broches:</strong> 3');
        });
    });
});
