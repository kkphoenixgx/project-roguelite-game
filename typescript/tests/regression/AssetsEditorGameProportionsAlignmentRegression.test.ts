/**
 * @vitest-environment jsdom
 * @file AssetsEditorGameProportionsAlignmentRegression.test.ts
 * Blindagem de Regressão: Alinhamento Estrito de Proporções entre o Canvas do Assets-Editor e o Jogo.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetScanner } from '../../adapters/assets-adapter/Components/AssetScanner';
import { MapCanvas } from '../../adapters/assets-adapter/Components/MapCanvas';
import { WorldCodeSync } from '../../adapters/assets-adapter/Components/WorldCodeSync';
import { getAssetBaseSize } from '../../domain/ObjectModule/Scenery/SceneryRegistry';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import type { SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';

describe('Regressão de Alinhamento de Proporções (Assets Editor Canvas vs In-Game)', () => {
    let mockMap: SelectedMapConfig;

    beforeEach(() => {
        HTMLCanvasElement.prototype.getContext = (() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            drawImage: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn(() => ({ width: 80 })),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
        } as unknown as CanvasRenderingContext2D)) as any;

        document.body.innerHTML = `
            <div id="canvas-container" style="width: 800px; height: 600px;"></div>
        `;

        mockMap = {
            id: 'vilgem',
            name: 'Alvorada de Vilgem',
            width: 3072,
            height: 3072,
            chunkSize: 1024
        };
    });

    it('1. Deve assegurar que as proporções de largura e altura no editor são 100% idênticas às do Domínio/Jogo', () => {
        const scanner = new AssetScanner();
        const testPresets = [
            'stone_watchtower',
            'road_straight_horizontal',
            'river_straight_horizontal',
            'house_red_boro',
            'fountain_awakening',
            'house_small_cottage',
            'tree_pine'
        ];

        for (const presetId of testPresets) {
            const editorAsset = scanner.getAssetById(presetId);
            expect(editorAsset, `Asset ${presetId} deve existir no scanner`).toBeDefined();

            const gameSize = getAssetBaseSize(presetId);
            expect(gameSize.width, `Largura no jogo deve ser > 64 para ${presetId}`).toBeGreaterThan(0);

            // A proporção e as dimensões do Assets Editor DEVEM ser iguais às do jogo
            expect(editorAsset!.width).toBe(gameSize.width);
            expect(editorAsset!.height).toBe(gameSize.height);

            const editorAspect = editorAsset!.width / editorAsset!.height;
            const gameAspect = gameSize.width / gameSize.height;
            expect(Math.abs(editorAspect - gameAspect)).toBeLessThan(0.001);
        }
    });

    it('2. MapCanvas.addAssetToMap deve instanciar PlacedAssetModel com as dimensões e proporções exatas do jogo', () => {
        const scanner = new AssetScanner();
        const canvas = new MapCanvas('canvas-container', mockMap);

        const watchtowerDef = scanner.getAssetById('stone_watchtower')!;
        expect(watchtowerDef).toBeDefined();

        const placed = canvas.addAssetToMap(watchtowerDef, 200, 300);
        expect(placed.width).toBe(212);
        expect(placed.height).toBe(340);
        expect(placed.frameWidth).toBe(212);
        expect(placed.frameHeight).toBe(340);

        // Aspect ratio 212 / 340 ≈ 0.6235
        expect((placed.width / placed.height).toFixed(4)).toBe((212 / 340).toFixed(4));
    });

    it('3. MapCanvas deve sincronizar com dimensões naturais de imagem quando a imagem carrega assincronamente', () => {
        const scanner = new AssetScanner();
        const canvas = new MapCanvas('canvas-container', mockMap);

        const roadDef = scanner.getAssetById('road_straight_horizontal')!;
        const placed = canvas.addAssetToMap(roadDef, 500, 500);

        // Simula imagem carregada com dimensões reais 700x164
        const mockImg = {
            complete: true,
            naturalWidth: 700,
            naturalHeight: 164
        } as HTMLImageElement;

        (canvas as any).syncPlacedAssetsWithNaturalImage(placed.imageSrc, mockImg);

        expect(placed.width).toBe(700);
        expect(placed.height).toBe(164);
        expect(placed.width / placed.height).toBeCloseTo(700 / 164);
    });

    it('4. WorldCodeSync deve serializar e desserializar elementos mantendo fidelidade total de dimensões', () => {
        const sync = new WorldCodeSync();
        const scanner = new AssetScanner();

        const placedAssets = [
            {
                uid: 'tower_1',
                presetId: 'stone_watchtower',
                name: 'Stone Watchtower',
                x: -500,
                y: -600,
                width: 212,
                height: 340,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                imageSrc: 'http://localhost:5173/stone_watchtower_anim.png',
                frameWidth: 212,
                frameHeight: 340
            }
        ];

        const generatedCode = sync.generateSceneryCode(placedAssets as any, mockMap);
        expect(generatedCode).toContain("preset: 'stone_watchtower'");

        const parsedAssets = sync.parseSceneryFromCode(generatedCode, scanner);
        expect(parsedAssets.length).toBe(1);
        expect(parsedAssets[0]!.presetId).toBe('stone_watchtower');
        expect(parsedAssets[0]!.width).toBe(212);
        expect(parsedAssets[0]!.height).toBe(340);
    });

    it('5. Elementos escalados manualmente devem ter suas dimensões proporcionais preservadas no código', () => {
        const sync = new WorldCodeSync();
        const scanner = new AssetScanner();

        const scaledPlaced = [
            {
                uid: 'scaled_boro',
                presetId: 'house_red_boro',
                name: 'House Red Boro Scaled',
                x: 100,
                y: 100,
                width: 610, // 2x da largura base de 305
                height: 708, // 2x da altura base de 354
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                isCustomScaled: true,
                frameWidth: 305,
                frameHeight: 354,
                imageSrc: ''
            }
        ];

        const generatedCode = sync.generateSceneryCode(scaledPlaced as any, mockMap);
        expect(generatedCode).toContain("size: { width: 610, height: 708 }");

        const parsedAssets = sync.parseSceneryFromCode(generatedCode, scanner);
        expect(parsedAssets.length).toBe(1);
        expect(parsedAssets[0]!.width).toBe(610);
        expect(parsedAssets[0]!.height).toBe(708);
        expect(parsedAssets[0]!.width / parsedAssets[0]!.height).toBeCloseTo(305 / 354);
    });
});
