// Living-forest check: hammer boards with random landings; every change must keep the board rules.
// Run: node tests/forest.js
const W = require('../js/logic.js');
const R = W.RULES;
let bad = 0; const kinds = {};
const fail = m => { if (bad++ < 10) console.log('FAIL', m); };
for (let i = 0; i < 300; i++) {
  const b = W.generateBoard('FOREST-' + i);
  for (let k = 0; k < 60; k++) {
    const links = [...b.vines, ...b.wyrms];
    if (!links.length) break;
    const link = links[Math.floor(Math.random() * links.length)];
    const avoid = new Set([1 + Math.floor(Math.random() * 99), 1 + Math.floor(Math.random() * 99)]);
    const players = [...avoid];
    const lowest = W.lowestReachable(b, players);
    const ev = W.forestEvent(b, link, Math.random() < 0.7, avoid, Math.random, players);
    if (ev.kind === 'sprout' && ev.link && ev.link.from < lowest) fail(`sprout on ${ev.link.from} below the lowest reachable square ${lowest}`);
    kinds[ev.kind] = (kinds[ev.kind] || 0) + 1;
    if (ev.link && ev.kind === 'wake' && (avoid.has(ev.link.from) || avoid.has(ev.link.to))) fail('moved onto a player');
    // every live link + sprout must still satisfy the rules against the others
    for (const l of [...b.vines, ...b.wyrms, ...b.sprouts]) {
      const ok = W.linkAllowed(b, { type: l.type, from: l.from, to: l.to }, new Set(), l);
      if (!ok) { fail(`board ${i} step ${k}: ${l.type} ${l.from}->${l.to} breaks a rule after ${ev.kind}`); break; }
    }
    if (b.starts.size !== b.vines.length + b.wyrms.length) fail('starts out of sync');
  }
}
// exact finish (Iron Wyrm): overshooting 100 bounces back
for (const [pos, roll, exact, want] of [[97, 3, true, 100], [97, 5, true, 98], [99, 6, true, 95], [97, 5, false, 100], [50, 6, true, 56]])
  if (W.moveTarget(pos, roll, exact) !== want) fail(`moveTarget(${pos}, ${roll}, ${exact}) should be ${want}`);
console.log('events', JSON.stringify(kinds), 'failures', bad);
process.exit(bad ? 1 : 0);
