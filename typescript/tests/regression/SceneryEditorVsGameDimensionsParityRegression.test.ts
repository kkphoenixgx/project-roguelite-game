import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getAssetBaseSize, SCENERY_PRESETS, ASSET_HITBOX_CATALOG } from '../../domain/ObjectModule/Scenery/SceneryRegistry';
import { KNOWN_ASSET_DIMENSIONS } from '../../adapters/assets-adapter/Components/AssetDimensions';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import { AssetScanner } from '../../adapters/assets-adapter/Components/AssetScanner';

describe('SceneryEditorVsGameDimensionsParityRegression (Regression)', () => {
    it('deve garantir que todos os presets de cenário de VilgemWorld possuem correspondência exata em ASSET_HITBOX_CATALOG', () => {
        const vilgemWorldPath = path.resolve(process.cwd(), 'typescript/domain/ObjectModule/Maps/VilgemWorld.ts');
        const content = fs.readFileSync(vilgemWorldPath, 'utf-8');

        const regex = /preset:\s*'([^']+)'/g;
        let match;
        const vilgemPresets = new Set<string>();
        while ((match = regex.exec(content)) !== null) {
            if (match[1]) {
                vilgemPresets.add(match[1]);
            }
        }

        expect(vilgemPresets.size).toBeGreaterThan(0);

        for (const preset of vilgemPresets) {
            const baseSize = getAssetBaseSize(preset);
            // Nenhum preset ativo do mapa de Vilgem deve cair no fallback descalibrado de 64x64
            // (a não ser que a dimensão canônica do próprio asset seja 64x64, o que é verificado no catálogo)
            expect(ASSET_HITBOX_CATALOG[preset], `Preset '${preset}' do VilgemWorld DEVE estar cadastrado em ASSET_HITBOX_CATALOG`).toBeDefined();
            expect(baseSize.width).toBe(ASSET_HITBOX_CATALOG[preset]!.baseWidth);
            expect(baseSize.height).toBe(ASSET_HITBOX_CATALOG[preset]!.baseHeight);
            expect(baseSize.width).toBeGreaterThan(0);
            expect(baseSize.height).toBeGreaterThan(0);
        }
    });

    it('deve garantir paridade dimensional 1:1 estrita entre VisualConfigMap e ASSET_HITBOX_CATALOG para todo elemento de cenário', () => {
        for (const [key, visualEntry] of Object.entries(VisualConfigMap as Record<string, any>)) {
            const anim = visualEntry.animations?.['static'] || visualEntry.animations?.['idle'];
            if (!anim) continue;

            const hitboxEntry = ASSET_HITBOX_CATALOG[key];
            if (hitboxEntry) {
                const visualWidth = anim.frameWidth;
                const visualHeight = anim.frameHeight;
                expect(hitboxEntry.baseWidth, `Divergência de largura no asset '${key}' entre VisualConfigMap (${visualWidth}) e ASSET_HITBOX_CATALOG (${hitboxEntry.baseWidth})`).toBe(visualWidth);
                expect(hitboxEntry.baseHeight, `Divergência de altura no asset '${key}' entre VisualConfigMap (${visualHeight}) e ASSET_HITBOX_CATALOG (${hitboxEntry.baseHeight})`).toBe(visualHeight);
            }
        }
    });

    it('deve garantir paridade 1:1 entre dimensões do AssetScanner (Assets Editor) e do Domínio (SceneryElement/getAssetBaseSize)', () => {
        const scanner = new AssetScanner();
        const scannedAssets = scanner.getAssets();

        for (const asset of scannedAssets) {
            const basePresetKey = asset.id.replace(/_clean$|_anim$/, '');
            const domainPreset = SCENERY_PRESETS[asset.id] || SCENERY_PRESETS[basePresetKey];

            if (domainPreset) {
                // Dimensão resolvida no Assets Editor
                const editorW = Math.round(asset.width);
                const editorH = Math.round(asset.height);

                // Dimensão canônica no Domínio do Jogo
                const domainSize = getAssetBaseSize(domainPreset.type);

                expect(editorW, `Paridade violada para ${asset.id}: Editor (${editorW}) != Domínio (${domainSize.width})`).toBe(domainSize.width);
                expect(editorH, `Paridade violada para ${asset.id}: Editor (${editorH}) != Domínio (${domainSize.height})`).toBe(domainSize.height);
            }
        }
    });

    it('deve blindar as dimensões das fortificações corrigidas contra regressão de encolhimento ou distorção', () => {
        const criticalAssets = [
            { id: 'stone_wall_straight_long', w: 396, h: 208 },
            { id: 'stone_wall_straight_short', w: 198, h: 208 },
            { id: 'stone_wall_corner', w: 316, h: 250 },
            { id: 'stone_wall_gate', w: 396, h: 250 },
            { id: 'stone_wall_straight_vertical', w: 128, h: 208 },
            { id: 'stone_wall_straight_vertical_east', w: 128, h: 208 },
            { id: 'bridge_wood_planks', w: 168, h: 234 }
        ];

        for (const item of criticalAssets) {
            const size = getAssetBaseSize(item.id);
            expect(size.width, `${item.id} não pode sofrer regressão de largura`).toBe(item.w);
            expect(size.height, `${item.id} não pode sofrer regressão de altura`).toBe(item.h);

            // Verifica também no catálogo conhecido do Assets Editor
            const cleanKey = `${item.id}_clean`;
            if (KNOWN_ASSET_DIMENSIONS[cleanKey]) {
                expect(KNOWN_ASSET_DIMENSIONS[cleanKey].width).toBe(item.w);
                expect(KNOWN_ASSET_DIMENSIONS[cleanKey].height).toBe(item.h);
            }
        }
    });
});
