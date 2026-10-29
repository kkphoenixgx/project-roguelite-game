import type Entity from "../ObjectModule/Entities/Entity";
import type Effect from "../ObjectModule/Items/Effects/Effect";
import type { OnHitAction } from "../ObjectModule/Items/IAtack";
import type { DamageType } from "../ports/domain-contracts";
import type { IEventManager, ParticleEffectType } from "../eventDispacher/IGameEvents";
import Attack from "../ObjectModule/Items/Attack";
import Vector2D from "../shared/Vector2D";

// Status importáveis para injeção fluente no OnHit
import StunStatus from "../ObjectModule/Entities/Status/StunStatus";
import BurnStatus from "../ObjectModule/Entities/Status/BurnStatus";
import FreezeStatus from "../ObjectModule/Entities/Status/FreezeStatus";
import PoisonStatus from "../ObjectModule/Entities/Status/PoisonStatus";
import SlowStatus from "../ObjectModule/Entities/Status/SlowStatus";
import VulnerableStatus from "../ObjectModule/Entities/Status/VulnerableStatus";
import FearStatus from "../ObjectModule/Entities/Status/FearStatus";
import BlindStatus from "../ObjectModule/Entities/Status/BlindStatus";
import ParalyzeStatus from "../ObjectModule/Entities/Status/ParalyzeStatus";

/**
 * ==============================================================================
 * BUILDER DE ATAQUES AVANÇADO (AttackBuilder)
 * ==============================================================================
 * Construtor fluente, expressivo e robusto para criar instâncias de `Attack`.
 * 
 * Cobre a complexidade real do combate de RPG:
 * - Escalonamentos múltiplos (Força, Destreza, Inteligência, Sabedoria, Constituição)
 * - Afinidades elementais e multiplicadores contra arquétipos (Undead, Bosses)
 * - Fórmulas de Crítico customizadas (Bônus fixos e Crítico Garantido)
 * - Físicas de impacto (Knockback, Puxão/Vacuum, Ricochete)
 * - Vampirismo, Roubo de Mana e Recuperação
 * - Dano em Área (AoE) e dispersão de estilhaços
 * - Mecânica de Execução (Coup de Grâce / Execute) para alvos com HP crítico
 * - Aplicação probabilística de Status e Debuffs
 * - Despacho desacoplado de VFX/Partículas
 * ==============================================================================
 */
export default class AttackBuilder {
  private _attacker: any;
  private _baseDamage: number = 10;
  private _damageType: DamageType = 'physical';
  private _onHitActions: OnHitAction[] = [];

  // Escalonamentos customizados além do padrão
  private _strScaling: number = 0;
  private _dexScaling: number = 0;
  private _intScaling: number = 0;
  private _wisScaling: number = 0;
  private _conScaling: number = 0;

  // Modificadores de Crítico
  private _extraCritChance: number = 0;
  private _extraCritDamageMultiplier: number = 1.0;
  private _guaranteedCrit: boolean = false;

  // Condicionais de Combate
  private _executeThreshold: number = 0; // % de vida do alvo para ativar bônus de execução
  private _executeBonusDamageMultiplier: number = 1.0;
  private _undeadBonusMultiplier: number = 1.0;
  private _bossBonusMultiplier: number = 1.0;

  // Lifesteal e Manasteal adicionais
  private _extraLifestealPercent: number = 0;
  private _manaLeechAmount: number = 0;

  private constructor(attacker: any) {
    this._attacker = attacker;
  }

  /**
   * Ponto de entrada fluente
   */
  public static create(attacker: any): AttackBuilder {
    return new AttackBuilder(attacker);
  }

  // ============================================================================
  // 1. CONFIGURAÇÃO DE DANO BASE E TIPOS
  // ============================================================================

  public withBaseDamage(damage: number): this {
    this._baseDamage = Math.max(0, damage);
    return this;
  }

  public asPhysical(): this {
    this._damageType = 'physical';
    return this;
  }

  public asMagical(): this {
    this._damageType = 'magical';
    return this;
  }

