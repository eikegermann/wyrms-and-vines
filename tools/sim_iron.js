// Monte Carlo trials for Iron Wyrm mode: Living forest + hunters (#4) + vine-cutter ants and eggs (#2).
// Run: node tools/sim_iron.js
//
// Model (assumptions; the mode isn't designed in full yet):
// - Players: d6 to move, solve PUZZLE of puzzles. Living forest uses the real game logic.
// - Hunters: one per player, at least 2, at most 3. They move a d6 after the players each round.
//   On a wyrm they win half their fights: the wyrm becomes a permanent, full-length tunnel.
//   Otherwise they're eaten (replaced 3 rounds later) and the wyrm's counters reset.
// - Ant colonies: each round a new colony appears with chance 5% + 5% per colony (max 50%),
//   on a free square from 2 to 90 (never the top row). Without a vine root within 4 squares it dies.
//   A colony eats one nearby vine in 3 rounds. After its first vine, a wyrm egg is laid in the nest;
//   4 rounds later it hatches into a wyrm whose TAIL is on the nest (head 10–20 squares above),
//   so the wyrm takes the vine's place. Each further vine eaten spawns a new colony nearby.
//   A colony with nothing left to eat leaves once its egg has hatched.
// - Players landing on a colony destroy it, or discourage it (no eating for 4 rounds).
//   Hunters landing on a colony do nothing, discourage it for 2 rounds, or destroy it.
const W = require('../js/logic.js');

const GAMES = 2000;
const PUZZLE = 0.75;
const MAX_ROUNDS = 150;
const ANT = { base: 0.05, perColony: 0.05, max: 0.5, range: 4, eatRounds: 3, hatchRounds: 4,
  eggDrop: [10, 20], playerPause: 4, hunterPause: 2, nearby: 6 };

const BOARDS = Array.from({ length: 300 }, (_, i) => W.generateBoard('IRON-' + i));
function copyBoard(b) {
  const c = { nextId: b.nextId, sprouts: [], tunnels: [],
    vines: b.vines.map(v => ({ type: v.type, from: v.from, to: v.to, id: v.id })),
    wyrms: b.wyrms.map(w => ({ type: w.type, from: w.from, to: w.to, id: w.id })) };
  W.rebuildStarts(c);
  return c;
}
const d6 = () => 1 + Math.floor(Math.random() * 6);
const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];

