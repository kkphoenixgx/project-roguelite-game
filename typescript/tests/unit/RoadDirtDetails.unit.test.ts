import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * @file RoadDirtDetails.unit.test.ts
 * Testes unitários para validar os assets de detalhes de chão de estrada de barro.
 */

describe('RoadDirtDetails Unit Tests', () => {
    const roadsDir = path.resolve(__dirname, '../../adapters/web/assets/scenery/roads');

    const expectedAssets = [
        { file: 'road_dirt_patch.png', width: 180, height: 110 },
        { file: 'road_dirt_ruts.png', width: 190, height: 70 },
        { file: 'road_dirt_clods.png', width: 96, height: 56 }
    ];

    for (const asset of expectedAssets) {
        describe(`Asset: ${asset.file}`, () => {
            const filePath = path.join(roadsDir, asset.file);

            it('deve existir no disco no diretório de roads', () => {
                expect(fs.existsSync(filePath)).toBe(true);
            });

            it('deve possuir cabeçalho PNG válido (magic bytes)', () => {
                const buffer = fs.readFileSync(filePath);
                expect(buffer.length).toBeGreaterThan(100);

                const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                for (let i = 0; i < pngHeader.length; i++) {
                    expect(buffer[i]).toBe(pngHeader[i]);
                }
            });

            it(`deve possuir dimensões exatas ${asset.width}x${asset.height} na chunk IHDR`, () => {
                const buffer = fs.readFileSync(filePath);
                const width = buffer.readUInt32BE(16);
                const height = buffer.readUInt32BE(20);

                expect(width).toBe(asset.width);
                expect(height).toBe(asset.height);
            });
        });
    }
});
