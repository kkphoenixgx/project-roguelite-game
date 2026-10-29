import RuneGrammarEngine, {
  type RuneKind,
  type RuneDefinition,
  type ParsedRuneGrammar
} from "./RuneGrammarEngine";

import MageSpellTemplate, {
  MageSpellRecipeBuilder,
  type StaticSpellRecipe,
  type StaticSpellExecutionMode,
  type SpellExecutionContext,
  type DynamicSpellContext,
  type ForceSolverContext
} from "./MageSpellTemplate";

import MageSpellCraftingRegistry, {
  type FormSolverFn,
  type ForceSolverFn,
  type DynamicSpellRule
} from "./MageSpellCraftingRegistry";

import {
  AbyssalDemonSpell,
  abyssalDemonTransformation,
  abyssalDemonDynamicRule,
  abyssalDemonStaticRecipe,
  registerAbyssalDemon,
  BladeInfusions,
  bladeInfusionAirDynamicRule,
  bladeInfusionLightDynamicRule,
  registerBladeInfusions
} from "./spells";

export {
  RuneGrammarEngine,
  type RuneKind,
  type RuneDefinition,
  type ParsedRuneGrammar,
  MageSpellTemplate,
  MageSpellRecipeBuilder,
  type StaticSpellRecipe,
  type StaticSpellExecutionMode,
  type SpellExecutionContext,
  type DynamicSpellContext,
  type ForceSolverContext,
  MageSpellCraftingRegistry,
  type FormSolverFn,
  type ForceSolverFn,
  type DynamicSpellRule,
  AbyssalDemonSpell,
  abyssalDemonTransformation,
  abyssalDemonDynamicRule,
  abyssalDemonStaticRecipe,
  registerAbyssalDemon,
  BladeInfusions,
  bladeInfusionAirDynamicRule,
  bladeInfusionLightDynamicRule,
  registerBladeInfusions
};

export default {
  GrammarEngine: RuneGrammarEngine,
  SpellTemplate: MageSpellTemplate,
  CraftingRegistry: MageSpellCraftingRegistry,
  AbyssalDemon: AbyssalDemonSpell,
  BladeInfusions: BladeInfusions
};


