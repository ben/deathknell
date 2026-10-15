# Deathknell

A [Foundry Virtual Tabletop](https://foundryvtt.com) module that watches for tokens whose HP drops to or below a configurable threshold. Works with any game system.

## What it does

Deathknell listens for actor updates and, when an actor's HP falls within the visible window — 1 through the configured threshold, inclusive — marks its tokens with a "death knell" visual effect: a trio of glowing bells circling the token, accompanied by a pulsing dark-red glow. The effect is removed when the actor heals above the threshold, drops to 0 HP or below, or the token is marked dead (the "dead" status effect or defeated in the combat tracker). Requires the [Token Magic FX](https://foundryvtt.com/packages/tokenmagic) module.

## Settings

All settings live under **Configure Settings → Module Settings → Deathknell**:

| Setting | Description | Default |
|---|---|---|
| Actor Types | Multi-select allow-list of actor types to monitor | `character`, `npc` |
| Token Disposition | Only monitor tokens with this disposition | `hostile` |
| HP Threshold | Show the effect while HP is between 1 and this value (inclusive) | `10` |
| HP Data Path | Dotted path to the system's current HP value; leave empty to auto-detect | *(empty)* |

When **HP Data Path** is empty, Deathknell tries `system.attributes.hp.value`, `system.hp.value`, `system.health.value`, and `system.wounds.value` in order — covering most common systems. A configured path is tried first, before the heuristics. If no numeric HP can be resolved for an actor, it shows a one-time warning and ignores that actor.

> **Note:** the **Actor Types** and **Token Disposition** settings are registered but not yet enforced — every actor is currently monitored regardless of type or disposition.

## Installation

1. In Foundry, open **Configuration and Setup → Add-on Modules → Install Module**.
2. Paste the manifest URL: `https://github.com/ben/deathknell/releases/latest/download/module.json`
3. Enable the module in your world under **Manage Modules**.

Requires Foundry core **v14** and the [Token Magic FX](https://foundryvtt.com/packages/tokenmagic) module.

## Development

Clone the repo and symlink it into your Foundry user data:

```sh
ln -s ~/Code/deathknell <userData>/Data/modules/deathknell
```

Restart Foundry (or reload the world with `F5`) after changing source files. No build step — plain ES modules.

## AI disclosure

Parts of this module's code were written with the help of AI (Claude Code). All code has been reviewed by a human before release.

## License

[MIT](LICENSE)
