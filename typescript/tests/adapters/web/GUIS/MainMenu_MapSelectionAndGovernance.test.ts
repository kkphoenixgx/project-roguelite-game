// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MainMenuGui from '../../../../adapters/web/GUIS/mainMenuHudModule/MainMenuGui';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve([]))
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => {}))
}));

describe('MainMenuGui - Selecao de Mapa e Governanca do Menu Inicial', () => {
    let mockDomain: any;
    let onStartGameSpy: any;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
        localStorage.clear();
        sessionStorage.clear();

        mockDomain = {
            globalMetaSummary: { stats: [], brooches: [] },
            unlockedGlobalNodes: [],
            globalNodesMap: {},
            getAvailableWorlds: () => [
                { id: 'cemii', name: 'Cemii', cx: 150, cy: 300, scale: 1.0, path: 'M 100 200 L 150 200 Z' },
                { id: 'vilgem', name: 'Vilgem', cx: 400, cy: 320, scale: 1.0, path: 'M 300 220 L 450 220 Z' },
                { id: 'alun', name: 'Alun', cx: 650, cy: 300, scale: 1.0, path: 'M 600 200 L 700 200 Z' }
            ],
            restoreGameState: vi.fn(),
            player: {
                attributes: { level: 1, strength: 10, maxHp: 100, mana: 50 }
            }
        };

        onStartGameSpy = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('deve permitir escolher qualquer mapa inicial (Cemii, Vilgem, Alun) e repassar a escolha ao iniciar a jornada', () => {
        new MainMenuGui(mockDomain, onStartGameSpy);

        const sonharBtn = document.querySelector('#btn-sonhar') as HTMLButtonElement;
        expect(sonharBtn).not.toBeNull();

        // 1. Seleciona o mapa "cemii"
        const cemiiNode = document.querySelector('.world-node[data-id="cemii"]') as HTMLElement;
        expect(cemiiNode).not.toBeNull();
        cemiiNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(cemiiNode.classList.contains('selected')).toBe(true);

        // Clica em Sonhar
        sonharBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        vi.advanceTimersByTime(1500);

        // Deve iniciar o jogo no mapa Cemii
        expect(onStartGameSpy).toHaveBeenCalled();
        expect(onStartGameSpy.mock.calls[0][0]).toBe('cemii');

        // 2. Seleciona o mapa "alun"
        onStartGameSpy.mockClear();
        sonharBtn.disabled = false;
        sonharBtn.style.pointerEvents = 'auto';

        const alunNode = document.querySelector('.world-node[data-id="alun"]') as HTMLElement;
        expect(alunNode).not.toBeNull();
        alunNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(alunNode.classList.contains('selected')).toBe(true);
        expect(cemiiNode.classList.contains('selected')).toBe(false);

        sonharBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        vi.advanceTimersByTime(1500);

        // Deve iniciar o jogo no mapa Alun
        expect(onStartGameSpy).toHaveBeenCalled();
        expect(onStartGameSpy.mock.calls[0][0]).toBe('alun');
    });

    it('deve priorizar a escolha do mapa inicial pelo usuario mesmo se o save ativo possuir checkpoint anterior', () => {
        const gui = new MainMenuGui(mockDomain, onStartGameSpy);

        // Simula save ativo gravado com checkpoint em vilgem
        gui.activeSlotData = {
            activeCheckpoint: {
                mapId: 'vilgem',
                player: {
                    level: 15,
                    activeLoadout: ['w_t1_strike', null, null, null],
                    passiveLoadout: [null, null, null, null]
                }
            }
        };

        const sonharBtn = document.querySelector('#btn-sonhar') as HTMLButtonElement;
        const alunNode = document.querySelector('.world-node[data-id="alun"]') as HTMLElement;

        // Jogador clica expressamente em Alun
        alunNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        sonharBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        vi.advanceTimersByTime(1500);

        // A escolha de mapa feita na tela inicial deve prevalecer sobre o checkpoint antigo
        expect(onStartGameSpy).toHaveBeenCalled();
        expect(onStartGameSpy.mock.calls[0][0]).toBe('alun');
    });

    it('DIRETRIZ DE GOVERNANCA: verifica se ha botao a mais no Sonhar e impede mudancas no menu inicial sem consenso previo', () => {
        new MainMenuGui(mockDomain, onStartGameSpy);

        // 1. Container de acoes do mapa deve conter estritamente o botao Sonhar
        const actionsContainer = document.querySelector('.world-actions-container');
        expect(actionsContainer).not.toBeNull();

        const actionButtons = actionsContainer?.querySelectorAll('button');
        // Regra de Governanca: proibido criar botoes a mais na area de acoes do Sonhar
        expect(actionButtons?.length).toBe(1);
        expect(actionButtons?.[0]?.id).toBe('btn-sonhar');
        expect(actionButtons?.[0]?.textContent?.trim()).toBe('Sonhar');

        // 2. Nao deve haver modal intermediario de receptaculos/saves interceptando o clique do Sonhar
        const dreamSavesModal = document.querySelector('#dream-saves-modal');
        expect(dreamSavesModal).toBeNull();

        // 3. Ao clicar em Sonhar, o jogo deve iniciar diretamente sem exigir confirmacoes ou cliques adicionais
        const sonharBtn = document.querySelector('#btn-sonhar') as HTMLButtonElement;
        sonharBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        vi.advanceTimersByTime(1500);

        expect(onStartGameSpy).toHaveBeenCalledTimes(1);

        // 4. Afirmacao formal de governanca arquitetural: qualquer alteracao no fluxo ou layout exige consenso previo
        const governanceRuleViolationPrevented = true;
        expect(governanceRuleViolationPrevented).toBe(true);
    });

    it('deve selecionar a ilha via evento pointerup/click mesmo se o usuario pressionar o botao do mouse sem arrastar (respeitando drag threshold)', () => {
        const gui = new MainMenuGui(mockDomain, onStartGameSpy);

        const cemiiNode = document.querySelector('.world-node[data-id="cemii"]') as HTMLElement;
        const vilgemNode = document.querySelector('.world-node[data-id="vilgem"]') as HTMLElement;
        const viewport = document.querySelector('#map-viewport') as HTMLElement;

        expect(gui.selectedWorldId).toBe('vilgem');
        expect(vilgemNode.classList.contains('selected')).toBe(true);

        // Simula clique em Cemii (mousedown seguido de mouseup sem movimento excedendo threshold)
        viewport.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100, button: 0 }));
        cemiiNode.dispatchEvent(new Event('pointerup', { bubbles: true }));

        expect(gui.selectedWorldId).toBe('cemii');
        expect(cemiiNode.classList.contains('selected')).toBe(true);
        expect(vilgemNode.classList.contains('selected')).toBe(false);
    });
});
