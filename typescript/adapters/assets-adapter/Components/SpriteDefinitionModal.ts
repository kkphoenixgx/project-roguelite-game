/**
 * @file SpriteDefinitionModal.ts
 * Modal para definir novos sprites de objetos do mundo conforme solicitado pelo usuário.
 * Permite cadastrar imagem (upload de arquivo ou URL), dimensões, categorias, frameCount e presetId,
 * adicionando instantaneamente à biblioteca da gaveta em conformidade com o VisualConfigMap.ts.
 */

import type { AssetDefinition, AssetCategory } from "../Models/AssetDefinition";
import type { AssetScanner } from "./AssetScanner";
import { VisualConfigSync } from "./VisualConfigSync";
import { ConfirmationModal } from "../../web/GUIS/confirmationModalModule/ConfirmationModalGui";

export class SpriteDefinitionModal {
    private modalElement: HTMLElement;
    private scanner: AssetScanner;
    private visualConfigSync: VisualConfigSync;
    private onSpriteCreatedCallback?: ((asset: AssetDefinition) => void) | undefined;
    private uploadedImageUrl: string = '';
    private naturalImgWidth: number = 64;
    private naturalImgHeight: number = 64;

    constructor(scanner: AssetScanner, onSpriteCreated?: ((asset: AssetDefinition) => void) | undefined) {
        this.scanner = scanner;
        this.visualConfigSync = new VisualConfigSync();
        this.onSpriteCreatedCallback = onSpriteCreated;
        this.modalElement = document.createElement('div');
        this.modalElement.id = 'sprite-definition-modal';
        this.modalElement.className = 'modal-backdrop';
        this.render();
        document.body.appendChild(this.modalElement);
    }

