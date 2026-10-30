import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CriticalDependenciesValidator } from '../compliance/CriticalDependenciesValidator';

describe('Regression - Critical Dependencies & Active LTS Verification Security Net', () => {
  const ROOT_DIR = path.resolve(__dirname, '../../../');
  const PACKAGE_JSON_PATH = path.resolve(ROOT_DIR, 'package.json');
  const WORKFLOWS_DIR = path.resolve(ROOT_DIR, '.github/workflows');

  function getWorkflowFiles(): { name: string; content: string }[] {
    if (!fs.existsSync(WORKFLOWS_DIR)) return [];
    return fs
      .readdirSync(WORKFLOWS_DIR)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
      .map(f => ({
        name: f,
        content: fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf-8')
      }));
  }

  /* -------------------------------------------------------------------------- */
  /* CASO 1: VERIFICAÇÃO DE VULNERABILIDADES E ERROS CRÍTICOS NAS DEPENDÊNCIAS */
  /* -------------------------------------------------------------------------- */
  describe('Caso 1: Zero Vulnerabilidades Críticas nas Dependências', () => {
    it('o grafo de dependências não deve conter nenhuma vulnerabilidade de nível crítico', () => {
      let auditJson: any = null;
      try {
        //? Executa npm audit com saída JSON para inspeção estrutural das vulnerabilidades
        const stdout = execSync('npm audit --json', {
          cwd: ROOT_DIR,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        });
        auditJson = JSON.parse(stdout);
      } catch (err: any) {
        if (err.stdout) {
          try {
            auditJson = JSON.parse(err.stdout);
          } catch {
            //? Se não for JSON válido, falha explicitamente
          }
        }
      }

      expect(auditJson, 'Não foi possível extrair o relatório do npm audit').not.toBeNull();
      const report = CriticalDependenciesValidator.auditVulnerabilitiesJson(auditJson);

      if (!report.valid) {
        const details = report.findings
          .map(f => `  • [${f.severity}] ${f.message} -> ${f.detail || ''}`)
          .join('\n');
        expect.fail(`[VULNERABILIDADES CRÍTICAS DETECTADAS]:\n${details}`);
      }
      expect(report.valid).toBe(true);
      expect(report.findings).toHaveLength(0);
    });

    it('a resolução das dependências deve ser limpa e sem erros fatais no npm install', () => {
      //? Executa verificação dry-run nativa garantindo ausência de erros de grafo (Arborist edgesOut)
      let exitCode = 0;
      try {
        execSync('npm install --dry-run', {
          cwd: ROOT_DIR,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch {
        exitCode = 1;
      }

      expect(exitCode).toBe(0);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 2: CONFORMIDADE COM VERSÕES LTS MAIS RECENTES E MODERNAS              */
  /* -------------------------------------------------------------------------- */
  describe('Caso 2: Dependências Críticas nas Versões LTS e Suportadas Mais Recentes', () => {
    it('todas as ferramentas e bibliotecas críticas do package.json devem atender aos requisitos mínimos modernos', () => {
      expect(fs.existsSync(PACKAGE_JSON_PATH)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));

      const report = CriticalDependenciesValidator.auditCriticalFrameworkVersions(pkg);
      if (!report.valid) {
        const details = report.findings
          .map(f => `  • [${f.target}] ${f.message} (${f.detail || ''})`)
          .join('\n');
        expect.fail(`[DEPENDÊNCIAS CRÍTICAS DEFASADAS OU DESALINHADAS]:\n${details}`);
      }

      expect(report.valid).toBe(true);
      expect(report.findings).toHaveLength(0);
    });

    it('todos os fluxos de CI (.github/workflows) devem utilizar Node.js em versão LTS ativa (Node 22)', () => {
      const workflows = getWorkflowFiles();
      expect(workflows.length).toBeGreaterThan(0);

      const allFindings = workflows.flatMap(w => {
        const report = CriticalDependenciesValidator.auditWorkflowNodeLts(w.content, w.name);
        return report.findings;
      });

      if (allFindings.length > 0) {
        const details = allFindings
          .map(f => `  • [${f.target}] ${f.message}`)
          .join('\n');
        expect.fail(`[WORKFLOWS DE CI COM NODE.JS DEFASADO/EOL]:\n${details}`);
      }

      expect(allFindings).toHaveLength(0);
    });
  });
});
