// @vitest-environment jsdom
/**
 * @file ChunkApplyBackgroundToAll.unit.test.ts
 * Testes unitários do "Aplicar a Todos os Chunks" do gerenciador de chunks (ChunkManagerModal.applyBackgroundToAllChunks).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChunkManagerModal } from '../../adapters/assets-adapter/Components/ChunkManagerModal';
import type { SelectedMapConfig } from '../../adapters/assets-adapter/Components/MapSelectorModal';

function makeMap(chunks: string[][]): SelectedMapConfig {
    return {
        id: 'mapa_unit_chunks',
        name: 'Mapa Unit Chunks',
        width: (chunks[0]?.length || 1) * 1024,
        height: chunks.length * 1024,
        chunkSize: 1024,
        chunks
    };
}

describe('ChunkApplyBackgroundToAll (Unit)', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    it('troca o fundo de todos os chunks existentes e preserva as células vazias', () => {
        const map = makeMap([
            ['a.png', '', 'b.png'],
            ['c.png', 'd.png', '']
        ]);
        const onUpdated = vi.fn();
        const modal = new ChunkManagerModal(map, onUpdated);

        const changed = modal.applyBackgroundToAllChunks('/assets/maps/x/fundo.png', 'assets/maps/x/fundo.png');

        expect(changed).toBe(4);
        expect(map.chunks).toEqual([
            ['/assets/maps/x/fundo.png', '', '/assets/maps/x/fundo.png'],
            ['/assets/maps/x/fundo.png', '/assets/maps/x/fundo.png', '']
        ]);
        expect(onUpdated).toHaveBeenCalled();
    });

    it('imagem vazia não altera nada', () => {
        const map = makeMap([['a.png']]);
        const onUpdated = vi.fn();
        const modal = new ChunkManagerModal(map, onUpdated);

        expect(modal.applyBackgroundToAllChunks('')).toBe(0);
        expect(map.chunks).toEqual([['a.png']]);
        expect(onUpdated).not.toHaveBeenCalled();
    });

    it('não cria chunks novos (diferente de fillAll)', () => {
        const map = makeMap([['', ''], ['', 'a.png']]);
        const modal = new ChunkManagerModal(map, () => {});

        modal.applyBackgroundToAllChunks('/novo.png');

        expect(map.chunks).toEqual([['', ''], ['', '/novo.png']]);
    });
});
