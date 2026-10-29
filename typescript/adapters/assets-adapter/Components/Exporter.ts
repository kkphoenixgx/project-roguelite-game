/**
 * @file Exporter.ts
 * Gera e exibe o código TypeScript exato pronto para colar nas classes de mapa
 * do domínio (ex: VilgemWorld.ts), além de fornecer opções de cópia e exportação.
 */

import type { PlacedAssetModel } from "../Models/PlacedAssetModel";
import type { SelectedMapConfig } from "./MapSelectorModal";

export class Exporter {
    private modalElement: HTMLElement;

    constructor() {
        this.modalElement = document.createElement('div');
        this.modalElement.id = 'exporter-modal';
        this.modalElement.className = 'modal-backdrop';
        this.render();
        document.body.appendChild(this.modalElement);
    }

    private render(): void {
        this.modalElement.innerHTML = `
            <div class="modal-card glassmorphism export-card">
                <div class="modal-header">
                    <h2>Código TypeScript Gerado</h2>
                    <button class="btn-close-modal" id="btn-close-exporter">✕</button>
                </div>
                
                <p class="export-instructions">
                    Copie as linhas abaixo e cole dentro do método <code>generateCustomElements()</code> do seu arquivo de mapa (ex: <code>VilgemWorld.ts</code>):
                </p>

                <div class="code-preview-container">
                    <pre><code id="export-code-block">// Código será gerado aqui...</code></pre>
                </div>

                <div class="modal-actions-bar">
                    <span id="export-stats-label" class="export-stats">0 objetos mapeados</span>
                    <button id="btn-copy-code" class="btn-primary-highlight">
                        <span>📋</span> Copiar Código TypeScript
                    </button>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    private bindEvents(): void {
        const btnClose = this.modalElement.querySelector('#btn-close-exporter');
        btnClose?.addEventListener('click', () => this.close());

        const btnCopy = this.modalElement.querySelector('#btn-copy-code');
        btnCopy?.addEventListener('click', () => {
            const code = this.modalElement.querySelector('#export-code-block')?.textContent || '';
            navigator.clipboard.writeText(code).then(() => {
                if (btnCopy) {
                    btnCopy.innerHTML = `<span>✅</span> Código Copiado!`;
                    setTimeout(() => {
                        btnCopy.innerHTML = `<span>📋</span> Copiar Código TypeScript`;
                    }, 2000);
                }
            });
        });
    }

    /**
     * Gera o código TypeScript para os assets posicionados no mapa
     */
    public static generateTypeScript(mapConfig: SelectedMapConfig, assets: PlacedAssetModel[]): string {
        if (assets.length === 0) {
            return `// Nenhum asset posicionado no mapa ${mapConfig.name}. Arraste assets da gaveta para adicioná-los!`;
        }

        // Agrupa por Chunks de 1024px para organização exemplar do código
        const chunkSize = mapConfig.chunkSize || 1024;
        const chunkGroups = new Map<string, PlacedAssetModel[]>();

        assets.forEach(asset => {
            const chunkX = Math.floor(asset.x / chunkSize);
            const chunkY = Math.floor(asset.y / chunkSize);
            const key = `Chunk (${chunkX}, ${chunkY}) [${chunkX * chunkSize}..${(chunkX + 1) * chunkSize}, ${chunkY * chunkSize}..${(chunkY + 1) * chunkSize}]`;
            
            if (!chunkGroups.has(key)) {
                chunkGroups.set(key, []);
            }
            chunkGroups.get(key)!.push(asset);
        });

        const lines: string[] = [];
        lines.push(`// =========================================================================`);
        lines.push(`// MAPEAMENTO DE CENÁRIO: ${mapConfig.name.toUpperCase()} (${assets.length} ASSETS)`);
        lines.push(`// Gerado automaticamente pelo assets-adapter em ${new Date().toLocaleString()}`);
        lines.push(`// =========================================================================\n`);

        for (const [chunkName, groupAssets] of chunkGroups.entries()) {
            lines.push(`//* -------------------------------------------------------------------------`);
            lines.push(`//* ${chunkName}`);
            lines.push(`//* -------------------------------------------------------------------------`);

            groupAssets.forEach(asset => {
                if (asset.isPortal || asset.presetId.includes('portal')) {
                    const portalType = asset.portalType === 'direct' ? 'portalLink' : 'portalLinkRequest';
                    const targetMap = asset.targetMapId || 'interior_black_default';
                    const targetX = asset.targetSpawnX ?? 512;
                    const targetY = asset.targetSpawnY ?? 700;
                    const prompt = asset.promptText || 'Entrar';
                    const key = asset.actionKey || 'E';
                    const cooldown = asset.cooldownMs ?? 1000;

                    lines.push(`// Portal Link -> ${targetMap} (${asset.width}x${asset.height}px)`);
                    lines.push(`this.eventManager.dispatch('spawn', { type: '${portalType}', coordinates: { x: ${Math.round(asset.x)}, y: ${Math.round(asset.y)} }, size: { width: ${asset.width}, height: ${asset.height} }, metadata: { targetMapId: '${targetMap}', targetSpawnCoords: { x: ${targetX}, y: ${targetY} }, promptText: '${prompt}', actionKey: '${key}', cooldownMs: ${cooldown} } });`);
                } else {
                    lines.push(`// ${asset.name} (${asset.width}x${asset.height}px)`);
                    let meta = `preset: '${asset.presetId}'`;
                    if (asset.flipX) meta += `, flipX: true`;
                    if (asset.flipY) meta += `, flipY: true`;
                    lines.push(`this.eventManager.dispatch('spawn', { type: 'scenery', coordinates: { x: ${asset.x}, y: ${asset.y} }, metadata: { ${meta} } });`);
                }
            });

            lines.push('');
        }

        return lines.join('\n');
    }

    public generateTypeScript(mapConfig: SelectedMapConfig, assets: PlacedAssetModel[]): string {
        return Exporter.generateTypeScript(mapConfig, assets);
    }

    public open(mapConfig: SelectedMapConfig, assets: PlacedAssetModel[]): void {
        const code = this.generateTypeScript(mapConfig, assets);
        const codeBlock = this.modalElement.querySelector('#export-code-block');
        const statsLabel = this.modalElement.querySelector('#export-stats-label');

        if (codeBlock) codeBlock.textContent = code;
        if (statsLabel) statsLabel.textContent = `${assets.length} assets mapeados em ${mapConfig.name}`;

        this.modalElement.classList.add('is-open');
    }

    public close(): void {
        this.modalElement.classList.remove('is-open');
    }
}
