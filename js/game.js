// ---------- Wyrms & Vines: screens, turns, puzzles, duels ----------
(function () {
'use strict';
const W = window.WV;
const SFX = window.WVSound || { play() {}, setEnabled() {}, enabled: false };
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const COLOURS = [
  { c: '#1e88e5', n: 'Blue' }, { c: '#e53935', n: 'Red' }, { c: '#f9a825', n: 'Gold' }, { c: '#2e7d32', n: 'Green' },
  { c: '#8e24aa', n: 'Purple' }, { c: '#ef6c00', n: 'Orange' }, { c: '#00897b', n: 'Teal' }, { c: '#d81b60', n: 'Pink' }];
const AI_NAMES = ['Cinder', 'Sleet', 'Puff', 'Smoulder'];
const AI_ACCURACY = 0.88;                // chance a computer player gets a sum right
const DELAY = { ai: 750, step: 150, slide: 750, spin: 80, hold: 900, inlineHold: 765 };
// Game speed: every pause is multiplied by the chosen factor.
const SPEEDS = [{ n: 'Very calm', f: 2.6 }, { n: 'Calm', f: 1.9 }, { n: 'Normal', f: 1.4 }, { n: 'Quick', f: 1.0 }, { n: 'Sonic', f: 0.6 }];
const SPEED_KEY = 'wyrms-and-vines.speed';
let speedIdx = (() => { try { const v = +localStorage.getItem(SPEED_KEY); return v >= 1 && v <= 5 ? v : 3; } catch (e) { return 3; } })();
let testFactor = null;
const speed = () => testFactor ?? SPEEDS[speedIdx - 1].f;
function setSpeed(i) {
  speedIdx = i;
  try { localStorage.setItem(SPEED_KEY, i); } catch (e) { /* storage unavailable */ }
  document.querySelectorAll('.speedRange').forEach(r => { r.value = i; });
  document.querySelectorAll('.speedName').forEach(s => { s.textContent = SPEEDS[i - 1].n; });
}
document.querySelectorAll('.speedRange').forEach(r => { r.oninput = () => setSpeed(+r.value); });
setSpeed(speedIdx);

// "a 5", "an 8", "an 11", "an 18", "an 80"
const an = n => (/^8/.test(String(n)) || n === 11 || n === 18) ? 'an' : 'a';
const rolled = (who, vals) => `${esc(who)} rolled ${vals.map(v => `${an(v)} <b>${v}</b>`).join(' and ')}!`;

// ---------- Saved data: only which levels each name has played ----------
const STORE_KEY = 'wyrms-and-vines.played';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; } },
  set(o) { try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) { /* storage unavailable */ } },
};
const nameKey = n => String(n).trim().toLowerCase();
const maxPlayed = name => store.get()[nameKey(name)] || 0;

// ===================================================================
// Setup screen
// ===================================================================
let setup = {
  players: [
    { name: 'Player 1', colour: 0, level: 1, ai: false },
    { name: AI_NAMES[0], colour: 1, level: 1, ai: true },
  ],
};

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
}

function levelOptions(p) {
  const open = p.ai ? W.LEVELS.map(l => l.id) : W.unlockedLevels(maxPlayed(p.name), $('#unlockAll').checked);
  if (!open.includes(+p.level)) p.level = Math.max(...open.filter(id => id <= p.level), 1);
  return W.LEVELS.map(l => {
    const locked = !open.includes(l.id);
    return `<option value="${l.id}" ${locked ? 'disabled' : ''} ${+p.level === l.id ? 'selected' : ''}>` +
      `${l.name} · ${W.diceLabel(l.dice)} to ${l.target}${locked ? ' 🔒' : ''}</option>`;
  }).join('');
}

function renderSetup() {
  const box = $('#playerRows');
  box.innerHTML = '';
  setup.players.forEach((p, i) => {
    const row = el('div', 'prow');
    const sw = el('div', 'swatches');
    COLOURS.forEach((c, ci) => {
      const taken = setup.players.some((q, j) => j !== i && q.colour === ci);
      const b = el('button', 'swatch' + (p.colour === ci ? ' sel' : '') + (taken ? ' taken' : ''));
      b.style.background = c.c; b.title = c.n; b.disabled = taken;
      b.onclick = () => { p.colour = ci; renderSetup(); };
      sw.appendChild(b);
    });
    const name = el('input', 'name'); name.value = p.name; name.maxLength = 14; name.placeholder = 'Name';
    const lvl = el('select'); lvl.innerHTML = levelOptions(p);
    name.oninput = () => { p.name = name.value; lvl.innerHTML = levelOptions(p); };
    lvl.onchange = () => { p.level = +lvl.value; };
    const type = el('select');
    type.innerHTML = `<option value="h" ${p.ai ? '' : 'selected'}>🙂 Human</option><option value="c" ${p.ai ? 'selected' : ''}>🤖 Computer</option>`;
    type.onchange = () => {
      p.ai = type.value === 'c';
      if (p.ai && /^Player \d$/.test(p.name)) p.name = AI_NAMES.find(n => !setup.players.some(q => q.name === n)) || 'Computer';
      renderSetup();
    };
    // How this player answers puzzles: typing, or writing with the quill (from Dragon & Bard)
    const input = el('select', 'inputSel'); input.title = 'How this player answers: typing, or writing with the quill';
    input.innerHTML = `<option value="keys" ${p.input !== 'quill' ? 'selected' : ''}>⌨️ Typing</option><option value="quill" ${p.input === 'quill' ? 'selected' : ''}>🪶 Quill</option>`;
    input.onchange = () => { p.input = input.value; };
    input.style.visibility = p.ai ? 'hidden' : 'visible';
    const rm = el('button', 'btn small ghost', '✕'); rm.title = 'Remove player';
    rm.disabled = setup.players.length <= 1;
    rm.onclick = () => { setup.players.splice(i, 1); renderSetup(); };
    row.append(sw, name, lvl, type, input, rm);
    box.appendChild(row);
  });
  $('#addPlayerBtn').disabled = setup.players.length >= 4;
}