    private render(): void {
        this.modalElement.innerHTML = `
            <div class="modal-card glassmorphism sprite-def-card">
                <div class="modal-header">
                    <h2>Definir Novo Sprite de Objeto</h2>
                    <button class="btn-close-modal" id="btn-close-sprite-modal">✕</button>
                </div>
                
                <div class="modal-body-split">
                    <!-- Lado Esquerdo: Imagem e Upload -->
                    <div class="sprite-upload-col">
                        <div class="upload-dropzone" id="sprite-dropzone">
                            <input type="file" id="sprite-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;">
                            <div class="dropzone-content" id="dropzone-content">
                                <span class="dropzone-icon">📁</span>
                                <p>Arraste uma imagem PNG ou clique para selecionar</p>
                                <span class="dropzone-hint">Suporta transparência RGBA e Spritesheets</span>
                            </div>
                            <img id="sprite-preview-img" class="sprite-preview-img" style="display: none;" />
                        </div>

                        <div class="url-input-fallback">
                            <span class="field-label">Ou cole a URL da imagem:</span>
                            <input type="text" id="sprite-url-input" class="prop-input" placeholder="https://... ou ../assets/..." />
                        </div>
                    </div>

                    <!-- Lado Direito: Configurações do Objeto -->
                    <div class="sprite-settings-col">
                        <div class="prop-field">
                            <span class="field-label">Tipo de Asset:</span>
                            <select id="def-asset-type" class="prop-input select-input">
                                <option value="sprite" selected>🎞️ Sprite Animado / Spritesheet</option>
                                <option value="static">🖼️ PNG Estático (Cenário Base)</option>
                            </select>
                        </div>

                        <div class="prop-field">
                            <span class="field-label">ID do Preset (Identificador no Domínio):</span>
                            <input type="text" id="def-preset-id" class="prop-input" placeholder="ex: house_mystic_library" required />
                        </div>

                        <div class="prop-field">
                            <span class="field-label">Nome Exibido:</span>
                            <input type="text" id="def-name" class="prop-input" placeholder="ex: Biblioteca Arcana dos Magos" required />
                        </div>

                        <div class="prop-field">
                            <span class="field-label">Categoria:</span>
                            <select id="def-category" class="prop-input select-input">
                                <option value="sprites" selected>🎞️ Sprites (Animados / Entidades)</option>
                                <option value="houses">🏠 Casas & Construções</option>
                                <option value="fortifications">🏰 Fortificações & Muralhas</option>
                                <option value="roads">🛣️ Estradas & Caminhos</option>
                                <option value="water">🌊 Rios & Água</option>
                                <option value="bridges">🌉 Pontes & Píeres</option>
                                <option value="fences">🚧 Cercas & Muros</option>
                                <option value="props">🪑 Mobiliário & Props Urbanos</option>
                                <option value="camp">⛺ Acampamento & Cripta</option>
                                <option value="market">🎪 Mercado & Tendas</option>
                                <option value="fountain">⛲ Fontes & Monumentos</option>
                                <option value="nature">🌿 Natureza (Geral)</option>
                                <option value="trees">🌲 Árvores & Troncos</option>
                                <option value="bushes">🌸 Arbustos & Flores</option>
                                <option value="rocks">🪨 Pedras & Rochedos</option>
                                <option value="portals">🌀 Portais</option>
                                <option value="items">⚔️ Itens (Geral)</option>
                                <option value="weapons">🗡️ Armas</option>
                                <option value="equipment">🛡️ Equipamentos & Armaduras</option>
                                <option value="consumables">🧪 Consumíveis & Poções</option>
                                <option value="tools">🔨 Ferramentas</option>
                                <option value="entities">👾 Entidades (Geral)</option>
                                <option value="npcs">🧙 NPCs</option>
                                <option value="enemies">👹 Inimigos & Bosses</option>
                                <option value="pets">🐾 Pets & Mascotes</option>
                                <option value="vfx">✨ VFX & Magias</option>
                                <option value="chunks">🧱 Chunks & Terrenos</option>
                                <option value="custom">🎨 Customizado / Outros</option>
                            </select>
                        </div>

                        <div class="prop-row-2">
                            <div class="prop-field">
                                <span class="field-label">Quantidade de Frames:</span>
                                <input type="number" id="def-frame-count" class="prop-input" value="1" min="1" max="64" />
                            </div>
                            <div class="prop-field">
                                <span class="field-label">Velocidade (FPS/Ticks):</span>
                                <input type="number" id="def-anim-speed" class="prop-input" value="10" min="1" max="60" />
                            </div>
                        </div>

                        <div class="prop-row-2">
                            <div class="prop-field">
                                <span class="field-label">Largura do Frame (px):</span>
                                <input type="number" id="def-width" class="prop-input" value="128" />
                            </div>
                            <div class="prop-field">
                                <span class="field-label">Altura do Frame (px):</span>
                                <input type="number" id="def-height" class="prop-input" value="128" />
                            </div>
                        </div>

                        <div class="prop-field">
                            <span class="field-label">Ponto de Ancoragem:</span>
                            <select id="def-anchor" class="prop-input select-input">
                                <option value="bottom-center" selected>Inferior Central (Pés no solo)</option>
                                <option value="center">Centralizado</option>
                                <option value="top-left">Superior Esquerdo</option>
                            </select>
                        </div>

                        <div class="modal-actions-bar">
                            <button id="btn-cancel-sprite" class="btn-secondary">Cancelar</button>
                            <button id="btn-confirm-sprite" class="btn-primary-highlight">
                                <span>✨</span> Cadastrar & Adicionar ao Mapa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    private bindEvents(): void {
        const btnClose = this.modalElement.querySelector('#btn-close-sprite-modal');
        const btnCancel = this.modalElement.querySelector('#btn-cancel-sprite');
        btnClose?.addEventListener('click', () => this.close());
        btnCancel?.addEventListener('click', () => this.close());

        const dropzone = this.modalElement.querySelector('#sprite-dropzone');
        const fileInput = this.modalElement.querySelector('#sprite-file-input') as HTMLInputElement;
        const previewImg = this.modalElement.querySelector('#sprite-preview-img') as HTMLImageElement;
        const dropContent = this.modalElement.querySelector('#dropzone-content') as HTMLElement;
        const widthInput = this.modalElement.querySelector('#def-width') as HTMLInputElement;
        const heightInput = this.modalElement.querySelector('#def-height') as HTMLInputElement;
        const urlInput = this.modalElement.querySelector('#sprite-url-input') as HTMLInputElement;
        const frameCountInput = this.modalElement.querySelector('#def-frame-count') as HTMLInputElement;
        const assetTypeSelect = this.modalElement.querySelector('#def-asset-type') as HTMLSelectElement;
        const categorySelect = this.modalElement.querySelector('#def-category') as HTMLSelectElement;

        //? Recalcula frameWidth proporcionalmente ao alterar o frameCount
        frameCountInput?.addEventListener('input', () => {
            const fc = Math.max(1, parseInt(frameCountInput.value, 10) || 1);
            if (this.naturalImgWidth > 0) {
                widthInput.value = String(Math.floor(this.naturalImgWidth / fc));
            }
            if (fc > 1) {
                assetTypeSelect.value = 'sprite';
                categorySelect.value = 'sprites';
            }
        });

        assetTypeSelect?.addEventListener('change', () => {
            if (assetTypeSelect.value === 'sprite') {
                categorySelect.value = 'sprites';
            }
        });

        dropzone?.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const result = ev.target?.result as string;
                    this.setImagePreview(result, previewImg, dropContent, widthInput, heightInput, frameCountInput);
                };
                reader.readAsDataURL(file);
            }
        });

        urlInput.addEventListener('input', () => {
            if (urlInput.value.trim().length > 5) {
                this.setImagePreview(urlInput.value.trim(), previewImg, dropContent, widthInput, heightInput, frameCountInput);
            }
        });

        const btnConfirm = this.modalElement.querySelector('#btn-confirm-sprite');
        btnConfirm?.addEventListener('click', async () => {
            const presetId = (this.modalElement.querySelector('#def-preset-id') as HTMLInputElement).value.trim();
            const name = (this.modalElement.querySelector('#def-name') as HTMLInputElement).value.trim();
            const assetType = assetTypeSelect.value;
            let category = categorySelect.value as AssetCategory;
            const frameCount = Math.max(1, parseInt(frameCountInput.value, 10) || 1);
            const animSpeed = Math.max(1, parseInt((this.modalElement.querySelector('#def-anim-speed') as HTMLInputElement).value, 10) || 10);
            const width = Number(widthInput.value) || 64;
            const height = Number(heightInput.value) || 64;
            const anchor = (this.modalElement.querySelector('#def-anchor') as HTMLSelectElement).value;

            if (!presetId) {
                ConfirmationModal.alert('Por favor, informe o ID do Preset.');
                return;
            }
            if (!this.uploadedImageUrl) {
                ConfirmationModal.alert('Por favor, faça upload de uma imagem ou informe uma URL.');
                return;
            }

            const isSprite = assetType === 'sprite' || frameCount > 1;
            if (isSprite) {
                category = 'sprites';
            }

            const newAsset: AssetDefinition = {
                id: presetId,
                name: name || presetId,
                category: category,
                imageSrc: this.uploadedImageUrl,
                width: width,
                height: height,
                frameWidth: width,
                frameHeight: height,
                frameCount: frameCount,
                animationSpeed: animSpeed,
                anchor: anchor,
                isSprite: isSprite,
                isCustom: true
            };

            this.scanner.registerCustomAsset(newAsset);

            //? Sincroniza dinamicamente com o VisualConfigMap.ts em disco
            await this.visualConfigSync.syncToDisk([newAsset]);

            this.onSpriteCreatedCallback?.(newAsset);
            this.close();
        });
    }

    private setImagePreview(
        src: string,
        img: HTMLImageElement,
        content: HTMLElement,
        wInp: HTMLInputElement,
        hInp: HTMLInputElement,
        fcInp: HTMLInputElement
    ): void {
        this.uploadedImageUrl = src;
        img.src = src;
        img.style.display = 'block';
        content.style.display = 'none';

        img.onload = () => {
            if (img.naturalWidth && img.naturalHeight) {
                this.naturalImgWidth = img.naturalWidth;
                this.naturalImgHeight = img.naturalHeight;
                const fc = Math.max(1, parseInt(fcInp.value, 10) || 1);
                wInp.value = String(Math.floor(img.naturalWidth / fc));
                hInp.value = String(img.naturalHeight);
            }
        };
    }

    public open(): void {
        this.modalElement.classList.add('is-open');
    }

    public close(): void {
        this.modalElement.classList.remove('is-open');
    }
}
