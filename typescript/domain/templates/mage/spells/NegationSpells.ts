import type { DynamicSpellRule } from "../ISpellCraftingContracts";

/**
 * ==============================================================================
 * AXIOMAS DE NEGAÇÃO (DISPEL & ANTI-MAGIA)
 * ==============================================================================
 * Axioma: Ordo (magic+light) + Caos (magic+dark ou dark) -> negation
 * 
 * Regras Canônicas:
 * 1. FALHA AXIOMÁTICA (Auto-Cancelamento):
 *    Se o conjurador combinar 'negation' com qualquer outro elemento material
 *    diferente de 'magic' (ex: fire, water, ice, ground, etc.), a negação
 *    apaga o elemento internamente. O feitiço falha (fizzle), solta fumaça
 *    e consome mana pelo atrito ontológico.
 * 
 * 2. PROJÉTIL DE DISPEL (spell_0 + negation + magic):
 *    Dispara um projétil de anulação acromática. Ao atingir o alvo, purga até
 *    1 buff mágico ativo de Tier <= 3.
 * 
 * 3. INFUSÃO DE LÂMINA ANTI-MAGIA (spell_1 + potencia + negation + magic):
 *    Infunde a arma por 5 segundos com a essência de anulação. Cada golpe físico
 *    purga até 1 buff mágico de Tier <= 3 do alvo atingido e ignora barreiras arcanas.
 * 
 * 4. MANTO NULO / AUTO-PURIFICAÇÃO (spell_1 + negation + magic):
 *    Purga imediatamente até 1 debuff ou status mágico de Tier <= 3 do próprio conjurador.
 * ==============================================================================
 */

/**
 * REGRA 1: FALHA AXIOMÁTICA (AUTO-CANCELAMENTO / FIZZLE)
 * Prioridade 1000 (Executa antes de qualquer outra regra dinâmica)
 */
