/**
 * @file ChunkSync.ts
 * Gerencia a sincronização e geração de código dinâmico dos chunks e fundos do mapa
 * em estrito alinhamento com os delimitadores no VisualConfigMap.ts e no arquivo do mundo.
 */

export class ChunkSync {
    public static readonly CHUNKS_START_PREFIX = '// <!-- ASSETS_ADAPTER_CHUNKS_START:';
    public static readonly CHUNKS_END_PREFIX = '// <!-- ASSETS_ADAPTER_CHUNKS_END:';
    public static readonly MAP_DIMS_START = '// <!-- ASSETS_ADAPTER_MAP_DIMS_START -->';
    public static readonly MAP_DIMS_END = '// <!-- ASSETS_ADAPTER_MAP_DIMS_END -->';

    /**
     * Gera o código TypeScript formatado para a matriz de chunks de um mapa.
     */
    public generateChunksCode(mapId: string, chunks: string[][]): string {
        const lines: string[] = [];
        lines.push(`const ${mapId}Chunks: string[][] = [`);

        chunks.forEach((row, rIdx) => {
            lines.push(`    [`);
            const rowEntries: string[] = [];

            row.forEach(cell => {
                if (!cell || cell.trim() === '') {
                    rowEntries.push(`        ''`);
                } else if (cell.includes('/assets/')) {
                    //? Normaliza caminho relativo ao módulo VisualConfigMap
                    const relativePath = cell.includes('../assets/') 
                        ? cell 
                        : cell.substring(cell.indexOf('/assets/')).replace('/assets/', '../assets/');
                    rowEntries.push(`        new URL('${relativePath}', import.meta.url).href`);
                } else if (cell.startsWith('data:') || cell.startsWith('http')) {
                    rowEntries.push(`        '${cell}'`);
                } else {
                    const prefix = cell.includes('/') ? '../assets/maps/' : `../assets/maps/${mapId}/`;
                    rowEntries.push(`        new URL('${prefix}${cell}', import.meta.url).href`);
                }
            });

            lines.push(rowEntries.join(',\n'));
            lines.push(rIdx === chunks.length - 1 ? `    ]` : `    ],`);
        });

        lines.push(`];`);
        return lines.join('\n');
    }

    /**
     * Sincroniza a nova matriz de chunks e as dimensões calculadas do mundo em disco via API do Vite e no localStorage.
     */
    public async syncChunksToDisk(mapId: string, chunks: string[][], width: number, height: number, originChunk?: { cx: number; cy: number }): Promise<boolean> {
        //? Persistência síncrona no localStorage para prevenir perda de estado em reloads
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem(`assets_adapter_chunks_${mapId}`, JSON.stringify({ 
                    chunks, 
                    width, 
                    height, 
                    originChunk: originChunk || (mapId === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 }),
                    timestamp: Date.now() 
                }));
                const intermapsRaw = localStorage.getItem('rpg_assets_adapter_intermaps');
                if (intermapsRaw) {
                    const parsed = JSON.parse(intermapsRaw);
                    if (parsed[mapId]) {
                        parsed[mapId].chunks = chunks;
                        parsed[mapId].width = width;
                        parsed[mapId].height = height;
                        parsed[mapId].originChunk = originChunk;
                        localStorage.setItem('rpg_assets_adapter_intermaps', JSON.stringify(parsed));
                    }
                }
            } catch { /* ignore */ }
        }

        try {
            const chunksCode = this.generateChunksCode(mapId, chunks);
            const res = await fetch(`/api/assets-adapter?target=chunks&mapId=${encodeURIComponent(mapId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chunks, chunksCode, width, height, originChunk })
            });

            if (res.ok) {
                const data = await res.json();
                return data.success === true;
            }
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Retorna os chunks em cache local de forma síncrona
     */
    public getCachedChunks(mapId: string): { chunks: string[][]; width: number; height: number; originChunk?: { cx: number; cy: number } } | null {
        if (typeof localStorage !== 'undefined') {
            try {
                const raw = localStorage.getItem(`assets_adapter_chunks_${mapId}`);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.chunks && Array.isArray(parsed.chunks)) {
                        return {
                            chunks: parsed.chunks,
                            width: parsed.width || (parsed.chunks[0]?.length || 3) * 1024,
                            height: parsed.height || parsed.chunks.length * 1024,
                            originChunk: parsed.originChunk || (mapId === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 })
                        };
                    }
                }
            } catch { /* ignore */ }
        }
        return null;
    }

    /**
     * Carrega a matriz de chunks e dimensões salvas no disco via API do Vite
     */
    public async loadChunksFromDisk(mapId: string): Promise<{ chunks: string[][]; width: number; height: number; originChunk?: { cx: number; cy: number } } | null> {
        const cached = this.getCachedChunks(mapId);
        try {
            const res = await fetch(`/api/assets-adapter?target=chunks&mapId=${encodeURIComponent(mapId)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.chunks && Array.isArray(data.chunks)) {
                    const originChunk = data.originChunk || (mapId === 'vilgem' ? { cx: 1, cy: 1 } : { cx: 0, cy: 0 });
                    if (typeof localStorage !== 'undefined') {
                        try {
                            localStorage.setItem(`assets_adapter_chunks_${mapId}`, JSON.stringify({
                                chunks: data.chunks,
                                width: data.width,
                                height: data.height,
                                originChunk
                            }));
                        } catch { /* ignore */ }
                    }
                    return {
                        chunks: data.chunks,
                        width: data.width || (data.chunks[0]?.length || 3) * 1024,
                        height: data.height || data.chunks.length * 1024,
                        originChunk
                    };
                }
            }
        } catch {}
        return cached;
    }
}
