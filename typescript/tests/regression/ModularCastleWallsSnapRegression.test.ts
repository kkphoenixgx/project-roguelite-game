import { describe, it, expect } from 'vitest';
import path from 'path';
import { loadImage, createCanvas } from '@napi-rs/canvas';

describe('Modular Castle Walls Snap Regression Suite', () => {
    const fortificationsDir = path.resolve(__dirname, '../../adapters/web/assets/scenery/fortifications');

    it('1. costura horizontal entre stone_wall_corner e stone_wall_straight_long não deve ter descontinuidade de corbel ou merlon', async () => {
        const cornerImg = await loadImage(path.join(fortificationsDir, 'stone_wall_corner_clean.png'));
        const longImg = await loadImage(path.join(fortificationsDir, 'stone_wall_straight_long_clean.png'));

        const canvas = createCanvas(316 + 396, 250);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cornerImg, 0, 0);
        ctx.drawImage(longImg, 316, 42);

        // Amostra a costura em x = 315 e x = 316
        // Na altura do corbel (y = 118..124) e do walkway (y = 80..86), ambos devem ser opacos e com cores muito próximas
        const seamLeft = ctx.getImageData(315, 80, 1, 1).data;
        const seamRight = ctx.getImageData(316, 80, 1, 1).data;

        expect(seamLeft[3]).toBeGreaterThan(200);
        expect(seamRight[3]).toBeGreaterThan(200);
        const diff = Math.abs((seamLeft[0] ?? 0) - (seamRight[0] ?? 0)) +
                     Math.abs((seamLeft[1] ?? 0) - (seamRight[1] ?? 0)) +
                     Math.abs((seamLeft[2] ?? 0) - (seamRight[2] ?? 0));
        expect(diff).toBeLessThan(40);
    });

    it('2. costura vertical entre stone_wall_corner e stone_wall_straight_vertical não deve ter salto ou gap', async () => {
        const cornerImg = await loadImage(path.join(fortificationsDir, 'stone_wall_corner_clean.png'));
        const vertImg = await loadImage(path.join(fortificationsDir, 'stone_wall_straight_vertical_clean.png'));

        const canvas = createCanvas(316, 250 + 208);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cornerImg, 0, 0);
        ctx.drawImage(vertImg, 0, 250);

        // Amostra na passarela de madeira do braço vertical em x = 70 (y = 249 e y = 250)
        const cornerBottom = ctx.getImageData(70, 249, 1, 1).data;
        const vertTop = ctx.getImageData(70, 250, 1, 1).data;

        expect(cornerBottom[3]).toBeGreaterThan(200);
        expect(vertTop[3]).toBeGreaterThan(200);
        const diff = Math.abs((cornerBottom[0] ?? 0) - (vertTop[0] ?? 0)) +
                     Math.abs((cornerBottom[1] ?? 0) - (vertTop[1] ?? 0)) +
                     Math.abs((cornerBottom[2] ?? 0) - (vertTop[2] ?? 0));
        expect(diff).toBeLessThan(35);
    });
});
