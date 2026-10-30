import StatusEffect from "../ObjectModule/Entities/Status/StatusEffect";
import type Entity from "../ObjectModule/Entities/Entity";

/**
 * ==============================================================================
 * TEMPLATE ARQUETÍPICO: EFEITO DE STATUS / CONDIÇÃO MUTÁVEL DO DOMÍNIO
 * ==============================================================================
 * Regras Obrigatórias para quem está criando um novo Status:
 * 1. Estenda `StatusEffect`.
 * 2. Defina `id`, `description`, `duration` (segundos) e `tickInterval` (se for periódico).
 * 3. `onApply(target)`: Executado no momento em que a entidade recebe o status.
 * 4. `onTick(target)`: Executado periodicamente a cada `tickInterval` segundos (DoT/Regen).
 * 5. `onRemove(target)`: Limpeza de modificadores, restaurando atributos originais.
 * 6. Nunca crie memória no `onTick`: aplique dano via mutação direta nos atributos.
 * ==============================================================================
 */
export default class TemplateStatusEffectTemplate extends StatusEffect {
  private tickDamage: number = 3;

  constructor(duration: number = 5, tickInterval: number = 1) {
    super(
      'templateStatus',
      'Aplica dano periódico a cada segundo.',
      duration,
      tickInterval
    );
  }

  /**
   * Chamado quando o status é aplicado na entidade
   */
  protected override onApply(target: Entity): void {
  }

  /**
   * Chamado a cada intervalo de tick (ex: a cada 1 segundo)
   */
  protected override onTick(target: Entity): void {
    if (!target.attributes || target.attributes.hp <= 0) return;

    //! Aplicação direta de dano contínuo sem instanciar novos objetos (Zero-GC)
    target.attributes.hp = Math.max(0, target.attributes.hp - this.tickDamage);

    if (target.attributes.hp <= 0) {
      target.state = 'dead';
    }
  }

  /**
   * Chamado quando a duração expira ou o status é purgado
   */
  protected override onRemove(target: Entity): void {
  }
}
