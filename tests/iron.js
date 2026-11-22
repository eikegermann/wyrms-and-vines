// Iron Wyrm check: play many rounds of ants, hunters and forest changes on Iron boards and make
// sure the board stays consistent. Run: node tests/iron.js
const W = require('../js/logic.js');
let bad = 0; const kinds = {};
const fail = m => { if (bad++ < 10) console.log('FAIL', m); };
for (let i = 0; i < 300; i++) {
  const b = W.generateBoard('IRONTEST-' + i, 'iron');
  b.wyrms.forEach(w => {}); 
  const nPlayers = 2 + (i % 4);
  const iron = W.newIronState(b, nPlayers);
  const players = Array.from({ length: nPlayers }, () => 1);
  for (let r = 0; r < 40; r++) {
    // players move and land
    for (let k = 0; k < players.length; k++) {
      players[k] = Math.min(99, players[k] + 1 + Math.floor(Math.random() * 6));
      const t = W.tunnelAt(b, players[k]);
      if (t) { players[k] = t.to; continue; }
      const link = b.starts.get(players[k]);
      if (link) {
        const solved = Math.random() < (link.fortified ? 0.75 : 0.95);
        if (link.type === 'vine' && solved) players[k] = link.to;
        if (link.type === 'wyrm' && !solved) players[k] = link.to;
        const avoid = new Set([...players, ...b.colonies.map(c => c.pos)]);
        const ev = W.forestEvent(b, link, solved, avoid);
        kinds['forest-' + ev.kind] = (kinds['forest-' + ev.kind] || 0) + 1;
      } else if (W.stompColony(b, players[k])) kinds.stomp = (kinds.stomp || 0) + 1;
    }
    for (const ev of W.ironRound(b, iron, new Set(players))) kinds[ev.kind] = (kinds[ev.kind] || 0) + 1;
    // consistency
    if (b.starts.size !== b.vines.length + b.wyrms.length) fail(`board ${i}: starts out of sync`);
    const starts = [...b.vines, ...b.wyrms, ...b.tunnels].map(l => l.from);
    if (new Set(starts).size !== starts.length) fail(`board ${i}: two things start on one square`);
    for (const c of b.colonies) if (starts.includes(c.pos)) fail(`board ${i}: colony on a start square`);
    for (const t of b.tunnels) if (b.starts.has(t.from)) fail(`board ${i}: tunnel and link share ${t.from}`);
    if (iron.hunters.length + iron.due.length !== W.IRON.hunters(nPlayers)) fail(`board ${i}: hunter count`);
    if (b.wyrms.some(w => w.to >= w.from) || b.vines.some(v => v.to <= v.from)) fail(`board ${i}: link direction`);
  }
}
console.log('events', JSON.stringify(kinds), 'failures', bad);
process.exit(bad ? 1 : 0);
