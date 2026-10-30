import CognitiveNPC from "./CognitiveNPC";
import type { IEventManager } from "../../../eventDispacher/IGameEvents";
import Attributes from "../Attributes";
import { RegisterSpawner, type SpawnPayload } from "../../SpawnRegistry";

@RegisterSpawner('molor')
export default class Molor extends CognitiveNPC {
    public npcName: string = "Diretor Molor";
    public agentName: string = "molor";
    
    constructor(id: number, coordinates: { x: number, y: number }, attributes: Attributes, eventManager: IEventManager, llmService?: any) {
        super(id, coordinates, { width: 32, height: 32 }, 'molor', attributes, eventManager);
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Molor {
    //? Atributos elevados condizentes com Diretor da Academia de Magia
        const molorStats = payload.attributes || new Attributes(6, 50, 8, 12, 10, 99, 99, 85);
    //? Injeção de dependência de llmService configurada pelo adaptador
        return new Molor(id, payload.coordinates, molorStats, eventManager, (payload as any).llmService);
    }
}