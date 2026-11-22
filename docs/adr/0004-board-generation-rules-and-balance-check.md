# 4. Boards are generated under rules, then checked by simulation

- **Status:** Accepted
- **Date:** November 2026 (recorded 2026-11-22)

## Context

Early boards were technically fine but looked like spaghetti, and some played much longer or meaner than others. Classic snakes and ladders boards are designed by hand. We wanted random boards that are readable and fair.

## Decision

Generation places links one at a time and only accepts each one if it follows the board rules. The rules live in one `RULES` block in `js/logic.js`:
- Nothing on squares 1 or 100.
- No square is both an end and a start.
- At most three starts per row.
- Each link goes up or down at least one row.
- **Readable layout:** no two vines or wyrms cross, and they keep at least 0.6 squares apart (`linkSpacing`). The no-crossing rule came first; the spacing was added when curves that passed close looked like crossings.
- At most one very long wyrm.

The order is the end-zone wyrms, then the must-have vines (ADR 0006), then the other wyrms, then the other vines.

Each finished board then plays 1,500 quick single-player games in the background, assuming 70% of puzzles are solved. It's kept only if the average game lasts 20–30 turns and 90% finish within 52. Otherwise the next attempt from the same seed is tried.

## Consequences

Boards look clean and play at a similar length. Generation takes about 15 ms and needs a few attempts on average (up to about 60). A safety net accepts a looser board rather than ever failing. New rules are added to `RULES` and `tests/board_rules.js` together.
