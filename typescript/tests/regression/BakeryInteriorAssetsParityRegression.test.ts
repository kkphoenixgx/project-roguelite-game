import { describe, it, expect } from 'vitest';
import { getAssetBaseSize, SCENERY_PRESETS } from '../../domain/ObjectModule/Scenery/SceneryRegistry';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import { KNOWN_ASSET_DIMENSIONS } from '../../adapters/assets-adapter/Components/AssetDimensions';

describe('BakeryInteriorAssetsParityRegression (Regression)', () => {
    const bakeryProps = [
        { id: 'bakery_brick_oven', cleanKey: 'bakery_brick_oven_clean', w: 84, h: 92 },
        { id: 'bakery_prep_table_flour', cleanKey: 'bakery_prep_table_flour_clean', w: 68, h: 46 },
        { id: 'bakery_bread_shelf', cleanKey: 'bakery_bread_shelf_clean', w: 54, h: 68 },
        { id: 'bakery_bread_basket', cleanKey: 'bakery_bread_basket_clean', w: 36, h: 32 },
        { id: 'bakery_flour_sack', cleanKey: 'bakery_flour_sack_clean', w: 30, h: 36 },
        { id: 'bakery_flour_sack_stack', cleanKey: 'bakery_flour_sack_stack_clean', w: 48, h: 40 },
        { id: 'bakery_peel_rack', cleanKey: 'bakery_peel_rack_clean', w: 26, h: 64 },
        { id: 'bakery_counter', cleanKey: 'bakery_counter_clean', w: 64, h: 44 },
    ];

    it('deve blindar os 8 novos assets de interiores da padaria contra regressão dimensional no domínio e editor', () => {
        for (const item of bakeryProps) {
            // 1. Domínio (getAssetBaseSize)
            const domainSize = getAssetBaseSize(item.id);
            expect(domainSize.width, `${item.id} largura no Domínio`).toBe(item.w);
            expect(domainSize.height, `${item.id} altura no Domínio`).toBe(item.h);

            // 2. SCENERY_PRESETS
            const preset = SCENERY_PRESETS[item.id];
            expect(preset, `Preset '${item.id}'`).toBeDefined();
            expect(preset!.width).toBe(item.w);
            expect(preset!.height).toBe(item.h);

            // 3. KNOWN_ASSET_DIMENSIONS (Editor de Cenário)
            const editorDim = KNOWN_ASSET_DIMENSIONS[item.cleanKey];
            expect(editorDim, `Dimensão do editor '${item.cleanKey}'`).toBeDefined();
            expect(editorDim!.width).toBe(item.w);
            expect(editorDim!.height).toBe(item.h);

            // 4. VisualConfigMap (Apresentação Web)
            const visual = (VisualConfigMap as Record<string, any>)[item.id];
            expect(visual, `Visual '${item.id}'`).toBeDefined();
            const anim = visual.animations?.['static'] || visual.animations?.['idle'];
            expect(anim.frameWidth).toBe(item.w);
            expect(anim.frameHeight).toBe(item.h);
        }
    });

    it('deve instanciar hitboxes válidas e não-nulas via hitboxBuilder em coordenadas espaciais', () => {
        for (const item of bakeryProps) {
            const preset = SCENERY_PRESETS[item.id];
            expect(preset).toBeDefined();

            const hitboxes = preset!.hitboxBuilder({ x: 250, y: 350 });
            expect(hitboxes.length).toBeGreaterThan(0);

            for (const hb of hitboxes) {
                expect(hb).toBeDefined();
                expect(typeof (hb as any).getDebugShape).toBe('function');
            }
        }
    });
});
