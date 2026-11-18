# Wyrms & Vines

A snakes-and-ladders-style race with maths puzzles. Climb the vines, dodge the wyrms, and be the first to reach square 100. It's built standalone first and will later become a tournament game at the Inn in [Dragon & Bard](https://github.com/eikegermann/dragon-and-bard).

## Play

Play at **https://eikegermann.github.io/wyrms-and-vines/** (once GitHub Pages is on), or open `index.html` in a browser. No install needed.

## Rules

- **Players:** 1–4. Each player can be a human or a computer player. Everyone picks a colour, a name and a puzzle level.
- **Moving:** everyone rolls one d6. You don't need an exact roll to finish: reaching or passing 100 wins.
- **Vines 🌿 (adding):** land on a vine's root and grow the vine from 0 to your target by rolling your level's dice and adding them on. Reach the target and you climb.
- **Wyrms 🐲 (taking away):** land on a wyrm's head and its grip starts at your target. Roll your level's dice and take them away until the grip reaches 0. Shake it off and you stay put. If you don't, you slide down.
- **Wrong answers:** each sum gets one retry. A second wrong answer on the same sum means the vine snaps or the wyrm wins.
- **Duels ⚔️:** land on another player's square and you may challenge them to read-write-make. The challenged player chooses whether the highest or lowest number wins. Each player rolls a d10 three times and places each digit in the hundreds, tens or ones before the next roll. The winner steps forward one square, and that square's vine or wyrm does not trigger. A tie means no winner.

## Levels

| Level | Dice | Target |
|---|---|---|
| 1 | 1d6 | 15 |
| 2 | 2d6 | 20 |
| 3 | 1d8 | 25 |
| 4 | 2d8 | 35 |
| 5 | 1d20 | 60 |
| Adult | 1d100 | 200 |

- **Unlocking:** levels 4 and 5 unlock once a name has finished a game at level 3, whether they won or not. The Adult level is always open, so grown-ups can skip the child levels. "Unlock all levels" on the setup screen opens everything.
- **What's saved:** only the highest level each name has played, in the browser on that device.

## Board codes

A board code like `FERN-42` is the seed for the board generator: the same code always makes the same board, and nothing is stored. Each new board follows a few rules:
- 7–9 vines and 7–9 wyrms.
- Nothing on square 1 or square 100.
- No square is both an end and a start.
- No two vines or wyrms cross.
- At most three vines or wyrms start in any row, and at most one wyrm is long.

The generator then plays 1,500 quick games in the background and keeps the board only if games last a sensible number of turns.

## Code layout

- `index.html`, `css/game.css`
- `js/logic.js`: pure game logic with no screen code: levels, seeded board generation and balance check, dice, read-write-make scoring, computer strategy, unlocks. It also runs in Node.
- `js/game.js`: setup screen, board drawing, turns, puzzles, duels.
- `tests/smoke.py`: plays full games in a headless browser, both all-computer games and a human answering every puzzle, and checks unlocks. To run it: `pip install playwright && playwright install chromium`, then `python tests/smoke.py`.

All rights reserved.
