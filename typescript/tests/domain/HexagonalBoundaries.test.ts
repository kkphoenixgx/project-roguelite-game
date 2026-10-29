declare const process: any;
import { describe, it, expect } from 'vitest';

// @ts-ignore: Suprime a exigência do pacote @types/node
import * as fs from 'fs';
// @ts-ignore: Suprime a exigência do pacote @types/node
import * as path from 'path';

// Função auxiliar para navegação profunda no AST do FileSystem
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach((file: string) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else if (fullPath.endsWith('.ts') && !fullPath.includes('.test.ts')) {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

describe('Métrica 9: Testes de Fronteira Arquitetural (Fitness Functions)', () => {
    // Utiliza process.cwd() ancorando na raiz do projeto para evitar o erro de __dirname em ambientes ESM
    const domainDir = path.resolve(process.cwd(), 'typescript/domain');
    let domainFiles: string[] = [];

    try {
        domainFiles = getAllFiles(domainDir);
    } catch (e) {
        console.warn('Diretório de domínio não encontrado para análise.');
    }

    it('O Domínio não deve importar a Camada de Adaptação (Acoplamento Eferente Ce = 0)', () => {
        const violations = domainFiles.filter(file => {
            const content = fs.readFileSync(file, 'utf-8');
            // Verifica vetores de importação ilegais apontando para Adapters/Web
            return /import\s+.*from\s+['"].*\/adapters\/.*['"]/.test(content) || 
                   /import\s+.*from\s+['"].*adapters['"]/.test(content);
        });

        expect(violations, `Violação da Arquitetura Hexagonal detectada!\nOs seguintes arquivos do Domínio importam Adapters:\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('O Domínio não deve conter referências a APIs Globais do Navegador (Window/DOM)', () => {
        const violations = domainFiles.filter(file => {
            const content = fs.readFileSync(file, 'utf-8');
            // A presença destes objetos globais indica um vazamento da camada de Apresentação no Core
            return /\b(window\.|document\.|localStorage\.|sessionStorage\.)/.test(content);
        });

        expect(violations, `Vazamento de Infraestrutura de Apresentação detectado!\nO Domínio contém referências diretas a APIs Web nos arquivos:\n${violations.join('\n')}`).toHaveLength(0);
    });
});