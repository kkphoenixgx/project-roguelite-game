import type { DynamicSpellRule } from "../ISpellCraftingContracts";

/**
 * ==============================================================================
 * AXIOMAS DE INFUSÃO DE LÂMINA (ESCOLA DE ENCANTAMENTO / SPELLBLADE)
 * ==============================================================================
 * Converte a energia arcana em aprimoramentos corporais e de armamento.
 * Duração base: 5 segundos (janela tática de burst).
 * 
 * Axioma Base: Self (spell_1) + Potência (magic spell_9 + fire spell_4)
 * ==============================================================================
 */

/**
 * INFUSÃO DE AR (Vento Cortante)
 * Self + Potência + Air
 * - Converte o dano do ataque em elemento 'air'
 * - Bônus de velocidade de movimento (+25)
 * - Partículas de vento a cada golpe
 */
export const bladeInfusionAirDynamicRule: DynamicSpellRule = {
  id: 'dynamic_infusion_air',
  name: 'Infusão Axiomática: Lâmina de Vento',
  priority: 90,
  matcher: (ctx) => {
    const isSelf = ctx.forms.includes('self');
    const hasPotencia = ctx.elements.includes('potencia') || 
                        (ctx.grammar.rawElements.includes('magic') && ctx.grammar.rawElements.includes('fire'));
    const hasAir = ctx.elements.includes('air') ||
                   (ctx.grammar.rawElements.includes('fire') && ctx.grammar.rawElements.includes('water'));
    return isSelf && hasPotencia && hasAir;
  },
  execute: (ctx) => {
    const { player, eventManager, manaCost } = ctx;
    const duration = 5;

    player.attributes.speed = 25;
    (player as any).elementalType = 'air';

    player.applyStatus?.({
      id: 'blade_infusion_air',
      duration,
      update: () => {},
      apply: () => {},
      remove: () => {
        player.attributes.speed = -25;
        (player as any).elementalType = undefined;
        eventManager.dispatch('log', {
          channel: 'domain',
          message: `[Infusão] Lâmina de Vento dissipou-se.`,
          params: []
        });
      }
    });

    eventManager.dispatch('particle', {
      effect: 'windGust' as any,
      x: player.coordinates.x + player.size.width / 2,
      y: player.coordinates.y + player.size.height / 2
    });

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Axioma] Lâmina infundida com Ar! Ataques cortantes velozes por 5s.`,
      params: []
    });

    player.attributes.mana -= manaCost;
    return true;
  }
};

/**
 * INFUSÃO DE LUZ (Expansão de Área / Alcance Luminoso)
 * Self + Potência + Light
 * - A Luz irradia e expande a projeção física da lâmina
 * - +50% de Área de Efeito (areaMultiplier)
 * - +30% de Dano Splash em área (splashDamage)
 */
export const bladeInfusionLightDynamicRule: DynamicSpellRule = {
  id: 'dynamic_infusion_light',
  name: 'Infusão Axiomática: Lâmina Radiante (Área)',
  priority: 90,
  matcher: (ctx) => {
    const isSelf = ctx.forms.includes('self');
    const hasPotencia = ctx.elements.includes('potencia') || 
                        (ctx.grammar.rawElements.includes('magic') && ctx.grammar.rawElements.includes('fire'));
    const hasLight = ctx.elements.includes('light') || ctx.grammar.rawElements.includes('light');
    return isSelf && hasPotencia && hasLight;
  },
  execute: (ctx) => {
    const { player, eventManager, manaCost } = ctx;
    const duration = 5;

    //? Bônus temporário de Área e Splash nativos em Attributes
    player.attributes.bonusArea = 50;
    player.attributes.splashDamage = 30;

    player.applyStatus?.({
      id: 'blade_infusion_light',
      duration,
      update: () => {},
      apply: () => {},
      remove: () => {
        player.attributes.bonusArea = -50;
        player.attributes.splashDamage = -30;
        eventManager.dispatch('log', {

          channel: 'domain',
          message: `[Infusão] Expansão Luminosa da lâmina dissipou-se.`,
          params: []
        });
      }
    });

    eventManager.dispatch('particle', {
      effect: 'lightFlash' as any,
      x: player.coordinates.x + player.size.width / 2,
      y: player.coordinates.y + player.size.height / 2
    });

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Axioma] Lâmina expandida por Luz! +50% Área e Splash por 5s.`,
      params: []
    });

    player.attributes.mana -= manaCost;
    return true;
  }
};

/**
 * Registra os axiomas de infusão de lâmina no orquestrador de feitiços.
 */
export function registerBladeInfusions(registry: { registerDynamicRule(rule: DynamicSpellRule): void }): void {
  registry.registerDynamicRule(bladeInfusionAirDynamicRule);
  registry.registerDynamicRule(bladeInfusionLightDynamicRule);
}

export default {
  infusionAir: bladeInfusionAirDynamicRule,
  infusionLight: bladeInfusionLightDynamicRule,
  register: registerBladeInfusions
};