export const axiomaticFizzleDynamicRule: DynamicSpellRule = {
  id: 'dynamic_axiomatic_fizzle',
  name: 'Falha Axiomática: Auto-Cancelamento Ontológico',
  priority: 1000,
  matcher: (ctx) => {
    const hasNegation = ctx.elements.includes('negation');
    if (!hasNegation) return false;

    // Se for um encantamento válido de Lâmina Anti-Magia (Self + Potência + Negação + Magia), não causa fizzle
    const isSelfInfusion = ctx.forms.includes('self') &&
      (ctx.elements.includes('potencia') || (ctx.grammar.rawElements.includes('magic') && ctx.grammar.rawElements.includes('fire'))) &&
      (ctx.elements.includes('magic') || ctx.grammar.rawElements.includes('magic'));
    if (isSelfInfusion) return false;

    // Elementos materiais proibidos quando combinados com Negação
    // Apenas 'magic' é o vetor conceitual permitido para Dispel/Anti-Magia
    const forbiddenElements = [
      'fire', 'water', 'ground', 'dark', 'light', 'potencia', 'ice',
      'life', 'caos', 'ordem', 'air', 'magma', 'infernous', 'thunder',
      'nature', 'abys', 'holy', 'decay', 'crystal'
    ];

    const hasForbidden = ctx.elements.some(el => el !== 'negation' && forbiddenElements.includes(el));
    return hasForbidden;
  },
  execute: (ctx) => {
    const { player, eventManager, manaCost, spawnCoordinates } = ctx;

    // Dispara partícula de fumaça cinzenta/falha
    eventManager.dispatch('particle', {
      effect: 'magicAura' as any,
      x: spawnCoordinates.x,
      y: spawnCoordinates.y
    });

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Falha Axiomática] Colapso de Equação! A Negação aniquilou os elementos materiais no molde. O feitiço falhou!`,
      params: []
    });

    // O atrito da anulação interna consome o mana
    player.attributes.mana = Math.max(0, (player.attributes.mana || 0) - manaCost);
    return false;
  }
};

/**
 * REGRA 2: INFUSÃO DE LÂMINA ANTI-MAGIA
 * Self + Potência + Negation + Magic
 */
export const bladeInfusionAntiMagicDynamicRule: DynamicSpellRule = {
  id: 'dynamic_infusion_antimagic',
  name: 'Infusão Axiomática: Lâmina Anti-Magia',
  priority: 95,
  matcher: (ctx) => {
    const isSelf = ctx.forms.includes('self');
    const hasNegation = ctx.elements.includes('negation');
    const hasPotencia = ctx.elements.includes('potencia') || 
                        (ctx.grammar.rawElements.includes('magic') && ctx.grammar.rawElements.includes('fire'));
    const hasMagic = ctx.elements.includes('magic') || ctx.grammar.rawElements.includes('magic');
    return isSelf && hasNegation && hasPotencia && hasMagic;
  },
  execute: (ctx) => {
    const { player, eventManager, manaCost } = ctx;
    const duration = 5;

    // Ativa flag de lâmina anti-magia no jogador
    (player as any).hasAntiMagicBlade = true;

    player.applyStatus?.({
      id: 'blade_infusion_antimagic',
      duration,
      category: 'magical',
      tier: 2,
      update: () => {},
      apply: () => {},
      remove: () => {
        (player as any).hasAntiMagicBlade = false;
        eventManager.dispatch('log', {
          channel: 'domain',
          message: `[Infusão] Lâmina Anti-Magia perdeu a coesão de anulação.`,
          params: []
        });
      }
    });

    eventManager.dispatch('particle', {
      effect: 'magicPulse' as any,
      x: player.coordinates.x + player.size.width / 2,
      y: player.coordinates.y + player.size.height / 2
    });

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `[Axioma] Lâmina encantada com Negação Arcana! Ataques físicos dissipam buffs mágicos (Tier <= 3) por 5s.`,
      params: []
    });

    player.attributes.mana = Math.max(0, (player.attributes.mana || 0) - manaCost);
    return true;
  }
};

/**
 * REGRA 3: MANTO NULO / AUTO-PURIFICAÇÃO (CLEANSE)
 * Self + Negation + Magic (sem potência)
 */
export const selfCleanseDynamicRule: DynamicSpellRule = {
  id: 'dynamic_self_cleanse',
  name: 'Axioma de Purificação: Manto Nulo',
  priority: 90,
  matcher: (ctx) => {
    const isSelf = ctx.forms.includes('self');
    const hasNegation = ctx.elements.includes('negation');
    const hasMagic = ctx.elements.includes('magic') || ctx.grammar.rawElements.includes('magic');
    const hasPotencia = ctx.elements.includes('potencia');
    return isSelf && hasNegation && hasMagic && !hasPotencia;
  },
  execute: (ctx) => {
    const { player, eventManager, manaCost } = ctx;

    // Purga até 1 debuff/status mágico ativo no próprio jogador de Tier <= 3
    let purged = false;
    if (player.activeStatusesList && player.activeStatusesList.length > 0) {
      for (let i = player.activeStatusesList.length - 1; i >= 0; i--) {
        const status = player.activeStatusesList[i]!;
        const cat = status.category || 'magical';
        const tier = typeof status.tier === 'number' ? status.tier : 1;
        if (cat === 'magical' && tier <= 3) {
          player.removeStatus?.(status.id);
          purged = true;
          eventManager.dispatch('log', {
            channel: 'domain',
            message: `[Manto Nulo] O Axiomante purificou a aflição mágica '${status.id}' de si mesmo!`,
            params: []
          });
          break;
        }
      }
    }

    eventManager.dispatch('particle', {
      effect: 'magicPulse' as any,
      x: player.coordinates.x + player.size.width / 2,
      y: player.coordinates.y + player.size.height / 2
    });

    if (!purged) {
      eventManager.dispatch('log', {
        channel: 'domain',
        message: `[Manto Nulo] O véu de anulação ondulou ao redor do Axiomante (nenhuma aflição mágica Tier <= 3 encontrada).`,
        params: []
      });
    }

    player.attributes.mana = Math.max(0, (player.attributes.mana || 0) - manaCost);
    return true;
  }
};

/**
 * Registra todas as regras axiomáticas de negação no registro de feitiços.
 */
export function registerNegationRules(registry: { registerDynamicRule(rule: DynamicSpellRule): void }): void {
  registry.registerDynamicRule(axiomaticFizzleDynamicRule);
  registry.registerDynamicRule(bladeInfusionAntiMagicDynamicRule);
  registry.registerDynamicRule(selfCleanseDynamicRule);
}

export default {
  fizzle: axiomaticFizzleDynamicRule,
  bladeInfusion: bladeInfusionAntiMagicDynamicRule,
  cleanse: selfCleanseDynamicRule,
  register: registerNegationRules
};
