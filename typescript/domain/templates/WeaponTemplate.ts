import MeleeWeapon from "../ObjectModule/Items/Weapons/MeleeWeapons/MeleeWeapon";
import type Effect from "../ObjectModule/Items/Effects/Effect";
import type { ItemRarity } from "../ObjectModule/Items/Item";

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: ARMA DO DOMÍNIO
 * ==============================================================================
 * Regras Obrigatórias para quem está criando uma nova Arma:
 * 1. Defina um `iconId` numérico único. Ele é a ponte com o VisualConfigMap do adaptador!
 * 2. Defina `baseDamage`, `attackSpeed` (em segundos), `price` e requisitos de atributos.
 * 3. Armas podem acoplar uma lista de `Effect[]` aplicados no impacto.
 * 4. Opcionalmente, pode desbloquear uma classe inteira (`unlocksClass`).
 * ==============================================================================
 */
export default class TemplateWeaponTemplate extends MeleeWeapon {
  constructor(
    baseDamage: number = 15,
    attackSpeed: number = 0.8,
    name: string = "Arma Modelo",
    description: string = "Descrição canônica do item.",
    itemId: number = 999,
    rarity: ItemRarity = "common",
    iconId: number = 999,
    price: number = 20,
    durability: number = 100,
    effects: Effect[] = [],
    requiredLevel: number = 1,
    requiredAttributes: { [key: string]: number } = { strength: 2 },
    isUnique: boolean = false,
    isTradable: boolean = true,
    unlocksClass?: string
  ) {
    super(
      baseDamage,
      attackSpeed,
      name,
      description,
      itemId,
      rarity,
      iconId,
      price,
      durability,
      effects,
      requiredLevel,
      requiredAttributes,
      isUnique,
      isTradable,
      unlocksClass
    );
  }
}
