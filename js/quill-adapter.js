// Dragon & Bard's quill (js/vendor/quill.js) keeps its level (Trace / Remember / Free) in that
// game's save object S and calls save(). Wyrms & Vines gives it a small S of its own, stored on
// this device only.
var S = { quillLevel: (function () { try { return +localStorage.getItem('wyrms-and-vines.quillLevel') || 1; } catch (e) { return 1; } })() };
function save() { try { localStorage.setItem('wyrms-and-vines.quillLevel', S.quillLevel); } catch (e) { /* storage unavailable */ } }
