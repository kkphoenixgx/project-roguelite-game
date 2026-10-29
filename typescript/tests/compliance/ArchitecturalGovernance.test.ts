import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ============================================================================
 * REDE INVIOLÁVEL DE PROTEÇÃO ARQUITETURAL & GOVERNANÇA DE CÓDIGO (QA)
 * ============================================================================
 * Papel: QA Lead & Compliance Auditor (rpg-testes)
 * Finalidade: Garantir que nenhuma IA ou desenvolvedor consiga introduzir:
 * 1. Violações de Clean Architecture (Domínio importando Adaptadores ou DOM).
 * 2. God Classes e arquivos desproporcionais (Violação do SRP / Limites de Linhas).
 * 3. Anti-patterns de IA (console.log solto, mocks de teste em produção, placeholders).
 * 4. Vazamento de abstrações ou imports circulares destrutivos.
 */
describe('QA - Architectural Governance & Anti-Pattern Firewall', () => {
  const ROOT_DIR = path.resolve(__dirname, '../../../');
  const DOMAIN_DIR = path.resolve(ROOT_DIR, 'typescript/domain');
  const ADAPTERS_DIR = path.resolve(ROOT_DIR, 'typescript/adapters');

  /**
   * Varre recursivamente um diretório coletando todos os arquivos .ts
   */
  function getAllTsFiles(dir: string, ignorePatterns: string[] = []): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (ignorePatterns.some(p => fullPath.includes(p))) continue;

      if (entry.isDirectory()) {
        results.push(...getAllTsFiles(fullPath, ignorePatterns));
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  /* -------------------------------------------------------------------------- */
  /* 1. FRONTEIRA INVIOLÁVEL DE CLEAN ARCHITECTURE: "CÉREBRO NO POTE"           */
  /* -------------------------------------------------------------------------- */
  describe('1. Clean Architecture Boundaries (Isolamento Estrito do Domínio)', () => {
    it('NENHUM arquivo do Domínio pode importar a camada de Adaptadores (typescript/adapters/)', () => {
      const domainFiles = getAllTsFiles(DOMAIN_DIR);
      const violations: { file: string; line: number; text: string }[] = [];

      for (const filePath of domainFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((lineText, idx) => {
          // Detecta imports ou requires apontando para adapters
          if (/import\s+.*from\s+['"].*adapters.*['"]/.test(lineText) ||
              /require\s*\(['"].*adapters.*['"]\)/.test(lineText)) {
            violations.push({
              file: path.relative(ROOT_DIR, filePath),
              line: idx + 1,
              text: lineText.trim()
            });
          }
        });
      }

      expect(
        violations,
        `VIOLAÇÃO DE CLEAN ARCHITECTURE! O Domínio não pode depender de Adaptadores:\n` +
        violations.map(v => `  - ${v.file}:${v.line} -> ${v.text}`).join('\n')
      ).toHaveLength(0);
    });

    it('NENHUM arquivo do Domínio pode importar diretamente APIs do Browser/DOM (document, HTMLElement, WebGL, WebGPU)', () => {
      const domainFiles = getAllTsFiles(DOMAIN_DIR, ['Collision.worker.ts']);
      const forbiddenTokens = [
        'HTMLElement',
        'HTMLCanvasElement',
        'CanvasRenderingContext2D',
        '@webgpu/types',
        'document.getElementById',
        'document.querySelector',
        'document.createElement'
      ];

      const violations: { file: string; line: number; token: string }[] = [];

      for (const filePath of domainFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((lineText, idx) => {
          // Ignora comentários
          const trimmed = lineText.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

          for (const token of forbiddenTokens) {
            if (lineText.includes(token)) {
              violations.push({
                file: path.relative(ROOT_DIR, filePath),
                line: idx + 1,
                token
              });
            }
          }
        });
      }

      expect(
        violations,
        `VAZAMENTO DE DOM NO DOMÍNIO! O Domínio deve ser agnóstico à plataforma:\n` +
        violations.map(v => `  - ${v.file}:${v.line} -> Contém "${v.token}"`).join('\n')
      ).toHaveLength(0);
    });

    it('NENHUM arquivo de produção do Domínio pode importar frameworks de teste (vitest, jest)', () => {
      const domainFiles = getAllTsFiles(DOMAIN_DIR);
      const violations: { file: string; line: number; text: string }[] = [];

      for (const filePath of domainFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((lineText, idx) => {
          if (/import\s+.*from\s+['"](vitest|@vitest|jest)['"]/.test(lineText)) {
            violations.push({
              file: path.relative(ROOT_DIR, filePath),
              line: idx + 1,
              text: lineText.trim()
            });
          }
        });
      }

      expect(
        violations,
        `CÓDIGO DE PRODUÇÃO CONTAMINADO POR TESTES! Remova imports de teste do domínio:\n` +
        violations.map(v => `  - ${v.file}:${v.line} -> ${v.text}`).join('\n')
      ).toHaveLength(0);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. LIMITES DE TAMANHO & RESPONSABILIDADE ÚNICA (SRP & GOD CLASS GUARD)     */
  /* -------------------------------------------------------------------------- */
  describe('2. Governança de Tamanho de Arquivos e Prevenção de God Classes', () => {
    const HARD_CEILING_LINES = 600; // Teto absoluto inegociável
    const SOFT_WARNING_LINES = 350; // Limiar de alerta de inchaço

    // Whitelist para fachadas/orquestradores centrais e mapas declarativos existentes
    const LINE_CEILING_WHITELIST = new Set([
      'typescript/domain/DomainFacade.ts',
      'typescript/domain/ObjectModule/ObjectElementManager.ts',
      'typescript/domain/ObjectModule/Maps/VilgemWorld.ts'
    ]);

    it(`Nenhum arquivo no Domínio pode ultrapassar o teto estrito de ${HARD_CEILING_LINES} linhas`, () => {
      const domainFiles = getAllTsFiles(DOMAIN_DIR);
      const bloatedFiles: { file: string; lines: number }[] = [];

      for (const filePath of domainFiles) {
        const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
        if (LINE_CEILING_WHITELIST.has(relPath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const totalLines = content.split('\n').length;

        if (totalLines > HARD_CEILING_LINES) {
          bloatedFiles.push({
            file: relPath,
            lines: totalLines
          });
        }
      }

      expect(
        bloatedFiles,
        `VIOLAÇÃO DE SRP / GOD CLASS DETECTADA! Os seguintes arquivos excedem ${HARD_CEILING_LINES} linhas:\n` +
        bloatedFiles.map(b => `  - ${b.file} (${b.lines} linhas)`).join('\n') +
        `\nFatie esses módulos em componentes menores antes de submeter o código.`
      ).toHaveLength(0);
    });

    it('Rastreamento de arquivos com tendência a inchaço (> 350 linhas)', () => {
      const domainFiles = getAllTsFiles(DOMAIN_DIR);
      const warningFiles = domainFiles
        .map(f => ({ file: path.relative(ROOT_DIR, f), lines: fs.readFileSync(f, 'utf-8').split('\n').length }))
        .filter(f => f.lines > SOFT_WARNING_LINES && f.lines <= HARD_CEILING_LINES)
        .sort((a, b) => b.lines - a.lines);

      if (warningFiles.length > 0) {
        console.warn(
          `\n⚠️  [ALERTA DE REVISÃO DE SRP] Arquivos próximos do limite (> ${SOFT_WARNING_LINES} linhas):\n` +
          warningFiles.map(w => `   • ${w.file}: ${w.lines} linhas`).join('\n')
        );
      }
      expect(warningFiles.length).toBeLessThanOrEqual(25);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. ANTI-PATTERNS DE IA & BOAS PRÁTICAS SEMÂNTICAS                          */
  /* -------------------------------------------------------------------------- */
  describe('3. Blindagem Semântica Contra Anti-Patterns Comuns de IA', () => {
    // Whitelist para exceções legadas conhecidas enquanto são refatoradas para ILogger
    const CONSOLE_LOG_WHITELIST = new Set([
      'typescript/domain/ObjectModule/Collision.worker.ts',
      'typescript/domain/DomainFacade.ts',
      'typescript/domain/ObjectModule/Entities/Player/components/PlayerClassManager.ts'
    ]);

    it('Proibição de console.log() solto em novos arquivos do Domínio (deve usar ILogger / EventManager)', () => {
      const domainFiles = getAllTsFiles(DOMAIN_DIR);
      const violations: { file: string; line: number; text: string }[] = [];

      for (const filePath of domainFiles) {
        const relPath = path.relative(ROOT_DIR, filePath);
        if (CONSOLE_LOG_WHITELIST.has(relPath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((lineText, idx) => {
          const trimmed = lineText.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

          if (/\bconsole\.(log|warn|error|info|debug)\s*\(/.test(lineText)) {
            violations.push({
              file: relPath,
              line: idx + 1,
              text: trimmed
            });
          }
        });
      }

      expect(
        violations,
        `USO INDEVIDO DE CONSOLE NO DOMÍNIO! Use a porta ILogger ou barramento de eventos:\n` +
        violations.map(v => `  - ${v.file}:${v.line} -> ${v.text}`).join('\n')
      ).toHaveLength(0);
    });

    it('Proibição de marcadores de código incompleto ou alucinações de IA (ex: "TODO: implement", "Placeholder logic")', () => {
      const domainFiles = getAllTsFiles(DOMAIN_DIR);
      const lazyTokens = [
        'TODO: implement',
        'FIXME: implement',
        '// Placeholder implementation',
        '// Replace this with real logic',
        '// Not implemented yet'
      ];

      const violations: { file: string; line: number; token: string }[] = [];

      for (const filePath of domainFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((lineText, idx) => {
          for (const token of lazyTokens) {
            if (lineText.toLowerCase().includes(token.toLowerCase())) {
              violations.push({
                file: path.relative(ROOT_DIR, filePath),
                line: idx + 1,
                token
              });
            }
          }
        });
      }

      expect(
        violations,
        `CÓDIGO INCOMPLETO / LAZY IMPLEMENTATION DETECTADA NO DOMÍNIO:\n` +
        violations.map(v => `  - ${v.file}:${v.line} -> Marcador: "${v.token}"`).join('\n')
      ).toHaveLength(0);
    });
  });
});
