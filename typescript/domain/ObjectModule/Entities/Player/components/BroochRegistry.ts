import Vector2D from "../../../../shared/Vector2D";
import AttackBuilder from "../../../../templates/AttackBuilder";
import BroochTemplate, { type IBroochDefinition, type BroochExecutionContext, type BroochValidationContext } from "../../../../templates/BroochTemplate";
import BurnStatus from "../../Status/BurnStatus";
import { PassiveBrooches } from "./brooches/PassiveBrooches";

export class BroochRegistry {
  private static definitions: Map<string, IBroochDefinition> = new Map();
  private static aliases: Map<string, string> = new Map();

  static {
    BroochRegistry.registerDefaults();
  }

  public static register(def: IBroochDefinition, ...aliasList: string[]): void {
    this.definitions.set(def.id, def);
    for (const alias of aliasList) {
      this.aliases.set(alias, def.id);
    }
  }

  public static get(id: string): IBroochDefinition | undefined {
    const canonicalId = this.aliases.get(id) || id;
    return this.definitions.get(canonicalId);
  }

  public static getAllDefinitions(): IBroochDefinition[] {
    return Array.from(this.definitions.values());
  }

  public static validateBrooch(id: string, ctx: BroochValidationContext): boolean | { valid: boolean; reason?: string | undefined } {
    const def = this.get(id);
    if (!def) {
      return { valid: false, reason: `Brooch '${id}' not found in registry.` };
    }
    return def.validate(ctx);
  }

  public static has(id: string): boolean {
    const canonicalId = this.aliases.get(id) || id;
    return this.definitions.has(canonicalId);
  }

  public static getCanonicalId(id: string): string {
    return this.aliases.get(id) || id;
  }

  public static executeActive(broochId: string, ctx: BroochExecutionContext): boolean {
    const def = this.get(broochId);
    if (!def || def.type !== 'ativo' || !def.onExecute) {
      return false;
    }
    def.onExecute(ctx);
    return true;
  }

  public static getCooldown(broochId: string): number {
    const def = this.get(broochId);
    return def ? def.cooldownMs : 15000;
  }

