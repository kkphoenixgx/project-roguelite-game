import Armor, { type ArmorType } from "../ObjectModule/Items/Armors/Armor";
import type Effect from "../ObjectModule/Items/Effects/Effect";
import type { ItemRarity } from "../ObjectModule/Items/Item";
import type { baseAttributes } from "../ObjectModule/Entities/Attributes";

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: PEÇA DE ARMADURA / EQUIPAMENTO
 * ==============================================================================
 * Regras Obrigatórias para quem está criando uma nova Armadura:
 * 1. Estenda `Armor`.
 * 2. Defina o `armorType` canônico ('helmet' | 'chestplate' | 'pants' | 'boots' | 'gloves' | 'amulet' | 'ring').
 * 3. Defina `damageReductionPercent` (redução percentual de dano mitigado) e `dodgePercent`.
 * 4. Atribua um `iconId` único para compor o Paperdoll visual.
 * 5. Configure `requiredAttributes` para exigir requisitos de atributos (ex: força ou inteligência).
 * ==============================================================================
 */
export default class TemplateArmorTemplate extends Armor {
  constructor(
    damageReductionPercent: number = 8,
    dodgePercent: number = 2,
    armorType: ArmorType = 'chestplate',
    name: string = "Peitoral Arquetípico",
    description: string = "Forjado para proteger o corpo contra impactos devastadores.",
    itemId: number = 777,
    rarity: ItemRarity = 'common',
    iconId: number = 777,
    price: number = 30,
    durability: number = 120,
    effects: Effect[] = [],
    requiredLevel: number = 1,
    requiredAttributes: Partial<baseAttributes> = { constitution: 2 },
    isUnique: boolean = false,
    isTradable: boolean = true
  ) {
    super(
      damageReductionPercent,
      dodgePercent,
      armorType,
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
      isTradable
    );
  }
}
