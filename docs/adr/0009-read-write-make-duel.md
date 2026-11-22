# 9. Same-square duels: one round of read-write-make

- **Status:** Accepted
- **Date:** November 2026 (recorded 2026-11-22)

## Context

When two players land on the same square, a quick duel adds interaction. Read-write-make, rolling digits and placing them as hundreds, tens or ones, fits the maths theme.

## Decision

- The player who arrives chooses whether to duel. With several players on the square, they pick whom to challenge.
- The challenged player decides whether the highest or the lowest number wins.
- Each player rolls their **own** d10 (0–9) three times and places each digit before the next roll.
- It's one round, to keep it fast.
- The winner steps forward one square, which never triggers a vine or wyrm. A tie means no winner, and the loser loses nothing.

A shared roll for both players was suggested first and rejected: with the same digits there's a cookie-cutter strategy and most duels would end in a stalemate. Some luck is fine because nobody is punished.

## Consequences

Duels are quick and harmless. The computer player puts big digits high (or low, when the lowest number wins). Duel steps can reach square 100 and win the game.
