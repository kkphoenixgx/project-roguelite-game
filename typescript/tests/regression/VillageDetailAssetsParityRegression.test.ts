import { describe, it, expect } from 'vitest';
import { getAssetBaseSize, SCENERY_PRESETS } from '../../domain/ObjectModule/Scenery/SceneryRegistry';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import { KNOWN_ASSET_DIMENSIONS } from '../../adapters/assets-adapter/Components/AssetDimensions';

describe('VillageDetailAssetsParityRegression (Regression)', () => {
    const villageProps = [
        { id: 'barrel_single', cleanKey: 'barrel_single_clean', w: 28, h: 36 },
        { id: 'barrel_lying', cleanKey: 'barrel_lying_clean', w: 34, h: 26 },
        { id: 'wooden_crate', cleanKey: 'wooden_crate_clean', w: 38, h: 34 },
        { id: 'hay_bale', cleanKey: 'hay_bale_clean', w: 44, h: 32 },
        { id: 'firewood_stack', cleanKey: 'firewood_stack_clean', w: 44, h: 28 },
        { id: 'signpost_wooden', cleanKey: 'signpost_wooden_clean', w: 42, h: 54 },
        { id: 'notice_board', cleanKey: 'notice_board_clean', w: 48, h: 54 },
        { id: 'archery_target', cleanKey: 'archery_target_clean', w: 38, h: 48 },
        { id: 'props_spear_rack', cleanKey: 'props_spear_rack_clean', w: 48, h: 68 },
        { id: 'market_stall_blue', cleanKey: 'market_stall_blue_clean', w: 86, h: 93 },
        { id: 'market_stall_purple', cleanKey: 'market_stall_purple_clean', w: 86, h: 93 },
    ];

    it('deve blindar os 11 novos assets de detalhe contra regressão dimensional no domínio e editor', () => {
        for (const item of villageProps) {
            // Valida dimensões retornadas por getAssetBaseSize no Domínio
            const domainSize = getAssetBaseSize(item.id);
            expect(domainSize.width, `${item.id} largura no Domínio`).toBe(item.w);
            expect(domainSize.height, `${item.id} altura no Domínio`).toBe(item.h);

            // Valida dimensões em SCENERY_PRESETS
            const preset = SCENERY_PRESETS[item.id];
            expect(preset, `Preset '${item.id}'`).toBeDefined();
            expect(preset!.width).toBe(item.w);
            expect(preset!.height).toBe(item.h);

            // Valida dimensões em KNOWN_ASSET_DIMENSIONS (Editor de Cenário)
            const editorDim = KNOWN_ASSET_DIMENSIONS[item.cleanKey];
            expect(editorDim, `Dimensão do editor '${item.cleanKey}'`).toBeDefined();
            expect(editorDim!.width).toBe(item.w);
            expect(editorDim!.height).toBe(item.h);

            // Valida dimensões no VisualConfigMap (Renderização Web)
            const visual = (VisualConfigMap as Record<string, any>)[item.id];
            expect(visual, `Visual '${item.id}'`).toBeDefined();
            const anim = visual.animations?.['static'] || visual.animations?.['idle'];
            expect(anim.frameWidth).toBe(item.w);
            expect(anim.frameHeight).toBe(item.h);
        }
    });

    it('deve instanciar hitboxes válidas e não-nulas via hitboxBuilder em coordenadas espaciais', () => {
        for (const item of villageProps) {
            const preset = SCENERY_PRESETS[item.id];
            expect(preset).toBeDefined();

            const hitboxes = preset!.hitboxBuilder({ x: 100, y: 200 });
            expect(hitboxes.length).toBeGreaterThan(0);

            for (const hb of hitboxes) {
                expect(hb).toBeDefined();
                // O método getDebugShape ou coordenadas relativas devem estar instanciados
                expect(typeof (hb as any).getDebugShape).toBe('function');
            }
        }
    });
});
