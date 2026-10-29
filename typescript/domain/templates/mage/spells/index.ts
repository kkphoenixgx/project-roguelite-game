import AbyssalDemonSpell, {
  abyssalDemonTransformation,
  abyssalDemonDynamicRule,
  abyssalDemonStaticRecipe,
  registerAbyssalDemon
} from "./AbyssalDemonSpell";

import BladeInfusions, {
  bladeInfusionAirDynamicRule,
  bladeInfusionLightDynamicRule,
  registerBladeInfusions
} from "./BladeInfusions";

export {
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
  AbyssalDemon: AbyssalDemonSpell,
  BladeInfusions: BladeInfusions
};