$('#addPlayerBtn').onclick = () => {
  const colour = COLOURS.findIndex((c, ci) => !setup.players.some(p => p.colour === ci));
  setup.players.push({ name: 'Player ' + (setup.players.length + 1), colour, level: 1, ai: false });
  renderSetup();
};
$('#unlockAll').onchange = renderSetup;
const FOREST_KEY = 'wyrms-and-vines.forest';
try { $('#forestToggle').checked = localStorage.getItem(FOREST_KEY) !== 'off'; } catch (e) { /* storage unavailable */ }
$('#forestToggle').onchange = () => { try { localStorage.setItem(FOREST_KEY, $('#forestToggle').checked ? 'on' : 'off'); } catch (e) { /* */ } };
// Iron Wyrm mode builds on the living forest, so it switches the forest on.
const IRON_KEY = 'wyrms-and-vines.iron';
function syncIron() {
  const on = $('#ironToggle').checked;
  if (on) $('#forestToggle').checked = true;
  $('#forestToggle').disabled = on;
}
try { $('#ironToggle').checked = localStorage.getItem(IRON_KEY) === 'on'; } catch (e) { /* storage unavailable */ }
syncIron();
$('#ironToggle').onchange = () => { syncIron(); try { localStorage.setItem(IRON_KEY, $('#ironToggle').checked ? 'on' : 'off'); } catch (e) { /* */ } };
$('#newCodeBtn').onclick = () => { $('#codeInput').value = W.randomCode(); };
$('#codeInput').value = W.randomCode();

$('#startBtn').onclick = () => {
  const ps = setup.players.map((p, i) => ({ ...p, name: p.name.trim() || ('Player ' + (i + 1)) }));
  let code = W.normaliseCode($('#codeInput').value);
  if (!code) { code = W.randomCode(); $('#codeInput').value = code; }
  startGame(code, ps);
};
function renderSoundBtns() {
  document.querySelectorAll('.soundBtn').forEach(b => {
    const small = b.classList.contains('small');
    b.textContent = SFX.enabled ? (small ? '🔊' : '🔊 Sound on') : (small ? '🔇' : '🔇 Sound off');
    b.title = SFX.enabled ? 'Sound on (tap to mute)' : 'Sound off (tap to turn on)';
  });
}
document.querySelectorAll('.soundBtn').forEach(b => { b.onclick = () => { SFX.setEnabled(!SFX.enabled); renderSoundBtns(); }; });
renderSoundBtns();
$('#titleGo').onclick = () => $('#titleOverlay').classList.remove('show');
$('#howBtn').onclick = () => { $('#titleOverlay').classList.add('show'); $('#titleCard').scrollTop = 0; };

$('#logBtn').onclick = () => {
  const open = $('#log').classList.toggle('open');
  $('#logBtn').textContent = open ? '📜 Hide log' : '📜 Show log';
  if (open) $('#log').scrollTop = $('#log').scrollHeight;
};
$('#quitBtn').onclick = () => { G = null; if (typeof Quill !== 'undefined') Quill.close(); closeEncounter(); $('#rollOverlay').classList.remove('show'); show('setup'); renderSetup(); };

// ===================================================================
// Game
// ===================================================================
let G = null;
class Quit extends Error {}

function startGame(code, players, forest = $('#forestToggle').checked, ironOn = $('#ironToggle').checked) {
  const board = W.generateBoard(code, ironOn ? 'iron' : {});
  if (ironOn) forest = true;
  G = { board, players: players.map(p => ({ ...p, pos: 1 })), cur: 0, over: false, forest, ironOn,
    iron: ironOn ? W.newIronState(board, players.length) : null };
  $('#codeShow').textContent = board.code;
  $('#log').classList.remove('open'); $('#logBtn').textContent = '📜 Show log';
  $('#log').innerHTML = '';
  $('#tokens').innerHTML = '';
  closeEncounter(); $('#rollOverlay').classList.remove('show');
  if (typeof Quill !== 'undefined') Quill.close();
  drawBoard(board);
  show('game');
  renderPlayers(); placeTokens();
  SFX.play('game-start');
  log(`New game on board <b>${board.code}</b>. ${board.vines.length} vines, ${board.wyrms.length} wyrms.${G.ironOn ? ` ⚙️ Iron Wyrm mode: ${G.iron.hunters.length} hunters are about.` : G.forest ? ' 🌳 Living forest is on.' : ''}`);
  const me = G;
  play(me).catch(e => { if (!(e instanceof Quit)) throw e; });
}

const alive = g => { if (G !== g) throw new Quit(); };
const wait = (g, ms) => new Promise(r => setTimeout(r, ms * speed())).then(() => alive(g));

function log(html) {
  const d = el('div', null, html);
  const box = $('#log'); box.appendChild(d); box.scrollTop = box.scrollHeight;
}

// ---------- Drawing ----------
function cellCentre(n) {
  const { row, col } = W.squareToCell(n);
  return { x: col * 10 + 5, y: (9 - row) * 10 + 5 };
}

function drawBoard(board) {
  const grid = $('#board'); grid.innerHTML = '';
  const cells = [];
  for (let n = 1; n <= 100; n++) {
    const { row, col } = W.squareToCell(n);
    const c = el('div', 'cell ' + ((row + col) % 2 ? 'b' : 'a'));
    if (n === 1) c.classList.add('start');
    if (n === 100) c.classList.add('finish');
    const link = board.starts.get(n);
    if (link) c.classList.add(link.type === 'vine' ? 'vstart' : 'wstart');
    c.style.gridRow = (10 - row); c.style.gridColumn = col + 1;
    cells.push(c);
  }
  cells.forEach(c => grid.appendChild(c));
  const nums = $('#numbers'); nums.innerHTML = '';
  for (let n = 1; n <= 100; n++) {
    const { row, col } = W.squareToCell(n);
    const c = el('div', 'num', n); c.style.gridRow = (10 - row); c.style.gridColumn = col + 1;
    nums.appendChild(c);
  }

  drawLinks(board);
}

