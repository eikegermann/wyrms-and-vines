# Wyrms & Vines

A snakes-and-ladders-style race with maths puzzles. Climb the vines, dodge the wyrms, and be the first to reach square 100. It's built standalone first and will later become a tournament game at the Inn in [Dragon & Bard](https://github.com/eikegermann/dragon-and-bard).

## Play

Play at **https://eikegermann.github.io/wyrms-and-vines/**, or open `index.html` in a browser. No install needed.

On an iPad, open the link in Safari, tap Share, then **Add to Home Screen**. Started from that icon, the game runs fullscreen without Safari's bars.

The game speed can be set on the setup screen and changed during a game; the choice is remembered.

## Rules

- **Players:** 1–4. Each player can be a human or a computer player. Everyone picks a colour, a name and a puzzle level.
- **Moving:** everyone rolls one d6. You don't need an exact roll to finish: reaching or passing 100 wins.
- **Vines 🌿 (adding):** land on a vine's root and grow the vine from 0 to your target by rolling your level's dice and adding them on. Reach the target and you climb.
- **Wyrms 🐲 (taking away):** land on a wyrm's head and its grip starts at your target. Roll your level's dice and take them away until the grip reaches 0. Shake it off and you stay put. If you don't, you slide down.
- **Wrong answers:** each sum gets one retry. A second wrong answer on the same sum means the vine snaps or the wyrm wins.
- **Duels ⚔️:** land on another player's square and you may challenge them to read-write-make. The challenged player chooses whether the highest or lowest number wins. Each player rolls a d10 three times and places each digit in the hundreds, tens or ones before the next roll. The winner steps forward one square, and that square's vine or wyrm does not trigger. A tie means no winner.

## Living forest (on by default, switch on the setup screen)

- **Wyrms:** every landing disturbs a wyrm: 💤 after one, 😠 after two. After three landings it wakes up and moves to a new spot, possibly with a new size. An end-zone wyrm stays in the end zone. A wyrm that has slid two players down flies away forever.
- **Vines:** every landing wears a vine out, and its leaves turn yellow. The first use plants a 🌱 sprout somewhere else, showing only its root. The sprout grows on the second use. On the third use the old vine withers and the sprout shoots up, revealing where it goes.
- Computer players' landings count too.
- Every move and new vine follows the board rules and never lands on a player.
- The numbers live in `FOREST` in `js/logic.js`, and `node tests/forest.js` checks the rules hold through thousands of random changes.

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

A board code like `FERN-42` is the seed for the board generator: the same code always makes the same board, and nothing is stored. Each new board follows these rules:
- **Gain and drop pools:** the vines climb about 130–160 squares in total, and the wyrms drop about the same (0.95–1.1 times as much). Vines and wyrms are drawn until each pool is used up, so their number varies (usually 6–9 of each).
- Nothing on square 1 or 100.
- No square is both an end and a start.
- No two vines or wyrms cross, and they keep a little space between them (`linkSpacing`).
- At most three vines or wyrms start in any row.
- No vine reaches the top row: vines end on 90 or lower.
- The last two rows (81–99) always have 2–4 wyrm heads, at least one on 95–99. One of them is mild (a 10–16 square drop) and one is a proper ouch (22–35).
- There's always a small-to-medium vine (11–24 squares) starting in the first row, and at least one vine ending on 80–85.
- At most one wyrm ends in the first row (squares 1–10).
- After a drop of more than 20 squares, there's no wyrm head within one die roll (6 squares) of where you land.
- Wyrm heads keep their distance, and meaner pairs sit further apart: the minimum gap is 2 + (combined drop − 5) ÷ 5, rounded down. For example, two 10-square wyrms need 5 squares between their heads, and a 12 and a 30 need 9.

The generator then plays 1,500 quick games in the background and keeps the board only if games last a sensible number of turns. The rules live in `RULES` at the top of `js/logic.js`, and `node tests/board_rules.js` checks them on 1,000 boards.

## Sounds

Sound effects are files in `sounds/`. See [sounds/README.md](sounds/README.md) for the list of names. Missing sounds are skipped, and there's a mute button.

## Decisions

The reasons behind the rules and the design are recorded as architecture decision records in [docs/adr](docs/adr/README.md).

## Code layout

- `index.html`, `css/game.css`
- `js/logic.js`: pure game logic with no screen code: levels, seeded board generation and balance check, dice, read-write-make scoring, computer strategy, unlocks. It also runs in Node.
- `js/sound.js`: plays sound effects from `sounds/` (missing files are skipped).
- `js/game.js`: title card, setup screen, board drawing, turns, puzzles, duels.
- `tests/board_rules.js`, `tests/forest.js`: board-rule checks in Node.
- `tests/smoke.py`: plays full games in a headless browser, both all-computer games and a human answering every puzzle, and checks unlocks. To run it: `pip install playwright && playwright install chromium`, then `python tests/smoke.py`.

All rights reserved.
