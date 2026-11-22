# Architecture decision records

Short records of significant decisions about how Wyrms & Vines is built, and why (see [ADR 0001](0001-record-architecture-decisions.md)). The format matches Dragon & Bard's ADRs.

**When to write one:** when a decision about how the game works will matter later. That includes a board rule, a game mechanic, a technical approach, or a choice between real alternatives. Ideas and plans stay in GitHub Issues; an ADR records the outcome and links back.

**How:** copy [template.md](template.md) to the next number (`0014-short-title.md`), fill it in, and add it to the table below. Never rewrite an accepted ADR's decision: write a new one that supersedes it, and set the old one's status to "Superseded by NNNN".

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-plain-web-game-pure-logic.md) | Plain HTML, CSS and JavaScript, with the game logic kept free of the screen | Accepted |
| [0003](0003-board-code-is-the-seed.md) | The board code is the seed: nothing is saved | Accepted |
| [0004](0004-board-generation-rules-and-balance-check.md) | Boards are generated under rules, then checked by simulation | Accepted |
| [0005](0005-gain-and-drop-pools.md) | Vines and wyrms are drawn from near-equal gain and drop pools | Accepted |
| [0006](0006-end-of-board-and-anti-frustration-rules.md) | End-of-board tension and anti-frustration rules | Accepted |
| [0007](0007-puzzles-heat-and-cold-to-a-target.md) | Vine and wyrm puzzles: add up or take away to a level's target | Accepted |
| [0008](0008-level-unlocks-by-name.md) | Levels 4 and 5 unlock by name; Adult is always open | Accepted |
| [0009](0009-read-write-make-duel.md) | Same-square duels: one round of read-write-make | Accepted |
| [0010](0010-encounter-window-and-pacing.md) | Big centred windows for rolls and encounters, with adjustable speed | Accepted |
| [0011](0011-sound-effects-as-optional-files.md) | Sound effects are optional files with fixed names | Accepted |
| [0012](0012-living-forest.md) | Living forest: wyrms wake and move or fly away, vines wear out and resprout | Accepted |
| [0013](0013-standalone-first-issues-for-planning.md) | Standalone first, the Inn later; GitHub Issues for planning | Accepted |
