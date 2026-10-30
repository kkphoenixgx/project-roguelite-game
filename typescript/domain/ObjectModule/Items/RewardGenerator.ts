import type { IEventManager } from "../../eventDispacher/IGameEvents";
import Coin from "./Consumables/Coin";
import HealthPotion from "./Consumables/Potions/HealthPotion";
import ManaPotion from "./Consumables/Potions/ManaPotion";
import Apple from "./Consumables/Food/Apple";
import SimpleSword from "./Weapons/MeleeWeapons/SimpleSword";
import Scythe from "./Weapons/MeleeWeapons/Scythe";
import Gun from "./Weapons/RangedWeapons/Gun";
import SimpleStaff from "./Weapons/RangedWeapons/Staffs/SimpleStaff";
import IronHelmet from "./Armors/helmet/IronHelmet";
import IronChestplate from "./Armors/chestplates/IronChestplate";
import IronPants from "./Armors/pants/IronPants";
import IronBoots from "./Armors/boots/IronBoots";
import IronGloves from "./Armors/glooves/IronGloves";
import SimpleAmulet from "./Armors/necklaces/SimpleAmulet";
import SimpleRing from "./Armors/rings/SimpleRing";
import VampireFang from "./Consumables/VampireFang";
import MegaMushroom from "./Consumables/MegaMushroom";
import AdrenalineFlask from "./Consumables/Potions/AdrenalineFlask";
import DemonBlood from "./Consumables/DemonBlood";
import ExperienceTome from "./Consumables/ExperienceTome";

export default class RewardGenerator {
    public static generateDrop(coordinates: { x: number, y: number }, eventManager: IEventManager, doubleRareChance: boolean = false): void {
        const dropChance = Math.random();
        
        if (dropChance > 0.40) return; //? Chance base de 40% de queda de espólio por abate

        let itemFactory: () => any;
        const categoryRoll = Math.random();

    //? Amuleto do Leprechaun dobra a probabilidade de itens de raridade épica (de 8% para 16%)
        const epicThreshold = doubleRareChance ? 0.84 : 0.92;

        if (categoryRoll < 0.40) {
            itemFactory = () => new Coin(Math.floor(Math.random() * 16) + 5);
        } else if (categoryRoll < 0.75) {
            const consumables = [ () => new HealthPotion(), () => new ManaPotion(), () => new Apple() ];
            itemFactory = consumables[Math.floor(Math.random() * consumables.length)]!;
        } else if (categoryRoll < epicThreshold) {
            const equips = [
                () => new SimpleSword(), () => new SimpleStaff(), () => new Gun(), () => new Scythe(),
                () => new IronHelmet(), () => new IronChestplate(), () => new IronPants(), () => new IronBoots(), () => new IronGloves(),
                () => new SimpleAmulet(), () => new SimpleRing()
            ];
            itemFactory = equips[Math.floor(Math.random() * equips.length)]!;
        } else {
            const rares = [ () => new VampireFang(), () => new MegaMushroom(), () => new AdrenalineFlask(), () => new DemonBlood(), () => new ExperienceTome() ];
            itemFactory = rares[Math.floor(Math.random() * rares.length)]!;
        }

        eventManager.dispatch('spawn', {
            type: 'droppedItem',
            coordinates: coordinates,
            item: itemFactory()
        });
    }
}