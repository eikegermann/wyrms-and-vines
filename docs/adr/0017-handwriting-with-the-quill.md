# 17. Handwriting with Dragon & Bard's quill

- **Status:** Accepted
- **Date:** 2026-11-23
- **Related:** Dragon & Bard ADRs 0007 (on-device handwriting recognition) and 0008 (one set of formation paths)

## Context

Wyrms & Vines started with typed answers only, deliberately leaving handwriting for later (ADR 0002). Dragon & Bard already has a well-tested quill: write with a finger or stylus, three levels (Trace, Remember, Free), numbered arrows and animations showing how each digit is formed, and a recogniser that runs on the device. Wyrms & Vines will move into Dragon & Bard's Inn later (ADR 0013), so both games should teach and read handwriting the same way.

## Decision

- **Copied unchanged:** `js/vendor/glyphs.js` and `js/vendor/quill.js` come from Dragon & Bard (commit `dc84847`, noted in `js/vendor/README.md`). Changes are made in Dragon & Bard and copied across, never edited here.
- **A small adapter:** `js/quill-adapter.js` gives the quill the save object it expects (`S.quillLevel`, `save()`), stored on this device.
- **Styles:** `css/quill.css` is the quill card's CSS from Dragon & Bard, with its colours and button styles set locally and the card placed above the encounter window.
- **Each human player chooses** on the setup screen: ⌨️ Typing or 🪶 Quill.
- **Vine and wyrm puzzles:**
  - With the quill, the answer is written instead of typed, with enough boxes for the largest possible answer.
  - In Trace and Remember the number is picked first, as in Dragon & Bard. A wrong pick counts as that try's answer, just like a wrong typed answer, so the usual one retry applies.
  - "🔢 Number pad" in the quill card falls back to the typing box, where the stop button is.
- **Duels stay unwritten:** read-write-make duels keep tapping digits into place, as decided at the start.

## Consequences

- **Write once, use in both games:** the two games share one way of forming and reading digits, and improvements to the quill reach Wyrms & Vines by copying two files.
- **Local globals:** the copied quill declares `Quill` and `Glyphs` with `const`, so the game checks for them with `typeof` rather than `window.Quill`.
- **Tested in the browser:** `tests/quill_play.py` plays puzzles by drawing digits on the quill's canvas in Trace and Free modes.
- **Recognition limits** are the same as in Dragon & Bard: tuned on synthetic digits, and it asks when unsure.
