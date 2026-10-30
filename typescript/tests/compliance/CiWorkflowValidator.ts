import * as fs from 'fs';
import * as path from 'path';

export interface PeerDependencyAuditResult {
  valid: boolean;
  errors: string[];
  vitestVersion?: string;
  coverageVersion?: string;
}

export interface WorkflowAuditFinding {
  workflow: string;
  line: number;
  rule: string;
  message: string;
  snippet: string;
}

/**
 * Validador estrito para governança de CI/CD e prevenção de falhas de build cross-platform.
 * Blindagem contra:
 * 1. Desalinhamento fatal de peer dependencies do Vitest / Coverage-v8 (crash Arborist).
 * 2. Uso indevido de flags de workaround como --legacy-peer-deps (exigência de dependências limpas e alinhadas).
 * 3. URLs 404 de releases descontinuadas do Ollama (exigência de .tar.zst, .tgz, .zip).
 * 4. Falta de dependência nativa zstd no runner Ubuntu para descompactação de tar.zst.
 * 5. Nomes incorretos de pacotes de sidecar do Panteão Engine (macos vs darwin, windows vs win32).
 */
export class CiWorkflowValidator {
  /**
   * Valida compatibilidade semver estrita entre Vitest e @vitest/coverage-v8.
   */
  public static validateVitestPeerDependencies(packageJson: any): PeerDependencyAuditResult {
    const devDeps = packageJson.devDependencies || {};
    const deps = packageJson.dependencies || {};
    const allDeps = { ...deps, ...devDeps };

    const vitestRaw = allDeps['vitest'];
    const coverageRaw = allDeps['@vitest/coverage-v8'];

    const errors: string[] = [];

    if (!vitestRaw) {
      errors.push('Dependência "vitest" não encontrada no package.json');
    }
    if (!coverageRaw) {
      errors.push('Dependência "@vitest/coverage-v8" não encontrada no package.json');
    }

    if (vitestRaw && coverageRaw) {
      const cleanVitest = vitestRaw.replace(/^[~^=>< ]+/, '').trim();
      const cleanCoverage = coverageRaw.replace(/^[~^=>< ]+/, '').trim();

      const vitestParts = cleanVitest.split('.').map((n: string) => parseInt(n, 10));
      const coverageParts = cleanCoverage.split('.').map((n: string) => parseInt(n, 10));

      //? Major e Minor DEVEM ser idênticos entre vitest e coverage-v8
      if (vitestParts[0] !== coverageParts[0] || vitestParts[1] !== coverageParts[1]) {
        errors.push(
          `Incompatibilidade crítica de versão: vitest (${vitestRaw}) e @vitest/coverage-v8 (${coverageRaw}) devem compartilhar o mesmo major e minor.`
        );
      }

      //? Se vitest é ^4.1.12, coverage-v8 não pode ser inferior (ex: 4.1.11 cravado)
      if (vitestParts.length >= 3 && coverageParts.length >= 3) {
        if (coverageParts[2] < vitestParts[2] && !coverageRaw.startsWith('^')) {
          errors.push(
            `@vitest/coverage-v8 (${coverageRaw}) está defasado em relação ao vitest (${vitestRaw}). O provider v8 exige versão de par alinhada para não quebrar o npm install.`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      vitestVersion: vitestRaw,
      coverageVersion: coverageRaw
    };
  }

  /**
   * Audita que comandos de instalação de dependências no CI NÃO utilizem --legacy-peer-deps nem --force.
   * Mandato do projeto: sempre atualizar para releases compatíveis/LTS sem usar gambiarras de resolução.
   */
  public static auditNoLegacyPeerDeps(workflowContent: string, workflowName: string): WorkflowAuditFinding[] {
    const findings: WorkflowAuditFinding[] = [];
    const lines = workflowContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]!;
      //? Ignora comentários YAML
      if (lineText.trim().startsWith('#')) continue;

      if (lineText.includes('--legacy-peer-deps')) {
        findings.push({
          workflow: workflowName,
          line: i + 1,
          rule: 'FORBIDDEN_LEGACY_PEER_DEPS',
          message: 'O uso de --legacy-peer-deps é estritamente proibido. O repositório deve manter dependências alinhadas e compatíveis na versão mais recente.',
          snippet: lineText.trim()
        });
      }

      if (/\bnpm\s+(?:install|i)\b[^\n#]*\s+--force\b/.test(lineText)) {
        findings.push({
          workflow: workflowName,
          line: i + 1,
          rule: 'FORBIDDEN_NPM_FORCE_FLAG',
          message: 'O uso de npm install --force é estritamente proibido.',
          snippet: lineText.trim()
        });
      }
    }

    return findings;
  }

  /**
   * Audita URLs de download do Ollama garantindo que utilizam releases compactadas modernas (.tar.zst, .tgz, .zip).
   */
  public static auditOllamaDownloadUrls(workflowContent: string, workflowName: string): WorkflowAuditFinding[] {
    const findings: WorkflowAuditFinding[] = [];
    const lines = workflowContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]!;
      //? Ignora comentários YAML
      if (lineText.trim().startsWith('#')) continue;

      //? Detecta URLs de download do Ollama
      if (/github\.com\/ollama\/ollama\/releases\/.*\/download\//.test(lineText)) {
        //? Bloqueia binários crus legados que retornam 404
        if (/ollama-linux-amd64\b(?!\.tar\.zst)/.test(lineText)) {
          findings.push({
            workflow: workflowName,
            line: i + 1,
            rule: 'OLLAMA_RAW_BINARY_DEPRECATED_LINUX',
            message: 'O repositório do Ollama descontinuou binários crus de Linux. Deve utilizar "ollama-linux-amd64.tar.zst".',
            snippet: lineText.trim()
          });
        }
        if (/ollama-darwin\b(?!\.tgz)/.test(lineText)) {
          findings.push({
            workflow: workflowName,
            line: i + 1,
            rule: 'OLLAMA_RAW_BINARY_DEPRECATED_DARWIN',
            message: 'O repositório do Ollama descontinuou binários crus de macOS. Deve utilizar "ollama-darwin.tgz".',
            snippet: lineText.trim()
          });
        }
        if (/ollama-windows-amd64\.exe\b/.test(lineText)) {
          findings.push({
            workflow: workflowName,
            line: i + 1,
            rule: 'OLLAMA_RAW_BINARY_DEPRECATED_WINDOWS',
            message: 'O release do Ollama para Windows é distribuído como "ollama-windows-amd64.zip".',
            snippet: lineText.trim()
          });
        }
      }
    }

    return findings;
  }

