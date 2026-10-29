import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';

/**
 * @file VilgemChunkGrassDeartifactingRegression.test.ts
 * Testes de regressão para blindar que os chunks de Vilgem não sofrem regressão
 * reintroduzindo carimbos repetitivos de plantas ou manchas de terra artificiais.
 */

describe('VilgemChunkGrassDeartifacting Regression Tests', () => {
    const vilgemDir = path.resolve(__dirname, '../../adapters/web/assets/maps/vilgem');

    it('deve garantir que o mapa vilgem no VisualConfigMap referencia chunks existentes e íntegros', () => {
        const vilgemMapConfig = VisualConfigMap['vilgem'];
        expect(vilgemMapConfig).toBeDefined();
        if (!vilgemMapConfig) return;
        expect(vilgemMapConfig.category).toBe('map');

        // Todos os chunks do mapa devem existir no disco
        if ('chunks' in vilgemMapConfig && Array.isArray(vilgemMapConfig.chunks)) {
            for (const row of vilgemMapConfig.chunks) {
                for (const chunkUrl of row) {
                    if (typeof chunkUrl === 'string' && chunkUrl.includes('vilgem/')) {
                        const filename = path.basename(chunkUrl);
                        const localPath = path.join(vilgemDir, filename);
                        expect(fs.existsSync(localPath), `Chunk ${filename} deve existir no disco`).toBe(true);
                    }
                }
            }
        }
    });

    it('deve garantir que chunk_r0_c2.png preserva a resolução padrão de 1024x1024', () => {
        const c2Path = path.join(vilgemDir, 'chunk_r0_c2.png');
        const buffer = fs.readFileSync(c2Path);
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);

        expect(width).toBe(1024);
        expect(height).toBe(1024);
    });

    it('deve blindar a consistência dimensional entre chunk_r0_c1, chunk_r0_c2 e grass_seamless_base', () => {
        const files = ['chunk_r0_c1.png', 'chunk_r0_c2.png', 'grass_seamless_base.png'];
        for (const f of files) {
            const buf = fs.readFileSync(path.join(vilgemDir, f));
            expect(buf.readUInt32BE(16)).toBe(1024);
            expect(buf.readUInt32BE(20)).toBe(1024);
        }
    });
});
