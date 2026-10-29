import type Item from "../../../Items/Item";
import type Weapon from "../../../Items/Weapons/Weapon";
import type Bag from "../../../Items/Storage/Bag";
import type Belt from "../../../Items/Storage/Belt";
import type Tool from "../../../Items/Tools/Tool";
import type Armor from "../../../Items/Armors/Armor";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";
import type IPlayerContext from "../IPlayerContext";
import ItemFactory from "../../../Items/ItemFactory";
import type { EquipmentSaveData } from "../../../../ports/ISaveRepository";

export default class PlayerEquipment {
  public equipedItens: Item[] = [];
  public equipment: { 
    mainHand?: Weapon | undefined;
    secondHand?: Weapon | undefined;
    helmet?: Armor | undefined;
    chestplate?: Armor | undefined;
    pants?: Armor | undefined;
    boots?: Armor | undefined;
    gloves?: Armor | undefined;
    amulet?: Armor | undefined;
    bag?: Bag | undefined;
    belt?: Belt | undefined;
    leftHandRings: Armor[];
    rightHandRings: Armor[];
  } = { leftHandRings: [], rightHandRings: [] };

  constructor(private player: IPlayerContext, private eventManager: IEventManager) {}

  public static readonly BASE_BACKPACK_SIZE = 24;

  public get maxBackpackSize(): number {
    return PlayerEquipment.BASE_BACKPACK_SIZE + (this.equipment.bag?.capacityBonus || 0);
  }