// Vines, sprouts and wyrms. `fresh` = ids to highlight (just moved or grown).
function drawLinks(board, fresh = new Set()) {
  const svg = $('#links'); svg.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (parent, tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  const group = (link) => { const g = mk(svg, 'g', { 'data-id': link.id }); if (fresh.has(link.id)) g.classList.add('fresh'); return g; };
  const curve = (a, b, bend) => {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    return `M${a.x},${a.y} Q${mx - dy / len * bend},${my + dx / len * bend} ${b.x},${b.y}`;
  };
  // Leaves turn yellow as a vine wears out.
  const WEAR = [{ stem: '#2e6b30', vine: '#66bb6a', leaf: '#43a047' }, { stem: '#557a2a', vine: '#a5c25a', leaf: '#9ccc65' }, { stem: '#7a6a2a', vine: '#cdb85a', leaf: '#d4b24c' }];
  board.vines.forEach((v, i) => {
    const g = group(v), c = WEAR[Math.min(v.hits || 0, 2)];
    const a = cellCentre(v.from), b = cellCentre(v.to);
    const d = curve(a, b, i % 2 ? 1.5 : -1.5);
    mk(g, 'path', { d, fill: 'none', stroke: c.stem, 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: .9 });
    const p = mk(g, 'path', { d, fill: 'none', stroke: c.vine, 'stroke-width': 1.1, 'stroke-linecap': 'round' });
    mk(g, 'circle', { cx: a.x, cy: a.y, r: 2.2, fill: '#8d6e3f', stroke: c.stem, 'stroke-width': .6 });
    mk(g, 'text', { x: b.x, y: b.y + 1.3, 'font-size': 4, 'text-anchor': 'middle' }).textContent = (v.hits || 0) >= 2 ? '🍂' : '🍃';
    const L = p.getTotalLength ? p.getTotalLength() : 0;
    for (let t = 4; t < L - 2; t += 5) {
      const pt = p.getPointAtLength(t);
      mk(g, 'ellipse', { cx: pt.x + ((t / 5) % 2 ? 1.2 : -1.2), cy: pt.y, rx: 1.3, ry: .7, fill: c.leaf, opacity: .95 });
    }
  });
  // Sprouts only show their root: where they'll climb to is a surprise.
  (board.sprouts || []).forEach(sp => {
    const g = group(sp), a = cellCentre(sp.from);
    mk(g, 'circle', { cx: a.x, cy: a.y, r: sp.stage > 1 ? 2.6 : 2, fill: '#6d5530', opacity: .8 });
    mk(g, 'text', { x: a.x, y: a.y + (sp.stage > 1 ? 2.4 : 1.6), 'font-size': sp.stage > 1 ? 6.5 : 4.5, 'text-anchor': 'middle' }).textContent = '🌱';
  });
  // Iron Wyrm: hunters' tunnels are dark holes with a shaft down to where they come out.
  (board.tunnels || []).forEach((t, i) => {
    const g = group(t);
    const a = cellCentre(t.from), b = cellCentre(t.to);
    const d = curve(a, b, i % 2 ? 2 : -2);
    mk(g, 'path', { d, fill: 'none', stroke: '#2b1d14', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '2 1.2', opacity: .75 });
    mk(g, 'circle', { cx: a.x, cy: a.y, r: 2.7, fill: '#120c08', stroke: '#6d4c41', 'stroke-width': .7 });
    mk(g, 'circle', { cx: b.x, cy: b.y, r: 1.3, fill: '#3e2723', opacity: .8 });
  });
  board.wyrms.forEach((w, i) => {
    const g = group(w);
    const a = cellCentre(w.from), b = cellCentre(w.to);
    const d = curve(a, b, i % 2 ? 2 : -2);
    mk(g, 'path', { d, fill: 'none', stroke: '#5e1f70', 'stroke-width': 3.2, 'stroke-linecap': 'round', opacity: .85 });
    mk(g, 'path', { d, fill: 'none', stroke: '#c77ddb', 'stroke-width': 1.2, 'stroke-dasharray': '1.2 1.6', 'stroke-linecap': 'round', opacity: .9 });
    // Fortified wyrms wear iron plates along the back and an iron ring round the head.
    if (w.fortified) mk(g, 'path', { d, fill: 'none', stroke: '#cfd8dc', 'stroke-width': 2.2, 'stroke-dasharray': '1.1 1.1', 'stroke-linecap': 'butt', opacity: .95 });
    mk(g, 'circle', { cx: a.x, cy: a.y, r: 2.6, fill: '#7b2d91', stroke: w.fortified ? '#eceff1' : '#3a1145', 'stroke-width': w.fortified ? 1 : .5 });
    mk(g, 'circle', { cx: a.x - .9, cy: a.y - .5, r: .55, fill: '#ffeb3b' });
    mk(g, 'circle', { cx: a.x + .9, cy: a.y - .5, r: .55, fill: '#ffeb3b' });
    // Disturbed wyrms get sleepy, then grumpy.
    const mood = (w.hits || 0) >= 2 ? '😠' : (w.hits || 0) === 1 ? '💤' : '';
    if (mood) mk(g, 'text', { x: a.x + 3.4, y: a.y - 1.6, 'font-size': 3.6, 'text-anchor': 'middle' }).textContent = mood;
  });
  // Iron Wyrm: eggs on vines the ants are eating, and the ant colonies themselves.
  board.vines.filter(v => v.egg).forEach(v => {
    const a = cellCentre(v.from);
    mk(svg, 'text', { x: a.x + 3, y: a.y + 3.6, 'font-size': 3.8, 'text-anchor': 'middle' }).textContent = '🥚';
  });
  (board.colonies || []).forEach(c => {
    const g = group(c), a = cellCentre(c.pos);
    mk(g, 'circle', { cx: a.x, cy: a.y, r: 2.8, fill: '#8d6e63', opacity: .55 });
    mk(g, 'text', { x: a.x, y: a.y + 1.6, 'font-size': 4.4, 'text-anchor': 'middle' }).textContent = '🐜';
  });
}

function placeTokens() {
  const box = $('#tokens');
  const OFF = [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]];
  G.players.forEach((p, i) => {
    let t = box.querySelector(`[data-i="${i}"]`);
    if (!t) { t = el('div', 'token', esc(p.name[0].toUpperCase())); t.dataset.i = i; box.appendChild(t); }
    t.style.background = COLOURS[p.colour].c;
    t.title = p.name;
    const c = cellCentre(p.pos);
    const [ox, oy] = OFF[i];
    t.style.left = (c.x - 2.5 + ox) + '%';
    t.style.top = (c.y - 2.5 + oy) + '%';
    t.classList.toggle('current', i === G.cur && !G.over);
  });
  // Iron Wyrm hunters
  const ids = new Set();
  (G.iron ? G.iron.hunters : []).forEach(h => {
    ids.add(String(h.id));
    let t = box.querySelector(`[data-h="${h.id}"]`);
    if (!t) { t = el('div', 'hunter', '🏹'); t.dataset.h = h.id; t.title = 'Wyrm hunter'; box.appendChild(t); }
    const c = cellCentre(h.pos);
    t.style.left = (c.x - 2) + '%';
    t.style.top = (c.y - 0.5) + '%';
  });
  box.querySelectorAll('.hunter').forEach(t => { if (!ids.has(t.dataset.h)) t.remove(); });
}

function renderPlayers() {
  const box = $('#playerList'); box.innerHTML = '';
  G.players.forEach((p, i) => {
    const L = W.levelById(p.level);
    const d = el('div', 'pl' + (i === G.cur && !G.over ? ' current' : ''),
      `<span class="dot" style="background:${COLOURS[p.colour].c}"></span><b>${esc(p.name)}</b>${p.ai ? ' 🤖' : ''}` +
      `<span class="lvl">${L.name} · ${W.diceLabel(L.dice)}</span><span class="pos">${p.pos}</span>`);
    box.appendChild(d);
  });
}

