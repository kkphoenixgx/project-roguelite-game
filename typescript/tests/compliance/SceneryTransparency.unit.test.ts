import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadImage, createCanvas } from '@napi-rs/canvas';

describe('Scenery Transparency Compliance (Unit Tests)', () => {
    const housesDir = path.resolve(__dirname, '../../adapters/web/assets/scenery/houses');

    it('1. deve verificar que todos os 24 assets de casas existem no diretório de scenery', () => {
        expect(fs.existsSync(housesDir)).toBe(true);
        const files = fs.readdirSync(housesDir).filter(f => f.endsWith('.png'));
        expect(files.length).toBeGreaterThanOrEqual(24);
    });

    it('2. deve assegurar que casas críticas não possuem pixels opacos de fundo branco', async () => {
        const criticalHouses = [
            'house_guard_barracks_clean.png',
            'house_watermill_river_clean.png',
            'house_sawmill_carpentry_clean.png',
            'house_tavern_brewery_clean.png',
            'house_merchant_timber_clean.png'
        ];

        for (const fileName of criticalHouses) {
            const filePath = path.join(housesDir, fileName);
            expect(fs.existsSync(filePath), `Arquivo deve existir: ${fileName}`).toBe(true);

            const img = await loadImage(filePath);
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, img.width, img.height).data;

            let opaqueWhiteCount = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i]!;
                const g = data[i + 1]!;
                const b = data[i + 2]!;
                const a = data[i + 3]!;

                if (a === 255 && r >= 230 && g >= 230 && b >= 230) {
                    opaqueWhiteCount++;
                }
            }

            expect(opaqueWhiteCount, `${fileName} não deve ter resíduos de fundo branco opaco`).toBe(0);
        }
    });

    it('3. deve assegurar que a torre de alarme possui transparência no interior de suas vigas', async () => {
        const bellTowerPath = path.resolve(__dirname, '../../adapters/web/assets/scenery/props/props_alarm_bell_tower_clean.png');
        expect(fs.existsSync(bellTowerPath)).toBe(true);

        const img = await loadImage(bellTowerPath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;

        let opaqueWhiteCount = 0;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i]!;
            const g = data[i + 1]!;
            const b = data[i + 2]!;
            const a = data[i + 3]!;

            if (a === 255 && r >= 230 && g >= 230 && b >= 230) {
                opaqueWhiteCount++;
            }
        }

        expect(opaqueWhiteCount).toBe(0);
    });
});
