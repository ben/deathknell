/**
 * Deathknell — watches actor updates and flags tokens whose HP drops
 * to or below a configurable threshold.
 */

import { registerSettings } from "./settings.js";
import { onActorUpdate } from "./monitor.js";

Hooks.once("init", () => {
  registerSettings();
  Hooks.on("updateActor", onActorUpdate);
});