// ---------- Stage helpers ----------
// Most things happen in the side panel; vines, wyrms and duels open a big window in the middle.
let stageSel = '#stage';
const stage = () => $(stageSel);
const ENCOUNTER_SOUND = { vine: 'vine-rustle', wyrm: 'wyrm-hiss', duel: 'duel-start' };
function openEncounter(kind) {
  $('#encounter').className = 'show ' + kind; $('#encCard').innerHTML = ''; stageSel = '#encCard';
  if (ENCOUNTER_SOUND[kind]) SFX.play(ENCOUNTER_SOUND[kind]);
}
function closeEncounter() { $('#encounter').className = ''; $('#encCard').innerHTML = ''; stageSel = '#stage'; }
// Final card of an encounter: big emoji and what happened.
async function resultCard(g, auto, emoji, text, sound) {
  if (sound) SFX.play(sound);
  setStage(`<div class="bigEmoji">${emoji}</div>`, `<div class="resultText">${text}</div>`);
  await choose(g, [{ label: 'Carry on ▶', value: 1, cls: 'gold' }], auto ? 1 : undefined, DELAY.ai * 2.5);
}
function setStage(title, msg) {
  stage().innerHTML = `<div class="title">${title}</div><div class="msg">${msg || ''}</div>`;
}
function addMsg(html) { stage().appendChild(el('div', 'msg', html)); }

// Show buttons; a computer player picks aiValue after a pause.
function choose(g, options, aiValue, aiDelay = DELAY.ai) {
  const row = el('div', 'actions');
  stage().appendChild(row);
  return new Promise((resolve, reject) => {
    options.forEach((o, i) => {
      const b = el('button', 'btn ' + (o.cls || ''), o.label);
      b.disabled = aiValue !== undefined;
      b.onclick = () => { row.querySelectorAll('button').forEach(x => x.disabled = true); resolve(o.value); };
      row.appendChild(b);
      if (i === 0 && aiValue === undefined) setTimeout(() => b.focus(), 0);
    });
    if (aiValue !== undefined) wait(g, aiDelay).then(() => resolve(aiValue), reject);
  }).then(v => { alive(g); return v; });
}

