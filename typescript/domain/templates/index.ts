import TemplateEnemyTemplate from "./EnemyTemplate";
import TemplateProjectileTemplate from "./ProjectileTemplate";
import TemplateWeaponTemplate from "./WeaponTemplate";
import TemplateConsumableTemplate from "./ConsumableTemplate";
import TemplateStatusEffectTemplate from "./StatusEffectTemplate";
import AttackBuilder from "./AttackBuilder";
import TemplatePlayerClassTemplate from "./PlayerClassTemplate";
import TemplateCognitiveNpcTemplate from "./CognitiveNpcTemplate";
import TemplateArmorTemplate from "./ArmorTemplate";
import { ComplexClassBase, ClassSkillBuilder } from "./ComplexClassBase";
import VortexArcanistTemplate from "./VortexArcanistTemplate";
import BroochTemplate, { type IBroochDefinition, type BroochExecutionContext } from "./BroochTemplate";
import TransformationTemplate, { ActiveTransformation, type ITransformationDefinition } from "./TransformationTemplate";
import SummonTemplate, { SummonEntity, type SummonConfig } from "./SummonTemplate";
import GroundHazardTemplate, { GroundHazardInstance, type IGroundHazardDefinition } from "./GroundHazardTemplate";
import SynergyReactionTemplate, { SynergyReactionRegistry, type ISynergyReactionDefinition } from "./SynergyReactionTemplate";
import SkillTemplate, { type ISkillDefinition, type SkillExecutionContext } from "./SkillTemplate";
import EvolvingClassBase, { type IEvolvingStageDefinition } from "./EvolvingClassBase";
import EvolvingClassTemplate, { EvolvingStageBuilder } from "./EvolvingClassTemplate";
import AttackTemplates, {
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
  type NovaBurstHitContext
} from "./attacks";
import {
  RuneGrammarEngine,
  MageSpellTemplate,
  MageSpellCraftingRegistry,
  MageSpellRecipeBuilder,
  type StaticSpellRecipe,
  type ParsedRuneGrammar,
  type SpellExecutionContext,
  type DynamicSpellContext,
  type ForceSolverContext
} from "./mage";


/**
 * ==============================================================================
 * CATÁLOGO DE PADRÕES E GABARITOS DE DOMÍNIO (Domain Templates Catalog)
 * ==============================================================================
 * Centraliza e documenta os modelos canônicos para desenvolvedores e agentes.
 * 
 * Quem chega no projeto deve usar estas classes como referência primária antes de
 * criar novas regras ou entidades, garantindo aderência estrita a:
 * - Pureza Hexagonal (sem dependências de tela/DOM/Tauri)
 * - Zero-GC e Mutação In-Place
 * - Padrão de Spawner Dinâmico (@RegisterSpawner)
 * - Desacoplamento via EventBus (IGameEvents)
 * - Construção fluente de ataques via AttackBuilder e AttackTemplates (Orbital, Sweeping, Beam, Nova)
 * - Construção de classes complexas via ComplexClassBase e ClassSkillBuilder
 * - Construção de broches ancestrais via BroochTemplate
 * - Metamorfoses e avatares via TransformationTemplate
 * - Companheiros e lacaios autônomos via SummonTemplate
 * - Zonas de efeito e santuários via GroundHazardTemplate
 * - Matriz de reações elementais via SynergyReactionTemplate
 * ==============================================================================
 */
export const DomainTemplates = {
  Enemy: TemplateEnemyTemplate,
  Projectile: TemplateProjectileTemplate,
  Weapon: TemplateWeaponTemplate,
  Consumable: TemplateConsumableTemplate,
  StatusEffect: TemplateStatusEffectTemplate,
  AttackBuilder: AttackBuilder,
  Attacks: AttackTemplates,
  Skill: SkillTemplate,
  PlayerClass: TemplatePlayerClassTemplate,
  EvolvingClass: EvolvingClassTemplate,
  ComplexClassBase: ComplexClassBase,
  ClassSkillBuilder: ClassSkillBuilder,
  ComplexClassExample: VortexArcanistTemplate,
  CognitiveNPC: TemplateCognitiveNpcTemplate,
  Armor: TemplateArmorTemplate,
  Brooch: BroochTemplate,
  Transformation: TransformationTemplate,
  Summon: SummonTemplate,
  GroundHazard: GroundHazardTemplate,
  SynergyReaction: SynergyReactionTemplate,
  MageSpell: MageSpellTemplate,
  RuneGrammar: RuneGrammarEngine,
  MageSpellRegistry: MageSpellCraftingRegistry,
} as const;


export {
  TemplateEnemyTemplate,
  TemplateProjectileTemplate,
  TemplateWeaponTemplate,
  TemplateConsumableTemplate,
  TemplateStatusEffectTemplate,
  AttackBuilder,
  AttackTemplates,
  SkillTemplate,
  type ISkillDefinition,
  type SkillExecutionContext,
  EvolvingClassBase,
  type IEvolvingStageDefinition,
  EvolvingClassTemplate,
  EvolvingStageBuilder,
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
  TemplatePlayerClassTemplate,
  ComplexClassBase,
  ClassSkillBuilder,
  VortexArcanistTemplate,
  TemplateCognitiveNpcTemplate,
  TemplateArmorTemplate,
  BroochTemplate,
  type IBroochDefinition,
  type BroochExecutionContext,
  TransformationTemplate,
  ActiveTransformation,
  type ITransformationDefinition,
  SummonTemplate,
  SummonEntity,
  type SummonConfig,
  GroundHazardTemplate,
  GroundHazardInstance,
  type IGroundHazardDefinition,
  SynergyReactionTemplate,
  SynergyReactionRegistry,
  type ISynergyReactionDefinition,
  RuneGrammarEngine,
  MageSpellTemplate,
  MageSpellCraftingRegistry,
  MageSpellRecipeBuilder,
  type StaticSpellRecipe,
  type ParsedRuneGrammar,
  type SpellExecutionContext,
  type DynamicSpellContext,
  type ForceSolverContext
};

