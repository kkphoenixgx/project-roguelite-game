import { describe, it, expect } from 'vitest';
import { buildAssetHitboxes, getAssetBaseSize, ASSET_HITBOX_CATALOG } from '../../../../domain/ObjectModule/Scenery/SceneryRegistry';
import SceneryElement from '../../../../domain/ObjectModule/Scenery/SceneryElement';
import type { IEventManager } from '../../../../domain/eventDispacher/IGameEvents';

describe('Asset Hitboxes Scaling & Winding Order (QA Graybox)', () => {
    const mockEventManager: IEventManager = {
        dispatch: () => {},
        on: () => {},
        off: () => {}
    };

    it('1. deve carregar todos os 24 presets no catálogo canônico ASSET_HITBOX_CATALOG', () => {
        const keys = Object.keys(ASSET_HITBOX_CATALOG);
        expect(keys.length).toBeGreaterThanOrEqual(24);
        expect(keys).toContain('house_red_boro');
        expect(keys).toContain('stone_well');
        expect(keys).toContain('tree_oak');
        expect(keys).toContain('fountain_awakening');
    });

    it('2. Escala Padrão (1.0x): deve gerar hitboxes com coordenadas base exatas', () => {
        const baseSize = getAssetBaseSize('stone_well');
        expect(baseSize).toEqual({ width: 60, height: 66 });

        const hitboxes = buildAssetHitboxes('stone_well', { x: 100, y: 200 });
        expect(hitboxes.length).toBe(1);

        const circleShape = hitboxes[0]!.getDebugShape();
        expect(circleShape.type).toBe('circle');
        if (circleShape.type === 'circle') {
            // center base: { x: 30, y: 40 }, world coords: { x: 100, y: 200 } => { x: 130, y: 240 }
            expect(circleShape.coordinates.x).toBe(130);
            expect(circleShape.coordinates.y).toBe(240);
            expect(circleShape.radius).toBe(24);
        }
    });

    it('3. Escala Proporcional (2.0x e 0.5x): deve escalar vértices e raio sem desvio de pivô', () => {
        // Testando 2.0x no stone_well (base 60x66 -> 120x132)
        const hitboxes2x = buildAssetHitboxes('stone_well', { x: 0, y: 0 }, { width: 120, height: 132 });
        const shape2x = hitboxes2x[0]!.getDebugShape();
        if (shape2x.type === 'circle') {
            expect(shape2x.coordinates.x).toBe(60); // 30 * 2
            expect(shape2x.coordinates.y).toBe(80); // 40 * 2
            expect(shape2x.radius).toBe(48);        // 24 * 2
        }

        // Testando 0.5x no stone_well (base 60x66 -> 30x33)
        const hitboxesHalf = buildAssetHitboxes('stone_well', { x: 0, y: 0 }, { width: 30, height: 33 });
        const shapeHalf = hitboxesHalf[0]!.getDebugShape();
        if (shapeHalf.type === 'circle') {
            expect(shapeHalf.coordinates.x).toBe(15); // 30 * 0.5
            expect(shapeHalf.coordinates.y).toBe(20); // 40 * 0.5
            expect(shapeHalf.radius).toBe(12);        // 24 * 0.5
        }
    });

    it('4. Espelhamento Horizontal (flipX: true): deve refletir coordenadas X e inverter Winding Order (.reverse())', () => {
        // house tem base 96x96 com pontos: (0,0), (96,0), (96,96), (0,96)
        const normalHitboxes = buildAssetHitboxes('house', { x: 100, y: 100 });
        const normalShape = normalHitboxes[0]!.getDebugShape();

        const flippedHitboxes = buildAssetHitboxes('house', { x: 100, y: 100 }, undefined, true);
        const flippedShape = flippedHitboxes[0]!.getDebugShape();

        if (normalShape.type === 'polygon' && flippedShape.type === 'polygon' && normalShape.points && flippedShape.points) {
            const normalPoints = normalShape.points;
            const flippedPoints = flippedShape.points;

            expect(normalPoints.length).toBe(flippedPoints.length);

            // No flipX, o último ponto refletido torna-se o primeiro (graças ao .reverse() que preserva o Winding Order)
            // Ponto original 0: (0, 0) -> refletido: (96, 0)
            // Ponto original 1: (96, 0) -> refletido: (0, 0)
            // Ponto original 2: (96, 96) -> refletido: (0, 96)
            // Ponto original 3: (0, 96) -> refletido: (96, 96)
            // Com .reverse(), a lista vira: [ (96, 96), (0, 96), (0, 0), (96, 0) ]
            expect(flippedPoints[0]!.x).toBe(100 + 96);
            expect(flippedPoints[0]!.y).toBe(100 + 96);

            expect(flippedPoints[2]!.x).toBe(100 + 0);
            expect(flippedPoints[2]!.y).toBe(100 + 0);
        }
    });

    it('5. Círculos em Escala Assimétrica: deve aplicar Math.min(scaleX, scaleY) conservador', () => {
        // stone_well: base 60x66. Forçando escala assimétrica: width = 120 (2x), height = 66 (1x)
        const hitboxes = buildAssetHitboxes('stone_well', { x: 0, y: 0 }, { width: 120, height: 66 });
        const shape = hitboxes[0]!.getDebugShape();
        if (shape.type === 'circle') {
            // scaleX = 2.0, scaleY = 1.0 => min scale = 1.0 => radius = 24
            expect(shape.radius).toBe(24);
            expect(shape.coordinates.x).toBe(60); // 30 * 2.0
            expect(shape.coordinates.y).toBe(40); // 40 * 1.0
        }
    });

    it('6. SceneryElement.createSpawn: deve instanciar hitboxes escaladas e espelhadas em Zero-GC', () => {
        const payload = {
            coordinates: { x: 500, y: 600 },
            metadata: {
                preset: 'stone_well',
                scale: 1.5,
                flipX: true
            }
        };

        const element = SceneryElement.createSpawn(101, payload as any, mockEventManager);
        expect(element.size.width).toBe(90);  // 60 * 1.5
        expect(element.size.height).toBe(99); // 66 * 1.5

        expect(element.hitboxes).toBeDefined();
        expect(element.hitboxes!.length).toBe(1);

        const debugShape = element.hitboxes![0]!.getDebugShape();
        if (debugShape.type === 'circle') {
            // base cx = 30 -> 30 * 1.5 = 45 -> flipX: targetWidth(90) - 45 = 45 -> worldX = 500 + 45 = 545
            expect(debugShape.coordinates.x).toBe(545);
            // base cy = 40 -> 40 * 1.5 = 60 -> worldY = 600 + 60 = 660
            expect(debugShape.coordinates.y).toBe(660);
            expect(debugShape.radius).toBe(36); // 24 * 1.5
        }
    });
});