// Number entry. With giveUpLabel, there's also a button to stop; it resolves to null.
function askNumber(g, giveUpLabel = null) {
  const row = el('div', 'answer');
  const inp = el('input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = 'off'; inp.maxLength = 4;
  const ok = el('button', 'btn gold', 'Check');
  row.append(inp, ok);
  const stop = giveUpLabel ? el('button', 'btn ghost small giveUp', giveUpLabel) : null;
  if (stop) row.append(stop);
  stage().appendChild(row);
  setTimeout(() => inp.focus(), 0);
  return new Promise(resolve => {
    const submit = () => {
      const v = inp.value.trim();
      if (!/^\d+$/.test(v)) { inp.focus(); return; }
      inp.disabled = ok.disabled = true;
      resolve(+v);
    };
    ok.onclick = submit;
    inp.onkeydown = e => { if (e.key === 'Enter') submit(); };
    if (stop) stop.onclick = () => { inp.disabled = ok.disabled = stop.disabled = true; resolve(null); };
  }).then(v => { alive(g); return v; });
}

// Writing the answer with Dragon & Bard's quill. Resolves to the number written, or undefined
// if the player picks "Number pad" instead. In Trace and Remember mode the number is picked first;
// a wrong pick closes the quill and counts as that try's answer, just like a wrong typed answer.
function askQuill(g, promptHtml, correct, digits) {
  return new Promise(resolve => {
    let settled = false;
    const finish = v => { if (!settled) { settled = true; resolve(v); } };
    Quill.open({
      count: digits, prompt: promptHtml,
      checkPick: v => {
        if (+v === correct) return true;
        setTimeout(() => { Quill.close(); finish(+v); }, 1100);
        return 'Not quite!';
      },
      onDone: r => finish(+(r.text.replace(/^0+(?=\d)/, '') || '0')),
      onCancel: () => finish(undefined),
    });
  }).then(v => { alive(g); return v; });
}

// Big roll in the middle of the screen: dice tumble, then the result is announced.
// It stays up for a moment (click to close it sooner); the dice also stay in the side panel.
async function showRoll(g, who, sidesList, values, result) {
  const label = sidesList.length === 2 && sidesList[0] === sidesList[1] ? `2d${sidesList[0]}` : sidesList.map(s => 'd' + s).join(' + ');
  const rnd = s => s === 10 ? Math.floor(Math.random() * 10) : 1 + Math.floor(Math.random() * s);
  SFX.play('dice-shake');
  if (stageSel === '#encCard') {              // inside the big window: roll right there
    const box = el('div', 'dice big');
    const dice = sidesList.map(() => { const d = el('div', 'die rolling', '?'); box.appendChild(d); return d; });
    const res = el('div', 'rollResult', '&nbsp;');
    stage().append(box, res);
    for (let k = 0; k < 9; k++) { dice.forEach((d, i) => { d.textContent = rnd(sidesList[i]); }); await wait(g, DELAY.spin); }
    dice.forEach((d, i) => { d.classList.remove('rolling'); d.textContent = values[i]; });
    SFX.play('dice-land');
    res.innerHTML = result;
    await wait(g, DELAY.inlineHold);
    return;
  }
  const ov = $('#rollOverlay');
  ov.innerHTML = '';
  const card = el('div', 'rollCard');
  card.appendChild(el('div', 'rollWho', `🎲 ${esc(who)} rolls ${label}`));
  const box = el('div', 'dice big');
  const dice = sidesList.map(s => { const d = el('div', 'die rolling', '?'); box.appendChild(d); return d; });
  card.appendChild(box);
  const res = el('div', 'rollResult', '&nbsp;');
  card.appendChild(res);
  ov.appendChild(card);
  ov.classList.add('show');
  for (let k = 0; k < 7; k++) {
    dice.forEach((d, i) => { d.textContent = rnd(sidesList[i]); });
    await wait(g, DELAY.spin);
  }
  dice.forEach((d, i) => { d.classList.remove('rolling'); d.textContent = values[i]; });
  SFX.play('dice-land');
  res.innerHTML = result;
  await new Promise(r => { const t = setTimeout(r, DELAY.hold * speed()); ov.onclick = () => { clearTimeout(t); r(); }; });
  ov.classList.remove('show'); ov.onclick = null;
  alive(g);
  const small = el('div', 'dice');
  values.forEach(v => small.appendChild(el('div', 'die', v)));
  stage().appendChild(small);
}

// ---------- Movement ----------
async function walk(g, p, to) {
  while (p.pos !== to) {
    p.pos += to > p.pos ? 1 : -1;
    placeTokens();
    SFX.play('step', 0.5);
    await wait(g, DELAY.step);
  }
  renderPlayers();
}
async function slide(g, p, to) {
  const toks = document.querySelectorAll('.token');
  const ms = Math.round(DELAY.slide * speed());
  toks.forEach(t => t.style.transition = `left ${ms}ms ease, top ${ms}ms ease`);
  p.pos = to; placeTokens(); renderPlayers();
  await wait(g, DELAY.slide + 100);
  toks.forEach(t => t.style.transition = '');
}

// ===================================================================
// Turn loop
// ===================================================================
// A short "what to look out for" card when a Living forest or Iron Wyrm game starts.
async function introCard(g) {
  const forest = [
    ['💤😠', 'Wyrms get sleepy, then grumpy. After three visits they wake up and move.'],
    ['🐉💨', 'A wyrm that slides two players down flies away for good.'],
    ['🌱', 'Every vine can be used three times. The first use plants a sprout somewhere else; when the old vine withers, the sprout shoots up.'],
  ];
  const iron = [
    ['🐜', 'Vine-cutter ants move in near vines. Land on a colony to stomp it out!'],
    ['🥚', 'An egg on a vine means the ants are eating it, and it will soon turn into a wyrm. Climb it while you can!'],
    ['⚙️', 'Wyrms with iron plates are fortified: their puzzle is one level harder.'],
    ['🏹', 'Hunters roam the board and fight wyrms. If a wyrm eats a hunter, it grows iron plates.'],
    ['🕳️', "A hunter's tunnel always slides you down. No puzzle, so watch your step!"],
    ['🎯', 'You must land on 100 exactly. Roll too much and you bounce back!'],
  ];
  const items = g.ironOn ? [...iron, ...forest] : forest;
  openEncounter(g.ironOn ? 'wyrm iron' : 'forest');
  setStage(g.ironOn ? '⚙️ Iron Wyrm mode' : '🌳 Living forest',
    `<p>${g.ironOn ? 'The wyrms are taking over the forest. Race to square 100 before they do!' : 'The forest is alive and changes as you play.'} Look out for:</p>` +
    `<ul class="introList">${items.map(([e, t]) => `<li><span>${e}</span>${t}</li>`).join('')}</ul>`);
  // With only computer players there's nobody to tap, so it carries on by itself.
  await choose(g, [{ label: "Let's go! ▶", value: 1, cls: 'gold' }], g.players.every(p => p.ai) ? 1 : undefined, DELAY.ai * 4);
  closeEncounter();
}

async function play(g) {
  if (g.forest) await introCard(g);
  while (!g.over) {
    const p = g.players[g.cur];
    renderPlayers(); placeTokens();
    await turn(g, p);
    if (g.over) break;
    g.cur = (g.cur + 1) % g.players.length;
    if (g.cur === 0 && g.ironOn) await ironPhase(g);
  }
}

async function turn(g, p) {
  setStage(`${p.ai ? '🤖 ' : ''}${esc(p.name)}'s turn`, `On square <b>${p.pos}</b>.`);
  await choose(g, [{ label: '🎲 Roll to move', value: 1, cls: 'gold' }], p.ai ? 1 : undefined);
  const r = W.rollDie(6);
  await showRoll(g, p.name, [6], [r], `${rolled(p.name, [r])}<div class="rollSub">Move ${r} square${r > 1 ? 's' : ''}.</div>`);
  // Iron Wyrm mode: you need to land on 100 exactly; extra steps bounce you back.
  const exact = g.ironOn && W.IRON.exactFinish;
  const dest = W.moveTarget(p.pos, r, exact);
  if (p.pos + r > W.SIZE && exact) {
    const back = p.pos + r - W.SIZE;
    log(`${esc(p.name)} rolls ${r}, bounces off 100 and goes back ${back} to ${dest}.`);
    await walk(g, p, W.SIZE);
    await wait(g, 250);
    await walk(g, p, dest);
    addMsg(`💥 Boing! You need to land on 100 exactly. ${esc(p.name)} bounces back ${back} square${back > 1 ? 's' : ''} to ${dest}.`);
  } else {
    log(`${esc(p.name)} rolls ${r} and moves to ${dest}.`);
    await walk(g, p, dest);
  }
  if (p.pos >= W.SIZE) return win(g, p);

  const tunnel = g.ironOn ? W.tunnelAt(g.board, p.pos) : null;
  const link = tunnel ? null : g.board.starts.get(p.pos);
  if (tunnel) {
    await wait(g, 300);
    openEncounter('wyrm');
    await resultCard(g, p.ai, '🕳️', `${esc(p.name)} falls into a hunter's tunnel! Down to square ${tunnel.to}.`, 'tunnel');
    closeEncounter();
    log(`🕳️ ${esc(p.name)} fell down a tunnel to ${tunnel.to}.`);
    await slide(g, p, tunnel.to);
  } else if (!link && g.ironOn) {
    const c = W.stompColony(g.board, p.pos);
    if (c) {
      drawLinks(g.board);
      openEncounter('forest');
      await resultCard(g, p.ai, '🐜💥', `${esc(p.name)} stomps on the ant colony! The ants scatter${c.target && c.timer >= W.IRON.eggAfter ? ', and the egg on the vine is gone' : ''}.`, 'stomp');
      closeEncounter();
      log(`🐜 ${esc(p.name)} stomped out the colony on ${c.pos}.`);
    }
  }
  if (link) {
    await wait(g, 300);
    const fort = g.ironOn && link.type === 'wyrm' && link.fortified;
    setStage(link.type === 'vine' ? `🌿 ${esc(p.name)} found a vine!` : `${fort ? '⚙️ A fortified' : '🐲 A'} wyrm has ${esc(p.name)}!`, '');
    openEncounter(fort ? 'wyrm iron' : link.type);
    const solved = await puzzle(g, p, link);
    closeEncounter();
    if (link.type === 'vine' && solved) { log(`🌿 ${esc(p.name)} climbs the vine to ${link.to}!`); await slide(g, p, link.to); }
    if (link.type === 'wyrm' && !solved) { log(`🐲 ${esc(p.name)} slides down the wyrm to ${link.to}.`); await slide(g, p, link.to); }
    if (link.type === 'vine' && !solved) log(`${esc(p.name)}'s vine snapped.`);
    if (link.type === 'wyrm' && solved) log(`${esc(p.name)} shook off the wyrm!`);
    await wait(g, 400);
    if (g.forest) await forestChange(g, p, link, solved);
  }

  const others = g.players.filter(o => o !== p && o.pos === p.pos);
  if (others.length) await duel(g, p, others);
}

// ---------- Iron Wyrm: the world moves at the end of each round ----------
// A card that carries on by itself after a moment, but can be tapped to move on sooner.
function infoCard(g, emoji, text, sound) {
  if (sound) SFX.play(sound);
  setStage(`<div class="bigEmoji">${emoji}</div>`, `<div class="resultText">${text}</div>`);
  const row = el('div', 'actions'); const b = el('button', 'btn gold', 'Carry on ▶'); row.appendChild(b); stage().appendChild(row);
  return new Promise(res => {
    const t = setTimeout(res, DELAY.ai * 3.5 * speed());
    b.onclick = () => { clearTimeout(t); res(); };
  }).then(() => alive(g));
}

async function ironPhase(g) {
  const at = n => `square <b>${n}</b>`;
  const events = W.ironRound(g.board, g.iron, new Set(g.players.map(p => p.pos)));
  setStage('⚙️ The forest stirs…', '');
  // hunters stride across the board
  if (events.some(e => e.kind === 'hunter-move')) { placeTokens(); await wait(g, 500); }
  const fresh = new Set();
  const cards = [];
  for (const e of events) {
    switch (e.kind) {
      case 'colony':
        fresh.add(e.colony.id); log(`🐜 Vine-cutter ants moved in on ${e.colony.pos}.`);
        cards.push(['🐜', `A colony of vine-cutter ants moves in on ${at(e.colony.pos)}. Watch your vines!`, 'ants']); break;
      case 'ants-find': log(`🐜 The ants on ${e.colony.pos} have found the vine on ${e.vine.from}.`); break;
      case 'egg':
        log(`🥚 A wyrm laid an egg on the vine at ${e.vine.from}.`);
        cards.push(['🥚', `A wyrm has laid an egg on the vine at ${at(e.vine.from)}, and the ants are eating it! Climb it while you can.`, 'egg']); break;
      case 'hatch':
        fresh.add(e.wyrm.id); log(`⚙️ The vine on ${e.vine.from} became a fortified wyrm (${e.wyrm.from}→${e.wyrm.to}).`);
        cards.push(['🐣⚙️', `Crack! The vine on ${at(e.vine.from)} is gone, and a fortified wyrm hatches: from ${at(e.wyrm.from)} all the way down to ${at(e.wyrm.to)}!` +
          (e.sprouted ? ` Its sprout on ${at(e.sprouted.from)} shoots up to ${at(e.sprouted.to)}.` : ''), 'egg-hatch']); break;
      case 'ants-leave': log(`🐜 The ants on ${e.colony.pos} found nothing left to eat and marched off.`); break;
      case 'hunter-arrives': log('🏹 A new hunter has arrived.'); break;
      case 'hunter-colony':
        log(`🏹 A hunter destroyed the ant colony on ${e.colony.pos}.`);
        cards.push(['🏹🐜', `A hunter tramples the ant colony on ${at(e.colony.pos)}. The ants scatter!`, 'stomp']); break;
      case 'hunter-wins':
        fresh.add(e.tunnel.id); log(`🏹 A hunter beat the wyrm on ${e.wyrm.from}; it left a tunnel down to ${e.wyrm.to}.`);
        cards.push(['🏹🕳️', `A hunter fights the wyrm on ${at(e.wyrm.from)} and wins! It leaves a tunnel behind, straight down to ${at(e.wyrm.to)}. Mind your step!`, 'hunter-fight']); break;
      case 'hunter-eaten':
        fresh.add(e.wyrm.id); log(`🐲 The wyrm on ${e.wyrm.from} ate a hunter and is now fortified.`);
        cards.push(['😱⚙️', `A hunter attacks the wyrm on ${at(e.wyrm.from)}… and gets eaten! The wyrm falls asleep with a full belly, and grows iron plates.`, 'hunter-eaten']); break;
    }
  }
  drawLinks(g.board, fresh); placeTokens(); renderPlayers();
  for (const c of cards) {
    openEncounter('forest');
    await infoCard(g, ...c);
    closeEncounter();
  }
}

// ---------- Living forest ----------
async function forestChange(g, p, link, solved) {
  const avoid = new Set([...g.players.map(q => q.pos), ...(g.board.colonies || []).map(c => c.pos)]);
  const ev = W.forestEvent(g.board, link, solved, avoid, Math.random, g.players.map(q => q.pos));
  const at = n => `square <b>${n}</b>`;
  let card = null;
  if (ev.kind === 'fly') {
    // the wyrm lifts off the board and fades away
    const el0 = document.querySelector(`#links g[data-id="${link.id}"]`);
    if (el0) el0.classList.add('leaving');
    await wait(g, 900);
    drawLinks(g.board);
    card = ['🐉💨', `The wyrm on ${at(link.from)} has had enough of this place and flies away forever!`, 'wyrm-fly'];
    log(`🐉💨 The wyrm on ${link.from} flew away for good.`);
  } else if (ev.kind === 'wake') {
    drawLinks(g.board, new Set([ev.link.id]));
    card = ['😠', `The wyrm on ${at(link.from)} wakes up, grumbles, and slithers off to ${at(ev.link.from)}!`, 'wyrm-wake'];
    log(`😠 The wyrm moved from ${link.from} to ${ev.link.from} (drops to ${ev.link.to}).`);
  } else if (ev.kind === 'stay') {
    drawLinks(g.board);
    card = ['😴', `The wyrm on ${at(link.from)} wakes up, looks around, finds nowhere better, and goes back to sleep.`, null];
  } else if (ev.kind === 'sprout' && ev.link) {
    drawLinks(g.board, new Set([ev.link.id]));
    card = ['🌱', `A new sprout pops up on ${at(ev.link.from)}. Where will it grow?`, 'vine-sprout'];
    log(`🌱 A sprout appeared on ${ev.link.from}.`);
  } else if (ev.kind === 'grow' && ev.link) {
    drawLinks(g.board, new Set([ev.link.id]));
    card = ['🌱', `The sprout on ${at(ev.link.from)} is getting bigger…`, 'vine-sprout'];
  } else if (ev.kind === 'wither') {
    drawLinks(g.board, ev.link ? new Set([ev.link.id]) : new Set());
    card = ev.link
      ? ['🥀', `The old vine on ${at(link.from)} withers away… and the sprout on ${at(ev.link.from)} shoots all the way up to ${at(ev.link.to)}!`, 'vine-wither']
      : ['🥀', `The old vine on ${at(link.from)} withers away.`, 'vine-wither'];
    log(`🥀 The vine on ${link.from} withered${ev.link ? `; new vine ${ev.link.from}→${ev.link.to}` : ''}.`);
  } else {
    drawLinks(g.board);      // dozing wyrm / worn vine: just update the look
  }
  if (card) {
    openEncounter('forest');
    await resultCard(g, p.ai, card[0], card[1], card[2]);
    closeEncounter();
  }
}

// ---------- Vine / wyrm puzzle ----------
// Vine (heat): start at 0, roll and add on until you reach the target.
// Wyrm (cold): start at the target, roll and take away until you reach 0.
// Each sum gets one retry; a second wrong answer and the puzzle fails.
async function puzzle(g, p, link) {
  // A fortified wyrm (Iron Wyrm mode) is one level harder; above Adult it's the iron grip.
  const fort = g.ironOn && link.type === 'wyrm' && link.fortified;
  const L = fort ? W.fortifiedLevel(p.level) : W.levelById(p.level), T = L.target, heat = link.type === 'vine';
  let total = heat ? 0 : T;
  const colour = heat ? '#4caf50' : fort ? '#90a4ae' : '#ab47bc';
  const rollLabel = L.square ? 'a d20, square it,' : W.diceLabel(L.dice);
  const intro = heat
    ? `Grow the vine to <b>${T}</b> to climb up to square <b>${link.to}</b>. Roll ${W.diceLabel(L.dice)} and add it on!`
    : (fort ? `This wyrm is fortified with iron plates: it's a <b>${L.name}</b> puzzle! ` : '') +
      `The wyrm's grip is <b>${T}</b>. Roll ${rollLabel} and take it away until it reaches 0, or slide down to <b>${link.to}</b>!`;
  const title = heat ? `🌿 ${esc(p.name)} found a vine!` : `${fort ? '⚙️ A fortified' : '🐲 A'} wyrm has ${esc(p.name)}!`;
  // A player can stop the puzzle at any point: leave the vine, or let the wyrm have them.
  const stopLabel = heat ? '🏳️ Let the vine go' : '🏳️ Stop and slide down';
  const giveUp = async () => {
    log(`🏳️ ${esc(p.name)} stopped the puzzle.`);
    await resultCard(g, false, '🏳️', heat
      ? `${esc(p.name)} lets the vine go and stays on square ${link.from}.`
      : `${esc(p.name)} lets go and slides down to square ${link.to}.`, heat ? null : 'wyrm-slide');
    return false;
  };

  for (;;) {
    const pct = total / T;
    setStage(title, intro);
    addMsg(`<div class="meter"><div style="width:${Math.min(100, pct * 100)}%;background:${colour}"></div></div>` +
      (heat ? `Vine: <b>${total}</b> of ${T}` : `Grip: <b>${total}</b>`));
    const go = await choose(g, [{ label: `🎲 Roll ${W.diceLabel(L.dice)}`, value: 1, cls: heat ? 'vine' : 'wyrm' },
      ...(p.ai ? [] : [{ label: stopLabel, value: 0, cls: 'ghost small giveUp' }])], p.ai ? 1 : undefined);
    if (!go) return giveUp();
    const rolls = W.rollDice(L.dice);
    await showRoll(g, p.name, L.dice, rolls, rolled(p.name, rolls) + (L.square ? `<div class="rollSub">Now square it!</div>` : ''));
    // the iron grip squares the roll
    const sum = L.square ? rolls[0] * rolls[0] : rolls.reduce((a, b) => a + b, 0);

    if (!heat && sum >= total) {
      addMsg(`That's <b>${sum}</b>, enough to shake it off completely!`);
      await wait(g, 1100);
      await resultCard(g, p.ai, '😄', `${esc(p.name)} shook off the wyrm!`, 'wyrm-shake-off');
      return true;
    }
    const correct = heat ? total + sum : total - sum;
    const q = heat ? `${total} + ${rolls.join(' + ')} = ?` : L.square ? `${total} − ${rolls[0]}² = ?` : `${total} − ${rolls.join(' − ')} = ?`;
    addMsg(`<b style="font-size:1.3em">${q}</b>`);

    let right = false;
    for (let attempt = 0; attempt < 2 && !right; attempt++) {
      let ans;
      if (p.ai) {
        await wait(g, DELAY.ai + 300);
        ans = Math.random() < AI_ACCURACY ? correct : correct + (Math.random() < .5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3));
        addMsg(`${esc(p.name)} says <b>${ans}</b>.`);
      } else {
        if (p.input === 'quill' && typeof Quill !== 'undefined') {
          // how many digits the answer could need, so the quill offers enough boxes
          const most = heat ? T + (L.square ? 400 : L.dice.reduce((a, b) => a + b, 0)) : T;
          ans = await askQuill(g, `<b>${q}</b>`, correct, String(most).length);
        }
        // typing, or the player chose "Number pad" in the quill card
        if (ans === undefined) {
          ans = await askNumber(g, stopLabel);
          if (ans === null) return giveUp();
        }
      }
      right = ans === correct;
      SFX.play(right ? 'correct' : 'wrong');
      if (right) addMsg(`<span class="good">✔ Yes, ${correct}!</span>`);
      else if (attempt === 0) addMsg(`<span class="bad">✘ Not quite. Have another go!</span>`);
    }
    if (!right) {
      addMsg(`<span class="bad">✘ It was ${correct}.</span>`);
      await wait(g, 1300);
      await resultCard(g, p.ai, heat ? '😢' : '🐲', heat
        ? `The vine snapped! ${esc(p.name)} stays on square ${link.from}.`
        : `The wyrm drags ${esc(p.name)} down to square ${link.to}!`, heat ? 'vine-snap' : 'wyrm-slide');
      return false;
    }
    total = correct;
    await wait(g, 700);
    if (heat && total >= T) {
      addMsg(`The vine reaches ${T}!`);
      await wait(g, 900);
      await resultCard(g, p.ai, '🌿', `${esc(p.name)} climbs up to square ${link.to}!`, 'vine-climb');
      return true;
    }
  }
}

