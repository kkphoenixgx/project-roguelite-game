import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ============================================================================
 * TESTE DE CONFORMIDADE: ISOLAMENTO TOTAL DAS DEPENDÊNCIAS DE DIAGRAMAS
 * ============================================================================
 * Garante que ferramentas instáveis de diagramação e AST:
 *   - dependency-cruiser
 *   - @optave/codegraph
 *   - xstate
 *   - @xstate/graph
 *   - tsx
 * ESTEJAM 100% ISOLADAS fora do código de produção do jogo (typescript/domain e typescript/adapters).
 * Nenhuma classe, módulo, renderizador ou regra de negócio pode importar direta ou
 * indiretamente essas ferramentas de documentação.
 */
describe('Compliance & Architecture: Isolamento Estrito de Ferramentas de Diagramas', () => {
  const ROOT_DIR = path.resolve(__dirname, '../../..');
  const GAME_SOURCE_DIRS = [
    path.resolve(ROOT_DIR, 'typescript/domain'),
    path.resolve(ROOT_DIR, 'typescript/adapters')
  ];

  const DIAGRAM_DEPENDENCIES = [
    'dependency-cruiser',
    'xstate',
    '@xstate/graph',
    'tsx'
  ];

  function getAllTsFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getAllTsFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) && !entry.name.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('deve garantir que NENHUM arquivo em typescript/domain/ importa ferramentas de diagramação', () => {
    const domainFiles = getAllTsFiles(path.resolve(ROOT_DIR, 'typescript/domain'));
    const violations: { file: string; line: number; text: string; dependency: string }[] = [];

    for (const file of domainFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Ignora comentários
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        for (const dep of DIAGRAM_DEPENDENCIES) {
          const importPattern = new RegExp(`from\\s+['"]${dep}(?:/.*)?['"]|require\\s*\\(['"]${dep}(?:/.*)?['"]\\)`);
          if (importPattern.test(line)) {
            violations.push({
              file: path.relative(ROOT_DIR, file),
              line: idx + 1,
              text: trimmed,
              dependency: dep
            });
          }
        }
      });
    }

    expect(
      violations,
      `Violação de Isolamento: O Domínio importou ferramentas de diagramação instáveis:\n${violations
        .map(v => `  - ${v.file}:${v.line} -> importa '${v.dependency}' (${v.text})`)
        .join('\n')}`
    ).toHaveLength(0);
  });

  it('deve garantir que NENHUM arquivo em typescript/adapters/ importa ferramentas de diagramação', () => {
    const adapterFiles = getAllTsFiles(path.resolve(ROOT_DIR, 'typescript/adapters'));
    const violations: { file: string; line: number; text: string; dependency: string }[] = [];

    for (const file of adapterFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        for (const dep of DIAGRAM_DEPENDENCIES) {
          const importPattern = new RegExp(`from\\s+['"]${dep}(?:/.*)?['"]|require\\s*\\(['"]${dep}(?:/.*)?['"]\\)`);
          if (importPattern.test(line)) {
            violations.push({
              file: path.relative(ROOT_DIR, file),
              line: idx + 1,
              text: trimmed,
              dependency: dep
            });
          }
        }
      });
    }

    expect(
      violations,
      `Violação de Isolamento: A camada de Adaptadores importou ferramentas de diagramação instáveis:\n${violations
        .map(v => `  - ${v.file}:${v.line} -> importa '${v.dependency}' (${v.text})`)
        .join('\n')}`
    ).toHaveLength(0);
  });

  it('deve garantir que essas ferramentas estão cadastradas estritamente em devDependencies no package.json (nunca em dependencies de produção)', () => {
    const packageJsonPath = path.resolve(ROOT_DIR, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    const prodDeps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});

    for (const dep of DIAGRAM_DEPENDENCIES) {
      if (dep === 'tsx') continue; // tsx pode ser invocado via npx
      expect(prodDeps, `A dependência '${dep}' não pode estar em 'dependencies' de runtime`).not.toContain(dep);
      expect(devDeps, `A dependência '${dep}' deve estar isolada em 'devDependencies'`).toContain(dep);
    }
  });

  it('deve garantir que o script de diagramas docs/diagrams/scripts/update-diagrams.ts existe e é o único consumidor autorizado', () => {
    const scriptPath = path.resolve(ROOT_DIR, 'docs/diagrams/scripts/update-diagrams.ts');
    expect(fs.existsSync(scriptPath), 'O orquestrador docs/diagrams/scripts/update-diagrams.ts deve existir').toBe(true);

    const stateScriptPath = path.resolve(ROOT_DIR, 'docs/diagrams/scripts/generate-state-diagram.ts');
    expect(fs.existsSync(stateScriptPath), 'O script docs/diagrams/scripts/generate-state-diagram.ts deve existir').toBe(true);
  });
});
