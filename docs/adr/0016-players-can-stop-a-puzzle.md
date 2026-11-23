# 16. Players can stop a puzzle at any time

- **Status:** Accepted
- **Date:** 2026-11-23
- **Related:** ADR 0007 (vine and wyrm puzzles)

## Context

Vine and wyrm puzzles run until the target is reached or a sum is failed twice. In playtests, a player sometimes wanted out: the puzzle was too long, the level too hard that day, or they simply preferred to take the slide and get on with the game. Before this change, the only way out was to answer wrongly on purpose, which feels like cheating, and children may not see it as an option at all.

## Decision

Every vine and wyrm puzzle has a stop button for human players, both next to the roll button and next to the answer box:
- **On a vine: "🏳️ Let the vine go."** The player stays on the vine's root.
- **On a wyrm: "🏳️ Stop and slide down."** The player slides to the wyrm's tail.

Stopping counts like failing the puzzle: in the Living forest it's a landing on the vine or wyrm, and on a wyrm it's a slide. Computer players never stop.

## Consequences

- **No pressure:** nobody is stuck in a puzzle they don't want to finish, and nobody has to fake a wrong answer.
- **Stopping is visible:** it's logged and gets its own small card, so the table sees it as a choice, not a mistake.
- **Settle a house rule if needed:** a player could avoid hard puzzles entirely by always stopping on wyrms. That costs them the slide, so it shouldn't pay off. Watch it in playtests.