function playGame(nPlayers, { hunters: useHunters = true, ants = true, playerAction = 'destroy', hunterAction = 'none', base = ANT.base, perColony = ANT.perColony } = {}) {
  const b = copyBoard(pick(BOARDS));
  const players = Array.from({ length: nPlayers }, () => ({ pos: 1 }));
  let hunters = useHunters ? Array.from({ length: Math.min(3, Math.max(2, nPlayers)) }, () => ({ pos: ri(2, 98) })) : [];
  const huntersDue = [];
  let colonies = [];                 // {pos, target, eaten, progress, pause, egg: rounds left | null, laid}
  const st = { colonies: 0, starved: 0, vinesEaten: 0, eggs: 0, hatched: 0, eggFailed: 0, tunnels: 0, destroyed: 0 };

  const occupied = () => {
    const s = new Set(players.map(p => p.pos));
    colonies.forEach(c => s.add(c.pos));
    return s;
  };
  const squareFree = n => n >= 2 && n <= 90 && !b.starts.has(n) && ![...b.vines, ...b.wyrms, ...b.sprouts].some(l => l.to === n || l.from === n)
    && !colonies.some(c => c.pos === n);
  const food = pos => b.vines.filter(v => Math.abs(v.from - pos) <= ANT.range);
  const removeVine = v => {
    b.vines.splice(b.vines.indexOf(v), 1);
    // a sprout waiting on this vine shoots up straight away
    if (v.sprout && b.sprouts.includes(v.sprout)) { b.sprouts.splice(b.sprouts.indexOf(v.sprout), 1); delete v.sprout.stage; b.vines.push(v.sprout); }
    W.rebuildStarts(b);
  };
  function spawnColony(near) {
    for (let t = 0; t < 30; t++) {
      const pos = near ? near + ri(-ANT.nearby, ANT.nearby) : ri(2, 90);
      if (!squareFree(pos)) continue;
      st.colonies++;
      if (!food(pos).length) { st.starved++; return; }
      colonies.push({ pos, target: null, progress: 0, pause: 0, egg: null, laid: false });
      return;
    }
  }
  function hatch(c) {
    for (let t = 0; t < 20; t++) {
      const drop = ri(...ANT.eggDrop);
      const w = { type: 'wyrm', from: c.pos + drop, to: c.pos };
      // A hatchling takes a vine's place, so it follows looser rules: free squares, head above
      // the tail in a higher row, not on a player, and no crossing other links.
      const others = [...b.vines, ...b.wyrms, ...b.sprouts];
      const ok = w.from <= 99 && W.rowOf(w.from) > W.rowOf(w.to) && !players.some(p => p.pos === w.from)
        && !others.some(o => o.from === w.from || o.to === w.from) && !colonies.some(x => x !== c && x.pos === w.from)
        && !others.some(o => W.crosses(o, w));
      if (ok) {
        w.id = b.nextId++; b.wyrms.push(w); W.rebuildStarts(b); st.hatched++; return;
      }
    }
    st.eggFailed++;
  }
  const hitColony = (c, action, pause) => {
    if (action === 'destroy') { colonies = colonies.filter(x => x !== c); st.destroyed++; }
    else if (action === 'discourage') c.pause = Math.max(c.pause, pause);
  };

  for (let r = 1; r <= MAX_ROUNDS; r++) {
    for (const p of players) {
      p.pos = Math.min(100, p.pos + d6());
      if (p.pos >= 100) return { ...st, rounds: r, vinesLeft: b.vines.length, wyrmsLeft: b.wyrms.length };
      const t = b.tunnels.find(x => x.from === p.pos);
      if (t) { p.pos = t.to; continue; }
      const link = b.starts.get(p.pos);
      if (link) {
        const solved = Math.random() < PUZZLE;
        if (link.type === 'vine' && solved) p.pos = link.to;
        if (link.type === 'wyrm' && !solved) p.pos = link.to;
        const target = colonies.find(c => c.target === link);
        W.forestEvent(b, link, solved, occupied());
        if (target && !b.vines.includes(link)) target.target = null;   // the vine withered under the ants
        continue;
      }
      const c = colonies.find(x => x.pos === p.pos);
      if (c) hitColony(c, playerAction, ANT.playerPause);
    }

    if (ants) {
      // colonies eat, eggs hatch, new colonies appear
      for (const c of [...colonies]) {
        if (c.egg !== null && --c.egg <= 0) { c.egg = null; hatch(c); }
        if (c.pause > 0) { c.pause--; continue; }
        if (!c.target || !b.vines.includes(c.target)) {
          c.target = food(c.pos).length ? pick(food(c.pos)) : null;
          c.progress = 0;
        }
        if (!c.target) { if (c.egg === null) colonies = colonies.filter(x => x !== c); continue; }
        if (++c.progress >= ANT.eatRounds) {
          removeVine(c.target); st.vinesEaten++; c.target = null; c.progress = 0;
          if (!c.laid) { c.laid = true; c.egg = ANT.hatchRounds; st.eggs++; }
          else spawnColony(c.pos);
        }
      }
      if (Math.random() < Math.min(ANT.max, base + perColony * colonies.length)) spawnColony(null);
    }

    // hunters
    for (let i = huntersDue.length - 1; i >= 0; i--) if (--huntersDue[i] <= 0) { huntersDue.splice(i, 1); hunters.push({ pos: ri(2, 20) }); }
    hunters = hunters.filter(h => {
      h.pos += d6();
      if (h.pos > 99) h.pos = ri(2, 11);
      const c = colonies.find(x => x.pos === h.pos);
      if (c) { hitColony(c, hunterAction, ANT.hunterPause); return true; }
      const w = b.starts.get(h.pos);
      if (!w || w.type !== 'wyrm') return true;
      if (Math.random() < 0.5) {
        b.wyrms.splice(b.wyrms.indexOf(w), 1);
        const tunnel = { type: 'wyrm', from: w.from, to: w.to, id: b.nextId++ };
        b.tunnels.push(tunnel); b.sprouts.push(tunnel); st.tunnels++;
        W.rebuildStarts(b);
        return true;
      }
      w.hits = 0; w.slides = 0; huntersDue.push(3);
      return false;
    });
  }
  return { ...st, rounds: MAX_ROUNDS, timeout: true, vinesLeft: b.vines.length, wyrmsLeft: b.wyrms.length };
}

