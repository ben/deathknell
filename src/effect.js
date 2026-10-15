/**
 * Effect definition. Applies the "death knell" Token Magic effect — a trio of
 * glowing bells circling the token, plus an evil breathing glow.
 */

/** Filter id used for the bells effect; re-adding with the same id replaces it. */
export const FILTER_ID = "deathknell-bells";

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
export const FILTER_PARAMS = [...BELL_FILTER_PARAMS, GLOW_FILTER_PARAMS];