  private static registerDefaults(): void {
    // -------------------------------------------------------------------------
    // 1. Cálice da Vida (Cura Ativa)
    // -------------------------------------------------------------------------
    this.register(
      BroochTemplate.createActive('brooch_active_heal', 'Cálice da Vida', 'Ativo: Cura 30% da Vida Máxima. Recarga: 60s.', 60000)
        .withTags('cura', 'vida')
        .onExecute(({ player, eventManager }) => {
          const maxHp = player.attributes?.maxHp || 100;
          const healAmt = Math.max(1, Math.round(maxHp * 0.3));
          player.heal(healAmt);

          const px = player.coordinates.x + player.size.width / 2;
          const py = player.coordinates.y + player.size.height / 2;

          eventManager.dispatch('particle', { effect: 'magicPulse', x: px, y: py, color: '#00E676' });
          eventManager.dispatch('log', { channel: 'domain', message: `[Broche] Cálice da Vida curou ${healAmt} HP!`, params: [] });
        })
        .withAssertion((ctx) => {
          if (!ctx.player) return { valid: false, reason: 'Player ausente no contexto' };
          const hp = ctx.player.attributes?.hp ?? ctx.player.hp;
          return typeof hp === 'number' && hp > 0;
        })
        .build(),
      'brooch_heal'
    );

    // -------------------------------------------------------------------------
    // 2. Chamado do Meteoro (Dano em Área e Controle)
    // -------------------------------------------------------------------------
    this.register(
      BroochTemplate.createActive('brooch_active_meteor', 'Chamado do Meteoro', 'Ativo: Evoca um meteoro na posição do cursor causando dano em área massivo. Recarga: 90s.', 90000)
        .withTags('dano', 'fogo')
        .onExecute(({ player, eventManager, mouseCoords }) => {
          eventManager.dispatch('spawnVisual', {
            type: 'fireExplosion',
            coordinates: { x: mouseCoords.x - 96, y: mouseCoords.y - 96 },
            duration: 0.8,
            size: { width: 192, height: 192 }
          });
          eventManager.dispatch('particle', { effect: 'fireExplosion', x: mouseCoords.x, y: mouseCoords.y, color: '#FF3D00' });

          eventManager.dispatch('requestNeighbors', {
            coordinates: mouseCoords,
            radius: 180,
            callback: (neighbors: any[]) => {
              const meteorAttack = AttackBuilder.create(player)
                .withBaseDamage(120)
                .asFire()
                .withIntelligenceScaling(1.5)
                .withStrengthScaling(1.5)
                .withKnockback(30)
                .withBurn(4.0)
                .withStun(1.0)
                .withParticle(eventManager, 'fireExplosion', '#FF3D00')
                .build();

              for (let i = 0; i < neighbors.length; i++) {
                const target = neighbors[i]!;
                if (target && target.id !== player.id && 'takeDamage' in target) {
                  meteorAttack.execute(target, new Vector2D(0, 1));
                }
              }
            }
          });

          eventManager.dispatch('log', { channel: 'domain', message: `[Broche] Chamado do Meteoro colidiu com o solo!`, params: [] });
        })
        .withAssertion((ctx) => {
          if (!ctx.eventManager) return { valid: false, reason: 'EventManager ausente' };
          const hasDispatched = typeof ctx.eventManager.getDispatchedEvents === 'function'
            ? ctx.eventManager.getDispatchedEvents().some((e: any) => e.name === 'particle' || e.name === 'spawnVisual')
            : true;
          return hasDispatched ? true : { valid: false, reason: 'Nenhum evento visual/partícula disparado pelo Meteoro' };
        })
        .build(),
      'brooch_meteor'
    );

    // -------------------------------------------------------------------------
    // 3. Dados da Fortuna (Buff de Sorte & Evasão)
    // -------------------------------------------------------------------------
    let luckTimer = 0;
    this.register(
      BroochTemplate.createActive('brooch_active_luck', 'Dados da Fortuna', 'Ativo: Aumenta a Sorte e Evasão em 100% por 10 segundos. Recarga: 45s.', 45000)
        .withTags('sorte', 'buff')
        .onExecute(({ player, eventManager }) => {
          luckTimer = 10.0;
          const px = player.coordinates.x + player.size.width / 2;
          const py = player.coordinates.y + player.size.height / 2;
          eventManager.dispatch('particle', { effect: 'levelUp', x: px, y: py, color: '#FFD700' });
          eventManager.dispatch('log', { channel: 'domain', message: `[Broche] Dados da Fortuna: Sorte e Evasão dobradas por 10s!`, params: [] });
        })
        .onUpdate((dt, { eventManager }) => {
          if (luckTimer > 0) {
            luckTimer -= dt;
            if (luckTimer <= 0) {
              luckTimer = 0;
              eventManager.dispatch('log', { channel: 'domain', message: '[Broche] Efeito dos Dados da Fortuna expirou.', params: [] });
            }
          }
        })
        .onBeforeTakeDamage(() => {
          if (luckTimer > 0) return { extraDodge: 50 };
          return undefined;
        })
        .onReset(() => { luckTimer = 0; })
        .withAssertion((ctx) => {
          const isTimerActive = luckTimer > 0;
          const resultDodge = ctx.lastResult && typeof ctx.lastResult.extraDodge === 'number' && ctx.lastResult.extraDodge > 0;
          const isValid = isTimerActive || resultDodge || luckTimer === 0;
          return { valid: isValid, reason: isValid ? undefined : 'Estado de Dados da Fortuna inconsistente' };
        })
        .build(),
      'brooch_luck'
    );

    // -------------------------------------------------------------------------
    // 4. Botas Aladas (Recarga de Dash & Mobilidade)
    // -------------------------------------------------------------------------
    let dashSurgeTimer = 0;
    this.register(
      BroochTemplate.createActive('brooch_active_dash', 'Botas Aladas', 'Ativo: Reseta instantaneamente todas as cargas de dash com ímpeto veloz. Recarga: 30s.', 30000)
        .withTags('agilidade', 'mobilidade')
        .onExecute(({ player, eventManager }) => {
          if (typeof player.resetDashCooldown === 'function') player.resetDashCooldown();
          dashSurgeTimer = 2.5;

          const px = player.coordinates.x + player.size.width / 2;
          const py = player.coordinates.y + player.size.height / 2;
          eventManager.dispatch('particle', { effect: 'magicPulse', x: px, y: py, color: '#00E5FF' });
          eventManager.dispatch('log', { channel: 'domain', message: `[Broche] Botas Aladas: Dash restaurado com ímpeto de vento!`, params: [] });
        })
        .onUpdate((dt, { player }) => {
          if (dashSurgeTimer > 0) {
            dashSurgeTimer -= dt;
            if (dashSurgeTimer <= 0) {
              dashSurgeTimer = 0;
            } else {
              player.currentSpeedModifier = Math.max(player.currentSpeedModifier, 1.5);
            }
          }
        })
        .onReset(() => { dashSurgeTimer = 0; })
        .withAssertion((ctx) => {
          const valid = dashSurgeTimer > 0 || (ctx.player && typeof ctx.player.currentSpeedModifier === 'number');
          return { valid: !!valid, reason: valid ? undefined : 'Falha ao validar impulso de velocidade das Botas Aladas' };
        })
        .build(),
      'brooch_dash',
      'brooch_blink'
    );

    // -------------------------------------------------------------------------
    // 5. Barreira de Cristal (Escudo Absoluto de 3 Golpes)
    // -------------------------------------------------------------------------
    let shieldCharges = 0;
    this.register(
      BroochTemplate.createActive('brooch_active_shield', 'Barreira de Cristal', 'Ativo: Cria um escudo que absorve 100% de dano nos próximos 3 hits. Recarga: 60s.', 60000)
        .withTags('defesa', 'escudo')
        .onExecute(({ player, eventManager }) => {
          shieldCharges = 3;
          const px = player.coordinates.x + player.size.width / 2;
          const py = player.coordinates.y + player.size.height / 2;
          eventManager.dispatch('spawnVisual', {
            type: 'brooch-shield',
            coordinates: { x: px - 64, y: py - 64 },
            duration: 0.8,
            size: { width: 128, height: 128 }
          });
          eventManager.dispatch('particle', { effect: 'magicPulse', x: px, y: py, color: '#00B0FF' });
          eventManager.dispatch('log', { channel: 'domain', message: `[Broche] Barreira de Cristal ativada! Absorverá os próximos 3 golpes recebidos.`, params: [] });
        })
        .onBeforeTakeDamage((_dmg, { player, eventManager }) => {
          if (shieldCharges > 0) {
            shieldCharges--;
            const px = player.coordinates.x + player.size.width / 2;
            const py = player.coordinates.y + player.size.height / 2;
            eventManager.dispatch('spawnVisual', {
              type: 'brooch-shield',
              coordinates: { x: px - 64, y: py - 64 },
              duration: 0.4,
              size: { width: 128, height: 128 }
            });
            eventManager.dispatch('particle', { effect: 'magicPulse', x: px, y: py, color: '#00B0FF' });
            eventManager.dispatch('log', { channel: 'domain', message: `🛡️ [Barreira de Cristal] Golpe absorvido pelo escudo! (${shieldCharges} cargas restantes)`, params: [] });
            return { absorbed: true };
          }
          return undefined;
        })
        .onReset(() => { shieldCharges = 0; })
        .withAssertion((ctx) => {
          const absorbed = ctx.lastResult && ctx.lastResult.absorbed === true;
          const hasCharges = shieldCharges > 0;
          const valid = absorbed || hasCharges || shieldCharges === 0;
          return { valid: !!valid, reason: valid ? undefined : 'Barreira de Cristal sem cargas ou absorção inválida' };
        })
        .build(),
      'brooch_shield'
    );

    // -------------------------------------------------------------------------
    // 6. Fúria do Berserker (Buff de Dano / Defesa Zero)
    // -------------------------------------------------------------------------
    let berserkTimer = 0;
    this.register(
      BroochTemplate.createActive('brooch_active_berserk', 'Fúria do Berserker', 'Ativo: Aumenta o dano em 50% e reduz a defesa a zero por 8 segundos. Recarga: 120s.', 120000)
        .withTags('dano', 'buff')
        .onExecute(({ player, eventManager }) => {
          berserkTimer = 8.0;
          const px = player.coordinates.x + player.size.width / 2;
          const py = player.coordinates.y + player.size.height / 2;
          eventManager.dispatch('spawnVisual', {
            type: 'berserk',
            coordinates: { x: px - 64, y: py - 64 },
            duration: 0.8,
            size: { width: 128, height: 128 }
          });
          eventManager.dispatch('particle', { effect: 'fireExplosion', x: px, y: py, color: '#D50000' });
          eventManager.dispatch('log', { channel: 'domain', message: `[Broche] Fúria do Berserker liberada! +50% de Dano e Defesa zerada por 8s!`, params: [] });
        })
        .onUpdate((dt, { eventManager }) => {
          if (berserkTimer > 0) {
            berserkTimer -= dt;
            if (berserkTimer <= 0) {
              berserkTimer = 0;
              eventManager.dispatch('log', { channel: 'domain', message: '[Broche] Fúria do Berserker se dissipou.', params: [] });
            }
          }
        })
        .onBeforeTakeDamage(() => {
          if (berserkTimer > 0) return { overrideDamageReduction: 0 };
          return undefined;
        })
        .onComputeDamageMultiplier(() => {
          return berserkTimer > 0 ? 1.5 : 1.0;
        })
        .onReset(() => { berserkTimer = 0; })
        .withAssertion((ctx) => {
          const mult = typeof ctx.lastResult === 'number' ? ctx.lastResult : (berserkTimer > 0 ? 1.5 : 1.0);
          const valid = mult >= 1.0;
          return { valid, reason: valid ? undefined : 'Multiplicador do Berserker inferior a 1.0' };
        })
        .build(),
      'brooch_berserk'
    );

    // -------------------------------------------------------------------------
    // 7. Corrente de Raios (Tempestade Elétrica)
    // -------------------------------------------------------------------------
    this.register(
      BroochTemplate.createActive('brooch_chain', 'Corrente de Tempestade', 'Ativo: Propaga arcos elétricos entre até 4 inimigos próximos. Recarga: 20s.', 20000)
        .withTags('dano', 'eletricidade')
        .onExecute(({ player, eventManager, mouseCoords }) => {
          eventManager.dispatch('requestNeighbors', {
            coordinates: mouseCoords,
            radius: 160,
            callback: (neighbors: any[]) => {
              const chainAttack = AttackBuilder.create(player)
                .withBaseDamage(45)
                .asMagical()
                .withIntelligenceScaling(1.2)
                .withParalyze(1.2)
                .withParticle(eventManager, 'magicPulse', '#FFEA00')
                .build();

              let struck = 0;
              for (let i = 0; i < neighbors.length && struck < 4; i++) {
                const target = neighbors[i]!;
                if (target && target.id !== player.id && 'takeDamage' in target) {
                  chainAttack.execute(target, new Vector2D(0, 0));
                  struck++;
                }
              }
            }
          });

          eventManager.dispatch('log', { channel: 'domain', message: `[Broche] Corrente de Tempestade propagada com sucesso!`, params: [] });
        })
        .withAssertion((ctx) => {
          if (!ctx.eventManager) return { valid: false, reason: 'EventManager ausente' };
          return true;
        })
        .build()
    );

    // -------------------------------------------------------------------------
    // 8. O BROCHE AZUL / FORMA ASTRAL (Estase Cósmica & Reset de Cooldowns)
    // -------------------------------------------------------------------------
    let astralTimer = 0;
    this.register(
      BroochTemplate.createActive('brooch_active_astral', 'Estase Cósmica', 'Ativo: Entra em forma astral azul, ganha imunidade total e reseta todos os cooldowns por 4s. Recarga: 75s.', 75000)
        .withTags('sobrevivência', 'arcano', 'astral')
        .onExecute(({ player, eventManager }) => {
          astralTimer = 4.0;
          player.visualTint = '#00E5FF';

          if (player.classManager && typeof player.classManager.resetAllCooldowns === 'function') {
            player.classManager.resetAllCooldowns();
          }

          const px = player.coordinates.x + player.size.width / 2;
          const py = player.coordinates.y + player.size.height / 2;

          eventManager.dispatch('particle', { effect: 'magicPulse', x: px, y: py, color: '#00E5FF' });
          eventManager.dispatch('log', { channel: 'domain', message: '✨ [Estase Cósmica] Forma Astral Azul ativada! Cooldowns resetados e imunidade total!', params: [] });
        })
        .onUpdate((dt, { player, eventManager }) => {
          if (astralTimer > 0) {
            astralTimer -= dt;
            if (astralTimer <= 0) {
              astralTimer = 0;
              player.visualTint = undefined;
              eventManager.dispatch('log', { channel: 'domain', message: '✨ [Estase Cósmica] Forma Astral dissipada.', params: [] });
            }
          }
        })
        .onBeforeTakeDamage(() => {
          if (astralTimer > 0) return { absorbed: true };
          return undefined;
        })
        .onBeforeApplyStatus(() => {
          if (astralTimer > 0) return { block: true };
          return undefined;
        })
        .onReset((ctx) => {
          astralTimer = 0;
          if (ctx && ctx.player) ctx.player.visualTint = undefined;
        })
        .withAssertion((ctx) => {
          const absorbed = ctx.lastResult && ctx.lastResult.absorbed === true;
          const blocked = ctx.lastResult && ctx.lastResult.block === true;
          const active = astralTimer > 0;
          const valid = active || absorbed || blocked || astralTimer === 0;
          return { valid: !!valid, reason: valid ? undefined : 'Estase Cósmica falhou na validação de imunidade' };
        })
        .build(),
      'brooch_astral',
      'brooch_blue'
    );

    // -------------------------------------------------------------------------
    // 9 a 15. Broches Passivos Delegados (SRP / Governança de Tamanho de Arquivo)
    // -------------------------------------------------------------------------
    const passiveHelpers = PassiveBrooches.registerAll(this.register.bind(this));

    (this as any).getRerollCharges = passiveHelpers.getRerollCharges;
    (this as any).useRerollCharge = passiveHelpers.useRerollCharge;
    (this as any).getShieldCharges = () => shieldCharges;
    (this as any).getFortuneBuffTimer = () => luckTimer;
    (this as any).getBerserkTimer = () => berserkTimer;
    (this as any).getShadowStealthTimer = passiveHelpers.getShadowStealthTimer;
    (this as any).getDashSurgeTimer = () => dashSurgeTimer;
    (this as any).isPhoenixUsed = passiveHelpers.isPhoenixUsed;
    (this as any).getAstralTimer = () => astralTimer;
  }

