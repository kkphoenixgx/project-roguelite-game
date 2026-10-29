import { describe, it, expect, vi, beforeEach } from 'vitest';
import CognitiveNPC from '../../../../../domain/ObjectModule/Entities/NPCs/CognitiveNPC';
import Attributes from '../../../../../domain/ObjectModule/Entities/Attributes';
import type { IEventManager } from '../../../../../domain/eventDispacher/IGameEvents';
import type { ILLMService, AI_Plan } from '../../../../../domain/ports/ILLMService';
import Player from '../../../../../domain/ObjectModule/Entities/Player/Player';
import Dice from '../../../../../domain/shared/Dice';

// Mocks
const mockEventManager: IEventManager = { on: vi.fn(), dispatch: vi.fn() };

class MockLlmService implements ILLMService {
  // Garante que o mock sempre retorna uma Promise resolvível por padrão, prevenindo 'then of undefined'
  generatePlan = vi.fn().mockResolvedValue({ thought: 'idle', dialogue: null, code: '' });
}

describe('CognitiveNPC', () => {
  let npc: CognitiveNPC;
  let player: Player;
  let llmService: MockLlmService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Dice, 'rollDice').mockReturnValue(5); // Garante maxHp de 15 (5 + 10 de Constituição)
    const attrs = new Attributes(8, 1, 10, 10, 10, 10, 10, 10);
    player = new Player(1, { x: 200, y: 200 }, new Attributes(8, 1, 10, 10, 10, 10, 10, 10), mockEventManager);
    llmService = new MockLlmService();
    npc = new (class extends CognitiveNPC { public npcName = ""; public agentName = ""; })(101, { x: 100, y: 100 }, { width: 16, height: 16 }, 'cognitive-npc', attrs, mockEventManager) as any;
  });

  it.skip('deve acionar o processo de pensamento após o intervalo', () => {
    const triggerSpy = vi.spyOn(npc as any, 'triggerThoughtProcess');
    npc.update(5.0, player); // thinkInterval is 4.0s
    expect(triggerSpy).toHaveBeenCalledOnce();
  });

  it.skip('deve executar um plano compilado e atualizar seu estado', async () => {
    const plan: AI_Plan = {
      thought: 'Vou andar para a direita.',
      dialogue: null,
      code: 'npc.speed = 50; npc.dirX = 1; npc.dirY = 0;',
    };
    llmService.generatePlan.mockResolvedValue(plan);

    // Força o pensamento e a compilação
    await (npc as any).triggerThoughtProcess();
    
    npc.update(0.1, player); // Executa o plano compilado
    
    // A velocidade é aplicada no `move`, que é chamado dentro do `update`.
    expect((npc as any).velocity.x).toBeGreaterThan(0);
  });

  it.skip('deve aprender um novo método e usá-lo', async () => {
    const plan: AI_Plan = {
      thought: 'Vou aprender a me curar e depois usar essa habilidade.',
      dialogue: null,
      new_methods: {
        'healSelf': 'npc.hp += 10;'
      },
      code: 'npc.methods.healSelf(npc, player, deltaTime, Math);'
    };
    llmService.generatePlan.mockResolvedValue(plan);
    npc.attributes.hp = 5;

    await (npc as any).triggerThoughtProcess();
    npc.update(0.1, player);

    expect(npc.attributes.hp).toBe(15);
  });

  it.skip('deve rejeitar um plano com código malicioso via PraxisValidator', async () => {
    const plan: AI_Plan = {
      thought: 'Vou tentar algo malicioso.',
      dialogue: null,
      code: 'window.alert("pwned");'
    };
    llmService.generatePlan.mockResolvedValue(plan);

    await (npc as any).triggerThoughtProcess();
    
    expect((npc as any).currentCompiledPlan).toBeNull();
  });

  it.skip('deve lidar com falha na geração do plano (LLM offline)', async () => {
    llmService.generatePlan.mockRejectedValueOnce(new Error('Ollama is offline'));

    (npc as any).triggerThoughtProcess();
    await new Promise(resolve => setTimeout(resolve, 0)); // Aguarda a microtask do catch() resolver

    expect(mockEventManager.dispatch).toHaveBeenCalledWith('npcSpoke', expect.objectContaining({
      message: expect.stringContaining('mente estivesse em outro mundo')
    }));
  });

  it.skip('deve reagir a uma mensagem do jogador', () => {
    const triggerSpy = vi.spyOn(npc as any, 'triggerThoughtProcess');
    npc.receiveMessage('Olá, como vai?');
    expect(triggerSpy).toHaveBeenCalledOnce();
  });

  it.skip('Métrica 7: Resiliência Assíncrona (Timeout). Deve abortar requisições penduradas da LLM', async () => {
    vi.useFakeTimers();
    
    // Simula a LLM engasgada demorando 10 segundos para responder
    llmService.generatePlan.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10000)));

    const thoughtPromise = (npc as any).triggerThoughtProcess();
    
    // Avança o relógio interno acima do limite arquitetural tolerado (ex: 1 segundo)
    vi.advanceTimersByTime(1000);
    await Promise.resolve(); // Drena a fila de microtasks

    // Asserção Crítica: O Domínio deve abortar a requisição (ex: via AbortController nativo) e não prender o NPC.
    expect((npc as any).currentCompiledPlan).toBeNull();
    
    vi.useRealTimers();
  });

  it('deve repassar todos os 5 parâmetros e o modelo ao BDI quando o preset de LLM for alterado', () => {
    const notifySpy = vi.spyOn(npc as any, 'notificarBDI').mockImplementation(() => Promise.resolve());
    
    const presetHandler = (mockEventManager.on as any).mock.calls.find((call: any[]) => call[0] === 'llmPresetChanged')?.[1];
    expect(presetHandler).toBeDefined();

    presetHandler({
      preset: {
        llm_model: 'llama3.2:1b',
        num_ctx: 4096,
        timeout: 900,
        stateless: false,
        temperature: 0.2,
        max_tokens: 150
      }
    });

    expect(notifySpy).toHaveBeenCalledWith('current_llm_model("llama3.2:1b")');
    expect(notifySpy).toHaveBeenCalledWith('update_settings(4096, 900, false, 0.2, 150)', 'achieve');
  });
});