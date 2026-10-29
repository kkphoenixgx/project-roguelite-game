import Skill, { type SkillType } from "../Skills/Skill";
import type Effect from "../ObjectModule/Items/Effects/Effect";
import type { action } from "../eventDispacher/actions.type";
import type { IPlayer } from "../ports/domain-contracts";
import type { IEventManager } from "../eventDispacher/IGameEvents";
import Vector2D from "../shared/Vector2D";

/**
 * Contexto de execução de uma habilidade ativa.
 */
export interface SkillExecutionContext {
  readonly player: IPlayer;
  readonly eventManager: IEventManager;
  readonly mouseCoords: { x: number; y: number };
  readonly playerCenter: { x: number; y: number };
  readonly direction: Vector2D;
}

export type SkillExecutionHandler = (ctx: SkillExecutionContext) => void;
export type SkillPassiveApplyHandler = (player: IPlayer, eventManager: IEventManager) => void;
export type SkillPassiveRemoveHandler = (player: IPlayer, eventManager: IEventManager) => void;

export interface ISkillDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: SkillType;
  readonly tier: number;
  readonly requiredLevel?: number | undefined;
  readonly requiredSkillId?: string | undefined;
  readonly cooldownMs: number;
  readonly manaCost: number;
  readonly hpCost: number;
  readonly keybind?: action | undefined;
  readonly iconId?: string | undefined;
  readonly effect?: Effect | undefined;
  readonly requiresMainHandWeapon?: boolean | undefined;
  readonly onExecute?: SkillExecutionHandler | undefined;
  readonly onPassiveApply?: SkillPassiveApplyHandler | undefined;
  readonly onPassiveRemove?: SkillPassiveRemoveHandler | undefined;
}

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO DE HABILIDADE (SkillTemplate)
 * ==============================================================================
 * Centraliza e padroniza a criação de Habilidades Ativas, Passivas e Essenciais
 * para qualquer classe de personagem ou entidade cognitiva do jogo.
 * 
 * Recursos e Garantias:
 * - Pureza Hexagonal: Desacoplado de DOM, Canvas ou WebGPU.
 * - Zero-GC: Reutiliza vetores e caches de direção no hot path.
 * - Gerenciamento de Recursos: Verificação e consumo seguro de Mana e HP.
 * - Cooldown Integrado: Comunicação com a porta de recarga do jogador.
 * - Compatibilidade Retroativa: Gera instâncias canônicas da classe `Skill`.
 * ==============================================================================
 */
export default class SkillTemplate {
  private _id: string;
  private _name: string;
  private _description: string;
  private _type: SkillType = 'active';
  private _tier: number = 1;
  private _requiredLevel: number = 1;
  private _requiredSkillId?: string | undefined;
  private _cooldownMs: number = 0;
  private _manaCost: number = 0;
  private _hpCost: number = 0;
  private _keybind?: action | undefined;
  private _iconId?: string | undefined;
  private _effect?: Effect | undefined;
  private _requiresMainHandWeapon?: boolean | undefined;
  private _onExecute?: SkillExecutionHandler | undefined;
  private _onPassiveApply?: SkillPassiveApplyHandler | undefined;
  private _onPassiveRemove?: SkillPassiveRemoveHandler | undefined;

  //! Vetor de direção reutilizável em memória para evitar alocações de GC no loop de ataque
  private static readonly _dirCache: Vector2D = new Vector2D(0, 0);

  private constructor(id: string, name: string, description: string) {
    this._id = id;
    this._name = name;
    this._description = description;
  }

  public static create(id: string, name: string, description: string): SkillTemplate {
    return new SkillTemplate(id, name, description);
  }

  public asActive(tier: number = 1, cooldownMs: number = 2000): this {
    this._type = 'active';
    this._tier = tier;
    this._cooldownMs = cooldownMs;
    return this;
  }

  public asPassive(tier: number = 1): this {
    this._type = 'passive';
    this._tier = tier;
    this._cooldownMs = 0;
    this._manaCost = 0;
    return this;
  }

  public asEssential(tier: number = 1, cooldownMs: number = 1000): this {
    this._type = 'essential';
    this._tier = tier;
    this._cooldownMs = cooldownMs;
    return this;
  }

  public asRare(tier: number = 3, cooldownMs: number = 8000): this {
    this._type = 'rare';
    this._tier = tier;
    this._cooldownMs = cooldownMs;
    return this;
  }

  public asAttribute(tier: number = 1): this {
    this._type = 'attribute';
    this._tier = tier;
    this._cooldownMs = 0;
    this._manaCost = 0;
    return this;
  }

  public withCooldown(cooldownMs: number): this {
    this._cooldownMs = cooldownMs;
    return this;
  }

  public withManaCost(mana: number): this {
    this._manaCost = mana;
    return this;
  }

  public withHpCost(hp: number): this {
    this._hpCost = hp;
    return this;
  }

