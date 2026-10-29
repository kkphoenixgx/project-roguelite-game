// @vitest-environment jsdom
/**
 * @file AssetsEditorPlayerIdleReference.unit.test.ts
 * Testes unitários para o HUD de referência do Player Idle no canto inferior direito do MapCanvas.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapCanvas } from '../../../typescript/adapters/assets-adapter/Components/MapCanvas';
import { VisualConfigMap } from '../../../typescript/adapters/web/shared/VisualConfigMap';

describe('AssetsEditorPlayerIdleReference (Unit Test)', () => {
    let mockMap: any;
    let canvas: MapCanvas;

    beforeEach(() => {
        document.body.innerHTML = '<div id="canvas-container" style="width: 1000px; height: 800px;"></div>';

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024,
            originChunk: { cx: 1, cy: 1 }
        };

        canvas = new MapCanvas('canvas-container', mockMap);
        // Garante dimensões do canvas no ambiente JSDOM
        (canvas as any).canvas.width = 1000;
        (canvas as any).canvas.height = 800;
    });

    it('1. deve inicializar com showPlayerReference = true e playerRefFollowZoom = true', () => {
        expect(canvas.showPlayerReference).toBe(true);
        expect(canvas.playerRefFollowZoom).toBe(true);
    });

    it('2. deve obter a configuração canônica do Player Idle a partir do VisualConfigMap', () => {
        const config = canvas.getPlayerIdleConfig();
        const expectedVisual = (VisualConfigMap as any)['player']?.animations?.['idle'];

        expect(config).toBeDefined();
        expect(config.frameCount).toBe(expectedVisual?.frameCount || 2);
        expect(config.animationSpeed).toBe(expectedVisual?.animationSpeed || 20);
        expect(config.frameWidth).toBe(32);
        expect(config.frameHeight).toBe(32);
        expect(config.worldWidth).toBe(32);
        expect(config.worldHeight).toBe(32);
        expect(config.imageSrc).toContain('player-idle');
    });

    it('3. deve calcular o bounding rect no canto inferior direito com base nas dimensões do canvas', () => {
        canvas.zoom = 1.0;
        const rect = canvas.getPlayerReferenceRect();

        expect(rect).toBeDefined();
        // Em 1000x800, com margin 20 e player 32px:
        expect(rect.x).toBe(1000 - rect.width - 20);
        expect(rect.y).toBe(800 - rect.height - 20);
        expect(rect.width).toBe(32);
        expect(rect.height).toBe(32);
    });

    it('4. deve adaptar as dimensões proporcionalmente ao nível de zoom (igual ao cenário)', () => {
        canvas.zoom = 0.5;
        const rectZoomHalf = canvas.getPlayerReferenceRect();
        expect(rectZoomHalf.width).toBe(16);
        expect(rectZoomHalf.height).toBe(16);

        canvas.zoom = 2.0;
        const rectZoomDouble = canvas.getPlayerReferenceRect();
        expect(rectZoomDouble.width).toBe(64);
        expect(rectZoomDouble.height).toBe(64);

        expect(rectZoomDouble.height).toBeGreaterThan(rectZoomHalf.height);
    });

    it('5. deve calcular dimensões fixas de 32px quando playerRefFollowZoom for falso (modo 1x)', () => {
        canvas.zoom = 2.5;
        canvas.playerRefFollowZoom = false;

        const rect1x = canvas.getPlayerReferenceRect();
        expect(rect1x.width).toBe(32);
        expect(rect1x.height).toBe(32);
    });

    it('6. deve alternar a visibilidade com togglePlayerReference', () => {
        expect(canvas.showPlayerReference).toBe(true);

        canvas.togglePlayerReference();
        expect(canvas.showPlayerReference).toBe(false);

        canvas.togglePlayerReference();
        expect(canvas.showPlayerReference).toBe(true);
    });

    it('7. deve executar render() sem lançar exceções com o overlay ativo e inativo', () => {
        expect(() => canvas.render()).not.toThrow();

        canvas.showPlayerReference = false;
        expect(() => canvas.render()).not.toThrow();

        canvas.showPlayerReference = true;
        canvas.zoom = 1.5;
        expect(() => canvas.render()).not.toThrow();
    });

    it('8. deve permitir spawnPlayerReferenceOnMap inserindo player na posição correta', () => {
        const initialAssetsCount = canvas.placedAssets.length;
        canvas.spawnPlayerReferenceOnMap();
        expect(canvas.placedAssets.length).toBe(initialAssetsCount + 1);

        const spawned = canvas.placedAssets[canvas.placedAssets.length - 1]!;
        expect(spawned.presetId).toBe('player');
        expect(spawned.width).toBe(32);
        expect(spawned.height).toBe(32);
    });
});
