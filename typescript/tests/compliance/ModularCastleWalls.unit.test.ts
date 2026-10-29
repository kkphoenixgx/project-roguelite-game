import { describe, it, expect } from 'vitest';
import { VisualConfigMap, type EntityVisualConfig } from '../../adapters/web/shared/VisualConfigMap';
import fs from 'fs';
import path from 'path';

describe('Modular Castle Walls (Unit Tests)', () => {
    const fortificationsSceneryDir = path.resolve(__dirname, '../../adapters/web/assets/scenery/fortifications');
    const fortificationsSpritesDir = path.resolve(__dirname, '../../adapters/web/assets/sprites/scenery/fortifications');

    it('1. deve conter stone_wall_straight_long configurado com dimensões retas e 1x world scale', () => {
        const config = VisualConfigMap['stone_wall_straight_long'] as EntityVisualConfig | undefined;
        expect(config).toBeDefined();
        expect(config!.category).toBe('entity');

        const staticAnim = config!.animations?.['static'];
        expect(staticAnim).toBeDefined();
        expect(staticAnim?.frameHeight).toBe(208);
        expect(staticAnim?.frameWidth).toBe(396);
        expect(staticAnim?.spriteSize).toEqual({ width: 396, height: 208 });

        // Arquivo clean e anim existem no disco
        expect(fs.existsSync(path.join(fortificationsSceneryDir, 'stone_wall_straight_long_clean.png'))).toBe(true);
        expect(fs.existsSync(path.join(fortificationsSpritesDir, 'stone_wall_straight_long_anim.png'))).toBe(true);
    });

    it('2. deve conter stone_wall_straight_short como metade exata da largura do muro longo', () => {
        const config = VisualConfigMap['stone_wall_straight_short'] as EntityVisualConfig | undefined;
        expect(config).toBeDefined();
        expect(config!.category).toBe('entity');

        const staticAnim = config!.animations?.['static'];
        expect(staticAnim).toBeDefined();
        expect(staticAnim?.frameHeight).toBe(208);
        expect(staticAnim?.frameWidth).toBe(198);
        expect(staticAnim?.spriteSize).toEqual({ width: 198, height: 208 });

        expect(fs.existsSync(path.join(fortificationsSceneryDir, 'stone_wall_straight_short_clean.png'))).toBe(true);
    });

    it('3. deve conter stone_wall_straight_vertical estritamente a 90 graus', () => {
        const config = VisualConfigMap['stone_wall_straight_vertical'] as EntityVisualConfig | undefined;
        expect(config).toBeDefined();
        expect(config!.category).toBe('entity');

        const staticAnim = config!.animations?.['static'];
        expect(staticAnim).toBeDefined();
        expect(staticAnim?.frameWidth).toBe(128);
        expect(staticAnim?.frameHeight).toBe(208);
        expect(staticAnim?.spriteSize).toEqual({ width: 128, height: 208 });

        expect(fs.existsSync(path.join(fortificationsSceneryDir, 'stone_wall_straight_vertical_clean.png'))).toBe(true);
    });

    it('4. deve conter stone_wall_corner conectando eixos ortogonais a 90 graus', () => {
        const config = VisualConfigMap['stone_wall_corner'] as EntityVisualConfig | undefined;
        expect(config).toBeDefined();
        expect(config!.category).toBe('entity');

        const staticAnim = config!.animations?.['static'];
        expect(staticAnim).toBeDefined();
        expect(staticAnim?.frameWidth).toBe(316);
        expect(staticAnim?.frameHeight).toBe(250);
        expect(staticAnim?.spriteSize).toEqual({ width: 316, height: 250 });

        expect(fs.existsSync(path.join(fortificationsSceneryDir, 'stone_wall_corner_clean.png'))).toBe(true);
    });

    it('5. deve conter stone_wall_corner_ne como ponta Nordeste (Top-Right)', () => {
        const config = VisualConfigMap['stone_wall_corner_ne'] as EntityVisualConfig | undefined;
        expect(config).toBeDefined();
        const staticAnim = config!.animations?.['static'];
        expect(staticAnim?.frameWidth).toBe(316);
        expect(staticAnim?.frameHeight).toBe(250);
        expect(fs.existsSync(path.join(fortificationsSceneryDir, 'stone_wall_corner_ne_clean.png'))).toBe(true);
    });

    it('6. deve conter stone_wall_corner_sw como ponta Sudoeste (Bottom-Left)', () => {
        const config = VisualConfigMap['stone_wall_corner_sw'] as EntityVisualConfig | undefined;
        expect(config).toBeDefined();
        const staticAnim = config!.animations?.['static'];
        expect(staticAnim?.frameWidth).toBe(316);
        expect(staticAnim?.frameHeight).toBe(250);
        expect(fs.existsSync(path.join(fortificationsSceneryDir, 'stone_wall_corner_sw_clean.png'))).toBe(true);
    });

    it('7. deve conter stone_wall_corner_se como ponta Sudeste (Bottom-Right)', () => {
        const config = VisualConfigMap['stone_wall_corner_se'] as EntityVisualConfig | undefined;
        expect(config).toBeDefined();
        const staticAnim = config!.animations?.['static'];
        expect(staticAnim?.frameWidth).toBe(316);
        expect(staticAnim?.frameHeight).toBe(250);
        expect(fs.existsSync(path.join(fortificationsSceneryDir, 'stone_wall_corner_se_clean.png'))).toBe(true);
    });

    it('8. deve conter stone_wall_gate como portão modular embutível de 396px', () => {
        const config = VisualConfigMap['stone_wall_gate'] as EntityVisualConfig | undefined;
        expect(config).toBeDefined();
        const staticAnim = config!.animations?.['static'];
        expect(staticAnim?.frameWidth).toBe(396);
        expect(staticAnim?.frameHeight).toBe(250);
        expect(fs.existsSync(path.join(fortificationsSceneryDir, 'stone_wall_gate_clean.png'))).toBe(true);
    });
});
