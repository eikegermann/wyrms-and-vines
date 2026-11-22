# 10. Big centred windows for rolls and encounters, with adjustable speed

- **Status:** Accepted
- **Date:** November 2026 (recorded 2026-11-22)

## Context

Playtesting on the iPad showed several problems:
- Dice rolls in the side panel were easy to miss.
- Long puzzles and duels slipped under the game log and couldn't be scrolled into view.
- Everything moved "Sonic-style".
- "5!" read like a factorial.

## Decision

- **Roll to move:** a large card in the middle of the screen shows the tumbling dice, then "Oli rolled a 5!". It's shown briefly and can be tapped away.
- **Vines, wyrms and duels:** these play out in a large window in the middle, with bigger text. Each ends on a result card with a big picture: 🌿, 😢, 😄, 🐲, 🏅, 🤝 or 🕊️ (for a declined duel: "chose to keep the peace").
- **The overall winner** gets a 🏆 card with everyone's final squares and the board code.
- **Side panel:** it grows and scrolls with its content. The log sits behind a "Show log" button.
- **Speed:** a slider from "Very calm" to "Sonic" scales every pause. It's available on the setup screen and during a game, and it's remembered. The default is about 40% slower than the original pace.
- **Title card:** it explains the rules for people seeing the game for the first time.
- **Fullscreen:** a web app manifest and Apple meta tags make "Add to Home Screen" open the game fullscreen.

## Consequences

The action is easy to follow from across a table. Tests use a hidden speed factor to run fast. Tablet-friendly input (quill, bigger number pad) is still open.
