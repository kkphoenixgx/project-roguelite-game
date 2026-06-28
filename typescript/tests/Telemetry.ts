/**
 * @file Telemetry.ts
 * Implementa o Sistema de Telemetria Profissional (Data-Oriented Design e Zero-GC).
 * Coleta tempo de CPU, Variação de Frame, Estabilidade e Entidades.
 */

export class SystemProfiler {
    private startTimes = new Float64Array(32);
    private totalTimes = new Float64Array(32);
    private maxTimes = new Float64Array(32);
    private calls = new Uint32Array(32);
    
    private systemNames: string[] = [];
    private nameToIndex = new Map<string, number>();

    private getIndex(system: string): number {
        let index = this.nameToIndex.get(system);
        if (index === undefined) {
            index = this.systemNames.length;
            this.systemNames.push(system);
            this.nameToIndex.set(system, index);
        }
        return index;
    }

    public start(system: string): void {
        const idx = this.getIndex(system);
        this.startTimes[idx] = performance.now();
    }

    public end(system: string): void {
        const end = performance.now();
        const idx = this.getIndex(system);
        const duration = end - this.startTimes[idx]!;
        
        this.totalTimes[idx] = this.totalTimes[idx]! + duration;
        this.calls[idx] = this.calls[idx]! + 1;
        if (duration > this.maxTimes[idx]!) {
            this.maxTimes[idx] = duration;
        }
    }

    public getReport(): string {
        let report = "";
        for (let i = 0; i < this.systemNames.length; i++) {
            const name = this.systemNames[i];
            const calls = this.calls[i]!;
            const avg = calls > 0 ? (this.totalTimes[i]! / calls).toFixed(3) : "0.000";
            const max = this.maxTimes[i]!.toFixed(3);
            report += `  - [${name}]: ${avg}ms avg (Max spike: ${max}ms) | Calls: ${calls}\n`;
        }
        return report;
    }
}

export class PerformanceMonitor {
    private frameTimes = new Float32Array(600); // Ring buffer dos últimos 600 frames (10 seg a 60fps)
    private currentIndex = 0;
    private totalFrames = 0;
    private worstFrame = 0;

    public recordFrame(deltaTimeMs: number): void {
        this.frameTimes[this.currentIndex] = deltaTimeMs;
        this.currentIndex = (this.currentIndex + 1) % this.frameTimes.length;
        this.totalFrames++;
        if (deltaTimeMs > this.worstFrame) this.worstFrame = deltaTimeMs;
    }

    public getMetrics() {
        let sum = 0;
        const count = Math.min(this.totalFrames, this.frameTimes.length);
        if (count === 0) return { avg: 0, worst: 0, variance: 0 };

        for(let i = 0; i < count; i++) sum += this.frameTimes[i]!;
        const avg = sum / count;

        let varianceSum = 0;
        for(let i = 0; i < count; i++) {
            const diff = this.frameTimes[i]! - avg;
            varianceSum += diff * diff;
        }
        const variance = varianceSum / count;

        return { avg, worst: this.worstFrame, variance };
    }
}

export class Telemetry {
    public static profiler = new SystemProfiler();
    public static performance = new PerformanceMonitor();
    public static errors = 0;
    public static activeEntities = 0;

    public static mountReport(): string {
        const perf = this.performance.getMetrics();
        const date = new Date().toISOString();
        const fps = perf.avg > 0 ? (1000 / perf.avg).toFixed(0) : "0";
        
        return `
===================================================
[METRICS REPORT] - SESSION END: ${date}
===================================================
1. PERFORMANCE (Frame Time)
  - Average Frame: ${perf.avg.toFixed(2)} ms (~${fps} FPS)
  - Worst Spike:   ${perf.worst.toFixed(2)} ms
  - FPS Variance:  ${perf.variance.toFixed(2)} (Mais baixo é melhor)

2. CPU PROFILING (Hot Paths)
${this.profiler.getReport()}
3. STABILITY & GAMEPLAY
  - Errors Caught: ${this.errors}
  - Active Entities at Exit: ${this.activeEntities}
===================================================\n`;
    }
}