// Monte Carlo trials for Iron Wyrm hunters (issue #4) on top of the Living forest.
// Run: node tools/sim_hunters.js
//
// Model (assumptions, since hunters aren't designed yet):
// - Players: roll a d6 and move; puzzles are solved with probability P_SOLVE
//   (vine = climb, wyrm = dodge). Living forest events use the real game logic.
// - Hunters: start on random squares, and after all players have moved each round,
//   each rolls a d6 and moves forward. A hunter passing 99 wraps round to a random low square.
// - A hunter landing on a wyrm head fights it. It wins with probability HUNTER_WIN:
//   the wyrm is removed and leaves a tunnel (an automatic slide, no puzzle) of TUNNEL_DEPTH x its drop.
//   Otherwise the hunter is eaten (a new hunter arrives REPLACE_AFTER rounds later), and the wyrm
//   falls asleep with its counters reset.
// - Players landing on a tunnel always slide.
const W = require('../js/logic.js');

const GAMES = 3000;
const P_SOLVE = 0.75;
const REPLACE_AFTER = 3;
const MAX_ROUNDS = 400;

// Pre-generate boards once; each game plays on a fresh copy.
const BOARDS = Array.from({ length: 300 }, (_, i) => W.generateBoard('SIM-' + i));
function copyBoard(b) {
  const c = { code: b.code, nextId: b.nextId, sprouts: [], tunnels: [],
    vines: b.vines.map(v => ({ type: v.type, from: v.from, to: v.to, id: v.id })),
    wyrms: b.wyrms.map(w => ({ type: w.type, from: w.from, to: w.to, id: w.id })) };
  W.rebuildStarts(c);
  return c;
}
const d6 = () => 1 + Math.floor(Math.random() * 6);

function playGame(nPlayers, nHunters, { hunterWin = 0.5, tunnelDepth = 1, collapseAfter = Infinity } = {}) {
  const b = copyBoard(BOARDS[Math.floor(Math.random() * BOARDS.length)]);
  const players = Array.from({ length: nPlayers }, () => ({ pos: 1 }));
  let hunters = Array.from({ length: nHunters }, () => ({ pos: 2 + Math.floor(Math.random() * 97) }));
  const pending = [];                 // rounds until replacement hunters arrive
  const st = { rounds: 0, fights: 0, kills: 0, eaten: 0, tunnelSlides: 0, wyrmSlides: 0, flew: 0, woke: 0 };
  const tunnelAt = n => b.tunnels.find(t => t.from === n);
  const avoid = () => new Set(players.map(p => p.pos));

  for (let r = 1; r <= MAX_ROUNDS; r++) {
    st.rounds = r;
    for (const p of players) {
      p.pos = Math.min(100, p.pos + d6());
      if (p.pos >= 100) return { ...st, tunnels: st.tunnelsMade || 0, wyrmsLeft: b.wyrms.length };
      const t = tunnelAt(p.pos);
      if (t) {
        p.pos = t.to; st.tunnelSlides++;
        // a tunnel can cave in after a few slides
        if (++t.used >= collapseAfter) { b.tunnels.splice(b.tunnels.indexOf(t), 1); b.sprouts.splice(b.sprouts.indexOf(t), 1); }
        continue;
      }
      const link = b.starts.get(p.pos);
      if (!link) continue;
      const solved = Math.random() < P_SOLVE;
      if (link.type === 'vine' && solved) p.pos = link.to;
      if (link.type === 'wyrm' && !solved) { p.pos = link.to; st.wyrmSlides++; }
      const ev = W.forestEvent(b, link, solved, avoid());
      if (ev.kind === 'fly') st.flew++;
      if (ev.kind === 'wake') st.woke++;
    }
    // hunters move after the players
    for (let i = pending.length - 1; i >= 0; i--) if (--pending[i] <= 0) { pending.splice(i, 1); hunters.push({ pos: 2 + Math.floor(Math.random() * 20) }); }
    hunters = hunters.filter(h => {
      h.pos += d6();
      if (h.pos > 99) h.pos = 2 + Math.floor(Math.random() * 10);
      const w = b.starts.get(h.pos);
      if (!w || w.type !== 'wyrm') return true;
      st.fights++;
      if (Math.random() < hunterWin) {
        st.kills++;
        b.wyrms.splice(b.wyrms.indexOf(w), 1);
        const depth = Math.max(1, Math.round((w.from - w.to) * tunnelDepth));
        const tunnel = { type: 'wyrm', from: w.from, to: w.from - depth, id: b.nextId++, used: 0 };
        st.tunnelsMade = (st.tunnelsMade || 0) + 1;
        b.tunnels.push(tunnel);
        b.sprouts.push(tunnel);          // so the forest keeps new links off tunnel squares
        W.rebuildStarts(b);
        return true;
      }
      st.eaten++; w.hits = 0; w.slides = 0;
      pending.push(REPLACE_AFTER);
      return false;
    });
  }
  return { ...st, tunnels: st.tunnelsMade || 0, wyrmsLeft: b.wyrms.length, timeout: true };
}