  public equipItem(backpackIndex: number) {
    const backpack = this.player.backpack;
    const item = backpack[backpackIndex];
    if (!item) return;

    const category = item.category ? item.category.toLowerCase() : '';
    
    this.eventManager.dispatch('log', { channel: 'domain', message: `Tentando equipar [${item.name}]. Categoria detectada: '${category}'`, params: [] });

    if (category === 'potion' || category === 'food' || category === 'currency' || category === 'quest') {
      this.player.consumeItem(backpackIndex);
      return;
    }

    if (category === 'belt') {
      const belt = item as Belt;
      if (this.equipment.belt) backpack.push(this.equipment.belt as any);
      this.equipment.belt = belt;
      backpack.splice(backpackIndex, 1);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${belt.name} in slot [belt]`, params: [] });
      return;
    }

    if (category === 'storage') {
      if ('toolSlots' in item) {
        const belt = item as Belt;
        if (this.equipment.belt) backpack.push(this.equipment.belt as any);
        this.equipment.belt = belt;
        backpack.splice(backpackIndex, 1);
        this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${belt.name} in slot [belt]`, params: [] });
        return;
      }
      const bag = item as Bag;
      if (this.equipment.bag) {
        const success = this.unequipBag();
        if (!success) return;
        const currentIdx = backpack.indexOf(bag as any);
        if (currentIdx !== -1) {
          backpack.splice(currentIdx, 1);
        }
      } else {
        backpack.splice(backpackIndex, 1);
      }

      this.equipment.bag = bag;
      this.syncEquipedItens();

      if (bag.storedItems && bag.storedItems.length > 0) {
        const restored = bag.retrieveItems();
        backpack.push(...restored);
        this.eventManager.dispatch('log', { 
          channel: 'domain', 
          message: `${restored.length} itens descarregados de ${bag.name} para o inventário expandido.`, 
          params: [] 
        });
      }

      this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${bag.name} in slot [bag]`, params: [] });
      return;
    }

    if (category === 'tool') {
      const tool = item as Tool;
      if (!this.equipment.belt) {
        this.eventManager.dispatch('log', { channel: 'error', message: `Você precisa equipar um Cinto (Belt) antes de equipar ferramentas!`, params: [] });
        return;
      }
      const previousTool = this.equipment.belt.equipTool(tool);
      backpack.splice(backpackIndex, 1);
      if (previousTool) {
        backpack.push(previousTool as any);
      }
      const slotIndex = this.equipment.belt.toolSlots.indexOf(tool);
      this.eventManager.dispatch('toolEquippedInBelt', { beltSlotIndex: slotIndex, tool });
      this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${tool.name} in belt slot [${slotIndex}]`, params: [] });
      return;
    }

    if (category === 'weapon' || category === 'offhand') {
      const equipable = item as any;
      const isOffhand = category === 'offhand' || equipable.weaponType === 'offhand';
      
    //? Equipa na mão secundária se o item for offhand ou se a mão principal já estiver ocupada
      const targetSlot = (isOffhand || (this.equipment.mainHand && !this.equipment.secondHand)) ? 'secondHand' : 'mainHand';

      if (targetSlot === 'secondHand') {
          if (this.equipment.secondHand) backpack.push(this.equipment.secondHand as any);
          this.equipment.secondHand = equipable;
          backpack.splice(backpackIndex, 1);
          this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${equipable.name} in secondHand`, params: [] });
          
          if (equipable.unlocksClass) {
            this.player.unlockClass(equipable.unlocksClass);
            if (!this.equipment.mainHand) {
              this.player.setActiveClass(equipable.unlocksClass);
            }
            this.eventManager.dispatch('log', { channel: 'domain', message: `Classe ${equipable.unlocksClass} vinculada via mão secundária!`, params: [] });
          }
      } else {
          if (this.equipment.mainHand) backpack.push(this.equipment.mainHand as any);
          this.equipment.mainHand = equipable;
          backpack.splice(backpackIndex, 1);
          this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${equipable.name} in mainHand`, params: [] });
          
          if (equipable.unlocksClass) {
            this.player.unlockClass(equipable.unlocksClass);
            this.player.setActiveClass(equipable.unlocksClass);
          }
      }
    } else if (category === 'armor') {
      const armor = item as any;
      const slot = armor.armorType ? (armor.armorType as string).toLowerCase() : '';
      this.eventManager.dispatch('log', { channel: 'domain', message: `ArmorType (Slot) detectado: '${slot}'`, params: [] });

      if (!slot) {
        this.eventManager.dispatch('log', { channel: 'error', message: `Erro ao equipar: O item '${item.name}' não possui um 'armorType' definido.`, params: [] });
        return;
      }
      
      if (slot === 'ring') {
        if (this.equipment.leftHandRings.length < 5) {
          this.equipment.leftHandRings.push(armor);
        } else if (this.equipment.rightHandRings.length < 5) {
          this.equipment.rightHandRings.push(armor);
        } else {
          const oldRing = this.equipment.leftHandRings.shift();
          if (oldRing) backpack.push(oldRing as any);
          this.equipment.leftHandRings.push(armor);
        }
        backpack.splice(backpackIndex, 1);
        this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${armor.name} in rings`, params: [] });
        return;
      }

      if ((this.equipment as any)[slot]) {
        backpack.push((this.equipment as any)[slot]);
      }
      (this.equipment as any)[slot] = armor;
      backpack.splice(backpackIndex, 1);
      this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${armor.name} in slot [${slot}]`, params: [] });
    } else {
      this.eventManager.dispatch('log', { channel: 'error', message: `Erro ao equipar: Categoria '${item.category}' não reconhecida no item '${item.name}'.`, params: [] });
    }
  }

  public unequipItem(slot: string, index?: number) {
    const backpack = this.player.backpack;
    if (slot !== 'bag' && backpack.length >= this.maxBackpackSize) {
      this.eventManager.dispatch('log', { channel: 'error', message: `Inventário cheio! Não é possível desequipar o item.`, params: [] });
      return;
    }

    if (slot === 'leftHandRings' && index !== undefined) {
      if (this.equipment.leftHandRings && this.equipment.leftHandRings.length > index) {
        const ring = this.equipment.leftHandRings.splice(index, 1)[0];
        if (ring) backpack.push(ring as any);
      }
    } else if (slot === 'rightHandRings' && index !== undefined) {
      if (this.equipment.rightHandRings && this.equipment.rightHandRings.length > index) {
        const ring = this.equipment.rightHandRings.splice(index, 1)[0];
        if (ring) backpack.push(ring as any);
      }
    } else if (slot === 'bag' && this.equipment.bag) {
      this.unequipBag();
    } else if (slot === 'belt' && this.equipment.belt) {
      backpack.push(this.equipment.belt as any);
      this.equipment.belt = undefined;
      this.eventManager.dispatch('log', { channel: 'domain', message: `Unequipped belt`, params: [] });
    } else if ((slot === 'beltTool' || slot === 'tool') && this.equipment.belt) {
      const toolIdx = index !== undefined ? index : this.equipment.belt.activeToolIndex;
      const tool = this.equipment.belt.unequipTool(toolIdx);
      if (tool) {
        backpack.push(tool as any);
        this.eventManager.dispatch('toolUnequippedFromBelt', { beltSlotIndex: toolIdx, tool });
        this.eventManager.dispatch('log', { channel: 'domain', message: `Unequipped tool ${tool.name} from belt slot [${toolIdx}]`, params: [] });
      }
    } else if (slot === 'mainHand' && this.equipment.mainHand) {
      backpack.push(this.equipment.mainHand as any);
      this.equipment.mainHand = undefined;
      this.eventManager.dispatch('log', { channel: 'domain', message: `Unequipped mainHand`, params: [] });
      if (this.equipment.secondHand && (this.equipment.secondHand as any).unlocksClass) {
        this.player.setActiveClass((this.equipment.secondHand as any).unlocksClass);
      }
    } else if (slot !== 'mainHand' && slot !== 'leftHandRings' && slot !== 'rightHandRings' && slot !== 'belt' && (this.equipment as any)[slot]) {
      backpack.push((this.equipment as any)[slot]);
      (this.equipment as any)[slot] = undefined;
      this.eventManager.dispatch('log', { channel: 'domain', message: `Unequipped ${slot}`, params: [] });
    }
  }

  /**
   * Alterna dinamicamente a arma da mão principal com a da mão secundária (estilo Dark Souls / Quick Swap).
   */
  public swapWeapons(): void {
    if (!this.equipment.mainHand && !this.equipment.secondHand) {
      return;
    }
    const temp = this.equipment.mainHand;
    this.equipment.mainHand = this.equipment.secondHand;
    this.equipment.secondHand = temp;
    this.eventManager.dispatch('log', { channel: 'domain', message: `Armas alternadas entre mão principal e secundária.`, params: [] });

    if (this.equipment.mainHand && (this.equipment.mainHand as any).unlocksClass) {
      const targetClass = (this.equipment.mainHand as any).unlocksClass;
      if (!this.player.unlockedClasses.includes(targetClass)) {
        this.player.unlockClass(targetClass);
      }
      this.player.setActiveClass(targetClass);
      this.eventManager.dispatch('classChanged', { oldClassInstance: null, newClassInstance: null });
    }
  }

  public equipToolInBelt(backpackIndex: number, beltSlotIndex?: number): boolean {
    const backpack = this.player.backpack;
    const item = backpack[backpackIndex];
    if (!item || item.category !== 'tool') return false;
    if (!this.equipment.belt) {
      this.eventManager.dispatch('log', { channel: 'error', message: `Você precisa equipar um Cinto (Belt) antes de equipar ferramentas!`, params: [] });
      return false;
    }
    const tool = item as Tool;
    const previous = this.equipment.belt.equipTool(tool, beltSlotIndex);
    backpack.splice(backpackIndex, 1);
    if (previous) backpack.push(previous as any);
    const actualSlot = beltSlotIndex !== undefined ? beltSlotIndex : this.equipment.belt.toolSlots.indexOf(tool);
    this.eventManager.dispatch('toolEquippedInBelt', { beltSlotIndex: actualSlot, tool });
    this.eventManager.dispatch('log', { channel: 'domain', message: `Equipped ${tool.name} in belt slot [${actualSlot}]`, params: [] });
    return true;
  }

  public unequipToolFromBelt(beltSlotIndex: number): boolean {
    if (!this.equipment.belt) return false;
    if (this.player.backpack.length >= this.maxBackpackSize) {
      this.eventManager.dispatch('log', { channel: 'error', message: `Inventário cheio! Não é possível desequipar a ferramenta.`, params: [] });
      return false;
    }
    const tool = this.equipment.belt.unequipTool(beltSlotIndex);
    if (!tool) return false;
    this.player.backpack.push(tool as any);
    this.eventManager.dispatch('toolUnequippedFromBelt', { beltSlotIndex, tool });
    this.eventManager.dispatch('log', { channel: 'domain', message: `Unequipped ${tool.name} from belt slot [${beltSlotIndex}]`, params: [] });
    return true;
  }

  public setActiveTool(beltSlotIndex: number): boolean {
    if (!this.equipment.belt) return false;
    const success = this.equipment.belt.setActiveToolIndex(beltSlotIndex);
    if (success) {
      const activeTool = this.equipment.belt.getActiveTool();
      this.eventManager.dispatch('activeToolChanged', { activeIndex: beltSlotIndex, tool: activeTool });
      this.eventManager.dispatch('log', { channel: 'domain', message: `Active tool set to slot [${beltSlotIndex}]: ${activeTool?.name || 'Vazio'}`, params: [] });
    }
    return success;
  }

  public getActiveTool(): Tool | null {
    return this.equipment.belt?.getActiveTool() || null;
  }

  /**
   * Desequipa a bolsa (Bag) do jogador seguindo as regras estritas de integridade de espaço:
   * 1. Se todos os slots combinados (base + bolsa) estiverem totalmente ocupados, rejeita a ação pois não há vaga para a própria bolsa.
   * 2. Se o inventário base (0..23) estiver lotado (24 ou mais itens), o 24º item (índice 23) e todos os itens subsequentes
   *    são empacotados dentro da bolsa antes dela ser guardada no inventário base.
   * 3. A própria bolsa desequipada ocupa a vaga restante no inventário base.
   */
  public unequipBag(): boolean {
    if (!this.equipment.bag) return false;
    const bag = this.equipment.bag;
    const backpack = this.player.backpack;
    const totalCapacity = PlayerEquipment.BASE_BACKPACK_SIZE + (bag.capacityBonus || 0);

    //? Se todos os slots estiverem preenchidos, impede o desequipamento da bolsa
    if (backpack.length >= totalCapacity) {
      this.eventManager.dispatch('log', { 
        channel: 'error', 
        message: `Inventário e bolsa totalmente cheios (${backpack.length}/${totalCapacity})! Não há espaço para guardar a bolsa.`, 
        params: [] 
      });
      return false;
    }

    //? Transfere itens excedentes a partir do índice 23 para os slots internos da bolsa
    if (backpack.length >= PlayerEquipment.BASE_BACKPACK_SIZE) {
      const excessItems = backpack.splice(PlayerEquipment.BASE_BACKPACK_SIZE - 1);
      bag.storeItems(excessItems);
      this.eventManager.dispatch('log', { 
        channel: 'domain', 
        message: `${excessItems.length} itens foram guardados dentro da ${bag.name} ao desequipá-la.`, 
        params: [] 
      });
    }

    backpack.push(bag as any);
    this.equipment.bag = undefined;
    this.syncEquipedItens();
    this.eventManager.dispatch('log', { channel: 'domain', message: `Unequipped bag ${bag.name}`, params: [] });
    return true;
  }

  public syncEquipedItens(): void {
    this.equipedItens.length = 0;
    const eq = this.equipment;
    if (eq.mainHand) this.equipedItens.push(eq.mainHand);
    if (eq.secondHand) this.equipedItens.push(eq.secondHand);
    if (eq.helmet) this.equipedItens.push(eq.helmet);
    if (eq.chestplate) this.equipedItens.push(eq.chestplate);
    if (eq.pants) this.equipedItens.push(eq.pants);
    if (eq.boots) this.equipedItens.push(eq.boots);
    if (eq.gloves) this.equipedItens.push(eq.gloves);
    if (eq.amulet) this.equipedItens.push(eq.amulet);
    if (eq.bag) this.equipedItens.push(eq.bag);
    if (eq.belt) this.equipedItens.push(eq.belt);
    for (const r of eq.leftHandRings) this.equipedItens.push(r);
    for (const r of eq.rightHandRings) this.equipedItens.push(r);
  }

  public serialize(): EquipmentSaveData {
    return {
      mainHand: this.equipment.mainHand ? ItemFactory.serializeItem(this.equipment.mainHand) : null,
      secondHand: this.equipment.secondHand ? ItemFactory.serializeItem(this.equipment.secondHand) : null,
      helmet: this.equipment.helmet ? ItemFactory.serializeItem(this.equipment.helmet) : null,
      chestplate: this.equipment.chestplate ? ItemFactory.serializeItem(this.equipment.chestplate) : null,
      pants: this.equipment.pants ? ItemFactory.serializeItem(this.equipment.pants) : null,
      boots: this.equipment.boots ? ItemFactory.serializeItem(this.equipment.boots) : null,
      gloves: this.equipment.gloves ? ItemFactory.serializeItem(this.equipment.gloves) : null,
      amulet: this.equipment.amulet ? ItemFactory.serializeItem(this.equipment.amulet) : null,
      bag: this.equipment.bag ? ItemFactory.serializeItem(this.equipment.bag) : null,
      belt: this.equipment.belt ? ItemFactory.serializeItem(this.equipment.belt) : null,
      leftHandRings: this.equipment.leftHandRings.map(r => ItemFactory.serializeItem(r)),
      rightHandRings: this.equipment.rightHandRings.map(r => ItemFactory.serializeItem(r))
    };
  }

  public restore(data: EquipmentSaveData): void {
    if (!data) return;

    const makeItem = (saved: any) => saved && typeof saved.itemId === 'number' ? ItemFactory.createItem(saved.itemId, saved) : undefined;

    this.equipment.mainHand = makeItem(data.mainHand) as any;
    this.equipment.secondHand = makeItem(data.secondHand) as any;
    this.equipment.helmet = makeItem(data.helmet) as any;
    this.equipment.chestplate = makeItem(data.chestplate) as any;
    this.equipment.pants = makeItem(data.pants) as any;
    this.equipment.boots = makeItem(data.boots) as any;
    this.equipment.gloves = makeItem(data.gloves) as any;
    this.equipment.amulet = makeItem(data.amulet) as any;
    this.equipment.bag = makeItem(data.bag) as any;
    this.equipment.belt = makeItem(data.belt) as any;

    this.equipment.leftHandRings = [];
    if (Array.isArray(data.leftHandRings)) {
      for (const r of data.leftHandRings) {
        const item = makeItem(r);
        if (item) this.equipment.leftHandRings.push(item as any);
      }
    }

    this.equipment.rightHandRings = [];
    if (Array.isArray(data.rightHandRings)) {
      for (const r of data.rightHandRings) {
        const item = makeItem(r);
        if (item) this.equipment.rightHandRings.push(item as any);
      }
    }

    this.syncEquipedItens();
  }
}
