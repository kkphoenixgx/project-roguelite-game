import Effect from "../Effect";
import type Entity from "../../../Entities/Entity";
import type { IEventManager } from "../../../../eventDispacher/IGameEvents";

/**
 * ==============================================================================
 * EFEITO DE NEGAÇÃO / DISPEL AXIOMÁTICO (NegationEffect)
 * ==============================================================================
 * Axioma: Ordo + Caos + Magia
 * 
 * Regras:
 * - Poder de Purga padrão: Tier 3.
 * - Remove até 1 buff mágico por acerto cuja coesão seja <= purgePower.
 * - Efeitos de Tier > purgePower (ou não mágicos) não são removidos.
 * ==============================================================================
 */
export default class NegationEffect extends Effect {
  constructor(
    private readonly eventManager?: IEventManager,
    public readonly purgePower: number = 3
  ) {
    super('Negação (Dispel)', 'Anula até 1 efeito mágico ativo de Tier <= 3 do alvo.');
  }

  public apply(target: Entity): void {
    if (!target.activeStatusesList || target.activeStatusesList.length === 0) {
      return;
    }

    //? Purga status mágico elegível (Tier <= purgePower) priorizando maior tier ou LIFO
    let candidateIndex = -1;
    let highestTierFound = -1;

    for (let i = target.activeStatusesList.length - 1; i >= 0; i--) {
      const status = target.activeStatusesList[i]!;
      const category = (status as any).category || 'magical';
      const tier = typeof (status as any).tier === 'number' ? (status as any).tier : 1;

      if (category === 'magical' && tier <= this.purgePower) {
        if (tier > highestTierFound) {
          highestTierFound = tier;
          candidateIndex = i;
        }
      }
    }

    if (candidateIndex !== -1) {
      const targetStatus = target.activeStatusesList[candidateIndex]!;
      const statusId = targetStatus.id;

      target.removeStatus(statusId);

      const cx = target.coordinates.x + target.size.width / 2;
      const cy = target.coordinates.y + target.size.height / 2;

      this.eventManager?.dispatch('particle', {
        effect: 'magicPulse',
        x: cx,
        y: cy
      });

      this.eventManager?.dispatch('log', {
        channel: 'domain',
        message: `[Dispel] Status mágico '${statusId}' (Tier ${highestTierFound}) foi purgado de ${target.objectId}!`,
        params: []
      });
    }
  }
}
