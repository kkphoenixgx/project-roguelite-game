/**
 * @file ViteModuleInvalidation.ts
 * Invalidação do cache de módulos do Vite para arquivos gravados pelo plugin do Assets Adapter (vite.config.ts).
 * Os arquivos de mapa/assets ficam em `server.watch.ignored` (para o editor não recarregar sozinho a cada
 * salvamento), então sem esta invalidação o Vite continuaria servindo a versão antiga até ser reiniciado.
 */

import path from 'path';

/** Subconjunto do `ViteDevServer` usado pela invalidação (facilita testes com servidor falso). */
export interface ModuleGraphHost {
    moduleGraph: {
        getModulesByFile(file: string): Set<any> | undefined;
        invalidateModule(mod: any): void;
    };
}

/**
 * Invalida no grafo de módulos do Vite todos os módulos gerados a partir de `file`,
 * forçando a próxima requisição (ex: F5 no jogo) a ler e transformar o arquivo de novo.
 * @returns Quantidade de módulos invalidados (0 se o arquivo ainda não foi carregado).
 */
export function invalidateWrittenFile(server: ModuleGraphHost, file: string): number {
    const modules = server.moduleGraph.getModulesByFile(path.resolve(file).replace(/\\/g, '/'))
        ?? server.moduleGraph.getModulesByFile(path.resolve(file));
    if (!modules) return 0;
    for (const mod of modules) server.moduleGraph.invalidateModule(mod);
    return modules.size;
}
