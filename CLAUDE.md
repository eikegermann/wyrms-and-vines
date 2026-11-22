# Wyrms & Vines: notes for working on this repo

- **What it is:** a snakes-and-ladders-style maths race for children and adults together. It's standalone for now and will later be a tournament game at the Inn in [Dragon & Bard](https://github.com/eikegermann/dragon-and-bard).
- **Architecture decision records** live in `docs/adr/`, with an index in its README. They hold the lasting decisions about how the game works, and why. Read the relevant ones before changing an area. Write a new ADR from `docs/adr/template.md` when a significant decision is made, and supersede old ones rather than rewriting them.
- **Planning:** ideas and plans live in GitHub Issues.
- **Code:** plain HTML, CSS and JavaScript with no build step. The rules are in `js/logic.js` (no page code; runs in Node), the screens and turn flow in `js/game.js`, and the sounds in `js/sound.js`. Board rules are in `RULES`, living forest settings in `FOREST`.
- **Before pushing,** run `node tests/board_rules.js`, `node tests/forest.js` and `python tests/smoke.py` (needs Playwright).
- **Language:** Australian English in player-facing text. Keep it friendly and readable for children.
