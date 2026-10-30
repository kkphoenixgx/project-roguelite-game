import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CiWorkflowValidator } from '../compliance/CiWorkflowValidator';

describe('Regression - CI Pipeline & Cross-Platform Workflows Security Net', () => {
  const ROOT_DIR = path.resolve(__dirname, '../../../');
  const WORKFLOWS_DIR = path.resolve(ROOT_DIR, '.github/workflows');
  const PACKAGE_JSON_PATH = path.resolve(ROOT_DIR, 'package.json');

  function getWorkflowFiles(): { name: string; content: string }[] {
    if (!fs.existsSync(WORKFLOWS_DIR)) return [];
    const files = fs.readdirSync(WORKFLOWS_DIR);
    return files
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
      .map(f => ({
        name: f,
        content: fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf-8')
      }));
  }

  /* -------------------------------------------------------------------------- */
  /* CASO 1: PREVENÇÃO DE QUEBRA NO NPM INSTALL & BANIMENTO DE WORKAROUNDS      */
  /* -------------------------------------------------------------------------- */
  describe('Caso 1: Alinhamento de Dependências e Banimento de --legacy-peer-deps', () => {
    it('vitest e @vitest/coverage-v8 devem possuir semver perfeitamente compatível no package.json', () => {
      expect(fs.existsSync(PACKAGE_JSON_PATH)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));

      const result = CiWorkflowValidator.validateVitestPeerDependencies(pkg);
      expect(
        result.valid,
        `[DESALINHAMENTO FATAL DE PEER DEPENDENCIES]\n${result.errors.join('\n')}`
      ).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('nenhum workflow em .github/workflows/*.yml deve utilizar --legacy-peer-deps nem --force', () => {
      const workflows = getWorkflowFiles();
      expect(workflows.length).toBeGreaterThan(0);

      const allFindings = workflows.flatMap(w =>
        CiWorkflowValidator.auditNoLegacyPeerDeps(w.content, w.name)
      );

      if (allFindings.length > 0) {
        const report = allFindings
          .map(f => `  • ${f.workflow}:${f.line} -> "${f.snippet}" (${f.message})`)
          .join('\n');
        expect.fail(`[VIOLAÇÃO DE POLÍTICA DE DEPENDÊNCIAS - WORKAROUND DETECTADO]:\n${report}`);
      }
      expect(allFindings).toHaveLength(0);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 2: PREVENÇÃO DE ERRO 404 NO DOWNLOAD DO OLLAMA (LINUX, MAC E WINDOWS) */
  /* -------------------------------------------------------------------------- */
  describe('Caso 2: Formatos de Release Compactados do Ollama (.tar.zst, .tgz, .zip)', () => {
    it('nenhum workflow deve apontar para binários crus legados do Ollama que retornam HTTP 404', () => {
      const workflows = getWorkflowFiles();
      expect(workflows.length).toBeGreaterThan(0);

      const allFindings = workflows.flatMap(w =>
        CiWorkflowValidator.auditOllamaDownloadUrls(w.content, w.name)
      );

      if (allFindings.length > 0) {
        const report = allFindings
          .map(f => `  • ${f.workflow}:${f.line} -> "${f.snippet}" (${f.message})`)
          .join('\n');
        expect.fail(`[URLS 404 DE RELEASE OLLAMA DETECTADAS]:\n${report}`);
      }
      expect(allFindings).toHaveLength(0);
    });

    it('build-release.yml deve conter downloads compactados válidos para as 3 plataformas', () => {
      const buildReleasePath = path.join(WORKFLOWS_DIR, 'build-release.yml');
      expect(fs.existsSync(buildReleasePath)).toBe(true);
      const content = fs.readFileSync(buildReleasePath, 'utf-8');

      //? Linux: .tar.zst com tar --zstd
      expect(content).toContain('ollama-linux-amd64.tar.zst');
      expect(content).toMatch(/tar\s+--zstd\s+-xf\s+ollama\.tar\.zst/);

      //? macOS: .tgz com tar -zxf
      expect(content).toContain('ollama-darwin.tgz');
      expect(content).toMatch(/tar\s+-zxf\s+ollama\.tgz/);

      //? Windows: .zip com unzip
      expect(content).toContain('ollama-windows-amd64.zip');
      expect(content).toMatch(/unzip\s+-o\s+ollama\.zip/);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 3: PREVENÇÃO DA FALTA DO DESCOMPACTADOR ZSTD NO UBUNTU                */
  /* -------------------------------------------------------------------------- */
  describe('Caso 3: Dependência de Sistema zstd no Runner do Ubuntu', () => {
    it('workflows que descompactam .tar.zst no Ubuntu devem instalar zstd via apt-get', () => {
      const workflows = getWorkflowFiles();
      expect(workflows.length).toBeGreaterThan(0);

      const allFindings = workflows.flatMap(w =>
        CiWorkflowValidator.auditUbuntuZstdDependency(w.content, w.name)
      );

      if (allFindings.length > 0) {
        const report = allFindings
          .map(f => `  • ${f.workflow} -> ${f.message}`)
          .join('\n');
        expect.fail(`[DEPENDÊNCIA FALTANTE NO UBUNTU]:\n${report}`);
      }
      expect(allFindings).toHaveLength(0);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* CASO 4: PREVENÇÃO DE NOMES ERRADOS DE PACOTES DA PANTEÃO ENGINE (E404)     */
  /* -------------------------------------------------------------------------- */
  describe('Caso 4: Convenção de Plataformas Oficiais do Node para Panteão Engine', () => {
    it('sidecars da Panteão Engine devem usar darwin e win32, nunca macos ou windows', () => {
      const workflows = getWorkflowFiles();
      expect(workflows.length).toBeGreaterThan(0);

      const allFindings = workflows.flatMap(w =>
        CiWorkflowValidator.auditPanteaoEnginePackageNames(w.content, w.name)
      );

      if (allFindings.length > 0) {
        const report = allFindings
          .map(f => `  • ${f.workflow}:${f.line} -> "${f.snippet}" (${f.message})`)
          .join('\n');
        expect.fail(`[NOMENCLATURA INVÁLIDA DE PACOTES DE SIDECAR (E404)]:\n${report}`);
      }
      expect(allFindings).toHaveLength(0);
    });

    it('build-release.yml deve instalar panteao-engine-darwin-arm64 e panteao-engine-win32-x64', () => {
      const buildReleasePath = path.join(WORKFLOWS_DIR, 'build-release.yml');
      expect(fs.existsSync(buildReleasePath)).toBe(true);
      const content = fs.readFileSync(buildReleasePath, 'utf-8');

      expect(content).toContain('panteao-engine-linux-x64');
      expect(content).toContain('panteao-engine-darwin-arm64');
      expect(content).toContain('panteao-engine-win32-x64');

      //? Proíbe regressão aos nomes antigos que causavam E404
      expect(content).not.toContain('panteao-engine-macos');
      expect(content).not.toContain('panteao-engine-windows');
    });
  });
});
