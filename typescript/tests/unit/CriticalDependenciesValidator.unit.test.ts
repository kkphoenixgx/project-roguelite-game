import { describe, it, expect } from 'vitest';
import { CriticalDependenciesValidator } from '../compliance/CriticalDependenciesValidator';

describe('Unit - CriticalDependenciesValidator', () => {
  describe('1. Auditoria de Vulnerabilidades Críticas (auditVulnerabilitiesJson)', () => {
    it('deve aprovar auditoria com 0 vulnerabilidades críticas', () => {
      const auditJson = {
        metadata: {
          vulnerabilities: {
            info: 0,
            low: 1,
            moderate: 3,
            high: 0,
            critical: 0,
            total: 4
          }
        }
      };

      const result = CriticalDependenciesValidator.auditVulnerabilitiesJson(auditJson);
      expect(result.valid).toBe(true);
      expect(result.findings).toHaveLength(0);
    });

    it('deve reprovar auditoria quando houver vulnerabilidades críticas e expor os pacotes', () => {
      const auditJson = {
        metadata: {
          vulnerabilities: {
            critical: 2
          }
        },
        vulnerabilities: {
          '@storybook/core': { severity: 'critical', range: '8.2.0 - 8.6.18' },
          'malicious-pkg': { severity: 'critical', range: '*' }
        }
      };

      const result = CriticalDependenciesValidator.auditVulnerabilitiesJson(auditJson);
      expect(result.valid).toBe(false);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]!.rule).toBe('ZERO_CRITICAL_VULNERABILITIES');
      expect(result.findings[0]!.severity).toBe('CRITICAL');
      expect(result.findings[0]!.detail).toContain('@storybook/core');
      expect(result.findings[0]!.detail).toContain('malicious-pkg');
    });

    it('deve reprovar caso o json de auditoria seja nulo ou indefinido', () => {
      const result = CriticalDependenciesValidator.auditVulnerabilitiesJson(null);
      expect(result.valid).toBe(false);
      expect(result.findings[0]!.rule).toBe('AUDIT_REPORT_MISSING');
    });
  });

  describe('2. Auditoria de Dependências Críticas e Versões LTS (auditCriticalFrameworkVersions)', () => {
    it('deve aprovar dependências críticas devidamente alinhadas e em versões LTS ativas', () => {
      const packageJson = {
        devDependencies: {
          typescript: '^5.9.3',
          vite: '^7.1.12',
          vitest: '^4.1.12',
          '@vitest/coverage-v8': '^4.1.12',
          '@tauri-apps/api': '^2.10.1',
          '@tauri-apps/cli': '^2.0.0'
        }
      };

      const result = CriticalDependenciesValidator.auditCriticalFrameworkVersions(packageJson);
      expect(result.valid).toBe(true);
      expect(result.findings).toHaveLength(0);
    });

    it('deve reprovar se qualquer dependência crítica estiver ausente', () => {
      const packageJson = {
        devDependencies: {
          typescript: '^5.9.3',
          vite: '^7.1.12'
        }
      };

      const result = CriticalDependenciesValidator.auditCriticalFrameworkVersions(packageJson);
      expect(result.valid).toBe(false);
      expect(result.findings.some(f => f.rule === 'CRITICAL_DEPENDENCY_MISSING')).toBe(true);
    });

    it('deve reprovar se uma dependência crítica estiver abaixo da versão LTS/moderna exigida', () => {
      const packageJson = {
        devDependencies: {
          typescript: '^4.9.5', // Defasado: mínimo exigido é 5
          vite: '^7.1.12',
          vitest: '^4.1.12',
          '@vitest/coverage-v8': '^4.1.12',
          '@tauri-apps/api': '^2.10.1',
          '@tauri-apps/cli': '^2.0.0'
        }
      };

      const result = CriticalDependenciesValidator.auditCriticalFrameworkVersions(packageJson);
      expect(result.valid).toBe(false);
      expect(result.findings.some(f => f.target === 'typescript' && f.rule === 'OUTDATED_CRITICAL_DEPENDENCY')).toBe(true);
    });

    it('deve reprovar desalinhamento entre vitest e @vitest/coverage-v8', () => {
      const packageJson = {
        devDependencies: {
          typescript: '^5.9.3',
          vite: '^7.1.12',
          vitest: '^4.2.0',
          '@vitest/coverage-v8': '^4.1.12',
          '@tauri-apps/api': '^2.10.1',
          '@tauri-apps/cli': '^2.0.0'
        }
      };

      const result = CriticalDependenciesValidator.auditCriticalFrameworkVersions(packageJson);
      expect(result.valid).toBe(false);
      expect(result.findings.some(f => f.rule === 'PEER_DEPENDENCY_PARITY_MISMATCH')).toBe(true);
    });

    it('deve reprovar engines.node abaixo do LTS aceito (< 22, como Node 20 ou inferior)', () => {
      const packageJson = {
        engines: { node: '>=20.0.0' },
        devDependencies: {
          typescript: '^5.9.3',
          vite: '^7.1.12',
          vitest: '^4.1.12',
          '@vitest/coverage-v8': '^4.1.12',
          '@tauri-apps/api': '^2.10.1',
          '@tauri-apps/cli': '^2.0.0'
        }
      };

      const result = CriticalDependenciesValidator.auditCriticalFrameworkVersions(packageJson);
      expect(result.valid).toBe(false);
      expect(result.findings.some(f => f.rule === 'OUTDATED_NODE_ENGINE')).toBe(true);
    });
  });

  describe('3. Auditoria de Versão do Node.js nos Workflows de CI (auditWorkflowNodeLts)', () => {
    it('deve aprovar workflows que configuram Node.js LTS ativo (Node 22)', () => {
      const yaml = `
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      `;

      const result = CriticalDependenciesValidator.auditWorkflowNodeLts(yaml, 'ci.yml');
      expect(result.valid).toBe(true);
      expect(result.findings).toHaveLength(0);
    });

    it('deve reprovar workflows que configuram versões EOL/descontinuadas do Node.js (ex: 18 ou 20)', () => {
      const yaml = `
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      `;

      const result = CriticalDependenciesValidator.auditWorkflowNodeLts(yaml, 'ci.yml');
      expect(result.valid).toBe(false);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]!.rule).toBe('OUTDATED_NODE_LTS_IN_CI');
    });

    it('deve ignorar ocorrências comentadas', () => {
      const yaml = `
      # node-version: 16
      - name: Setup Node.js
        with:
          node-version: '22'
      `;

      const result = CriticalDependenciesValidator.auditWorkflowNodeLts(yaml, 'ci.yml');
      expect(result.valid).toBe(true);
    });
  });
});
