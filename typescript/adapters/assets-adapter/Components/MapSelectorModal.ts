/**
 * @file MapSelectorModal.ts
 * Modal inicial do wireframe ("Selecione o mapa") que exibe os mapas disponíveis
 * do jogo em cards interativos com dimensões e previews.
 */

import { VisualConfigMap, type MapVisualConfig } from "../../web/shared/VisualConfigMap";
import { InnerMapManager } from "./InnerMapManager";

/** Imagem de grama padrão usada como fundo inicial de mapas novos (resolvida pelo middleware /assets do Vite). */
export const DEFAULT_NEW_MAP_BACKGROUND = '/assets/maps/vilgem/grass_seamless_base.png';

export interface ChunkOriginDTO {
    cx: number;
    cy: number;
}

export interface WorldBoundsDTO {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface SelectedMapConfig {
    id: string;
    name: string;
    width: number;
    height: number;
    chunkSize: number;
    chunks?: string[][] | undefined;
    description?: string | undefined;
    isInnerMap?: boolean | undefined;
    parentWorldId?: string | undefined;
    backgroundColor?: string | undefined;
    /** Chunk onde se localiza a origem (0, 0) no grid (ex: { cx: 1, cy: 1 } para Vilgem) */
    originChunk?: ChunkOriginDTO | undefined;
    minChunkX?: number | undefined;
    minChunkY?: number | undefined;
    worldBounds?: WorldBoundsDTO | undefined;
}

export class MapSelectorModal {
    private modalElement: HTMLElement;
    private onSelectCallback: (config: SelectedMapConfig) => void;
    /** Tela atual do modal: lista de mapas ou formulário de criação de mapa novo. */
    private view: 'list' | 'create' = 'list';
    private createError: string = '';

    private availableMaps: SelectedMapConfig[] = [
        {
            id: 'blank_project',
            name: 'Projeto em Branco (Fundo Fixo)',
            width: 1024,
            height: 1024,
            chunkSize: 1024,
            chunks: [['']],
            description: 'Área livre de 1024x1024px sem objetos ou hitboxes, ideal para compor e exportar texturas sólidas de fundo (chão de cidades).'
        },
        {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            chunks: (VisualConfigMap['vilgem'] as MapVisualConfig)?.chunks,
            originChunk: { cx: 1, cy: 1 },
            description: 'Vila central medieval composta por 3x3 chunks de 1024px com a Praça Maior (Origem Central no Spawn 0,0).'
        },
        {
            id: 'alun',
            name: 'Torre de Alun',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            chunks: (VisualConfigMap['alun'] as MapVisualConfig)?.chunks,
            originChunk: { cx: 0, cy: 0 },
            description: 'Região arcana da grande torre e arredores místicos.'
        },
        {
            id: 'cemii',
            name: 'Ruínas de Cemii',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            chunks: (VisualConfigMap['cemii'] as MapVisualConfig)?.chunks,
            originChunk: { cx: 0, cy: 0 },
            description: 'Ruínas ancestrais corrompidas e catacumbas abandonadas.'
        }
    ];

    constructor(onSelectCallback: (config: SelectedMapConfig) => void) {
        this.onSelectCallback = onSelectCallback;
        this.modalElement = document.createElement('div');
        this.modalElement.id = 'map-selector-modal';
        this.modalElement.className = 'modal-backdrop';
        this.render();
        document.body.appendChild(this.modalElement);
    }

