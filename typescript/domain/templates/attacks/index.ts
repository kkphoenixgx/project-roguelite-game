import OrbitalAttackTemplate, {
  ActiveOrbitalAttack,
  type IOrbitalAttackDefinition,
  type OrbitalHitContext,
  type OrbitalKnockbackMode
} from "./OrbitalAttackTemplate";

import SweepingArcAttackTemplate, {
  ActiveSweepingArc,
  type ISweepingArcDefinition,
  type SweepingArcHitContext
} from "./SweepingArcAttackTemplate";

import ChanneledBeamAttackTemplate, {
  ActiveChanneledBeam,
  type IChanneledBeamDefinition,
  type BeamHitContext
} from "./ChanneledBeamAttackTemplate";

import NovaBurstAttackTemplate, {
  ActiveNovaBurst,
  type INovaBurstDefinition,
  type NovaBurstHitContext
} from "./NovaBurstAttackTemplate";

import AttackBuilder from "../AttackBuilder";

/**
 * ==============================================================================
 * CATÁLOGO DE TEMPLATES DE ATAQUE (Attack Templates Catalog)
 * ==============================================================================
 * Centraliza os templates geométricos e cinemáticos de ataque do domínio.
 * 
 * Filosofia de Design:
 * - Pureza Hexagonal: Lógica matemática e física em coordenadas lógicas puras.
 * - Zero-GC: Cálculos de colisão e trajetórias utilizam vetores in-place.
 * - Composição Paramétrica: Altamente customizável via atributos do jogador/lacaio
 *   (Destreza para velocidade angular/varredura, Força para alcance/raio).
 * - Proteção Multi-Hit: Cooldowns granulares por alvo para evitar frame-melting.
 * ==============================================================================
 */
export const AttackTemplates = {
  Orbital: OrbitalAttackTemplate,
  SweepingArc: SweepingArcAttackTemplate,
  ChanneledBeam: ChanneledBeamAttackTemplate,
  NovaBurst: NovaBurstAttackTemplate,
  Builder: AttackBuilder,
} as const;

export default AttackTemplates;

export {
  OrbitalAttackTemplate,
  ActiveOrbitalAttack,
  type IOrbitalAttackDefinition,
  type OrbitalHitContext,
  type OrbitalKnockbackMode,

  SweepingArcAttackTemplate,
  ActiveSweepingArc,
  type ISweepingArcDefinition,
  type SweepingArcHitContext,

  ChanneledBeamAttackTemplate,
  ActiveChanneledBeam,
  type IChanneledBeamDefinition,
  type BeamHitContext,

  NovaBurstAttackTemplate,
  ActiveNovaBurst,
  type INovaBurstDefinition,
  type NovaBurstHitContext,

  AttackBuilder
};
