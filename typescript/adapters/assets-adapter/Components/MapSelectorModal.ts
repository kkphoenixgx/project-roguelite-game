/**
 * @file MapSelectorModal.ts
 * Modal inicial do wireframe ("Selecione o mapa") que exibe os mapas disponíveis
 * do jogo em cards interativos com dimensões e previews.
 */

import { VisualConfigMap, type MapVisualConfig } from "../../web/shared/VisualConfigMap";

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

        this.modalElement.innerHTML = `
            <div class="modal-card glassmorphism map-selector-card">
                <div class="modal-header">
                    <h2>Selecione o mapa</h2>
                    <p class="subtitle">Escolha o território do mundo para abrir ou crie um projeto em branco para exportar texturas fixas</p>
                </div>
                
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
            </div>
        `;

        this.bindEvents();
    }

    private bindEvents(): void {
        const cards = this.modalElement.querySelectorAll('.map-item-card');
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
    }

    public open(): void {
        this.modalElement.classList.add('is-open');
    }

    public close(): void {
        this.modalElement.classList.remove('is-open');
    }
}