// ---------- Read-write-make duel ----------
// The challenger chooses whether to duel; the challenged player picks highest or lowest.
// One round: each player rolls a d10 three times, placing each digit before the next roll.
// The winner steps forward one square (no vine or wyrm triggers). A tie: no winner.
async function duel(g, p, others) {
  const names = others.map(o => esc(o.name)).join(' and ');
  setStage(`⚔️ ${esc(p.name)} meets ${names}!`, '');
  openEncounter('duel');
  setStage(`⚔️ ${esc(p.name)} landed on ${names}!`, 'Challenge to a read-write-make duel? The winner steps forward one square.');
  const opts = others.map(o => ({ label: `⚔️ Duel ${esc(o.name)}`, value: o, cls: 'gold' }));
  opts.push({ label: 'No thanks', value: null, cls: 'ghost' });
  const opp = await choose(g, opts, p.ai ? others[0] : undefined);
  if (!opp) {
    log(`🕊️ ${esc(p.name)} lets ${names} be.`);
    await resultCard(g, true, '🕊️', `${esc(p.name)} chose to keep the peace.`, 'peace');
    closeEncounter();
    return;
  }

  setStage(`⚔️ ${esc(p.name)} challenges ${esc(opp.name)}!`, `${esc(opp.name)}, you choose: does the <b>highest</b> or the <b>lowest</b> number win?`);
  const goal = await choose(g, [
    { label: '⬆️ Highest wins', value: 'highest', cls: 'gold' },
    { label: '⬇️ Lowest wins', value: 'lowest', cls: 'gold' }], opp.ai ? (Math.random() < .5 ? 'highest' : 'lowest') : undefined);
  log(`⚔️ ${esc(p.name)} duels ${esc(opp.name)}: ${goal} number wins.`);

  const duelists = [p, opp];
  const slots = [[null, null, null], [null, null, null]];

  const render = (title, activeIdx, digit, pickable) => {
    setStage(title, `<b>${goal === 'highest' ? '⬆️ Highest' : '⬇️ Lowest'}</b> number wins.`);
    const box = el('div', 'rwm');
    box.appendChild(el('div', 'rwmRow slotLabels', '<div class="who"></div><span>hundreds</span><span>tens</span><span>ones</span>'));
    const buttons = [];
    duelists.forEach((d, di) => {
      const row = el('div', 'rwmRow');
      const who = el('div', 'who', `<span style="color:${COLOURS[d.colour].c}">●</span> ${esc(d.name)}`);
      row.appendChild(who);
      slots[di].forEach((v, si) => {
        const canPick = pickable && di === activeIdx && v === null;
        const s = el(canPick ? 'button' : 'div', 'slot' + (v !== null ? ' filled' : '') + (canPick ? ' pick' : ''), v === null ? '' : v);
        if (canPick) { s.dataset.slot = si; buttons.push(s); }
        row.appendChild(s);
      });
      box.appendChild(row);
    });
    stage().appendChild(box);
    return buttons;
  };

  for (let round = 0; round < 3; round++) {
    for (let di = 0; di < 2; di++) {
      const d = duelists[di];
      render(`⚔️ ${esc(d.name)}'s roll`, di, null, false);
      await choose(g, [{ label: '🎲 Roll d10', value: 1, cls: 'gold' }], d.ai ? 1 : undefined);
      const digit = W.rollD10();
      await showRoll(g, d.name, [10], [digit], `${rolled(d.name, [digit])}<div class="rollSub">Where will it go?</div>`);
      let where;
      if (d.ai) {
        render(`⚔️ ${esc(d.name)} rolled ${an(digit)} ${digit}`, di, digit, false);
        await wait(g, DELAY.ai);
        where = W.aiPlace(slots[di], digit, goal);
      } else {
        const btns = render(`⚔️ ${esc(d.name)} rolled ${an(digit)} ${digit}`, di, digit, true);
        addMsg('Tap where the ' + digit + ' goes.');
        where = await new Promise(res => btns.forEach(b => b.onclick = () => res(+b.dataset.slot)));
        alive(g);
      }
      slots[di][where] = digit;
      SFX.play('digit-place');
    }
  }

  const res = W.rwmWinner(slots[0], slots[1], goal);
  const v0 = W.rwmValue(slots[0]), v1 = W.rwmValue(slots[1]);
  render('⚔️ The duel is over!', -1, null, false);
  addMsg(`${esc(p.name)}: <b>${v0}</b> · ${esc(opp.name)}: <b>${v1}</b>`);
  await wait(g, 1600);
  if (res < 0) {
    log(`It's a tie: ${v0} and ${v1}.`);
    await resultCard(g, p.ai && opp.ai, '🤝', `Both made ${v0}. A tie, no winner this time!`, 'duel-tie');
    closeEncounter();
    return;
  }
  const winner = duelists[res];
  log(`🏅 ${esc(winner.name)} wins the duel (${v0} vs ${v1}) and steps forward.`);
  await resultCard(g, p.ai && opp.ai, '🏅', `${esc(winner.name)} wins with ${W.rwmValue(slots[res])} against ${W.rwmValue(slots[1 - res])}, and steps forward!`, 'duel-win');
  closeEncounter();
  await walk(g, winner, Math.min(winner.pos + 1, W.SIZE));
  if (winner.pos >= W.SIZE) win(g, winner);
}

