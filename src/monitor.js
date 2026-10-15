/**
 * Effect lifecycle. Applies the "death knell" effect to tokens whose HP is
 * within the visible window (1 through the threshold, inclusive) while they
 * are not marked dead, and removes it when either condition stops holding.
 */

import { resolveHP, resolveHPPath, hpChanged } from "./hp.js";
import { FILTER_ID, buildFilterParams } from "./effect.js";

/** Warn about an unresolvable HP path once per actor. */
const warnedActors = new Set();

/**
 * Normalize a setting value that may read back as a Set (saved through a
 * SetField menu), a plain array (its initial value), or a single string
 * (a value saved by a previous version of the setting).
 */
function asSet(value) {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  return value ? new Set([value]) : new Set();
}

/** Whether the actor's type is monitored: membership in the Actor Types allow-list, where an empty list monitors every type. */
function actorTypeMonitored(actor) {
  const types = asSet(game.settings.get("deathknell", "actorTypes"));
  return types.size === 0 || types.has(actor.type);
}

/** Whether the token's disposition is monitored: membership in the Token Dispositions allow-list, where an empty list monitors every disposition. */
function tokenDispositionMonitored(doc) {
  const selected = asSet(game.settings.get("deathknell", "tokenDisposition"));
  if (selected.size === 0) return true;
  return [...selected].some((key) => doc.disposition === CONST.TOKEN_DISPOSITIONS[key?.toUpperCase()]);
}

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
  if (!actorTypeMonitored(actor) || !tokenDispositionMonitored(doc)) return false;
  return hpInWindow(actor) && !tokenIsDead(doc);
}

/**
 * Bring one token in line with the current visibility rules. Token Magic keys
 * filters by its own internal id, so re-adding stacks duplicates — clear any
 * existing filter first. Removal is gated on the token's persisted Token Magic
 * flags (not module-side bookkeeping), so filters that arrived by other means
 * — most notably loaded with the scene from a previous session — are still
 * cleaned up.
 *
 * @param {Token} token  The token placeable to sync.
 */
async function syncToken(token) {
  const doc = token.document;
  const visible = effectVisible(doc);

  if (visible) {
    await TokenMagic.deleteFilters(token, FILTER_ID);
    await TokenMagic.addFilters(token, buildFilterParams(doc));
  } else if (TokenMagic.hasFilterId(token, FILTER_ID)) {
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
  if (!actorTypeMonitored(actor)) return;

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
 * (e.g. the "dead" status was applied or removed) or its disposition changed.
 *
 * @param {TokenDocument} doc      The updated token document.
 * @param {object}        changed  The differential data of the update.
 */
export async function onTokenUpdate(doc, changed) {
  if (changed?.effects === undefined && changed?.disposition === undefined) return;
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

/** Re-sync every placed token in the active scene. */
async function syncScene() {
  for (const token of canvas?.tokens?.placeables ?? []) {
    await syncToken(token);
  }
}

/**
 * updateSetting hook handler: re-sync the scene's tokens when one of the
 * module's settings changes, so new filter values apply immediately instead
 * of waiting for the next matching update.
 *
 * World settings are Setting documents, so this fires on every client with
 * the updated document; `doc.key` is "namespace.key".
 *
 * @param {Setting} doc  The updated Setting document.
 */
export async function onSettingUpdate(doc) {
  if (!doc?.key?.startsWith("deathknell.")) return;
  await syncScene();
}
