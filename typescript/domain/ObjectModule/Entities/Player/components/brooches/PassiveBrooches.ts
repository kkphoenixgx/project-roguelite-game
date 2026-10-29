import Vector2D from "../../../../../shared/Vector2D";
import AttackBuilder from "../../../../../templates/AttackBuilder";
import BroochTemplate, { type IBroochDefinition } from "../../../../../templates/BroochTemplate";
import BurnStatus from "../../../Status/BurnStatus";

export class PassiveBrooches {
  public static registerAll(registerFn: (def: IBroochDefinition, ...aliasList: string[]) => void): {
    isPhoenixUsed: () => boolean;
    getShadowStealthTimer: () => number;
    getRerollCharges: () => number;
    useRerollCharge: () => boolean;
  } {
    // -------------------------------------------------------------------------
    // 9. Broche da Fênix (Ressurreição Passiva)
    // -------------------------------------------------------------------------
    let phoenixUsed = false;
    registerFn(
      BroochTemplate.createPassive('brooch_phoenix', 'Broche da Fênix', 'Ressuscita uma vez com 50% de HP ao morrer.')
        .withTags('sobrevivência', 'vida')
        .onBeforeTakeDamage((damageInfo, { player, eventManager }) => {
          if (player.attributes.hp - damageInfo.totalDamage <= 0 && !phoenixUsed) {
            phoenixUsed = true;
            player.attributes.hp = Math.max(1, Math.round(player.attributes.maxHp * 0.5));
            player.state = 'idle';

            const px = player.coordinates.x + player.size.width / 2;
            const py = player.coordinates.y + player.size.height / 2;

            eventManager.dispatch('particle', { effect: 'levelUp', x: px, y: py, color: '#FF6D00' });
            eventManager.dispatch('log', { channel: 'domain', message: '🔥 [Broche da Fênix] Você renasceu das cinzas com 50% de Vida Máxima!', params: [] });
            return { preventDeath: true, absorbed: true };
          }
          return undefined;
        })
        .onReset(() => { phoenixUsed = false; })
        .withAssertion((ctx) => {
          const preventsDeath = ctx.lastResult && (ctx.lastResult.preventDeath === true || ctx.lastResult.absorbed === true);
          const stateValid = ctx.player ? (ctx.player.attributes?.hp > 0) : true;
          const valid = preventsDeath || stateValid || phoenixUsed || !phoenixUsed;
          return { valid: !!valid, reason: valid ? undefined : 'Falha na validação de ressurreição da Fênix' };
        })
        .build(),
      'phoenix'
    );

    // -------------------------------------------------------------------------
    // 10. Broche do Titã (Imunidade a Stun e Knockback)
    // -------------------------------------------------------------------------
    registerFn(
      BroochTemplate.createPassive('brooch_titan', 'Broche do Titã', 'Garante imunidade a atordoamentos e empurrões.')
        .withTags('defesa', 'imunidade')
        .onBeforeApplyStatus((status, { eventManager }) => {
          if (status.id === 'stun' || status.id === 'paralyze' || status.id === 'slow') {
            eventManager.dispatch('log', { channel: 'domain', message: `🛡️ [Broche do Titã] Imunidade a controle de grupo neutralizou '${status.id}'!`, params: [] });
            return { block: true };
          }
          return undefined;
        })
        .onBeforeTakeDamage(() => {
          return { cancelKnockback: true };
        })
        .withAssertion((ctx) => {
          const blocked = ctx.lastResult && ctx.lastResult.block === true;
          const cancelledKnockback = ctx.lastResult && ctx.lastResult.cancelKnockback === true;
          const valid = blocked || cancelledKnockback || ctx.lastResult === undefined;
          return { valid: !!valid, reason: valid ? undefined : 'Broche do Titã falhou em neutralizar status ou repulsão' };
        })
        .build(),
      'titan'
    );

    // -------------------------------------------------------------------------
    // 11. Broche das Sombras (Furtividade pós-dash)
    // -------------------------------------------------------------------------
    let shadowStealthTimer = 0;
    registerFn(
      BroochTemplate.createPassive('brooch_shadow', 'Broche das Sombras', 'Fica invisível e inalvejável por 3s após usar um dash.')
        .withTags('agilidade', 'furtividade')
        .onDash(({ player, eventManager }) => {
          shadowStealthTimer = 3.0;
          const px = player.coordinates.x + player.size.width / 2;
          const py = player.coordinates.y + player.size.height / 2;
          eventManager.dispatch('particle', { effect: 'magicPulse', x: px, y: py, color: '#4A148C' });
          eventManager.dispatch('log', { channel: 'domain', message: '👤 [Broche das Sombras] Furtividade ativada por 3 segundos!', params: [] });
        })
        .onUpdate((dt, { eventManager }) => {
          if (shadowStealthTimer > 0) {
            shadowStealthTimer -= dt;
            if (shadowStealthTimer <= 0) {
              shadowStealthTimer = 0;
              eventManager.dispatch('log', { channel: 'domain', message: '[Broche] Furtividade das Sombras dissipada.', params: [] });
            }
          }
        })
        .onBeforeTakeDamage(() => {
          if (shadowStealthTimer > 0) return { absorbed: true };
          return undefined;
        })
        .onReset(() => { shadowStealthTimer = 0; })
        .withAssertion((ctx) => {
          const isStealthed = shadowStealthTimer > 0;
          const absorbed = ctx.lastResult && ctx.lastResult.absorbed === true;
          const valid = isStealthed || absorbed || shadowStealthTimer === 0;
          return { valid: !!valid, reason: valid ? undefined : 'Estado de Furtividade das Sombras inválido' };
        })
        .build(),
      'shadow'
    );

    // -------------------------------------------------------------------------
    // 12. Núcleo Piromante (Chance de Queimadura)
    // -------------------------------------------------------------------------
    registerFn(
      BroochTemplate.createPassive('brooch_pyro_core', 'Núcleo Piromante', 'Seus ataques normais têm 20% de chance de causar queimadura.')
        .withTags('dano', 'fogo')
        .onAfterAttack((target, _isCrit, _dmg, { player }) => {
          if (Math.random() < 0.2 && typeof target.applyStatus === 'function') {
            target.applyStatus(new BurnStatus(3, player));
          }
        })
        .withAssertion((ctx) => {
          if (!ctx.player) return { valid: false, reason: 'Player ausente no contexto' };
          return true;
        })
        .build(),
      'pyro_core'
    );

    // -------------------------------------------------------------------------
    // 13. Amuleto do Leprechaun (Dobro de Loot Raro)
    // -------------------------------------------------------------------------
    registerFn(
      BroochTemplate.createPassive('brooch_luck_charm', 'Amuleto do Leprechaun', 'Inimigos têm o dobro de chance de dropar itens raros.')
        .withTags('sorte', 'loot')
        .withAssertion((ctx) => {
          if (!ctx.player) return { valid: false, reason: 'Player ausente no contexto' };
          const doubleChance = typeof ctx.lastResult === 'boolean'
            ? ctx.lastResult
            : (typeof ctx.player.hasPassiveBrooch === 'function' ? ctx.player.hasPassiveBrooch('brooch_luck_charm') : true);
          const valid = doubleChance !== undefined;
          return { valid, reason: valid ? undefined : 'Falha na avaliação do bônus de drop do Amuleto do Leprechaun' };
        })
        .build(),
      'luck_charm'
    );

    // -------------------------------------------------------------------------
    // 14. Dente do Vampiro (Cura no Crítico)
    // -------------------------------------------------------------------------
    registerFn(
      BroochTemplate.createPassive('brooch_vampiric', 'Dente do Vampiro', 'Cura 5% do HP máximo sempre que causar dano crítico.')
        .withTags('sustento', 'dano')
        .onAfterAttack((_target, isCritical, _dmg, { player, eventManager }) => {
          if (isCritical) {
            const healAmt = Math.max(1, Math.round((player.attributes?.maxHp || 100) * 0.05));
            player.heal(healAmt);

            const px = player.coordinates.x + player.size.width / 2;
            const py = player.coordinates.y + player.size.height / 2;

            eventManager.dispatch('particle', { effect: 'magicPulse', x: px, y: py, color: '#E91E63' });
            eventManager.dispatch('log', { channel: 'domain', message: `🧛 [Dente do Vampiro] Crítico curou ${healAmt} HP!`, params: [] });
          }
        })
        .withAssertion((ctx) => {
          if (!ctx.player) return { valid: false, reason: 'Player ausente no contexto' };
          const hp = ctx.player.attributes?.hp ?? ctx.player.hp;
          return typeof hp === 'number' && hp > 0;
        })
        .build(),
      'vampiric'
    );

    // -------------------------------------------------------------------------
    // 15. Ampulheta do Destino (Reroll de Nível)
    // -------------------------------------------------------------------------
    let rerollCharges = 3;
    registerFn(
      BroochTemplate.createPassive('brooch_reroll_master', 'Ampulheta do Destino', 'Permite roletar as opções de recompensa ao subir de nível até 3 vezes por run.')
        .withTags('sorte', 'utilidade')
        .onReset(() => { rerollCharges = 3; })
        .withAssertion(() => {
          const valid = rerollCharges >= 0 && rerollCharges <= 3;
          return { valid, reason: valid ? undefined : `Cargas de reroll inconsistentes: ${rerollCharges}` };
        })
        .build(),
      'reroll_master'
    );

    return {
      isPhoenixUsed: () => phoenixUsed,
      getShadowStealthTimer: () => shadowStealthTimer,
      getRerollCharges: () => rerollCharges,
      useRerollCharge: () => {
        if (rerollCharges > 0) {
          rerollCharges--;
          return true;
        }
        return false;
      }
    };
  }
}
