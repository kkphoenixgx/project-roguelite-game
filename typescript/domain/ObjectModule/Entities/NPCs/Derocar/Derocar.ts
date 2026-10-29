import CognitiveNPC from "../CognitiveNPC";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import Attributes from "../../Attributes";
import { RegisterSpawner, type SpawnPayload } from "../../../SpawnRegistry";

@RegisterSpawner('derocar')
export default class Derocar extends CognitiveNPC {
    public npcName: string = "Derocar";
    public agentName: string = 'derocar';
    
    constructor(id: number, coordinates: { x: number, y: number }, attributes: Attributes, eventManager: IEventManager) {
        super(id, coordinates, { width: 16, height: 16 }, 'derocar', attributes, eventManager);

        // Equip and configure Class (Derocar is a Prodigy Mage)
        this.classManager.unlockClass('Mago');
        this.classManager.setActiveClass('Mago');
        this.classManager.unlockSkill('m_t4_teleport');
        this.classManager.equipSkillInLoadout('m_t4_teleport', 0);
    }

    public static createSpawn(id: number, payload: SpawnPayload, eventManager: IEventManager): Derocar {
        const stats = payload.attributes || new Attributes(5, 15, 5, 5, 5, 5, 5, 5);
        return new Derocar(id, payload.coordinates, stats, eventManager);
    }
}
