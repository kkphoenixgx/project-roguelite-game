import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ============================================================================
 * AUDITORIA DE CONFORMIDADE DE COMENTÁRIOS (BETTER COMMENTS) & DOCUMENTAÇÃO
 * ============================================================================
 * Papel: QA Lead & Compliance Auditor (rpg-testes)
 *
 * Requisito Auditado:
 * - Verificar todos os locais do código-fonte que possuem comentários de linha (`//`)
 *   sem os marcadores semânticos `?` (`//?`) e `!` (`//!`) do padrão Better Comments.
 * - Diretriz de Governança: Quando existem comentários explicativos comuns no código
 *   (sem `?` ou `!`), a documentação do projeto (`docs/`) precisa ser atualizada sobre
 *   a respectiva funcionalidade para que o conhecimento arquitetural e de negócio
 *   não fique preso em comentários soltos no código.
 */

export interface UntypedCommentFinding {
  file: string;
  line: number;
  comment: string;
  requiredAction: string;
}

export interface CommentAuditResult {
  totalFilesScanned: number;
  filesWithUntypedComments: string[];
  findings: UntypedCommentFinding[];
}

/**
 * Analisa o conteúdo textual de um arquivo TypeScript em busca de comentários `//`
 * que não seguem o padrão `?` ou `!` do Better Comments.
 *
 * Ignora:
 * - Diretivas de compilador/linter (`///`, `// @ts-`, `// eslint-`, `// prettier-`, `// vitest-`)
 * - Marcadores de geração automática (`// <!--`)
 * - Linhas divisórias puramente visuais (`// ===`, `// ---`)
 * - URLs dentro de strings (`http://`, `https://`, `ws://`, `file://`)
 */
