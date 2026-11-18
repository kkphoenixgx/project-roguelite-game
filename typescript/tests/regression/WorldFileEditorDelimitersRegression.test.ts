// @vitest-environment jsdom
/**
 * @file WorldFileEditorDelimitersRegression.test.ts
 * Testes de regressão para os delimitadores de sincronização do Assets Editor nos arquivos de mundo
 * do domínio (VilgemWorld.ts, AlunWorld.ts, CemiiWorld.ts).
 *
 * Bug original: uma conversão em massa para o padrão Better Comments trocou `// <!-- ASSETS_ADAPTER_... -->`
 * por `//? <!-- ASSETS_ADAPTER_... -->`. O plugin do Vite e o editor procuram a string exata com `// `,
 * então salvar o cenário do Vilgem retornava "Delimitadores não encontrados no arquivo do mundo." e
 * alterações de dimensões/chunks dos mundos raiz eram descartadas silenciosamente.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WorldCodeSync } from '../../../typescript/adapters/assets-adapter/Components/WorldCodeSync';
import { ChunkSync } from '../../../typescript/adapters/assets-adapter/Components/ChunkSync';

const ROOT = path.resolve(__dirname, '../../..');
const MAPS_DIR = path.join(ROOT, 'typescript/domain/ObjectModule/Maps');
const ROOT_WORLD_FILES = ['VilgemWorld.ts', 'AlunWorld.ts', 'CemiiWorld.ts'];

const read = (file: string) => fs.readFileSync(file, 'utf-8');

function expectOrderedPair(content: string, start: string, end: string, label: string): void {
    const startIndex = content.indexOf(start);
    const endIndex = content.indexOf(end);
    expect(startIndex, `${label}: delimitador inicial ausente (${start})`).toBeGreaterThan(-1);
    expect(endIndex, `${label}: delimitador final ausente (${end})`).toBeGreaterThan(-1);
    expect(endIndex, `${label}: delimitador final antes do inicial`).toBeGreaterThan(startIndex);
}

describe('WorldFileEditorDelimitersRegression (Regression Test)', () => {
    it('nenhum arquivo de mundo deve ter marcador Better Comments (? ou !) antes de <!-- ASSETS_ADAPTER', () => {
        const offenders: string[] = [];
        for (const file of fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.ts'))) {
            const lines = read(path.join(MAPS_DIR, file)).split(/\r?\n/);
            lines.forEach((line, i) => {
                if (/\/\/\s*[?!]\s*<!--\s*ASSETS_ADAPTER/.test(line)) {
                    offenders.push(`${file}:${i + 1} -> ${line.trim()}`);
                }
            });
        }
        expect(offenders, `Delimitadores corrompidos:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('VilgemWorld.ts deve conter os delimitadores de cenário exatos usados pelo editor', () => {
        const content = read(path.join(MAPS_DIR, 'VilgemWorld.ts'));
        expectOrderedPair(content, WorldCodeSync.START_DELIMITER, WorldCodeSync.END_DELIMITER, 'VilgemWorld.ts (SCENERY)');
    });

    it.each(ROOT_WORLD_FILES)('%s deve conter os delimitadores de dimensões exatos usados pelo editor', (file) => {
        const content = read(path.join(MAPS_DIR, file));
        expectOrderedPair(content, ChunkSync.MAP_DIMS_START, ChunkSync.MAP_DIMS_END, `${file} (MAP_DIMS)`);
    });

    it('o plugin do Vite deve procurar exatamente os mesmos delimitadores que o editor', () => {
        const viteConfig = read(path.join(ROOT, 'vite.config.ts'));
        for (const tag of [
            WorldCodeSync.START_DELIMITER,
            WorldCodeSync.END_DELIMITER,
            ChunkSync.MAP_DIMS_START,
            ChunkSync.MAP_DIMS_END
        ]) {
            expect(viteConfig.includes(`'${tag}'`), `vite.config.ts não referencia ${tag}`).toBe(true);
        }
    });
});
