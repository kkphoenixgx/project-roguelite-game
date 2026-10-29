import Consumable from "../ObjectModule/Items/Consumables/Consumable";
import type Entity from "../ObjectModule/Entities/Entity";
import type Effect from "../ObjectModule/Items/Effects/Effect";
import type { ItemRarity } from "../ObjectModule/Items/Item";

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: CONSUMÍVEL / POÇÃO DO DOMÍNIO
 * ==============================================================================
 * Regras Obrigatórias para quem está criando um novo Consumível:
 * 1. Estenda a classe `Consumable`.
 * 2. Configure `iconId` único para visualização na mochila/chão.
 * 3. Sobrescreva o método `use(target: Entity): boolean`.
 *    - Aplique efeitos diretos ou itere sobre a lista `this.effects`.
 *    - Retorne `true` se o item foi consumido com sucesso (removendo da mochila).
 *    - Retorne `false` se a condição de uso não foi satisfeita (ex: HP já cheio).
 * ==============================================================================
 */
export default class TemplateConsumableTemplate extends Consumable {
  constructor(
    name: string = "Poção Modelo",
    description: string = "Restaura vitalidade ou concede atributos temporários.",
    itemId: number = 888,
    iconId: number = 888,
    rarity: ItemRarity = "common",
    price: number = 10,
    effects: Effect[] = []
  ) {
    super(
      name,
      description,
      itemId,
      rarity,
      'potion',
      iconId,
      price,
      effects
    );
  }

  /**
   * Executa a ação do consumível sobre o alvo
   */
  public override use(target: Entity): boolean {
    if (!target || !target.attributes) return false;

    if (target.attributes.hp >= target.attributes.maxHp) {
      return false;
    }

    for (let i = 0; i < this.effects.length; i++) {
      this.effects[i]!.apply(target);
    }

    return true;
  }
}
