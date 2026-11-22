# 2. Plain HTML, CSS and JavaScript, with the game logic kept free of the screen

- **Status:** Accepted
- **Date:** November 2026 (recorded 2026-11-22)

## Context

The game is played in Safari on an older iPad Pro and in desktop browsers, and is shared with other families via a link. It's built in short sessions and must be easy to open and run. Dragon & Bard made the same choice (its ADR 0002). Board generation in particular needs testing over thousands of boards, which is slow and fiddly through a browser.

## Decision

- **Plain web:** HTML, CSS and JavaScript, with no framework, no build step and no dependencies. GitHub Pages serves it from the public repo. A single-file bundle (everything inlined) can be made for offline testers.
- **Split by job:** `js/logic.js` holds the pure rules: levels, seeded board generation, dice, read-write-make scoring, the computer player's strategy, unlocks and the living forest. It doesn't touch the page and also runs in Node. `js/game.js` holds the screens and the turn flow, and `js/sound.js` the sounds.
- **Tests:** Node tests check the rules over 1,000 boards (`tests/board_rules.js`, `tests/forest.js`). A Playwright smoke test plays whole games in a headless browser (`tests/smoke.py`).

## Consequences

Rule changes can be checked quickly and thoroughly in Node. Dropping into the Inn later is easier, because the logic has no page code to untangle. Scripts rely on load order and globals (`WV`, `WVSound`, `WVGame`). The game was first aimed at desktop with keyboard number entry; tablet and quill input were deliberately left for later.
