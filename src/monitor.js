/**
 * updateActor hook handler. Applies the "death knell" Token Magic effect — a
 * trio of glowing bells circling the token — to an actor's tokens while its HP
 * is at or below the threshold, and removes it when the HP rises back above.
 */

import { resolveHP, resolveHPPath, hpChanged } from "./hp.js";

/** Filter id used for the bells effect; re-adding with the same id replaces it. */
const FILTER_ID = "deathknell-bells";

/** Orbit shared by the three bells: radius (grid units) and time per revolution (ms). */
const ORBIT_RADIUS = 2.0;
const ORBIT_PERIOD = 10000;

/**
 * The Token Magic parameters for the bells effect: three identical sprites
 * sharing one orbit, offset a third of a revolution apart so they ring the
 * token evenly. `syncShift` is a phase in fractions of a loop, which is what
 * spaces the bells without desyncing their rotation.
 */
const BELL_FILTER_PARAMS = [0, 1 / 3, 2 / 3].map((phase) => ({
  filterType: "sprite",
  filterId: FILTER_ID,
  imagePath: "modules/deathknell/assets/bell_flat.png",
  gridPadding: 1,
  scaleX: 0.2,
  scaleY: 0.2,
  colorize: true,
  color: 0xffc84a,
  inverse: false,
  top: true,
  animated: {
    translationX: {
      active: true,
      animType: "cosOscillation",
      val1: ORBIT_RADIUS,
      val2: -ORBIT_RADIUS,
      loopDuration: ORBIT_PERIOD,
      syncShift: phase,
    },
    translationY: {
      active: true,
      animType: "sinOscillation",
      val1: ORBIT_RADIUS,
      val2: -ORBIT_RADIUS,
      loopDuration: ORBIT_PERIOD,
      syncShift: phase,
    },
    color: {
      active: true,
      animType: "colorOscillation",
      val1: 0xffd75e,
      val2: 0xfff3c8,
      loopDuration: 4000,
    },
  },
}));

/** Warn about an unresolvable HP path once per actor. */
const warnedActors = new Set();

/** Actor ids currently showing the bells effect, to avoid stacking duplicates. */
const flaggedActors = new Set();

/**
 * Apply the bells effect to every active token of the actor. Token Magic keys
 * filters by its own internal id, so re-adding stacks duplicates — clear any
 * existing filter first.
 */
async function addBells(actor) {
  for (const token of actor.getActiveTokens()) {
    await TokenMagic.deleteFilters(token, FILTER_ID);
    await TokenMagic.addFilters(token, BELL_FILTER_PARAMS);
  }
  flaggedActors.add(actor.id);
}

/** Remove the bells effect from every active token of the actor. */
async function removeBells(actor) {
  for (const token of actor.getActiveTokens()) {
    await TokenMagic.deleteFilters(token, FILTER_ID);
  }
  flaggedActors.delete(actor.id);
}

/**
 * @param {Actor}  actor    The updated actor.
 * @param {object} changed  The differential data of the update.
 */
export async function onActorUpdate(actor, changed) {
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
  const below = hp <= threshold;
  if (below === flaggedActors.has(actor.id)) return; // no state change, nothing to do

  if (below) {
    console.log(
      `deathknell | "${actor.name}" (${actor.type}) at ${hp} HP, at or below threshold ${threshold}`
    );
    await addBells(actor);
  } else {
    await removeBells(actor);
  }
}
