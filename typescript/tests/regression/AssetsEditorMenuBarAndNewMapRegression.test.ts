// @vitest-environment jsdom
/**
 * @file AssetsEditorMenuBarAndNewMapRegression.test.ts
 * Testes de regressão do Assets Editor:
 * 1. Barra superior em menus suspensos: nenhum comando do EditorApp pode ficar sem item no HTML.
 * 2. "Novo Mapa": cria mapa independente pelo seletor e ele passa a ser listado e reaberto.
 * 3. Fundo: a imagem de um chunk pode ser aplicada a todos os chunks pelo botão do gerenciador.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { MapSelectorModal, DEFAULT_NEW_MAP_BACKGROUND, type SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';
import { InnerMapManager } from '../../adapters/assets-adapter/Components/InnerMapManager';
import { ChunkManagerModal } from '../../adapters/assets-adapter/Components/ChunkManagerModal';

const EDITOR_DIR = path.resolve(__dirname, '../../adapters/assets-adapter');

describe('AssetsEditorMenuBarAndNewMapRegression (Regression Test)', () => {
    describe('1. Barra de menus', () => {
        const html = fs.readFileSync(path.join(EDITOR_DIR, 'index.html'), 'utf-8');
        const header = html.slice(html.indexOf('<header id="top-navbar">'), html.indexOf('</header>'));
        const editorSource = fs.readFileSync(path.join(EDITOR_DIR, 'EditorApp.ts'), 'utf-8');

        it('todo elemento que o EditorApp procura por ID existe no index.html', () => {
            const ids = [...editorSource.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]!);
            const missing = [...new Set(ids)].filter(id => !html.includes(`id="${id}"`));
            expect(missing).toEqual([]);
        });

        it('o topo usa menus (Arquivo, Mapa, Exibir, Ferramentas) em vez de uma fileira de botões grandes', () => {
            const triggers = [...header.matchAll(/class="menu-trigger"[^>]*>([^<]+)</g)].map(m => m[1]!.trim());
            expect(triggers).toEqual(['Arquivo', 'Mapa', 'Exibir', 'Ferramentas']);
            expect(header).not.toContain('class="nav-btn');
        });

        it('os comandos antigos continuam disponíveis como itens de menu', () => {
            for (const id of [
                'btn-quick-change-map', 'btn-manage-chunks', 'btn-quick-toggle-snap', 'btn-quick-toggle-hitboxes',
                'btn-quick-toggle-player-ref', 'btn-quick-stamp-mode', 'btn-quick-chunk-brush',
                'btn-quick-export-image', 'btn-open-sprite-modal', 'btn-menu-new-map'
            ]) {
                expect(header, id).toMatch(new RegExp(`class="menu-item[^"]*" id="${id}"`));
            }
        });

        it('mantém o h1 usado pelo título do mapa aberto e o selo de sincronização', () => {
            expect(header).toMatch(/<h1[^>]*>/);
            expect(header).toContain('id="sync-status-badge"');
            expect(header).toContain('id="sync-status-text"');
        });
    });

    describe('2. Novo Mapa (mapa independente)', () => {
        beforeEach(() => {
            (InnerMapManager as any).instance = undefined;
            vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
            document.body.innerHTML = '';
        });

        afterEach(() => {
            vi.unstubAllGlobals();
            (InnerMapManager as any).instance = undefined;
            document.body.innerHTML = '';
        });

        it('o seletor mostra o cartão "Novo Mapa" e abre o formulário', () => {
            const modal = new MapSelectorModal(() => {});
            modal.open();

            (document.querySelector('#btn-new-map-card') as HTMLElement).click();

            expect(document.querySelector('#new-map-name')).not.toBeNull();
            expect(document.querySelector('#new-map-cols')).not.toBeNull();
            expect(document.querySelector('#new-map-return')).not.toBeNull();
        });

        it('criar pelo formulário abre o mapa novo no editor e ele aparece na lista ao reabrir', async () => {
            let opened: SelectedMapConfig | null = null;
            const modal = new MapSelectorModal(cfg => { opened = cfg; });
            modal.openCreateForm();

            (document.querySelector('#new-map-name') as HTMLInputElement).value = 'Regressao Mapa Novo';
            (document.querySelector('#new-map-cols') as HTMLInputElement).value = '2';
            (document.querySelector('#new-map-rows') as HTMLInputElement).value = '3';

            const config = await modal.createFromForm();

            expect(config).not.toBeNull();
            expect(opened).toEqual(config);
            expect(config!.id).toBe('regressao_mapa_novo');
            expect(config!.width).toBe(2048);
            expect(config!.height).toBe(3072);
            expect(config!.chunks?.[0]?.[0]).toBe(DEFAULT_NEW_MAP_BACKGROUND);

            modal.open();
            const card = document.querySelector('[data-standalone-map-id="regressao_mapa_novo"]') as HTMLElement;
            expect(card).not.toBeNull();

            opened = null;
            card.click();
            expect((opened as unknown as SelectedMapConfig).id).toBe('regressao_mapa_novo');
        });

        it('mostra erro e não cria quando o nome está vazio', async () => {
            const onSelect = vi.fn();
            const modal = new MapSelectorModal(onSelect);
            modal.openCreateForm();

            const config = await modal.createFromForm();

            expect(config).toBeNull();
            expect(onSelect).not.toHaveBeenCalled();
            expect(document.querySelector('#new-map-error')?.textContent).toContain('nome');
        });

        it('o seletor pode ser fechado sem escolher mapa (aberto pelo menu)', () => {
            const modal = new MapSelectorModal(() => {});
            modal.open();
            const root = document.getElementById('map-selector-modal')!;
            expect(root.classList.contains('is-open')).toBe(true);

            (document.querySelector('#btn-map-selector-close') as HTMLElement).click();

            expect(root.classList.contains('is-open')).toBe(false);
        });
    });

    describe('3. Fundo em todos os chunks', () => {
        beforeEach(() => {
            vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
        });

        afterEach(() => {
            vi.unstubAllGlobals();
            document.body.innerHTML = '';
        });

        it('com um chunk selecionado, o botão "Aplicar a Todos os Chunks" replica a imagem dele no mapa 3x3', () => {
            const map: SelectedMapConfig = {
                id: 'regressao_fundo',
                name: 'Regressão Fundo',
                width: 3072,
                height: 3072,
                chunkSize: 1024,
                chunks: InnerMapManager.buildChunkGrid(3, 3, '/assets/maps/vilgem/grass_seamless_base.png')
            };
            const modal = new ChunkManagerModal(map, () => {});
            modal.open();
            modal.setChunkBackground(0, 0, '/assets/maps/regressao_fundo/teste.png', 'assets/maps/regressao_fundo/teste.png');
            (modal as any).selectedCell = { row: 0, col: 0 };
            (modal as any).render();

            const button = document.querySelector('#btn-apply-bg-all-chunks') as HTMLButtonElement;
            expect(button).not.toBeNull();
            expect(button.disabled).toBe(false);
            button.click();

            expect(map.chunks!.flat()).toEqual(Array(9).fill('/assets/maps/regressao_fundo/teste.png'));
            modal.close();
        });
    });
});
