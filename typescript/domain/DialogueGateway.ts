import type { ILogger } from "./ports/ILogger";
import type ObjectElementManager from "./ObjectModule/ObjectElementManager";

export default class DialogueGateway {
    constructor(
        private objectManager: ObjectElementManager,
        private logger: ILogger
    ) {}

    public sendDialogue(message: string, targetNpcId?: number): void {
        this.logger.log('input', `Player says: "${message}" to NPC ${targetNpcId}`);
        if (targetNpcId) {
            const npc = this.objectManager.getElementById(targetNpcId) as any;
            if (npc && typeof npc.receiveMessage === 'function') {
                npc.receiveMessage(message);
            }
        }
    }
}