    private render(): void {
        this.availableMaps.forEach(m => {
            if (m.id === 'blank_project') return;
            const visual = VisualConfigMap[m.id] as MapVisualConfig | undefined;
            if (visual?.chunks && visual.chunks.length > 0) {
                m.chunks = visual.chunks;
                if (visual.originChunk) m.originChunk = visual.originChunk;
                if (visual.chunkSize) m.chunkSize = visual.chunkSize;
            }
        });

        if (this.view === 'create') {
            this.modalElement.innerHTML = this.renderCreateForm();
            this.bindCreateFormEvents();
            return;
        }

        const standaloneMaps = InnerMapManager.getInstance().getStandaloneMaps();

        this.modalElement.innerHTML = `
            <div class="modal-card glassmorphism map-selector-card">
                <div class="modal-header">
                    <div>
                        <h2>Selecione o mapa</h2>
                        <p class="subtitle">Escolha o território do mundo para abrir ou crie um projeto em branco para exportar texturas fixas</p>
                    </div>
                    <button type="button" class="modal-close-btn" id="btn-map-selector-close" title="Fechar">✕</button>
                </div>

                <h3 class="map-section-title">Mundos</h3>
                <div class="map-grid">
                    ${this.availableMaps.map(map => {
                        const thumbUrl = map.chunks?.[1]?.[1] || map.chunks?.[0]?.[0];
                        return `
                        <div class="map-item-card ${map.id === 'blank_project' ? 'blank-project-card' : ''}" data-map-id="${map.id}">
                            <div class="map-preview-thumb ${map.id === 'blank_project' ? 'blank-project-thumb' : ''}">
                                ${map.id === 'blank_project' ?
                                    `<div class="placeholder-thumb blank-thumb-content"><span class="blank-icon">🎨</span><span>Projeto em Branco</span><span class="blank-tag">Exportador de Chão/Fundo</span></div>` :
                                    (thumbUrl ? 
                                        `<img src="${thumbUrl}" alt="${map.name}" />` : 
                                        `<div class="placeholder-thumb">🗺️ ${map.name}</div>`
                                    )
                                }
                                <span class="map-dimension-badge">${map.width}x${map.height}px</span>
                            </div>
                            <div class="map-info">
                                <h3>${map.name}</h3>
                                <p>${map.description}</p>
                                <span class="chunk-badge">${Math.round(map.width / map.chunkSize)}x${Math.round(map.height / map.chunkSize)} Chunks (${map.chunkSize}px)</span>
                            </div>
                            <button class="btn-select-map">Abrir Mapa</button>
                        </div>
                    `;}).join('')}
                </div>

                <h3 class="map-section-title">Mapas Independentes</h3>
                <div class="map-grid">
                    <div class="map-item-card new-map-card" id="btn-new-map-card" title="Criar um mapa novo baseado em chunks">
                        <div class="map-preview-thumb new-map-thumb">
                            <div class="placeholder-thumb"><span class="blank-icon">➕</span><span>Novo Mapa</span></div>
                        </div>
                        <div class="map-info">
                            <h3>Novo Mapa</h3>
                            <p>Escolha nome, tamanho em chunks e imagem de fundo.</p>
                        </div>
                        <button class="btn-select-map">Criar Mapa</button>
                    </div>
                    ${standaloneMaps.map(def => {
                        const thumbUrl = def.chunks?.[0]?.[0];
                        const chunkSize = def.chunkSize || 1024;
                        return `
                        <div class="map-item-card standalone-map-card" data-standalone-map-id="${def.id}">
                            <div class="map-preview-thumb">
                                ${thumbUrl ? `<img src="${thumbUrl}" alt="${def.name || def.id}" />` : `<div class="placeholder-thumb" style="background:${def.backgroundColor || '#000'}">🗺️ ${def.name || def.id}</div>`}
                                <span class="map-dimension-badge">${def.width}x${def.height}px</span>
                            </div>
                            <div class="map-info">
                                <h3>${def.name || def.id}</h3>
                                <p><code>${def.id}</code></p>
                                <span class="chunk-badge">${Math.round(def.width / chunkSize)}x${Math.round(def.height / chunkSize)} Chunks (${chunkSize}px)</span>
                            </div>
                            <button class="btn-select-map">Abrir Mapa</button>
                        </div>
                    `;}).join('')}
                </div>
            </div>
        `;

        this.bindEvents();
    }

    private bindCloseButton(): void {
        this.modalElement.querySelector('#btn-map-selector-close')?.addEventListener('click', () => {
            this.view = 'list';
            this.close();
        });
    }

