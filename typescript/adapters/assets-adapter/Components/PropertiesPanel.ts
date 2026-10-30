/**
 * @file PropertiesPanel.ts
 * Implementa a coluna da direita: "propriedades" (detalhes de sprites, configurações...).
 * Exibe as informações completas do sprite selecionado (frames, dimensões, velocidade em ticks e ms),
 * além de controles visuais do mapa sem botões redundantes de exportação manual.
 */

import type { PlacedAssetModel } from "../Models/PlacedAssetModel";
import type { AssetDefinition } from "../Models/AssetDefinition";
import type { MapCanvas } from "./MapCanvas";
import type { SelectedMapConfig } from "./MapSelectorModal";
import { InnerMapManager } from "./InnerMapManager";
import { PortalLinksMap } from "../../../domain/ObjectModule/Maps/PortalLinks/portalLinksMap";
import ItemFactory from "../../../domain/ObjectModule/Items/ItemFactory";
import { CLASS_TO_ITEM_KEY } from "./AssetScanner";
import { VisualConfigMap } from "../../web/shared/VisualConfigMap";
import { ConfirmationModal } from "../../web/GUIS/confirmationModalModule/ConfirmationModalGui";
import { ChunkManagerModal } from "./ChunkManagerModal";

export class PropertiesPanel {
    private container: HTMLElement;
    private canvasRef: MapCanvas;
    private onOpenSpriteModalCallback?: (() => void) | undefined;
    private onOpenMapSelectorCallback?: (() => void) | undefined;
    private onManageChunksCallback?: (() => void) | undefined;
    private onOpenMapCallback?: ((mapConfig: SelectedMapConfig) => void) | undefined;
    private activeDefinition: AssetDefinition | null = null;
    private lastSelectedUid: string | null = null;

    constructor(
        containerId: string, 
        canvasRef: MapCanvas,
        onExportClick?: (() => void) | undefined,
        onOpenSpriteModal?: (() => void) | undefined,
        onOpenMapSelector?: (() => void) | undefined,
        onManageChunks?: (() => void) | undefined,
        onOpenMap?: ((mapConfig: SelectedMapConfig) => void) | undefined
    ) {
        this.container = document.getElementById(containerId) as HTMLElement;
        this.canvasRef = canvasRef;
        this.onOpenSpriteModalCallback = onOpenSpriteModal;
        this.onOpenMapSelectorCallback = onOpenMapSelector;
        this.onManageChunksCallback = onManageChunks;
        this.onOpenMapCallback = onOpenMap;
        this.render();
    }

    public render(): void {
        const oldScrollBody = this.container.querySelector('.prop-scroll-body') as HTMLElement | null;
        const currentUid = this.canvasRef.selectedAssets.length > 1
            ? '__multi__'
            : (this.canvasRef.selectedAsset?.uid || (this.activeDefinition?.id || '__overview__'));

        const shouldPreserveScroll = this.lastSelectedUid === currentUid;
        const savedScrollTop = (shouldPreserveScroll && oldScrollBody) 
            ? oldScrollBody.scrollTop 
            : (shouldPreserveScroll ? (this.container.scrollTop || 0) : 0);

        this.lastSelectedUid = currentUid;

        const multiAssets = this.canvasRef.selectedAssets;
        if (multiAssets && multiAssets.length > 1) {
            this.activeDefinition = null;
            this.renderMultiSelectionProperties(multiAssets);
            this.restoreScroll(savedScrollTop);
            return;
        }

        const asset = this.canvasRef.selectedAsset;

        if (asset) {
            this.activeDefinition = null;
            this.renderAssetProperties(asset);
        } else if (this.activeDefinition) {
            this.renderAssetDefinitionInfo(this.activeDefinition);
        } else {
            this.renderMapOverview();
        }

        this.restoreScroll(savedScrollTop);
    }