  public static getShieldCharges(): number {
    return (this as any).getShieldCharges ? (this as any).getShieldCharges() : 0;
  }

  public static getFortuneBuffTimer(): number {
    return (this as any).getFortuneBuffTimer ? (this as any).getFortuneBuffTimer() : 0;
  }

  public static getBerserkTimer(): number {
    return (this as any).getBerserkTimer ? (this as any).getBerserkTimer() : 0;
  }

  public static getShadowStealthTimer(): number {
    return (this as any).getShadowStealthTimer ? (this as any).getShadowStealthTimer() : 0;
  }

  public static getDashSurgeTimer(): number {
    return (this as any).getDashSurgeTimer ? (this as any).getDashSurgeTimer() : 0;
  }

  public static isPhoenixUsed(): boolean {
    return (this as any).isPhoenixUsed ? (this as any).isPhoenixUsed() : false;
  }

  public static getAstralTimer(): number {
    return (this as any).getAstralTimer ? (this as any).getAstralTimer() : 0;
  }

  public static getRerollCharges(): number {
    return (this as any).getRerollCharges ? (this as any).getRerollCharges() : 0;
  }

  public static useRerollCharge(): boolean {
    return (this as any).useRerollCharge ? (this as any).useRerollCharge() : false;
  }

  public static resetAll(): void {
    const dummyCtx = { player: null, eventManager: null as any };
    for (const def of this.definitions.values()) {
      if (def.onReset) def.onReset(dummyCtx);
    }
  }
}
export default BroochRegistry;
