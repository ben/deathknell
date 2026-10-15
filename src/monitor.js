/**
 * Effect lifecycle. Applies the "death knell" effect to tokens whose HP is
 * within the visible window (0 through the threshold, inclusive) while they
 * are not marked dead, and removes it when either condition stops holding.
 */

import { resolveHP, resolveHPPath, hpChanged } from "./hp.js";
import { FILTER_ID, FILTER_PARAMS } from "./effect.js";

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
