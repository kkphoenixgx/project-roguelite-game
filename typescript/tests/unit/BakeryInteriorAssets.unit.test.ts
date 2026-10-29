import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import { KNOWN_ASSET_DIMENSIONS } from '../../adapters/assets-adapter/Components/AssetDimensions';
import { ASSET_HITBOX_CATALOG } from '../../domain/ObjectModule/Scenery/SceneryRegistry';

describe('BakeryInteriorAssets - Validação Unitária dos Assets da Padaria', () => {
    const expectedBakeryAssets = [
        { key: 'bakery_brick_oven', cleanKey: 'bakery_brick_oven_clean', w: 84, h: 92 },
        { key: 'bakery_prep_table_flour', cleanKey: 'bakery_prep_table_flour_clean', w: 68, h: 46 },
        { key: 'bakery_bread_shelf', cleanKey: 'bakery_bread_shelf_clean', w: 54, h: 68 },
        { key: 'bakery_bread_basket', cleanKey: 'bakery_bread_basket_clean', w: 36, h: 32 },
        { key: 'bakery_flour_sack', cleanKey: 'bakery_flour_sack_clean', w: 30, h: 36 },
        { key: 'bakery_flour_sack_stack', cleanKey: 'bakery_flour_sack_stack_clean', w: 48, h: 40 },
        { key: 'bakery_peel_rack', cleanKey: 'bakery_peel_rack_clean', w: 26, h: 64 },
        { key: 'bakery_counter', cleanKey: 'bakery_counter_clean', w: 64, h: 44 },
    ];

    it('todos os 8 arquivos de imagem de interiores da padaria devem existir em disco com cabeçalho PNG válido', () => {
        const rootDir = process.cwd();
        for (const item of expectedBakeryAssets) {
            const filePath = path.resolve(rootDir, `typescript/adapters/web/assets/scenery/props/${item.cleanKey}.png`);
            expect(fs.existsSync(filePath), `Arquivo ${item.cleanKey}.png deve existir em ${filePath}`).toBe(true);
            const buffer = fs.readFileSync(filePath);
            expect(buffer.length).toBeGreaterThan(100);
            expect(buffer[0]).toBe(0x89);
            expect(buffer[1]).toBe(0x50); // P
            expect(buffer[2]).toBe(0x4e); // N
            expect(buffer[3]).toBe(0x47); // G
        }
    });

    it('todos os 8 assets devem estar registrados no VisualConfigMap com dimensões 1:1 exatas', () => {
        for (const item of expectedBakeryAssets) {
            const entry = (VisualConfigMap as Record<string, any>)[item.key];
            expect(entry, `Entrada '${item.key}' deve existir em VisualConfigMap`).toBeDefined();
            const anim = entry.animations?.['static'] || entry.animations?.['idle'];
            expect(anim).toBeDefined();
            expect(anim.frameWidth).toBe(item.w);
            expect(anim.frameHeight).toBe(item.h);
        }
    });

    it('todos os 8 assets devem estar registrados em KNOWN_ASSET_DIMENSIONS no Assets Editor', () => {
        for (const item of expectedBakeryAssets) {
            const dim = KNOWN_ASSET_DIMENSIONS[item.cleanKey];
            expect(dim, `Dimensão para '${item.cleanKey}' deve existir em KNOWN_ASSET_DIMENSIONS`).toBeDefined();
            expect(dim!.width).toBe(item.w);
            expect(dim!.height).toBe(item.h);
        }
    });

    it('todos os 8 assets devem possuir hitboxes canônicas em ASSET_HITBOX_CATALOG com coordenadas limitadas às dimensões base', () => {
        for (const item of expectedBakeryAssets) {
            const hitboxData = ASSET_HITBOX_CATALOG[item.key];
            expect(hitboxData, `Hitbox para '${item.key}' deve existir em ASSET_HITBOX_CATALOG`).toBeDefined();
            expect(hitboxData!.baseWidth).toBe(item.w);
            expect(hitboxData!.baseHeight).toBe(item.h);
            expect(hitboxData!.shapes.length).toBeGreaterThan(0);

            for (const shape of hitboxData!.shapes) {
                if (shape.type === 'circle') {
                    expect(shape.center!.x).toBeGreaterThanOrEqual(0);
                    expect(shape.center!.x).toBeLessThanOrEqual(item.w);
                    expect(shape.center!.y).toBeGreaterThanOrEqual(0);
                    expect(shape.center!.y).toBeLessThanOrEqual(item.h);
                    expect(shape.radius).toBeGreaterThan(0);
                } else if (shape.type === 'polygon') {
                    expect(shape.points!.length).toBeGreaterThanOrEqual(3);
                    for (const pt of shape.points!) {
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
