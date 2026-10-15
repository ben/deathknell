/**
 * Effect lifecycle. Applies the "death knell" Token Magic effect — a trio of
 * glowing bells circling the token — to tokens whose HP is within the visible
 * window (0 through the threshold, inclusive) while they are not marked dead,
 * and removes it when either condition stops holding.
 */

import { resolveHP, resolveHPPath, hpChanged } from "./hp.js";

/** Filter id used for the bells effect; re-adding with the same id replaces it. */
const FILTER_ID = "deathknell-bells";

/** Orbit shared by the three bells: radius (grid units) and time per revolution (ms). */
const ORBIT_RADIUS = 2.0;
const ORBIT_PERIOD = 15000;

/** Shared pulse period (ms) for the bell color sweep and the glow breathing. */
const PULSE_MS = 5000;

/**
 * The Token Magic parameters for the bells effect: three identical sprites
 * sharing one orbit, offset a third of a revolution apart so they ring the
 * token evenly. `syncShift` is a phase in fractions of a loop, which is what
 * spaces the bells without desyncing their rotation. The bells sweep from
 * black to corpse-pale gray — a slow heartbeat of shadow and bone.
 */
const BELL_FILTER_PARAMS = [0, 1 / 3, 2 / 3].map((phase) => ({
  filterType: "sprite",
  filterId: FILTER_ID,
  imagePath: "modules/deathknell/assets/bell_flat.png",
  gridPadding: 1,
  scaleX: 0.2,
  scaleY: 0.2,
  colorize: true,
  color: 0xaaaaaa,
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
      val1: 0x000000,
      val2: 0xaaaaaa,
      loopDuration: PULSE_MS,
    },
  },
}));

/**
 * An evil glow breathing around the token, modeled on Token Magic's own aura
 * presets (fire-aura / glacial-aura): a dark blood-red `xglow` whose
 * intensity slowly waxes and wanes in step with the bell pulse.
 */
const GLOW_FILTER_PARAMS = {
  filterType: "xglow",
  filterId: FILTER_ID,
  auraType: 1,
  color: 0x492c2c,
  thickness: 3,
  scale: 2.5,
  time: 0,
  auraIntensity: 1,
  subAuraIntensity: 0.4,
  threshold: 0.5,
  discard: false,
  animated: {
    time: { active: true, speed: 0.0015, animType: "move" },
    auraIntensity: {
      val1: 0.4,
      val2: 1.6,
      animType: "cosOscillation",
      loopDuration: PULSE_MS,
    },
    subAuraIntensity: {
      val1: 0.2,
      val2: 0.6,
      animType: "cosOscillation",
      loopDuration: PULSE_MS,
    },
  },
};

/** Everything the effect shows at once: bells plus glow, under one filter id. */
const FILTER_PARAMS = [...BELL_FILTER_PARAMS, GLOW_FILTER_PARAMS];

/** Warn about an unresolvable HP path once per actor. */
const warnedActors = new Set();

/** Token ids currently showing the effect, to avoid stacking duplicates. */
const flaggedTokens = new Set();

/**
 * Whether the actor's HP is in the window that shows the effect: 1 through
 * the configured threshold, both inclusive. A token with HP remaining rings;
 * a healed, unresolvable, or zero/negative-HP token does not.
 */
function hpInWindow(actor) {
  const hp = resolveHP(actor);
  if (hp === null) return false;
  const threshold = game.settings.get("deathknell", "hpThreshold");
  return hp >= 1 && hp <= threshold;
}

/**
 * Whether the token is marked dead, either by the core "dead" special status
 * effect or by being defeated in a combat tracker.
 *
 * @param {TokenDocument} doc  The token document to inspect.
 * @returns {boolean}
 */
function tokenIsDead(doc) {
  const deadId = CONFIG.specialStatuses?.DEAD ?? "dead";
  if (typeof doc.hasStatusEffect === "function" && doc.hasStatusEffect(deadId)) return true;

  const sceneId = doc.parent?.id;
  return (game.combats ?? []).some((combat) =>
    combat.combatants.some(
      (c) =>
        c.isDefeated &&
        c.tokenId === doc.id &&
        (!c.sceneId || c.sceneId === sceneId)
    )
  );
}

/** Whether the effect should currently be visible on this token. */
function effectVisible(doc) {
  const actor = doc.actor;
  if (!actor) return false;
  return hpInWindow(actor) && !tokenIsDead(doc);
}

/**
 * Bring one token in line with the current visibility rules. Token Magic keys
 * filters by its own internal id, so re-adding stacks duplicates — clear any
 * existing filter first.
 *
 * @param {Token} token  The token placeable to sync.
 */
async function syncToken(token) {
  const doc = token.document;
  const visible = effectVisible(doc);

  if (visible) {
    await TokenMagic.deleteFilters(token, FILTER_ID);
    await TokenMagic.addFilters(token, FILTER_PARAMS);
    flaggedTokens.add(doc.id);
  } else if (flaggedTokens.delete(doc.id)) {
    await TokenMagic.deleteFilters(token, FILTER_ID);
  }
}

/** Sync every active token of an actor. */
async function syncActor(actor) {
  for (const token of actor.getActiveTokens()) {
    await syncToken(token);
  }
}

/**
 * updateActor hook handler: re-sync the actor's tokens when its HP changed.
 *
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

  await syncActor(actor);
}

/**
 * updateToken hook handler: re-sync the token when its status effects changed
 * (e.g. the "dead" status was applied or removed).
 *
 * @param {TokenDocument} doc      The updated token document.
 * @param {object}        changed  The differential data of the update.
 */
export async function onTokenUpdate(doc, changed) {
  if (changed?.effects === undefined) return;
  const token = doc.object;
  if (token) await syncToken(token);
}

/**
 * updateActiveCombatant hook handler: re-sync the combatant's token when its
 * defeated flag changed.
 *
 * @param {Combatant} combatant  The updated combatant.
 * @param {object}    changed    The differential data of the update.
 */
export async function onCombatantUpdate(combatant, changed) {
  if (changed?.defeated === undefined) return;
  const token = combatant.token?.object;
  if (token) await syncToken(token);
}