function run(n, opts) {
  const all = Array.from({ length: GAMES }, () => playGame(n, opts));
  const avg = k => all.reduce((a, g) => a + (g[k] || 0), 0) / all.length;
  const rounds = all.map(g => g.rounds).sort((a, b) => a - b);
  return { avg, rounds: avg('rounds'), p90: rounds[Math.floor(rounds.length * 0.9)],
    long: all.filter(g => g.rounds > 40).length / all.length, timeout: all.filter(g => g.timeout).length / all.length };
}
const pct = x => (x * 100).toFixed(0) + '%';
const f1 = x => x.toFixed(1);

const setups = [
  ['Living forest only', { hunters: false, ants: false }],
  ['+ hunters', { hunters: true, ants: false }],
  ['+ hunters + ants · players destroy · hunters ignore', { playerAction: 'destroy', hunterAction: 'none' }],
  ['… players destroy · hunters discourage 2', { playerAction: 'destroy', hunterAction: 'discourage' }],
  ['… players destroy · hunters destroy', { playerAction: 'destroy', hunterAction: 'destroy' }],
  ['… players discourage 4 · hunters ignore', { playerAction: 'discourage', hunterAction: 'none' }],
  ['… players discourage 4 · hunters discourage 2', { playerAction: 'discourage', hunterAction: 'discourage' }],
  ['… players discourage 4 · hunters destroy', { playerAction: 'discourage', hunterAction: 'destroy' }],
];
console.log(`${GAMES} games per row; puzzles solved ${pct(PUZZLE)}; games stopped at ${MAX_ROUNDS} rounds.`);
const header = '| Setup | Rounds (avg / 90%) | Over 40 rounds | Colonies (starved) | Vines eaten | Wyrms hatched | Tunnels | Vines left | Wyrms left |\n|---|---|---|---|---|---|---|---|---|';
const row = (label, r) => `| ${label} | ${f1(r.rounds)} / ${r.p90} | ${pct(r.long)}${r.timeout ? ` (${pct(r.timeout)} stuck)` : ''} | ${f1(r.avg('colonies'))} (${f1(r.avg('starved'))}) | ${f1(r.avg('vinesEaten'))} | ${f1(r.avg('hatched'))} | ${f1(r.avg('tunnels'))} | ${f1(r.avg('vinesLeft'))} | ${f1(r.avg('wyrmsLeft'))} |`;
for (const n of [2, 3, 4]) {
  console.log(`\n### ${n} players (${Math.min(3, Math.max(2, n))} hunters), colonies at 5% + 5% per colony\n`);
  console.log(header);
  for (const [label, opts] of setups) console.log(row(label, run(n, opts)));
}
// How strong do the ants need to be to matter? 3 players, gentlest and harshest response.
console.log('\n### Stronger ants, 3 players (3 hunters)\n');
console.log(header);
for (const [b0, pc] of [[0.05, 0.05], [0.10, 0.10], [0.20, 0.10], [0.30, 0.15]]) {
  for (const [label, act] of [['players & hunters destroy', { playerAction: 'destroy', hunterAction: 'destroy' }],
                              ['players discourage 4, hunters ignore', { playerAction: 'discourage', hunterAction: 'none' }]]) {
    console.log(row(`${pct(b0)} + ${pct(pc)}/colony · ${label}`, run(3, { ...act, base: b0, perColony: pc })));
  }
}
