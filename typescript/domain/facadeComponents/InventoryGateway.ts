import type Player from "../ObjectModule/Entities/Player/Player";
import type { ILogger } from "../ports/ILogger";
import type { IEventManager } from "../eventDispacher/IGameEvents";

export default class InventoryGateway {
    constructor(
        private player: Player,
        private logger: ILogger,
        private eventManager: IEventManager,
        private setViewedClass: (cls: string | null) => void
    ) {
    //? Reage a intenções da interface de forma reativa via barramento de eventos
        this.eventManager.on('inventoryAction', (payload) => {
            this.manage(payload.action, payload.payload);
            this.broadcastState();
        });
    }

    private broadcastState() {
        this.eventManager.dispatch('inventoryUpdated', {
            backpack: (this.player as any).backpack,
            equipment: (this.player as any).equipment
        });
    }

    public manage(
        action: 'equip' | 'unequip' | 'consume' | 'delete' | 'equipTool' | 'unequipTool' | 'selectTool' | 'swapWeapons', 
        payload: { index?: number; slot?: string; beltSlotIndex?: number }
    ): void {
        if (action === 'swapWeapons') {
            this.player.swapWeapons();
            const handItem = (this.player as any).equipment?.mainHand;
            if (handItem && 'unlocksClass' in handItem && handItem.unlocksClass) {
                this.setViewedClass(null);
            }
            return;
        }
        if (action === 'equip' && payload.index !== undefined) {
            this.player.equipItem(payload.index);
            
      //? Auto-equipa classe correspondente à arma selecionada para fluidez de gameplay
            const equipment = (this.player as any).equipment;
            const handItem = equipment?.mainHand || equipment?.hand || equipment?.weapon; //? Slot canônico da mão principal no inventário
            
            this.logger.log('actions', `[DomainFacade] Item equipado. Arma atual: ${handItem?.name} | Desbloqueia: ${handItem?.unlocksClass}`);

            if (handItem && 'unlocksClass' in handItem && handItem.unlocksClass) {
                if (!this.player.unlockedClasses.includes(handItem.unlocksClass)) {
                    this.player.unlockedClasses.push(handItem.unlocksClass);
                }
                this.player.setActiveClass(handItem.unlocksClass);
                this.setViewedClass(null);
                this.logger.log('actions', `[DomainFacade] Forçando classe do jogador para: ${handItem.unlocksClass}`);
                this.eventManager.dispatch('classChanged', { oldClassInstance: null, newClassInstance: null });
            }
        }
        if (action === 'unequip' && payload.slot !== undefined) {
            this.player.unequipItem(payload.slot, payload.index);
        }
        if (action === 'consume' && payload.index !== undefined) {
            this.player.consumeItem(payload.index);
        }
        if (action === 'delete' && payload.index !== undefined) {
            this.player.deleteItem(payload.index);
        }
        if (action === 'equipTool' && payload.index !== undefined) {
            this.player.equipToolInBelt(payload.index, payload.beltSlotIndex);
        }
        if (action === 'unequipTool') {
            const slotIdx = payload.beltSlotIndex !== undefined ? payload.beltSlotIndex : (payload.index ?? 0);
            this.player.unequipToolFromBelt(slotIdx);
        }
        if (action === 'selectTool') {
            const slotIdx = payload.beltSlotIndex !== undefined ? payload.beltSlotIndex : (payload.index ?? 0);
            this.player.setActiveTool(slotIdx);
        }
    }
}
