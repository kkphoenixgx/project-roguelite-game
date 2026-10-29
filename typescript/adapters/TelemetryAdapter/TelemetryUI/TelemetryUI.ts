import type { TelemetrySnapshot } from '../TelemetrySnapshot';
import css from './telemetryUI.css?raw';

export default class TelemetryUI {
  public static telemetryUISingleton?: HTMLDivElement | undefined;
  public static domainFloatingWindowSingleton?: HTMLDivElement | undefined;
  private static styleInjected: boolean = false;
  private static lastSnapshot?: TelemetrySnapshot | undefined;

  private static ensureStyles(): void {
    if (this.styleInjected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.id = 'telemetry-hud-style';
    style.textContent = css;
    document.head.appendChild(style);
    this.styleInjected = true;
  }

  public static getSingleton(): HTMLDivElement {
    if (!this.telemetryUISingleton) {
      this.ensureStyles();
      this.telemetryUISingleton = document.createElement('div');
      this.telemetryUISingleton.id = 'telemetry-hud';
      this.telemetryUISingleton.className = 'telemetry-hud';
      this.telemetryUISingleton.style.display = 'none';

      //? Listener de delegação de clique para alternar a janela flutuante de domínio
      this.telemetryUISingleton.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target && target.closest('#telemetry-open-domain-btn')) {
          this.toggleDomainWindow();
        }
      });
    }
    return this.telemetryUISingleton;
  }

  public static getDomainFloatingWindow(): HTMLDivElement {
    if (!this.domainFloatingWindowSingleton) {
      this.ensureStyles();
      const win = document.createElement('div');
      win.id = 'telemetry-domain-window';
      win.className = 'telemetry-floating-window';
      win.style.display = 'none';

      //? Header arrastável com controles de janela
      const header = document.createElement('div');
      header.id = 'telemetry-domain-drag-header';
      header.className = 'telemetry-floating-header';
      header.innerHTML = `
        <div class="telemetry-title">
          <span class="telemetry-live-dot" style="background:#bb86fc;box-shadow:0 0 8px #bb86fc;"></span>
          TELEMETRY &mdash; DOM&Iacute;NIO &amp; ENTIDADES
        </div>
        <div class="telemetry-win-controls">
          <span class="telemetry-badge telemetry-badge-domain">Zero-GC</span>
          <button id="telemetry-domain-close-btn" class="telemetry-win-btn" title="Fechar">&times;</button>
        </div>
      `;

      const body = document.createElement('div');
      body.id = 'telemetry-domain-body';
      body.className = 'telemetry-floating-body';

      win.appendChild(header);
      win.appendChild(body);

      //? Fechamento via botão X
      const closeBtn = header.querySelector('#telemetry-domain-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleDomainWindow(false);
        });
      }

      //? Configuração de arraste da janela flutuante
      this.setupWindowDragging(win, header);

      this.domainFloatingWindowSingleton = win;
    }
    return this.domainFloatingWindowSingleton;
  }

  public static toggleDomainWindow(forceState?: boolean): HTMLDivElement {
    const win = this.getDomainFloatingWindow();
    if (!win.parentElement && typeof document !== 'undefined' && document.body) {
      document.body.appendChild(win);
    }
    if (forceState !== undefined) {
      win.style.display = forceState ? 'block' : 'none';
    } else {
      win.style.display = win.style.display === 'none' ? 'block' : 'none';
    }
    if (this.lastSnapshot) {
      this.renderDomainFloatingWindow(this.lastSnapshot);
    }
    return win;
  }

  private static setupWindowDragging(windowEl: HTMLDivElement, headerEl: HTMLElement): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onStart = (clientX: number, clientY: number, target: HTMLElement) => {
      if (target.closest('#telemetry-domain-close-btn')) return;

      isDragging = true;
      startX = clientX;
      startY = clientY;

      const rect = windowEl.getBoundingClientRect();
      initialLeft = parseFloat(windowEl.style.left) || rect.left || 0;
      initialTop = parseFloat(windowEl.style.top) || rect.top || 0;

      windowEl.style.left = `${initialLeft}px`;
      windowEl.style.top = `${initialTop}px`;
      windowEl.style.right = 'auto';
      windowEl.style.bottom = 'auto';

      if (typeof document !== 'undefined') {
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      const maxW = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth - (windowEl.offsetWidth || 380) - 10 : 2000;
      const maxH = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight - 50 : 2000;
      const newLeft = Math.max(10, Math.min(maxW, initialLeft + deltaX));
      const newTop = Math.max(10, Math.min(maxH, initialTop + deltaY));

      windowEl.style.left = `${newLeft}px`;
      windowEl.style.top = `${newTop}px`;
    };

    const onStop = () => {
      if (!isDragging) return;
      isDragging = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
    };

    const onPointerMove = (e: PointerEvent) => onMove(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onPointerUp = () => onStop();
    const onMouseUp = () => onStop();

    headerEl.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return;
      onStart(e.clientX, e.clientY, e.target as HTMLElement);
    });

    headerEl.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return;
      onStart(e.clientX, e.clientY, e.target as HTMLElement);
    });
  }

  public static render(snapshot: TelemetrySnapshot): void {
    this.lastSnapshot = snapshot;
    const container = this.getSingleton();
    if (!container || container.style.display === 'none') {
      if (this.domainFloatingWindowSingleton && this.domainFloatingWindowSingleton.style.display !== 'none') {
        this.renderDomainFloatingWindow(snapshot);
      }
      return;
    }

    const fps = Math.round(snapshot.fps);
    const avgFps = snapshot.avgFps.toFixed(1);
    const minFps = snapshot.minFps.toFixed(1);
    const frameTime = snapshot.frameTimeMs.toFixed(2);
    const avgFrameTime = snapshot.avgFrameTimeMs.toFixed(2);
    const maxFrameTime = snapshot.maxFrameTimeMs.toFixed(2);
    const p95 = snapshot.p95FrameTimeMs.toFixed(2);
    const p99 = snapshot.p99FrameTimeMs.toFixed(2);
    const jitter = snapshot.frameJitterMs.toFixed(2);

    let fpsColorClass = 'telemetry-fps-good';
    let barColor = '#2ecc71';
    if (fps < 30) {
      fpsColorClass = 'telemetry-fps-bad';
      barColor = '#e74c3c';
    } else if (fps < 55) {
      fpsColorClass = 'telemetry-fps-warn';
      barColor = '#f1c40f';
    }

    //? Normalização da barra de frame time (16.6ms = 50%, 33.3ms = 100%)
    const barWidthPercent = Math.min(100, Math.max(5, (snapshot.frameTimeMs / 33.3) * 100));

    const memoryDisplay = snapshot.memoryUsedMb !== undefined && snapshot.memoryTotalMb !== undefined
      ? `${snapshot.memoryUsedMb} / ${snapshot.memoryTotalMb} MB`
      : 'N/A';
    const peakMemDisplay = snapshot.memoryPeakMb !== undefined ? `${snapshot.memoryPeakMb} MB` : 'N/A';
    const allocRateDisplay = snapshot.allocationRateMbSec !== undefined ? `${snapshot.allocationRateMbSec} MB/s` : 'N/A';

    //? Status de dropped frames e jank
    const droppedColor = snapshot.droppedFramesPct > 15 ? 'telemetry-val-bad' : snapshot.droppedFramesPct > 5 ? 'telemetry-val-warn' : 'telemetry-val-good';
    const jankColor = snapshot.jankCount > 0 ? 'telemetry-val-bad' : 'telemetry-val-good';
    const lagColor = snapshot.eventLoopLagMs > 20 ? 'telemetry-val-bad' : snapshot.eventLoopLagMs > 5 ? 'telemetry-val-warn' : 'telemetry-val-good';

    const recentLogsHtml = snapshot.recentLogs.length > 0
      ? snapshot.recentLogs.slice(-4).map(log => {
          let lineClass = 'telemetry-log-line';
          if (log.includes('[ERROR]')) lineClass += ' error';
          else if (log.includes('[WARN]')) lineClass += ' warn';
          else if (log.includes('[INIT]') || log.includes('[DOMAIN]')) lineClass += ' info';
          return `<div class="${lineClass}">${this.escapeHtml(log)}</div>`;
        }).join('')
      : '<div class="telemetry-log-line">Nenhum log registrado.</div>';

    container.innerHTML = `
      <div class="telemetry-header">
        <div class="telemetry-title">
          <span class="telemetry-live-dot"></span>
          TELEMETRY
        </div>
        <span class="telemetry-badge">${snapshot.rendererType || 'Canvas 2D'}</span>
      </div>

      <!-- FPS & Frame Timing -->
      <div class="telemetry-fps-card">
        <div class="telemetry-fps-main">
          <span class="telemetry-fps-value ${fpsColorClass}">${fps}</span>
          <span class="telemetry-fps-unit">FPS</span>
        </div>
        <div class="telemetry-fps-stats">
          <div>Avg: <strong style="color:#f0f6fc">${avgFps}</strong></div>
          <div>1% Low: <strong style="color:#f0f6fc">${minFps}</strong></div>
          <div style="color:#8b949e">Target: 60</div>
        </div>
      </div>

      <!-- Frame Time Progress Bar -->
      <div class="telemetry-frametime-container">
        <div class="telemetry-frametime-row">
          <span>Frame Time: <strong style="color:#fff">${frameTime}ms</strong></span>
          <span>Avg: ${avgFrameTime}ms | Max: ${maxFrameTime}ms</span>
        </div>
        <div class="telemetry-bar-bg">
          <div class="telemetry-bar-fill" style="width: ${barWidthPercent}%; background: ${barColor};"></div>
        </div>
      </div>

      <!-- Pacing & Microstutters (Tail Latency) -->
      <div class="telemetry-section">
        <div class="telemetry-section-title">Pacing & Microstutters</div>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-label">P95 Time:</span>
            <span class="telemetry-val">${p95}ms</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">P99 Time:</span>
            <span class="telemetry-val">${p99}ms</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Jitter (&sigma;):</span>
            <span class="telemetry-val">&plusmn;${jitter}ms</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Dropped (>16ms):</span>
            <span class="telemetry-val ${droppedColor}">${snapshot.droppedFramesCount} (${snapshot.droppedFramesPct}%)</span>
          </div>
          <div class="telemetry-item" style="grid-column: 1 / -1">
            <span class="telemetry-label">Jank Spikes (>33ms):</span>
            <span class="telemetry-val ${jankColor}">${snapshot.jankCount}</span>
          </div>
        </div>
      </div>

      <!-- Thread & Subsystems -->
      <div class="telemetry-section">
        <div class="telemetry-section-title">Thread & Pipelines</div>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-label">Domain Update:</span>
            <span class="telemetry-val">${snapshot.domainTimeMs.toFixed(2)}ms</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Render Pipeline:</span>
            <span class="telemetry-val">${snapshot.renderTimeMs.toFixed(2)}ms</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Event Loop Lag:</span>
            <span class="telemetry-val ${lagColor}">${snapshot.eventLoopLagMs.toFixed(1)}ms</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Long Tasks (>50ms):</span>
            <span class="telemetry-val" style="color:${snapshot.longTasksCount > 0 ? '#f85149' : '#2ecc71'}">${snapshot.longTasksCount}</span>
          </div>
        </div>
      </div>

      <!-- Resource Consumption by Module (Breakdown em Tempo Real) -->
      <div class="telemetry-section">
        <div class="telemetry-section-title">
          <span>Consumo por Módulo (% CPU/Frame)</span>
          <span style="color:#ffd700;font-size:8.5px">Tempo Real</span>
        </div>
        <div class="telemetry-modules-breakdown">
          ${(snapshot.moduleBreakdown && snapshot.moduleBreakdown.length > 0)
            ? snapshot.moduleBreakdown.map(mod => {
                let color = '#2ecc71';
                if (mod.pct >= 50) color = '#f85149';
                else if (mod.pct >= 25) color = '#f1c40f';
                else if (mod.pct >= 15) color = '#55aaff';
                return `
                  <div class="telemetry-module-item">
                    <div class="telemetry-module-info">
                      <span class="telemetry-module-name">${this.escapeHtml(mod.name)}</span>
                      <span class="telemetry-module-vals">
                        <strong>${mod.durationMs.toFixed(2)}ms</strong>
                        <span class="telemetry-module-pct" style="color: ${color}">(${mod.pct}%)</span>
                      </span>
                    </div>
                    <div class="telemetry-module-bar-track">
                      <div class="telemetry-module-bar-fill" style="width: ${Math.min(100, Math.max(1, mod.pct))}%; background: ${color};"></div>
                    </div>
                  </div>
                `;
              }).join('')
            : '<div style="color:#8b949e;font-size:9px">Coletando amostras...</div>'
          }
        </div>
      </div>

      <!-- Domínio & Entidades (Atalho para Janela Flutuante) -->
      <div class="telemetry-section">
        <div class="telemetry-section-title">
          <span>Domínio &amp; Lógica de Entidades</span>
          <button id="telemetry-open-domain-btn" class="telemetry-btn-subwindow" title="Alternar Janela Flutuante">&#x29C9; Janela Flutuante</button>
        </div>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-label">Domain Update:</span>
            <span class="telemetry-val">${snapshot.domainTimeMs.toFixed(2)}ms</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Active Entities:</span>
            <span class="telemetry-val">${snapshot.activeEntities}</span>
          </div>
        </div>
      </div>

      <!-- Top Gargalos dos Adaptadores -->
      <div class="telemetry-section">
        <div class="telemetry-section-title">
          <span>Top Adaptadores (Render & UI)</span>
          <span style="color:#03dac6;font-size:8.5px">GPU / Web</span>
        </div>
        <div class="telemetry-modules-breakdown">
          ${(snapshot.topAdapterFilesBreakdown && snapshot.topAdapterFilesBreakdown.length > 0)
            ? snapshot.topAdapterFilesBreakdown.map((item, idx) => {
                const pct = item.layerPct ?? item.pct ?? 0;
                let color = '#2ecc71';
                if (pct >= 40) color = '#f85149';
                else if (pct >= 20) color = '#f1c40f';
                else if (pct >= 10) color = '#03dac6';
                return `
                  <div class="telemetry-module-item">
                    <div class="telemetry-module-info">
                      <span class="telemetry-module-name">
                        <strong style="color:#8b949e;margin-right:4px">#${idx + 1}</strong>
                        ${this.escapeHtml(item.file)}
                        ${(item.instances !== undefined && item.instances > 0) ? `<span style="font-size:8.5px;color:#58a6ff;margin-left:4px">[x${item.instances}]</span>` : ''}
                        <span style="font-size:8px;color:#8b949e;margin-left:4px">(${this.escapeHtml(item.module)})</span>
                      </span>
                      <span class="telemetry-module-vals">
                        <strong>${item.durationMs.toFixed(2)}ms</strong>
                        <span class="telemetry-module-pct" style="color: ${color}">(${pct}% Adap)</span>
                      </span>
                    </div>
                    <div class="telemetry-module-bar-track">
                      <div class="telemetry-module-bar-fill" style="width: ${Math.min(100, Math.max(1, pct))}%; background: ${color};"></div>
                    </div>
                  </div>
                `;
              }).join('')
            : '<div style="color:#8b949e;font-size:9px">Coletando amostras de adaptadores...</div>'
          }
        </div>
      </div>

      <!-- Render & Scene Complexity -->
      <div class="telemetry-section">
        <div class="telemetry-section-title">Rendering & Scene</div>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-label">Draw Calls:</span>
            <span class="telemetry-val telemetry-val-accent">${snapshot.drawCalls}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Culled Entities:</span>
            <span class="telemetry-val">${snapshot.culledEntities}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Active Chunks:</span>
            <span class="telemetry-val">${snapshot.activeChunksCount} (3x3)</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Texture Cache:</span>
            <span class="telemetry-val">${snapshot.textureCacheCount} imgs</span>
          </div>
        </div>
      </div>

      <!-- World & Spatial Coordinates -->
      <div class="telemetry-section">
        <div class="telemetry-section-title">World & Spatial</div>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-label">Map ID:</span>
            <span class="telemetry-val telemetry-val-accent">${snapshot.mapId}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Player:</span>
            <span class="telemetry-val">(${snapshot.playerCoords.x}, ${snapshot.playerCoords.y})</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Center Chunk:</span>
            <span class="telemetry-val">[${snapshot.currentChunk.x}, ${snapshot.currentChunk.y}]</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Zoom:</span>
            <span class="telemetry-val">${snapshot.cameraZoom.toFixed(2)}x</span>
          </div>
        </div>
      </div>

      <!-- Memory & Garbage Collection -->
      <div class="telemetry-section">
        <div class="telemetry-section-title">Memory & GC Dynamics</div>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-label">JS Heap:</span>
            <span class="telemetry-val">${memoryDisplay}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Peak Heap:</span>
            <span class="telemetry-val">${peakMemDisplay}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Alloc Rate:</span>
            <span class="telemetry-val">${allocRateDisplay}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">GC Cycles:</span>
            <span class="telemetry-val" style="color:${snapshot.gcCount > 10 ? '#f1c40f' : '#2ecc71'}">${snapshot.gcCount}</span>
          </div>
        </div>
      </div>

      <!-- Diagnostics & Logs -->
      <div class="telemetry-section" style="margin-bottom:0">
        <div class="telemetry-section-title">
          <span>Diagnostics Logs</span>
          <span style="color:${snapshot.errorCount > 0 ? '#f85149' : '#2ecc71'}">Errors: ${snapshot.errorCount}</span>
        </div>
        <div class="telemetry-logs-box">
          ${recentLogsHtml}
        </div>
      </div>
    `;

    if (this.domainFloatingWindowSingleton) {
      this.renderDomainFloatingWindow(snapshot);
    }
  }

  private static renderDomainFloatingWindow(snapshot: TelemetrySnapshot): void {
    const win = this.getDomainFloatingWindow();
    const body = win.querySelector('#telemetry-domain-body');
    if (!body) return;

    body.innerHTML = `
      <!-- Métricas de Domínio & Entidades -->
      <div class="telemetry-section">
        <div class="telemetry-section-title">
          <span>Métricas de Domínio &amp; Entidades</span>
          <span style="color:#bb86fc;font-size:8.5px">${snapshot.domainTimeMs.toFixed(2)}ms / frame</span>
        </div>
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-label">Active Entities:</span>
            <span class="telemetry-val">${snapshot.activeEntities}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">VFX Particles:</span>
            <span class="telemetry-val">${snapshot.activeParticles}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Col. Checks:</span>
            <span class="telemetry-val">${snapshot.collisionChecks}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">Resolved Col.:</span>
            <span class="telemetry-val">${snapshot.resolvedCollisions}</span>
          </div>
          <div class="telemetry-item" style="grid-column: 1 / -1">
            <span class="telemetry-label">Event Bus Throughput:</span>
            <span class="telemetry-val">${snapshot.eventThroughput} evt/f</span>
          </div>
        </div>
      </div>

      <!-- Top Domínio (Lógica & Gargalos de Arquivos) -->
      <div class="telemetry-section" style="margin-bottom:0">
        <div class="telemetry-section-title">
          <span>Top Domínio (Lógica &amp; Entidades)</span>
          <span style="color:#bb86fc;font-size:8.5px">CPU / GC-Free</span>
        </div>
        <div class="telemetry-modules-breakdown">
          ${(snapshot.topDomainFilesBreakdown && snapshot.topDomainFilesBreakdown.length > 0)
            ? snapshot.topDomainFilesBreakdown.map((item, idx) => {
                const pct = item.layerPct ?? item.pct ?? 0;
                let color = '#2ecc71';
                if (pct >= 40) color = '#f85149';
                else if (pct >= 20) color = '#f1c40f';
                else if (pct >= 10) color = '#bb86fc';
                return `
                  <div class="telemetry-module-item">
                    <div class="telemetry-module-info">
                      <span class="telemetry-module-name">
                        <strong style="color:#8b949e;margin-right:4px">#${idx + 1}</strong>
                        ${this.escapeHtml(item.file)}
                        ${(item.instances !== undefined && item.instances > 0) ? `<span style="font-size:8.5px;color:#58a6ff;margin-left:4px">[x${item.instances}]</span>` : ''}
                        <span style="font-size:8px;color:#8b949e;margin-left:4px">(${this.escapeHtml(item.module)})</span>
                      </span>
                      <span class="telemetry-module-vals">
                        <strong>${item.durationMs.toFixed(2)}ms</strong>
                        <span class="telemetry-module-pct" style="color: ${color}">(${pct}% Dom)</span>
                      </span>
                    </div>
                    <div class="telemetry-module-bar-track">
                      <div class="telemetry-module-bar-fill" style="width: ${Math.min(100, Math.max(1, pct))}%; background: ${color};"></div>
                    </div>
                  </div>
                `;
              }).join('')
            : '<div style="color:#8b949e;font-size:9px">Coletando amostras de domínio...</div>'
          }
        </div>
      </div>
    `;
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}