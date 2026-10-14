# Deathknell

A [Foundry Virtual Tabletop](https://foundryvtt.com) module that watches for tokens whose HP drops to or below a configurable threshold. Works with any game system.

## What it does

Deathknell listens for actor updates and, when a monitored token's HP falls to or below the configured threshold, flags the token. In this version the detection is logged to the console only; a visual effect on the token is planned for a future release. Flags clear when the token heals above the threshold.

## Settings

All settings live under **Configure Settings → Module Settings → Deathknell**:

| Setting | Description | Default |
|---|---|---|
| Actor Types | Comma-separated allow-list of actor types to monitor | `character,npc` |
| Token Disposition | Only monitor tokens with this disposition | `any` |
| HP Threshold | Trigger when HP drops to or below this value | `0` |
| HP Data Path | Dotted path to the system's current HP value; leave empty to auto-detect | *(empty)* |

When **HP Data Path** is empty, Deathknell tries `system.attributes.hp.value`, `system.hp.value`, `system.health.value`, and `system.wounds.value` in order — covering most common systems. If no numeric HP can be resolved for an actor, it logs a one-time warning and ignores that actor.

## Installation

1. In Foundry, open **Configuration and Setup → Add-on Modules → Install Module**.
2. Paste the manifest URL: `https://github.com/bstraub/deathknell/releases/latest/download/module.json`
3. Enable the module in your world under **Manage Modules**.

Requires Foundry core **v14**.

## Development

Clone the repo and symlink it into your Foundry user data:

```sh
ln -s ~/Code/deathknell <userData>/Data/modules/deathknell
```

Restart Foundry (or reload the world with `F5`) after changing source files. No build step — plain ES modules.

## License

[MIT](LICENSE)
