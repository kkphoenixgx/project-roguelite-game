// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AiConfigGui from '../../../../adapters/web/GUIS/mainMenuHudModule/partials/system/aiConfig/AiConfigGui';

describe('AiConfigGui Component', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        // Mock fetch for Ollama calls
        global.fetch = vi.fn();
        // Mock localStorage
        Storage.prototype.getItem = vi.fn();
        Storage.prototype.setItem = vi.fn();
        Storage.prototype.removeItem = vi.fn();
    });

    it('deve injetar o HTML corretamente no container pai', () => {
        const gui = new AiConfigGui(container);
        expect(container.innerHTML).toContain('Ollama AI Config');
        expect(container.querySelector('#ollama-model-input')).not.toBeNull();
        expect(container.querySelector('#btn-pull-model')).not.toBeNull();
    });

    it('deve tentar carregar os modelos ao iniciar', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({ models: [{ name: 'test-model:latest', size: 1024 }] })
        };
        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const gui = new AiConfigGui(container);
        
        // Wait a bit for the async loadModels to finish
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
        const listContainer = container.querySelector('#models-list-container');
        expect(listContainer?.innerHTML).toContain('test-model:latest');
    });
});
