# 14. Iron Wyrm mode

- **Status:** Accepted
- **Date:** 2026-11-23
- **Issues:** #1 (overview), #2 (ants and eggs), #4 (hunters)

## Context

The Living forest (ADR 0012) makes the board change, but gently. For players who want more pressure, we wanted a harder mode in which the forest slowly turns against them: vines disappear, wyrms take over, and a few things only luck and quick action can stop. It had to stay a maths game, and it shouldn't drag games out for children. The rules were shaped by discussion and by Monte Carlo trials of thousands of games each (`tools/sim_hunters.js`, `tools/sim_iron.js`, results on the issues).

## Decision

Iron Wyrm mode is a switch on the setup screen. It includes the Living forest. The numbers are in `IRON` in `js/logic.js`, and the rules run once at the end of every round (`ironRound`).

**Iron boards** (`generateBoard(code, 'iron')`)
- The wyrms drop 50 squares more in total than the vines lift. That gives about 10 wyrms instead of 7.
- To make room, the spacing between wyrm heads is halved to 1 + floor((dropA + dropB − 5) / 10), at least 2, and links may sit 0.4 squares apart instead of 0.6.
- Links still never cross: for children, readability comes first (ADR 0004). All other board rules apply unchanged.

**Vine-cutter ants (egg first)**
- **New colonies:** each round a new colony may appear on a free square from 2 to 90, never the top row. The chance is 20%, plus 10% per colony already on the board, plus 5% for every player above 3, up to 50%. A colony only settles within 4 squares of a vine root.
- **The vine turns into a wyrm:** the colony finds a vine. A round later a wyrm lays an egg on it, the reason the ants are eating it. Two rounds after that the vine is gone and a fortified wyrm hatches along its path: head at the vine's top, tail at its root. A sprout waiting on the eaten vine shoots up straight away.
- A colony then moves on to another vine within reach, or leaves.
- **Fighting back:** a player who lands on a colony stomps it out, egg included.

**Hunters**
- **How many:** one per player, at least 2 and at most 3. They move a d6 at the end of each round, and wrap back to the start after 99.
- **On a wyrm, the hunter wins half the time:** the wyrm is gone and leaves a permanent, full-length tunnel, which always slides anyone who lands on it.
- **Otherwise the hunter is eaten:** the wyrm falls asleep (its Living forest counters reset) and becomes fortified. A new hunter arrives 3 rounds later.
- **On a colony,** a hunter destroys it.
- Tunnels don't cave in: the trials showed this would rarely happen, so it would add confusion without changing much.

**Fortified wyrms**
- These are wyrms hatched from a vine, and wyrms that ate a hunter. They wear iron plates on the board and keep them when they wake and move.
- Their puzzle is one level harder than the player's own level.
- Above Adult comes **the iron grip:** the grip starts at 600, and each roll is a d20, squared and taken away (for example 600 − 17² = ?). Square roots were considered and set aside, because roots of random numbers would need a rounding rule.
- The alternative of making the whole game one level harder was rejected as forced. Only wyrms that have earned it are tougher.

**Showing it**
- On the board: ant colonies 🐜, eggs 🥚 on vines, hunters 🏹, tunnels as dark holes, and fortified wyrms with silver plates and an iron ring round the head.
- Each event gets a short card in the middle of the screen that carries on by itself or can be tapped away. Falling down a tunnel and stomping a colony get their own cards.

## Consequences

- **Game length:** the trials show at most about 1 round longer at 2, 3, 4 and 6 players and at 75–95% of puzzles solved. The takeover is something to watch more than something that drags.
- **Setbacks:** the main ones come from tunnels, because players dodge most wyrms.
- **Watching others:** a fortified slide happens in roughly 10–30% of games, more with more players.
- **The board changes a lot,** so Iron boards and the world's random changes are not repeatable from the board code (ADR 0003).
- **Hatchlings follow looser rules** than the board generator: they take the vine's path exactly.
- **Nightmare mode ideas** are collected in #5.
- **Hire-a-hunter and wyrm clans** (#3, #4) are not built yet.
