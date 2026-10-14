/**
 * Module settings registration.
 */

const DEFAULT_ACTOR_TYPES = ["character", "npc"];

/** Build multi-select choices from the active game system's actor types. */
function actorTypeChoices() {
  const types = Object.keys(game.system?.model?.Actor?.types ?? {});
  const labels = CONFIG.Actor?.typeLabels ?? {};
  const choices = Object.fromEntries(
    types.map((type) => {
      const labelPath = labels[type];
      return [type, labelPath ? game.i18n.localize(labelPath) : type];
    })
  );
  // Fallback for systems that expose no actor model types
  return Object.keys(choices).length > 0 ? choices : { character: "Character", npc: "NPC" };
}

const SETTING = {
  actorTypes: {
    name: "deathknell.settings.actorTypes.name",
    hint: "deathknell.settings.actorTypes.hint",
    scope: "world",
    config: true,
    // SetField renders a multi-select in the settings menu; value reads back as a Set
    type: new foundry.data.fields.SetField(
      new foundry.data.fields.StringField({ choices: actorTypeChoices() }),
      { initial: DEFAULT_ACTOR_TYPES }
    )
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
    default: "hostile"
  },
  hpThreshold: {
    name: "deathknell.settings.hpThreshold.name",
    hint: "deathknell.settings.hpThreshold.hint",
    scope: "world",
    config: true,
    type: Number,
    default: 10
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
