# 11. Sound effects are optional files with fixed names

- **Status:** Accepted
- **Date:** November 2026 (recorded 2026-11-22)

## Context

Oli asked for real sounds, like dice in a cup. The sounds will be recorded with friends on a later day, a few at a time, possibly in several takes. On the iPad, sound only plays reliably through Web Audio after a first tap.

## Decision

`js/sound.js` plays files from `sounds/` with fixed names listed in `sounds/README.md`, such as `dice-shake`, `vine-snap` and `wyrm-fly` (22 names so far). Each sound can have up to three takes (`name.mp3`, `name-2.mp3`, `name-3.mp3`), and one is picked at random. Missing files are skipped silently. Over http(s) the files are fetched and decoded with Web Audio, unlocked by the first tap or key press. When the game is opened as a file, it falls back to plain audio elements and the first take only. There's a mute button, and the choice is remembered. Recordings are tidied by script (split at silence, trimmed, levelled, converted); choosing takes by ear stays with the humans.

## Consequences

Sounds can be added gradually with no code change, so the game never waits for them. Missing files cause a few failed requests, which is harmless. The single-file bundle has no sounds.
