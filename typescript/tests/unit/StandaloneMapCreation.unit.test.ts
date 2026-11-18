// @vitest-environment jsdom
/**
 * @file StandaloneMapCreation.unit.test.ts
 * Testes unitários da criação de mapas independentes (botão "Novo Mapa" do Assets Editor) no InnerMapManager.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InnerMapManager } from '../../adapters/assets-adapter/Components/InnerMapManager';

function freshManager(): InnerMapManager {
    (InnerMapManager as any).instance = undefined;
    return InnerMapManager.getInstance();
}

describe('StandaloneMapCreation (Unit)', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        (InnerMapManager as any).instance = undefined;
    });

    describe('slugifyMapId', () => {
        it.each([
            ['Teste Render', 'teste_render'],
            ['Floresta Sombria!', 'floresta_sombria'],
            ['  Área de Ação 2 ', 'area_de_acao_2'],
            ['já_existe', 'ja_existe'],
            ['---', '']
        ])('"%s" -> "%s"', (input, expected) => {
            expect(InnerMapManager.slugifyMapId(input)).toBe(expected);
        });
    });

    describe('buildChunkGrid', () => {
        it('monta linhas x colunas com a mesma imagem', () => {
            const grid = InnerMapManager.buildChunkGrid(3, 2, '/bg.png');
            expect(grid).toEqual([
                ['/bg.png', '/bg.png', '/bg.png'],
                ['/bg.png', '/bg.png', '/bg.png']
            ]);
        });

        it('garante pelo menos 1x1', () => {
            expect(InnerMapManager.buildChunkGrid(0, -2, '')).toEqual([['']]);
        });
    });

    describe('createStandaloneMap', () => {
        it('cria um mapa independente com chunks, dimensões e spawn no centro', async () => {
            const mgr = freshManager();
            const def = await mgr.createStandaloneMap({ name: 'Mapa Unit A', cols: 3, rows: 2, backgroundUrl: '/bg.png' });

            expect(def.id).toBe('mapa_unit_a');
            expect(def.standalone).toBe(true);
            expect(def.width).toBe(3072);
            expect(def.height).toBe(2048);
            expect(def.chunks).toEqual(InnerMapManager.buildChunkGrid(3, 2, '/bg.png'));
            expect(def.defaultSpawn).toEqual({ x: 1536, y: 1024 });
            expect(mgr.getStandaloneMaps().some(m => m.id === 'mapa_unit_a')).toBe(true);
            expect(fetch).toHaveBeenCalledWith('/api/assets-adapter?target=intermaps', expect.objectContaining({ method: 'POST' }));
        });

        it('sem mapa de retorno não cria portal', async () => {
            const mgr = freshManager();
            const def = await mgr.createStandaloneMap({ name: 'Mapa Unit B', cols: 1, rows: 1 });

            expect(def.portals).toEqual([]);
            expect(def.parentWorldId).toBe('vilgem');
        });

        it('com mapa de retorno cria portal perto do spawn levando ao spawn do mapa de destino', async () => {
            const mgr = freshManager();
            const def = await mgr.createStandaloneMap({ name: 'Mapa Unit C', cols: 2, rows: 2, returnMapId: 'vilgem' });

            expect(def.parentWorldId).toBe('vilgem');
            expect(def.portals).toHaveLength(1);
            expect(def.portals![0]).toMatchObject({ targetMapId: 'vilgem', targetSpawnCoords: { x: 512, y: 591 }, type: 'request' });
        });

        it('cor sólida: chunks sem imagem e backgroundColor definido', async () => {
            const mgr = freshManager();
            const def = await mgr.createStandaloneMap({ name: 'Mapa Unit D', cols: 2, rows: 1, backgroundUrl: '', backgroundColor: '#123456' });

            expect(def.chunks).toEqual([['', '']]);
            expect(def.backgroundColor).toBe('#123456');
        });

        it('rejeita ID duplicado, ID de mundo raiz e nome vazio', async () => {
            const mgr = freshManager();
            await mgr.createStandaloneMap({ name: 'Mapa Unit E', cols: 1, rows: 1 });

            await expect(mgr.createStandaloneMap({ name: 'Mapa Unit E', cols: 1, rows: 1 })).rejects.toThrow('Já existe');
            await expect(mgr.createStandaloneMap({ name: 'Vilgem', cols: 1, rows: 1 })).rejects.toThrow('reservado');
            await expect(mgr.createStandaloneMap({ name: '   ', cols: 1, rows: 1 })).rejects.toThrow('nome ou ID');
        });

        it('toSelectedMapConfig identifica o mapa como independente', async () => {
            const mgr = freshManager();
            const def = await mgr.createStandaloneMap({ name: 'Mapa Unit F', cols: 1, rows: 1 });

            const cfg = mgr.toSelectedMapConfig(def);

            expect(cfg.isInnerMap).toBe(true);
            expect(cfg.description).toBe('Mapa independente criado no editor');
        });

        it('InnerMaps comuns não aparecem como mapas independentes', async () => {
            const mgr = freshManager();
            await mgr.createInnerMap({ id: 'interior_unit_g', parentWorldId: 'vilgem' });

            expect(mgr.getStandaloneMaps().some(m => m.id === 'interior_unit_g')).toBe(false);
        });
    });
});
