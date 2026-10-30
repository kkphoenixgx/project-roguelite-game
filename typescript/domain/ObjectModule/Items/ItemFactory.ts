import type Item from "./Item";
import type { ItemSaveData } from "../../ports/ISaveRepository";

import SimpleSword from "./Weapons/MeleeWeapons/SimpleSword";
import Scythe from "./Weapons/MeleeWeapons/Scythe";
import Gun from "./Weapons/RangedWeapons/Gun";
import SimpleStaff from "./Weapons/RangedWeapons/Staffs/SimpleStaff";
import FishingRod from "./Weapons/RangedWeapons/FishingRod";

import IronHelmet from "./Armors/helmet/IronHelmet";
import IronChestplate from "./Armors/chestplates/IronChestplate";
import IronPants from "./Armors/pants/IronPants";
import IronBoots from "./Armors/boots/IronBoots";
import IronGloves from "./Armors/glooves/IronGloves";
import SimpleAmulet from "./Armors/necklaces/SimpleAmulet";
import SimpleRing from "./Armors/rings/SimpleRing";

import HealthPotion from "./Consumables/Potions/HealthPotion";
import ManaPotion from "./Consumables/Potions/ManaPotion";
import AdrenalineFlask from "./Consumables/Potions/AdrenalineFlask";
import Apple from "./Consumables/Food/Apple";
import Coin from "./Consumables/Coin";
import ExperienceTome from "./Consumables/ExperienceTome";
import VampireFang from "./Consumables/VampireFang";
import MegaMushroom from "./Consumables/MegaMushroom";
import DemonBlood from "./Consumables/DemonBlood";

import LeatherBag from "./Storage/LeatherBag";
import LeatherBelt from "./Storage/LeatherBelt";

import Hoe from "./Tools/Hoe";
import WateringCan from "./Tools/WateringCan";
import Axe from "./Tools/Axe";
import Hammer from "./Tools/Hammer";

export interface ItemCustomOptions {
    durability?: number;
    amount?: number;
    name?: string;
    description?: string;
    rarity?: import("./Item").ItemRarity;
    price?: number;
    baseDamage?: number;
    attackSpeed?: number;
    damageReductionPercent?: number;
    dodgePercent?: number;
    requiredLevel?: number;
}

export type ItemConstructor = (options?: { durability?: number; amount?: number }) => Item;

export default class ItemFactory {
    public static readonly classNameToId: Map<string, number> = new Map<string, number>([
        ['SimpleStaff', 1],
        ['Gun', 2],
        ['Scythe', 3],
        ['SimpleSword', 4],
        ['FishingRod', 5],
        ['IronHelmet', 10],
        ['IronChestplate', 11],
        ['IronPants', 12],
        ['IronBoots', 13],
        ['IronGloves', 14],
        ['SimpleAmulet', 15],
        ['SimpleRing', 16],
        ['HealthPotion', 30],
        ['ManaPotion', 31],
        ['Apple', 32],
        ['Coin', 33],
        ['ExperienceTome', 34],
        ['VampireFang', 40],
        ['MegaMushroom', 41],
        ['AdrenalineFlask', 42],
        ['DemonBlood', 43],
        ['LeatherBag', 100],
        ['LeatherBelt', 205],
        ['Hoe', 210],
        ['WateringCan', 211],
        ['Axe', 212],
        ['Hammer', 213]
    ]);

    private static readonly registry: Map<number, ItemConstructor> = new Map<number, ItemConstructor>([
                [1, () => new SimpleStaff()],
        [2, () => new Gun()],
        [3, () => new Scythe()],
        [4, () => new SimpleSword()],
        [5, () => new FishingRod()],

                [10, () => new IronHelmet()],
        [11, () => new IronChestplate()],
        [12, () => new IronPants()],
        [13, () => new IronBoots()],
        [14, () => new IronGloves()],
        [15, () => new SimpleAmulet()],
        [16, () => new SimpleRing()],

                [30, () => new HealthPotion()],
        [31, () => new ManaPotion()],
        [32, () => new Apple()],
        [33, (opt?: { durability?: number; amount?: number }) => new Coin(opt?.amount ?? 10)],
        [34, () => new ExperienceTome()],
        [40, () => new VampireFang()],
        [41, () => new MegaMushroom()],
        [42, () => new AdrenalineFlask()],
        [43, () => new DemonBlood()],

                [100, () => new LeatherBag()],
        [200, () => new LeatherBelt()],
        [205, () => new LeatherBelt()],

                [210, () => new Hoe()],
        [211, () => new WateringCan()],
        [212, () => new Axe()],
        [213, () => new Hammer()]
    ]);

