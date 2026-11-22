# 3. The board code is the seed: nothing is saved

- **Status:** Accepted
- **Date:** November 2026 (recorded 2026-11-22)

## Context

Players wanted different boards each game, a way to replay a good one, and an easy way to share one. Saving boards would mean storage or a server.

## Decision

Every board comes from a code like `FERN-42`: a word from a small fantasy and nature list plus a number from 10 to 99. The code is normalised (upper case, spaces become dashes), hashed, and used to seed a deterministic random number generator (mulberry32). The same code always builds the same board on any device, and any text works as a code. The code is shown during and after the game, with "Same board again" and "New board" buttons.

## Consequences

No storage is needed, and codes can be texted to friends. Changing the board rules changes what an existing code builds, which has already happened several times. That's accepted while the rules are still being playtested. If codes ever need to stay stable, the code could include a rules version. Living forest changes during a game use unseeded randomness (ADR 0012), so a replay starts the same but doesn't develop the same way.
