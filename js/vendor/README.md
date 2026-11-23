# Copied from Dragon & Bard

`glyphs.js` (how each digit is formed, plus the handwriting recogniser) and `quill.js` (the writing card) are copied unchanged from [dragon-and-bard](https://github.com/eikegermann/dragon-and-bard) at commit `dc84847`. That way both games teach and read handwriting the same way (Dragon & Bard ADRs 0007 and 0008).

**Don't edit them here.** Make changes in Dragon & Bard, then copy the files across again and update the commit above. Wyrms & Vines connects to them through `js/quill-adapter.js` (where the quill level is saved) and `css/quill.css` (the card's look).