  /**
   * Audita runners Ubuntu garantindo instalação de `zstd` quando houver descompactação de .tar.zst.
   */
  public static auditUbuntuZstdDependency(workflowContent: string, workflowName: string): WorkflowAuditFinding[] {
    const findings: WorkflowAuditFinding[] = [];
    const hasZstdExtraction = /\.tar\.zst\b|tar\s+[^#\n]*--zstd\b|\bzstd\s+-d\b/.test(workflowContent);

    if (hasZstdExtraction) {
      //? Verifica se há comando apt-get install contendo zstd
      const hasZstdAptInstall = /apt-get\s+install\s+[^#\n]*\bzstd\b/m.test(workflowContent);
      if (!hasZstdAptInstall) {
        findings.push({
          workflow: workflowName,
          line: 1,
          rule: 'UBUNTU_ZSTD_DEPENDENCY_REQUIRED',
          message: 'O workflow descompacta arquivos .tar.zst no Ubuntu, mas não instala o pacote "zstd" via apt-get.',
          snippet: 'Falta "zstd" no apt-get install'
        });
      }
    }

    return findings;
  }

  /**
   * Audita nomes de pacotes da Panteão Engine garantindo plataformas oficiais Node.js (darwin, win32, linux).
   */
  public static auditPanteaoEnginePackageNames(workflowContent: string, workflowName: string): WorkflowAuditFinding[] {
    const findings: WorkflowAuditFinding[] = [];
    const lines = workflowContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]!;
      //? Ignora comentários YAML
      if (lineText.trim().startsWith('#')) continue;

      if (/panteao-engine-/.test(lineText)) {
        //? Bloqueia macos em vez de darwin
        if (/panteao-engine-macos\b/.test(lineText)) {
          findings.push({
            workflow: workflowName,
            line: i + 1,
            rule: 'PANTEAO_ENGINE_INVALID_PLATFORM_MACOS',
            message: 'O pacote "panteao-engine-macos-*" não existe no NPM Registry (E404). O padrão Node.js é "panteao-engine-darwin-arm64".',
            snippet: lineText.trim()
          });
        }

        //? Bloqueia windows em vez de win32
        if (/panteao-engine-windows\b/.test(lineText)) {
          findings.push({
            workflow: workflowName,
            line: i + 1,
            rule: 'PANTEAO_ENGINE_INVALID_PLATFORM_WINDOWS',
            message: 'O pacote "panteao-engine-windows-*" não existe no NPM Registry (E404). O padrão Node.js é "panteao-engine-win32-x64".',
            snippet: lineText.trim()
          });
        }

        //? Garante que a instalação do sidecar inclua --no-save
        if (/npm\s+install\s+panteao-engine-/.test(lineText) && !lineText.includes('--no-save')) {
          findings.push({
            workflow: workflowName,
            line: i + 1,
            rule: 'PANTEAO_ENGINE_NO_SAVE_REQUIRED',
            message: 'Instalação de binários de sidecar no CI deve conter "--no-save" para não alterar o package.json de produção.',
            snippet: lineText.trim()
          });
        }
      }
    }

    return findings;
  }
}
