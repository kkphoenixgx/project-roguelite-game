import TransformationTemplate, {
  ActiveTransformation,
  type ITransformationDefinition
} from "../../TransformationTemplate";
import { MageSpellTemplate, type StaticSpellRecipe } from "../MageSpellTemplate";
import type { DynamicSpellRule, ISpellRegistry } from "../ISpellCraftingContracts";
import type Entity from "../../../ObjectModule/Entities/Entity";

/**
 * ==============================================================================
 * TRANSFORMAÇÃO DEMONÍACA ABISSAL (Definição de Metamorfose)
 * ==============================================================================
 * Forma demoníaca canalizada pelo Fogo Abissal (Fire + Abyss).
 * Concede:
 * - Mais Constituição e Vida Máxima (+100 HP)
 * - Mais dano físico (+60% multiplicador de dano)
 * - Redução de dano passiva (15%)
 * - Imunidades: Medo ('fear') e Queimadura ('burn')
 * - Visual: Tint vermelho-sangue profundo (#8B0000) e tamanho aumentado (+30%)
 * - Reversão automática segura (Zero-GC)
 * ==============================================================================
 */
export const abyssalDemonTransformation: ITransformationDefinition = TransformationTemplate.create(
  'abyssal_demon',
  'Demônio Abissal'
)
  .withDuration(15)
  .withVisualTint('#8B0000')
  .withVisualScale(1.3)
  .withDamageMultiplier(1.6)
  .withDamageReduction(15)
  .withImmunities('fear', 'burn')
  .onEnter((target: Entity, ctx) => {
    target.attributes.addBonusMaxHp(100);

    const cx = target.coordinates.x + target.size.width / 2;
    const cy = target.coordinates.y + target.size.height / 2;
    ctx.eventManager.dispatch('particle', { effect: 'fireExplosion' as any, x: cx, y: cy });
    ctx.eventManager.dispatch('particle', { effect: 'darkPulse' as any, x: cx, y: cy });
  })
  .onExit((target: Entity, ctx) => {
    target.attributes.addBonusMaxHp(-100);

    const cx = target.coordinates.x + target.size.width / 2;
    const cy = target.coordinates.y + target.size.height / 2;
    ctx.eventManager.dispatch('particle', { effect: 'darkPulse' as any, x: cx, y: cy });
  })
  .build();

/**
 * ==============================================================================
 * REGRA DE MAGIA DINÂMICA (Dynamic Spell Rule)
 * ==============================================================================
 * Sintetizada dinamicamente quando a gramática do buffer contém:
 * - Forma: 'self' (spell_1)
 * - Elementos: 'fire' (spell_4) e 'abys' (fusão de water spell_5 + dark spell_7)
 * ==============================================================================
 */
export const abyssalDemonDynamicRule: DynamicSpellRule = {
  id: 'dynamic_abyssal_demon',
  name: 'Transmutação Dinâmica: Demônio Abissal',
  priority: 100, // Prioridade alta sobre o solver genérico de Self AoE
  matcher: (ctx) => {
    const isSelf = ctx.forms.includes('self');
    const hasAbyssFused = ctx.elements.includes('abys') && ctx.elements.includes('fire');
    const hasRawTriad = ctx.grammar.rawElements.includes('fire') &&
                        ctx.grammar.rawElements.includes('water') &&
                        ctx.grammar.rawElements.includes('dark');
    return isSelf && (hasAbyssFused || hasRawTriad);
  },

  execute: (ctx) => {
    const { player, eventManager, manaCost } = ctx;

    const active = new ActiveTransformation(abyssalDemonTransformation, player as any, eventManager);

    // Registra como status temporário gerenciado pelo loop de entidades
    player.applyStatus?.({
      id: 'abyssal_demon_active',
      duration: 15,
      update: (dt: number) => active.update(dt),
      apply: () => {},
      remove: () => active.revert()
    });

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Dynamic Spell] O Axiomante transmuta o Fogo Abissal e assume a Forma Demoníaca!`,
      params: []
    });

    player.attributes.mana -= manaCost;
    return true;
  }
};

/**
 * ==============================================================================
 * RECEITA ESTÁTICA DIRETA (Static Spell Recipe)
 * ==============================================================================
 * Sequência rúnica canônica rápida:
 * spell_1 (self) + spell_4 (fire) + spell_5 (water) + spell_7 (dark)
 * ==============================================================================
 */
export const abyssalDemonStaticRecipe: StaticSpellRecipe = MageSpellTemplate.createStatic(
  'spell_abyssal_demon',
  'Transmutação: Demônio Abissal'
)
  .matchingSequence(['spell_1', 'spell_4', 'spell_5', 'spell_7'])
  .withManaCost(50)
  .withLogMessage('O Axiomante conjura a Transmutação do Demônio Abissal!')
  .withCustomExecution((ctx) => {
    const { player, eventManager } = ctx;

    const active = new ActiveTransformation(abyssalDemonTransformation, player as any, eventManager);

    player.applyStatus?.({
      id: 'abyssal_demon_active',
      duration: 15,
      update: (dt: number) => active.update(dt),
      apply: () => {},
      remove: () => active.revert()
    });

    return true;

  })
  .build();

/**
 * Registra o feitiço no MageSpellCraftingRegistry (tanto como regra dinâmica quanto receita estática).
 */
export function registerAbyssalDemon(registry: { registerDynamicRule(rule: DynamicSpellRule): void; registerRecipe(recipe: StaticSpellRecipe): void }): void {
  registry.registerDynamicRule(abyssalDemonDynamicRule);
  registry.registerRecipe(abyssalDemonStaticRecipe);
}

export default {
  transformation: abyssalDemonTransformation,
  dynamicRule: abyssalDemonDynamicRule,
  staticRecipe: abyssalDemonStaticRecipe,
  register: registerAbyssalDemon
};
