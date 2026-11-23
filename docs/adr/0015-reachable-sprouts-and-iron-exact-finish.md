# 15. Sprouts stay reachable; Iron Wyrm needs an exact finish

- **Status:** Accepted
- **Date:** 2026-11-23
- **Related:** ADR 0012 (Living forest), ADR 0014 (Iron Wyrm mode)

## Context

Playtesting turned up two things:
1. In the Living forest, a new vine could sprout so low on the board that nobody could ever reach it: every player was already above it, and no wyrm could drop anyone that far down.
2. Iron Wyrm mode is meant to be the harder mode, and its endgame felt too easy: any roll that passed 100 won.

## Decision

1. **Sprouts stay reachable.** A new sprout's root is never below the lowest square anyone can still reach. That's the lowest of:
   - the lowest player
   - the lowest wyrm tail
   - the lowest tunnel exit
   
   At the start of a game, players are below every tail, so the whole board is still open (`lowestReachable` in `js/logic.js`).
2. **Exact finish in Iron Wyrm mode.** Players must land on 100 exactly. Any steps beyond 100 bounce them back, so a roll of 5 from 97 ends on 98. The bounce square counts as a normal landing: vines, wyrms, tunnels and colonies there all apply. The setting is `IRON.exactFinish`. Classic and Living forest games still win on any roll that reaches 100.

## Consequences

- **Wasted vines:** sprouts can no longer appear where they'd never be used. Late in a game they cluster higher up the board.
- **Longer Iron Wyrm games:** Monte Carlo trials (`tools/sim_iron.js`) show games about 3–4 rounds longer (2 players: 19.7 → 23.7 rounds; 6 players: 16.1 → 18.8). Wyrm landings are up by about 30%, and a fortified slide happens in more games (for example 3 players: 19% → 24%). Much of the extra drama happens in the end zone, where the 95–99 wyrm catches bouncing players.
- **Bigger effect than the ants:** the exact finish changes Iron Wyrm games more than the ants and hunters did. That's welcome for a harder mode, but worth watching in playtests with younger children.
