export interface DependencyAuditFinding {
  target: string;
  rule: string;
  severity: 'CRITICAL' | 'HIGH';
  message: string;
  detail?: string;
}

export interface CriticalDependencyAuditReport {
  valid: boolean;
  findings: DependencyAuditFinding[];
}

/**
 * Validador para Governança e Blindagem de Dependências Críticas.
 * Exigências:
 * 1. Zero vulnerabilidades ou erros críticos em pacotes.
 * 2. Dependências críticas devem estar em versões modernas e em conformidade com o ecossistema LTS ativo.
 * 3. Node.js nos workflows de CI deve utilizar versões LTS ativas (>= 20, preferencialmente 22).
 * 4. Banimento absoluto de flags de workaround como --legacy-peer-deps.
 */
export class CriticalDependenciesValidator {
  //? Versão mínima aceitável de Node LTS em ambientes de CI/CD
  public static readonly MINIMUM_NODE_LTS_MAJOR = 20;

  //? Matriz de versões mínimas das dependências críticas de compilação, teste e runtime
  public static readonly CRITICAL_FRAMEWORK_MINIMUMS: Record<string, number> = {
    typescript: 5,
    vite: 6,
    vitest: 4,
    '@vitest/coverage-v8': 4,
    '@tauri-apps/api': 2,
    '@tauri-apps/cli': 2
  };

  /**
   * Audita o relatório JSON do npm audit para garantir 0 vulnerabilidades críticas.
   */
  public static auditVulnerabilitiesJson(auditJson: any): CriticalDependencyAuditReport {
    const findings: DependencyAuditFinding[] = [];

    if (!auditJson) {
      findings.push({
        target: 'npm-audit',
        rule: 'AUDIT_REPORT_MISSING',
        severity: 'CRITICAL',
        message: 'Relatório do npm audit não fornecido para validação.'
      });
      return { valid: false, findings };
    }

    const vulns = auditJson.metadata?.vulnerabilities || {};
    const criticalCount = vulns.critical ?? 0;

    if (criticalCount > 0) {
      //? Coleta detalhes dos pacotes afetados por vulnerabilidades críticas
      const advisories = auditJson.vulnerabilities || {};
      const criticalPackages = Object.entries(advisories)
        .filter(([_, data]: [string, any]) => data?.severity === 'critical')
        .map(([pkg, data]: [string, any]) => `${pkg} (${data?.range || 'todas as versões'})`)
        .join(', ');

      findings.push({
        target: 'npm-dependencies',
        rule: 'ZERO_CRITICAL_VULNERABILITIES',
        severity: 'CRITICAL',
        message: `Foram detectadas ${criticalCount} vulnerabilidade(s) crítica(s) nas dependências.`,
        detail: criticalPackages || 'Consulte o log do npm audit para a lista completa.'
      });
    }

    return {
      valid: findings.length === 0,
      findings
    };
  }

  /**
   * Audita o package.json garantindo que as dependências críticas estejam em versões LTS / modernas compatíveis.
   */
  public static auditCriticalFrameworkVersions(packageJson: any): CriticalDependencyAuditReport {
    const findings: DependencyAuditFinding[] = [];
    const allDeps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {})
    };

    //? 1. Verifica requisitos de versão major para cada ferramenta crítica
    for (const [pkgName, minMajor] of Object.entries(this.CRITICAL_FRAMEWORK_MINIMUMS)) {
      const rawVersion = allDeps[pkgName];
      if (!rawVersion) {
        findings.push({
          target: pkgName,
          rule: 'CRITICAL_DEPENDENCY_MISSING',
          severity: 'CRITICAL',
          message: `Dependência crítica "${pkgName}" não está presente no package.json.`
        });
        continue;
      }

      const cleanVersion = rawVersion.replace(/^[~^=>< ]+/, '').trim();
      const major = parseInt(cleanVersion.split('.')[0] || '0', 10);

      if (major < minMajor) {
        findings.push({
          target: pkgName,
          rule: 'OUTDATED_CRITICAL_DEPENDENCY',
          severity: 'CRITICAL',
          message: `A dependência "${pkgName}" está na versão major ${major}, mas a versão LTS/moderna exigida é >= ${minMajor}.`,
          detail: `Versão configurada: ${rawVersion}`
        });
      }
    }

    //? 2. Verifica paridade estrita entre Vitest e @vitest/coverage-v8
    const vitestVer = allDeps['vitest'];
    const coverageVer = allDeps['@vitest/coverage-v8'];
    if (vitestVer && coverageVer) {
      const cleanVitest = vitestVer.replace(/^[~^=>< ]+/, '').trim();
      const cleanCoverage = coverageVer.replace(/^[~^=>< ]+/, '').trim();

      const vitestParts = cleanVitest.split('.').map((p: string) => parseInt(p, 10));
      const coverageParts = cleanCoverage.split('.').map((p: string) => parseInt(p, 10));

      if (vitestParts[0] !== coverageParts[0] || vitestParts[1] !== coverageParts[1]) {
        findings.push({
          target: '@vitest/coverage-v8',
          rule: 'PEER_DEPENDENCY_PARITY_MISMATCH',
          severity: 'CRITICAL',
          message: `Desalinhamento fatal entre vitest (${vitestVer}) e @vitest/coverage-v8 (${coverageVer}). Major e minor devem ser rigorosamente idênticos.`
        });
      }
    }

    //? 3. Verifica engines.node no package.json se declarado
    if (packageJson.engines?.node) {
      const rawNodeEngine = packageJson.engines.node;
      const cleanNode = rawNodeEngine.replace(/^[~^=>< ]+/, '').trim();
      const nodeMajor = parseInt(cleanNode.split('.')[0] || '0', 10);
      if (nodeMajor < this.MINIMUM_NODE_LTS_MAJOR) {
        findings.push({
          target: 'engines.node',
          rule: 'OUTDATED_NODE_ENGINE',
          severity: 'CRITICAL',
          message: `O package.json declara Node.js ${rawNodeEngine}, que está abaixo do LTS mínimo aceito (>= ${this.MINIMUM_NODE_LTS_MAJOR}).`
        });
      }
    }

    return {
      valid: findings.length === 0,
      findings
    };
  }

  /**
   * Audita a versão do Node.js nos arquivos de CI (.github/workflows) exigindo versão LTS ativa (>= 20).
   */
  public static auditWorkflowNodeLts(workflowContent: string, workflowName: string): CriticalDependencyAuditReport {
    const findings: DependencyAuditFinding[] = [];
    const lines = workflowContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      //? Ignora comentários
      if (line.trim().startsWith('#')) continue;

      const nodeMatch = /node-version:\s*['"]?(\d+)['"]?/.exec(line);
      if (nodeMatch) {
        const major = parseInt(nodeMatch[1] || '0', 10);
        if (major < this.MINIMUM_NODE_LTS_MAJOR) {
          findings.push({
            target: `${workflowName}:${i + 1}`,
            rule: 'OUTDATED_NODE_LTS_IN_CI',
            severity: 'CRITICAL',
            message: `O workflow utiliza Node.js ${major}, que atingiu End-of-Life (EOL). O CI deve utilizar LTS ativa >= ${this.MINIMUM_NODE_LTS_MAJOR}.`,
            detail: line.trim()
          });
        }
      }
    }

    return {
      valid: findings.length === 0,
      findings
    };
  }
}
