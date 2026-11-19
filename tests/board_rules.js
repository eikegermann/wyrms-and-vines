// Checks the board rules on many generated boards. Run: node tests/board_rules.js
const W = require('../js/logic.js');
const R = W.RULES;
let bad = 0;
const stat = { vines: 0, wyrms: 0, end: 0, mean: 0, attempts: 0, maxAttempts: 0 };
const N = 1000;
const fail = (code, msg) => { if (bad++ < 10) console.log('FAIL', code, msg); };
for (let i = 0; i < N; i++) {
  const code = W.CODE_WORDS[i % 64] + '-' + (10 + (i * 7) % 90);
  const b = W.generateBoard(code);
  const end = b.wyrms.filter(w => w.from >= R.endZoneFrom);
  if (b.vines.some(v => v.to > R.vineMaxTop)) fail(code, 'vine too high');
  if (end.length < R.endZoneWyrms[0] || end.length > R.endZoneWyrms[1]) fail(code, 'end-zone wyrms: ' + end.length);
  if (!b.wyrms.some(w => w.from >= R.lateZone[0] && w.from <= R.lateZone[1])) fail(code, 'no wyrm on 95–99');
  const drops = end.map(w => w.from - w.to);
  if (!drops.some(d => d >= R.mildDrop[0] && d <= R.mildDrop[1])) fail(code, 'no mild end wyrm ' + drops);
  if (!drops.some(d => d >= R.mediumDrop[0] && d <= R.mediumDrop[1])) fail(code, 'no medium end wyrm ' + drops);
  for (const a of b.wyrms) for (const c of b.wyrms) if (a !== c &&
    Math.abs(a.from - c.from) < R.wyrmGap(a.from - a.to, c.from - c.to)) fail(code, `wyrms too close ${a.from}/${c.from}`);
  const G = b.vines.reduce((a, v) => a + v.to - v.from, 0), D = b.wyrms.reduce((a, w) => a + w.from - w.to, 0);
  if (G < R.gainPool[0] - R.poolSlack || G > R.gainPool[1] + R.poolSlack) fail(code, 'gain total ' + G);
  if (D / G < R.dropToGain[0] - 0.08 || D / G > R.dropToGain[1] + 0.08) fail(code, `drop/gain ${D}/${G}`);
  stat.gain = (stat.gain || 0) + G; stat.drop = (stat.drop || 0) + D;
  if (b.wyrms.filter(w => w.to <= 10).length > R.maxLowTails) fail(code, 'too many wyrms end in row 1');
  if (!b.vines.some(v => v.from <= 10 && v.to - v.from >= R.starterVine[0] && v.to - v.from <= R.starterVine[1])) fail(code, 'no starter vine');
  if (!b.vines.some(v => v.to >= R.landingZone[0] && v.to <= R.landingZone[1])) fail(code, 'no vine to 80–85');
  for (const big of b.wyrms.filter(w => w.from - w.to > R.bigDrop))
    if (b.wyrms.some(w => w.from > big.to && w.from - big.to <= R.safeAfterBigDrop)) fail(code, `wyrm head right after big drop to ${big.to}`);
  const links = [...b.vines, ...b.wyrms];
  for (let x = 0; x < links.length; x++) for (let y = x + 1; y < links.length; y++)
    if (W.linkDistance(links[x], links[y]) < R.linkSpacing) fail(code, 'links too close');
  const again = W.generateBoard(code);
  if (JSON.stringify(again.wyrms) !== JSON.stringify(b.wyrms)) fail(code, 'not deterministic');
  stat.vines += b.vines.length; stat.wyrms += b.wyrms.length; stat.end += end.length;
  stat.mean += b.stats.mean; stat.attempts += b.attempts; stat.maxAttempts = Math.max(stat.maxAttempts, b.attempts);
}
console.log(`gain ${(stat.gain / N).toFixed(0)}, drop ${(stat.drop / N).toFixed(0)}; boards ${N}, failures ${bad}; avg vines ${(stat.vines / N).toFixed(1)}, wyrms ${(stat.wyrms / N).toFixed(1)}, end-zone wyrms ${(stat.end / N).toFixed(1)}, turns ${(stat.mean / N).toFixed(1)}, attempts avg ${(stat.attempts / N).toFixed(1)} max ${stat.maxAttempts}`);
process.exit(bad ? 1 : 0);
