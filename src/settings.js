/**
 * Module settings registration.
 */

const SETTING = {
  actorTypes: {
    name: "deathknell.settings.actorTypes.name",
    hint: "deathknell.settings.actorTypes.hint",
    scope: "world",
    config: true,
    type: String,
    default: "character,npc"
  },
  tokenDisposition: {
    name: "deathknell.settings.tokenDisposition.name",
    hint: "deathknell.settings.tokenDisposition.hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      any: "Any",
      hostile: "Hostile",
      neutral: "Neutral",
      friendly: "Friendly",
      secret: "Secret"
    },
    default: "any"
  },
  hpThreshold: {
    name: "deathknell.settings.hpThreshold.name",
    hint: "deathknell.settings.hpThreshold.hint",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  },
  hpPath: {
    name: "deathknell.settings.hpPath.name",
    hint: "deathknell.settings.hpPath.hint",
    scope: "world",
    config: true,
    type: String,
    default: ""
  }
};

/** Register the module's settings under the `deathknell` namespace. */
export function registerSettings() {
  for (const [key, options] of Object.entries(SETTING)) {
    game.settings.register("deathknell", key, options);
  }
}
