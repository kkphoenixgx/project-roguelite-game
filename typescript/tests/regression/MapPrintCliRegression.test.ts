/**
 * @file MapPrintCliRegression.test.ts
 * Testes de regressao para o CLI de impressao do mapa (MapPrintService).
 * Blindam o sistema contra falhas na renderizacao offscreen do mapa completo,
 * ordenacao isometrica Y-Sort, sobreposicao de overlays (grid, hitboxes, labels)
 * e integracao com o catalogo de scripts do package.json.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

describe('MapPrint CLI - Blindagem de Regressao (Regression)', () => {
    const testOutputDir = path.resolve(process.cwd(), 'typescript/tests/scratch/maps_test');
    let MapPrintService: any;

    beforeAll(async () => {
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }
        const scriptPath = path.resolve(process.cwd(), 'scripts/print-map.ts');
        const scriptUrl = pathToFileURL(scriptPath).href;
        const mod = await import(/* @vite-ignore */ scriptUrl);
        MapPrintService = mod.MapPrintService;
    }, 30000);

    afterAll(() => {
        // Limpeza dos artefatos temporarios gerados pelo teste
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    it('1. Deve registrar o comando map:print no package.json apontando para scripts/print-map.ts', () => {
        const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        expect(pkg.scripts['map:print']).toBe('npx tsx scripts/print-map.ts');
    });

    it('2. Deve renderizar com sucesso o mapa principal "vilgem" em escala 0.25x gerando PNG valido', async () => {
        const service = new MapPrintService();
        const testFile = path.join(testOutputDir, 'vilgem_test.png');

        const options = {
            mapId: 'vilgem',
            outputPath: testFile,
            scale: 0.25,
            showGrid: false,
            showHitboxes: false,
            showLabels: false,
            showSpawn: true,
            includeScenery: true,
            help: false
        };

        const result = await service.renderMap(options);

        // Validacoes estruturais do resultado
        expect(result.width).toBe(1280); // 5120 * 0.25
        expect(result.height).toBe(1536); // 6144 * 0.25
        expect(result.scale).toBe(0.25);
        expect(result.elementCount).toBeGreaterThanOrEqual(80); // Ao menos 89 cenarios + npcs + itens
        expect(result.fileSizeBytes).toBeGreaterThan(100000); // Mais de 100KB de imagem comprimida
        expect(result.durationMs).toBeGreaterThan(0);

        // Verifica se o arquivo fisico foi gravado com cabecalho PNG valido (\x89PNG)
        expect(fs.existsSync(testFile)).toBe(true);
        const buffer = fs.readFileSync(testFile);
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50); // 'P'
        expect(buffer[2]).toBe(0x4e); // 'N'
        expect(buffer[3]).toBe(0x47); // 'G'
    });

    it('3. Deve suportar overlays combinados de Grid, Hitboxes e Labels sem lancar excecoes', async () => {
        const service = new MapPrintService();
        const testFile = path.join(testOutputDir, 'vilgem_overlays.png');

        const options = {
            mapId: 'vilgem',
            outputPath: testFile,
            scale: 0.1, // Escala ultrarrapida para teste
            showGrid: true,
            showHitboxes: true,
            showLabels: true,
            showSpawn: true,
            includeScenery: true,
            help: false
        };

        const result = await service.renderMap(options);
        expect(result.width).toBe(512); // 5120 * 0.1
        expect(result.height).toBe(614); // 6144 * 0.1
        expect(fs.existsSync(testFile)).toBe(true);
    });

    it('4. Deve renderizar mapas internos (Intermap) como "interior_black_default"', async () => {
        const service = new MapPrintService();
        const testFile = path.join(testOutputDir, 'interior_test.png');

        const options = {
            mapId: 'interior_black_default',
            outputPath: testFile,
            scale: 0.5,
            showGrid: false,
            showHitboxes: false,
            showLabels: false,
            showSpawn: true,
            includeScenery: true,
            help: false
        };

        const result = await service.renderMap(options);
        expect(result.width).toBe(1024); // 2048 * 0.5
        expect(result.height).toBe(512); // 1024 * 0.5
        expect(fs.existsSync(testFile)).toBe(true);
    });

    it('5. Deve lancar erro claro ao solicitar mapa inexistente', async () => {
        const service = new MapPrintService();
        const options = {
            mapId: 'mapa_inexistente_xyz',
            outputPath: path.join(testOutputDir, 'fail.png'),
            scale: 0.5,
            showGrid: false,
            showHitboxes: false,
            showLabels: false,
            showSpawn: true,
            includeScenery: true,
            help: false
        };

        await expect(service.renderMap(options)).rejects.toThrow(
            'Mapa com ID "mapa_inexistente_xyz" nao foi encontrado no catalogo de mapas.'
        );
    });
});