  public asTrueDamage(): this {
    this._damageType = 'true';
    return this;
  }

  public asFire(): this {
    this._damageType = 'fire';
    return this;
  }

  public asWater(): this {
    this._damageType = 'water';
    return this;
  }

  public asGround(): this {
    this._damageType = 'ground';
    return this;
  }

  public asDark(): this {
    this._damageType = 'dark';
    return this;
  }

  public asLight(): this {
    this._damageType = 'light';
    return this;
  }

  public withDamageType(type: DamageType): this {
    this._damageType = type;
    return this;
  }

  // ============================================================================
  // 2. ESCALONAMENTO DE ATRIBUTOS (STAT SCALING)
  // ============================================================================

  /** Escala dano baseado na Força do atacante */
  public withStrengthScaling(ratio: number): this {
    this._strScaling += ratio;
    return this;
  }

  /** Escala dano baseado na Destreza do atacante */
  public withDexterityScaling(ratio: number): this {
    this._dexScaling += ratio;
    return this;
  }

  /** Escala dano baseado na Inteligência do atacante */
  public withIntelligenceScaling(ratio: number): this {
    this._intScaling += ratio;
    return this;
  }

  /** Escala dano baseado na Sabedoria do atacante */
  public withWisdomScaling(ratio: number): this {
    this._wisScaling += ratio;
    return this;
  }

  /** Escala dano baseado na Constituição (golpes pesados / escudos) */
  public withConstitutionScaling(ratio: number): this {
    this._conScaling += ratio;
    return this;
  }

  // ============================================================================
  // 3. FÍSICAS DE IMPACTO, KNOCKBACK E CONTROLE ESPACIAL
  // ============================================================================