export function scanSourceForUntypedComments(content: string, relativeFilePath: string): UntypedCommentFinding[] {
  const findings: UntypedCommentFinding[] = [];
  const lines = content.split('\n');
  let insideBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const trimmed = rawLine.trim();

    if (insideBlockComment) {
      if (trimmed.includes('*/')) {
        insideBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        insideBlockComment = true;
      }
      continue;
    }

    // Remove literais de string simples/duplas/template antes de procurar por '//' inline
    const lineWithoutStrings = rawLine
      .replace(/'(?:\\.|[^'\\])*'/g, '""')
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/`(?:\\.|[^`\\])*`/g, '""');

    const commentIndex = lineWithoutStrings.indexOf('//');
    if (commentIndex === -1) continue;

    // Ignora triple-slash directives (///)
    if (lineWithoutStrings[commentIndex + 2] === '/') continue;

    const rawCommentSlice = rawLine.slice(commentIndex).trim();
    const afterSlashes = rawCommentSlice.slice(2).trim();

    // Ignora comentários vazios
    if (!afterSlashes) continue;

    // Ignora diretivas técnicas e marcadores estruturais de ferramentas
    if (
      /^(@ts-|eslint-|prettier-|vitest-|istanbul|c8|v8|noinspection|region\b|endregion\b|<!--)/i.test(afterSlashes)
    ) {
      continue;
    }

    // Ignora separadores puramente decorativos (ex: // ======== ou // --------)
    if (/^[=\-*#_~]{3,}$/.test(afterSlashes)) {
      continue;
    }

    // Verifica se possui o marcador '?' ou '!' logo após '//' (ex: //? ou //! ou // ? ou // !)
    const rawAfterSlashes = rawCommentSlice.slice(2);
    const hasBetterCommentsMarker = /^\s*[?!]/.test(rawAfterSlashes);

    if (!hasBetterCommentsMarker) {
      findings.push({
        file: relativeFilePath,
        line: i + 1,
        comment: rawCommentSlice,
        requiredAction:
          'Comentário sem marcador Better Comments (? ou !). Atualize a documentação do projeto (docs/) sobre esta funcionalidade e converta/remova o comentário.'
      });
    }
  }

  return findings;
}

/**
 * Varre recursivamente um diretório coletando todos os arquivos .ts de produção.
 */
function getAllProductionTsFiles(dir: string, ignorePatterns: string[] = []): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (ignorePatterns.some(p => fullPath.includes(p))) continue;

    if (entry.isDirectory()) {
      results.push(...getAllProductionTsFiles(fullPath, ignorePatterns));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.stories.ts')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

export function runBetterCommentsAudit(rootDir: string, targetDirs: string[]): CommentAuditResult {
  const allFiles: string[] = [];
  for (const dir of targetDirs) {
    allFiles.push(...getAllProductionTsFiles(dir));
  }

  const findings: UntypedCommentFinding[] = [];
  const filesWithSet = new Set<string>();

  for (const filePath of allFiles) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileFindings = scanSourceForUntypedComments(content, relPath);
    if (fileFindings.length > 0) {
      filesWithSet.add(relPath);
      findings.push(...fileFindings);
    }
  }

  return {
    totalFilesScanned: allFiles.length,
    filesWithUntypedComments: Array.from(filesWithSet).sort(),
    findings
  };
}

describe('QA Compliance - Better Comments (? e !) & Sincronização de Documentação', () => {
  const ROOT_DIR = path.resolve(__dirname, '../../../');
  const DOMAIN_DIR = path.resolve(ROOT_DIR, 'typescript/domain');
  const ADAPTERS_DIR = path.resolve(ROOT_DIR, 'typescript/adapters');

  /* -------------------------------------------------------------------------- */
  /* 1. TESTES UNITÁRIOS DO DETECTOR DE COMENTÁRIOS (ISOLAMENTO PURO)           */
  /* -------------------------------------------------------------------------- */
  describe('1. [Unitário] Motor de Detecção Better Comments (scanSourceForUntypedComments)', () => {
    it('deve aprovar comentários que utilizam os marcadores ? e ! do Better Comments', () => {
      const sample = [
        '//? Dúvida ou tópico arquitetural parametrizado',
        '//! Alerta crítico de performance Zero-GC',
        '// ? Espaço antes da interrogação também é válido',
        '// ! Espaço antes da exclamação também é válido',
        'const x = 10; //! Inline com marcador de alerta',
        'const y = 20; //? Inline com marcador de questão'
      ].join('\n');

      const result = scanSourceForUntypedComments(sample, 'sample.ts');
      expect(result).toHaveLength(0);
    });

    it('deve ignorar JSDoc (/** ... */), diretivas técnicas e URLs dentro de strings', () => {
      const sample = [
        '/// <reference types="vite/client" />',
        '/**',
        ' * Comentário JSDoc padrão de documentação de API',
        ' */',
        '// @ts-expect-error teste de tipo',
        '// eslint-disable-next-line @typescript-eslint/no-explicit-any',
        '// <!-- ASSETS_ADAPTER_SCENERY_START -->',
        '// =====================================================================',
        'const url = "http://127.0.0.1:11434/api/generate";',
        'const ws = `ws://localhost:8080/socket`;'
      ].join('\n');

      const result = scanSourceForUntypedComments(sample, 'sample.ts');
      expect(result).toHaveLength(0);
    });

    it('deve detectar comentários sem ? e ! e exigir atualização da documentação do projeto', () => {
      const sample = [
        'export class SampleFeature {',
        '  // Calcula o deslocamento base para este frame',
        '  public execute(): number {',
        '    return 42; // Retorna valor fixo temporário',
        '  }',
        '}'
      ].join('\n');

      const result = scanSourceForUntypedComments(sample, 'typescript/domain/SampleFeature.ts');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        file: 'typescript/domain/SampleFeature.ts',
        line: 2,
        comment: '// Calcula o deslocamento base para este frame',
        requiredAction: expect.stringContaining('Atualize a documentação do projeto (docs/)')
      });
      expect(result[1]).toEqual({
        file: 'typescript/domain/SampleFeature.ts',
        line: 4,
        comment: '// Retorna valor fixo temporário',
        requiredAction: expect.stringContaining('Atualize a documentação do projeto (docs/)')
      });
    });

    it('[Regressão] deve detectar comentários com asterisco (//*) ou texto livre que não usam ? ou !', () => {
      const sample = [
        '//* 1. Define linha reta até a última posição',
        '// TODO: refatorar depois'
      ].join('\n');

      const result = scanSourceForUntypedComments(sample, 'typescript/domain/Slime.ts');
      expect(result).toHaveLength(2);
      expect(result[0]?.line).toBe(1);
      expect(result[1]?.line).toBe(2);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. AUDITORIA GRAYBOX NO CÓDIGO DE PRODUÇÃO (DOMÍNIO & ADAPTADORES)         */
  /* -------------------------------------------------------------------------- */
  describe('2. [Auditoria de Conformidade] Verificação de Comentários sem ? e ! no Projeto', () => {
    it('Nenhum arquivo do Domínio (typescript/domain/) deve conter comentários sem ? ou ! sem atualizar a documentação (docs/)', () => {
      const audit = runBetterCommentsAudit(ROOT_DIR, [DOMAIN_DIR]);

      const reportPreview = audit.findings
        .slice(0, 35)
        .map(f => `  - ${f.file}:${f.line} -> ${f.comment}`)
        .join('\n');

      expect(
        audit.findings,
        `[NÃO-CONFORMIDADE DE DOCUMENTAÇÃO & BETTER COMMENTS NO DOMÍNIO]\n` +
          `Foram encontrados ${audit.findings.length} comentários sem '?' ou '!' em ${audit.filesWithUntypedComments.length} arquivos do Domínio.\n` +
          `REGRA DO PROJETO: Se há necessidade de comentário explicativo no código, a documentação do projeto (docs/) DEVE ser atualizada sobre a funcionalidade e o comentário deve usar o padrão Better Comments (? ou !) ou ser convertido em documentação oficial.\n\n` +
          `Amostra das ocorrências encontradas:\n${reportPreview}\n` +
          (audit.findings.length > 35 ? `  ... e mais ${audit.findings.length - 35} ocorrências.` : '')
      ).toHaveLength(0);
    });

    it('Nenhum arquivo de Adaptadores (typescript/adapters/) deve conter comentários sem ? ou ! sem atualizar a documentação (docs/)', () => {
      const audit = runBetterCommentsAudit(ROOT_DIR, [ADAPTERS_DIR]);

      const reportPreview = audit.findings
        .slice(0, 35)
        .map(f => `  - ${f.file}:${f.line} -> ${f.comment}`)
        .join('\n');

      expect(
        audit.findings,
        `[NÃO-CONFORMIDADE DE DOCUMENTAÇÃO & BETTER COMMENTS NOS ADAPTADORES]\n` +
          `Foram encontrados ${audit.findings.length} comentários sem '?' ou '!' em ${audit.filesWithUntypedComments.length} arquivos de Adaptadores.\n` +
          `REGRA DO PROJETO: Se há necessidade de comentário explicativo no código, a documentação do projeto (docs/) DEVE ser atualizada sobre a funcionalidade e o comentário deve usar o padrão Better Comments (? ou !) ou ser convertido em documentação oficial.\n\n` +
          `Amostra das ocorrências encontradas:\n${reportPreview}\n` +
          (audit.findings.length > 35 ? `  ... e mais ${audit.findings.length - 35} ocorrências.` : '')
      ).toHaveLength(0);
    });
  });
});
