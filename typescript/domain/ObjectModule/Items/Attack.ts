import type Entity from "../Entities/Entity";
import type Vector2D from "../../shared/Vector2D";
import type { IAtack, OnHitAction } from "./IAtack";
import type { DamageType } from "../../ports/domain-contracts";
import BurnStatus from "../Entities/Status/BurnStatus";

/**
 * Representa uma instância de um ataque, encapsulando toda a sua lógica.
 * Esta classe é responsável por calcular o dano, verificar acertos críticos,
 * aplicar o dano ao alvo e executar quaisquer efeitos "OnHit".
 */
export default class Attack implements IAtack {

  /**
   * @param _attacker A entidade que está realizando o ataque.
   * @param baseDamage O dano base da arma ou habilidade.
   * @param damageType O tipo de dano (físico, mágico, etc.).
   * @param onHitActions Uma lista de callbacks a serem executados no impacto.
   */
  constructor(
    private _attacker: any,
    private baseDamage: number,
    private damageType: DamageType,
    private onHitActions: OnHitAction[] = []
  ) {}

  public get attacker(): Entity { return this._attacker; }

  /**
   * Orquestra a execução completa do ataque contra um alvo.
   * @param target A entidade que está recebendo o ataque.
   * @param direction O vetor de direção do ataque, para knockback.
   */
  public execute(target: Entity, direction: Vector2D): void {

    const isCritical = Math.random() * 100 < this._attacker.attributes.critChance;

    let totalDamage = this.baseDamage;

    if (this.damageType === 'physical') {
      totalDamage += this._attacker.attributes.strength * 0.5;
    } else if (this.damageType === 'magical') {
      totalDamage += this._attacker.attributes.intelligence * 0.5;
    }

    if (isCritical) {
      totalDamage *= (this._attacker.attributes.critDamage / 100);
    }

    //? Multiplicador dinâmico de dano provido por broches/buffs (ex: Berserk).
    if ((this._attacker as any).classManager?.broochManager) {
      totalDamage *= (this._attacker as any).classManager.broochManager.getDamageMultiplier();
    }

    const damageDealt = target.takeDamage({
      totalDamage: Math.floor(totalDamage),
      damageType: this.damageType,
      isCritical: isCritical,
      direction: direction,
      attacker: this._attacker,
    });

    if (target.attributes.hp <= 0 && this._attacker.objectId === 'player') {
      if ('xpGiven' in target) {
        (this._attacker as any).gainXp((target as any).xpGiven);
      }
    }

    //? Despacha hooks pós-ataque para broches e habilidades passivas do atacante.
    if ((this._attacker as any).classManager?.broochManager) {
      (this._attacker as any).classManager.broochManager.onAfterAttack(target, isCritical, damageDealt);
    }

    //? Vampirismo (Lifesteal): cura proporcional ao dano líquido efetivamente desferido.
    const lifestealPercent = this._attacker.attributes.lifesteal;
    if (lifestealPercent > 0 && damageDealt > 0) {
      const healAmount = damageDealt * (lifestealPercent / 100);
      this._attacker.attributes.hp += healAmount;
      
      const attackerAny = this._attacker as any;
      if (attackerAny.eventManager) {
        const cx = this._attacker.coordinates.x + this._attacker.size.width / 2;
        const cy = this._attacker.coordinates.y + this._attacker.size.height / 2;
        attackerAny.eventManager.dispatch('particle', { effect: 'magicAura', x: cx, y: cy, color: '#ff2a2a' });
      }
    }

    //! Execução de onHitActions sob disciplina Zero-GC.
    this.onHitActions.forEach(action => action(this._attacker, target, damageDealt));

    //? Efeito de purga: remove até 1 buff mágico do alvo atingido.
    if (this._attacker.hasAntiMagicBlade && target.activeStatusesList && target.activeStatusesList.length > 0) {
      for (let i = target.activeStatusesList.length - 1; i >= 0; i--) {
        const status = target.activeStatusesList[i]!;
        const cat = (status as any).category || 'magical';
        const tier = typeof (status as any).tier === 'number' ? (status as any).tier : 1;
        if (cat === 'magical' && tier <= 3) {
          target.removeStatus(status.id);
          const cx = target.coordinates.x + target.size.width / 2;
          const cy = target.coordinates.y + target.size.height / 2;
          (this._attacker as any).eventManager?.dispatch('particle', { effect: 'magicPulse', x: cx, y: cy });
          (this._attacker as any).eventManager?.dispatch('log', {
            channel: 'domain',
            message: `[Lâmina Anti-Magia] O corte purificou o status mágico '${status.id}' de ${target.objectId}!`,
            params: []
          });
          break;
        }
      }
    }

    setTimeout(() => {
      this._attacker.resetAccelerator();
    }, 150);
  }
}