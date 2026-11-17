/**
 * @file EditorSaveStaleViteCacheRegression.test.ts
 * Teste de regressão: alterações salvas pelo Assets Editor não chegavam ao jogo.
 *
 * Bug original: os arquivos de mapa, o VisualConfigMap.ts e os assets estão em `server.watch.ignored`
 * (para o editor não recarregar a cada salvamento). Sem evento do watcher, o Vite mantinha a versão
 * transformada antiga em cache e continuava servindo-a até ser reiniciado, mesmo com F5 no jogo.
 * A correção faz o plugin invalidar o módulo no grafo do Vite a cada gravação (`writeSynced`).
 */

import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createServer, type ViteDevServer } from 'vite';
import { invalidateWrittenFile } from '../../adapters/assets-adapter/Components/ViteModuleInvalidation';

const ROOT = path.resolve(__dirname, '../../..');

describe('EditorSaveStaleViteCacheRegression (Regression Test)', () => {
    let server: ViteDevServer | undefined;
    let tmpDir: string | undefined;

    afterEach(async () => {
        await server?.close();
        if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
        server = undefined;
        tmpDir = undefined;
    });

    it('com o watcher ignorando o arquivo, só a invalidação faz o Vite servir o conteúdo novo', async () => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-stale-'));
        const probe = path.join(tmpDir, 'ProbeWorld.ts');
        fs.writeFileSync(probe, "export const version = 'VERSAO_1';\n");

        server = await createServer({
            configFile: false,
            root: tmpDir,
            logLevel: 'silent',
            appType: 'custom',
            server: { middlewareMode: true, watch: { ignored: ['**/*'] } }
        });

        const first = await server.transformRequest('/ProbeWorld.ts');
        expect(first?.code).toContain('VERSAO_1');

        fs.writeFileSync(probe, "export const version = 'VERSAO_2';\n");

        //? Comportamento que causava o bug: sem invalidação, o Vite devolve a versão antiga
        const stale = await server.transformRequest('/ProbeWorld.ts');
        expect(stale?.code).toContain('VERSAO_1');

        expect(invalidateWrittenFile(server, probe)).toBeGreaterThan(0);

        const fresh = await server.transformRequest('/ProbeWorld.ts');
        expect(fresh?.code).toContain('VERSAO_2');
    });

    it('todas as gravações do plugin do Assets Adapter passam por writeSynced (gravação + invalidação)', () => {
        const source = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
        const helperStart = source.indexOf('const writeSynced');
        const middlewareStart = source.indexOf('server.middlewares.use(');
        const pluginSection = source.slice(middlewareStart, source.indexOf('export default defineConfig'));

        expect(helperStart).toBeGreaterThan(-1);
        expect(pluginSection).not.toContain('fs.writeFileSync(');
        expect((pluginSection.match(/writeSynced\(/g) || []).length).toBeGreaterThan(0);
    });

    it('o bloco de dimensões gerado pelo plugin usa comentário Better Comments', () => {
        const source = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');

        expect(source).toContain('const newDims = `    //? Dimensões do mapa');
        expect(source).not.toContain('const newDims = `    // Dimensões do mapa');
    });
});
