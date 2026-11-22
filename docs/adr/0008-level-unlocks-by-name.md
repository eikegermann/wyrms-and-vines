# 8. Levels 4 and 5 unlock by name; Adult is always open

- **Status:** Accepted
- **Date:** November 2026 (recorded 2026-11-22)

## Context

We wanted locked levels as a gentle incentive, a tease that only needs trying, not winning. Player accounts and stats felt too heavy. Unlocking everything was also considered.

## Decision

The browser remembers only the highest level each name has finished a game at (localStorage, `wyrms-and-vines.played`). Finishing a game at level 3, won or not, opens levels 4 and 5 for that name. There's an "Unlock all levels" switch. **Adult is always open**, so a grown-up never has to play through the child levels. At first Adult was locked behind level 5; that was a misunderstanding and changed after the first playtest. Nobody is asked whether they're a child or an adult: anyone may pick any open level.

## Consequences

Hardly any data is stored, and it stays on the device. A name typed differently ("oli" and "Oli" count as the same) or a new device starts over. Computer players have every level.
