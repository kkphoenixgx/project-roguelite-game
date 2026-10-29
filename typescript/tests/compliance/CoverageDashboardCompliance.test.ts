import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  analyzeCoverage,
  generateHtml,
  THRESHOLD
} from '../../../scripts/generate_coverage_dashboard';

/**
 * ============================================================================
 * TESTE DE COMPLIANCE: FERRAMENTA VISUAL DE COBERTURA DE TESTES (META >= 70%)
 * ============================================================================
 * Papel: QA Lead & Compliance Auditor (rpg-testes)
 * Finalidade:
 * 1. Testar a ferramenta desacoplada `scripts/generate_coverage_dashboard.js`.
 * 2. Garantir que a ferramenta analisa módulos, fluxos, percentuais e thresholds de 70%.
 * 3. Garantir que o Dashboard HTML standalone é gerado com sucesso sem dependências do DOM do jogo.
 * 4. Validar o isolamento arquitetural da ferramenta de cobertura (não acoplada ao Domínio nem ao jogo).
 */
describe('Compliance & Auditoria: Ferramenta Desacoplada de Dashboard de Cobertura', () => {
  const ROOT_DIR = path.resolve(__dirname, '../../../');
  const DASHBOARD_SCRIPT = path.join(ROOT_DIR, 'scripts/generate_coverage_dashboard.js');

  it('o script do gerador de dashboard deve existir e ser executável de forma desacoplada', () => {
    expect(fs.existsSync(DASHBOARD_SCRIPT)).toBe(true);
    const content = fs.readFileSync(DASHBOARD_SCRIPT, 'utf-8');

    // Não deve conter acoplamento com GameAdapter, DOM do jogo ou Tauri
    expect(content).not.toContain('GameAdapter');
    expect(content).not.toContain('UIManager');
    expect(content).not.toContain('@tauri-apps');
  });

  it('deve processar corretamente os dados de cobertura e calcular a conformidade com a meta de 70%', () => {
    const mockSummary = {
      total: {
        lines: { total: 1000, covered: 750, skipped: 0, pct: 75.0 },
        statements: { total: 1000, covered: 750, skipped: 0, pct: 75.0 },
        functions: { total: 100, covered: 80, skipped: 0, pct: 80.0 },
        branches: { total: 200, covered: 150, skipped: 0, pct: 75.0 }
      },
      'typescript/domain/ObjectModule/Entities/Player/Player.ts': {
        lines: { total: 200, covered: 180, skipped: 0, pct: 90.0 },
        statements: { total: 200, covered: 180, skipped: 0, pct: 90.0 },
        functions: { total: 20, covered: 18, skipped: 0, pct: 90.0 },
        branches: { total: 40, covered: 32, skipped: 0, pct: 80.0 }
      },
      'typescript/domain/services/AutoSaveService.ts': {
        lines: { total: 100, covered: 50, skipped: 0, pct: 50.0 },
        statements: { total: 100, covered: 50, skipped: 0, pct: 50.0 },
        functions: { total: 10, covered: 5, skipped: 0, pct: 50.0 },
        branches: { total: 20, covered: 8, skipped: 0, pct: 40.0 }
      }
    };

    const analysis = analyzeCoverage(mockSummary);

    expect(analysis.files).toHaveLength(2);
    expect(analysis.meetsThreshold).toBe(true);
    expect(analysis.passingFiles).toHaveLength(1);
    expect(analysis.failingFiles).toHaveLength(1);

    // O arquivo com 90% deve passar a meta de 70%
    const passingPlayer = analysis.passingFiles.find(f => f.path.includes('Player.ts'));
    expect(passingPlayer).toBeDefined();
    expect(passingPlayer?.isPassing).toBe(true);

    // O arquivo com 50% deve ser categorizado como reprovado (< 70%)
    const failingService = analysis.failingFiles.find(f => f.path.includes('AutoSaveService.ts'));
    expect(failingService).toBeDefined();
    expect(failingService?.isPassing).toBe(false);

    // Deve agrupar em módulos estruturados
    expect(analysis.modules['Domínio: Jogador & Classes']).toBeDefined();
    expect(analysis.modules['Domínio: Serviços (AutoSave, etc)']).toBeDefined();
  });

  it('deve gerar documento HTML visual completo, estilizado e autocontido', () => {
    const mockSummary = {
      total: {
        lines: { total: 500, covered: 400, skipped: 0, pct: 80.0 },
        statements: { total: 500, covered: 400, skipped: 0, pct: 80.0 },
        functions: { total: 50, covered: 40, skipped: 0, pct: 80.0 },
        branches: { total: 100, covered: 75, skipped: 0, pct: 75.0 }
      },
      'typescript/domain/DomainFacade.ts': {
        lines: { total: 100, covered: 85, skipped: 0, pct: 85.0 },
        statements: { total: 100, covered: 85, skipped: 0, pct: 85.0 },
        functions: { total: 10, covered: 9, skipped: 0, pct: 90.0 },
        branches: { total: 20, covered: 16, skipped: 0, pct: 80.0 }
      }
    };

    const analysis = analyzeCoverage(mockSummary);
    const html = generateHtml(analysis);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Dashboard Visual de Cobertura de Testes');
    expect(html).toContain(`Meta Mínima Exigida: <strong>${THRESHOLD}%</strong>`);
    expect(html).toContain('DomainFacade.ts');
    expect(html).toContain('85.0%');
    expect(html).toContain('PASSING');
  });

  it('deve reprovar globalmente se o total geral de linhas estiver abaixo de 70%', () => {
    const mockSummaryBelow = {
      total: {
        lines: { total: 1000, covered: 650, skipped: 0, pct: 65.0 },
        statements: { total: 1000, covered: 650, skipped: 0, pct: 65.0 },
        functions: { total: 100, covered: 60, skipped: 0, pct: 60.0 },
        branches: { total: 200, covered: 100, skipped: 0, pct: 50.0 }
      }
    };

    const analysis = analyzeCoverage(mockSummaryBelow);
    expect(analysis.meetsThreshold).toBe(false);
  });
});
