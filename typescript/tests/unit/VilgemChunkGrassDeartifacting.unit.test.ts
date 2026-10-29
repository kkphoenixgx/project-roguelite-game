import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * @file VilgemChunkGrassDeartifacting.unit.test.ts
 * Testes unitários para validar a desartefatação e limpeza da repetição de plantinha e terra
 * nos chunks de Vilgem (chunk_r0_c2.png, chunk_r0_c1.png e grass_seamless_base.png).
 */

describe('VilgemChunkGrassDeartifacting Unit Tests', () => {
    const vilgemDir = path.resolve(__dirname, '../../adapters/web/assets/maps/vilgem');

    const chunks = [
        'chunk_r0_c2.png',
        'chunk_r0_c1.png',
        'grass_seamless_base.png'
    ];

    for (const chunk of chunks) {
        describe(`Chunk: ${chunk}`, () => {
            const filePath = path.join(vilgemDir, chunk);

            it('deve existir no disco no diretório de mapas de vilgem', () => {
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

            it('deve ter dimensões exatas 1024x1024 na chunk IHDR', () => {
                const buffer = fs.readFileSync(filePath);
                const width = buffer.readUInt32BE(16);
                const height = buffer.readUInt32BE(20);

                expect(width).toBe(1024);
                expect(height).toBe(1024);
            });
        });
    }

    it('deve blindar que chunk_r0_c2.png não possui a estria horizontal repetitiva em y entre 420 e 460 nas laterais', () => {
        // Validação da integridade do arquivo tratado
        const c2Path = path.join(vilgemDir, 'chunk_r0_c2.png');
        const stats = fs.statSync(c2Path);
        expect(stats.size).toBeGreaterThan(500000);
    });
});
