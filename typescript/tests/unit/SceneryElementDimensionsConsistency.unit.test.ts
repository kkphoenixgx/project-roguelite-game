import { describe, it, expect, vi } from 'vitest';
import SceneryElement from '../../domain/ObjectModule/Scenery/SceneryElement';
import { getAssetBaseSize, ASSET_HITBOX_CATALOG } from '../../domain/ObjectModule/Scenery/SceneryRegistry';
import type { IEventManager } from '../../domain/eventDispacher/IGameEvents';

describe('SceneryElementDimensionsConsistency (Unit Test)', () => {
    const mockEventManager: IEventManager = {
        dispatch: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
    };

    it('deve garantir que todos os presets de fortificações e pontes possuem dimensões canônicas reais e não 64x64', () => {
        const criticalPresets: Record<string, { width: number; height: number }> = {
            'stone_wall_straight_long': { width: 396, height: 208 },
            'stone_wall_straight_short': { width: 198, height: 208 },
            'stone_wall_corner': { width: 316, height: 250 },
            'stone_wall_corner_ne': { width: 316, height: 250 },
            'stone_wall_corner_sw': { width: 316, height: 250 },
            'stone_wall_corner_se': { width: 316, height: 250 },
            'stone_wall_gate': { width: 396, height: 250 },
            'stone_wall_straight_vertical': { width: 128, height: 208 },
            'stone_wall_straight_vertical_east': { width: 128, height: 208 },
            'bridge_wood_planks': { width: 168, height: 234 }
        };

        for (const [preset, expectedSize] of Object.entries(criticalPresets)) {
            const baseSize = getAssetBaseSize(preset);
            expect(baseSize.width, `baseWidth incorreto para ${preset}`).toBe(expectedSize.width);
            expect(baseSize.height, `baseHeight incorreto para ${preset}`).toBe(expectedSize.height);
            expect(baseSize.width, `Não deve cair no fallback padrão 64x64 para ${preset}`).not.toBe(64);
        }
    });

    it('deve instanciar SceneryElement via createSpawn com as dimensões 1:1 exatas do preset quando size for omitido', () => {
        const sceneryGate = SceneryElement.createSpawn(1, {
            type: 'scenery',
            coordinates: { x: 500, y: 600 },
            metadata: { preset: 'stone_wall_gate' }
        }, mockEventManager);

        expect(sceneryGate.size.width).toBe(396);
        expect(sceneryGate.size.height).toBe(250);
        expect(sceneryGate.presetType).toBe('stone_wall_gate');
        expect(sceneryGate.hitboxes?.length).toBeGreaterThan(0);

        const sceneryBridge = SceneryElement.createSpawn(2, {
            type: 'scenery',
            coordinates: { x: 100, y: 200 },
            metadata: { preset: 'bridge_wood_planks' }
        }, mockEventManager);

        expect(sceneryBridge.size.width).toBe(168);
        expect(sceneryBridge.size.height).toBe(234);
    });

    it('deve respeitar targetSize customizado quando fornecido explicitamente no payload de spawn', () => {
        const customSize = { width: 450, height: 300 };
        const sceneryCustom = SceneryElement.createSpawn(3, {
            type: 'scenery',
            coordinates: { x: 0, y: 0 },
            size: customSize,
            metadata: { preset: 'stone_wall_corner' }
        }, mockEventManager);

        expect(sceneryCustom.size.width).toBe(450);
        expect(sceneryCustom.size.height).toBe(300);

        // As hitboxes devem estar contidas no targetSize customizado
        if (sceneryCustom.hitboxes) {
            for (const hb of sceneryCustom.hitboxes) {
                const points = (hb as any).points;
                if (points) {
                    for (const pt of points) {
                        expect(pt.x).toBeGreaterThanOrEqual(0);
                        expect(pt.x).toBeLessThanOrEqual(455);
                        expect(pt.y).toBeGreaterThanOrEqual(0);
                        expect(pt.y).toBeLessThanOrEqual(305);
                    }
                }
            }
        }
    });

    it('deve aplicar escala multiplicativa via metadata.scale se targetSize não for informado', () => {
        const scale = 1.5;
        const sceneryScaled = SceneryElement.createSpawn(4, {
            type: 'scenery',
            coordinates: { x: 20, y: 40 },
            metadata: { preset: 'stone_wall_straight_short', scale }
        }, mockEventManager);

        expect(sceneryScaled.size.width).toBe(Math.round(198 * scale));
        expect(sceneryScaled.size.height).toBe(Math.round(208 * scale));
    });

    it('deve validar que nenhum preset registrado no catálogo possui dimensões nulas ou inválidas', () => {
        for (const [key, data] of Object.entries(ASSET_HITBOX_CATALOG)) {
            expect(data.baseWidth, `${key} deve ter baseWidth > 0`).toBeGreaterThan(0);
            expect(data.baseHeight, `${key} deve ter baseHeight > 0`).toBeGreaterThan(0);
            expect(Array.isArray(data.shapes), `${key} deve possuir array de shapes definida`).toBe(true);
            // Elementos de cenário sólido (não estradas/pisos transitáveis) devem ter ao menos 1 shape de colisão
            if (!key.startsWith('road') && !key.startsWith('dirt_') && !key.startsWith('floor')) {
                expect(data.shapes.length, `${key} deve ter ao menos 1 shape`).toBeGreaterThan(0);
            }
        }
    });
});
