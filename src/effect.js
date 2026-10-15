/**
 * Effect definition. Applies the "death knell" Token Magic effect — a ring of
 * glowing bells circling the token, plus an evil breathing glow.
 */

/** Filter id used for the bells effect; re-adding with the same id replaces it. */
export const FILTER_ID = "deathknell-bells";

/**
 * Bell size, as a fraction of one grid square, and orbit radius, as a
 * fraction of the token's grid width — so bells stay the same size on any
 * token while the ring grows with it.
 */
const BELL_SIZE = 0.4;
const ORBIT_RADIUS = 0.55;
const ORBIT_PERIOD = 15000;

/** Shared pulse period (ms) for the bell color sweep and the glow breathing. */
const PULSE_MS = 5000;

/**
 * The token's image scale on one axis, sanitized: mirrored tokens use a
 * negative scale, and a missing or zero scale would break the math below.
 */
function textureScale(doc, axis) {
  const scale = Math.abs(doc.texture?.[axis] ?? 1);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/**
 * The token's footprint in grid squares, on one axis, sanitized: a missing or
 * zero size would break the math below.
 */
function gridSize(doc, axis) {
  const size = doc?.[axis];
  return Number.isFinite(size) && size > 0 ? size : 1;
}

/**
 * How many bells ring around a token: three on a 1x1 token, growing by two
 * per grid square (2x2 → 5, 3x3 → 7, …), so bigger tokens look denser rather
 * than having scaled-up bells.
 */
function bellCount(doc) {
  const size = Math.max(1, Math.round(Math.max(gridSize(doc, "width"), gridSize(doc, "height"))));
  return 2 * size + 1;
}

/**
 * The Token Magic parameters for the bells effect: identical sprites sharing
 * one orbit, evenly spaced around it. `syncShift` is a phase in fractions of
 * a loop, which is what spaces the bells without desyncing their rotation.
 * The bells sweep from black to corpse-pale gray — a slow heartbeat of
 * shadow and bone.
 *
 * The sprite filter positions and sizes each bell in fractions of the token's
 * *texture rectangle*, which grows with the token's image scale — left alone,
 * bells on a scale-1 token orbit inside it. Dividing the sprite scale by the
 * image scale (and the token's grid size, to keep the bells themselves from
 * growing with the token) pins the bell size to the grid, while the orbit
 * radius (which the shader couples to the sprite scale) stays proportional to
 * the token's footprint.
 */
function bellFilterParams(doc) {
  const w = gridSize(doc, "width");
  const h = gridSize(doc, "height");
  const scaleX = BELL_SIZE / (textureScale(doc, "scaleX") * w);
  const scaleY = BELL_SIZE / (textureScale(doc, "scaleY") * h);
  // The orbit oscillates the translation uniform, which the shader weights by
  // the sprite scale — hence the radius expressed in multiples of the bell.
  const radiusX = (ORBIT_RADIUS * w) / BELL_SIZE;
  const radiusY = (ORBIT_RADIUS * h) / BELL_SIZE;
  // Keep the filter frame wide enough for the ring's outer edge; never less
  // than a grid square, which the breathing glow needs.
  const size = Math.max(w, h);
  const gridPadding = Math.max(1, (ORBIT_RADIUS - 0.5) * size + BELL_SIZE);
  const count = bellCount(doc);
  return [...Array(count).keys()].map((i) => i / count).map((phase) => ({
    filterType: "sprite",
    filterId: FILTER_ID,
    imagePath: "modules/deathknell/assets/bell_flat.png",
    gridPadding,
    scaleX,
    scaleY,
    colorize: true,
    color: 0xaaaaaa,
    inverse: false,
    top: true,
    animated: {
      translationX: {
        active: true,
        animType: "cosOscillation",
        val1: radiusX,
        val2: -radiusX,
        loopDuration: ORBIT_PERIOD,
        syncShift: phase,
      },
      translationY: {
        active: true,
        animType: "sinOscillation",
        val1: radiusY,
        val2: -radiusY,
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
}

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

/**
 * Everything the effect shows at once: bells plus glow, under one filter id.
 *
 * Token Magic stacks a token's filters sorted by `rank` (or by `zOrder`, when
 * its own z-order setting is on), and the last filter in the stack is applied
 * last — its output is what gets composited on screen. Ranks are auto-assigned
 * in array order, so listing the glow last pins it to the top of the stack in
 * either mode, letting its aura wash over the bells.
 *
 * The glow params must be cloned per call: addFilters mutates its inputs,
 * stamping a rank onto any param that lacks one, and its rank pool only ever
 * grows. A shared object would keep the (then-stale) rank from the first
 * application, sinking the glow below the bells on every re-add.
 */
export function buildFilterParams(doc) {
  return [...bellFilterParams(doc), foundry.utils.deepClone(GLOW_FILTER_PARAMS)];
}
