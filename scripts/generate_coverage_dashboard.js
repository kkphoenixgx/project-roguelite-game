#!/usr/bin/env node
/**
 * @file generate_coverage_dashboard.js
 * Ferramenta desacoplada de terceiros/utilitário para gerar visualmente o Dashboard
 * Interativo de Cobertura de Testes (Unitários, Integração, Módulos e Fluxos).
 *
 * Funcionalidades:
 * 1. Processa coverage/coverage-summary.json gerado pelo c8/v8/Vitest.
 * 2. Mapeia hierarquicamente módulos do Domínio (typescript/domain) e Adaptadores (typescript/adapters).
 * 3. Identifica arquivos abaixo da meta estrita de 70% de cobertura.
 * 4. Gera relatório visual HTML autônomo e standalone (coverage/dashboard.html).
 * 5. Pode ser consumido programaticamente ou via CLI (retornando exit code 0 se aprovado).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const COVERAGE_DIR = path.join(ROOT_DIR, 'coverage');
const SUMMARY_FILE = path.join(COVERAGE_DIR, 'coverage-summary.json');
const OUTPUT_HTML = path.join(COVERAGE_DIR, 'dashboard.html');

const THRESHOLD = 70; // Meta de 70%

function parseCoverageSummary() {
  if (!fs.existsSync(SUMMARY_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(SUMMARY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[CoverageDashboard] Erro ao ler coverage-summary.json:', err.message);
    return null;
  }
}

function analyzeCoverage(summaryData) {
  const result = {
    total: summaryData.total || {},
    files: [],
    modules: {},
    failingFiles: [],
    passingFiles: [],
    meetsThreshold: true
  };

  for (const [filePath, stats] of Object.entries(summaryData)) {
    if (filePath === 'total') continue;

    const relativePath = path.isAbsolute(filePath)
      ? path.relative(ROOT_DIR, filePath)
      : filePath;

    // Identifica módulo principal
    let moduleGroup = 'Outros';
    if (relativePath.includes('domain/ObjectModule/Entities/Player')) {
      moduleGroup = 'Domínio: Jogador & Classes';
    } else if (relativePath.includes('domain/ObjectModule/Entities')) {
      moduleGroup = 'Domínio: Entidades & NPCs';
    } else if (relativePath.includes('domain/ObjectModule/Maps')) {
      moduleGroup = 'Domínio: Mapas & Portais';
    } else if (relativePath.includes('domain/ObjectModule/Items')) {
      moduleGroup = 'Domínio: Itens & Equipamentos';
    } else if (relativePath.includes('domain/facadeComponents') || relativePath.includes('DomainFacade')) {
      moduleGroup = 'Domínio: Fachadas & Gateways';
    } else if (relativePath.includes('domain/eventDispacher')) {
      moduleGroup = 'Domínio: Barramento de Eventos';
    } else if (relativePath.includes('domain/templates')) {
      moduleGroup = 'Domínio: Templates Canônicos';
    } else if (relativePath.includes('domain/services')) {
      moduleGroup = 'Domínio: Serviços (AutoSave, etc)';
    } else if (relativePath.includes('domain/')) {
      moduleGroup = 'Domínio: Geral & Matemática';
    } else if (relativePath.includes('adapters/web/GUIS')) {
      moduleGroup = 'Adaptadores: GUIs & HUDs';
    } else if (relativePath.includes('adapters/web/components/renderModule')) {
      moduleGroup = 'Adaptadores: Renderização & Câmera';
    } else if (relativePath.includes('adapters/web/components/keyboardModule')) {
      moduleGroup = 'Adaptadores: Input & Hardware';
    } else if (relativePath.includes('adapters/web/')) {
      moduleGroup = 'Adaptadores: Web & Componentes';
    } else if (relativePath.includes('adapters/')) {
      moduleGroup = 'Adaptadores: Geral';
    }

    const linesPct = stats.lines ? stats.lines.pct : 0;
    const branchesPct = stats.branches ? stats.branches.pct : 0;
    const functionsPct = stats.functions ? stats.functions.pct : 0;
    const statementsPct = stats.statements ? stats.statements.pct : 0;

    const avgPct = (linesPct + branchesPct + functionsPct + statementsPct) / 4;
    const isPassing = linesPct >= THRESHOLD && branchesPct >= THRESHOLD && functionsPct >= THRESHOLD && statementsPct >= THRESHOLD;

    const fileEntry = {
      path: relativePath,
      module: moduleGroup,
      lines: stats.lines || { total: 0, covered: 0, pct: 0 },
      branches: stats.branches || { total: 0, covered: 0, pct: 0 },
      functions: stats.functions || { total: 0, covered: 0, pct: 0 },
      statements: stats.statements || { total: 0, covered: 0, pct: 0 },
      avgPct,
      isPassing
    };

    result.files.push(fileEntry);

    if (isPassing) {
      result.passingFiles.push(fileEntry);
    } else {
      result.failingFiles.push(fileEntry);
    }

    if (!result.modules[moduleGroup]) {
      result.modules[moduleGroup] = {
        name: moduleGroup,
        filesCount: 0,
        coveredLines: 0,
        totalLines: 0,
        coveredBranches: 0,
        totalBranches: 0,
        coveredFunctions: 0,
        totalFunctions: 0
      };
    }

    const m = result.modules[moduleGroup];
    m.filesCount++;
    m.coveredLines += fileEntry.lines.covered;
    m.totalLines += fileEntry.lines.total;
    m.coveredBranches += fileEntry.branches.covered;
    m.totalBranches += fileEntry.branches.total;
    m.coveredFunctions += fileEntry.functions.covered;
    m.totalFunctions += fileEntry.functions.total;
  }

  // Verifica se o total global atinge a meta
  if (result.total.lines && result.total.lines.pct < THRESHOLD) {
    result.meetsThreshold = false;
  }

  return result;
}

function generateHtml(analysis) {
  const total = analysis.total;
  const linesPct = total.lines ? total.lines.pct.toFixed(1) : '0.0';
  const branchesPct = total.branches ? total.branches.pct.toFixed(1) : '0.0';
  const functionsPct = total.functions ? total.functions.pct.toFixed(1) : '0.0';
  const statementsPct = total.statements ? total.statements.pct.toFixed(1) : '0.0';

  const globalStatus = (parseFloat(linesPct) >= THRESHOLD && parseFloat(branchesPct) >= THRESHOLD && parseFloat(functionsPct) >= THRESHOLD)
    ? 'PASSING'
    : 'UNDER_TARGET';

  const badgeColor = globalStatus === 'PASSING' ? '#10b981' : '#f59e0b';

  let modulesHtml = '';
  for (const [modName, modData] of Object.entries(analysis.modules)) {
    const modLinesPct = modData.totalLines > 0 ? ((modData.coveredLines / modData.totalLines) * 100).toFixed(1) : '100.0';
    const modFuncPct = modData.totalFunctions > 0 ? ((modData.coveredFunctions / modData.totalFunctions) * 100).toFixed(1) : '100.0';
    const barWidth = Math.min(100, parseFloat(modLinesPct));
    const barColor = parseFloat(modLinesPct) >= THRESHOLD ? '#10b981' : parseFloat(modLinesPct) >= 50 ? '#f59e0b' : '#ef4444';

    modulesHtml += `
      <div class="module-card">
        <div class="module-header">
          <span class="module-name">${modName}</span>
          <span class="module-badge" style="background: ${barColor}22; color: ${barColor}; border: 1px solid ${barColor}44;">
            ${modLinesPct}% Linhas (${modData.filesCount} arquivos)
          </span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${barWidth}%; background: ${barColor};"></div>
        </div>
        <div class="module-metrics">
          <span>Linhas: ${modData.coveredLines}/${modData.totalLines}</span>
          <span>Funções: ${modData.coveredFunctions}/${modData.totalFunctions} (${modFuncPct}%)</span>
        </div>
      </div>
    `;
  }

  let filesRows = '';
  // Ordena por menor cobertura primeiro para ação prioritária
  const sortedFiles = [...analysis.files].sort((a, b) => a.lines.pct - b.lines.pct);

  for (const f of sortedFiles) {
    const lPct = f.lines.pct.toFixed(1);
    const bPct = f.branches.pct.toFixed(1);
    const fPct = f.functions.pct.toFixed(1);
    const statusClass = f.lines.pct >= THRESHOLD ? 'status-pass' : 'status-fail';
    const statusText = f.lines.pct >= THRESHOLD ? '>= 70%' : '< 70%';

    filesRows += `
      <tr>
        <td class="file-path"><code>${f.path}</code></td>
        <td><span class="tag-module">${f.module}</span></td>
        <td class="text-center font-mono">${lPct}% <small>(${f.lines.covered}/${f.lines.total})</small></td>
        <td class="text-center font-mono">${bPct}% <small>(${f.branches.covered}/${f.branches.total})</small></td>
        <td class="text-center font-mono">${fPct}% <small>(${f.functions.covered}/${f.functions.total})</small></td>
        <td class="text-center"><span class="badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard de Cobertura de Testes - RPG Roguelite</title>
  <style>
    :root {
      --bg-darkest: #0b0813;
      --bg-dark: #140d24;
      --bg-card: #1c1433;
      --border: #38245e;
      --accent-gold: #ffd700;
      --text-main: #f3e8ff;
      --text-muted: #a78bfa;
      --pass: #10b981;
      --warn: #f59e0b;
      --fail: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-darkest);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 32px 24px;
      line-height: 1.5;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 32px;
    }
    h1 { font-size: 26px; color: var(--accent-gold); display: flex; align-items: center; gap: 12px; }
    .header-meta { color: var(--text-muted); font-size: 14px; text-align: right; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .kpi-title { font-size: 13px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 8px; }
    .kpi-value { font-size: 32px; font-weight: 700; }
    .kpi-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    
    .section-title {
      font-size: 18px;
      color: var(--accent-gold);
      margin: 32px 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .module-card {
      background: var(--bg-dark);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
    }
    .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .module-name { font-weight: 600; font-size: 14px; color: var(--text-main); }
    .module-badge { font-size: 12px; padding: 2px 8px; border-radius: 9999px; }
    .progress-bar-bg { background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
    .progress-bar-fill { height: 100%; transition: width 0.3s ease; }
    .module-metrics { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); }

    .table-container {
      background: var(--bg-dark);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th {
      background: var(--bg-card);
      color: var(--text-muted);
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }
    td { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    tr:hover { background: rgba(255,255,255,0.02); }
    .file-path { font-family: monospace; color: #e9d5ff; }
    .tag-module { background: rgba(167, 139, 250, 0.15); color: #c084fc; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .text-center { text-align: center; }
    .font-mono { font-family: monospace; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .status-pass { background: rgba(16, 185, 129, 0.2); color: var(--pass); border: 1px solid rgba(16, 185, 129, 0.4); }
    .status-fail { background: rgba(239, 68, 68, 0.2); color: var(--fail); border: 1px solid rgba(239, 68, 68, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>🛡️ Dashboard Visual de Cobertura de Testes</h1>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">
          Auditoria Automatizada de Cobertura Unitária, Integração e Governança
        </p>
      </div>
      <div class="header-meta">
        <div>Meta Mínima Exigida: <strong>${THRESHOLD}%</strong></div>
        <div>Total de Arquivos Analisados: <strong>${analysis.files.length}</strong></div>
        <div>Status da Suíte: <strong style="color: ${badgeColor};">${globalStatus}</strong></div>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Cobertura de Linhas</div>
        <div class="kpi-value" style="color: ${parseFloat(linesPct) >= THRESHOLD ? 'var(--pass)' : 'var(--warn)'}">${linesPct}%</div>
        <div class="kpi-sub">${total.lines ? total.lines.covered : 0} de ${total.lines ? total.lines.total : 0} linhas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Cobertura de Branches</div>
        <div class="kpi-value" style="color: ${parseFloat(branchesPct) >= THRESHOLD ? 'var(--pass)' : 'var(--warn)'}">${branchesPct}%</div>
        <div class="kpi-sub">${total.branches ? total.branches.covered : 0} de ${total.branches ? total.branches.total : 0} ramos</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Cobertura de Funções</div>
        <div class="kpi-value" style="color: ${parseFloat(functionsPct) >= THRESHOLD ? 'var(--pass)' : 'var(--warn)'}">${functionsPct}%</div>
        <div class="kpi-sub">${total.functions ? total.functions.covered : 0} de ${total.functions ? total.functions.total : 0} funções</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Cobertura de Instruções</div>
        <div class="kpi-value" style="color: ${parseFloat(statementsPct) >= THRESHOLD ? 'var(--pass)' : 'var(--warn)'}">${statementsPct}%</div>
        <div class="kpi-sub">${total.statements ? total.statements.covered : 0} de ${total.statements ? total.statements.total : 0} statements</div>
      </div>
    </div>

    <h2 class="section-title">📦 Cobertura Estruturada por Módulos & Fluxos</h2>
    <div class="modules-grid">
      ${modulesHtml}
    </div>

    <h2 class="section-title">📄 Detalhamento Arquivo por Arquivo (${analysis.files.length} componentes)</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Módulo</th>
            <th class="text-center">Linhas</th>
            <th class="text-center">Branches</th>
            <th class="text-center">Funções</th>
            <th class="text-center">Meta (>=70%)</th>
          </tr>
        </thead>
        <tbody>
          ${filesRows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function run() {
  const summary = parseCoverageSummary();
  if (!summary) {
    console.log('[CoverageDashboard] Nenhum arquivo coverage/coverage-summary.json encontrado.');
    console.log('[CoverageDashboard] Execute primeiro: npm run test:coverage');
    return { success: false, reason: 'NO_SUMMARY' };
  }

  const analysis = analyzeCoverage(summary);
  const html = generateHtml(analysis);

  if (!fs.existsSync(COVERAGE_DIR)) {
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_HTML, html, 'utf-8');
  console.log(`\n================================================================================`);
  console.log(`📊 [COVERAGE DASHBOARD] Relatório visual gerado com sucesso!`);
  console.log(`👉 Arquivo HTML Standalone: file://${OUTPUT_HTML}`);
  console.log(`================================================================================`);
  console.log(`• Total Linhas:    ${analysis.total.lines ? analysis.total.lines.pct : 0}% (Meta: ${THRESHOLD}%)`);
  console.log(`• Total Funções:   ${analysis.total.functions ? analysis.total.functions.pct : 0}% (Meta: ${THRESHOLD}%)`);
  console.log(`• Total Branches:  ${analysis.total.branches ? analysis.total.branches.pct : 0}% (Meta: ${THRESHOLD}%)`);
  console.log(`• Arquivos Aprovados:  ${analysis.passingFiles.length} / ${analysis.files.length}`);
  console.log(`• Arquivos Abaixo:     ${analysis.failingFiles.length} / ${analysis.files.length}`);
  console.log(`================================================================================\n`);

  return { success: true, analysis, htmlPath: OUTPUT_HTML };
}

if (require.main === module) {
  run();
}

module.exports = {
  run,
  analyzeCoverage,
  generateHtml,
  parseCoverageSummary,
  THRESHOLD
};
