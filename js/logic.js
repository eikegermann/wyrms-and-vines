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

// ---------- Board generation ----------
function placeLinks(rng) {
  const used = new Set([1, SIZE]);
  const starts = new Map();          // start square -> {type, from, to}
  const rowStarts = new Array(10).fill(0);
  const vines = [], wyrms = [];
  const nVines = randInt(rng, 7, 9), nWyrms = randInt(rng, 7, 9);
  let longWyrms = 0;

  const free = n => n > 1 && n < SIZE && !used.has(n);
  // Keep the board readable: a new link may not cross any existing link.
  const tidy = link => [...vines, ...wyrms].filter(o => crosses(o, link)).length === 0;
  const claim = (a, b) => { used.add(a); used.add(b); rowStarts[rowOf(a)]++; };

  let tries = 0;
  while (vines.length < nVines && tries++ < 500) {
    const from = randInt(rng, 2, 88);
    const len = randInt(rng, 11, 34);
    const to = from + len;
    if (to > 99 || !free(from) || !free(to)) continue;
    if (rowOf(to) <= rowOf(from) || rowStarts[rowOf(from)] >= 3) continue;
    if (!tidy({ from, to })) continue;
    claim(from, to);
    const v = { type: 'vine', from, to };
    vines.push(v); starts.set(from, v);
  }
  tries = 0;
  while (wyrms.length < nWyrms && tries++ < 500) {
    const from = randInt(rng, 13, 99);
    const long = rng() < 0.15 && longWyrms === 0;
    const len = long ? randInt(rng, 40, 55) : randInt(rng, 10, 30);
    const to = from - len;
    if (to < 2 || !free(from) || !free(to)) continue;
    if (rowOf(to) >= rowOf(from) || rowStarts[rowOf(from)] >= 3) continue;
    if (!tidy({ from, to })) continue;
    if (len >= 40) longWyrms++;
    claim(from, to);
    const w = { type: 'wyrm', from, to };
    wyrms.push(w); starts.set(from, w);
  }
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
    board = placeLinks(rng);
    stats = simulate(board, rng);
    if (stats.mean >= BALANCE.minMean && stats.mean <= BALANCE.maxMean && stats.p90 <= BALANCE.maxP90) break;
  }
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
// Levels 4–5 unlock after finishing a game at level 3 or higher; Adult after a game at level 5.
function unlockedLevels(maxPlayed, unlockAll) {
  if (unlockAll) return LEVELS.map(l => l.id);
  const ids = [1, 2, 3];
  if (maxPlayed >= 3) ids.push(4, 5);
  if (maxPlayed >= 5) ids.push(6);
  return ids;
}

const API = { crosses, SIZE, LEVELS, levelById, diceLabel, hashString, makeRng, normaliseCode, randomCode,
  squareToCell, rowOf, generateBoard, simulate, BALANCE, rollDie, rollDice, rollD10,
  rwmValue, rwmWinner, aiPlace, unlockedLevels, CODE_WORDS };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.WV = API;
})(typeof window !== 'undefined' ? window : globalThis);
