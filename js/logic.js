// ---------- Wyrms & Vines: pure game logic (no DOM) ----------
// Works in the browser (window.WV) and in node (module.exports) for tests.
(function (root) {
'use strict';

const SIZE = 100;

// Puzzle levels: dice rolled for vine/wyrm puzzles, and the target to reach.
const LEVELS = [
  { id: 1, name: 'Level 1', dice: [6],     target: 15 },
  { id: 2, name: 'Level 2', dice: [6, 6],  target: 20 },
  { id: 3, name: 'Level 3', dice: [8],     target: 25 },
  { id: 4, name: 'Level 4', dice: [8, 8],  target: 35 },
  { id: 5, name: 'Level 5', dice: [20],    target: 60 },
  { id: 6, name: 'Adult',   dice: [100],   target: 200 },
];
const levelById = id => LEVELS.find(l => l.id === +id) || LEVELS[0];
const diceLabel = dice => dice.length === 2 ? `2d${dice[0]}` : `1d${dice[0]}`;

// ---------- Seeded randomness ----------
// A board code like "FERN-42" is the seed: same code, same board, nothing saved.
function hashString(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

const CODE_WORDS = ['FERN', 'MOSS', 'OAK', 'ASH', 'IVY', 'ROOT', 'THORN', 'BRAMBLE', 'WILLOW', 'HAZEL',
  'EMBER', 'FROST', 'CINDER', 'SLEET', 'SCALE', 'CLAW', 'WING', 'FANG', 'HOARD', 'CAVE',
  'BARD', 'LUTE', 'HARP', 'DRUM', 'SONG', 'RHYME', 'QUILL', 'INK', 'SCROLL', 'RUNE',
  'MOON', 'STAR', 'SUN', 'COMET', 'MIST', 'STORM', 'RAIN', 'SNOW', 'RIVER', 'LAKE',
  'PEAK', 'GLEN', 'DALE', 'MOOR', 'MARSH', 'GROVE', 'MEADOW', 'CLIFF', 'STONE', 'GEM',
  'OPAL', 'RUBY', 'JADE', 'AMBER', 'PEARL', 'GOLD', 'COPPER', 'IRON', 'TORCH', 'LANTERN',
  'ACORN', 'PINE', 'BIRCH', 'ROWAN'];

function normaliseCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '-');
}
function randomCode(rand = Math.random) {
  return CODE_WORDS[Math.floor(rand() * CODE_WORDS.length)] + '-' + (10 + Math.floor(rand() * 90));
}

// ---------- Board geometry ----------
// Square 1 is bottom-left; rows snake back and forth (boustrophedon).
function squareToCell(n) {
  const row = Math.floor((n - 1) / 10);           // 0 = bottom row
  const i = (n - 1) % 10;
  const col = row % 2 === 0 ? i : 9 - i;
  return { row, col };
}
const rowOf = n => Math.floor((n - 1) / 10);
const centre = n => { const c = squareToCell(n); return { x: c.col + .5, y: c.row + .5 }; };

// Do two links (straight lines between square centres) cross?
function crosses(a, b) {
  const p1 = centre(a.from), p2 = centre(a.to), p3 = centre(b.from), p4 = centre(b.to);
  const d = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
// Closest distance (in squares) between two links drawn as straight lines.
function linkDistance(a, b) {
  if (crosses(a, b)) return 0;
  const P = [centre(a.from), centre(a.to)], Q = [centre(b.from), centre(b.to)];
  const pointSeg = (p, s1, s2) => {
    const dx = s2.x - s1.x, dy = s2.y - s1.y;
    const t = Math.max(0, Math.min(1, ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - (s1.x + t * dx), p.y - (s1.y + t * dy));
  };
  return Math.min(pointSeg(P[0], ...Q), pointSeg(P[1], ...Q), pointSeg(Q[0], ...P), pointSeg(Q[1], ...P));
}

// ---------- Board generation ----------
// Board rules. Tweak these to experiment.
const RULES = {
  linkSpacing: 0.6,
  // Gain/drop pools: the vines together climb about `gainPool` squares, the wyrms together
  // drop about gain × dropToGain. Links are drawn until each pool is used up (within poolSlack).
  gainPool: [130, 160],
  dropToGain: [0.95, 1.1],
  poolSlack: 6,
  vineLength: [11, 34],
  wyrmDrop: [10, 30],
  longWyrm: [40, 55],        // at most one per board
  maxLinks: 11,              // per type          // minimum space between any two vines/wyrms, in squares
  vineMaxTop: 90,            // no vine reaches the top row (91–100)
  endZoneFrom: 81,           // the last two rows: 81–99
  endZoneWyrms: [2, 4],      // at least 2, at most 4 wyrm heads there
  lateZone: [95, 99],        // at least one wyrm head in here
  mildDrop: [10, 16],        // the gentle end-zone wyrm
  mediumDrop: [22, 35],      // the "good ouch" end-zone wyrm
  // Wyrm heads must be at least this many squares apart; meaner pairs sit further apart.
  // dropA + dropB = how far the two wyrms throw you back together.
  wyrmGap: (dropA, dropB) => Math.max(2, 2 + Math.floor((dropA + dropB - 5) / 5)),
};

function placeLinks(rng, strict = true) {
  const used = new Set([1, SIZE]);
  const starts = new Map();          // start square -> {type, from, to}
  const rowStarts = new Array(10).fill(0);
  const vines = [], wyrms = [];
  const gainPool = randInt(rng, ...RULES.gainPool);
  const dropPool = Math.round(gainPool * (RULES.dropToGain[0] + rng() * (RULES.dropToGain[1] - RULES.dropToGain[0])));
  const gained = () => vines.reduce((a, v) => a + v.to - v.from, 0);
  const dropped = () => wyrms.reduce((a, w) => a + w.from - w.to, 0);
  // Pick a size that won't strand a remainder too small for another link.
  const pickSize = (remaining, [lo, hi]) => {
    let n = Math.min(randInt(rng, lo, hi), remaining);
    const left = remaining - n;
    if (left > 0 && left < lo) n = remaining <= hi ? remaining : remaining - lo;
    return n;
  };
  let longWyrms = 0;

  const free = n => n > 1 && n < SIZE && !used.has(n);
  // Keep the board readable: links never cross and keep a little space between them.
  const tidy = link => [...vines, ...wyrms].every(o => linkDistance(o, link) >= RULES.linkSpacing);
  const claim = (a, b) => { used.add(a); used.add(b); rowStarts[rowOf(a)]++; };
  const inEnd = n => n >= RULES.endZoneFrom;
  const endCount = () => wyrms.filter(w => inEnd(w.from)).length;
  const spaced = (from, drop) => wyrms.every(w => Math.abs(w.from - from) >= RULES.wyrmGap(drop, w.from - w.to));

  function tryWyrm(from, drop) {
    const to = from - drop;
    if (to < 2 || !free(from) || !free(to)) return false;
    if (rowOf(to) >= rowOf(from) || rowStarts[rowOf(from)] >= 3) return false;
    if (inEnd(from) && endCount() >= RULES.endZoneWyrms[1]) return false;
    if (!spaced(from, drop) || !tidy({ from, to })) return false;
    claim(from, to);
    const w = { type: 'wyrm', from, to };
    wyrms.push(w); starts.set(from, w);
    return true;
  }

  // 1) The two end-zone wyrms: one mild, one medium; one of them sits on 95–99.
  const mildFirst = rng() < 0.5;
  const kinds = mildFirst ? [RULES.mildDrop, RULES.mediumDrop] : [RULES.mediumDrop, RULES.mildDrop];
  let ok = false;
  for (let t = 0; t < 100 && !ok; t++) ok = tryWyrm(randInt(rng, ...RULES.lateZone), randInt(rng, ...kinds[0]));
  if (!ok) return null;
  ok = false;
  for (let t = 0; t < 200 && !ok; t++) ok = tryWyrm(randInt(rng, RULES.endZoneFrom, 99), randInt(rng, ...kinds[1]));
  if (!ok) return null;

  // 2) The rest of the wyrms, until the drop pool is used up (up to 4 in the end zone).
  let tries = 0;
  while (dropPool - dropped() >= RULES.wyrmDrop[0] && wyrms.length < RULES.maxLinks && tries++ < 1500) {
    const remaining = dropPool - dropped();
    const long = longWyrms === 0 && remaining >= RULES.longWyrm[0] && rng() < 0.15;
    const drop = long ? pickSize(remaining, RULES.longWyrm) : pickSize(remaining, RULES.wyrmDrop);
    if (tryWyrm(randInt(rng, 13, 99), drop) && drop >= RULES.longWyrm[0]) longWyrms++;
  }
  // 3) Vines, until the gain pool is used up, never reaching past square 90.
  tries = 0;
  while (gainPool - gained() >= RULES.vineLength[0] && vines.length < RULES.maxLinks && tries++ < 1500) {
    const len = pickSize(gainPool - gained(), RULES.vineLength);
    const from = randInt(rng, 2, RULES.vineMaxTop - len);
    const to = from + len;
    if (to > RULES.vineMaxTop || !free(from) || !free(to)) continue;
    if (rowOf(to) <= rowOf(from) || rowStarts[rowOf(from)] >= 3) continue;
    if (!tidy({ from, to })) continue;
    claim(from, to);
    const v = { type: 'vine', from, to };
    vines.push(v); starts.set(from, v);
  }
  if (strict && Math.abs(gainPool - gained()) > RULES.poolSlack || Math.abs(dropPool - dropped()) > RULES.poolSlack) return null;
  return { vines, wyrms, starts };
}

// Play many quick single-player games to check the board has a good length.
// pSuccess = chance a puzzle is solved (vine climbed / wyrm dodged).
function simulate(board, rng, games = 1500, pSuccess = 0.7) {
  const turns = [];
  for (let g = 0; g < games; g++) {
    let pos = 1, t = 0;
    while (pos < SIZE && t < 400) {
      t++;
      pos += randInt(rng, 1, 6);
      if (pos >= SIZE) break;
      const link = board.starts.get(pos);
      if (link) {
        const solved = rng() < pSuccess;
        if (link.type === 'vine' && solved) pos = link.to;
        if (link.type === 'wyrm' && !solved) pos = link.to;
      }
    }
    turns.push(t);
  }
  turns.sort((a, b) => a - b);
  const mean = turns.reduce((a, b) => a + b, 0) / turns.length;
  return { mean, median: turns[turns.length >> 1], p90: turns[Math.floor(turns.length * 0.9)], max: turns[turns.length - 1] };
}

const BALANCE = { minMean: 20, maxMean: 30, maxP90: 52 };

function generateBoard(code) {
  const norm = normaliseCode(code);
  const rng = makeRng(hashString(norm));
  let board = null, stats = null, attempts = 0;
  for (attempts = 1; attempts <= 200; attempts++) {
    const placed = placeLinks(rng);
    if (!placed) continue;
    board = placed;
    stats = simulate(board, rng);
    if (stats.mean >= BALANCE.minMean && stats.mean <= BALANCE.maxMean && stats.p90 <= BALANCE.maxP90) break;
  }
  // Safety net (never seen in tests): accept a board that misses the pools rather than fail.
  for (let t = 0; !board && t < 50; t++) { board = placeLinks(rng, false); if (board) stats = simulate(board, rng); }
  return { code: norm, vines: board.vines, wyrms: board.wyrms, starts: board.starts, stats, attempts };
}

// ---------- Dice ----------
const rollDie = (sides, rand = Math.random) => 1 + Math.floor(rand() * sides);
const rollDice = (dice, rand = Math.random) => dice.map(s => rollDie(s, rand));
const rollD10 = (rand = Math.random) => Math.floor(rand() * 10);   // 0–9 for read-write-make

// ---------- Read-write-make ----------
// slots: [hundreds, tens, ones], null = empty
const rwmValue = slots => slots.reduce((a, d) => a * 10 + (d ?? 0), 0);
function rwmWinner(a, b, goal) {   // returns 0 (a wins), 1 (b wins) or -1 (tie)
  const va = rwmValue(a), vb = rwmValue(b);
  if (va === vb) return -1;
  return goal === 'highest' ? (va > vb ? 0 : 1) : (va < vb ? 0 : 1);
}
// Computer strategy: big digits high (for "highest"), small digits high (for "lowest").
function aiPlace(slots, digit, goal) {
  const free = [0, 1, 2].filter(i => slots[i] === null);
  if (free.length === 1) return free[0];
  const good = goal === 'highest' ? digit : 9 - digit;   // 9 = perfect for the top slot
  if (good >= 7) return free[0];
  if (good <= 2) return free[free.length - 1];
  return free.length === 3 ? 1 : (good >= 5 ? free[0] : free[free.length - 1]);
}

// ---------- Level unlocks (by player name, on this device) ----------
// Levels 4–5 unlock after finishing a game at level 3 or higher. Adult is always open.
function unlockedLevels(maxPlayed, unlockAll) {
  if (unlockAll) return LEVELS.map(l => l.id);
  const ids = [1, 2, 3];
  if (maxPlayed >= 3) ids.push(4, 5);
  ids.push(6);
  return ids;
}

const API = { RULES, crosses, linkDistance, SIZE, LEVELS, levelById, diceLabel, hashString, makeRng, normaliseCode, randomCode,
  squareToCell, rowOf, generateBoard, simulate, BALANCE, rollDie, rollDice, rollD10,
  rwmValue, rwmWinner, aiPlace, unlockedLevels, CODE_WORDS };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.WV = API;
})(typeof window !== 'undefined' ? window : globalThis);