    private bindEvents(): void {
        this.bindCloseButton();
        const cards = this.modalElement.querySelectorAll('.map-item-card[data-map-id]');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const mapId = card.getAttribute('data-map-id');
                const config = this.availableMaps.find(m => m.id === mapId);
                if (config) {
                    this.close();
                    this.onSelectCallback(config);
                }
            });
        });

        this.modalElement.querySelectorAll('.map-item-card[data-standalone-map-id]').forEach(card => {
            card.addEventListener('click', () => {
                const mgr = InnerMapManager.getInstance();
                const def = mgr.getInnerMap(card.getAttribute('data-standalone-map-id') || '');
                if (def) {
                    this.close();
                    this.onSelectCallback(mgr.toSelectedMapConfig(def));
                }
            });
        });

        this.modalElement.querySelector('#btn-new-map-card')?.addEventListener('click', () => {
            this.view = 'create';
            this.createError = '';
            this.render();
        });
    }

    /** Lista de mapas que podem receber o portal de retorno de um mapa novo. */
    private getReturnMapOptions(): { id: string; name: string }[] {
        const roots = this.availableMaps.filter(m => m.id !== 'blank_project').map(m => ({ id: m.id, name: m.name }));
        const others = InnerMapManager.getInstance().getAll().map(m => ({ id: m.id, name: m.name || m.id }));
        return [...roots, ...others];
    }

    private renderCreateForm(): string {
        const returnOptions = this.getReturnMapOptions();
        return `
            <div class="modal-card glassmorphism map-selector-card new-map-form-card">
                <div class="modal-header">
                    <div>
                        <h2>Novo Mapa</h2>
                        <p class="subtitle">Mapa independente baseado em chunks de 1024px. Depois de criado, você edita fundo, cenário e portais normalmente.</p>
                    </div>
                    <button type="button" class="modal-close-btn" id="btn-map-selector-close" title="Fechar">✕</button>
                </div>

                <div class="new-map-form">
                    <label class="prop-label">Nome do mapa
                        <input type="text" id="new-map-name" class="prop-input" placeholder="Ex: Floresta Sombria">
                    </label>
                    <label class="prop-label">ID (gerado do nome, usado em portais)
                        <input type="text" id="new-map-id" class="prop-input" placeholder="floresta_sombria">
                    </label>
                    <div class="new-map-form-row">
                        <label class="prop-label">Colunas (chunks)
                            <input type="number" id="new-map-cols" class="prop-input" value="3" min="1" max="32">
                        </label>
                        <label class="prop-label">Linhas (chunks)
                            <input type="number" id="new-map-rows" class="prop-input" value="3" min="1" max="32">
                        </label>
                        <span class="new-map-size-preview" id="new-map-size-preview">3072 x 3072 px</span>
                    </div>

                    <fieldset class="new-map-bg-options">
                        <legend class="prop-label">Fundo inicial</legend>
                        <label><input type="radio" name="new-map-bg" value="grass" checked> Grama padrão</label>
                        <label><input type="radio" name="new-map-bg" value="image"> Imagem do computador (aplicada em todos os chunks)</label>
                        <input type="file" id="new-map-bg-file" accept="image/png,image/jpeg,image/webp" disabled>
                        <label><input type="radio" name="new-map-bg" value="color"> Cor sólida
                            <input type="color" id="new-map-bg-color" value="#000000">
                        </label>
                    </fieldset>

                    <label class="prop-label">Portal de volta para
                        <select id="new-map-return" class="prop-input">
                            <option value="">Nenhum (sem portal de retorno)</option>
                            ${returnOptions.map(o => `<option value="${o.id}" ${o.id === 'vilgem' ? 'selected' : ''}>${o.name} (${o.id})</option>`).join('')}
                        </select>
                    </label>

                    ${this.createError ? `<div class="new-map-error" id="new-map-error">⚠️ ${this.createError}</div>` : ''}
                </div>

                <div class="modal-footer">
                    <button type="button" id="btn-new-map-cancel" class="btn-secondary">Voltar</button>
                    <button type="button" id="btn-new-map-create" class="btn-primary-highlight">➕ Criar e Abrir</button>
                </div>
            </div>
        `;
    }

    private bindCreateFormEvents(): void {
        this.bindCloseButton();
        const q = <T extends HTMLElement>(sel: string) => this.modalElement.querySelector(sel) as T | null;
        const nameInput = q<HTMLInputElement>('#new-map-name');
        const idInput = q<HTMLInputElement>('#new-map-id');
        const colsInput = q<HTMLInputElement>('#new-map-cols');
        const rowsInput = q<HTMLInputElement>('#new-map-rows');
        const fileInput = q<HTMLInputElement>('#new-map-bg-file');
        const preview = q<HTMLElement>('#new-map-size-preview');
        let idEditedManually = false;

        nameInput?.addEventListener('input', () => {
            if (!idEditedManually && idInput) idInput.value = InnerMapManager.slugifyMapId(nameInput.value);
        });
        idInput?.addEventListener('input', () => { idEditedManually = idInput.value.trim() !== ''; });

        const updatePreview = () => {
            const cols = Math.max(1, Number(colsInput?.value || 1));
            const rows = Math.max(1, Number(rowsInput?.value || 1));
            if (preview) preview.textContent = `${cols * 1024} x ${rows * 1024} px`;
        };
        colsInput?.addEventListener('input', updatePreview);
        rowsInput?.addEventListener('input', updatePreview);

        this.modalElement.querySelectorAll('input[name="new-map-bg"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (fileInput) fileInput.disabled = this.getSelectedBackgroundMode() !== 'image';
            });
        });

        q('#btn-new-map-cancel')?.addEventListener('click', () => {
            this.view = 'list';
            this.render();
        });

        q('#btn-new-map-create')?.addEventListener('click', () => {
            void this.createFromForm();
        });
    }

    private getSelectedBackgroundMode(): 'grass' | 'image' | 'color' {
        const checked = this.modalElement.querySelector('input[name="new-map-bg"]:checked') as HTMLInputElement | null;
        return (checked?.value as 'grass' | 'image' | 'color') || 'grass';
    }

    private showCreateError(message: string): void {
        this.createError = message;
        let box = this.modalElement.querySelector('#new-map-error') as HTMLElement | null;
        if (!box) {
            box = document.createElement('div');
            box.id = 'new-map-error';
            box.className = 'new-map-error';
            this.modalElement.querySelector('.new-map-form')?.appendChild(box);
        }
        box.textContent = `⚠️ ${message}`;
    }

    /** Envia a imagem escolhida para o disco via API do editor e devolve a URL servida pelo Vite. */
    private async uploadBackgroundImage(mapId: string, file: File): Promise<string> {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
            reader.readAsDataURL(file);
        });
        const res = await fetch(`/api/assets-adapter?target=save-chunk-image&mapId=${encodeURIComponent(mapId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mapId, row: 0, col: 0, dataUrl, fileName: file.name })
        });
        if (!res.ok) throw new Error('O servidor do editor não conseguiu salvar a imagem.');
        const data = await res.json();
        if (!data.url) throw new Error('O servidor do editor não retornou o caminho da imagem.');
        return data.url as string;
    }

    /** Lê o formulário, cria o mapa independente e o abre no editor. */
    public async createFromForm(): Promise<SelectedMapConfig | null> {
        const value = (sel: string) => (this.modalElement.querySelector(sel) as HTMLInputElement | null)?.value?.trim() || '';
        const name = value('#new-map-name');
        const id = InnerMapManager.slugifyMapId(value('#new-map-id') || name);
        const cols = Math.min(32, Math.max(1, Number(value('#new-map-cols') || 1)));
        const rows = Math.min(32, Math.max(1, Number(value('#new-map-rows') || 1)));
        const returnMapId = value('#new-map-return') || undefined;
        const mode = this.getSelectedBackgroundMode();

        if (!name) {
            this.showCreateError('Informe um nome para o mapa.');
            return null;
        }

        const mgr = InnerMapManager.getInstance();
        if (mgr.hasInnerMap(id) || InnerMapManager.ROOT_WORLDS.has(id)) {
            this.showCreateError(`Já existe um mapa com o ID "${id}".`);
            return null;
        }

        try {
            let backgroundUrl = DEFAULT_NEW_MAP_BACKGROUND;
            let backgroundColor = '#000000';
            if (mode === 'color') {
                backgroundUrl = '';
                backgroundColor = value('#new-map-bg-color') || '#000000';
            } else if (mode === 'image') {
                const file = (this.modalElement.querySelector('#new-map-bg-file') as HTMLInputElement | null)?.files?.[0];
                if (!file) {
                    this.showCreateError('Escolha uma imagem de fundo ou outra opção de fundo.');
                    return null;
                }
                backgroundUrl = await this.uploadBackgroundImage(id, file);
            }

            const def = await mgr.createStandaloneMap({ name, id, cols, rows, backgroundUrl, backgroundColor, returnMapId });
            const config = mgr.toSelectedMapConfig(def);
            this.view = 'list';
            this.createError = '';
            this.close();
            this.onSelectCallback(config);
            return config;
        } catch (err: any) {
            this.showCreateError(err?.message || String(err));
            return null;
        }
    }

    public open(): void {
        this.view = 'list';
        this.render();
        this.modalElement.classList.add('is-open');
    }

    /** Abre o modal direto no formulário de "Novo Mapa" (menu Arquivo > Novo Mapa...). */
    public openCreateForm(): void {
        this.view = 'create';
        this.createError = '';
        this.render();
        this.modalElement.classList.add('is-open');
    }

    public close(): void {
        this.modalElement.classList.remove('is-open');
    }
}
