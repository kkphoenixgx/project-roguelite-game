/**
 * @file InvalidateWrittenFile.unit.test.ts
 * Testes unitários do helper `invalidateWrittenFile` do plugin do Assets Adapter (vite.config.ts),
 * que invalida no cache do Vite os módulos de um arquivo gravado pelo editor.
 */

import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import { invalidateWrittenFile } from '../../adapters/assets-adapter/Components/ViteModuleInvalidation';

function fakeServer(graph: Record<string, Set<any>>) {
    return {
        moduleGraph: {
            getModulesByFile: vi.fn((file: string) => graph[file]),
            invalidateModule: vi.fn()
        }
    };
}

describe('invalidateWrittenFile (Unit)', () => {
    const file = path.resolve('typescript/domain/ObjectModule/Maps/VilgemWorld.ts');
    const normalized = file.replace(/\\/g, '/');

    it('invalida todos os módulos associados ao arquivo gravado', () => {
        const modA = { id: 'a' };
        const modB = { id: 'b' };
        const server = fakeServer({ [normalized]: new Set([modA, modB]) });

        const count = invalidateWrittenFile(server, file);

        expect(count).toBe(2);
        expect(server.moduleGraph.invalidateModule).toHaveBeenCalledWith(modA);
        expect(server.moduleGraph.invalidateModule).toHaveBeenCalledWith(modB);
    });

    it('procura o arquivo com barras normais (formato de caminho do Vite, inclusive no Windows)', () => {
        const server = fakeServer({ [normalized]: new Set([{ id: 'a' }]) });

        invalidateWrittenFile(server, file.replace(/\//g, path.sep));

        expect(server.moduleGraph.getModulesByFile).toHaveBeenCalledWith(normalized);
    });

    it('não faz nada quando o arquivo ainda não foi carregado por nenhum módulo (ex: PNG recém-enviado)', () => {
        const server = fakeServer({});

        const count = invalidateWrittenFile(server, path.resolve('typescript/adapters/web/assets/nova.png'));

        expect(count).toBe(0);
        expect(server.moduleGraph.invalidateModule).not.toHaveBeenCalled();
    });
});