function run(nPlayers, nHunters, opts) {
  const all = Array.from({ length: GAMES }, () => playGame(nPlayers, nHunters, opts));
  const avg = k => all.reduce((a, g) => a + g[k], 0) / all.length;
  const rounds = all.map(g => g.rounds).sort((a, b) => a - b);
  const slides = avg('tunnelSlides') + avg('wyrmSlides');
  return {
    rounds: avg('rounds'), p90: rounds[Math.floor(rounds.length * 0.9)],
    fights: avg('fights'), tunnels: avg('tunnels'),
    manyTunnels: all.filter(g => g.tunnels >= 3).length / all.length,
    tunnelShare: slides ? avg('tunnelSlides') / slides : 0,
    eaten: avg('eaten'), flew: avg('flew'), wyrmsLeft: avg('wyrmsLeft'),
  };
}

const pct = x => (x * 100).toFixed(0) + '%';
const f1 = x => x.toFixed(1);
function table(title, opts) {
  console.log(`\n## ${title}\n`);
  console.log('| Players | Hunters | Rounds (avg / 90%) | Fights | Tunnels | Games with 3+ tunnels | Slides via tunnel | Hunters eaten | Wyrms flown off | Wyrms left |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const n of [2, 3, 4]) {
    const setups = opts.setups ? opts.setups(n) : [['none', 0], ['1:1', n], ['1:1.5', Math.round(n * 1.5)], ['1:1, min 3', Math.max(3, n)]];
    const seen = new Set();
    for (const [label, h] of setups) {
      const key = h; if (seen.has(key) && label !== 'none') { console.log(`| ${n} | ${label} (= ${h}) | same as above | | | | | | | |`); continue; }
      seen.add(key);
      const r = run(n, h, opts);
      console.log(`| ${n} | ${label} (${h}) | ${f1(r.rounds)} / ${r.p90} | ${f1(r.fights)} | ${f1(r.tunnels)} | ${pct(r.manyTunnels)} | ${pct(r.tunnelShare)} | ${f1(r.eaten)} | ${f1(r.flew)} | ${f1(r.wyrmsLeft)} |`);
    }
  }
}

console.log(`${GAMES} games per row; puzzles solved ${pct(P_SOLVE)} of the time; living forest on.`);
table('Hunters win half their fights, tunnels as deep as the wyrm', { hunterWin: 0.5, tunnelDepth: 1 });
table('Hunters win a third of their fights, tunnels half as deep', { hunterWin: 1 / 3, tunnelDepth: 0.5 });
table('Gentler: hunters win a third, tunnels half as deep and cave in after 2 slides', {
  hunterWin: 1 / 3, tunnelDepth: 0.5, collapseAfter: 2,
  setups: n => [['1:1', n], ['fixed 2', 2], ['1:1, min 3', Math.max(3, n)]] });
