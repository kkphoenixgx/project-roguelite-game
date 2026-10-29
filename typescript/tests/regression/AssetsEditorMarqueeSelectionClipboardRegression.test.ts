// @vitest-environment jsdom
/**
 * @file AssetsEditorMarqueeSelectionClipboardRegression.test.ts
 * Blindagem de regressão para a ferramenta de seleção em área tipo desktop,
 * movimentação em bloco, clipboard (Ctrl+C, Ctrl+V), atalhos de teclado e painel de propriedades.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../../typescript/adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorMarqueeSelectionClipboardRegression (Regression)', () => {
    let mockMap: any;
    let asset1: PlacedAssetModel;
    let asset2: PlacedAssetModel;
    let asset3: PlacedAssetModel;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="canvas-container"></div>
            <div id="properties-panel"></div>
        `;

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 5120,
            height: 5120,
            chunkSize: 1024,
            originChunk: { cx: 2, cy: 2 }
        };

        asset1 = {
            uid: 'asset_1',
            presetId: 'house_bakery_rustic',
            name: 'Rustic Bakery',
            x: 100,
            y: 100,
            width: 280,
            height: 273,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/house_bakery_rustic_clean.png',
            selected: false,
            isSprite: false
        };

        asset2 = {
            uid: 'asset_2',
            presetId: 'street_lantern',
            name: 'Street Lantern',
            x: 500,
            y: 100,
            width: 35,
            height: 78,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/street_lantern_clean.png',
            selected: false,
            isSprite: false
        };

        asset3 = {
            uid: 'asset_3',
            presetId: 'tree_oak',
            name: 'Oak Tree',
            x: 1000,
            y: 1000,
            width: 130,
            height: 180,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/tree_oak_clean.png',
            selected: false,
            isSprite: false
        };
    });

    it('1. deve manter a seleção unitária e desseleção clássica funcionando sem regressão', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([asset1, asset2]);

        // Seleção individual de asset1
        canvas.selectAsset(asset1);
        expect(canvas.selectedAsset).toBe(asset1);
        expect(canvas.selectedAssets.length).toBe(1);
        expect(canvas.selectedAssets[0]!.uid).toBe('asset_1');
        expect(asset1.selected).toBe(true);
        expect(asset2.selected).toBe(false);

        // Desseleção com null
        canvas.selectAsset(null);
        expect(canvas.selectedAsset).toBeNull();
        expect(canvas.selectedAssets.length).toBe(0);
        expect(asset1.selected).toBe(false);
        expect(asset2.selected).toBe(false);
    });

    it('2. deve arrastar múltiplos assets selecionados com deslocamento idêntico sem afetar assets não selecionados', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.panX = 0;
        canvas.panY = 0;
        canvas.zoom = 1;
        canvas.setPlacedAssets([asset1, asset2, asset3]);

        // Seleciona asset1 e asset2
        canvas.boxSelectStartScreenX = 50;
        canvas.boxSelectStartScreenY = 50;
        canvas.boxSelectCurrentScreenX = 600;
        canvas.boxSelectCurrentScreenY = 400;
        canvas.updateBoxSelection(false);

        expect(canvas.selectedAssets.length).toBe(2);

        // Simula início do arraste no ponto (150, 150)
        const canvasElement = canvas['canvas'] as HTMLCanvasElement;
        canvasElement.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            right: 800,
            bottom: 600,
            width: 800,
            height: 600,
            x: 0,
            y: 0,
            toJSON: () => {}
        });

        // Mousedown sobre asset1
        canvasElement.dispatchEvent(new MouseEvent('mousedown', {
            button: 0,
            clientX: 150,
            clientY: 150
        }));

        // Mousemove deslocando +100px em X e +50px em Y
        canvasElement.dispatchEvent(new MouseEvent('mousemove', {
            clientX: 250,
            clientY: 200
        }));

        // Mouseup
        window.dispatchEvent(new MouseEvent('mouseup'));

        // Asset1 e Asset2 devem ter se movido exatamente +100px em X e +50px em Y
        expect(asset1.x).toBe(200); // 100 + 100
        expect(asset1.y).toBe(150); // 100 + 50

        expect(asset2.x).toBe(600); // 500 + 100
        expect(asset2.y).toBe(150); // 100 + 50

        // Asset3 NÃO estava selecionado, deve permanecer rigorosamente no mesmo lugar
        expect(asset3.x).toBe(1000);
        expect(asset3.y).toBe(1000);
    });

    it('3. deve disparar atalhos de teclado Ctrl+C, Ctrl+V, Ctrl+A e Delete corretamente', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.panX = 0;
        canvas.panY = 0;
        canvas.zoom = 1;
        canvas.setPlacedAssets([asset1, asset2]);

        // Atalho Ctrl+A para selecionar todos
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
        expect(canvas.selectedAssets.length).toBe(2);

        // Atalho Ctrl+C para copiar todos
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
        expect(canvas.clipboardAssets.length).toBe(2);

        // Atalho Ctrl+V para colar
        canvas.lastMouseWorldPos = { x: 300, y: 300 };
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
        expect(canvas.placedAssets.length).toBe(4);

        // Atalho Delete para apagar os colados que ficaram selecionados
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
        expect(canvas.placedAssets.length).toBe(2);
        expect(canvas.selectedAssets.length).toBe(0);
    });

    it('4. NÃO deve apagar nem modificar assets quando o usuário estiver digitando em campos de input', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([asset1]);
        canvas.selectAsset(asset1);

        // Cria input no documento e dá foco
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        expect(document.activeElement).toBe(input);

        // Pressiona Delete e Backspace enquanto focado no input
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

        // O asset NÃO deve ser excluído
        expect(canvas.placedAssets.length).toBe(1);
        expect(canvas.selectedAsset).toBe(asset1);

        // Pressiona tecla H para espelhar enquanto focado no input
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
        expect(asset1.flipX).toBeFalsy();
    });

    it('5. deve renderizar o painel de seleção múltipla (PropertiesPanel) com ações em grupo', () => {
        const canvas = new MapCanvas('canvas-container', mockMap);
        canvas.setPlacedAssets([asset1, asset2]);

        const panel = new PropertiesPanel('properties-panel', canvas);

        // Seleciona ambos
        canvas.selectAll();
        panel.render();

        const panelElement = document.getElementById('properties-panel')!;
        expect(panelElement.innerHTML).toContain('Seleção Múltipla');
        expect(panelElement.innerHTML).toContain('2 Objetos');
        expect(panelElement.querySelector('#btn-group-copy')).not.toBeNull();
        expect(panelElement.querySelector('#btn-group-duplicate')).not.toBeNull();
        expect(panelElement.querySelector('#btn-group-delete')).not.toBeNull();

        // Clica no botão de duplicar grupo no painel
        const btnDup = panelElement.querySelector('#btn-group-duplicate') as HTMLButtonElement;
        btnDup.click();

        expect(canvas.placedAssets.length).toBe(4);
    });
});