    private restoreScroll(scrollTop: number): void {
        if (!scrollTop || scrollTop <= 0) return;
        const apply = () => {
            const newScrollBody = this.container.querySelector('.prop-scroll-body') as HTMLElement | null;
            if (newScrollBody) {
                newScrollBody.scrollTop = scrollTop;
            } else if (this.container) {
                this.container.scrollTop = scrollTop;
            }
        };

        apply();

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => apply());
        }
    }

    private getClosestScalePreset(val: number): string | null {
        const presets = [
            { key: '0.5', num: 0.5 },
            { key: '0.667', num: 0.667 },
            { key: '0.75', num: 0.75 },
            { key: '1.0', num: 1.0 },
            { key: '1.25', num: 1.25 },
            { key: '1.5', num: 1.5 },
            { key: '2.0', num: 2.0 },
            { key: '2.5', num: 2.5 },
            { key: '3.0', num: 3.0 }
        ];
        const match = presets.find(p => Math.abs(p.num - val) < 0.035);
        return match ? match.key : null;
    }

    /**
     * Renderiza o painel quando múltiplos assets estão selecionados em área (Marquee / Multi-select)
     */
    private renderMultiSelectionProperties(assets: PlacedAssetModel[]): void {
        this.container.innerHTML = `
            <div class="prop-panel-header">
                <h3>Seleção Múltipla</h3>
                <span class="prop-badge highlight">${assets.length} Objetos</span>
            </div>

            <div class="prop-scroll-body">
                <div class="prop-section">
                    <label class="prop-label">Ações em Grupo</label>
                    <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 12px 0;">
                        ${assets.length} objetos selecionados na área. Arraste no mapa para mover em conjunto ou execute as ações:
                    </p>
                    <div class="prop-actions-section" style="margin-top: 0;">
                        <button type="button" id="btn-group-copy" class="btn-action btn-duplicate" title="Copiar todos os objetos selecionados (Ctrl+C)">
                            <span>📋</span> Copiar (Ctrl+C)
                        </button>
                        <button type="button" id="btn-group-paste" class="btn-action btn-snap-grid" title="Colar objetos copiados (Ctrl+V)">
                            <span>📄</span> Colar (Ctrl+V)
                        </button>
                        <button type="button" id="btn-group-duplicate" class="btn-action btn-duplicate" title="Duplicar todos os objetos selecionados (Ctrl+D)">
                            <span>✨</span> Duplicar (Ctrl+D)
                        </button>
                        <button type="button" id="btn-group-center-chunk" class="btn-action btn-center-chunk" title="Centralizar seleção: posiciona o grupo de objetos no centro exato do chunk onde estão (Tecla C)">
                            <span>🎯</span> Centralizar (C)
                        </button>
                        <button type="button" id="btn-group-flip-x" class="btn-action" title="Espelhar Horizontalmente todos (H)">
                            <span>↔️</span> Espelhar X (H)
                        </button>
                        <button type="button" id="btn-group-flip-y" class="btn-action" title="Espelhar Verticalmente todos (V)">
                            <span>↕️</span> Espelhar Y (V)
                        </button>
                        <button type="button" id="btn-group-snap" class="btn-action btn-snap-grid btn-span-2" title="Encaixar todos na grade">
                            <span>📐</span> Encaixar Todos na Grade
                        </button>
                        <button type="button" id="btn-group-naturalize" class="btn-action btn-naturalize btn-span-2" title="Naturalizar seleção: desloca aleatoriamente em raio pequeno e varia levemente a escala (Tecla N)">
                            <span>🍃</span> Naturalizar Posição & Escala (N)
                        </button>
                        <button type="button" id="btn-group-toggle-lock" class="btn-action btn-span-2" title="Bloquear / Desbloquear seleção contra movimentação acidental (Tecla L)">
                            <span>${assets.some(a => !a.locked) ? '🔒' : '🔓'}</span> ${assets.some(a => !a.locked) ? 'Bloquear Seleção (L)' : 'Desbloquear Seleção (L)'}
                        </button>
                        <button type="button" id="btn-group-bake" class="btn-action btn-bake-chunk btn-span-2" title="Incorpora todos os assets selecionados diretamente no fundo dos chunks correspondentes respeitando a ordem Z-Index">
                            <span class="bake-icon">🖼️</span>
                            <span class="bake-label">Fixar Selecionados no Fundo (${assets.length}) (Bake)</span>
                            <div class="bake-spinner" style="display: none;"></div>
                        </button>
                        <button type="button" id="btn-group-delete" class="btn-action btn-delete btn-span-2" title="Excluir todos os selecionados (Del)">
                            <span>🗑️</span> Excluir Selecionados (${assets.length}) (Del)
                        </button>
                    </div>
                </div>

                <div class="prop-section">
                    <label class="prop-label">Alinhamento & Distribuição</label>
                    <div class="prop-actions-section" style="margin-top: 4px;">
                        <button type="button" id="btn-align-left" class="btn-action" title="Alinhar à Esquerda"><span>⬅️</span> Esq</button>
                        <button type="button" id="btn-align-right" class="btn-action" title="Alinhar à Direita"><span>➡️</span> Dir</button>
                        <button type="button" id="btn-align-center-h" class="btn-action" title="Alinhar ao Centro Horizontal"><span>↔️</span> Centro H</button>
                        <button type="button" id="btn-align-center-v" class="btn-action" title="Alinhar ao Centro Vertical"><span>↕️</span> Centro V</button>
                        <button type="button" id="btn-align-top" class="btn-action" title="Alinhar ao Topo"><span>⬆️</span> Topo</button>
                        <button type="button" id="btn-align-bottom" class="btn-action" title="Alinhar à Base / Chão 2.5D"><span>⬇️</span> Base 2.5D</button>
                        <button type="button" id="btn-distribute-h" class="btn-action btn-span-2" title="Distribuir Uniformemente no Eixo Horizontal"><span>⏸️</span> Distribuir Horizontal</button>
                        <button type="button" id="btn-distribute-v" class="btn-action btn-span-2" title="Distribuir Uniformemente no Eixo Vertical"><span>🟰</span> Distribuir Vertical</button>
                    </div>
                </div>

                <div class="prop-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <label class="prop-label" style="margin-bottom: 0;">Escala Proporcional do Grupo</label>
                        <span id="group-scale-slider-value" class="prop-badge highlight">1.00x</span>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Multiplicador Proporcional:</span>
                        <select id="btn-group-scale-select" class="prop-input" style="cursor: pointer;">
                            <option value="0.5">-2x (0.5x - Metade)</option>
                            <option value="0.667">-1.5x (0.67x)</option>
                            <option value="0.75">0.75x</option>
                            <option value="1.0" selected>1x (Original 100%)</option>
                            <option value="1.25">1.25x (+25%)</option>
                            <option value="1.5">1.5x (+50%)</option>
                            <option value="2.0">2x (2.0x - Dobro)</option>
                            <option value="2.5">2.5x</option>
                            <option value="3.0">3x (3.0x - Triplo)</option>
                        </select>
                    </div>

                    <div class="prop-field" style="margin-top: 8px;">
                        <span class="field-label">Slider de Proporção:</span>
                        <input type="range" id="btn-group-scale-slider" min="0.25" max="3.0" step="0.05" value="1.0" style="width: 100%; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                            <span>-2x (0.5x)</span>
                            <span>1x</span>
                            <span>1.5x</span>
                            <span>2x</span>
                            <span>3x</span>
                        </div>
                    </div>
                </div>

                <div class="prop-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <label class="prop-label" style="margin-bottom: 0;">Rotação do Grupo</label>
                        <span id="group-rotation-slider-value" class="prop-badge highlight">0°</span>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Ângulos Predefinidos (Graus):</span>
                        <select id="btn-group-rotation-select" class="prop-input" style="cursor: pointer;">
                            <option value="0" selected>0° (Normal)</option>
                            <option value="45">45°</option>
                            <option value="90">90°</option>
                            <option value="135">135°</option>
                            <option value="180">180°</option>
                            <option value="225">225°</option>
                            <option value="270">270°</option>
                            <option value="315">315°</option>
                            <option value="360">360°</option>
                        </select>
                    </div>

                    <div class="prop-field" style="margin-top: 8px;">
                        <span class="field-label">Slider em Graus:</span>
                        <input type="range" id="btn-group-rotation-slider" min="0" max="360" step="1" value="0" style="width: 100%; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                            <span>0°</span>
                            <span>45°</span>
                            <span>90°</span>
                            <span>180°</span>
                            <span>270°</span>
                            <span>360°</span>
                        </div>
                    </div>

                    <div class="prop-row-2" style="margin-top: 8px;">
                        <button type="button" id="btn-group-rot-minus-90" class="btn-action-small" title="Girar todos -90°">
                            <span>↺</span> -90°
                        </button>
                        <button type="button" id="btn-group-rot-plus-90" class="btn-action-small" title="Girar todos +90°">
                            <span>↻</span> +90°
                        </button>
                    </div>
                </div>

                <div class="prop-section">
                    <label class="prop-label">Itens no Grupo (${assets.length})</label>
                    <div style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 4px;">
                        ${assets.map((a, i) => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 4px; font-size: 11px;">
                                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; color: var(--text-normal);">
                                    ${i + 1}. ${a.name || a.presetId}
                                </span>
                                <span style="font-family: monospace; color: var(--accent-gold); font-size: 10px;">
                                    ${a.x}, ${a.y}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#btn-group-copy')?.addEventListener('click', () => {
            this.canvasRef.copySelected();
        });
        this.container.querySelector('#btn-group-paste')?.addEventListener('click', () => {
            this.canvasRef.paste();
            this.render();
        });
        this.container.querySelector('#btn-group-duplicate')?.addEventListener('click', () => {
            this.canvasRef.duplicateSelected();
            this.render();
        });
        this.container.querySelector('#btn-group-center-chunk')?.addEventListener('click', () => {
            this.canvasRef.centerSelectedInChunk();
            this.render();
        });
        this.container.querySelector('#btn-group-naturalize')?.addEventListener('click', () => {
            this.canvasRef.naturalizeSelected();
            this.render();
        });
        this.container.querySelector('#btn-group-flip-x')?.addEventListener('click', () => {
            this.canvasRef.flipSelectedX();
            this.render();
        });
        this.container.querySelector('#btn-group-flip-y')?.addEventListener('click', () => {
            this.canvasRef.flipSelectedY();
            this.render();
        });
        this.container.querySelector('#btn-group-snap')?.addEventListener('click', () => {
            this.canvasRef.snapSelectedToGrid();
            this.render();
        });
        this.container.querySelector('#btn-group-delete')?.addEventListener('click', () => {
            this.canvasRef.deleteSelected();
            this.render();
        });
        const btnGroupBake = this.container.querySelector('#btn-group-bake') as HTMLButtonElement;
        btnGroupBake?.addEventListener('click', async () => {
            const icon = btnGroupBake.querySelector('.bake-icon') as HTMLElement;
            const label = btnGroupBake.querySelector('.bake-label') as HTMLElement;
            const spinner = btnGroupBake.querySelector('.bake-spinner') as HTMLElement;

            btnGroupBake.disabled = true;
            if (icon) icon.style.display = 'none';
            if (spinner) spinner.style.display = 'inline-block';
            if (label) label.textContent = 'Fixando no fundo...';

            try {
                const res = await this.canvasRef.bakeMultipleAssetsToChunkBackground(assets);
                if (res.success) {
                    if (label) label.textContent = `✓ ${res.bakedCount ?? assets.length} Fixados!`;
                    setTimeout(() => {
                        this.render();
                    }, 400);
                } else {
                    ConfirmationModal.alert(res.message || 'Falha ao fixar assets no fundo do chunk.');
                    btnGroupBake.disabled = false;
                    if (icon) icon.style.display = 'inline';
                    if (spinner) spinner.style.display = 'none';
                    if (label) label.textContent = `Fixar Selecionados no Fundo (${assets.length}) (Bake)`;
                }
            } catch (err: any) {
                ConfirmationModal.alert(`Erro inesperado: ${err?.message || err}`);
                btnGroupBake.disabled = false;
                if (icon) icon.style.display = 'inline';
                if (spinner) spinner.style.display = 'none';
                if (label) label.textContent = `Fixar Selecionados no Fundo (${assets.length}) (Bake)`;
            }
        });
        this.container.querySelector('#btn-group-toggle-lock')?.addEventListener('click', () => {
            this.canvasRef.toggleLockSelected();
            this.render();
        });
        this.container.querySelector('#btn-align-left')?.addEventListener('click', () => {
            this.canvasRef.alignSelected('left');
        });
        this.container.querySelector('#btn-align-right')?.addEventListener('click', () => {
            this.canvasRef.alignSelected('right');
        });
        this.container.querySelector('#btn-align-center-h')?.addEventListener('click', () => {
            this.canvasRef.alignSelected('center-h');
        });
        this.container.querySelector('#btn-align-center-v')?.addEventListener('click', () => {
            this.canvasRef.alignSelected('center-v');
        });
        this.container.querySelector('#btn-align-top')?.addEventListener('click', () => {
            this.canvasRef.alignSelected('top');
        });
        this.container.querySelector('#btn-align-bottom')?.addEventListener('click', () => {
            this.canvasRef.alignSelected('bottom');
        });
        this.container.querySelector('#btn-distribute-h')?.addEventListener('click', () => {
            this.canvasRef.distributeSelected('horizontal');
        });
        this.container.querySelector('#btn-distribute-v')?.addEventListener('click', () => {
            this.canvasRef.distributeSelected('vertical');
        });

        const multiScaleSelect = this.container.querySelector('#btn-group-scale-select') as HTMLSelectElement;
        multiScaleSelect?.addEventListener('change', () => {
            const val = parseFloat(multiScaleSelect.value);
            if (!isNaN(val)) {
                this.canvasRef.setScaleSelected(val, true);
            }
        });

        const multiScaleSlider = this.container.querySelector('#btn-group-scale-slider') as HTMLInputElement;
        const multiScaleBadge = this.container.querySelector('#group-scale-slider-value') as HTMLElement;
        multiScaleSlider?.addEventListener('input', () => {
            const val = parseFloat(multiScaleSlider.value);
            if (!isNaN(val)) {
                if (multiScaleBadge) multiScaleBadge.textContent = `${val.toFixed(2)}x`;
                this.canvasRef.setScaleSelected(val, false);
            }
        });
        multiScaleSlider?.addEventListener('change', () => {
            const val = parseFloat(multiScaleSlider.value);
            if (!isNaN(val)) {
                this.canvasRef.setScaleSelected(val, true);
                if (multiScaleBadge) multiScaleBadge.textContent = `${val.toFixed(2)}x`;
                if (multiScaleSelect) {
                    const preset = this.getClosestScalePreset(val);
                    multiScaleSelect.value = preset || '1.0';
                }
            }
        });

        const multiRotSelect = this.container.querySelector('#btn-group-rotation-select') as HTMLSelectElement;
        multiRotSelect?.addEventListener('change', () => {
            const val = parseFloat(multiRotSelect.value);
            if (!isNaN(val)) {
                this.canvasRef.setRotationSelected(val, true);
            }
        });

        const multiRotSlider = this.container.querySelector('#btn-group-rotation-slider') as HTMLInputElement;
        const multiRotBadge = this.container.querySelector('#group-rotation-slider-value') as HTMLElement;
        multiRotSlider?.addEventListener('input', () => {
            const val = parseFloat(multiRotSlider.value);
            if (!isNaN(val)) {
                if (multiRotBadge) multiRotBadge.textContent = `${Math.round(val)}°`;
                this.canvasRef.setRotationSelected(val, false);
            }
        });
        multiRotSlider?.addEventListener('change', () => {
            const val = parseFloat(multiRotSlider.value);
            if (!isNaN(val)) {
                const rounded = Math.round(val);
                this.canvasRef.setRotationSelected(val, true);
                if (multiRotBadge) multiRotBadge.textContent = `${rounded}°`;
                if (multiRotSelect) {
                    const preset = [0, 45, 90, 135, 180, 225, 270, 315, 360].find(p => p === rounded);
                    multiRotSelect.value = preset !== undefined ? String(preset) : '0';
                }
            }
        });

        this.container.querySelector('#btn-group-rot-minus-90')?.addEventListener('click', () => {
            this.canvasRef.rotateSelectedBy(-90, true);
        });
        this.container.querySelector('#btn-group-rot-plus-90')?.addEventListener('click', () => {
            this.canvasRef.rotateSelectedBy(90, true);
        });
    }

    /**
     * Renderiza o painel quando um asset posicionado no mapa está selecionado
     */
    private renderAssetProperties(asset: PlacedAssetModel): void {
        const isPortal = Boolean(asset.isPortal || asset.presetId.includes('portal'));
        const isItem = Boolean(asset.isItem || asset.presetId.startsWith('item_'));
        const isSprite = !isPortal && !isItem && Boolean(asset.isSprite || (asset.frameCount !== undefined && asset.frameCount > 1));
        const animSpeed = asset.animationSpeed || 10;
        const frameDurationMs = Math.round(animSpeed * (1000 / 60));
        const fps = (60 / animSpeed).toFixed(1);

        const { baseW, baseH } = this.canvasRef.getAssetBaseDimensions(asset);
        const currentScale = Number((asset.width / baseW).toFixed(2)) || 1.0;
        let selectedPresetValue = '';
        if (Math.abs(currentScale - 0.5) < 0.03) selectedPresetValue = '0.5';
        else if (Math.abs(currentScale - 0.667) < 0.04) selectedPresetValue = '0.667';
        else if (Math.abs(currentScale - 0.75) < 0.03) selectedPresetValue = '0.75';
        else if (Math.abs(currentScale - 1.0) < 0.03) selectedPresetValue = '1.0';
        else if (Math.abs(currentScale - 1.25) < 0.03) selectedPresetValue = '1.25';
        else if (Math.abs(currentScale - 1.5) < 0.03) selectedPresetValue = '1.5';
        else if (Math.abs(currentScale - 2.0) < 0.03) selectedPresetValue = '2.0';
        else if (Math.abs(currentScale - 2.5) < 0.03) selectedPresetValue = '2.5';
        else if (Math.abs(currentScale - 3.0) < 0.03) selectedPresetValue = '3.0';

        const normalizedRot = ((asset.rotation || 0) % 360 + 360) % 360;
        let selectedPresetRot = '';
        if ([0, 45, 90, 135, 180, 225, 270, 315, 360].includes(normalizedRot)) {
            selectedPresetRot = String(normalizedRot);
        }

        this.container.innerHTML = `
            <div class="prop-panel-header">
                <h3>Propriedades do Objeto</h3>
                <span class="prop-badge ${isPortal ? 'portal highlight' : (isItem ? 'highlight' : (isSprite ? 'highlight' : ''))}">${isPortal ? '🌀 Portal' : (isItem ? '⚔️ Item Coletável' : (isSprite ? '🎞️ Sprite' : '🖼️ PNG'))}</span>
            </div>

            <div class="prop-scroll-body">
                <div class="prop-section sprite-preview-section">
                    <label class="prop-label">${isPortal ? 'Visual do Portal' : (isItem ? 'Visual do Item' : 'Visual do Sprite')}</label>
                    <div class="prop-thumb-card">
                        <img src="${asset.imageSrc}" alt="${asset.name}" />
                        <span class="prop-preset-tag">${asset.presetId}</span>
                    </div>
                </div>

                <div class="prop-section">
                    <label class="prop-label">Identificação</label>
                    <div class="prop-field">
                        <span class="field-label">Nome:</span>
                        <input type="text" id="prop-name-input" class="prop-input" value="${asset.name}">
                    </div>
                    <div class="prop-field">
                        <span class="field-label">Preset ID:</span>
                        <input type="text" id="prop-preset-input" class="prop-input" value="${asset.presetId}">
                    </div>
                </div>

                ${isPortal ? `
                <div class="prop-section portal-config-section">
                    <div class="prop-section-title">
                        <label class="prop-label">🌀 Configurações do Portal</label>
                        <span class="prop-badge highlight">${asset.portalType === 'direct' ? 'Direto' : 'Interativo [E]'}</span>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Tipo de Portal:</span>
                        <select id="prop-portal-type-input" class="prop-input" style="cursor: pointer;">
                            <option value="request" ${asset.portalType !== 'direct' ? 'selected' : ''}>Com Balão / Tecla [E] (Interativo)</option>
                            <option value="direct" ${asset.portalType === 'direct' ? 'selected' : ''}>Gatilho Direto (Ao Colidir)</option>
                        </select>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Destino do Portal (Ponto de Retorno / Saída):</span>
                        <select id="prop-target-unified-select" class="prop-select" style="cursor: pointer; width: 100%; margin-bottom: 6px;">
                            ${this.renderAllPortalDestinationsOptions(asset.targetMapId, asset.targetSpawnX, asset.targetSpawnY)}
                        </select>
                        <input type="text" id="prop-target-map-input" list="datalist-innermaps" class="prop-input" value="${asset.targetMapId || 'interior_black_default'}" placeholder="Ou digite o ID do mapa manualmente: vilgem, interior_black_default...">
                        <datalist id="datalist-innermaps">
                            <option value="vilgem">Alvorada de Vilgem (Mundo Raiz)</option>
                            <option value="alun">Alun (Mundo Raiz)</option>
                            <option value="cemii">Cemii (Mundo Raiz)</option>
                            ${InnerMapManager.getInstance().getAll().map(m => `<option value="${m.id}">${m.name} (${m.parentWorldId})</option>`).join('')}
                        </datalist>
                    </div>

                    ${this.canvasRef['mapConfig']?.isInnerMap ? `
                    <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                        <button type="button" id="btn-quick-target-parent" class="btn-secondary" style="flex: 1; padding: 4px 6px; font-size: 11px;">
                            <span>Retornar</span> Destino: Mundo Pai (${this.canvasRef['mapConfig'].parentWorldId || 'vilgem'})
                        </button>
                    </div>
                    ` : ''}

                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Spawn Destino X:</span>
                            <input type="number" id="prop-target-x-input" class="prop-input" value="${asset.targetSpawnX ?? 512}">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Spawn Destino Y:</span>
                            <input type="number" id="prop-target-y-input" class="prop-input" value="${asset.targetSpawnY ?? 700}">
                        </div>
                    </div>

                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Texto do Prompt:</span>
                            <input type="text" id="prop-prompt-text-input" class="prop-input" value="${asset.promptText || 'Entrar'}">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Tecla de Ação:</span>
                            <input type="text" id="prop-action-key-input" class="prop-input" value="${asset.actionKey || 'E'}" maxlength="5">
                        </div>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Cooldown (ms):</span>
                        <input type="number" id="prop-cooldown-input" class="prop-input" value="${asset.cooldownMs ?? 1000}" min="0" step="100">
                    </div>

                    <button type="button" id="btn-prop-open-target-map" class="btn-primary-highlight" style="width: 100%; margin-top: 8px;">
                        <span>🚪</span> Abrir Mapa de Destino no Editor
                    </button>
                </div>
                ` : isItem ? `
                <div class="prop-section item-config-section">
                    <div class="prop-section-title">
                        <label class="prop-label">Propriedades do Item no Dominio</label>
                        <span class="prop-badge highlight">${(asset.itemRarity || asset.itemClass || 'Item').toUpperCase()}</span>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Classe do Item (Dominio):</span>
                        <select id="prop-item-class-select" class="prop-select">
                            <optgroup label="Armas">
                                <option value="SimpleSword" ${asset.itemClass === 'SimpleSword' ? 'selected' : ''}>SimpleSword (Espada)</option>
                                <option value="Gun" ${asset.itemClass === 'Gun' ? 'selected' : ''}>Gun (Pistola)</option>
                                <option value="Scythe" ${asset.itemClass === 'Scythe' ? 'selected' : ''}>Scythe (Foice)</option>
                                <option value="SimpleStaff" ${asset.itemClass === 'SimpleStaff' ? 'selected' : ''}>SimpleStaff (Cajado)</option>
                                <option value="FishingRod" ${asset.itemClass === 'FishingRod' ? 'selected' : ''}>FishingRod (Vara de Pesca)</option>
                            </optgroup>
                            <optgroup label="Armaduras">
                                <option value="IronHelmet" ${asset.itemClass === 'IronHelmet' ? 'selected' : ''}>IronHelmet (Elmo)</option>
                                <option value="IronChestplate" ${asset.itemClass === 'IronChestplate' ? 'selected' : ''}>IronChestplate (Peitoral)</option>
                                <option value="IronPants" ${asset.itemClass === 'IronPants' ? 'selected' : ''}>IronPants (Calcas)</option>
                                <option value="IronBoots" ${asset.itemClass === 'IronBoots' ? 'selected' : ''}>IronBoots (Botas)</option>
                                <option value="IronGloves" ${asset.itemClass === 'IronGloves' ? 'selected' : ''}>IronGloves (Luvas)</option>
                                <option value="SimpleAmulet" ${asset.itemClass === 'SimpleAmulet' ? 'selected' : ''}>SimpleAmulet (Amuleto)</option>
                                <option value="SimpleRing" ${asset.itemClass === 'SimpleRing' ? 'selected' : ''}>SimpleRing (Anel)</option>
                            </optgroup>
                            <optgroup label="Consumiveis & Pocoes">
                                <option value="HealthPotion" ${asset.itemClass === 'HealthPotion' ? 'selected' : ''}>HealthPotion (Pocao de Vida)</option>
                                <option value="ManaPotion" ${asset.itemClass === 'ManaPotion' ? 'selected' : ''}>ManaPotion (Pocao de Mana)</option>
                                <option value="AdrenalineFlask" ${asset.itemClass === 'AdrenalineFlask' ? 'selected' : ''}>AdrenalineFlask (Frasco de Adrenalina)</option>
                                <option value="Apple" ${asset.itemClass === 'Apple' ? 'selected' : ''}>Apple (Maca)</option>
                                <option value="Coin" ${asset.itemClass === 'Coin' ? 'selected' : ''}>Coin (Moedas de Ouro)</option>
                                <option value="ExperienceTome" ${asset.itemClass === 'ExperienceTome' ? 'selected' : ''}>ExperienceTome (Tomo de EXP)</option>
                                <option value="VampireFang" ${asset.itemClass === 'VampireFang' ? 'selected' : ''}>VampireFang (Presa de Vampiro)</option>
                                <option value="MegaMushroom" ${asset.itemClass === 'MegaMushroom' ? 'selected' : ''}>MegaMushroom (Cogumelo Gigante)</option>
                                <option value="DemonBlood" ${asset.itemClass === 'DemonBlood' ? 'selected' : ''}>DemonBlood (Sangue Demonico)</option>
                            </optgroup>
                            <optgroup label="Armazenamento">
                                <option value="LeatherBag" ${asset.itemClass === 'LeatherBag' ? 'selected' : ''}>LeatherBag (Mochila de Couro)</option>
                                <option value="LeatherBelt" ${asset.itemClass === 'LeatherBelt' ? 'selected' : ''}>LeatherBelt (Cinto de Ferramentas)</option>
                            </optgroup>
                            <optgroup label="Ferramentas">
                                <option value="Hoe" ${asset.itemClass === 'Hoe' ? 'selected' : ''}>Hoe (Enxada)</option>
                                <option value="WateringCan" ${asset.itemClass === 'WateringCan' ? 'selected' : ''}>WateringCan (Regador)</option>
                                <option value="Axe" ${asset.itemClass === 'Axe' ? 'selected' : ''}>Axe (Machado)</option>
                                <option value="Hammer" ${asset.itemClass === 'Hammer' ? 'selected' : ''}>Hammer (Martelo)</option>
                            </optgroup>
                        </select>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Nome no Jogo:</span>
                        <input type="text" id="prop-item-name-input" class="prop-input" value="${asset.itemName || asset.name}" placeholder="Nome visivel do item">
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Descricao:</span>
                        <textarea id="prop-item-desc-input" class="prop-input" rows="2" placeholder="Descricao do item">${asset.itemDescription || ''}</textarea>
                    </div>

                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Raridade:</span>
                            <select id="prop-item-rarity-select" class="prop-select">
                                <option value="common" ${asset.itemRarity === 'common' || !asset.itemRarity ? 'selected' : ''}>Comum</option>
                                <option value="uncommon" ${asset.itemRarity === 'uncommon' ? 'selected' : ''}>Incomum</option>
                                <option value="rare" ${asset.itemRarity === 'rare' ? 'selected' : ''}>Raro</option>
                                <option value="epic" ${asset.itemRarity === 'epic' ? 'selected' : ''}>Epico</option>
                                <option value="legendary" ${asset.itemRarity === 'legendary' ? 'selected' : ''}>Lendario</option>
                            </select>
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Nivel Requerido:</span>
                            <input type="number" id="prop-item-level-input" class="prop-input" value="${asset.itemRequiredLevel ?? 1}" min="0">
                        </div>
                    </div>

                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Quantidade / Stack:</span>
                            <input type="number" id="prop-item-amount-input" class="prop-input" value="${asset.itemAmount ?? 1}" min="1">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Preco (Ouro):</span>
                            <input type="number" id="prop-item-price-input" class="prop-input" value="${asset.itemPrice ?? 10}" min="0">
                        </div>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Durabilidade:</span>
                        <input type="number" id="prop-item-durability-input" class="prop-input" value="${asset.itemDurability ?? 100}" min="1">
                    </div>

                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Dano Base:</span>
                            <input type="number" id="prop-item-damage-input" class="prop-input" value="${asset.itemBaseDamage ?? ''}" placeholder="Ex: 15" min="0">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Vel. Ataque (s):</span>
                            <input type="number" id="prop-item-atkspd-input" class="prop-input" value="${asset.itemAttackSpeed ?? ''}" placeholder="Ex: 0.7" step="0.1" min="0.1">
                        </div>
                    </div>

                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Reducao Dano (%):</span>
                            <input type="number" id="prop-item-def-input" class="prop-input" value="${asset.itemDamageReduction ?? ''}" placeholder="Ex: 10" min="0" max="100">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Esquiva (%):</span>
                            <input type="number" id="prop-item-dodge-input" class="prop-input" value="${asset.itemDodge ?? ''}" placeholder="Ex: 5" min="0" max="100">
                        </div>
                    </div>

                    <div class="prop-field" style="margin-top: 8px;">
                        <button type="button" id="btn-prop-item-reset-defaults" class="btn-secondary-action" style="width: 100%;">
                            Restaurar Padroes da Classe
                        </button>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Tipo de Spawn:</span>
                        <div class="prop-readonly-val">droppedItem (Chao / Coletavel)</div>
                    </div>
                    <p class="prop-hint-text" style="margin-top: 6px;">Spawna automaticamente uma entidade coletavel no chao no mundo com todos os atributos customizados acima.</p>
                </div>
                ` : isSprite ? `
                <div class="prop-section sprite-config-section">
                    <div class="prop-section-title">
                        <label class="prop-label">🎞️ Detalhes da Animação (Sprite)</label>
                        <span class="prop-badge highlight">${asset.frameCount || 1} frames</span>
                    </div>

                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Frames (Qtd):</span>
                            <input type="number" id="prop-frame-count-input" class="prop-input" value="${asset.frameCount || 1}" min="1">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Velocidade (Ticks a 60fps):</span>
                            <input type="number" id="prop-anim-speed-input" class="prop-input" value="${animSpeed}" min="1" title="Menor = Mais rápido (ex: 3=Rápido, 10=Médio, 20=Lento)">
                        </div>
                    </div>

                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Largura Frame (px):</span>
                            <input type="number" id="prop-frame-w-input" class="prop-input" value="${asset.frameWidth || asset.width}">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Altura Frame (px):</span>
                            <input type="number" id="prop-frame-h-input" class="prop-input" value="${asset.frameHeight || asset.height}">
                        </div>
                    </div>

                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Atlas Offset X:</span>
                            <input type="number" id="prop-offset-x-input" class="prop-input" value="${asset.atlasOffset?.x || 0}">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Atlas Offset Y:</span>
                            <input type="number" id="prop-offset-y-input" class="prop-input" value="${asset.atlasOffset?.y || 0}">
                        </div>
                    </div>

                    <div class="sprite-speed-calc-hint">
                        <span>⏱️ Duração por frame: <b>${frameDurationMs}ms</b> (${fps} FPS)</span>
                    </div>
                </div>
                ` : `
                <div class="prop-section">
                    <div class="prop-section-title">
                        <label class="prop-label">${asset.isPaintedLayer ? '🎨 Área Pintada com Textura de Chunk' : '🖼️ Objeto Cenográfico (PNG Estático)'}</label>
                        <span class="prop-badge ${asset.isPaintedLayer ? 'highlight' : 'neutral'}">${asset.isPaintedLayer ? 'Pincel Chunk' : '1 Frame'}</span>
                    </div>
                    <p class="prop-hint-text">${asset.isPaintedLayer ? `Área gerada com o Pincel de Textura de Chunk (${asset.sourceTextureName || 'Terreno'}). Você pode movê-la, rotacioná-la, continuar pintando ou clicar em "Fixar no Fundo do Chunk (Bake)" abaixo.` : 'Textura estática desenhada na íntegra sem fatiamento de spritesheet.'}</p>
                </div>
                `}

                ${(this.canvasRef.isChunkBrushMode || asset.isPaintedLayer) ? this.renderChunkBrushSectionHtml() : ''}

                <div class="prop-section">
                    <label class="prop-label">Posição Mundial (px)</label>
                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">X:</span>
                            <input type="number" id="prop-x-input" class="prop-input" value="${asset.x}">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Y:</span>
                            <input type="number" id="prop-y-input" class="prop-input" value="${asset.y}">
                        </div>
                    </div>
                    <div style="margin-top: 6px; font-size: 11px; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between;">
                        <span>Chunk Assinado:</span>
                        <code style="color: var(--accent-gold); font-weight: 600;">
                            Chunk (${(() => {
                                const map = this.canvasRef['mapConfig'];
                                const chunkSize = map.chunkSize || 1024;
                                const origin = map.originChunk || (map.id === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 });
                                const col = Math.floor(asset.x / chunkSize);
                                const row = Math.floor(asset.y / chunkSize);
                                const cx = col - origin.cx;
                                const cy = row - origin.cy;
                                return `${cx >= 0 ? '+' : ''}${cx}, ${cy >= 0 ? '+' : ''}${cy}`;
                            })()})
                        </code>
                    </div>
                </div>

                <div class="prop-section">
                    <label class="prop-label">Dimensões no Mundo (px)</label>
                    <div class="prop-row-2">
                        <div class="prop-field">
                            <span class="field-label">Largura:</span>
                            <input type="number" id="prop-w-input" class="prop-input" value="${asset.width}">
                        </div>
                        <div class="prop-field">
                            <span class="field-label">Altura:</span>
                            <input type="number" id="prop-h-input" class="prop-input" value="${asset.height}">
                        </div>
                    </div>

                    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span class="field-label" style="margin-bottom: 0; font-weight: 600; color: var(--text-normal);">Escala Proporcional:</span>
                            <span id="scale-slider-value" class="prop-badge highlight">${currentScale.toFixed(2)}x</span>
                        </div>

                        <div class="prop-field">
                            <select id="prop-scale-select" class="prop-input" style="cursor: pointer; width: 100%;">
                                <option value="custom" disabled ${!selectedPresetValue ? 'selected' : ''}>Personalizado (${currentScale.toFixed(2)}x)</option>
                                <option value="0.5" ${selectedPresetValue === '0.5' ? 'selected' : ''}>-2x (0.5x - Metade)</option>
                                <option value="0.667" ${selectedPresetValue === '0.667' ? 'selected' : ''}>-1.5x (0.67x)</option>
                                <option value="0.75" ${selectedPresetValue === '0.75' ? 'selected' : ''}>0.75x</option>
                                <option value="1.0" ${selectedPresetValue === '1.0' ? 'selected' : ''}>1x (Original 100%)</option>
                                <option value="1.25" ${selectedPresetValue === '1.25' ? 'selected' : ''}>1.25x (+25%)</option>
                                <option value="1.5" ${selectedPresetValue === '1.5' ? 'selected' : ''}>1.5x (+50%)</option>
                                <option value="2.0" ${selectedPresetValue === '2.0' ? 'selected' : ''}>2x (2.0x - Dobro)</option>
                                <option value="2.5" ${selectedPresetValue === '2.5' ? 'selected' : ''}>2.5x</option>
                                <option value="3.0" ${selectedPresetValue === '3.0' ? 'selected' : ''}>3x (3.0x - Triplo)</option>
                            </select>
                        </div>

                        <div class="prop-field" style="margin-top: 8px;">
                            <span class="field-label">Slider de Proporção:</span>
                            <input type="range" id="prop-scale-slider" min="0.25" max="3.0" step="0.05" value="${currentScale}" style="width: 100%; cursor: pointer;">
                            <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                                <span>-2x (0.5x)</span>
                                <span>1x</span>
                                <span>1.5x</span>
                                <span>2x</span>
                                <span>3x</span>
                            </div>
                        </div>

                        <div class="prop-row-2" style="margin-top: 8px;">
                            <button type="button" id="btn-scale-half" class="btn-action-small" title="Reduzir para metade (-2x / 0.5x)">
                                <span>📉</span> -2x (0.5x)
                            </button>
                            <button type="button" id="btn-scale-one-half-down" class="btn-action-small" title="Reduzir (-1.5x / 0.67x)">
                                <span>📉</span> -1.5x
                            </button>
                        </div>
                        <div class="prop-row-2" style="margin-top: 4px;">
                            <button type="button" id="btn-scale-one-half-up" class="btn-action-small" title="Aumentar (1.5x)">
                                <span>📈</span> 1.5x
                            </button>
                            <button type="button" id="btn-scale-double" class="btn-action-small" title="Aumentar para o dobro (2x)">
                                <span>📈</span> 2x (2.0x)
                            </button>
                        </div>

                        <button type="button" id="btn-reset-original-aspect" class="btn-secondary" style="width: 100%; margin-top: 8px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            ↺ Restaurar Proporções Originais (1:1)
                        </button>
                    </div>
                </div>

                <div class="prop-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <label class="prop-label" style="margin-bottom: 0;">Rotação do Objeto</label>
                        <span id="rotation-slider-value" class="prop-badge highlight">${normalizedRot}°</span>
                    </div>

                    <div class="prop-field">
                        <span class="field-label">Ângulos Predefinidos (Graus):</span>
                        <select id="prop-rotation-select" class="prop-input" style="cursor: pointer; width: 100%;">
                            <option value="custom" disabled ${selectedPresetRot === '' ? 'selected' : ''}>Personalizado (${normalizedRot}°)</option>
                            <option value="0" ${selectedPresetRot === '0' ? 'selected' : ''}>0° (Normal / Padrão)</option>
                            <option value="45" ${selectedPresetRot === '45' ? 'selected' : ''}>45° (Diagonal Direita)</option>
                            <option value="90" ${selectedPresetRot === '90' ? 'selected' : ''}>90° (Giro Horário)</option>
                            <option value="135" ${selectedPresetRot === '135' ? 'selected' : ''}>135°</option>
                            <option value="180" ${selectedPresetRot === '180' ? 'selected' : ''}>180° (Invertido)</option>
                            <option value="225" ${selectedPresetRot === '225' ? 'selected' : ''}>225°</option>
                            <option value="270" ${selectedPresetRot === '270' ? 'selected' : ''}>270° (Giro Anti-horário)</option>
                            <option value="315" ${selectedPresetRot === '315' ? 'selected' : ''}>315°</option>
                            <option value="360" ${selectedPresetRot === '360' ? 'selected' : ''}>360° (Volta Completa)</option>
                        </select>
                    </div>

                    <div class="prop-field" style="margin-top: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="field-label" style="margin-bottom: 0;">Slider em Graus:</span>
                            <input type="number" id="prop-rot-input" class="prop-input" value="${normalizedRot}" min="0" max="360" step="1" style="width: 70px; text-align: right; padding: 2px 6px;">
                        </div>
                        <input type="range" id="prop-rotation-slider" min="0" max="360" step="1" value="${normalizedRot}" style="width: 100%; cursor: pointer; margin-top: 4px;">
                        <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                            <span>0°</span>
                            <span>45°</span>
                            <span>90°</span>
                            <span>180°</span>
                            <span>270°</span>
                            <span>360°</span>
                        </div>
                    </div>

                    <div class="prop-row-2" style="margin-top: 8px;">
                        <button type="button" id="btn-rot-minus-90" class="btn-action-small" title="Girar -90° (Anti-horário)">
                            <span>↺</span> -90°
                        </button>
                        <button type="button" id="btn-rot-minus-45" class="btn-action-small" title="Girar -45°">
                            <span>↺</span> -45°
                        </button>
                    </div>
                    <div class="prop-row-2" style="margin-top: 4px;">
                        <button type="button" id="btn-rot-plus-45" class="btn-action-small" title="Girar +45°">
                            <span>↻</span> +45°
                        </button>
                        <button type="button" id="btn-rot-plus-90" class="btn-action-small" title="Girar +90° (Horário)">
                            <span>↻</span> +90°
                        </button>
                    </div>

                    <button type="button" id="btn-reset-rotation" class="btn-secondary" style="width: 100%; margin-top: 8px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        ↺ Resetar Rotação (0°)
                    </button>
                </div>

                <div class="prop-section">
                    <label class="prop-label">Ordem & Espelhamento</label>
                    <div class="prop-field">
                        <span class="field-label">Z-Index:</span>
                        <input type="number" id="prop-z-input" class="prop-input" placeholder="Auto" value="${asset.zIndex ?? ''}">
                    </div>
                    <div class="prop-field" style="margin-top: 8px;">
                        <span class="field-label">Espelhamento (Flip):</span>
                        <div class="prop-row-2" style="margin-top: 4px;">
                            <button type="button" id="btn-flip-x" class="btn-action-small ${asset.flipX ? 'active' : ''}" title="Espelhar Horizontalmente (Tecla H)">
                                <span>↔️</span> Espelhar X ${asset.flipX ? '✓' : ''}
                            </button>
                            <button type="button" id="btn-flip-y" class="btn-action-small ${asset.flipY ? 'active' : ''}" title="Espelhar Verticalmente (Tecla V)">
                                <span>↕️</span> Espelhar Y ${asset.flipY ? '✓' : ''}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="prop-actions-section">
                    <button id="btn-snap-selected-grid" class="btn-action btn-snap-grid" title="Encaixa imediatamente este objeto na linha de grade mais próxima">
                        <span>📐</span> Encaixar Grade
                    </button>
                    <button type="button" id="btn-center-chunk-asset" class="btn-action btn-center-chunk" title="Centralizar no chunk: move este asset exatamente para o centro do chunk onde está posicionado (Tecla C)">
                        <span>🎯</span> Centralizar (C)
                    </button>
                    <button type="button" id="btn-naturalize-asset" class="btn-action btn-naturalize" title="Naturalizar: desloca em raio pequeno aleatório e varia levemente a escala (Tecla N)">
                        <span>🍃</span> Naturalizar (N)
                    </button>
                    <button id="btn-duplicate-asset" class="btn-action btn-duplicate" title="Duplicar objeto selecionado (Ctrl+D)">
                        <span>📋</span> Duplicar (Ctrl+D)
                    </button>
                    <button type="button" id="btn-toggle-lock-asset" class="btn-action ${asset.locked ? 'btn-locked active' : ''}" title="Bloquear / Desbloquear este objeto contra movimentação ou exclusão acidental (Tecla L)">
                        <span>${asset.locked ? '🔒' : '🔓'}</span> ${asset.locked ? 'Destravar (L)' : 'Travar (L)'}
                    </button>
                    <button type="button" id="btn-stamp-asset" class="btn-action ${this.canvasRef.isStampMode ? 'active' : ''}" title="Modo Carimbo: ativa posicionamento contínuo deste objeto com cliques diretos no canvas (Tecla B)">
                        <span>🖌️</span> Carimbo (B)
                    </button>
                    <button id="btn-bake-to-chunk" class="btn-action btn-bake-chunk btn-span-2" title="Incorpora este asset diretamente na textura de fundo do chunk onde ele está posicionado">
                        <span class="bake-icon">🖼️</span>
                        <span class="bake-label">Fixar no Fundo do Chunk (Bake)</span>
                        <div class="bake-spinner" style="display: none;"></div>
                    </button>
                    <button id="btn-delete-asset" class="btn-action btn-delete btn-span-2" title="Excluir este asset do mapa (Del)">
                        <span>🗑️</span> Excluir Objeto (Del)
                    </button>
                </div>
            </div>
        `;

        this.bindAssetEvents(asset);
    }

    /**
     * Exibe informações completas de um sprite/asset selecionado na biblioteca (gaveta lateral esquerda)
     */
    public renderAssetDefinitionInfo(assetDef: AssetDefinition): void {
        this.activeDefinition = assetDef;
        const isSprite = Boolean(assetDef.isSprite || (assetDef.frameCount && assetDef.frameCount > 1));
        const animSpeed = assetDef.animationSpeed || 10;
        const frameDurationMs = Math.round(animSpeed * (1000 / 60));
        const fps = (60 / animSpeed).toFixed(1);

        this.container.innerHTML = `
            <div class="prop-panel-header">
                <h3>Informações do Asset</h3>
                <span class="prop-badge ${assetDef.category === 'chunks' ? 'chunk' : (assetDef.category === 'portals' ? 'portal highlight' : (isSprite ? 'highlight' : 'neutral'))}">${assetDef.category === 'chunks' ? '🧱 Chunk' : (assetDef.category === 'portals' ? '🌀 Portal' : (isSprite ? '🎞️ Sprite' : '🖼️ PNG'))}</span>
            </div>

            <div class="prop-scroll-body">
                <div class="prop-section sprite-preview-section">
                    <label class="prop-label">Visualização</label>
                    <div class="prop-thumb-card">
                        <img src="${assetDef.imageSrc}" alt="${assetDef.name}" />
                        <span class="prop-preset-tag">${assetDef.id}</span>
                    </div>
                </div>

                <div class="prop-section">
                    <label class="prop-label">Identificação</label>
                    <div class="prop-field">
                        <span class="field-label">Nome:</span>
                        <div class="prop-readonly-val">${assetDef.name}</div>
                    </div>
                    <div class="prop-field">
                        <span class="field-label">Preset ID:</span>
                        <div class="prop-readonly-val">${assetDef.id}</div>
                    </div>
                    <div class="prop-field">
                        <span class="field-label">Categoria:</span>
                        <div class="prop-readonly-val">${assetDef.category}</div>
                    </div>
                </div>

                ${assetDef.category === 'portals' ? `
                <div class="prop-section">
                    <div class="prop-section-title">
                        <label class="prop-label">🌀 Portal de Transição</label>
                        <span class="prop-badge highlight">Interativo / Direto</span>
                    </div>
                    <div class="stat-line"><span>Dimensões Base:</span> <b>${assetDef.width} x ${assetDef.height} px</b></div>
                    <p class="prop-hint-text" style="margin-top: 6px;">Gatilho espacial para carregar novos mapas ou interiores de construções com coordenadas de retorno personalizadas.</p>
                </div>
                ` : (assetDef.isItem || assetDef.category === 'items') ? `
                <div class="prop-section">
                    <div class="prop-section-title">
                        <label class="prop-label">⚔️ Item Coletável</label>
                        <span class="prop-badge highlight">${assetDef.itemClass || 'Item'}</span>
                    </div>
                    <div class="stat-line"><span>Classe:</span> <b>${assetDef.itemClass || 'SimpleSword'}</b></div>
                    <div class="stat-line"><span>Dimensões Base:</span> <b>${assetDef.width} x ${assetDef.height} px</b></div>
                    <p class="prop-hint-text" style="margin-top: 6px;">Entidade de item para spawn no chão (droppedItem) sincronizado automaticamente no código do mundo.</p>
                </div>
                ` : isSprite ? `
                <div class="prop-section sprite-config-section">
                    <div class="prop-section-title">
                        <label class="prop-label">🎞️ Detalhes da Animação</label>
                        <span class="prop-badge highlight">${assetDef.frameCount || 1} frames</span>
                    </div>
                    <div class="stat-line"><span>Quantidade de Frames:</span> <b>${assetDef.frameCount || 1}</b></div>
                    <div class="stat-line"><span>Dimensões do Frame:</span> <b>${assetDef.frameWidth} x ${assetDef.frameHeight} px</b></div>
                    <div class="stat-line"><span>Velocidade de Reprodução:</span> <b>${animSpeed} ticks</b></div>
                    <div class="stat-line"><span>Tempo por Frame:</span> <b>${frameDurationMs} ms (${fps} FPS)</b></div>
                    <div class="stat-line"><span>Ponto de Ancoragem:</span> <b>${assetDef.anchor || 'bottom-center'}</b></div>
                </div>
                ` : `
                <div class="prop-section">
                    <div class="prop-section-title">
                        <label class="prop-label">🖼️ Propriedades do Cenário</label>
                        <span class="prop-badge neutral">Estático</span>
                    </div>
                    <div class="stat-line"><span>Dimensões Base:</span> <b>${assetDef.width} x ${assetDef.height} px</b></div>
                    <div class="stat-line"><span>Ponto de Ancoragem:</span> <b>${assetDef.anchor || 'bottom-center'}</b></div>
                </div>
                `}

                <div class="prop-actions-section">
                    ${(assetDef.category === 'chunks' || assetDef.category === 'roads' || assetDef.category === 'water') ? `
                    <button type="button" id="btn-use-as-chunk-brush" class="btn-action btn-bake-chunk btn-span-2">
                        <span>🎨</span> Pintar Mapa com esta Textura (Pincel T)
                    </button>
                    ` : ''}
                    <button id="btn-insert-center-map" class="btn-primary-highlight btn-span-2">
                        <span>➕</span> Inserir no Centro da Tela
                    </button>
                    <button id="btn-back-overview" class="btn-secondary btn-span-2">
                        <span>↩️</span> Voltar para Visão Geral
                    </button>
                </div>
            </div>
        `;

        const btnUseBrush = this.container.querySelector('#btn-use-as-chunk-brush');
        btnUseBrush?.addEventListener('click', () => {
            this.canvasRef.toggleChunkBrushMode(true, assetDef.imageSrc, assetDef.name);
            this.activeDefinition = null;
            this.render();
        });

        const btnInsert = this.container.querySelector('#btn-insert-center-map');
        btnInsert?.addEventListener('click', () => {
            const centerWorld = this.canvasRef.screenToWorld(
                this.canvasRef['canvas'].width / 2,
                this.canvasRef['canvas'].height / 2
            );
            this.canvasRef.addAssetToMap(assetDef, Math.round(centerWorld.x), Math.round(centerWorld.y));
            this.render();
        });

        const btnBack = this.container.querySelector('#btn-back-overview');
        btnBack?.addEventListener('click', () => {
            this.activeDefinition = null;
            this.render();
        });
    }

    /**
     * Renderiza o painel geral quando nenhum asset está selecionado
     */
    private renderMapOverview(): void {
        const map = this.canvasRef['mapConfig'];
        const chunkSize = map.chunkSize || 1024;
        const cols = Math.max(1, Math.ceil(map.width / chunkSize));
        const rows = Math.max(1, Math.ceil(map.height / chunkSize));
        const totalChunks = cols * rows;

        this.container.innerHTML = `
            <div class="prop-panel-header">
                <h3>Configurações do Mapa</h3>
                <span class="prop-badge neutral">Visão Geral</span>
            </div>

            <div class="prop-scroll-body">
                <div class="prop-section">
                    <label class="prop-label">Ambiente de Trabalho</label>
                    <div class="map-stats-card">
                        <div class="stat-line"><span>Mapa Atual:</span> <b>${map.name}</b></div>
                        <div class="stat-line"><span>ID:</span> <code>${map.id}</code></div>
                        ${map.isInnerMap ? `
                        <div class="stat-line"><span style="color: var(--accent-blue);">🚪 Tipo:</span> <b style="color: var(--accent-blue);">InnerMap</b></div>
                        <div class="stat-line"><span>Mundo Pai:</span> <code>${map.parentWorldId || 'vilgem'}</code></div>
                        ` : ''}
                        <div class="stat-line"><span>Dimensões:</span> <b>${map.width}x${map.height}px</b></div>
                        <div class="stat-line"><span>Grid de Chunks:</span> <b>${cols}x${rows} (${totalChunks} chunks)</b></div>
                        <div class="stat-line"><span>Origem Central (0,0):</span> <b>Chunk [col: ${map.originChunk?.cx ?? (map.id === 'vilgem' ? 1 : 0)}, lin: ${map.originChunk?.cy ?? (map.id === 'vilgem' ? 1 : 0)}]</b></div>
                        ${(() => {
                            const origin = map.originChunk || (map.id === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 });
                            const minX = -origin.cx * chunkSize;
                            const minY = -origin.cy * chunkSize;
                            const maxX = (cols - origin.cx) * chunkSize;
                            const maxY = (rows - origin.cy) * chunkSize;
                            return `<div class="stat-line"><span>Limites do Mundo:</span> <code>[${minX}..${maxX}, ${minY}..${maxY}]px</code></div>`;
                        })()}
                        <div class="stat-line"><span>Assets no Mapa:</span> <b>${this.canvasRef.placedAssets.length}</b></div>
                        <div class="stat-line"><span>Zoom da Câmera:</span> <b>${Math.round(this.canvasRef.zoom * 100)}%</b></div>
                        <div class="stat-line"><span>Alinhamento Grid:</span> <b>${this.canvasRef.snapToGrid ? `${this.canvasRef.gridSize}px` : 'Livre'}</b></div>
                    </div>

                    ${map.isInnerMap ? `
                    <div class="prop-field" style="margin-top: 10px;">
                        <span class="field-label">Cor de Fundo Sólida:</span>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <input type="color" id="overview-innermap-color" value="${map.backgroundColor || '#000000'}">
                            <input type="text" id="overview-innermap-hex" class="prop-input" value="${map.backgroundColor || '#000000'}">
                        </div>
                    </div>
                    <button id="btn-back-to-parent-world" class="btn-primary-highlight" style="margin-top: 8px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span>↩️</span> Voltar para Mundo Pai (${map.parentWorldId || 'vilgem'})
                    </button>
                    ` : ''}

                    <button id="btn-export-canvas-image" class="btn-primary-highlight" style="margin-top: 10px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>📸</span> Exportar Imagem de Fundo (PNG)
                    </button>
                    ${map.id !== 'blank_project' ? `
                    <button id="btn-props-manage-chunks" class="btn-primary" style="margin-top: 8px; width: 100%;">
                        🧱 Gerenciar Chunks & Terreno
                    </button>
                    ` : ''}
                    <button id="btn-change-map" class="btn-secondary" style="margin-top: 8px; width: 100%;">
                        🗺️ Trocar de Mapa
                    </button>
                </div>

                ${this.renderChunkBrushSectionHtml()}

                <div class="prop-section">
                    <div class="prop-section-title">
                        <label class="prop-label">Grade & Alinhamento (Grid)</label>
                        <span class="prop-badge ${this.canvasRef.snapToGrid ? 'highlight' : 'neutral'}">${this.canvasRef.snapToGrid ? 'Snap Ativo' : 'Livre'}</span>
                    </div>

                    <div class="toggle-option">
                        <input type="checkbox" id="chk-snap-grid" ${this.canvasRef.snapToGrid ? 'checked' : ''}>
                        <label for="chk-snap-grid"><b>Encaixar na Grade (Snap to Grid)</b></label>
                    </div>

                    <div class="toggle-option">
                        <input type="checkbox" id="chk-show-grid" ${this.canvasRef.showGrid ? 'checked' : ''}>
                        <label for="chk-show-grid">Exibir Linhas de Grade</label>
                    </div>

                    <div class="toggle-option">
                        <input type="checkbox" id="chk-show-chunks" ${this.canvasRef.showChunkBorders ? 'checked' : ''}>
                        <label for="chk-show-chunks">Bordas de Chunks (1024px)</label>
                    </div>

                    <div class="prop-field" style="margin-top: 6px;">
                        <span class="field-label">Tamanho da Grade:</span>
                        <select id="select-grid-size" class="prop-input" style="cursor: pointer;">
                            <option value="16" ${this.canvasRef.gridSize === 16 ? 'selected' : ''}>16px (Detalhes)</option>
                            <option value="32" ${this.canvasRef.gridSize === 32 ? 'selected' : ''}>32px (Personagem / Padrão)</option>
                            <option value="64" ${this.canvasRef.gridSize === 64 ? 'selected' : ''}>64px (Casas / Médio)</option>
                            <option value="128" ${this.canvasRef.gridSize === 128 ? 'selected' : ''}>128px (Construções Grandes)</option>
                        </select>
                    </div>

                    <button id="btn-snap-all-grid" class="btn-secondary" style="margin-top: 8px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span>📐</span> Encaixar Todos os Assets na Grade
                    </button>
                    <button id="btn-center-camera-map" class="btn-secondary" style="margin-top: 8px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;" title="Centraliza a visão e a câmera no centro do mapa/chunk de origem">
                        <span>🎯</span> Centralizar Visão no Mapa
                    </button>
                </div>

                <div class="prop-section">
                    <div class="prop-section-title">
                        <label class="prop-label">Hierarquia de Objetos (${this.canvasRef.placedAssets.length})</label>
                        <span class="prop-badge highlight">${this.canvasRef.placedAssets.length} Total</span>
                    </div>
                    <input type="text" id="input-filter-placed-assets" class="prop-input" placeholder="🔍 Filtrar por nome ou ID..." style="margin-bottom: 8px;">
                    <div id="placed-assets-jump-list" class="placed-assets-jump-list" style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 4px;">
                        ${this.renderPlacedAssetsListHtml()}
                    </div>
                </div>

                <div class="prop-section">
                    <label class="prop-label">Atalhos Úteis</label>
                    <ul class="shortcuts-list">
                        <li><b>🖱️ Arrastar:</b> Mover asset</li>
                        <li><b>T:</b> Pincel de Textura de Chunk (Pintar Terreno)</li>
                        <li><b>[ / ] (ou Alt+Scroll):</b> Diminuir / Aumentar raio do pincel</li>
                        <li><b>B:</b> Modo Carimbo Contínuo (Stamp)</li>
                        <li><b>L:</b> Travar / Destravar objeto (Lock)</li>
                        <li><b>Esc:</b> Sair do pincel/carimbo ou desselecionar</li>
                        <li><b>Shift + Scroll:</b> Mover na horizontal</li>
                        <li><b>Botão Meio / Espaço:</b> Mover câmera</li>
                        <li><b>Roda do Mouse:</b> Zoom focado</li>
                        <li><b>Setas:</b> Ajuste fino (1px / 10px)</li>
                        <li><b>C:</b> Centralizar com o chunk</li>
                        <li><b>N:</b> Naturalizar posição e escala</li>
                        <li><b>R / Shift + R:</b> Girar 90° horário / anti-horário</li>
                        <li><b>H / V:</b> Espelhar horizontal / vertical</li>
                        <li><b>Ctrl + Z / Y:</b> Desfazer / Refazer</li>
                        <li><b>Ctrl + D:</b> Duplicar selecionado</li>
                        <li><b>Delete:</b> Apagar selecionado</li>
                    </ul>
                </div>
            </div>
        `;

        this.bindOverviewEvents();
    }

    private bindAssetEvents(asset: PlacedAssetModel): void {
        const xInput = this.container.querySelector('#prop-x-input') as HTMLInputElement;
        const yInput = this.container.querySelector('#prop-y-input') as HTMLInputElement;
        const wInput = this.container.querySelector('#prop-w-input') as HTMLInputElement;
        const hInput = this.container.querySelector('#prop-h-input') as HTMLInputElement;
        const rotInput = this.container.querySelector('#prop-rot-input') as HTMLInputElement;
        const zInput = this.container.querySelector('#prop-z-input') as HTMLInputElement;
        const nameInput = this.container.querySelector('#prop-name-input') as HTMLInputElement;
        const presetInput = this.container.querySelector('#prop-preset-input') as HTMLInputElement;

        const frameCountInput = this.container.querySelector('#prop-frame-count-input') as HTMLInputElement;
        const animSpeedInput = this.container.querySelector('#prop-anim-speed-input') as HTMLInputElement;
        const frameWInput = this.container.querySelector('#prop-frame-w-input') as HTMLInputElement;
        const frameHInput = this.container.querySelector('#prop-frame-h-input') as HTMLInputElement;
        const offsetXInput = this.container.querySelector('#prop-offset-x-input') as HTMLInputElement;
        const offsetYInput = this.container.querySelector('#prop-offset-y-input') as HTMLInputElement;

        const portalTypeInput = this.container.querySelector('#prop-portal-type-input') as HTMLSelectElement;
        const unifiedTargetSelect = this.container.querySelector('#prop-target-unified-select') as HTMLSelectElement;
        const targetMapInput = this.container.querySelector('#prop-target-map-input') as HTMLInputElement;
        const btnQuickParent = this.container.querySelector('#btn-quick-target-parent') as HTMLButtonElement;
        const targetXInput = this.container.querySelector('#prop-target-x-input') as HTMLInputElement;
        const targetYInput = this.container.querySelector('#prop-target-y-input') as HTMLInputElement;
        const promptTextInput = this.container.querySelector('#prop-prompt-text-input') as HTMLInputElement;
        const actionKeyInput = this.container.querySelector('#prop-action-key-input') as HTMLInputElement;
        const cooldownInput = this.container.querySelector('#prop-cooldown-input') as HTMLInputElement;

        const itemClassSelect = this.container.querySelector('#prop-item-class-select') as HTMLSelectElement;
        const itemNameInput = this.container.querySelector('#prop-item-name-input') as HTMLInputElement;
        const itemDescInput = this.container.querySelector('#prop-item-desc-input') as HTMLTextAreaElement;
        const itemRaritySelect = this.container.querySelector('#prop-item-rarity-select') as HTMLSelectElement;
        const itemLevelInput = this.container.querySelector('#prop-item-level-input') as HTMLInputElement;
        const itemAmountInput = this.container.querySelector('#prop-item-amount-input') as HTMLInputElement;
        const itemPriceInput = this.container.querySelector('#prop-item-price-input') as HTMLInputElement;
        const itemDurabilityInput = this.container.querySelector('#prop-item-durability-input') as HTMLInputElement;
        const itemDamageInput = this.container.querySelector('#prop-item-damage-input') as HTMLInputElement;
        const itemAtkSpdInput = this.container.querySelector('#prop-item-atkspd-input') as HTMLInputElement;
        const itemDefInput = this.container.querySelector('#prop-item-def-input') as HTMLInputElement;
        const itemDodgeInput = this.container.querySelector('#prop-item-dodge-input') as HTMLInputElement;
        const btnResetItem = this.container.querySelector('#btn-prop-item-reset-defaults') as HTMLButtonElement;

        itemClassSelect?.addEventListener('change', () => {
            const newClass = itemClassSelect.value;
            asset.itemClass = newClass;
            const defaults = ItemFactory.getItemDefaults(newClass);
            if (defaults) {
                asset.name = defaults.name;
                asset.itemName = defaults.name;
                asset.itemDescription = defaults.description;
                asset.itemRarity = defaults.rarity;
                asset.itemPrice = defaults.price;
                asset.itemDurability = defaults.durability;
                asset.itemAmount = defaults.amount || 1;
                asset.itemBaseDamage = defaults.baseDamage;
                asset.itemAttackSpeed = defaults.attackSpeed;
                asset.itemDamageReduction = defaults.damageReductionPercent;
                asset.itemDodge = defaults.dodgePercent;
                asset.itemRequiredLevel = defaults.requiredLevel;
                asset.itemCategory = defaults.category;
            }
            const presetId = CLASS_TO_ITEM_KEY[newClass] || newClass.toLowerCase();
            asset.presetId = presetId;
            const config = (VisualConfigMap as any)[presetId];
            if (config?.droppedConfig?.imageSrc || config?.uiIconUrl) {
                asset.imageSrc = config?.droppedConfig?.imageSrc || config?.uiIconUrl;
            }
            this.render();
            this.canvasRef.render();
            this.canvasRef['onAssetChangedCallback']?.();
        });

        btnResetItem?.addEventListener('click', () => {
            const defaults = ItemFactory.getItemDefaults(asset.itemClass || 'SimpleSword');
            if (defaults) {
                asset.name = defaults.name;
                asset.itemName = defaults.name;
                asset.itemDescription = defaults.description;
                asset.itemRarity = defaults.rarity;
                asset.itemPrice = defaults.price;
                asset.itemDurability = defaults.durability;
                asset.itemAmount = defaults.amount || 1;
                asset.itemBaseDamage = defaults.baseDamage;
                asset.itemAttackSpeed = defaults.attackSpeed;
                asset.itemDamageReduction = defaults.damageReductionPercent;
                asset.itemDodge = defaults.dodgePercent;
                asset.itemRequiredLevel = defaults.requiredLevel;
            }
            this.render();
            this.canvasRef.render();
            this.canvasRef['onAssetChangedCallback']?.();
        });

        const btnResetAspect = this.container.querySelector('#btn-reset-original-aspect') as HTMLButtonElement;
        if (btnResetAspect) {
            btnResetAspect.addEventListener('click', () => {
                this.canvasRef.setScaleSelected(1.0, true);
                asset.isCustomScaled = false;
                this.render();
            });
        }

        const scaleSlider = this.container.querySelector('#prop-scale-slider') as HTMLInputElement;
        const scaleSelect = this.container.querySelector('#prop-scale-select') as HTMLSelectElement;
        const scaleValueBadge = this.container.querySelector('#scale-slider-value') as HTMLElement;

        scaleSlider?.addEventListener('input', () => {
            const val = parseFloat(scaleSlider.value);
            if (!isNaN(val)) {
                if (scaleValueBadge) scaleValueBadge.textContent = `${val.toFixed(2)}x`;
                this.canvasRef.setScaleSelected(val, false);
                if (wInput) wInput.value = String(asset.width);
                if (hInput) hInput.value = String(asset.height);
            }
        });

        scaleSlider?.addEventListener('change', () => {
            const val = parseFloat(scaleSlider.value);
            if (!isNaN(val)) {
                this.canvasRef.setScaleSelected(val, true);
                this.render();
            }
        });

        scaleSelect?.addEventListener('change', () => {
            const val = parseFloat(scaleSelect.value);
            if (!isNaN(val)) {
                this.canvasRef.setScaleSelected(val, true);
                this.render();
            }
        });

        this.container.querySelector('#btn-scale-half')?.addEventListener('click', () => {
            this.canvasRef.setScaleSelected(0.5, true);
            this.render();
        });

        this.container.querySelector('#btn-scale-one-half-down')?.addEventListener('click', () => {
            this.canvasRef.setScaleSelected(1 / 1.5, true);
            this.render();
        });

        this.container.querySelector('#btn-scale-one-half-up')?.addEventListener('click', () => {
            this.canvasRef.setScaleSelected(1.5, true);
            this.render();
        });

        this.container.querySelector('#btn-scale-double')?.addEventListener('click', () => {
            this.canvasRef.setScaleSelected(2.0, true);
            this.render();
        });

        const rotSlider = this.container.querySelector('#prop-rotation-slider') as HTMLInputElement;
        const rotSelect = this.container.querySelector('#prop-rotation-select') as HTMLSelectElement;
        const rotValueBadge = this.container.querySelector('#rotation-slider-value') as HTMLElement;

        rotSlider?.addEventListener('input', () => {
            const val = parseFloat(rotSlider.value);
            if (!isNaN(val)) {
                const rounded = Math.round(val);
                if (rotValueBadge) rotValueBadge.textContent = `${rounded}°`;
                if (rotInput) rotInput.value = String(rounded);
                this.canvasRef.setRotationSelected(val, false);
            }
        });

        rotSlider?.addEventListener('change', () => {
            const val = parseFloat(rotSlider.value);
            if (!isNaN(val)) {
                this.canvasRef.setRotationSelected(val, true);
                this.render();
            }
        });

        rotSelect?.addEventListener('change', () => {
            const val = parseFloat(rotSelect.value);
            if (!isNaN(val)) {
                this.canvasRef.setRotationSelected(val, true);
                this.render();
            }
        });

        this.container.querySelector('#btn-rot-minus-90')?.addEventListener('click', () => {
            this.canvasRef.rotateSelectedBy(-90, true);
            this.render();
        });

        this.container.querySelector('#btn-rot-minus-45')?.addEventListener('click', () => {
            this.canvasRef.rotateSelectedBy(-45, true);
            this.render();
        });

        this.container.querySelector('#btn-rot-plus-45')?.addEventListener('click', () => {
            this.canvasRef.rotateSelectedBy(45, true);
            this.render();
        });

        this.container.querySelector('#btn-rot-plus-90')?.addEventListener('click', () => {
            this.canvasRef.rotateSelectedBy(90, true);
            this.render();
        });

        this.container.querySelector('#btn-reset-rotation')?.addEventListener('click', () => {
            this.canvasRef.setRotationSelected(0, true);
            this.render();
        });

        const updateModel = () => {
            let changed = false;

            if (xInput && asset.x !== Number(xInput.value)) { asset.x = Number(xInput.value); changed = true; }
            if (yInput && asset.y !== Number(yInput.value)) { asset.y = Number(yInput.value); changed = true; }
            if (wInput) {
                const nw = Math.max(16, Number(wInput.value));
                if (asset.width !== nw) {
                    asset.width = nw;
                    asset.isCustomScaled = true;
                    changed = true;
                }
            }
            if (hInput) {
                const nh = Math.max(16, Number(hInput.value));
                if (asset.height !== nh) {
                    asset.height = nh;
                    asset.isCustomScaled = true;
                    changed = true;
                }
            }
            if (rotInput && asset.rotation !== Number(rotInput.value)) { asset.rotation = Number(rotInput.value); changed = true; }
            if (zInput) {
                const nz = zInput.value ? Number(zInput.value) : undefined;
                if (asset.zIndex !== nz) { asset.zIndex = nz; changed = true; }
            }
            if (nameInput && asset.name !== nameInput.value) { asset.name = nameInput.value; changed = true; }
            if (presetInput && asset.presetId !== presetInput.value) { asset.presetId = presetInput.value; changed = true; }

            if (frameCountInput) {
                const fc = Math.max(1, Number(frameCountInput.value));
                if (asset.frameCount !== fc) { asset.frameCount = fc; changed = true; }
            }
            if (animSpeedInput) {
                const asp = Math.max(1, Number(animSpeedInput.value));
                if (asset.animationSpeed !== asp) { asset.animationSpeed = asp; changed = true; }
            }
            if (frameWInput) {
                const fw = Math.max(1, Number(frameWInput.value));
                if (asset.frameWidth !== fw) { asset.frameWidth = fw; changed = true; }
            }
            if (frameHInput) {
                const fh = Math.max(1, Number(frameHInput.value));
                if (asset.frameHeight !== fh) { asset.frameHeight = fh; changed = true; }
            }
            if (offsetXInput || offsetYInput) {
                const ox = Number(offsetXInput?.value || 0);
                const oy = Number(offsetYInput?.value || 0);
                if (asset.atlasOffset?.x !== ox || asset.atlasOffset?.y !== oy) {
                    asset.atlasOffset = { x: ox, y: oy };
                    changed = true;
                }
            }

            if (portalTypeInput) {
                const pt = portalTypeInput.value as 'direct' | 'request';
                if (asset.portalType !== pt) { asset.portalType = pt; changed = true; }
            }
            if (targetMapInput && asset.targetMapId !== targetMapInput.value) {
                asset.targetMapId = targetMapInput.value;
                if (!nameInput?.value || nameInput.value.startsWith('Portal Link')) {
                    asset.name = `Portal Link -> ${targetMapInput.value}`;
                    if (nameInput) nameInput.value = asset.name;
                }
                changed = true;
            }
            if (targetXInput && targetXInput.value.trim() !== '') {
                const val = Number(targetXInput.value);
                if (!isNaN(val) && asset.targetSpawnX !== val) { asset.targetSpawnX = val; changed = true; }
            }
            if (targetYInput && targetYInput.value.trim() !== '') {
                const val = Number(targetYInput.value);
                if (!isNaN(val) && asset.targetSpawnY !== val) { asset.targetSpawnY = val; changed = true; }
            }
            if (promptTextInput && asset.promptText !== promptTextInput.value) { asset.promptText = promptTextInput.value; changed = true; }
            if (actionKeyInput) {
                const ak = actionKeyInput.value.toUpperCase();
                if (asset.actionKey !== ak) { asset.actionKey = ak; changed = true; }
            }
            if (cooldownInput) {
                const cd = Number(cooldownInput.value);
                if (asset.cooldownMs !== cd) { asset.cooldownMs = cd; changed = true; }
            }

            if (itemNameInput && (asset.itemName !== itemNameInput.value || asset.name !== itemNameInput.value)) {
                asset.itemName = itemNameInput.value;
                asset.name = itemNameInput.value;
                changed = true;
            }
            if (itemDescInput && asset.itemDescription !== itemDescInput.value) { asset.itemDescription = itemDescInput.value; changed = true; }
            if (itemRaritySelect && asset.itemRarity !== itemRaritySelect.value) { asset.itemRarity = itemRaritySelect.value as any; changed = true; }
            if (itemLevelInput) {
                const lvl = itemLevelInput.value ? Number(itemLevelInput.value) : undefined;
                if (asset.itemRequiredLevel !== lvl) { asset.itemRequiredLevel = lvl; changed = true; }
            }
            if (itemAmountInput) {
                const amt = itemAmountInput.value ? Number(itemAmountInput.value) : 1;
                if (asset.itemAmount !== amt) { asset.itemAmount = amt; changed = true; }
            }
            if (itemPriceInput) {
                const prc = itemPriceInput.value ? Number(itemPriceInput.value) : undefined;
                if (asset.itemPrice !== prc) { asset.itemPrice = prc; changed = true; }
            }
            if (itemDurabilityInput) {
                const dur = itemDurabilityInput.value ? Number(itemDurabilityInput.value) : undefined;
                if (asset.itemDurability !== dur) { asset.itemDurability = dur; changed = true; }
            }
            if (itemDamageInput) {
                const dmg = itemDamageInput.value ? Number(itemDamageInput.value) : undefined;
                if (asset.itemBaseDamage !== dmg) { asset.itemBaseDamage = dmg; changed = true; }
            }
            if (itemAtkSpdInput) {
                const spd = itemAtkSpdInput.value ? Number(itemAtkSpdInput.value) : undefined;
                if (asset.itemAttackSpeed !== spd) { asset.itemAttackSpeed = spd; changed = true; }
            }
            if (itemDefInput) {
                const def = itemDefInput.value ? Number(itemDefInput.value) : undefined;
                if (asset.itemDamageReduction !== def) { asset.itemDamageReduction = def; changed = true; }
            }
            if (itemDodgeInput) {
                const ddg = itemDodgeInput.value ? Number(itemDodgeInput.value) : undefined;
                if (asset.itemDodge !== ddg) { asset.itemDodge = ddg; changed = true; }
            }

            if (changed) {
                this.canvasRef.render();
                this.canvasRef['onAssetChangedCallback']?.();
            }
        };

        unifiedTargetSelect?.addEventListener('change', () => {
            if (unifiedTargetSelect.value) {
                const [targetMap, sX, sY] = unifiedTargetSelect.value.split('|');
                if (targetMap) {
                    asset.targetMapId = targetMap;
                    if (targetMapInput) targetMapInput.value = targetMap;
                    asset.name = `Portal Link -> ${targetMap}`;
                    if (nameInput) nameInput.value = asset.name;

                    if (sX !== undefined && sY !== undefined) {
                        const parsedX = Number(sX);
                        const parsedY = Number(sY);
                        asset.targetSpawnX = parsedX;
                        asset.targetSpawnY = parsedY;
                        if (targetXInput) targetXInput.value = String(parsedX);
                        if (targetYInput) targetYInput.value = String(parsedY);
                    }

                    this.canvasRef.render();
                    this.canvasRef['onAssetChangedCallback']?.();
                }
            }
        });

        btnQuickParent?.addEventListener('click', () => {
            const parentId = this.canvasRef['mapConfig']?.parentWorldId || 'vilgem';
            if (targetMapInput) targetMapInput.value = parentId;
            asset.targetMapId = parentId;
            asset.name = `Portal Link -> ${parentId}`;
            if (nameInput) nameInput.value = asset.name;

            const parentInner = InnerMapManager.getInstance().getInnerMap(parentId);
            if (parentInner && parentInner.defaultSpawn) {
                asset.targetSpawnX = parentInner.defaultSpawn.x;
                asset.targetSpawnY = parentInner.defaultSpawn.y;
            } else {
                asset.targetSpawnX = 1536;
                asset.targetSpawnY = 1615;
            }
            if (targetXInput) targetXInput.value = String(asset.targetSpawnX);
            if (targetYInput) targetYInput.value = String(asset.targetSpawnY);

            this.render();
            this.canvasRef.render();
            this.canvasRef['onAssetChangedCallback']?.();
        });

        [
            xInput, yInput, wInput, hInput, rotInput, zInput, nameInput, presetInput,
            frameCountInput, animSpeedInput, frameWInput, frameHInput, offsetXInput, offsetYInput,
            portalTypeInput, targetMapInput, targetXInput, targetYInput, promptTextInput, actionKeyInput, cooldownInput,
            itemNameInput, itemDescInput, itemRaritySelect, itemLevelInput, itemAmountInput, itemPriceInput,
            itemDurabilityInput, itemDamageInput, itemAtkSpdInput, itemDefInput, itemDodgeInput
        ].forEach(inp => {
            inp?.addEventListener('input', updateModel);
            inp?.addEventListener('change', updateModel);
        });

        const btnFlipX = this.container.querySelector('#btn-flip-x');
        btnFlipX?.addEventListener('click', () => {
            this.canvasRef.flipSelectedX();
            this.render();
        });

        const btnFlipY = this.container.querySelector('#btn-flip-y');
        btnFlipY?.addEventListener('click', () => {
            this.canvasRef.flipSelectedY();
            this.render();
        });

        const btnSnapSelected = this.container.querySelector('#btn-snap-selected-grid');
        btnSnapSelected?.addEventListener('click', () => {
            this.canvasRef.snapSelectedToGrid();
            this.render();
        });

        const btnCenterChunk = this.container.querySelector('#btn-center-chunk-asset');
        btnCenterChunk?.addEventListener('click', () => {
            this.canvasRef.centerSelectedInChunk();
            this.render();
        });

        const btnBake = this.container.querySelector('#btn-bake-to-chunk') as HTMLButtonElement;
        btnBake?.addEventListener('click', async () => {
            const icon = btnBake.querySelector('.bake-icon') as HTMLElement;
            const label = btnBake.querySelector('.bake-label') as HTMLElement;
            const spinner = btnBake.querySelector('.bake-spinner') as HTMLElement;

            btnBake.disabled = true;
            if (icon) icon.style.display = 'none';
            if (spinner) spinner.style.display = 'inline-block';
            if (label) label.textContent = 'Fixando no fundo...';

            try {
                const res = await this.canvasRef.bakeAssetToChunkBackground(asset);
                if (res.success) {
                    if (label) label.textContent = '✓ Fixado com Sucesso!';
                    setTimeout(() => {
                        this.render();
                    }, 400);
                } else {
                    ConfirmationModal.alert(res.message || 'Falha ao fixar asset no fundo do chunk.');
                    btnBake.disabled = false;
                    if (icon) icon.style.display = 'inline';
                    if (spinner) spinner.style.display = 'none';
                    if (label) label.textContent = 'Fixar no Fundo do Chunk (Bake)';
                }
            } catch (err: any) {
                ConfirmationModal.alert(`Erro inesperado: ${err?.message || err}`);
                btnBake.disabled = false;
                if (icon) icon.style.display = 'inline';
                if (spinner) spinner.style.display = 'none';
                if (label) label.textContent = 'Fixar no Fundo do Chunk (Bake)';
            }
        });

        const btnNat = this.container.querySelector('#btn-naturalize-asset');
        btnNat?.addEventListener('click', () => {
            this.canvasRef.naturalizeSelected();
            this.render();
        });

        const btnDup = this.container.querySelector('#btn-duplicate-asset');
        btnDup?.addEventListener('click', () => {
            this.canvasRef.duplicateSelected();
            this.render();
        });

        this.container.querySelector('#btn-toggle-lock-asset')?.addEventListener('click', () => {
            this.canvasRef.toggleLockSelected();
            this.render();
        });

        this.container.querySelector('#btn-stamp-asset')?.addEventListener('click', () => {
            this.canvasRef.toggleStampMode();
            this.render();
        });

        const btnDel = this.container.querySelector('#btn-delete-asset');
        btnDel?.addEventListener('click', () => {
            this.canvasRef.deleteSelected();
            this.render();
        });

        const btnOpenTarget = this.container.querySelector('#btn-prop-open-target-map');
        btnOpenTarget?.addEventListener('click', () => {
            const targetId = asset.targetMapId || 'interior_black_default';
            const innerDef = InnerMapManager.getInstance().getInnerMap(targetId);
            if (innerDef) {
                this.onOpenMapCallback?.(InnerMapManager.getInstance().toSelectedMapConfig(innerDef));
            } else if (targetId === 'vilgem' || targetId === 'alun' || targetId === 'cemii' || targetId === 'blank_project') {
                this.onOpenMapCallback?.({
                    id: targetId,
                    name: targetId === 'vilgem' ? 'Alvorada de Vilgem' : targetId,
                    width: targetId === 'vilgem' ? 3072 : 4000,
                    height: targetId === 'vilgem' ? 4096 : 4000,
                    chunkSize: targetId === 'vilgem' ? 1024 : 1000,
                    description: `Mundo ${targetId}`
                });
            } else {
                ConfirmationModal.alert(`O mapa "${targetId}" ainda não existe no catálogo.`);
            }
        });

        this.bindChunkBrushEvents();
    }

    /**
     * Retorna a lista consolidada de texturas de fundo de chunk e terreno para o Pincel de Textura.
     */
    public getAvailableBrushTextures(): Array<{ label: string; url: string }> {
        const list: Array<{ label: string; url: string }> = [];
        const seen = new Set<string>();

        const addOption = (label: string, url: string) => {
            if (!url || seen.has(url)) return;
            seen.add(url);
            list.push({ label, url });
        };

        for (const t of ChunkManagerModal.TERRAIN_TEXTURES) {
            addOption(t.label, t.url);
        }

        //? Adiciona texturas presentes nos chunks atuais do mapa
        const mapChunks = this.canvasRef['mapConfig']?.chunks;
        if (Array.isArray(mapChunks)) {
            for (let r = 0; r < mapChunks.length; r++) {
                const row = mapChunks[r];
                if (!Array.isArray(row)) continue;
                for (let c = 0; c < row.length; c++) {
                    const url = row[c];
                    if (url && typeof url === 'string') {
                        const fileName = url.split('/').pop() || `Chunk (${r},${c})`;
                        addOption(`Chunk [${r},${c}] - ${fileName}`, url);
                    }
                }
            }
        }

        //? Garante que a textura ativa atual esteja presente na lista
        if (this.canvasRef.activeBrushTextureUrl) {
            addOption(this.canvasRef.activeBrushTextureName || 'Textura Selecionada', this.canvasRef.activeBrushTextureUrl);
        }

        return list;
    }

    /**
     * Renderiza a seção HTML do Pincel de Textura de Chunk (Chunk Texture Brush Tool).
     */
    private renderChunkBrushSectionHtml(): string {
        const isActive = this.canvasRef.isChunkBrushMode;
        const radius = this.canvasRef.chunkBrushRadius;
        const softnessPct = Math.round(this.canvasRef.chunkBrushSoftness * 100);
        const opacityPct = Math.round(this.canvasRef.chunkBrushOpacity * 100);
        const textures = this.getAvailableBrushTextures();
        const activePainted = this.canvasRef.activePaintedAsset || (this.canvasRef.selectedAsset?.isPaintedLayer ? this.canvasRef.selectedAsset : null);

        return `
            <div class="prop-section chunk-brush-section" style="border: 1px solid ${isActive ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.08)'}; background: ${isActive ? 'rgba(56, 189, 248, 0.06)' : 'rgba(255, 255, 255, 0.02)'}; border-radius: 8px; padding: 10px;">
                <div class="prop-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <label class="prop-label" style="margin-bottom: 0;">🎨 Pincel de Textura de Chunk</label>
                    <span class="prop-badge ${isActive ? 'highlight' : 'neutral'}">${isActive ? 'Ativo (T)' : 'Off (T)'}</span>
                </div>

                <p class="prop-hint-text" style="margin: 0 0 8px 0; font-size: 11px;">
                    Selecione um fundo de chunk e pinte com o círculo do mouse sobre o mapa para gerar uma área texturizada pronta para Bake.
                </p>

                <button type="button" id="btn-prop-toggle-chunk-brush" class="btn-action ${isActive ? 'active' : ''} btn-span-2" style="width: 100%; margin-bottom: 10px; justify-content: center; font-weight: 600;">
                    <span>${isActive ? '🛑' : '🖌️'}</span> ${isActive ? 'Desativar Pincel de Chunk (Tecla T / Esc)' : 'Ativar Pincel de Textura de Chunk (Tecla T)'}
                </button>

                <div class="prop-field">
                    <span class="field-label">Fundo de Chunk para Pintar:</span>
                    <select id="select-chunk-brush-texture" class="prop-input" style="cursor: pointer; width: 100%;">
                        ${textures.map(t => `<option value="${t.url}" data-label="${t.label}" ${t.url === this.canvasRef.activeBrushTextureUrl ? 'selected' : ''}>${t.label}</option>`).join('')}
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin: 8px 0 10px 0;">
                    ${textures.slice(0, 10).map(t => `
                        <button type="button" class="btn-brush-tex-thumb ${t.url === this.canvasRef.activeBrushTextureUrl ? 'active' : ''}" data-url="${t.url}" data-label="${t.label}" title="${t.label}" style="padding: 2px; border-radius: 5px; border: 2px solid ${t.url === this.canvasRef.activeBrushTextureUrl ? '#38bdf8' : 'rgba(255,255,255,0.12)'}; background: #0f172a; cursor: pointer; overflow: hidden; height: 38px;">
                            <img src="${t.url}" alt="${t.label}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 3px; display: block;" />
                        </button>
                    `).join('')}
                </div>

                <div class="prop-field">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="field-label">Raio do Círculo ([ / ]):</span>
                        <span id="chunk-brush-radius-badge" class="prop-badge highlight">${radius}px</span>
                    </div>
                    <input type="range" id="slider-chunk-brush-radius" min="8" max="256" step="2" value="${radius}" style="width: 100%; cursor: pointer; margin-top: 4px;">
                    <div style="display: flex; gap: 4px; margin-top: 6px;">
                        ${[16, 32, 48, 64, 96, 128].map(r => `
                            <button type="button" class="btn-action-small btn-brush-radius-preset ${radius === r ? 'active' : ''}" data-radius="${r}" style="flex: 1; padding: 3px 0; font-size: 10px;">
                                ${r}px
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="prop-row-2" style="margin-top: 8px;">
                    <div class="prop-field">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="field-label">Borda Suave:</span>
                            <span id="chunk-brush-softness-badge" style="font-size: 10px; color: var(--accent-gold);">${softnessPct}%</span>
                        </div>
                        <input type="range" id="slider-chunk-brush-softness" min="0" max="100" step="5" value="${softnessPct}" style="width: 100%; cursor: pointer;">
                    </div>
                    <div class="prop-field">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="field-label">Opacidade:</span>
                            <span id="chunk-brush-opacity-badge" style="font-size: 10px; color: var(--accent-gold);">${opacityPct}%</span>
                        </div>
                        <input type="range" id="slider-chunk-brush-opacity" min="10" max="100" step="5" value="${opacityPct}" style="width: 100%; cursor: pointer;">
                    </div>
                </div>

                <div class="toggle-option" style="margin-top: 8px;">
                    <input type="checkbox" id="chk-merge-brush-strokes" ${this.canvasRef.mergeBrushStrokes ? 'checked' : ''}>
                    <label for="chk-merge-brush-strokes">Acumular pinceladas no mesmo objeto pintado</label>
                </div>

                <div class="prop-actions-section" style="margin-top: 8px;">
                    <button type="button" id="btn-new-painted-layer" class="btn-action btn-span-2" title="Inicia uma nova área pintada independente na próxima pincelada">
                        <span>➕</span> Nova Área Pintada Separada
                    </button>
                    ${activePainted ? `
                    <button type="button" id="btn-bake-active-painted-layer" class="btn-action btn-bake-chunk btn-span-2" title="Incorpora imediatamente a área pintada no fundo do chunk (Bake)">
                        <span class="bake-icon">🖼️</span>
                        <span class="bake-label">Fixar Área Pintada no Chunk (Bake)</span>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Registra os eventos dos controles do Pincel de Textura de Chunk.
     */
    private bindChunkBrushEvents(): void {
        const btnToggleBrush = this.container.querySelector('#btn-prop-toggle-chunk-brush');
        btnToggleBrush?.addEventListener('click', () => {
            this.canvasRef.toggleChunkBrushMode();
            this.render();
        });

        const selectTex = this.container.querySelector('#select-chunk-brush-texture') as HTMLSelectElement;
        selectTex?.addEventListener('change', () => {
            const opt = selectTex.selectedOptions[0];
            const label = opt?.getAttribute('data-label') || opt?.textContent || 'Textura de Chunk';
            this.canvasRef.setBrushTexture(selectTex.value, label);
            this.render();
        });

        this.container.querySelectorAll('.btn-brush-tex-thumb').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.getAttribute('data-url') || '';
                const label = btn.getAttribute('data-label') || 'Textura de Chunk';
                if (url) {
                    this.canvasRef.setBrushTexture(url, label);
                    if (!this.canvasRef.isChunkBrushMode) {
                        this.canvasRef.toggleChunkBrushMode(true, url, label);
                    }
                    this.render();
                }
            });
        });

        const radiusSlider = this.container.querySelector('#slider-chunk-brush-radius') as HTMLInputElement;
        const radiusBadge = this.container.querySelector('#chunk-brush-radius-badge') as HTMLElement;
        radiusSlider?.addEventListener('input', () => {
            const r = parseInt(radiusSlider.value, 10) || 48;
            this.canvasRef.setChunkBrushRadius(r);
            if (radiusBadge) radiusBadge.textContent = `${this.canvasRef.chunkBrushRadius}px`;
            const navText = document.getElementById('chunk-brush-status-text');
            if (navText && this.canvasRef.isChunkBrushMode) {
                navText.textContent = `Pincel Chunk (T): Ativo (${this.canvasRef.chunkBrushRadius}px)`;
            }
        });
        radiusSlider?.addEventListener('change', () => {
            this.render();
        });

        this.container.querySelectorAll('.btn-brush-radius-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const r = parseInt(btn.getAttribute('data-radius') || '48', 10);
                this.canvasRef.setChunkBrushRadius(r);
                const navText = document.getElementById('chunk-brush-status-text');
                if (navText && this.canvasRef.isChunkBrushMode) {
                    navText.textContent = `Pincel Chunk (T): Ativo (${this.canvasRef.chunkBrushRadius}px)`;
                }
                this.render();
            });
        });

        const softnessSlider = this.container.querySelector('#slider-chunk-brush-softness') as HTMLInputElement;
        const softnessBadge = this.container.querySelector('#chunk-brush-softness-badge') as HTMLElement;
        softnessSlider?.addEventListener('input', () => {
            const pct = parseInt(softnessSlider.value, 10) || 0;
            this.canvasRef.setChunkBrushSoftness(pct / 100);
            if (softnessBadge) softnessBadge.textContent = `${pct}%`;
        });

        const opacitySlider = this.container.querySelector('#slider-chunk-brush-opacity') as HTMLInputElement;
        const opacityBadge = this.container.querySelector('#chunk-brush-opacity-badge') as HTMLElement;
        opacitySlider?.addEventListener('input', () => {
            const pct = parseInt(opacitySlider.value, 10) || 100;
            this.canvasRef.setChunkBrushOpacity(pct / 100);
            if (opacityBadge) opacityBadge.textContent = `${pct}%`;
        });

        const chkMerge = this.container.querySelector('#chk-merge-brush-strokes') as HTMLInputElement;
        chkMerge?.addEventListener('change', () => {
            this.canvasRef.mergeBrushStrokes = chkMerge.checked;
        });

        const btnNewLayer = this.container.querySelector('#btn-new-painted-layer');
        btnNewLayer?.addEventListener('click', () => {
            this.canvasRef.startNewPaintedLayer();
            this.canvasRef.selectAsset(null);
            this.render();
        });

        const btnBakePainted = this.container.querySelector('#btn-bake-active-painted-layer') as HTMLButtonElement;
        btnBakePainted?.addEventListener('click', async () => {
            const target = this.canvasRef.activePaintedAsset || (this.canvasRef.selectedAsset?.isPaintedLayer ? this.canvasRef.selectedAsset : null);
            if (!target) return;
            btnBakePainted.disabled = true;
            const res = await this.canvasRef.bakeAssetToChunkBackground(target);
            if (!res.success) {
                ConfirmationModal.alert(res.message || 'Falha ao fixar pintura no fundo do chunk.');
                btnBakePainted.disabled = false;
            } else {
                this.render();
            }
        });
    }

    private bindOverviewEvents(): void {
        const map = this.canvasRef['mapConfig'];

        if (map.isInnerMap) {
            const btnBackParent = this.container.querySelector('#btn-back-to-parent-world');
            btnBackParent?.addEventListener('click', () => {
                const parentId = map.parentWorldId || 'vilgem';
                const parentInner = InnerMapManager.getInstance().getInnerMap(parentId);
                if (parentInner) {
                    this.onOpenMapCallback?.(InnerMapManager.getInstance().toSelectedMapConfig(parentInner));
                } else {
                    this.onOpenMapCallback?.({
                        id: parentId,
                        name: parentId === 'vilgem' ? 'Alvorada de Vilgem' : parentId,
                        width: parentId === 'vilgem' ? 3072 : 4000,
                        height: parentId === 'vilgem' ? 4096 : 4000,
                        chunkSize: parentId === 'vilgem' ? 1024 : 1000,
                        description: `Mundo ${parentId}`
                    });
                }
            });

            const colorPicker = this.container.querySelector('#overview-innermap-color') as HTMLInputElement;
            const colorHex = this.container.querySelector('#overview-innermap-hex') as HTMLInputElement;
            if (colorPicker && colorHex) {
                const updateColor = (newVal: string) => {
                    map.backgroundColor = newVal;
                    colorPicker.value = newVal;
                    colorHex.value = newVal;
                    this.canvasRef.render();
                    InnerMapManager.getInstance().updateInnerMap(map.id, { backgroundColor: newVal });
                };
                colorPicker.addEventListener('input', () => updateColor(colorPicker.value));
                colorHex.addEventListener('change', () => updateColor(colorHex.value));
            }
        }

        const chkGrid = this.container.querySelector('#chk-show-grid') as HTMLInputElement;
        chkGrid?.addEventListener('change', () => {
            this.canvasRef.showGrid = chkGrid.checked;
            this.canvasRef.render();
        });

        const chkSnap = this.container.querySelector('#chk-snap-grid') as HTMLInputElement;
        chkSnap?.addEventListener('change', () => {
            this.canvasRef.snapToGrid = chkSnap.checked;
            this.render();
        });

        const chkChunks = this.container.querySelector('#chk-show-chunks') as HTMLInputElement;
        chkChunks?.addEventListener('change', () => {
            this.canvasRef.showChunkBorders = chkChunks.checked;
            this.canvasRef.render();
        });

        const selectGridSize = this.container.querySelector('#select-grid-size') as HTMLSelectElement;
        selectGridSize?.addEventListener('change', () => {
            const newSize = parseInt(selectGridSize.value, 10) || 32;
            this.canvasRef.gridSize = newSize;
            this.canvasRef.render();
        });

        const btnSnapAll = this.container.querySelector('#btn-snap-all-grid');
        btnSnapAll?.addEventListener('click', () => {
            this.canvasRef.snapAllToGrid();
            this.render();
        });

        const btnCenterCamera = this.container.querySelector('#btn-center-camera-map');
        btnCenterCamera?.addEventListener('click', () => {
            this.canvasRef.centerMap();
            this.canvasRef.render();
        });

        const btnChangeMap = this.container.querySelector('#btn-change-map');
        btnChangeMap?.addEventListener('click', () => {
            this.onOpenMapSelectorCallback?.();
        });

        const btnManageChunks = this.container.querySelector('#btn-props-manage-chunks');
        btnManageChunks?.addEventListener('click', () => {
            this.onManageChunksCallback?.();
        });

        const btnExportImage = this.container.querySelector('#btn-export-canvas-image');
        btnExportImage?.addEventListener('click', () => {
            const defaultName = map.id === 'blank_project' 
                ? `chunk_ground_${map.width}x${map.height}` 
                : `${map.id}_ground_layer`;
            this.canvasRef.exportAsImage({
                fileName: defaultName,
                transparentBackground: false
            });
        });

        const filterInput = this.container.querySelector('#input-filter-placed-assets') as HTMLInputElement;
        const jumpList = this.container.querySelector('#placed-assets-jump-list') as HTMLElement;

        const bindListEvents = () => {
            if (!jumpList) return;
            jumpList.querySelectorAll('.jump-list-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    const target = e.target as HTMLElement;
                    if (target.classList.contains('btn-jump-lock') || target.closest('.btn-jump-lock')) return;
                    const uid = el.getAttribute('data-uid');
                    const found = this.canvasRef.placedAssets.find(a => a.uid === uid);
                    if (found) {
                        this.canvasRef.panToAsset(found);
                    }
                });
            });

            jumpList.querySelectorAll('.btn-jump-lock').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const uid = btn.getAttribute('data-uid');
                    const found = this.canvasRef.placedAssets.find(a => a.uid === uid);
                    if (found) {
                        found.locked = !found.locked;
                        this.canvasRef.render();
                        this.render();
                    }
                });
            });
        };

        bindListEvents();

        filterInput?.addEventListener('input', () => {
            if (jumpList) {
                jumpList.innerHTML = this.renderPlacedAssetsListHtml(filterInput.value);
                bindListEvents();
            }
        });

        this.bindChunkBrushEvents();
    }

    private renderPlacedAssetsListHtml(filterText: string = ''): string {
        const query = filterText.toLowerCase().trim();
        const assets = this.canvasRef.placedAssets.filter(a => {
            if (!query) return true;
            return (a.name || '').toLowerCase().includes(query) || (a.presetId || '').toLowerCase().includes(query);
        });

        if (assets.length === 0) {
            return `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 12px 0;">Nenhum objeto encontrado no mapa</div>`;
        }

        return assets.map((a) => `
            <div class="jump-list-item ${a.selected ? 'selected' : ''}" data-uid="${a.uid}" style="display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; cursor: pointer; transition: all 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                    <span style="font-size: 13px;">${a.isPaintedLayer ? '🎨' : (a.isPortal ? '🌀' : (a.isItem ? '⚔️' : (a.isSprite ? '🎞️' : '🖼️')))}</span>
                    <span style="font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; color: var(--text-normal);">
                        ${a.name || a.presetId}
                    </span>
                    ${a.locked ? '<span style="font-size: 10px;" title="Bloqueado">🔒</span>' : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="font-family: monospace; color: var(--accent-gold); font-size: 10px;">${a.x}, ${a.y}</span>
                    <button type="button" class="btn-jump-lock" data-uid="${a.uid}" title="Travar / Destravar" style="background: none; border: none; cursor: pointer; padding: 0 2px; font-size: 11px;">
                        ${a.locked ? '🔒' : '🔓'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Retorna todos os destinos de portal e mundos conhecidos para seleção unificada.
     */
    public getAllPortalDestinations(): Array<{
        category: string;
        mapId: string;
        label: string;
        spawnX: number;
        spawnY: number;
    }> {
        const list: Array<{
            category: string;
            mapId: string;
            label: string;
            spawnX: number;
            spawnY: number;
        }> = [];

        const currentMapId = this.canvasRef['mapConfig']?.id;

        const rootWorlds = [
            { id: 'vilgem', name: 'Alvorada de Vilgem', defaultSpawn: { x: 1536, y: 1615 }, labelPrefix: 'Spawn Central (Fonte do Despertar)' },
            { id: 'alun', name: 'Alun', defaultSpawn: { x: 500, y: 500 }, labelPrefix: 'Spawn Central / Inicial' },
            { id: 'cemii', name: 'Cemii', defaultSpawn: { x: 500, y: 500 }, labelPrefix: 'Spawn Central / Inicial' }
        ];

        for (const rw of rootWorlds) {
            //? Não lista o próprio mapa atual se já estivermos nele, a menos que seja um retorno de InnerMap para seu pai
            const isCurrent = rw.id === currentMapId;
            if (isCurrent && !this.canvasRef['mapConfig']?.isInnerMap) continue;

            list.push({
                category: `Mundo: ${rw.name}`,
                mapId: rw.id,
                label: `${rw.labelPrefix} (${rw.defaultSpawn.x}, ${rw.defaultSpawn.y})`,
                spawnX: rw.defaultSpawn.x,
                spawnY: rw.defaultSpawn.y
            });

            //? Portais específicos do mundo raiz em PortalLinksMap
            const portals = PortalLinksMap[rw.id] || [];
            for (const p of portals) {
                list.push({
                    category: `Mundo: ${rw.name}`,
                    mapId: rw.id,
                    label: `Portal "${p.id}" em (${p.coordinates.x}, ${p.coordinates.y})${p.targetMapId ? ` -> Leva para: ${p.targetMapId}` : ''}`,
                    spawnX: p.coordinates.x,
                    spawnY: Math.round(p.coordinates.y + (p.size?.height ?? 48) + 15)
                });
            }
        }

        const innerMaps = InnerMapManager.getInstance().getAll();
        for (const im of innerMaps) {
            if (im.id === currentMapId) continue;

            const defSpawn = im.defaultSpawn || { x: 512, y: 700 };
            list.push({
                category: `Interior: ${im.name} [${im.id}]`,
                mapId: im.id,
                label: `Entrada / Spawn Padrão (${defSpawn.x}, ${defSpawn.y})`,
                spawnX: defSpawn.x,
                spawnY: defSpawn.y
            });

            //? Portais e saídas legítimas dentro do InnerMap: ao mirar no portal interno, o jogador surge na frente do portal DENTRO do InnerMap
            if (Array.isArray(im.portals)) {
                for (let i = 0; i < im.portals.length; i++) {
                    const p = im.portals[i]!;
                    const spawnX = p.x;
                    const spawnY = Math.max(0, p.y - 40);
                    list.push({
                        category: `Interior: ${im.name} [${im.id}]`,
                        mapId: im.id,
                        label: `Junto ao Portal (${p.x}, ${p.y})${p.targetMapId ? ` -> Saída para ${p.targetMapId}` : ''}`,
                        spawnX,
                        spawnY
                    });
                }
            }
        }

        return list;
    }

    /**
     * Renderiza o HTML das opções de destino de portal unificado.
     */
    private renderAllPortalDestinationsOptions(currentTargetMapId?: string, currentSpawnX?: number, currentSpawnY?: number): string {
        const allDestinations = this.getAllPortalDestinations();

        const groups: Record<string, typeof allDestinations> = {};
        for (const dest of allDestinations) {
            if (!groups[dest.category]) groups[dest.category] = [];
            groups[dest.category]!.push(dest);
        }

        let html = '<option value="">-- Selecione o Destino / Ponto de Retorno --</option>';

        for (const [category, items] of Object.entries(groups)) {
            html += `<optgroup label="${category}">`;
            for (const item of items) {
                const isSelected = item.mapId === currentTargetMapId &&
                    currentSpawnX !== undefined && currentSpawnY !== undefined &&
                    Math.abs(item.spawnX - currentSpawnX) <= 10 && Math.abs(item.spawnY - currentSpawnY) <= 10;
                const valueStr = `${item.mapId}|${item.spawnX}|${item.spawnY}`;
                html += `<option value="${valueStr}" ${isSelected ? 'selected' : ''}>${item.label}</option>`;
            }
            html += `</optgroup>`;
        }

        return html;
    }
}
