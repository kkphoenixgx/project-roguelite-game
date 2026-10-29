import type { DynamicSpellContext, ForceSolverContext, StaticSpellRecipe } from "./MageSpellTemplate";

export type FormSolverFn = (context: DynamicSpellContext) => boolean;
export type ForceSolverFn = (context: ForceSolverContext) => void;

export interface DynamicSpellRule {
  readonly id: string;
  readonly name: string;
  readonly matcher: (context: DynamicSpellContext) => boolean;
  readonly execute: (context: DynamicSpellContext) => boolean;
  readonly priority?: number | undefined;
}

export interface ISpellRegistry {
  registerDynamicRule(rule: DynamicSpellRule): any;
  registerRecipe(recipe: StaticSpellRecipe): any;
  getElementVfx(element: string): string | undefined;
}