// ---------- End of game ----------
function win(g, p) {
  g.over = true;
  renderPlayers(); placeTokens();
  // Remember which levels each human name has now played (for unlocks).
  const played = store.get();
  g.players.filter(q => !q.ai).forEach(q => { const k = nameKey(q.name); played[k] = Math.max(played[k] || 0, +q.level); });
  store.set(played);
  log(`🏆 <b>${esc(p.name)} wins!</b>`);
  setStage(`🏆 ${esc(p.name)} wins!`, `Board code: <b>${g.board.code}</b>`);
  // Big winner's card in the middle
  openEncounter('win');
  SFX.play('game-win');
  const others = g.players.filter(q => q !== p).sort((a, b) => b.pos - a.pos);
  setStage(`<div class="bigEmoji">🏆</div>`,
    `<div class="resultText">${esc(p.name)} reaches square 100 and wins!</div>` +
    (others.length ? `<div class="standings">${others.map(q =>
      `<span><span style="color:${COLOURS[q.colour].c}">●</span> ${esc(q.name)}: square ${q.pos}</span>`).join('')}</div>` : '') +
    `<div class="codeLine">Board code: <b>${g.board.code}</b></div>`);
  const row = el('div', 'actions');
  const again = el('button', 'btn gold', '🔁 Same board again');
  again.onclick = () => startGame(g.board.code, g.players.map(({ pos, ...q }) => q), g.forest, g.ironOn);
  const fresh = el('button', 'btn', '🎲 New board');
  fresh.onclick = () => startGame(W.randomCode(), g.players.map(({ pos, ...q }) => q), g.forest, g.ironOn);
  const back = el('button', 'btn ghost', '↩ Setup');
  back.onclick = () => { G = null; closeEncounter(); $('#codeInput').value = W.randomCode(); show('setup'); renderSetup(); };
  row.append(again, fresh, back);
  stage().appendChild(row);
}

renderSetup();
// For tests and the browser console
window.WVGame = { get state() { return G; }, redraw() { if (G) { drawLinks(G.board); placeTokens(); } }, DELAY, setTestFactor(f) { testFactor = f; } };
})();
