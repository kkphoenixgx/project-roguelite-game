/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfirmationModal } from '../../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui';

// Mock ConfirmationModal para testes
vi.spyOn(ConfirmationModal, 'alert').mockResolvedValue(true as any);

describe('Polygon Web Editor — Integração URL e Salvamento Direto no Código', () => {
    let EditorAppClass: any;

    beforeEach(async () => {
        document.body.innerHTML = `
            <div id="toolbar">
                <div id="active-asset-banner" style="display: none;">
                    <span id="active-asset-id"></span>
                </div>
                <button id="btn-save-code" style="display: none;">💾 Salvar Alteração</button>
                <button id="btn-load-image">📂 Carregar Sprite</button>
                <input type="file" id="file-input" style="display: none;">
                <button id="btn-tool-select" class="active">🖱️ Selecionar</button>
                <button id="btn-tool-rectangle">▭ Criar Retângulo</button>
                <button id="btn-tool-polygon">⬠ Criar Polígono</button>
                <button id="btn-tool-circle">⭕ Criar Círculo</button>
                <button id="btn-delete-selected" style="display: none;">🗑️ Apagar Hitbox</button>
                <button id="btn-export">💾 Exportar JSON</button>
                <button id="btn-import">📂 Importar JSON</button>
                <input type="file" id="file-import-input" style="display: none;">
                <button id="btn-clear">🗑️ Limpar Todas</button>
            </div>
            <div id="canvas-container" style="width: 800px; height: 600px;">
                <canvas id="editor-canvas"></canvas>
            </div>
            <div id="controls-help" class="closed">
                <div id="controls-help-header">
                    <button id="btn-toggle-help"></button>
                </div>
            </div>
        `;

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
            closePath: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            resetTransform: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            setLineDash: vi.fn(),
        } as unknown as CanvasRenderingContext2D)) as any;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('1. deve inicializar com banner e botão de salvar ocultos quando não há parâmetros na URL', async () => {
        // Sem query string
        delete (window as any).location;
        (window as any).location = { search: '', pathname: '/typescript/adapters/polygonWebEditor/index.html' };

        // Import dinâmico ou instanciação
        await import('../../../adapters/polygonWebEditor/EditorApp');
        // Instanciação manual
        const btnSaveCode = document.getElementById('btn-save-code')!;
        const banner = document.getElementById('active-asset-banner')!;

        expect(btnSaveCode.style.display).toBe('none');
        expect(banner.style.display).toBe('none');
    });

    it('2. deve exibir banner e botão de salvar e buscar hitboxes via API quando assetId estiver na URL', async () => {
        delete (window as any).location;
        (window as any).location = {
            search: '?assetId=house_red_boro&width=305&height=354',
            pathname: '/typescript/adapters/polygonWebEditor/index.html'
        };

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
            if (url.toString().includes('/api/assets-adapter?target=hitboxes')) {
                return {
                    ok: true,
                    json: async () => ({
                        success: true,
                        assetId: 'house_red_boro',
                        hitboxes: [
                            {
                                id: 'hb_1',
                                type: 'polygon',
                                coordinates: { x: 0, y: 0 },
                                rotation: 0,
                                points: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }]
                            }
                        ]
                    })
                } as any;
            }
            return { ok: false } as any;
        });

        // Trigger checkUrlParametersAndInitialize
        const appModule = await import('../../../adapters/polygonWebEditor/EditorApp');
        const AppClass = (appModule as any).default || (appModule as any).PolygonEditorApp || (appModule as any).EditorApp;
        const app = AppClass ? new AppClass() : (window as any).editorApp;

        // Se app não for exportado por default, inicializamos a classe
        const banner = document.getElementById('active-asset-banner')!;
        const assetNameEl = document.getElementById('active-asset-id')!;
        const btnSaveCode = document.getElementById('btn-save-code')!;

        // Aguarda microtarefas assíncronas do fetch
        await new Promise(r => setTimeout(r, 50));

        expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/assets-adapter?target=hitboxes&assetId=house_red_boro'));
        expect(btnSaveCode.style.display).toBe('block');
        expect(banner.style.display).toBe('flex');
        expect(assetNameEl.textContent).toBe('house_red_boro');
    });

    it('3. deve enviar POST para a API do Vite ao salvar as hitboxes do asset', async () => {
        delete (window as any).location;
        (window as any).location = {
            search: '?assetId=stone_well&width=60&height=66',
            pathname: '/typescript/adapters/polygonWebEditor/index.html'
        };

        let postPayload: any = null;
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: any) => {
            if (init && init.method === 'POST') {
                postPayload = JSON.parse(init.body);
                return {
                    ok: true,
                    json: async () => ({ success: true, timestamp: Date.now() })
                } as any;
            }
            return {
                ok: true,
                json: async () => ({ success: true, assetId: 'stone_well', hitboxes: [] })
            } as any;
        });

        const alertSpy = vi.spyOn(ConfirmationModal, 'alert');

        const { PolygonEditorApp } = await import('../../../adapters/polygonWebEditor/EditorApp');
        const app = new PolygonEditorApp();
        await new Promise(r => setTimeout(r, 20));

        const btnSaveCode = document.getElementById('btn-save-code')!;
        btnSaveCode.click();

        await new Promise(r => setTimeout(r, 50));

        expect(fetchSpy).toHaveBeenCalledWith('/api/assets-adapter?target=hitboxes', expect.objectContaining({
            method: 'POST'
        }));
        expect(postPayload).not.toBeNull();
        expect(postPayload.assetId).toBe('stone_well');
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('salva no código com sucesso'));
    });

    it('4. deve carregar hitboxes perfeitamente alinhadas com as dimensões de house_blue_leda sem extrapolar o sprite', async () => {
        delete (window as any).location;
        (window as any).location = {
            search: '?assetId=house_blue_leda&width=260&height=327',
            pathname: '/typescript/adapters/polygonWebEditor/index.html'
        };

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
            if (url.toString().includes('/api/assets-adapter?target=hitboxes&assetId=house_blue_leda')) {
                return {
                    ok: true,
                    json: async () => ({
                        success: true,
                        assetId: 'house_blue_leda',
                        baseWidth: 260,
                        baseHeight: 327,
                        hitboxes: [
                            {
                                id: 'house_blue_leda_poly_1',
                                type: 'polygon',
                                coordinates: { x: 0, y: 0 },
                                rotation: 0,
                                points: [
                                    { x: 23, y: 310 },
                                    { x: 238, y: 310 },
                                    { x: 238, y: 190 },
                                    { x: 23, y: 190 }
                                ]
                            }
                        ]
                    })
                } as any;
            }
            return { ok: false } as any;
        });

        const { PolygonEditorApp } = await import('../../../adapters/polygonWebEditor/EditorApp');
        const app = new PolygonEditorApp();
        await new Promise(r => setTimeout(r, 50));

        const hitboxes = (app as any).hitboxes;
        expect(hitboxes).toBeDefined();
        expect(hitboxes.length).toBe(1);

        const hb = hitboxes[0];
        expect(hb.type).toBe('polygon');
        for (const pt of hb.points) {
            expect(pt.x).toBeGreaterThanOrEqual(0);
            expect(pt.x).toBeLessThanOrEqual(260);
            expect(pt.y).toBeGreaterThanOrEqual(0);
            expect(pt.y).toBeLessThanOrEqual(327);
            // Ensure no legacy unscaled coordinates (e.g. 540, 880)
            expect(pt.y).not.toBe(880);
            expect(pt.y).not.toBe(540);
        }
    });

    it('5. deve selecionar a hitbox ao clicar no seu corpo ou borda e exibir botão de apagar', async () => {
        const { PolygonEditorApp } = await import('../../../adapters/polygonWebEditor/EditorApp');
        const app = new PolygonEditorApp();

        // Adiciona uma hitbox de teste
        (app as any).hitboxes = [
            {
                id: 'test_poly',
                type: 'polygon',
                coordinates: { x: 0, y: 0 },
                rotation: 0,
                points: [{ x: 50, y: 50 }, { x: 150, y: 50 }, { x: 150, y: 150 }, { x: 50, y: 150 }]
            }
        ];
        (app as any).setupTools();

        const selectTool = (app as any).tools['select'];
        const btnDeleteSelected = document.getElementById('btn-delete-selected')!;

        expect(selectTool.selectedHitbox).toBeNull();
        expect(btnDeleteSelected.style.display).toBe('none');

        // Clica no centro da hitbox (100, 100)
        selectTool.onMouseDown(new MouseEvent('mousedown', { button: 0 }), { x: 100, y: 100 }, 1);

        expect(selectTool.selectedHitbox).not.toBeNull();
        expect(selectTool.selectedHitbox.id).toBe('test_poly');
        expect(btnDeleteSelected.style.display).toBe('block');
    });

    it('6. deve apagar a hitbox selecionada ao pressionar Delete ou clicar no botão de apagar', async () => {
        const { PolygonEditorApp } = await import('../../../adapters/polygonWebEditor/EditorApp');
        const app = new PolygonEditorApp();

        (app as any).hitboxes = [
            {
                id: 'test_poly_del',
                type: 'polygon',
                coordinates: { x: 0, y: 0 },
                rotation: 0,
                points: [{ x: 50, y: 50 }, { x: 150, y: 50 }, { x: 150, y: 150 }, { x: 50, y: 150 }]
            }
        ];
        (app as any).setupTools();

        const selectTool = (app as any).tools['select'];
        const btnDeleteSelected = document.getElementById('btn-delete-selected')!;

        // Seleciona a hitbox
        selectTool.onMouseDown(new MouseEvent('mousedown', { button: 0 }), { x: 100, y: 100 }, 1);
        expect(selectTool.selectedHitbox).not.toBeNull();
        expect((app as any).hitboxes.length).toBe(1);

        // Clica no botão de apagar
        btnDeleteSelected.click();

        expect(selectTool.selectedHitbox).toBeNull();
        expect((app as any).hitboxes.length).toBe(0);
        expect(btnDeleteSelected.style.display).toBe('none');
    });

    it('7. deve apagar a hitbox com clique direito no corpo da hitbox', async () => {
        const { PolygonEditorApp } = await import('../../../adapters/polygonWebEditor/EditorApp');
        const app = new PolygonEditorApp();

        (app as any).hitboxes = [
            {
                id: 'test_poly_rclick',
                type: 'polygon',
                coordinates: { x: 0, y: 0 },
                rotation: 0,
                points: [{ x: 50, y: 50 }, { x: 150, y: 50 }, { x: 150, y: 150 }, { x: 50, y: 150 }]
            }
        ];
        (app as any).setupTools();

        const selectTool = (app as any).tools['select'];

        // Clique direito no centro da hitbox (100, 100) com botão 2
        selectTool.onMouseDown(new MouseEvent('mousedown', { button: 2 }), { x: 100, y: 100 }, 1);

        expect((app as any).hitboxes.length).toBe(0);
        expect(selectTool.selectedHitbox).toBeNull();
    });
});
