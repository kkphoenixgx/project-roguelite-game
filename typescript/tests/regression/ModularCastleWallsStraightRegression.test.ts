import { describe, it, expect } from 'vitest';
import { VisualConfigMap, type EntityVisualConfig } from '../../adapters/web/shared/VisualConfigMap';

describe('ModularCastleWallsStraightRegression - Blindagem contra Muros Diagonais', () => {
    it('1. não deve permitir que muros voltem a ter proporções isométricas diagonais desiguais', () => {
        const longWall = VisualConfigMap['stone_wall_straight_long'] as EntityVisualConfig;
        const shortWall = VisualConfigMap['stone_wall_straight_short'] as EntityVisualConfig;
        const verticalWall = VisualConfigMap['stone_wall_straight_vertical'] as EntityVisualConfig;
        const cornerWall = VisualConfigMap['stone_wall_corner'] as EntityVisualConfig;

        // Altura dos muros horizontais deve ser constante (208px alinhado com o passadiço do gatehouse)
        expect(longWall.animations!['static']!.frameHeight).toBe(208);
        expect(shortWall.animations!['static']!.frameHeight).toBe(208);

        // A proporção horizontal deve ser modular (largura longa = 2x largura curta)
        const longWidth = longWall.animations!['static']!.frameWidth;
        const shortWidth = shortWall.animations!['static']!.frameWidth;
        expect(longWidth).toBe(shortWidth * 2);

        // O muro vertical não deve ser um quadrado e deve ter altura vertical expressiva
        expect(verticalWall.animations!['static']!.frameHeight).toBeGreaterThan(verticalWall.animations!['static']!.frameWidth);

        // O corner deve ter largura e altura adequadas para encaixar os dois eixos
        expect(cornerWall.animations!['static']!.frameWidth).toBeGreaterThanOrEqual(200);
        expect(cornerWall.animations!['static']!.frameHeight).toBeGreaterThanOrEqual(200);
    });

    it('2. deve garantir que todas as URLs dos muros geram links de asset válidos', () => {
        const wallKeys = [
            'stone_wall_straight_long',
            'stone_wall_straight_short',
            'stone_wall_straight_vertical',
            'stone_wall_corner'
        ];

        for (const key of wallKeys) {
            const entry = VisualConfigMap[key] as EntityVisualConfig;
            expect(entry, `Entrada ${key} deve existir no VisualConfigMap`).toBeDefined();
            const staticAnim = entry?.animations?.['static'];
            expect(staticAnim?.imageSrc, `imageSrc de ${key} deve ser string`).toBeTypeOf('string');
            expect(staticAnim?.imageSrc.length).toBeGreaterThan(0);
        }
    });
});
