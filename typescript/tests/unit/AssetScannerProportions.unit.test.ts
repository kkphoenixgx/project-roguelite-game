/**
 * @file AssetScannerProportions.unit.test.ts
 * Teste unitário para validar que o AssetScanner e o catálogo canônico de dimensões
 * garantem proporções exatas 1:1 sem distorção ou fallbacks arbitrários de 48x48.
 */
import { describe, it, expect } from 'vitest';
import { AssetScanner } from '../../adapters/assets-adapter/Components/AssetScanner';
import { KNOWN_ASSET_DIMENSIONS } from '../../adapters/assets-adapter/Components/AssetDimensions';
import { getAssetBaseSize, SCENERY_PRESETS } from '../../domain/ObjectModule/Scenery/SceneryRegistry';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';

describe('AssetScanner - Fidelidade de Proporções e Dimensões 1:1 (Unit)', () => {
    const scanner = new AssetScanner();

    it('1. Deve extrair dimensões reais de fortificações e estradas sem distorcer para 48x48', () => {
        // stone_watchtower deve ser 212x340
        const watchtower = scanner.getAssetById('stone_watchtower') || scanner.getAssetById('stone_watchtower_clean');
        expect(watchtower).toBeDefined();
        expect(watchtower?.width).toBe(212);
        expect(watchtower?.height).toBe(340);

        // road_straight_horizontal deve ser 700x164
        const road = scanner.getAssetById('road_straight_horizontal');
        expect(road).toBeDefined();
        expect(road?.width).toBe(700);
        expect(road?.height).toBe(164);

        // river_straight_horizontal deve ser 468x220
        const river = scanner.getAssetById('river_straight_horizontal');
        expect(river).toBeDefined();
        expect(river?.width).toBe(468);
        expect(river?.height).toBe(220);

        // wooden_fence_post deve ser 25x143
        const post = scanner.getAssetById('wooden_fence_post') || scanner.getAssetById('wooden_fence_post_clean');
        expect(post).toBeDefined();
        expect(post?.width).toBe(25);
        expect(post?.height).toBe(143);
    });

    it('2. getAssetBaseSize no Domínio deve retornar as mesmas dimensões para todos os presets de cenário', () => {
        const watchtowerSize = getAssetBaseSize('stone_watchtower');
        expect(watchtowerSize).toEqual({ width: 212, height: 340 });

        const roadSize = getAssetBaseSize('road_straight_horizontal');
        expect(roadSize).toEqual({ width: 700, height: 164 });

        const riverSize = getAssetBaseSize('river_straight_horizontal');
        expect(riverSize).toEqual({ width: 468, height: 220 });

        const gatehouseSize = getAssetBaseSize('fortified_gatehouse');
        expect(gatehouseSize).toEqual({ width: 320, height: 351 });
    });

    it('3. KNOWN_ASSET_DIMENSIONS deve conter dimensões naturais de PNGs isolados', () => {
        expect(KNOWN_ASSET_DIMENSIONS['crate_apples']).toEqual({ width: 189, height: 173 });
        expect(KNOWN_ASSET_DIMENSIONS['crate_pumpkins']).toEqual({ width: 194, height: 175 });
        expect(KNOWN_ASSET_DIMENSIONS['wooden_fence_gate_clean']).toEqual({ width: 85, height: 69 });
    });

    it('4. SCENERY_PRESETS deve conter os presets registrados no VisualConfigMap', () => {
        expect(SCENERY_PRESETS['stone_watchtower']).toBeDefined();
        expect(SCENERY_PRESETS['stone_watchtower']!.width).toBe(212);
        expect(SCENERY_PRESETS['stone_watchtower']!.height).toBe(340);

        expect(SCENERY_PRESETS['house_red_boro']).toBeDefined();
        expect(SCENERY_PRESETS['house_red_boro']!.width).toBe(305);
        expect(SCENERY_PRESETS['house_red_boro']!.height).toBe(354);
    });
});
