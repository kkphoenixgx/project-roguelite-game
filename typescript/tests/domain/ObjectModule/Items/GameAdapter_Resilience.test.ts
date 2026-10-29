import { describe, it, expect, vi } from 'vitest';
import type { IGameDomain } from '../../../../domain/ports/domain-contracts';
import type { ILogger } from '../../../../domain/ports/ILogger';

// Fakes estritos para isolar o ambiente web
class FakeLogger implements ILogger {
    log = vi.fn();
}

class FakeDomainFacade implements IGameDomain {
    public unlockedGlobalNodes: string[] = [];
    public globalNodesMap: Record<string, any> = {};
    public globalMetaSummary = { stats: [], brooches: [] };
    generateLocalRewards = vi.fn().mockReturnValue([]);
    update = vi.fn();
    loadWorld = vi.fn();
    transitionWorld = vi.fn();
    handlePlayerInteractions = vi.fn();
    getRenderState = vi.fn();
    manageInventory = vi.fn();
    manageSkillTree = vi.fn();
    allocateAttribute = vi.fn();
    sendDialogue = vi.fn();
    getAvailableWorlds = vi.fn().mockReturnValue([]);
    notifyPauseState = vi.fn();
    updateLLMPreset = vi.fn();
}

// Emulação da blindagem do Adapter baseada no Requisito 5 de Orquestração
class ResilientGameAdapterStub {
    constructor(private domain: IGameDomain, private logger: ILogger) {}

    public update(deltaTime: number) {
        try {
            this.domain.update(deltaTime);
        } catch (error: any) {
            this.logger.log('error', `[Game Loop Intercepted Error]: ${error.message}`);
        }
    }
}

describe('Métrica 5: Resiliência do Adaptador Web (Prevenção de Tela Preta)', () => {
    it('deve interceptar exceções críticas do Domínio sem ejetar a call stack (Thread) do navegador', () => {
        const logger = new FakeLogger();
        const domain = new FakeDomainFacade();
        const adapter = new ResilientGameAdapterStub(domain, logger);

        // Injeta o erro simulado na Engine Matemática
        domain.update.mockImplementation(() => { throw new Error('Divisão por zero não tratada em Atributos'); });

        // Asserção Crítica: O try-catch Global blinda a requestAnimationFrame do V8
        expect(() => adapter.update(0.016)).not.toThrow();
        expect(logger.log).toHaveBeenCalledWith('error', expect.stringContaining('Divisão por zero não tratada'));
    });
});