    public static register(itemId: number, constructor: ItemConstructor): void {
        ItemFactory.registry.set(itemId, constructor);
    }

    public static getClassNameById(id: number): string | undefined {
        for (const [cls, mappedId] of this.classNameToId.entries()) {
            if (mappedId === id) return cls;
        }
        return undefined;
    }

    public static getIdByClass(className: string): number | undefined {
        if (this.classNameToId.has(className)) {
            return this.classNameToId.get(className);
        }
        const clean = className.toLowerCase().replace(/[-_]/g, '');
        for (const [cls, id] of this.classNameToId.entries()) {
            if (cls.toLowerCase().replace(/[-_]/g, '') === clean) {
                return id;
            }
        }
        return undefined;
    }

    public static createItem(
        idOrClass: number | string,
        options?: ItemCustomOptions
    ): Item | null {
        let itemId: number | undefined;
        if (typeof idOrClass === 'number') {
            itemId = idOrClass;
        } else {
            const parsedNum = parseInt(idOrClass, 10);
            if (!isNaN(parsedNum) && String(parsedNum) === idOrClass.trim()) {
                itemId = parsedNum;
            } else {
                itemId = this.getIdByClass(idOrClass);
            }
        }

        if (itemId === undefined) return null;
        const ctor = ItemFactory.registry.get(itemId);
        if (!ctor) return null;

        const item = ctor(options);
        if (options) {
            if (options.durability !== undefined) (item as any)._durability = options.durability;
            if (options.amount !== undefined) (item as any).amount = options.amount;
            if (options.name !== undefined) item.name = options.name;
            if (options.description !== undefined) (item as any).description = options.description;
            if (options.rarity !== undefined) (item as any).rarity = options.rarity;
            if (options.price !== undefined) (item as any).price = options.price;
            if (options.requiredLevel !== undefined) (item as any).requiredLevel = options.requiredLevel;
            if (options.baseDamage !== undefined && 'baseDamage' in item) (item as any).baseDamage = options.baseDamage;
            if (options.attackSpeed !== undefined && 'attackSpeed' in item) (item as any).attackSpeed = options.attackSpeed;
            if (options.damageReductionPercent !== undefined && 'damageReductionPercent' in item) (item as any).damageReductionPercent = options.damageReductionPercent;
            if (options.dodgePercent !== undefined && 'dodgePercent' in item) (item as any).dodgePercent = options.dodgePercent;
        }
        return item;
    }

    public static getItemDefaults(idOrClass: number | string): {
        itemId: number;
        itemClass: string;
        name: string;
        description: string;
        category: import("./Item").ItemCategory;
        rarity: import("./Item").ItemRarity;
        price: number;
        durability: number;
        amount?: number;
        baseDamage?: number;
        attackSpeed?: number;
        damageReductionPercent?: number;
        dodgePercent?: number;
        requiredLevel?: number;
    } | null {
        const item = this.createItem(idOrClass);
        if (!item) return null;
        const itemClass = typeof idOrClass === 'string' && isNaN(Number(idOrClass))
            ? idOrClass
            : (this.getClassNameById(item.itemId) || 'Item');

        return {
            itemId: item.itemId,
            itemClass,
            name: item.name,
            description: item.description,
            category: item.category,
            rarity: item.rarity,
            price: item.price,
            durability: item.durability,
            amount: (item as any).amount ?? 1,
            baseDamage: (item as any).baseDamage,
            attackSpeed: (item as any).attackSpeed,
            damageReductionPercent: (item as any).damageReductionPercent,
            dodgePercent: (item as any).dodgePercent,
            requiredLevel: item.requiredLevel
        };
    }

    public static getAllRegisteredItemClasses(): string[] {
        return Array.from(this.classNameToId.keys());
    }

    public static serializeItem(item: Item): ItemSaveData {
        return {
            itemId: item.itemId,
            name: item.name,
            category: item.category,
            durability: item.durability,
            amount: (item as any).amount
        };
    }
}
