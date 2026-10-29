import CognitiveNPC from "../CognitiveNPC";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents"; 
import Attributes from "../../Attributes";
import { RegisterSpawner, type SpawnPayload } from "../../../SpawnRegistry"; 

@RegisterSpawner('molor')
export default class Molor extends CognitiveNPC {
    public npcName: string;
    public agentName: string = 'molor';
    public persona: string;
    constructor(id: number, coordinates: { x: number, y: number }, attributes: Attributes, eventManager: IEventManager, llmService?: any) {
        super(id, coordinates, { width: 16, height: 16 }, 'molor', attributes, eventManager);
        
        this.npcName = "Diretor Molor";
        this.persona = `
        Você é o Diretor Molor, um mago extremamente poderoso, sábio e levemente impaciente da Academia de Magia.
        Você fala de forma eloquente, enigmática e trata o jogador como um "Jovem Axiomante" inexperiente.
        Você adora ensinar e filosofar sobre as energias arcanas, mas odeia que desperdicem seu tempo com bobagens.
        Seja sucinto em suas respostas, mas não perca a grandiosidade. Nunca saia do personagem.
        `;

        this.classManager.unlockClass('Mago');
        this.classManager.setActiveClass('Mago');
        this.classManager.unlockSkill('m_t4_teleport');
        this.classManager.unlockSkill('m_t5_blackhole');
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Molor {
        const molorStats = payload.attributes || new Attributes(6, 50, 8, 12, 10, 99, 99, 85);
        return new Molor(id, payload.coordinates, molorStats, eventManager, (payload as any).llmService);
    }
}