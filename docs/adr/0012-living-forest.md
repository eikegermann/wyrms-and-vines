# 12. Living forest: wyrms wake and move or fly away, vines wear out and resprout

- **Status:** Accepted
- **Date:** November 2026 (recorded 2026-11-22)
- **Issue:** #1

## Context

Playing classic snakes and ladders gave us the idea that the board itself could change during a game. It keeps games fresh and gives players something to watch beyond their own token.

## Decision

Living forest is an optional mode, switched on the setup screen and on by default. Every landing counts, including the computer players'.
- **Wyrms:** each landing disturbs a wyrm, shown as 💤 then 😠. After three landings it wakes and moves to a new spot, with a new size; an end-zone wyrm stays in the end zone. After sliding two players down it flies away forever. If no allowed spot exists, it goes back to sleep.
- **Vines:** each use wears a vine out, and its leaves yellow, then turn brown. The first use plants a sprout elsewhere, showing only its root. The second use makes it grow. On the third the old vine withers and the sprout becomes the new vine, revealing where it goes and how long it is.
- **Rules:** every new position follows all the board rules in `linkAllowed`, sprouts included, and never lands on a square with a player.
- **Settings:** the numbers are in `FOREST` in `js/logic.js` (3 landings to wake, 2 slides to fly, 3 uses to wither). `tests/forest.js` runs 18,000 random landings to check that the rules hold.

## Consequences

The board slowly gets gentler as wyrms fly off, which helps whoever is behind. Harder variants with ants, eggs, wyrm clans and hunters are collected as Iron Wyrm mode ideas in issues #1–#4. Forest changes aren't seeded, so replays of a code diverge (ADR 0003).
