# Copied from Dragon & Bard

`glyphs.js` (how each digit is formed, plus the handwriting recogniser) and `quill.js` (the writing card) are copied unchanged from [dragon-and-bard](https://github.com/eikegermann/dragon-and-bard) at commit `371eab8`. That way both games teach and read handwriting the same way (Dragon & Bard ADRs 0007 and 0008).

**Don't edit them here.** Make changes in Dragon & Bard, then copy the files across again and update the commit above. Wyrms & Vines connects to them through `js/quill-adapter.js` (where the quill level is saved) and `css/quill.css` (the card's look).

**Clean numbers only.** Dragon & Bard's quill has a "🖍️ Chaos crush" setting (its `S.quillChaos`) that lets players scribble over their numbers. Wyrms & Vines never turns it on, so the quill here always uses the normal tidiness check: numbers must be written cleanly (Dragon & Bard ADRs 0018 and 0019).
