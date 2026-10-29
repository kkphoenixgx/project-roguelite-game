import { logger } from './Logger';

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const WARMUP_MODEL = 'qwen2.5:0.5b';

export interface OllamaHealthResult {
    online: boolean;
    models: string[];
    hasTargetModel: boolean;
}

/**
 * Verifica se o Ollama está online e quais modelos estão instalados.
 */
export async function checkOllamaHealth(targetModel: string = ''): Promise<OllamaHealthResult> {
    logger.log('init' as any, 'Verificando status do daemon local do Ollama na porta 11434...');
    try {
        const start = performance.now();
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET' });
        const end = performance.now();
        
        if (response.ok) {
            const data = await response.json();
            const modelNames: string[] = (data.models || []).map((m: any) => m.name || m.model || '');
            let hasTarget = false;
            if (targetModel) {
                const targetPrefix = targetModel.split(':')[0] || '';
                hasTarget = modelNames.some(name => name.startsWith(targetPrefix));
            }
            
            logger.log('init' as any, `[Ollama Health] Online em ${(end - start).toFixed(0)}ms. Modelos: [${modelNames.join(', ')}]. Modelo alvo (${targetModel}): ${hasTarget ? '✓' : '✗'}`);
            return { online: true, models: modelNames, hasTargetModel: hasTarget };
        }
        
        logger.log('warning' as any, `[Ollama Health] Respondeu com status de erro: ${response.status}`);
        return { online: false, models: [], hasTargetModel: false };
    } catch (error) {
        logger.log('error' as any, '[Ollama Health] Offline ou inacessível.', error);
        return { online: false, models: [], hasTargetModel: false };
    }
}

/**
 * Envia um prompt simples para o Ollama para forçar o carregamento do modelo na VRAM.
 * Isso elimina o "cold start" da primeira mensagem real do jogador.
 */
export async function warmupOllamaModel(targetModel: string): Promise<boolean> {
    logger.log('init' as any, `[Ollama Warmup] Esquentando o modelo ${targetModel} na VRAM com mensagem de papel...`);
    
    try {
        const start = performance.now();
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: targetModel,
                prompt: 'Você é o motor cognitivo dos NPCs deste jogo de RPG. Responda apenas "PRONTO" se estiver pronto para assumir seu papel.',
                stream: false,
                options: { num_predict: 20 }
            })
        });
        const end = performance.now();
        
        if (response.ok) {
            const data = await response.json();
            logger.log('init' as any, `[Ollama Warmup] Modelo ${targetModel} carregado na VRAM em ${((end - start) / 1000).toFixed(1)}s. Resposta: ${data.response}`);
            return true;
        }
        
        logger.log('warning' as any, `[Ollama Warmup] Falha (status ${response.status}). O modelo pode não estar instalado.`);
        return false;
    } catch (error) {
        logger.log('error' as any, '[Ollama Warmup] Impossível aquecer o modelo. Ollama offline?', error);
        return false;
    }
}