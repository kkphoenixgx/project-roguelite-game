import { describe, it, expect } from 'vitest';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import { KNOWN_ASSET_DIMENSIONS } from '../../adapters/assets-adapter/Components/AssetDimensions';
import hitboxesData from '../../domain/ObjectModule/Scenery/asset_hitboxes.json';

/**
 * @file RoadDirtDetailsRegression.test.ts
 * Testes de regressão para blindar a paridade de dimensões, registro e hitboxes
 * dos detalhes de estrada de barro (road_dirt_patch, road_dirt_ruts, road_dirt_clods).
 */

describe('RoadDirtDetails Regression Tests', () => {
    const assets = [
        { id: 'road_dirt_patch', width: 180, height: 110, filename: 'road_dirt_patch.png' },
        { id: 'road_dirt_ruts', width: 190, height: 70, filename: 'road_dirt_ruts.png' },
        { id: 'road_dirt_clods', width: 96, height: 56, filename: 'road_dirt_clods.png' }
    ];

    it('deve registrar todos os detalhes de terra batida no VisualConfigMap com dimensões fiéis', () => {
        for (const asset of assets) {
            const config = (VisualConfigMap as Record<string, any>)[asset.id];
            expect(config, `Configuração ausente para ${asset.id}`).toBeDefined();
            expect(config.category).toBe('entity');

            const staticAnim = config.animations['static'];
            expect(staticAnim).toBeDefined();
            expect(staticAnim.frameCount).toBe(1);
            expect(staticAnim.frameWidth).toBe(asset.width);
            expect(staticAnim.frameHeight).toBe(asset.height);
            expect(staticAnim.imageSrc).toContain(asset.filename);

            const idleAnim = config.animations['idle'];
            expect(idleAnim).toBeDefined();
            expect(idleAnim.frameCount).toBe(1);
            expect(idleAnim.frameWidth).toBe(asset.width);
            expect(idleAnim.frameHeight).toBe(asset.height);
            expect(idleAnim.imageSrc).toContain(asset.filename);
        }
    });

    it('deve registrar as dimensões canônicas em KNOWN_ASSET_DIMENSIONS', () => {
        for (const asset of assets) {
            expect(KNOWN_ASSET_DIMENSIONS[asset.id]).toEqual({
                width: asset.width,
                height: asset.height
            });
        }
    });

    it('deve registrar no asset_hitboxes.json com shapes vazios (chão caminhável sem colisão)', () => {
        const hitboxes = hitboxesData as Record<string, any>;
        for (const asset of assets) {
            const entry = hitboxes[asset.id];
            expect(entry, `Entrada ausente em asset_hitboxes.json para ${asset.id}`).toBeDefined();
            expect(entry.baseWidth).toBe(asset.width);
            expect(entry.baseHeight).toBe(asset.height);
            expect(entry.shapes).toEqual([]);
        }
    });
});
