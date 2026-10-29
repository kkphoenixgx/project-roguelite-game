import CognitiveNPC from "../CognitiveNPC";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Attributes from "../../Attributes";
import { RegisterSpawner, type SpawnPayload } from "../../../SpawnRegistry";

@RegisterSpawner('candelion')
export default class Candelion extends CognitiveNPC {
    public npcName: string = "Rei Esqueleto Candelion";
    public agentName: string = 'candelion';
    
    constructor(id: number, coordinates: { x: number, y: number }, attributes: Attributes, eventManager: IEventManager) {
        super(id, coordinates, { width: 16, height: 16 }, 'candelion', attributes, eventManager);
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Candelion {
        const stats = payload.attributes || new Attributes(5, 10, 5, 5, 5, 5, 5, 5);
        return new Candelion(id, payload.coordinates, stats, eventManager);
    }
}
