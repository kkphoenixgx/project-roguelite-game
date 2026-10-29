import type { ILogger } from "../ports/ILogger";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import type ObjectElementManager from "../ObjectModule/ObjectElementManager";

/**
 * ? Gerencia a ponte de comunicação IPC entre Tauri/Panteão (Rust) e o Domínio.
 */
export class TauriPanteaoBridge {
    public static setupIpcListeners(
        logger: ILogger,
        eventManager: IEventManager,
        objectManager: ObjectElementManager,
        updateLLMPreset: (preset: any) => void,
        config: any
    ): void {
        if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
            return;
        }

        import('@tauri-apps/api/event').then(({ listen }) => {
            listen('panteao-event', (event: any) => {
                const payload = event.payload;
                logger.log('domain', 'Recebido do Jason via IPC:', payload);
                
                if (payload.action && typeof payload.action === 'string') {
                    const match = payload.action.match(/^(\w+)\((.+)\)$/s);
                    if (match) {
                        payload.action = match[1];
                        let rawContent = match[2].trim();
                        if ((rawContent.startsWith('"') && rawContent.endsWith('"')) ||
                            (rawContent.startsWith("'") && rawContent.endsWith("'"))) {
                            rawContent = rawContent.slice(1, -1);
                        }
                        payload.content = rawContent;
                    }
                }
                
                eventManager.dispatch('bdiAction', payload);
            });

            listen('panteao-error', (event: any) => {
                const payload = event.payload;
                try {
                    const errorData = typeof payload === 'string' ? JSON.parse(payload) : payload;
                    logger.log('domain', 'Erro crítico do Panteão:', errorData);
                    eventManager.dispatch('panteaoError', errorData);
                } catch {
                    eventManager.dispatch('panteaoError', { message: payload });
                }
            });

            listen('llm-settings-changed', (event: any) => {
                const settings = event.payload;
                logger.log('domain', 'Novas configurações LLM recebidas via IPC:', settings);
                if (settings && typeof settings === 'object') {
                    updateLLMPreset({
                        llm_model: settings.llm_model || "qwen2.5:0.5b",
                        timeout: settings.timeout ?? 600,
                        num_ctx: settings.num_ctx ?? 2048,
                        temperature: settings.temperature ?? 0.7,
                        max_tokens: settings.max_tokens ?? 100,
                        stateless: settings.stateless ?? true
                    });
                }
            });

            listen('llm-model-changed', (event: any) => {
                const newModel = event.payload;
                logger.log('domain', 'Novo modelo LLM recebido via IPC:', newModel);
                const npcs = objectManager.getEntities().filter(e => (e as any).agentName != null);
                npcs.forEach(npc => {
                    const agentName = (npc as any).agentName;
                    if (agentName) {
                        import('@tauri-apps/api/core').then(({ invoke }) => {
                            invoke('panteao_send', { agent: agentName, ilf: 'tell', content: `current_llm_model("${newModel}")` });
                        }).catch(e => logger.log('error', 'Falha ao enviar modelo LLM para Panteão:', e));
                    }
                });
            });
            
            import('@tauri-apps/api/core').then(({ invoke }) => {
                invoke('get_active_model').then((model) => {
                    logger.log('domain', 'Modelo LLM inicial carregado:', model);
                    (config as any).activeLlmModel = model;
                });
            });
        }).catch(err => logger.log('error', 'Falha ao importar Tauri listen no DomainFacade:', err));
    }
}
