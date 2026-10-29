/**
 * @file AssetDrawer.ts
 * Implementa a gaveta lateral retrátil esquerda desenhada no wireframe,
 * contendo as imagens listadas dinamicamente em grid de 2 colunas com scroll,
 * suporte a Drag and Drop e botão de fechar/colapsar.
 */

import type { AssetScanner } from "./AssetScanner";
import { ASSET_CATEGORIES_CATALOG, type AssetDefinition } from "../Models/AssetDefinition";

export class AssetDrawer {
    private container: HTMLElement;
    private scanner: AssetScanner;
    private currentCategory: string = 'all';
    private typeFilter: 'all' | 'static' | 'sprites' = 'all';
    private searchTerm: string = '';
    private isCollapsed: boolean = false;
    private isTagsFolded: boolean = true;
    private onAssetSelectedCallback?: ((asset: AssetDefinition) => void) | undefined;
    private savedWidthBeforeCollapse: string = '';

    constructor(scanner: AssetScanner, onAssetSelected?: ((asset: AssetDefinition) => void) | undefined) {
        this.scanner = scanner;
        this.onAssetSelectedCallback = onAssetSelected;
        this.container = document.getElementById('asset-drawer') as HTMLElement;
        this.render();
        this.bindGlobalReopenButton();
    }

