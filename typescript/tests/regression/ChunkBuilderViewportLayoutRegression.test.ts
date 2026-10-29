/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkManagerModal } from '../../adapters/assets-adapter/Components/ChunkManagerModal';
import type { SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';

describe('Assets Adapter Regression - Chunk Builder Viewport & Selection Details Layout', () => {
    let mockMap: SelectedMapConfig;

    beforeEach(() => {
        // Setup JSDOM Canvas Mock
        HTMLCanvasElement.prototype.getContext = (() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            drawImage: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn(() => ({ width: 80 })),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
        } as unknown as CanvasRenderingContext2D)) as any;

        HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockCanvas');

        document.body.innerHTML = `
            <div id="top-navbar">
                <span class="top-navbar-title-badge"></span>
                <h1>Editor de Assets</h1>
            </div>
            <div id="canvas-container" style="width: 800px; height: 600px;"></div>
            <div id="properties-panel" style="width: 300px;"></div>
        `;

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({})
        } as any);

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 2048,
            height: 2048,
            chunkSize: 1024,
            description: 'Mapa principal de Vilgem',
            chunks: [
                ['assets/scenery/grass/grass_01.png', 'assets/scenery/grass/grass_02.png'],
                ['assets/scenery/grass/grass_03.png', 'assets/scenery/grass/grass_04.png']
            ],
            isInnerMap: false
        };
    });

    it('deve renderizar a estrutura de layout com .chunk-workspace-layout contendo .chunk-builder-viewport e .chunk-selection-details lado a lado', () => {
        const modal = new ChunkManagerModal(mockMap, () => {});
        modal.open();

        const workspaceLayout = document.querySelector('.chunk-workspace-layout');
        expect(workspaceLayout).not.toBeNull();

        const viewport = workspaceLayout?.querySelector('.chunk-builder-viewport');
        const selectionDetails = workspaceLayout?.querySelector('.chunk-selection-details');

        expect(viewport).not.toBeNull();
        expect(selectionDetails).not.toBeNull();

        // Antes de selecionar qualquer bloco, deve exibir o resumo global de métricas (.chunk-map-stats-summary)
        const emptyHint = selectionDetails?.querySelector('.chunk-hint-empty');
        expect(emptyHint).not.toBeNull();

        const statsSummary = selectionDetails?.querySelector('.chunk-map-stats-summary');
        expect(statsSummary).not.toBeNull();
        expect(statsSummary?.textContent).toContain('2048 x 2048px');

        modal.close();
    });

    it('deve manter o .chunk-builder-viewport visível e intacto ao selecionar um bloco e abrir as opções de texturas', () => {
        const modal = new ChunkManagerModal(mockMap, () => {});
        modal.open();

        // Clica no bloco (0, 0)
        const firstCard = document.querySelector('.chunk-block-card[data-row="0"][data-col="0"]') as HTMLElement;
        expect(firstCard).not.toBeNull();
        firstCard.click();

        // Valida que o container de workspace e o viewport de chunks continuam presentes no DOM
        const workspaceLayout = document.querySelector('.chunk-workspace-layout');
        const viewport = document.querySelector('.chunk-builder-viewport');
        const container = document.querySelector('.chunk-builder-container');
        expect(workspaceLayout).not.toBeNull();
        expect(viewport).not.toBeNull();
        expect(container).not.toBeNull();

        // O bloco selecionado deve estar ativo
        const activeCard = document.querySelector('.chunk-block-card.selected');
        expect(activeCard).not.toBeNull();
        expect(activeCard?.getAttribute('data-row')).toBe('0');
        expect(activeCard?.getAttribute('data-col')).toBe('0');

        // A coluna de seleção de texturas deve conter o input e a grade de opções
        const customUrlInput = document.querySelector('#input-custom-chunk-url') as HTMLInputElement;
        const browseBtn = document.querySelector('#btn-browse-chunk-file');
        const textureGrid = document.querySelector('.texture-options-grid');

        expect(customUrlInput).not.toBeNull();
        expect(browseBtn).not.toBeNull();
        expect(textureGrid).not.toBeNull();

        modal.close();
    });

    it('deve deletar pontualmente apenas o chunk clicado sem apagar a coluna inteira', () => {
        const testMap: SelectedMapConfig = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            description: 'Mapa 3x3',
            chunks: [
                ['c00', 'c01', 'c02'],
                ['c10', 'c11', 'c12'],
                ['c20', 'c21', 'c22']
            ],
            isInnerMap: false
        };

        const modal = new ChunkManagerModal(testMap, () => {});
        modal.open();

        // Clica no botão de deletar do bloco (0, 1) -> linha 0, coluna 1
        const delBtn = document.querySelector('.btn-delete-chunk-block[data-row="0"][data-col="1"]') as HTMLElement;
        expect(delBtn).not.toBeNull();
        delBtn.click();

        // O chunk (0, 1) deve ficar vazio (''), mas a coluna 1 NÃO deve ter sido removida:
        // A matriz deve continuar tendo 3 colunas e 3 linhas, pois c00, c02, c11, c21 ainda existem!
        expect(testMap.chunks?.length).toBe(3);
        expect(testMap.chunks?.[0]?.length).toBe(3);
        expect(testMap.chunks?.[0]?.[1]).toBe('');
        // As demais células da coluna 1 permanecem intactas
        expect(testMap.chunks?.[1]?.[1]).toBe('c11');
        expect(testMap.chunks?.[2]?.[1]).toBe('c21');
        // E os vizinhos na linha 0 também permanecem
        expect(testMap.chunks?.[0]?.[0]).toBe('c00');
        expect(testMap.chunks?.[0]?.[2]).toBe('c02');

        modal.close();
    });

    it('deve trimar bordas externas quando uma linha ou coluna inteira da borda for esvaziada', () => {
        const testMap: SelectedMapConfig = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 2048,
            height: 2048,
            chunkSize: 1024,
            description: 'Mapa 2x2',
            chunks: [
                ['c00', 'c01'],
                ['', 'c11']
            ],
            isInnerMap: false
        };

        const modal = new ChunkManagerModal(testMap, () => {});
        modal.open();

        // Deleta o chunk restante na coluna 0 (row 0, col 0)
        modal.deleteChunk(0, 0);

        // Agora a coluna 0 inteira está vazia: row 0 col 0 é '', row 1 col 0 é ''
        // O trimEmptyOuterBorders deve aparar a coluna 0, reduzindo a largura da matriz para 1 coluna
        expect(testMap.chunks?.length).toBe(2);
        expect(testMap.chunks?.[0]?.length).toBe(1);
        expect(testMap.chunks?.[0]?.[0]).toBe('c01');
        expect(testMap.chunks?.[1]?.[0]).toBe('c11');
        expect(testMap.width).toBe(1024);

        modal.close();
    });
});

