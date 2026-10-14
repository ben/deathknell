/**
 * updateActor hook handler. Log-only scaffold: detects HP-at-or-below-threshold
 * and logs it; the visual effect is deferred to a future session.
 */

import { resolveHP, resolveHPPath, hpChanged } from "./hp.js";

/** Warn about an unresolvable HP path once per actor. */
const warnedActors = new Set();

/**
 * @param {Actor}  actor    The updated actor.
 * @param {object} changed  The differential data of the update.
 */
export function onActorUpdate(actor, changed) {
  const path = resolveHPPath(actor);
  const hp = resolveHP(actor);

  if (hp === null || path === null) {
    if (!warnedActors.has(actor.id)) {
      warnedActors.add(actor.id);
      ui.notifications.warn(game.i18n.format("deathknell.warnings.noHpPath", { name: actor.name }));
      console.warn(`deathknell | No resolvable HP path for actor "${actor.name}" (${actor.id})`);
    }
    return;
  }

  if (!hpChanged(changed, path)) return;

  const threshold = game.settings.get("deathknell", "hpThreshold");
  if (hp <= threshold) {
    console.log(
      `deathknell | "${actor.name}" (${actor.type}) at ${hp} HP, at or below threshold ${threshold}`
    );
  }
}
