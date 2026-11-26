# 18. Oli's wyrm artwork

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

The wyrms were simple drawn placeholders, purple lines with yellow eyes. The plan was always for players to put their own art into the game, with a human designer later. Oli drew the wyrm he wanted on the iPad, on a template with the tail on the left and the head on the right. No drawing app he could use comfortably had layers, so he drew straight over the template.

## Decision

- **Separating the drawing:** Oli's lines were lifted off the template by colour. His blue and green ink is strongly coloured, while the template's guides and text are pale grey and lavender, so every pixel that isn't clearly coloured was made transparent. The lines were then thickened a little, using only the ink's own colours, so they survive being shrunk onto the board. The result is `img/wyrm-oli.png`.
- **On the board:** every wyrm is drawn with this picture, stretched in a straight line from its tail square to its head square. It's flipped when the wyrm points left, so it's never upside down. A ring marks the head square, iron for fortified wyrms, and fortified wyrms keep their iron plates along the back.
- **Switching back:** `WYRM_ART` in `js/game.js` can be set to `null` to return to the simple drawn wyrms.

## Consequences

- **The wyrms are Oli's,** and the same template works for any new drawing, even one drawn straight over the guide.
- **Straight lines:** the drawn wyrms had a gentle curve; the artwork is straight.
- **Very short wyrms** squash the drawing lengthwise.
- **The single-file version** inlines the picture: `tools/bundle.py` builds it.
