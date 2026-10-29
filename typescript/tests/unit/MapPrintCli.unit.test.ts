/**
 * @file MapPrintCli.unit.test.ts
 * Testes unitarios para o MapPrint CLI (scripts/print-map.ts).
 * Valida o parser de argumentos de linha de comando, resolucao de caminhos de assets
 * e o mecanismo de cache de imagens do Skia.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { pathToFileURL } from 'url';

describe('MapPrint CLI - Testes Unitarios (Unit)', () => {
    let parseArgs: any;
    let resolveAssetPath: any;
    let ImageCache: any;

    beforeAll(async () => {
        const scriptPath = path.resolve(process.cwd(), 'scripts/print-map.ts');
        const scriptUrl = pathToFileURL(scriptPath).href;
        const mod = await import(/* @vite-ignore */ scriptUrl);
        parseArgs = mod.parseArgs;
        resolveAssetPath = mod.resolveAssetPath;
        ImageCache = mod.ImageCache;
    });

    describe('parseArgs', () => {
        it('1. Deve retornar opcoes padrao quando nenhum argumento e fornecido', () => {
            const options = parseArgs([]);
            expect(options.mapId).toBe('vilgem');
            expect(options.scale).toBe(0.5);
            expect(options.showGrid).toBe(false);
            expect(options.showHitboxes).toBe(false);
            expect(options.showLabels).toBe(false);
            expect(options.showSpawn).toBe(true);
            expect(options.includeScenery).toBe(true);
            expect(options.help).toBe(false);
            expect(options.outputPath).toBe(path.join('docs', 'maps', 'vilgem.png'));
        });

        it('2. Deve fazer parsing correto de opcoes customizadas (--map, --output, --scale)', () => {
            const options = parseArgs([
                '--map', 'interior_black_default',
                '--output', 'custom/dir/map.png',
                '--scale', '0.25',
                '--show-grid',
                '--show-hitboxes',
                '--show-labels',
                '--hide-spawn',
                '--no-scenery'
            ]);

            expect(options.mapId).toBe('interior_black_default');
            expect(options.outputPath).toBe('custom/dir/map.png');
            expect(options.scale).toBe(0.25);
            expect(options.showGrid).toBe(true);
            expect(options.showHitboxes).toBe(true);
            expect(options.showLabels).toBe(true);
            expect(options.showSpawn).toBe(false);
            expect(options.includeScenery).toBe(false);
        });

        it('3. Deve suportar aliases curtos (-m, -o, -s, -h)', () => {
            const options = parseArgs(['-m', 'alun', '-o', 'out.png', '-s', '1.0', '-h']);
            expect(options.mapId).toBe('alun');
            expect(options.outputPath).toBe('out.png');
            expect(options.scale).toBe(1.0);
            expect(options.help).toBe(true);
        });

        it('4. Deve ignorar valores invalidos de escala e preservar o padrao', () => {
            const options = parseArgs(['--scale', '-5']);
            expect(options.scale).toBe(0.5);

            const optionsNaN = parseArgs(['--scale', 'invalid']);
            expect(optionsNaN.scale).toBe(0.5);
        });
    });

    describe('resolveAssetPath', () => {
        it('1. Deve converter URLs com protocolo file:// para caminhos absolutos do SO', () => {
            const fileUrl = 'file:///home/user/project/test.png';
            const resolved = resolveAssetPath(fileUrl);
            expect(resolved).toBe('/home/user/project/test.png');
        });

        it('2. Deve resolver URLs http://localhost:5173/ para o caminho relativo local', () => {
            const httpUrl = 'http://localhost:5173/typescript/adapters/web/assets/maps/vilgem/chunk_0_0_nw.png';
            const resolved = resolveAssetPath(httpUrl);
            expect(resolved).toBe(path.resolve(process.cwd(), 'typescript/adapters/web/assets/maps/vilgem/chunk_0_0_nw.png'));
        });

        it('3. Deve resolver caminhos que comecam com barra para a raiz do projeto', () => {
            const slashPath = '/typescript/adapters/web/assets/maps/vilgem/chunk_1_1_ground.png';
            const resolved = resolveAssetPath(slashPath);
            expect(resolved).toBe(path.resolve(process.cwd(), 'typescript/adapters/web/assets/maps/vilgem/chunk_1_1_ground.png'));
        });

        it('4. Deve retornar string vazia para entrada vazia', () => {
            expect(resolveAssetPath('')).toBe('');
        });
    });

    describe('ImageCache', () => {
        it('1. Deve retornar null quando o caminho da imagem for vazio ou nao existir', async () => {
            const cache = new ImageCache();
            const emptyResult = await cache.getImage('');
            expect(emptyResult).toBeNull();

            const nonExistent = await cache.getImage('/caminho/falso/inexistente.png');
            expect(nonExistent).toBeNull();
        });

        it('2. Deve carregar uma imagem existente e reutilizar do cache na segunda chamada', async () => {
            const cache = new ImageCache();
            const validPath = path.resolve(process.cwd(), 'typescript/adapters/web/assets/maps/vilgem/chunk_0_0_nw.png');
            
            const firstLoad = await cache.getImage(validPath);
            expect(firstLoad).not.toBeNull();
            expect(firstLoad?.width).toBeGreaterThan(0);

            const secondLoad = await cache.getImage(validPath);
            expect(secondLoad).toBe(firstLoad); // Mesma referencia de memoria (cache hit)
        });
    });
});