  public withRequiredLevel(level: number): this {
    this._requiredLevel = level;
    return this;
  }

  public withPrerequisite(requiredSkillId: string): this {
    this._requiredSkillId = requiredSkillId;
    return this;
  }

  public withKeybind(keybind: action): this {
    this._keybind = keybind;
    return this;
  }

  public withIcon(iconId: string): this {
    this._iconId = iconId;
    return this;
  }

  public withEffect(effect: Effect): this {
    this._effect = effect;
    return this;
  }

  public withMainHandWeaponRequired(required: boolean = true): this {
    this._requiresMainHandWeapon = required;
    return this;
  }

  public onExecute(handler: SkillExecutionHandler): this {
    this._onExecute = handler;
    return this;
  }

  public onPassiveApply(handler: SkillPassiveApplyHandler): this {
    this._onPassiveApply = handler;
    return this;
  }

  public onPassiveRemove(handler: SkillPassiveRemoveHandler): this {
    this._onPassiveRemove = handler;
    return this;
  }

  public build(): ISkillDefinition {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      type: this._type,
      tier: this._tier,
      requiredLevel: this._requiredLevel,
      requiredSkillId: this._requiredSkillId,
      cooldownMs: this._cooldownMs,
      manaCost: this._manaCost,
      hpCost: this._hpCost,
      keybind: this._keybind,
      iconId: this._iconId,
      effect: this._effect,
      requiresMainHandWeapon: this._requiresMainHandWeapon,
      onExecute: this._onExecute,
      onPassiveApply: this._onPassiveApply,
      onPassiveRemove: this._onPassiveRemove
    };
  }

  /**
   * Converte a definição deste template para o modelo de domínio Skill.
   */
  public toSkill(): Skill {
    return new Skill(
      this._id,
      this._name,
      this._description,
      this._type,
      this._tier,
      this._requiredSkillId,
      this._effect,
      this._keybind,
      undefined,
      this._requiresMainHandWeapon
    );
  }

  /**
   * Tenta executar a habilidade validando Cooldown e Custos de Recursos (Mana/HP).
   * @returns true se a habilidade foi disparada com sucesso, false caso contrário.
   */
  public execute(
    player: IPlayer,
    eventManager: IEventManager,
    mouseCoords: { x: number; y: number }
  ): boolean {
    const def = this.build();

    const isPlayerCooldown = (player as any).isSkillOnCooldown?.(def.id) ?? false;
    if (isPlayerCooldown) {
      eventManager.dispatch('log', {
        channel: 'domain',
        message: `⏳ [Habilidade] ${def.name} ainda em recarga!`,
        params: []
      });
      return false;
    }

    if (def.manaCost > 0) {
      const currentMana = player.attributes?.mana ?? 0;
      if (currentMana < def.manaCost) {
        eventManager.dispatch('log', {
          channel: 'domain',
          message: `💧 [Habilidade] Mana insuficiente para ${def.name} (${currentMana}/${def.manaCost})!`,
          params: []
        });
        return false;
      }
    }

    if (def.hpCost > 0) {
      const currentHp = player.attributes?.hp ?? 0;
      if (currentHp <= def.hpCost) {
        eventManager.dispatch('log', {
          channel: 'domain',
          message: `🩸 [Habilidade] Vida insuficiente para ${def.name}!`,
          params: []
        });
        return false;
      }
    }

    if (def.requiresMainHandWeapon) {
      const mainHandWeapon = (player as any).equipment?.mainHand;
      if (!mainHandWeapon) {
        eventManager.dispatch('log', {
          channel: 'error',
          message: `⚔️ [Habilidade] ${def.name} requer uma arma equipada na mão principal!`,
          params: []
        });
        return false;
      }
    }

    if (def.manaCost > 0 && player.attributes) {
      player.attributes.mana -= def.manaCost;
    }
    if (def.hpCost > 0 && player.attributes) {
      player.attributes.hp -= def.hpCost;
    }

    if (def.cooldownMs > 0) {
      (player as any).setSkillCooldown?.(def.id, def.cooldownMs);
    }

    const cx = player.coordinates.x + player.size.width / 2;
    const cy = player.coordinates.y + player.size.height / 2;

    SkillTemplate._dirCache.x = mouseCoords.x - cx;
    SkillTemplate._dirCache.y = mouseCoords.y - cy;
    if (SkillTemplate._dirCache.x === 0 && SkillTemplate._dirCache.y === 0) {
      SkillTemplate._dirCache.x = 1;
    }
    SkillTemplate._dirCache.normalizeMut();

    eventManager.dispatch('log', {
      channel: 'domain',
      message: `✨ [Habilidade: ${def.name}] Executada com sucesso!`,
      params: []
    });

    if (def.onExecute) {
      def.onExecute({
        player,
        eventManager,
        mouseCoords,
        playerCenter: { x: cx, y: cy },
        direction: SkillTemplate._dirCache
      });
    }

    return true;
  }
}
