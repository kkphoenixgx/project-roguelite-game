// @vitest-environment jsdom
/**
 * @file AssetsEditorCenterInChunkRegression.test.ts
 * Testes de regressão para a funcionalidade e botão de Centralizar com o Chunk
 * no Assets Editor, cobrindo botões da UI (individual e multi-seleção), atalhos de teclado,
 * proteção contra digitação em inputs e suporte a Undo (Ctrl+Z).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { PropertiesPanel } from '../../../typescript/adapters/assets-adapter/Components/PropertiesPanel';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorCenterInChunkRegression (Regression Test)', () => {
    let mockMap: any;
    let canvas: MapCanvas;
    let propertiesPanel: PropertiesPanel;
    let monument: PlacedAssetModel;
    let statue: PlacedAssetModel;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="canvas-container"></div>
            <div id="properties-panel-container"></div>
        `;

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            originChunk: { cx: 1, cy: 1 }
        };

        monument = {
            uid: 'monument_center',
            presetId: 'monument_stone',
            name: 'Stone Monument',
            x: 200,
            y: 200,
            width: 100,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/monument.png',
            selected: false,
            isSprite: false
        };

        statue = {
            uid: 'statue_guard',
            presetId: 'statue_stone',
            name: 'Guard Statue',
            x: 350,
            y: 200,
            width: 50,
            height: 80,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost:5173/statue.png',
            selected: false,
            isSprite: false
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        canvas.placedAssets = [monument, statue];
        canvas.saveState();

        propertiesPanel = new PropertiesPanel(
            'properties-panel-container',
            canvas,
            undefined,
            undefined
        );
    });

    it('1. Botão "Centralizar com o Chunk" no painel de seleção individual deve centralizar o asset e atualizar a UI', () => {
        canvas.selectedAsset = monument;
        canvas.selectedAssets = [monument];
        propertiesPanel.render();

        const btnCenter = document.getElementById('btn-center-chunk-asset') as HTMLButtonElement;
        expect(btnCenter).not.toBeNull();

        // Aciona o clique no botão
        btnCenter.click();

        // Verifica que o monumento foi perfeitamente alinhado com o centro do chunk (512, 512)
        expect(monument.x).toBe(512 - monument.width / 2); // 462
        expect(monument.y).toBe(512 - monument.height / 2); // 462
        expect(monument.x + monument.width / 2).toBe(512);
        expect(monument.y + monument.height / 2).toBe(512);
    });

    it('2. Botão "Centralizar com o Chunk" no painel de seleção múltipla deve centralizar o grupo no chunk', () => {
        canvas.selectedAsset = monument;
        canvas.selectedAssets = [monument, statue];
        propertiesPanel.render();

        const btnGroupCenter = document.getElementById('btn-group-center-chunk') as HTMLButtonElement;
        expect(btnGroupCenter).not.toBeNull();

        btnGroupCenter.click();

        // Novo centro da bounding box deve ser (512, 512)
        const minX = Math.min(monument.x, statue.x);
        const maxX = Math.max(monument.x + monument.width, statue.x + statue.width);
        const minY = Math.min(monument.y, statue.y);
        const maxY = Math.max(monument.y + monument.height, statue.y + statue.height);

        expect((minX + maxX) / 2).toBe(512);
        expect((minY + maxY) / 2).toBe(512);
    });

    it('3. Atalho de teclado tecla "C" deve centralizar o asset, mas Ctrl+C não deve centralizar (deve copiar)', () => {
        canvas.selectedAsset = monument;
        canvas.selectedAssets = [monument];

        // 3a. Disparar Ctrl+C (deve apenas copiar, mantendo as coordenadas originais)
        const ctrlCEvent = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true });
        window.dispatchEvent(ctrlCEvent);

        expect(monument.x).toBe(200);
        expect(monument.y).toBe(200);
        expect(canvas.clipboardAssets.length).toBe(1);

        // 3b. Disparar tecla 'C' pura (sem Ctrl/Meta) -> deve centralizar no chunk
        const plainCEvent = new KeyboardEvent('keydown', { key: 'c', ctrlKey: false, metaKey: false, bubbles: true });
        window.dispatchEvent(plainCEvent);

        expect(monument.x).toBe(462);
        expect(monument.y).toBe(462);
    });

    it('4. Digitar tecla "c" em um <input> ou <textarea> NÃO deve disparar o alinhamento de centralização', () => {
        canvas.selectedAsset = monument;
        canvas.selectedAssets = [monument];

        const textInput = document.createElement('input');
        textInput.type = 'text';
        document.body.appendChild(textInput);
        textInput.focus();

        const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: false, metaKey: false, bubbles: true });
        window.dispatchEvent(event);

        // As coordenadas não devem ter mudado
        expect(monument.x).toBe(200);
        expect(monument.y).toBe(200);
    });

    it('5. Histórico: Desfazer (Ctrl+Z) deve reverter a centralização para a posição anterior', () => {
        canvas.selectedAsset = monument;
        canvas.selectedAssets = [monument];

        const originalX = monument.x;
        const originalY = monument.y;

        canvas.centerSelectedInChunk();
        expect(monument.x).toBe(462);
        expect(monument.y).toBe(462);

        // Desfazer (Ctrl+Z)
        const undoEvent = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
        window.dispatchEvent(undoEvent);

        const restored = canvas.placedAssets.find(a => a.uid === monument.uid);
        expect(restored).toBeDefined();
        expect(restored!.x).toBe(originalX);
        expect(restored!.y).toBe(originalY);
    });
});
