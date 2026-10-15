/**
 * Deathknell — watches actor updates and flags tokens whose HP drops
 * to or below a configurable threshold.
 */

import { registerSettings } from "./settings.js";
import { onActorUpdate, onTokenUpdate, onCombatantUpdate, onSettingUpdate } from "./monitor.js";

Hooks.once("init", () => {
  registerSettings();
  Hooks.on("updateActor", onActorUpdate);
  Hooks.on("updateToken", onTokenUpdate);
  Hooks.on("updateActiveCombatant", onCombatantUpdate);
  Hooks.on("updateSetting", onSettingUpdate);
});