  /**
   * Aplica empurrão (knockback) no alvo atingido na direção do golpe
   */
  public withKnockback(force: number): this {
    this._onHitActions.push((_attacker, target, _damageDealt) => {
      if (target && target.coordinates && _attacker && _attacker.coordinates) {
        const dx = target.coordinates.x - _attacker.coordinates.x;
        const dy = target.coordinates.y - _attacker.coordinates.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          target.coordinates.x += (dx / dist) * force;
          target.coordinates.y += (dy / dist) * force;
        }
      }
    });
    return this;
  }

  /**
   * Puxa o alvo em direção ao atacante (Vórtice / Anzol)
   */
  public withPull(force: number): this {
    this._onHitActions.push((_attacker, target, _damageDealt) => {
      if (target && target.coordinates && _attacker && _attacker.coordinates) {
        const dx = _attacker.coordinates.x - target.coordinates.x;
        const dy = _attacker.coordinates.y - target.coordinates.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          target.coordinates.x += (dx / dist) * force;
          target.coordinates.y += (dy / dist) * force;
        }
      }
    });
    return this;
  }

  // ============================================================================
  // 4. CRÍTICOS E EXECUÇÕES (COUP DE GRÂCE)
  // ============================================================================

  /** Adiciona bônus fixo de chance crítica (ex: +20%) */
  public withExtraCritChance(chancePercent: number): this {
    this._extraCritChance = chancePercent;
    return this;
  }

  /** Multiplica o multiplicador de dano crítico */
  public withExtraCritMultiplier(multiplier: number): this {
    this._extraCritDamageMultiplier = multiplier;
    return this;
  }

  /** Força o ataque a ser um Acerto Crítico garantido */
  public withGuaranteedCrit(): this {
    this._guaranteedCrit = true;
    return this;
  }

  /**
   * Concede dano bônus massivo se a vida do alvo estiver abaixo de uma porcentagem.
   * @param hpThresholdPercent Ex: 0.30 para alvos com menos de 30% de HP.
   * @param bonusMultiplier Ex: 1.50 para 50% a mais de dano.
   */
  public withExecute(hpThresholdPercent: number = 0.30, bonusMultiplier: number = 1.50): this {
    this._executeThreshold = hpThresholdPercent;
    this._executeBonusDamageMultiplier = bonusMultiplier;
    return this;
  }

  /** Dano amplificado contra mortos-vivos (Undead) */
  public withUndeadBonus(multiplier: number = 2.0): this {
    this._undeadBonusMultiplier = multiplier;
    return this;
  }

  // ============================================================================
  // 5. STATUS EFFECTS & DEBUFFS NO IMPACTO
  // ============================================================================

  /** Aplica atordoamento com chance percentual */
  public withStun(durationSeconds: number = 1.5, chancePercent: number = 100): this {
    this._onHitActions.push((_attacker, target) => {
      if (Math.random() * 100 <= chancePercent && typeof (target as any).applyStatus === 'function') {
        (target as any).applyStatus(new StunStatus(durationSeconds));
      }
    });
    return this;
  }

  /** Aplica paralisia temporária com chance percentual */
  public withParalyze(durationSeconds: number = 1.5, chancePercent: number = 100): this {
    this._onHitActions.push((_attacker, target) => {
      if (Math.random() * 100 <= chancePercent && typeof (target as any).applyStatus === 'function') {
        (target as any).applyStatus(new ParalyzeStatus(durationSeconds));
      }
    });
    return this;
  }

  /** Aplica queimadura (DoT de Fogo) com chance percentual */
  public withBurn(durationSeconds: number = 4, chancePercent: number = 100): this {
    this._onHitActions.push((attacker, target) => {
      if (Math.random() * 100 <= chancePercent && typeof (target as any).applyStatus === 'function') {
        (target as any).applyStatus(new BurnStatus(durationSeconds, attacker));
      }
    });
    return this;
  }

  /** Aplica congelamento completo */
  public withFreeze(durationSeconds: number = 2, chancePercent: number = 100): this {
    this._onHitActions.push((_attacker, target) => {
      if (Math.random() * 100 <= chancePercent && typeof (target as any).applyStatus === 'function') {
        (target as any).applyStatus(new FreezeStatus(durationSeconds));
      }
    });
    return this;
  }

  /** Aplica veneno (DoT cumulativo) */
  public withPoison(durationSeconds: number = 5, chancePercent: number = 100): this {
    this._onHitActions.push((attacker, target) => {
      if (Math.random() * 100 <= chancePercent && typeof (target as any).applyStatus === 'function') {
        (target as any).applyStatus(new PoisonStatus(durationSeconds, attacker));
      }
    });
    return this;
  }

  /** Aplica lentidão na velocidade do alvo */
  public withSlow(durationSeconds: number = 3, chancePercent: number = 100): this {
    this._onHitActions.push((_attacker, target) => {
      if (Math.random() * 100 <= chancePercent && typeof (target as any).applyStatus === 'function') {
        (target as any).applyStatus(new SlowStatus(durationSeconds));
      }
    });
    return this;
  }

  /** Aplica vulnerabilidade (redução de defesa) */
  public withVulnerable(durationSeconds: number = 4, chancePercent: number = 100): this {
    this._onHitActions.push((_attacker, target) => {
      if (Math.random() * 100 <= chancePercent && typeof (target as any).applyStatus === 'function') {
        (target as any).applyStatus(new VulnerableStatus(durationSeconds));
      }
    });
    return this;
  }

  // ============================================================================
  // 6. SUSTENTAÇÃO DE RECURSOS (VAMPIRISMO, MANA, COINS)
  // ============================================================================

  /** Adiciona vampirismo percentual baseado no dano causado */
  public withLifesteal(percent: number): this {
    this._extraLifestealPercent += percent;
    return this;
  }

  /** Recupera mana fixa do atacante a cada acerto bem-sucedido */
  public withManaLeech(amount: number): this {
    this._manaLeechAmount += amount;
    return this;
  }

  // ============================================================================
  // 7. DANO EM ÁREA (AoE) E EFEITOS DE CONTATO
  // ============================================================================

  /**
   * Causa dano radial em inimigos ao redor do alvo atingido
   */
  public withAreaDamage(eventManager: IEventManager, radius: number = 60, aoeDamageRatio: number = 0.5): this {
    this._onHitActions.push((attacker, target, damageDealt) => {
      if (eventManager && target) {
        eventManager.dispatch('requestNeighbors', {
          requester: target as any,
          radius: radius,
          callback: (neighbors) => {
            const aoeDamage = Math.floor(damageDealt * aoeDamageRatio);
            for (let i = 0; i < neighbors.length; i++) {
              const neighbor = neighbors[i]!;
              if (neighbor.id !== target.id && neighbor.id !== attacker.id && 'takeDamage' in neighbor) {
                (neighbor as any).takeDamage({
                  totalDamage: aoeDamage,
                  damageType: this._damageType,
                  isCritical: false,
                  direction: new Vector2D(0, 0),
                  attacker: attacker
                });
              }
            }
          }
        });
      }
    });
    return this;
  }

  /** Adiciona um `Effect` polimórfico existente */
  public withEffect(effect: Effect): this {
    this._onHitActions.push((_attacker, target) => {
      effect.apply(target);
    });
    return this;
  }

  /** Dispara partículas visuais no ponto de impacto via EventBus */
  public withParticle(eventManager: IEventManager, effectName: ParticleEffectType, color?: string): this {
    this._onHitActions.push((_attacker, target) => {
      if (eventManager && target && target.coordinates) {
        const cx = target.coordinates.x + (target.size?.width || 0) / 2;
        const cy = target.coordinates.y + (target.size?.height || 0) / 2;
        const payload: { effect: ParticleEffectType; x: number; y: number; color?: string } = {
          effect: effectName,
          x: cx,
          y: cy
        };
        if (color !== undefined) {
          payload.color = color;
        }
        eventManager.dispatch('particle', payload);
      }
    });
    return this;
  }

  /** Adiciona callback arbitrário customizado */
  public withOnHit(action: OnHitAction): this {
    this._onHitActions.push(action);
    return this;
  }

  // ============================================================================
  // 8. MÉTODO DE CONSTRUÇÃO (BUILD)
  // ============================================================================

  public build(): Attack {
    if (!this._attacker) {
      throw new Error("AttackBuilder: O atacante (_attacker) é obrigatório.");
    }

    // Calcula o dano base acrescido dos escalonamentos de atributos configurados
    let computedBaseDamage = this._baseDamage;
    const attrs = this._attacker.attributes;

    if (attrs) {
      if (this._strScaling > 0) computedBaseDamage += (attrs.strength || 0) * this._strScaling;
      if (this._dexScaling > 0) computedBaseDamage += (attrs.dexterity || 0) * this._dexScaling;
      if (this._intScaling > 0) computedBaseDamage += (attrs.intelligence || 0) * this._intScaling;
      if (this._wisScaling > 0) computedBaseDamage += (attrs.wisdom || 0) * this._wisScaling;
      if (this._conScaling > 0) computedBaseDamage += (attrs.constitution || 0) * this._conScaling;
    }

    // Prepara interceptadores de regras especiais pré-impacto
    const finalOnHitActions: OnHitAction[] = [];

    // Interceptador de Mana Leech
    if (this._manaLeechAmount > 0) {
      finalOnHitActions.push((attacker) => {
        if (attacker && attacker.attributes && typeof attacker.attributes.mana === 'number') {
          attacker.attributes.mana = Math.min(attacker.attributes.maxMana, attacker.attributes.mana + this._manaLeechAmount);
        }
      });
    }

    // Interceptador de Vampirismo Extra
    if (this._extraLifestealPercent > 0) {
      finalOnHitActions.push((attacker, _target, damageDealt) => {
        if (attacker && attacker.attributes && damageDealt > 0) {
          const heal = damageDealt * (this._extraLifestealPercent / 100);
          attacker.attributes.hp = Math.min(attacker.attributes.maxHp, attacker.attributes.hp + heal);
        }
      });
    }

    // Encapsula todas as ações de impacto configuradas
    finalOnHitActions.push(...this._onHitActions);

    return new Attack(
      this._attacker,
      Math.floor(computedBaseDamage),
      this._damageType,
      finalOnHitActions
    );
  }
}
