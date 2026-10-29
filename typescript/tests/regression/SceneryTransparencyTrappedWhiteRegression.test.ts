import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadImage, createCanvas } from '@napi-rs/canvas';

describe('SceneryTransparencyTrappedWhiteRegression - Blindagem contra Fundos Brancos Presos', () => {
    const sceneryHousesDir = path.resolve(__dirname, '../../adapters/web/assets/scenery/houses');
    const spriteHousesDir = path.resolve(__dirname, '../../adapters/web/assets/sprites/scenery/houses');

    it('1. nenhuma casa estática deve conter bolsões ou resíduos de fundo branco opaco', async () => {
        const files = fs.readdirSync(sceneryHousesDir).filter(f => f.endsWith('.png'));
        expect(files.length).toBeGreaterThan(0);

        for (const file of files) {
            const filePath = path.join(sceneryHousesDir, file);
            const img = await loadImage(filePath);
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, img.width, img.height).data;

            let whiteCount = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i]!;
                const g = data[i + 1]!;
                const b = data[i + 2]!;
                const a = data[i + 3]!;

                if (a === 255 && r >= 230 && g >= 230 && b >= 230) {
                    whiteCount++;
                }
            }

            expect(whiteCount, `Arquivo ${file} contém ${whiteCount} pixels brancos opacos`).toBe(0);
        }
    });

    it('2. nenhuma spritesheet animada de casa deve conter fundos brancos opacos', async () => {
        if (!fs.existsSync(spriteHousesDir)) return;
        const files = fs.readdirSync(spriteHousesDir).filter(f => f.endsWith('.png'));

        for (const file of files) {
            const filePath = path.join(spriteHousesDir, file);
            const img = await loadImage(filePath);
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, img.width, img.height).data;

            let whiteCount = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i]!;
                const g = data[i + 1]!;
                const b = data[i + 2]!;
                const a = data[i + 3]!;

                if (a === 255 && r >= 230 && g >= 230 && b >= 230) {
                    whiteCount++;
                }
            }

            expect(whiteCount, `Spritesheet ${file} contém ${whiteCount} pixels brancos opacos`).toBe(0);
        }
    });
});
