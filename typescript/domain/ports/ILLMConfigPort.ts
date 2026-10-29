/**
 * ==============================================================================
 * PORTA SECUNDÁRIA: CONFIGURAÇÃO E SINCRONIA DE LLM (ILLMConfigPort)
 * ==============================================================================
 * Define o contrato que o Domínio exige da infraestrutura para:
 * 1. Obter o modelo ativo e configurações vigentes de IA.
 * 2. Notificar agentes BDI/LLM sobre mudanças de presets e modelfiles customizados.
 * 3. Notificar o backend sobre o modelo a ser carregado (warm-up / reload).
 * ==============================================================================
 */

export interface CustomLLMPresetDTO {
  readonly llm_model: string;
  readonly timeout: number;
  readonly num_ctx: number;
  readonly temperature: number;
  readonly max_tokens: number;
  readonly stateless: boolean;
}

export interface ILLMConfigPort {
  /** Obtém o preset de configuração atualmente ativo */
  getActivePreset(): Promise<CustomLLMPresetDTO | null>;

  /** Notifica a infraestrutura e os agentes sobre a alteração do preset */
  applyPreset(preset: CustomLLMPresetDTO): Promise<void>;

  /** Envia atualização de crenças/configurações para um agente cognitivo específico */
  notifyAgent(agentName: string, preset: CustomLLMPresetDTO): Promise<void>;
}

/**
 * Implementação Null Object / Fallback para testes do domínio isolados
 */
export const NullLLMConfigPort: ILLMConfigPort = {
  getActivePreset: async () => null,
  applyPreset: async () => {},
  notifyAgent: async () => {}
};
