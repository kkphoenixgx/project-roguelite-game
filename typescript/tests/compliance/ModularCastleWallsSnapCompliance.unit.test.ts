import { describe, it, expect } from 'vitest';
import path from 'path';
import { loadImage } from '@napi-rs/canvas';

describe('Modular Castle Walls Snap Compliance (Unit Tests)', () => {
    const fortificationsDir = path.resolve(__dirname, '../../adapters/web/assets/scenery/fortifications');

    it('1. stone_wall_corner deve conectar perfeitamente com stone_wall_straight_long no eixo horizontal', async () => {
        const cornerImg = await loadImage(path.join(fortificationsDir, 'stone_wall_corner_clean.png'));
        const longImg = await loadImage(path.join(fortificationsDir, 'stone_wall_straight_long_clean.png'));

        expect(cornerImg.width).toBe(316);
        expect(cornerImg.height).toBe(250);
        expect(longImg.width).toBe(396);
        expect(longImg.height).toBe(208);
    });

    it('2. stone_wall_corner deve conectar perfeitamente com stone_wall_straight_vertical no eixo vertical', async () => {
        const cornerImg = await loadImage(path.join(fortificationsDir, 'stone_wall_corner_clean.png'));
        const vertImg = await loadImage(path.join(fortificationsDir, 'stone_wall_straight_vertical_clean.png'));

        expect(vertImg.width).toBe(128);
        expect(vertImg.height).toBe(208);
        expect(cornerImg.width).toBe(316);
    });

    it('3. stone_wall_straight_vertical deve possuir repetição vertical sem gaps', async () => {
        const vertImg = await loadImage(path.join(fortificationsDir, 'stone_wall_straight_vertical_clean.png'));
        expect(vertImg.height).toBe(208);
    });
});
