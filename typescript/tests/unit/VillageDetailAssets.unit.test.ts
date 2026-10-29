import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import { KNOWN_ASSET_DIMENSIONS } from '../../adapters/assets-adapter/Components/AssetDimensions';
import { ASSET_HITBOX_CATALOG } from '../../domain/ObjectModule/Scenery/SceneryRegistry';

describe('VillageDetailAssets - Validação Unitária dos Novos Assets de Detalhe', () => {
    const expectedAssets = [
        { key: 'market_stall_blue', cleanKey: 'market_stall_blue_clean', dir: 'market', w: 86, h: 93 },
        { key: 'market_stall_purple', cleanKey: 'market_stall_purple_clean', dir: 'market', w: 86, h: 93 },
        { key: 'barrel_single', cleanKey: 'barrel_single_clean', dir: 'props', w: 28, h: 36 },
        { key: 'barrel_lying', cleanKey: 'barrel_lying_clean', dir: 'props', w: 34, h: 26 },
        { key: 'wooden_crate', cleanKey: 'wooden_crate_clean', dir: 'props', w: 38, h: 34 },
        { key: 'hay_bale', cleanKey: 'hay_bale_clean', dir: 'props', w: 44, h: 32 },
        { key: 'firewood_stack', cleanKey: 'firewood_stack_clean', dir: 'props', w: 44, h: 28 },
        { key: 'signpost_wooden', cleanKey: 'signpost_wooden_clean', dir: 'props', w: 42, h: 54 },
        { key: 'notice_board', cleanKey: 'notice_board_clean', dir: 'props', w: 48, h: 54 },
        { key: 'archery_target', cleanKey: 'archery_target_clean', dir: 'props', w: 38, h: 48 },
        { key: 'props_spear_rack', cleanKey: 'props_spear_rack_clean', dir: 'props', w: 48, h: 68 },
    ];

    it('todos os 11 arquivos de imagem devem existir em disco com cabeçalho PNG válido (\x89PNG)', () => {
        const rootDir = process.cwd();
        for (const item of expectedAssets) {
            const filePath = path.resolve(rootDir, `typescript/adapters/web/assets/scenery/${item.dir}/${item.cleanKey}.png`);
            expect(fs.existsSync(filePath), `Arquivo ${item.cleanKey}.png deve existir em ${filePath}`).toBe(true);
            const buffer = fs.readFileSync(filePath);
            expect(buffer.length).toBeGreaterThan(100);
            expect(buffer[0]).toBe(0x89);
            expect(buffer[1]).toBe(0x50); // P
            expect(buffer[2]).toBe(0x4e); // N
            expect(buffer[3]).toBe(0x47); // G
        }
    });

    it('todos os 11 assets devem estar registrados no VisualConfigMap com dimensões 1:1 exatas', () => {
        for (const item of expectedAssets) {
            const entry = (VisualConfigMap as Record<string, any>)[item.key];
            expect(entry, `Entrada '${item.key}' deve existir em VisualConfigMap`).toBeDefined();
            const anim = entry.animations?.['static'] || entry.animations?.['idle'];
            expect(anim).toBeDefined();
            expect(anim.frameWidth).toBe(item.w);
            expect(anim.frameHeight).toBe(item.h);
        }
    });

    it('todos os 11 assets devem estar registrados em KNOWN_ASSET_DIMENSIONS no Assets Editor', () => {
        for (const item of expectedAssets) {
            const dim = KNOWN_ASSET_DIMENSIONS[item.cleanKey];
            expect(dim, `Dimensão para '${item.cleanKey}' deve existir em KNOWN_ASSET_DIMENSIONS`).toBeDefined();
            expect(dim!.width).toBe(item.w);
            expect(dim!.height).toBe(item.h);
        }
    });

    it('todos os 11 assets devem possuir hitboxes canônicas em ASSET_HITBOX_CATALOG com coordenadas limitadas às dimensões base', () => {
        for (const item of expectedAssets) {
            const hitboxData = ASSET_HITBOX_CATALOG[item.key];
            expect(hitboxData, `Hitbox para '${item.key}' deve existir em ASSET_HITBOX_CATALOG`).toBeDefined();
            expect(hitboxData!.baseWidth).toBe(item.w);
            expect(hitboxData!.baseHeight).toBe(item.h);
            expect(hitboxData!.shapes.length).toBeGreaterThan(0);

            for (const shape of hitboxData!.shapes) {
                if (shape.type === 'circle' && shape.center) {
                    expect(shape.center.x).toBeGreaterThanOrEqual(0);
                    expect(shape.center.x).toBeLessThanOrEqual(item.w);
                    expect(shape.center.y).toBeGreaterThanOrEqual(0);
                    expect(shape.center.y).toBeLessThanOrEqual(item.h);
                    expect(shape.radius).toBeGreaterThan(0);
                } else if (shape.type === 'polygon' && shape.points) {
                    expect(shape.points.length).toBeGreaterThanOrEqual(3);
                    for (const pt of shape.points) {
                        expect(pt.x).toBeGreaterThanOrEqual(0);
                        expect(pt.x).toBeLessThanOrEqual(item.w);
                        expect(pt.y).toBeGreaterThanOrEqual(0);
                        expect(pt.y).toBeLessThanOrEqual(item.h);
                    }
                }
            }
        }
    });
});
