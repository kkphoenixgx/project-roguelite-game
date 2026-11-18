// @vitest-environment jsdom
/**
 * @file EditorGeneratedComments.unit.test.ts
 * Testes unitários: o código que o Assets Editor gera para os arquivos de mundo do domínio deve usar
 * apenas comentários Better Comments (`//?` ou `//!`), para não reprovar
 * `BetterCommentsDocumentationCompliance` a cada salvamento.
 */

import { describe, it, expect } from 'vitest';
import { WorldCodeSync } from '../../../typescript/adapters/assets-adapter/Components/WorldCodeSync';
import type { SelectedMapConfig } from '../../../typescript/adapters/assets-adapter/Components/MapSelectorModal';

const vilgem: SelectedMapConfig = {
    id: 'vilgem',
    name: 'Alvorada de Vilgem',
    width: 3072,
    height: 3072,
    chunkSize: 1024,
    originChunk: { cx: 1, cy: 1 }
};

function untypedComments(code: string): string[] {
    return code.split(/\r?\n/).filter(line => {
        const idx = line.indexOf('//');
        if (idx === -1) return false;
        const after = line.slice(idx + 2);
        return !/^\s*[?!]/.test(after) && !/^\s*<!--/.test(after);
    });
}

describe('EditorGeneratedComments (Unit)', () => {
    it('generateSceneryCode gera cabeçalhos de chunk com //? (e não //*)', () => {
        const code = new WorldCodeSync().generateSceneryCode([], vilgem);

        expect(code).toContain('//? 1. CHUNK (0,0)');
        expect(code).not.toContain('//*');
    });

    it('generateSceneryCode não gera nenhum comentário sem marcador ? ou !', () => {
        const code = new WorldCodeSync().generateSceneryCode([], vilgem);

        expect(untypedComments(code)).toEqual([]);
    });
});
