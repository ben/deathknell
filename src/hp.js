/**
 * HP resolution for arbitrary game systems.
 */

/** Heuristic dotted paths, tried in order when no hpPath setting is configured. */
const HEURISTIC_PATHS = [
  "system.attributes.hp.value",
  "system.hp.value",
  "system.health.value",
  "system.wounds.value"
];

/**
 * Resolve the current HP of an actor, system-agnostically.
 *
 * Uses the configured `hpPath` setting when set; otherwise tries each
 * heuristic path in turn and returns the first numeric value found.
 *
 * @param {Actor} actor  The actor to read HP from.
 * @returns {number|null} The current HP, or null if unresolvable.
 */
export function resolveHP(actor) {
  const customPath = game.settings.get("deathknell", "hpPath");
  const paths = customPath ? [customPath, ...HEURISTIC_PATHS] : HEURISTIC_PATHS;

  for (const path of paths) {
    const value = foundry.utils.getProperty(actor, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

/**
 * Whether an update delta touched the given HP path.
 *
 * @param {object} changed  The `changed` object from the updateActor hook.
 * @param {string} path     The resolved HP dotted path.
 * @returns {boolean}
 */
export function hpChanged(changed, path) {
  return foundry.utils.getProperty(changed ?? {}, path) !== undefined;
}

/**
 * The dotted path that resolveHP used for this actor, for change detection.
 * Mirrors resolveHP's lookup order.
 *
 * @param {Actor} actor
 * @returns {string|null}
 */
export function resolveHPPath(actor) {
  const customPath = game.settings.get("deathknell", "hpPath");
  const paths = customPath ? [customPath, ...HEURISTIC_PATHS] : HEURISTIC_PATHS;

  for (const path of paths) {
    const value = foundry.utils.getProperty(actor, path);
    if (typeof value === "number" && Number.isFinite(value)) return path;
  }
  return null;
}