    public render(): void {
        const assets = this.scanner.getAssets(this.currentCategory, this.searchTerm, this.typeFilter);
        const allInCategory = this.scanner.getAssets(this.currentCategory, this.searchTerm, 'all');
        const spritesCount = allInCategory.filter(a => a.isSprite).length;
        const staticCount = allInCategory.filter(a => !a.isSprite).length;

        this.container.innerHTML = `
            <div class="drawer-header">
                <div class="drawer-title-area">
                    <h3>Biblioteca de Assets</h3>
                    <span class="asset-count-badge">${assets.length} itens</span>
                </div>
                <button id="btn-toggle-drawer" class="btn-toggle-drawer" title="Recolher / Expandir Gaveta">
                    ${this.isCollapsed ? '❯' : '❮'}
                </button>
            </div>

            <div class="drawer-controls">
                <div class="search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="asset-search-input" placeholder="Buscar casas, props, muros..." value="${this.searchTerm}">
                </div>

                <div class="tags-header-row">
                    <span class="tags-section-label">Tags / Categorias</span>
                    <button id="btn-toggle-tags-fold" class="btn-fold-tags" type="button" title="Expandir ou recolher lista de tags">
                        ${this.isTagsFolded ? 'Expandir ▾' : 'Recolher ▴'}
                    </button>
                </div>

                <div class="category-tabs ${this.isTagsFolded ? 'folded' : 'unfolded'}">
                    ${ASSET_CATEGORIES_CATALOG.map(cat => `
                        <button class="cat-tab ${this.currentCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}" data-group="${cat.group}" title="Filtrar por ${cat.label}">
                            ${cat.id === 'all' ? 'Todos' : `${cat.icon} ${cat.label}`}
                        </button>
                    `).join('')}
                </div>

                <div class="type-filter-pills">
                    <button class="type-pill ${this.typeFilter === 'all' ? 'active' : ''}" data-type="all">
                        Tudo (${allInCategory.length})
                    </button>
                    <button class="type-pill ${this.typeFilter === 'static' ? 'active' : ''}" data-type="static">
                        🖼️ Estáticos (${staticCount})
                    </button>
                    <button class="type-pill ${this.typeFilter === 'sprites' ? 'active' : ''}" data-type="sprites">
                        🎞️ Sprites (${spritesCount})
                    </button>
                </div>
            </div>

            <div class="assets-scroll-container">
                <div class="assets-two-column-grid">
                    ${assets.map(asset => this.renderAssetCard(asset)).join('')}
                    ${assets.length === 0 ? `
                        <div class="empty-assets-state">
                            <p>Nenhum asset encontrado para este filtro.</p>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="drawer-footer">
                <button id="btn-open-sprite-modal" class="btn-new-sprite">
                    <span>✨</span> Definir Novo Sprite
                </button>
            </div>
        `;

        this.bindEvents();
    }

    private renderAssetCard(asset: AssetDefinition): string {
        let badgeHtml = `<span class="asset-type-badge static">🖼️ PNG</span>`;
        if (asset.category === 'chunks') {
            badgeHtml = `<span class="asset-type-badge chunk">🧱 Chunk</span>`;
        } else if (asset.category === 'portals') {
            badgeHtml = `<span class="asset-type-badge portal">🌀 Portal</span>`;
        } else if (asset.isItem) {
            badgeHtml = `<span class="asset-type-badge item">⚔️ Item</span>`;
        } else if (asset.category === 'vfx') {
            badgeHtml = `<span class="asset-type-badge vfx">✨ VFX</span>`;
        } else if (asset.isSprite) {
            badgeHtml = `<span class="asset-type-badge sprite">🎞️ Sprite${asset.frameCount && asset.frameCount > 1 ? ` (${asset.frameCount}f)` : ''}</span>`;
        }

        const typeLabel = asset.isItem
            ? ' (Item Coletável)'
            : asset.category === 'chunks'
            ? ' (Chunk de Terreno)'
            : asset.category === 'portals'
            ? ' (PortalLink de Transição)'
            : asset.isSprite
            ? ' (Sprite Animado)'
            : ' (PNG Estático)';

        return `
            <div class="asset-card ${asset.isItem ? 'card-is-item' : (asset.isSprite ? 'card-is-sprite' : 'card-is-static')}" draggable="true" data-asset-id="${asset.id}">
                <div class="asset-thumb-wrapper">
                    <img src="${asset.imageSrc}" alt="${asset.name}" loading="lazy" />
                    <span class="asset-size-pill">${asset.width}x${asset.height}</span>
                    ${badgeHtml}
                </div>
                <span class="asset-card-name" title="${asset.name}${typeLabel}">${asset.name}</span>
            </div>
        `;
    }

    private bindEvents(): void {
        // 1. Toggle recolher gaveta
        const btnToggle = this.container.querySelector('#btn-toggle-drawer');
        btnToggle?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleCollapse();
        });

        // 2. Busca em tempo real
        const searchInput = this.container.querySelector('#asset-search-input') as HTMLInputElement;
        searchInput?.addEventListener('input', (e) => {
            this.searchTerm = (e.target as HTMLInputElement).value;
            this.updateGridOnly();
        });

        // 3. Toggle Fold / Unfold de Tags
        const btnToggleFold = this.container.querySelector('#btn-toggle-tags-fold');
        btnToggleFold?.addEventListener('click', () => {
            this.isTagsFolded = !this.isTagsFolded;
            const catTabsContainer = this.container.querySelector('.category-tabs');
            if (catTabsContainer) {
                catTabsContainer.classList.toggle('folded', this.isTagsFolded);
                catTabsContainer.classList.toggle('unfolded', !this.isTagsFolded);
            }
            if (btnToggleFold) {
                btnToggleFold.textContent = this.isTagsFolded ? 'Expandir ▾' : 'Recolher ▴';
            }
        });

        // 4. Categorias
        const catTabs = this.container.querySelectorAll('.cat-tab');
        catTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentCategory = tab.getAttribute('data-cat') || 'all';
                catTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateGridOnly();
            });
        });

        // 4. Sub-filtro de tipo (Tudo / Estáticos / Sprites)
        const typePills = this.container.querySelectorAll('.type-pill');
        typePills.forEach(pill => {
            pill.addEventListener('click', () => {
                this.typeFilter = (pill.getAttribute('data-type') || 'all') as any;
                typePills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.updateGridOnly();
            });
        });

        // 5. Drag and Drop dos Cards de Imagem
        this.bindDragAndDropEvents();
    }

    private bindDragAndDropEvents(): void {
        const cards = this.container.querySelectorAll('.asset-card');
        cards.forEach(card => {
            const assetId = card.getAttribute('data-asset-id');
            const asset = this.scanner.getAssetById(assetId || '');
            if (!asset) return;

            // Drag Start (HTML5 drag and drop)
            card.addEventListener('dragstart', (e: Event) => {
                const dragEvent = e as DragEvent;
                card.classList.add('is-dragging');
                if (dragEvent.dataTransfer) {
                    dragEvent.dataTransfer.setData('application/json', JSON.stringify(asset));
                    dragEvent.dataTransfer.effectAllowed = 'copy';
                }
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('is-dragging');
            });

            // Clique direto (seleciona ou ativa)
            card.addEventListener('click', () => {
                this.onAssetSelectedCallback?.(asset);
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
    }

    private updateGridOnly(): void {
        const assets = this.scanner.getAssets(this.currentCategory, this.searchTerm, this.typeFilter);
        const allInCategory = this.scanner.getAssets(this.currentCategory, this.searchTerm, 'all');
        const spritesCount = allInCategory.filter(a => a.isSprite).length;
        const staticCount = allInCategory.filter(a => !a.isSprite).length;

        const grid = this.container.querySelector('.assets-two-column-grid');
        const countBadge = this.container.querySelector('.asset-count-badge');
        if (countBadge) countBadge.textContent = `${assets.length} itens`;

        // Atualiza contadores nas pills de tipo
        const pillAll = this.container.querySelector('.type-pill[data-type="all"]');
        if (pillAll) pillAll.textContent = `Tudo (${allInCategory.length})`;
        const pillStatic = this.container.querySelector('.type-pill[data-type="static"]');
        if (pillStatic) pillStatic.textContent = `🖼️ Estáticos (${staticCount})`;
        const pillSprites = this.container.querySelector('.type-pill[data-type="sprites"]');
        if (pillSprites) pillSprites.textContent = `🎞️ Sprites (${spritesCount})`;

        if (grid) {
            grid.innerHTML = assets.map(asset => this.renderAssetCard(asset)).join('');

            if (assets.length === 0) {
                grid.innerHTML = `<div class="empty-assets-state"><p>Nenhum asset encontrado para este filtro.</p></div>`;
            }

            this.bindDragAndDropEvents();
        }
    }

    private bindGlobalReopenButton(): void {
        const btnReopen = document.getElementById('btn-reopen-drawer');
        btnReopen?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.isCollapsed) {
                this.toggleCollapse();
            }
        });
    }

    public toggleCollapse(): void {
        this.isCollapsed = !this.isCollapsed;
        this.container.classList.toggle('is-collapsed', this.isCollapsed);

        const btnToggle = this.container.querySelector('#btn-toggle-drawer') as HTMLButtonElement | null;
        const btnReopen = document.getElementById('btn-reopen-drawer') as HTMLButtonElement | null;
        const drawerResizer = document.getElementById('drawer-resizer') as HTMLElement | null;

        if (this.isCollapsed) {
            this.savedWidthBeforeCollapse = this.container.style.width || '';
            this.container.style.width = '0px';
            this.container.style.display = 'none';
            if (drawerResizer) {
                drawerResizer.style.display = 'none';
            }
            if (btnReopen) {
                btnReopen.style.display = 'flex';
            }
            if (btnToggle) {
                btnToggle.textContent = '❯';
            }
        } else {
            this.container.style.display = 'flex';
            if (this.savedWidthBeforeCollapse) {
                this.container.style.width = this.savedWidthBeforeCollapse;
            } else {
                this.container.style.removeProperty('width');
            }
            if (drawerResizer) {
                drawerResizer.style.display = 'flex';
            }
            if (btnReopen) {
                btnReopen.style.display = 'none';
            }
            if (btnToggle) {
                btnToggle.textContent = '❮';
            }
        }

        window.dispatchEvent(new Event('resize'));
    }

    public isDrawerCollapsed(): boolean {
        return this.isCollapsed;
    }

    public setCollapsed(collapsed: boolean): void {
        if (this.isCollapsed !== collapsed) {
            this.toggleCollapse();
        }
    }

    public refresh(): void {
        this.render();
    }
}
