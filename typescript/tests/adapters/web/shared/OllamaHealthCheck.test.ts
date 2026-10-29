import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkOllamaHealth, warmupOllamaModel } from '../../../../adapters/web/shared/OllamaHealthCheck';

// Mock do logger global usado no arquivo
vi.mock('../../../../adapters/web/shared/Logger', () => ({
    logger: {
        log: vi.fn()
    }
}));

describe('OllamaHealthCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    describe('checkOllamaHealth', () => {
        it('deve retornar online=false se o fetch falhar', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
            
            const result = await checkOllamaHealth('qwen2.5:0.5b');
            expect(result.online).toBe(false);
            expect(result.models).toEqual([]);
            expect(result.hasTargetModel).toBe(false);
        });

        it('deve retornar online=true e hasTargetModel=true se o modelo existir', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    models: [
                        { name: 'llama3:latest' },
                        { name: 'qwen2.5:0.5b' }
                    ]
                })
            });
            
            const result = await checkOllamaHealth('qwen2.5:0.5b');
            expect(result.online).toBe(true);
            expect(result.models).toEqual(['llama3:latest', 'qwen2.5:0.5b']);
            expect(result.hasTargetModel).toBe(true);
        });

        it('deve retornar hasTargetModel=false se o modelo alvo não estiver instalado', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    models: [
                        { name: 'llama3:latest' }
                    ]
                })
            });
            
            const result = await checkOllamaHealth('qwen2.5:0.5b');
            expect(result.online).toBe(true);
            expect(result.hasTargetModel).toBe(false);
        });
    });

    describe('warmupOllamaModel', () => {
        it('deve enviar o prompt de roleplay corretamente', async () => {
            let capturedBody: any;
            (global.fetch as any).mockImplementationOnce(async (_url: string, options: any) => {
                capturedBody = JSON.parse(options.body);
                return {
                    ok: true,
                    json: async () => ({ response: 'PRONTO' })
                };
            });
            
            const result = await warmupOllamaModel('qwen2.5:0.5b');
            
            expect(result).toBe(true);
            expect(capturedBody.model).toBe('qwen2.5:0.5b');
            expect(capturedBody.prompt).toContain('PRONTO');
            expect(capturedBody.options.num_predict).toBe(20);
        });

        it('deve retornar false se a resposta não for ok', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500
            });
            
            const result = await warmupOllamaModel('qwen2.5:0.5b');
            expect(result).toBe(false);
        });
    });
});
