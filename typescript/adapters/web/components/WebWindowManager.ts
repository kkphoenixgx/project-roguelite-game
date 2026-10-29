import { Telemetry } from "../../../tests/Telemetry";
import { saveTelemetryLog } from "../shared/TauriIPC";
import type { ITelemetryAdapter } from "../../TelemetryAdapter/ITelemetryAdapter";
import type SceneManager from "./renderModule/scene/SceneManager";

/**
 * WebWindowManager
 * Gerencia atalhos de depuração, variáveis expostas no objeto window e a exibição da telemetria,
 * separando essas preocupações da lógica central do jogo.
 */
export default class WebWindowManager {
  private isDebugMode = false;
  private isTelemetryActive = false;
  private telemetryDiv?: HTMLDivElement;
  private domainTelemetryDiv?: HTMLDivElement;
  private lastTelemetryUpdate: number = 0;

  constructor(
    private sceneManager: SceneManager,
    private telemetryAdapter: ITelemetryAdapter
  ) {
    this.setupWindowGlobals();
    this.setupEventListeners();
  }

  private setupWindowGlobals() {
    (window as any).toggleDebugMode = () => {
      this.isDebugMode = !this.isDebugMode;
      if (this.sceneManager) this.sceneManager.setDebugMode(this.isDebugMode);
      console.log(`%c[Debug] %cModo de depuração de HitBoxes: ${this.isDebugMode ? 'ATIVADO' : 'DESATIVADO'}`, 'color: orange', 'color: white');
    };

    (window as any).openHitboxEditor = () => {
      window.open('/typescript/adapters/polygonWebEditor/index.html', '_blank');
      console.log('%c[Editor] %cHitbox Editor Tool aberto em uma nova aba.', 'color: #55aaff', 'color: white');
    };

    (window as any).toggleHitboxEditor = () => {
      (window as any).openHitboxEditor();
    };

    (window as any).openAssetsAdapter = () => {
      window.open('/typescript/adapters/assets-adapter/index.html', '_blank');
      console.log('%c[Editor] %cAssets Adapter Tool aberto em uma nova aba.', 'color: #3b82f6', 'color: white');
    };

    (window as any).toggleAssetsAdapter = () => {
      (window as any).openAssetsAdapter();
    };

    (window as any).toggleTelemetry = () => {
      this.isTelemetryActive = !this.isTelemetryActive;
      if (this.isTelemetryActive) {
        if (!this.telemetryDiv) {
          this.telemetryDiv = this.telemetryAdapter.getTelemetryUI();
          document.body.appendChild(this.telemetryDiv);
        }
        if (!this.domainTelemetryDiv && this.telemetryAdapter.getDomainFloatingWindow) {
          this.domainTelemetryDiv = this.telemetryAdapter.getDomainFloatingWindow();
          if (!this.domainTelemetryDiv.parentElement) {
            document.body.appendChild(this.domainTelemetryDiv);
          }
        }
        this.telemetryDiv.style.display = 'block';
        if (this.domainTelemetryDiv) this.domainTelemetryDiv.style.display = 'block';
        this.telemetryAdapter.updateUI();
        console.log('%c[Performance HUD] %cAtivado (F3 para alternar overlay na tela).', 'color: #2ecc71; font-weight: bold', 'color: white');
      } else {
        if (this.telemetryDiv) this.telemetryDiv.style.display = 'none';
        if (this.domainTelemetryDiv) this.domainTelemetryDiv.style.display = 'none';
        console.log('%c[Performance HUD] %cDesativado.', 'color: #f1c40f', 'color: white');
      }
    };

    (window as any).getPerformanceReport = () => {
      const snapshot = this.telemetryAdapter.getSnapshot();
      console.log(`%c[PERFORMANCE SNAPSHOT] FPS: ${Math.round(snapshot.fps)} (Avg: ${snapshot.avgFps.toFixed(1)} | Min: ${snapshot.minFps.toFixed(1)}) | FrameTime: ${snapshot.frameTimeMs.toFixed(2)}ms`, 'color: #ffd700; font-weight: bold');
      if (snapshot.moduleBreakdown && snapshot.moduleBreakdown.length > 0) {
        console.table(snapshot.moduleBreakdown.map(m => ({
          'Módulo': m.name,
          'Tempo (ms)': `${m.durationMs.toFixed(2)} ms`,
          'Consumo (%)': `${m.pct}%`
        })));
      }
      return snapshot;
    };
  }

