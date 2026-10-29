/**
 * Validador Estrito ("Mini Praxis") para o código gerado pelo Ollama.
 * Garante a integridade do Game Loop (Erros de Sintaxe) e a Segurança do PC do Jogador (Sandbox).
 */
export class PraxisValidator {
  //? Lista de palavras-chave estritamente proibidas na sandbox cognitiva
    private static forbiddenTokens = [
        'window', 'document', 'eval', 'setTimeout', 'setInterval',
        'fetch', 'XMLHttpRequest', 'WebSocket', 'globalThis', 
        'process', 'require', 'import', 'localStorage', 'sessionStorage',
        'indexedDB', 'caches', '__proto__', 'constructor', 'prototype',
        'debugger', 'alert'
    ];

    public static validateCode(code: string): { isValid: boolean, reason?: string } {
        for (const token of this.forbiddenTokens) {
      //? Regex delimitada por borda de palavra para evitar falsos positivos parciais
            const regex = new RegExp(`\\b${token}\\b`);
            if (regex.test(code)) {
                return { isValid: false, reason: `Token de segurança violado: '${token}'` };
            }
        }

        try {
    //? Valida sintaxe antes de autorizar despacho da intenção cognitiva
            new Function("npc", "player", "deltaTime", "Math", code);
        } catch (error: any) {
            return { isValid: false, reason: `Erro Sintático do LLM: ${error.message}` };
        }

        return { isValid: true };
    }
}