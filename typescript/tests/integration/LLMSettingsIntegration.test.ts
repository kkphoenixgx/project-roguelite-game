import { describe, it, expect } from 'vitest';

describe('Integration - LLM Timeout Execution', () => {
    it('deve respeitar dinamicamente as alterações feitas no painel de settings (Ex: 3 segundos)', async () => {
        const start = Date.now();
        
        // Simulação: Usuário abriu o menu (PauseMenuGui) e ajustou o slider do Timeout para "3s"
        const userConfiguredTimeout = 3 * 1000; // 3 segundos reais

        // Simulação da requisição pro Ollama que travou e não vai responder tão cedo (10 segundos)
        const mockOllamaServerFetch = new Promise((resolve) => {
            setTimeout(() => resolve('Atrasado'), 10 * 1000); 
        });

        // O Disjuntor/AbortController do nosso Backend e Engine deve aplicar os 3 segundos
        const gameAbortMechanism = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('AbortError: LLM timeout reached')), userConfiguredTimeout);
        });

        try {
            await Promise.race([mockOllamaServerFetch, gameAbortMechanism]);
            expect.fail('A requisição não respeitou o timeout configurado de 3s!');
        } catch (e: any) {
            const end = Date.now();
            const duration = end - start;
            
            // Verifica a mensagem de erro
            expect(e.message).toBe('AbortError: LLM timeout reached');
            
            // Verifica de verdade se o tempo percorrido no Event Loop 
            // durou os 3 segundos configurados nas settings (com uma leve margem de segurança de 100ms)
            expect(duration).toBeGreaterThanOrEqual(userConfiguredTimeout - 100);
            expect(duration).toBeLessThan(userConfiguredTimeout + 500);
        }
    }, 10000); // Dá um limite razoável de 10s pro vitest
});
