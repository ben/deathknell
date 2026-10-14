/**
 * updateActor hook handler. Applies the "ioun stone" Token Magic effect to an
 * actor's tokens while its HP is at or below the threshold, and removes it
 * when the HP rises back above.
 */

import { resolveHP, resolveHPPath, hpChanged } from "./hp.js";

/** Filter id used for the ioun stone effect; re-adding with the same id replaces it. */
const FILTER_ID = "deathknell-ioun-stone";

/** The Token Magic parameters for the ioun stone effect. */
const IOUN_STONE_PARAMS = [
  {
    filterType: "sprite",
    filterId: FILTER_ID,
    imagePath: "modules/tokenmagic/fx/assets/gem-2.png",
    gridPadding: 1,
    scaleX: 0.2,
    scaleY: 0.2,
    colorize: true,
    color: 0xffbb00,
    inverse: false,
    top: true,
    animated: {
      rotation: {
        active: true,
        clockWise: false,
        loopDuration: 2000,
        animType: "syncRotation",
      },
      translationX: {
        active: true,
        animType: "cosOscillation",
        val1: 2.0,
        val2: -2.0,
        loopDuration: 4000,
      },
      translationY: {
        active: true,
        animType: "sinOscillation",
        val1: 2.0,
        val2: -2.0,
        loopDuration: 4000,
      },
      color: {
        active: true,
        animType: "colorOscillation",
        val1: 0xffff00,
        val2: 0x00ffff,
        loopDuration: 4000,
      },
    },
  },
];

/** Warn about an unresolvable HP path once per actor. */
const warnedActors = new Set();

/** Actor ids currently showing the ioun stone effect, to avoid stacking duplicates. */
const flaggedActors = new Set();

/**
 * Apply the ioun stone effect to every active token of the actor. Token Magic
 * keys filters by its own internal id, so re-adding stacks duplicates — clear
 * any existing filter first.
 */
async function addIounStone(actor) {
  for (const token of actor.getActiveTokens()) {
    await TokenMagic.deleteFilters(token, FILTER_ID);
    await TokenMagic.addFilters(token, IOUN_STONE_PARAMS);
  }
  flaggedActors.add(actor.id);
}

/** Remove the ioun stone effect from every active token of the actor. */
async function removeIounStone(actor) {
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
    await addIounStone(actor);
  } else {
    await removeIounStone(actor);
  }
}
