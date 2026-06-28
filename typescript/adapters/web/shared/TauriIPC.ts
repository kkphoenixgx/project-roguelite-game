import { invoke } from '@tauri-apps/api/core';
import { logger } from './Logger';

/**
 * Métrica 17: Wrapper de Monitoramento de IPC (Inter-Process Communication).
 * Intercepta todas as chamadas do Adaptador para o Rust (Tauri) e valida se o tempo 
 * de I/O ultrapassa o orçamento de 1 frame (16.6ms), evitando que o Game Loop engasgue.
 */
export async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    const start = performance.now();
    
    try {
        const result = await invoke<T>(command, args);
        const end = performance.now();
        const latency = end - start;

        if (latency > 16.6) {
            logger.log('warning' as any, `[IPC Bottleneck] Chamada Tauri '${command}' consumiu ${latency.toFixed(2)}ms. Risco crítico de Stuttering!`);
        } else {
            logger.log('ipc' as any, `[Tauri] Chamada '${command}' resolvida em ${latency.toFixed(2)}ms.`);
        }

        return result;
    } catch (error) {
        logger.log('error', `[Tauri IPC Error] Falha no comando nativo '${command}':`, error);
        throw error;
    }
}

/**
 * Métrica 18: Disparo de Telemetria pós-mortem.
 * Tenta invocar o backend em Rust para salvar os arquivos 'latest.log' e 'metrics.log'.
 */
export async function saveTelemetryLog(reportText: string, forceDownload: boolean = false): Promise<void> {
    try {
        if ((window as any).__TAURI__ && !forceDownload) {
            await invoke('save_telemetry_log', { report: reportText });
            logger.log('ipc' as any, '[Tauri] Relatório de Telemetria salvo em disco.');
        } else {
            throw new Error("Tauri ausente ou Ejeção Manual solicitada.");
        }
    } catch (e) {
        console.warn("[Telemetry] Forçando Ejeção de Blob pelo navegador...");
        
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `run-metrics-${date}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (typeof window !== 'undefined') localStorage.setItem('telemetry_latest_run', reportText);
    }
}