  private setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        (window as any).toggleTelemetry();
      }
      
      if (e.key === 'F2') {
        e.preventDefault();
        if (e.shiftKey) {
            (window as any).openHitboxEditor();
        } else {
            (window as any).toggleDebugMode();
        }
      }

      if (e.key === 'F4') {
        e.preventDefault();
        (window as any).openAssetsAdapter();
      }
    });

    window.addEventListener('beforeunload', () => {
      const report = Telemetry.mountReport();
      saveTelemetryLog(report, false);
    });
  }

  private lastConsoleLogTime: number = 0;

  private formatTopFilesPerformanceTable(snapshot: any): string {
    const fps = Math.round(snapshot.avgFps ?? snapshot.fps);
    const frameTime = (snapshot.frameTimeMs || 0).toFixed(2);
    const domainTime = (snapshot.domainTimeMs || 0).toFixed(2);
    const renderTime = (snapshot.renderTimeMs || 0).toFixed(2);
    const domainFiles = snapshot.topDomainFilesBreakdown || [];
    const adapterFiles = snapshot.topAdapterFilesBreakdown || [];

    const isIdleOrPaused = (domainFiles.length === 0 && Number(domainTime) === 0);
    const statusTag = isIdleOrPaused ? ' [Pausado/Menu]' : '';

    const lines: string[] = [];
    lines.push(`FPS: ${fps}${statusTag} | Frame: ${frameTime}ms (Domínio: ${domainTime}ms | Render/Adapters: ${renderTime}ms)`);
    lines.push(``);
    lines.push(`[ DOMÍNIO - Lógica, Física & Entidades ]`);
    lines.push(`┌────┬────────────────────────────┬────────────────────────┬─────┬──────────┬────────┬────────┐`);
    lines.push(`│ #  │ Arquivo                    │ Módulo                 │ Qtd │ Tempo    │ % Dom  │ % Tot  │`);
    lines.push(`├────┼────────────────────────────┼────────────────────────┼─────┼──────────┼────────┼────────┤`);

    if (domainFiles.length === 0) {
      lines.push(`│ -- │ Coletando amostras...      │ -                      │  -  │ 0.00ms   │   0.0% │   0.0% │`);
    } else {
      domainFiles.forEach((item: any, idx: number) => {
        const rank = String(idx + 1).padStart(2, '0');
        const file = (item.file || 'desconhecido').padEnd(26, ' ').slice(0, 26);
        const mod = (item.module || 'Domain').padEnd(22, ' ').slice(0, 22);
        const instances = item.instances !== undefined && item.instances > 0
          ? String(item.instances).padStart(3, ' ').slice(0, 3)
          : '  -';
        const duration = `${(item.durationMs || 0).toFixed(2)}ms`.padStart(8, ' ');
        const pctDom = `${(item.layerPct ?? item.pct ?? 0).toFixed(1)}%`.padStart(6, ' ');
        const pctTot = `${(item.pct || 0).toFixed(1)}%`.padStart(6, ' ');
        lines.push(`│ ${rank} │ ${file} │ ${mod} │ ${instances} │ ${duration} │ ${pctDom} │ ${pctTot} │`);
      });
    }
    lines.push(`└────┴────────────────────────────┴────────────────────────┴─────┴──────────┴────────┴────────┘`);

    lines.push(``);
    lines.push(`[ ADAPTADORES - Render, UI & Infra ]`);
    lines.push(`┌────┬────────────────────────────┬────────────────────────┬─────┬──────────┬────────┬────────┐`);
    lines.push(`│ #  │ Arquivo                    │ Módulo                 │ Qtd │ Tempo    │ % Adap │ % Tot  │`);
    lines.push(`├────┼────────────────────────────┼────────────────────────┼─────┼──────────┼────────┼────────┤`);

    if (adapterFiles.length === 0) {
      lines.push(`│ -- │ Coletando amostras...      │ -                      │  -  │ 0.00ms   │   0.0% │   0.0% │`);
    } else {
      adapterFiles.forEach((item: any, idx: number) => {
        const rank = String(idx + 1).padStart(2, '0');
        const file = (item.file || 'desconhecido').padEnd(26, ' ').slice(0, 26);
        const mod = (item.module || 'Adapters').padEnd(22, ' ').slice(0, 22);
        const instances = item.instances !== undefined && item.instances > 0
          ? String(item.instances).padStart(3, ' ').slice(0, 3)
          : '  -';
        const duration = `${(item.durationMs || 0).toFixed(2)}ms`.padStart(8, ' ');
        const pctAdap = `${(item.layerPct ?? item.pct ?? 0).toFixed(1)}%`.padStart(6, ' ');
        const pctTot = `${(item.pct || 0).toFixed(1)}%`.padStart(6, ' ');
        lines.push(`│ ${rank} │ ${file} │ ${mod} │ ${instances} │ ${duration} │ ${pctAdap} │ ${pctTot} │`);
      });
    }
    lines.push(`└────┴────────────────────────────┴────────────────────────┴─────┴──────────┴────────┴────────┘`);

    return lines.join('\n');
  }

  public updateTelemetryUI(): void {
    const now = performance.now();
    if (this.isTelemetryActive && this.telemetryDiv) {
      // Atualiza a UI a cada ~120ms (8 fps de taxa de atualização da interface para leitura confortável)
      if (!this.lastTelemetryUpdate || now - this.lastTelemetryUpdate >= 120) {
        this.lastTelemetryUpdate = now;
        this.telemetryAdapter.updateUI();
      }

      // Emite um log resumido no console e tabela no terminal a cada 3 segundos enquanto a telemetria estiver ligada
      if (!this.lastConsoleLogTime || now - this.lastConsoleLogTime >= 3000) {
        this.lastConsoleLogTime = now;
        const snapshot = this.telemetryAdapter.getSnapshot();
        const breakdownStr = (snapshot.moduleBreakdown || [])
          .map(m => `${m.name}: ${m.pct}% (${m.durationMs.toFixed(2)}ms)`)
          .join(' | ');

        const perfTable = this.formatTopFilesPerformanceTable(snapshot);

        console.log(
          `%c[Perf] %c${Math.round(snapshot.fps)} FPS (${snapshot.frameTimeMs.toFixed(2)}ms) %c=> ${breakdownStr}`,
          'color: #55aaff; font-weight: bold',
          'color: #2ecc71; font-weight: bold',
          'color: #c9d1d9'
        );
        if (snapshot.topDomainFilesBreakdown && snapshot.topDomainFilesBreakdown.length > 0) {
          console.groupCollapsed(`%c[Top Domínio] Gargalos Lógicos`, 'color: #bb86fc; font-weight: bold');
          console.table(snapshot.topDomainFilesBreakdown);
          console.groupEnd();
        }
        if (snapshot.topAdapterFilesBreakdown && snapshot.topAdapterFilesBreakdown.length > 0) {
          console.groupCollapsed(`%c[Top Adapters] Gargalos de Render/UI`, 'color: #03dac6; font-weight: bold');
          console.table(snapshot.topAdapterFilesBreakdown);
          console.groupEnd();
        }

        // Envia diretamente para o terminal do processo Tauri (Rust stdout)
        if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('log_browser', { channel: 'Performance', level: 'info', message: perfTable }).catch(() => {});
          }).catch(() => {});
        }
      }
    }
  }
}
