import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Telemetry } from '../Telemetry'; 

describe('Geração de Logs de Telemetria (Game Shutdown Analytics)', () => {

    it('deve injetar dados no Profiler e exportar latest.log e metrics.log padronizados', () => {
        // Emulação de um Game Loop de 1.000 frames sofrendo algumas engasgadas simuladas
        for (let i = 0; i < 1000; i++) {
            const baseDtMs = 16.6; 
            const spike = i % 200 === 0 ? 30 : 0; // Spike de GC simulado a cada 200 frames
            
            Telemetry.performance.recordFrame(baseDtMs + spike);

            // Simulação de CPU Time
            Telemetry.profiler.start('Domain Math & Physics');
            // ... (tempo passando)
            Telemetry.profiler.end('Domain Math & Physics');

            Telemetry.profiler.start('GPU Render Pipeline');
            // ... (tempo passando)
            Telemetry.profiler.end('GPU Render Pipeline');
        }

        Telemetry.activeEntities = 1422;
        Telemetry.errors = 2; // Simulamos 2 exceções de UI capturadas na run

        // Act
        const reportText = Telemetry.mountReport();
        
        // Assert Report Structure
        expect(reportText).toContain('METRICS REPORT');
        expect(reportText).toContain('Domain Math & Physics');
        expect(reportText).toContain('GPU Render Pipeline');

        // Output de Arquivos Reais (Root Project /logs)
        // Subimos três níveis a partir de 'typescript/tests/domain' para chegar na raiz do projeto
        const logDir = path.resolve(__dirname, '../../../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const latestPath = path.join(logDir, 'latest.log');
        const metricsPath = path.join(logDir, 'metrics.log');

        // latest.log é SOBRESCRITO com apenas o log atual
        fs.writeFileSync(latestPath, reportText, 'utf-8');
        // metrics.log é AGREGADO (append), formando um histórico das sessões passadas delimitadas
        fs.appendFileSync(metricsPath, reportText + '\n\n', 'utf-8');
    });
});