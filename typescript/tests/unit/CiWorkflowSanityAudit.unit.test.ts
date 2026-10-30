import { describe, it, expect } from 'vitest';
import { CiWorkflowValidator } from '../compliance/CiWorkflowValidator';

describe('Unit - CiWorkflowValidator', () => {
  describe('1. Validação de Peer Dependencies do Vitest / Coverage', () => {
    it('deve aprovar dependências semver perfeitamente alinhadas', () => {
      const packageJson = {
        devDependencies: {
          vitest: '^4.1.12',
          '@vitest/coverage-v8': '^4.1.12'
        }
      };

      const result = CiWorkflowValidator.validateVitestPeerDependencies(packageJson);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve reprovar quando vitest ou coverage-v8 estiverem ausentes', () => {
      const resultMissing = CiWorkflowValidator.validateVitestPeerDependencies({
        devDependencies: { vitest: '^4.1.12' }
      });
      expect(resultMissing.valid).toBe(false);
      expect(resultMissing.errors.some(e => e.includes('@vitest/coverage-v8'))).toBe(true);
    });

    it('deve reprovar incompatibilidade de major ou minor entre vitest e coverage', () => {
      const packageJson = {
        devDependencies: {
          vitest: '^4.2.0',
          '@vitest/coverage-v8': '^4.1.12'
        }
      };

      const result = CiWorkflowValidator.validateVitestPeerDependencies(packageJson);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Incompatibilidade crítica de versão'))).toBe(true);
    });

    it('deve reprovar quando coverage-v8 estiver cravado em patch defasado (causa do crash Arborist)', () => {
      const packageJson = {
        devDependencies: {
          vitest: '^4.1.12',
          '@vitest/coverage-v8': '4.1.11'
        }
      };

      const result = CiWorkflowValidator.validateVitestPeerDependencies(packageJson);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('está defasado'))).toBe(true);
    });
  });

  describe('2. Proibição de Workarounds e Auditoria contra --legacy-peer-deps', () => {
    it('deve aprovar workflows que realizam npm install limpo sem flags legadas', () => {
      const yaml = `
      - name: Install dependencies
        run: npm install
      `;
      const findings = CiWorkflowValidator.auditNoLegacyPeerDeps(yaml, 'test.yml');
      expect(findings).toHaveLength(0);
    });

    it('deve reprovar qualquer workflow que contenha --legacy-peer-deps', () => {
      const yaml = `
      - name: Install dependencies
        run: npm install --legacy-peer-deps
      `;
      const findings = CiWorkflowValidator.auditNoLegacyPeerDeps(yaml, 'test.yml');
      expect(findings).toHaveLength(1);
      expect(findings[0]!.rule).toBe('FORBIDDEN_LEGACY_PEER_DEPS');
    });

    it('deve reprovar qualquer comando npm install com flag --force', () => {
      const yaml = `
      - name: Install dependencies
        run: npm install --force
      `;
      const findings = CiWorkflowValidator.auditNoLegacyPeerDeps(yaml, 'test.yml');
      expect(findings).toHaveLength(1);
      expect(findings[0]!.rule).toBe('FORBIDDEN_NPM_FORCE_FLAG');
    });

    it('deve ignorar ocorrências em comentários de documentação YAML', () => {
      const yaml = `
      # run: npm install --legacy-peer-deps
      - name: Install
        run: npm install
      `;
      const findings = CiWorkflowValidator.auditNoLegacyPeerDeps(yaml, 'test.yml');
      expect(findings).toHaveLength(0);
    });
  });

  describe('3. Auditoria de URLs de Releases do Ollama', () => {
    it('deve aprovar pacotes empacotados modernos (.tar.zst, .tgz, .zip)', () => {
      const yaml = `
      curl -L https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64.tar.zst -o ollama.tar.zst
      curl -L https://github.com/ollama/ollama/releases/latest/download/ollama-darwin.tgz -o ollama.tgz
      curl -L https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip -o ollama.zip
      `;
      const findings = CiWorkflowValidator.auditOllamaDownloadUrls(yaml, 'build.yml');
      expect(findings).toHaveLength(0);
    });

    it('deve reprovar URLs de binários crus legados que geram 404', () => {
      const yaml = `
      curl -L https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64 -o ollama
      curl -L https://github.com/ollama/ollama/releases/latest/download/ollama-darwin -o ollama
      curl -L https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.exe -o ollama.exe
      `;
      const findings = CiWorkflowValidator.auditOllamaDownloadUrls(yaml, 'build.yml');
      expect(findings).toHaveLength(3);
      expect(findings.map(f => f.rule)).toEqual([
        'OLLAMA_RAW_BINARY_DEPRECATED_LINUX',
        'OLLAMA_RAW_BINARY_DEPRECATED_DARWIN',
        'OLLAMA_RAW_BINARY_DEPRECATED_WINDOWS'
      ]);
    });
  });

  describe('4. Auditoria de Dependência zstd no Ubuntu', () => {
    it('deve aprovar quando o apt-get install contém zstd para descompactar .tar.zst', () => {
      const yaml = `
      sudo apt-get install -y libwebkit2gtk-4.1-dev patchelf zstd
      tar --zstd -xf ollama.tar.zst bin/ollama
      `;
      const findings = CiWorkflowValidator.auditUbuntuZstdDependency(yaml, 'build.yml');
      expect(findings).toHaveLength(0);
    });

    it('deve reprovar quando descompacta .tar.zst mas o apt-get não instala zstd', () => {
      const yaml = `
      sudo apt-get install -y libwebkit2gtk-4.1-dev patchelf
      tar --zstd -xf ollama.tar.zst bin/ollama
      `;
      const findings = CiWorkflowValidator.auditUbuntuZstdDependency(yaml, 'build.yml');
      expect(findings).toHaveLength(1);
      expect(findings[0]!.rule).toBe('UBUNTU_ZSTD_DEPENDENCY_REQUIRED');
    });
  });

  describe('5. Auditoria de Convenção de Plataformas do Panteão Engine no NPM', () => {
    it('deve aprovar nomes oficiais Node (darwin-arm64, win32-x64, linux-x64) com flags corretas', () => {
      const yaml = `
      npm install panteao-engine-linux-x64 --no-save
      npm install panteao-engine-darwin-arm64 --no-save
      npm install panteao-engine-win32-x64 --no-save
      `;
      const findings = CiWorkflowValidator.auditPanteaoEnginePackageNames(yaml, 'build.yml');
      expect(findings).toHaveLength(0);
    });

    it('deve reprovar nomes incorretos "macos" e "windows" que retornam E404 no NPM', () => {
      const yaml = `
      npm install panteao-engine-macos-arm64 --no-save
      npm install panteao-engine-windows-x64 --no-save
      `;
      const findings = CiWorkflowValidator.auditPanteaoEnginePackageNames(yaml, 'build.yml');
      expect(findings).toHaveLength(2);
      expect(findings.map(f => f.rule)).toEqual([
        'PANTEAO_ENGINE_INVALID_PLATFORM_MACOS',
        'PANTEAO_ENGINE_INVALID_PLATFORM_WINDOWS'
      ]);
    });

    it('deve exigir --no-save ao instalar pacotes de sidecar', () => {
      const yaml = `
      npm install panteao-engine-darwin-arm64
      `;
      const findings = CiWorkflowValidator.auditPanteaoEnginePackageNames(yaml, 'build.yml');
      expect(findings).toHaveLength(1);
      expect(findings[0]!.rule).toBe('PANTEAO_ENGINE_NO_SAVE_REQUIRED');
    });
  });
});
