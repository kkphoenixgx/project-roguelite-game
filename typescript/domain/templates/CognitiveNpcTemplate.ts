import CognitiveNPC from "../ObjectModule/Entities/NPCs/CognitiveNPC";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import Attributes from "../ObjectModule/Entities/Attributes";
import { RegisterSpawner, type SpawnPayload } from "../ObjectModule/SpawnRegistry";

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: NPC COGNITIVO COM BDI & LLM
 * ==============================================================================
 * Regras Obrigatórias para quem está criando um novo NPC:
 * 1. Anote a classe com `@RegisterSpawner('nome_do_npc')`.
 * 2. Estenda `CognitiveNPC`.
 * 3. Defina `npcName` (exibição na UI) e `agentName` (identificador na engine Panteão/Rust).
 * 4. Defina a `persona` detalhada em Markdown/Texto para contextualizar o Ollama.
 * 5. Configure classes e habilidades desbloqueadas via `this.classManager`.
 * 6. Crie o arquivo `<agentName>.asl` correspondente e registre-o no `project.jcm`.
 * ==============================================================================
 */
@RegisterSpawner('templateNpc')
export default class TemplateCognitiveNpcTemplate extends CognitiveNPC {
  public npcName: string;
  public agentName: string = 'templateNpc';
  public persona: string;

  constructor(
    id: number,
    coordinates: { x: number; y: number },
    attributes: Attributes,
    eventManager: IEventManager,
    _llmService?: any
  ) {
    super(id, coordinates, { width: 16, height: 16 }, 'templateNpc', attributes, eventManager);

    this.npcName = "Arquétipo Guardião";
    this.persona = `
    Você é o Arquétipo Guardião, um NPC misterioso que observa os viajantes em seu percurso.
    Você fala de forma calma, acolhedora e com sabedoria ancestral.
    Seja breve, conciso e nunca quebre o personagem ou use formatação excessiva.
    `;

    // Configuração inicial de classes/skills do NPC
    this.classManager.unlockClass('Guerreiro');
    this.classManager.setActiveClass('Guerreiro');
  }

  /**
   * Fábrica estática requerida pelo `@RegisterSpawner`
   */
  public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): TemplateCognitiveNpcTemplate {
    const stats = payload.attributes || new Attributes(8, 10, 12, 10, 14, 10, 12, 10);
    return new TemplateCognitiveNpcTemplate(
      id,
      payload.coordinates,
      stats,
      eventManager,
      (payload as any).llmService
    );
  }
}
