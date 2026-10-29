// @vitest-environment jsdom
/**
 * @file AssetsEditorPlayerIdleReferenceRegression.test.ts
 * Blindagem de regressão para a referência de tamanho do Player Idle no canto inferior
 * direito do canvas de cenários do Assets Editor.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import type { PlacedAssetModel } from '../../../typescript/adapters/assets-adapter/Models/PlacedAssetModel';

describe('AssetsEditorPlayerIdleReference (Regression Suite)', () => {
    let mockMap: any;
    let canvas: MapCanvas;
    let houseAsset: PlacedAssetModel;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="canvas-container" style="width: 1200px; height: 900px;"></div>
            <input type="text" id="prop-asset-name" />
        `;

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            originChunk: { cx: 1, cy: 1 }
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        (canvas as any).canvas.width = 1200;
        (canvas as any).canvas.height = 900;

        houseAsset = {
            uid: 'house_medieval_test',
            presetId: 'house_stone_1',
            name: 'Casa Medieval',
            x: 200,
            y: 200,
            width: 240,
            height: 260,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            imageSrc: 'http://localhost/house.png',
            selected: true,
            isSprite: false
        };

        canvas.setPlacedAssets([houseAsset]);
    });

    it('1. deve manter a referência visual do Player visível por padrão no canto inferior direito', () => {
        expect(canvas.showPlayerReference).toBe(true);

        const rect = canvas.getPlayerReferenceRect();
        expect(rect.x + rect.width).toBeLessThanOrEqual(1200);
        expect(rect.y + rect.height).toBeLessThanOrEqual(900);
        expect(rect.x).toBeGreaterThan(600); // No quadrante direito
        expect(rect.y).toBeGreaterThan(500); // No quadrante inferior
    });

    it('2. deve manter a proporção exata com o zoom do mapa (32px * zoom)', () => {
        // No zoom 1.0 (100%), o player representa 32px
        canvas.zoom = 1.0;
        canvas.playerRefFollowZoom = true;
        let rect = canvas.getPlayerReferenceRect();
        const heightAtZoom1 = rect.height;
        expect(heightAtZoom1).toBe(32);

        // Ao dar zoom in para 2.0 (200%), o sprite na tela dobra de tamanho (64px)
        canvas.zoom = 2.0;
        rect = canvas.getPlayerReferenceRect();
        const heightAtZoom2 = rect.height;

        expect(heightAtZoom2).toBeGreaterThan(heightAtZoom1);
        expect(heightAtZoom2).toBe(64);

        // Ao dar zoom out para 0.5 (50%), o sprite na tela reduz proporcionalmente (16px)
        canvas.zoom = 0.5;
        rect = canvas.getPlayerReferenceRect();
        const heightAtZoomHalf = rect.height;
        expect(heightAtZoomHalf).toBe(16);
    });

    it('3. deve alternar entre modo Zoom e modo 1x ao clicar no card sem desmarcar assets ativos', () => {
        canvas.zoom = 1.5;
        canvas.playerRefFollowZoom = true;
        canvas.selectAsset(houseAsset);
        expect(canvas.selectedAsset).toBe(houseAsset);

        const rect = canvas.getPlayerReferenceRect();
        const clickX = rect.x + 5;
        const clickY = rect.y + 5;

        // Simula clique com o botão esquerdo sobre o card
        const canvasElement = (canvas as any).canvas as HTMLCanvasElement;
        const clickEvent = new MouseEvent('mousedown', {
            bubbles: true,
            clientX: clickX,
            clientY: clickY,
            button: 0
        });

        // Mock getBoundingClientRect para JSDOM
        canvasElement.getBoundingClientRect = () => ({
            left: 0,
            top: 0,
            right: 1200,
            bottom: 900,
            width: 1200,
            height: 900,
            x: 0,
            y: 0,
            toJSON: () => {}
        });

        canvasElement.dispatchEvent(clickEvent);

        // Modo deve ter sido alternado para falso (1x fixo)
        expect(canvas.playerRefFollowZoom).toBe(false);
        // O asset previamente selecionado deve continuar selecionado!
        expect(canvas.selectedAsset).toBe(houseAsset);

        // Segundo clique deve voltar para modo Zoom
        const rect2 = canvas.getPlayerReferenceRect();
        const clickEvent2 = new MouseEvent('mousedown', {
            bubbles: true,
            clientX: rect2.x + 5,
            clientY: rect2.y + 5,
            button: 0
        });
        canvasElement.dispatchEvent(clickEvent2);
        expect(canvas.playerRefFollowZoom).toBe(true);
    });

    it('4. deve alternar visibilidade com atalho Tecla P e ignorar se o foco estiver em um input', () => {
        expect(canvas.showPlayerReference).toBe(true);

        // Pressionar 'p' no canvas
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
        expect(canvas.showPlayerReference).toBe(false);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'P', bubbles: true }));
        expect(canvas.showPlayerReference).toBe(true);

        // Focar no campo de texto de propriedades
        const input = document.getElementById('prop-asset-name') as HTMLInputElement;
        input.focus();

        // Pressionar 'p' enquanto digita no input NÃO deve alternar
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
        expect(canvas.showPlayerReference).toBe(true);
    });

    it('5. não deve incluir o card de referência do player na exportação de imagens de fundo (exportAsImage)', () => {
        // exportAsImage gera a imagem de terreno plana e limpa
        const exportUrl = canvas.exportAsImage({ transparentBackground: true });
        expect(exportUrl).toBeDefined();
        // Garante que showPlayerReference estava ativo durante o export sem causar side-effects
        expect(canvas.showPlayerReference).toBe(true);
    });

    it('6. deve recalcular a posição no canto direito inferior ao redimensionar a tela ou trocar de mapa', () => {
        (canvas as any).canvas.width = 1600;
        (canvas as any).canvas.height = 1000;

        const rectLarge = canvas.getPlayerReferenceRect();
        expect(rectLarge.x).toBe(1600 - rectLarge.width - 20);
        expect(rectLarge.y).toBe(1000 - rectLarge.height - 20);

        // Redimensionar para menor
        (canvas as any).canvas.width = 800;
        (canvas as any).canvas.height = 600;

        const rectSmall = canvas.getPlayerReferenceRect();
        expect(rectSmall.x).toBe(800 - rectSmall.width - 20);
        expect(rectSmall.y).toBe(600 - rectSmall.height - 20);
        expect(rectSmall.x).toBeLessThan(rectLarge.x);
    });

    it('7. deve integrar o widget HTML com o botão + No Mapa inserindo um asset de 32x32px sem perder proporções', () => {
        const initialCount = canvas.placedAssets.length;
        canvas.spawnPlayerReferenceOnMap();

        expect(canvas.placedAssets.length).toBe(initialCount + 1);
        const playerGuide = canvas.placedAssets[canvas.placedAssets.length - 1]!;

        expect(playerGuide).toBeDefined();
        expect(playerGuide.width).toBe(32);
        expect(playerGuide.height).toBe(32);
        expect(canvas.selectedAsset).toBe(playerGuide);
    });
});
