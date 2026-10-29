import CognitiveNPC from "../CognitiveNPC";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Attributes from "../../Attributes";
import { RegisterSpawner, type SpawnPayload } from "../../../SpawnRegistry";

@RegisterSpawner('molin')
export default class Molin extends CognitiveNPC {
    public npcName: string = "Molin";
    public agentName: string = 'molin';
    
    constructor(id: number, coordinates: { x: number, y: number }, attributes: Attributes, eventManager: IEventManager) {
        super(id, coordinates, { width: 16, height: 16 }, 'molin', attributes, eventManager);
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Molin {
        const stats = payload.attributes || new Attributes(5, 10, 5, 5, 5, 5, 5, 5);
        return new Molin(id, payload.coordinates, stats, eventManager);
    }
}
