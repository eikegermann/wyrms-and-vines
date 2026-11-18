// ---------- Wyrms & Vines: screens, turns, puzzles, duels ----------
(function () {
'use strict';
const W = window.WV;
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const COLOURS = [
  { c: '#1e88e5', n: 'Blue' }, { c: '#e53935', n: 'Red' }, { c: '#f9a825', n: 'Gold' }, { c: '#2e7d32', n: 'Green' },
  { c: '#8e24aa', n: 'Purple' }, { c: '#ef6c00', n: 'Orange' }, { c: '#00897b', n: 'Teal' }, { c: '#d81b60', n: 'Pink' }];
const AI_NAMES = ['Cinder', 'Sleet', 'Puff', 'Smoulder'];
const AI_ACCURACY = 0.88;                // chance a computer player gets a sum right
const DELAY = { ai: 750, step: 150, slide: 750 };

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
    const rm = el('button', 'btn small ghost', '✕'); rm.title = 'Remove player';
    rm.disabled = setup.players.length <= 1;
    rm.onclick = () => { setup.players.splice(i, 1); renderSetup(); };
    row.append(sw, name, lvl, type, rm);
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
$('#newCodeBtn').onclick = () => { $('#codeInput').value = W.randomCode(); };
$('#codeInput').value = W.randomCode();

$('#startBtn').onclick = () => {
  const ps = setup.players.map((p, i) => ({ ...p, name: p.name.trim() || ('Player ' + (i + 1)) }));
  let code = W.normaliseCode($('#codeInput').value);
  if (!code) { code = W.randomCode(); $('#codeInput').value = code; }
  startGame(code, ps);
};
$('#quitBtn').onclick = () => { G = null; show('setup'); renderSetup(); };

// ===================================================================
// Game
// ===================================================================
let G = null;
class Quit extends Error {}

function startGame(code, players) {
  const board = W.generateBoard(code);
  G = { board, players: players.map(p => ({ ...p, pos: 1 })), cur: 0, over: false };
  $('#codeShow').textContent = board.code;
  $('#log').innerHTML = '';
  $('#tokens').innerHTML = '';
  drawBoard(board);
  show('game');
  renderPlayers(); placeTokens();
  log(`New game on board <b>${board.code}</b>. ${board.vines.length} vines, ${board.wyrms.length} wyrms.`);
  const me = G;
  play(me).catch(e => { if (!(e instanceof Quit)) throw e; });
}

const alive = g => { if (G !== g) throw new Quit(); };
const wait = (g, ms) => new Promise(r => setTimeout(r, ms)).then(() => alive(g));

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

  const svg = $('#links'); svg.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
  const curve = (a, b, bend) => {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    return `M${a.x},${a.y} Q${mx - dy / len * bend},${my + dx / len * bend} ${b.x},${b.y}`;
  };
  board.vines.forEach((v, i) => {
    const a = cellCentre(v.from), b = cellCentre(v.to);
    const d = curve(a, b, i % 2 ? 3 : -3);
    mk('path', { d, fill: 'none', stroke: '#2e6b30', 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: .9 });
    const p = mk('path', { d, fill: 'none', stroke: '#66bb6a', 'stroke-width': 1.1, 'stroke-linecap': 'round' });
    mk('circle', { cx: a.x, cy: a.y, r: 2.2, fill: '#8d6e3f', stroke: '#2e6b30', 'stroke-width': .6 });
    mk('text', { x: b.x, y: b.y + 1.3, 'font-size': 4, 'text-anchor': 'middle' }).textContent = '🍃';
    const L = p.getTotalLength ? p.getTotalLength() : 0;
    for (let t = 4; t < L - 2; t += 5) {
      const pt = p.getPointAtLength(t);
      mk('ellipse', { cx: pt.x + ((t / 5) % 2 ? 1.2 : -1.2), cy: pt.y, rx: 1.3, ry: .7, fill: '#43a047', opacity: .95 });
    }
  });
  board.wyrms.forEach((w, i) => {
    const a = cellCentre(w.from), b = cellCentre(w.to);
    const d = curve(a, b, i % 2 ? 4 : -4);
    mk('path', { d, fill: 'none', stroke: '#5e1f70', 'stroke-width': 3.2, 'stroke-linecap': 'round', opacity: .85 });
    mk('path', { d, fill: 'none', stroke: '#c77ddb', 'stroke-width': 1.2, 'stroke-dasharray': '1.2 1.6', 'stroke-linecap': 'round', opacity: .9 });
    mk('circle', { cx: a.x, cy: a.y, r: 2.6, fill: '#7b2d91', stroke: '#3a1145', 'stroke-width': .5 });
    mk('circle', { cx: a.x - .9, cy: a.y - .5, r: .55, fill: '#ffeb3b' });
    mk('circle', { cx: a.x + .9, cy: a.y - .5, r: .55, fill: '#ffeb3b' });
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
const stage = () => $('#stage');
function setStage(title, msg) {
  stage().innerHTML = `<div class="title">${title}</div><div class="msg">${msg || ''}</div>`;
}
function addMsg(html) { stage().appendChild(el('div', 'msg', html)); }

// Show buttons; a computer player picks aiValue after a pause.
function choose(g, options, aiValue) {
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
    if (aiValue !== undefined) wait(g, DELAY.ai).then(() => resolve(aiValue), reject);
  }).then(v => { alive(g); return v; });
}

function askNumber(g) {
  const row = el('div', 'answer');
  const inp = el('input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = 'off'; inp.maxLength = 4;
  const ok = el('button', 'btn gold', 'Check');
  row.append(inp, ok);
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
  }).then(v => { alive(g); return v; });
}

async function showRoll(g, sidesList, values) {
  const box = el('div', 'dice');
  const dice = sidesList.map(s => { const d = el('div', 'die rolling', '?'); d.title = 'd' + s; box.appendChild(d); return d; });
  stage().appendChild(box);
  for (let k = 0; k < 6; k++) {
    dice.forEach((d, i) => { d.textContent = sidesList[i] === 10 ? Math.floor(Math.random() * 10) : 1 + Math.floor(Math.random() * sidesList[i]); });
    await wait(g, 60);
  }
  dice.forEach((d, i) => { d.classList.remove('rolling'); d.textContent = values[i]; });
}

// ---------- Movement ----------
async function walk(g, p, to) {
  while (p.pos !== to) {
    p.pos += to > p.pos ? 1 : -1;
    placeTokens();
    await wait(g, DELAY.step);
  }
  renderPlayers();
}
async function slide(g, p, to) {
  const toks = document.querySelectorAll('.token');
  toks.forEach(t => t.style.transition = `left ${DELAY.slide}ms ease, top ${DELAY.slide}ms ease`);
  p.pos = to; placeTokens(); renderPlayers();
  await wait(g, DELAY.slide + 100);
  toks.forEach(t => t.style.transition = '');
}

// ===================================================================
// Turn loop
// ===================================================================
async function play(g) {
  while (!g.over) {
    const p = g.players[g.cur];
    renderPlayers(); placeTokens();
    await turn(g, p);
    if (g.over) break;
    g.cur = (g.cur + 1) % g.players.length;
  }
}

async function turn(g, p) {
  setStage(`${p.ai ? '🤖 ' : ''}${esc(p.name)}'s turn`, `On square <b>${p.pos}</b>.`);
  await choose(g, [{ label: '🎲 Roll to move', value: 1, cls: 'gold' }], p.ai ? 1 : undefined);
  const r = W.rollDie(6);
  await showRoll(g, [6], [r]);
  const dest = Math.min(p.pos + r, W.SIZE);
  log(`${esc(p.name)} rolls ${r} and moves to ${dest}.`);
  await walk(g, p, dest);
  if (p.pos >= W.SIZE) return win(g, p);

  const link = g.board.starts.get(p.pos);
  if (link) {
    await wait(g, 300);
    const solved = await puzzle(g, p, link);
    if (link.type === 'vine' && solved) { log(`🌿 ${esc(p.name)} climbs the vine to ${link.to}!`); await slide(g, p, link.to); }
    if (link.type === 'wyrm' && !solved) { log(`🐲 ${esc(p.name)} slides down the wyrm to ${link.to}.`); await slide(g, p, link.to); }
    if (link.type === 'vine' && !solved) log(`${esc(p.name)}'s vine snapped.`);
    if (link.type === 'wyrm' && solved) log(`${esc(p.name)} shook off the wyrm!`);
    await wait(g, 400);
  }

  const others = g.players.filter(o => o !== p && o.pos === p.pos);
  if (others.length) await duel(g, p, others);
}

// ---------- Vine / wyrm puzzle ----------
// Vine (heat): start at 0, roll and add on until you reach the target.
// Wyrm (cold): start at the target, roll and take away until you reach 0.
// Each sum gets one retry; a second wrong answer and the puzzle fails.
async function puzzle(g, p, link) {
  const L = W.levelById(p.level), T = L.target, heat = link.type === 'vine';
  let total = heat ? 0 : T;
  const colour = heat ? '#4caf50' : '#ab47bc';
  const intro = heat
    ? `Grow the vine to <b>${T}</b> to climb up to square <b>${link.to}</b>. Roll ${W.diceLabel(L.dice)} and add it on!`
    : `The wyrm's grip is <b>${T}</b>. Roll ${W.diceLabel(L.dice)} and take it away until it reaches 0, or slide down to <b>${link.to}</b>!`;
  const title = heat ? `🌿 ${esc(p.name)} found a vine!` : `🐲 A wyrm has ${esc(p.name)}!`;

  for (;;) {
    const pct = total / T;
    setStage(title, intro);
    addMsg(`<div class="meter"><div style="width:${Math.min(100, pct * 100)}%;background:${colour}"></div></div>` +
      (heat ? `Vine: <b>${total}</b> of ${T}` : `Grip: <b>${total}</b>`));
    await choose(g, [{ label: `🎲 Roll ${W.diceLabel(L.dice)}`, value: 1, cls: heat ? 'vine' : 'wyrm' }], p.ai ? 1 : undefined);
    const rolls = W.rollDice(L.dice);
    await showRoll(g, L.dice, rolls);
    const sum = rolls.reduce((a, b) => a + b, 0);

    if (!heat && sum >= total) {
      addMsg(`You rolled <b>${sum}</b>, that's enough to shake it off completely!`);
      await wait(g, 1300);
      return true;
    }
    const correct = heat ? total + sum : total - sum;
    const q = heat ? `${total} + ${rolls.join(' + ')} = ?` : `${total} − ${rolls.join(' − ')} = ?`;
    addMsg(`<b style="font-size:1.3em">${q}</b>`);

    let right = false;
    for (let attempt = 0; attempt < 2 && !right; attempt++) {
      let ans;
      if (p.ai) {
        await wait(g, DELAY.ai + 300);
        ans = Math.random() < AI_ACCURACY ? correct : correct + (Math.random() < .5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3));
        addMsg(`${esc(p.name)} says <b>${ans}</b>.`);
      } else {
        ans = await askNumber(g);
      }
      right = ans === correct;
      if (right) addMsg(`<span class="good">✔ Yes, ${correct}!</span>`);
      else if (attempt === 0) addMsg(`<span class="bad">✘ Not quite. Have another go!</span>`);
    }
    if (!right) {
      addMsg(`<span class="bad">✘ It was ${correct}.</span> ${heat ? 'The vine snaps!' : 'The wyrm drags you down!'}`);
      await wait(g, 1700);
      return false;
    }
    total = correct;
    await wait(g, 700);
    if (heat && total >= T) {
      addMsg(`🌿 The vine reaches ${T}. Up you go!`);
      await wait(g, 1000);
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
  setStage(`⚔️ ${esc(p.name)} landed on ${names}!`, 'Challenge to a read-write-make duel? The winner steps forward one square.');
  const opts = others.map(o => ({ label: `⚔️ Duel ${esc(o.name)}`, value: o, cls: 'gold' }));
  opts.push({ label: 'No thanks', value: null, cls: 'ghost' });
  const opp = await choose(g, opts, p.ai ? others[0] : undefined);
  if (!opp) { log(`${esc(p.name)} lets ${names} be.`); return; }

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
    box.appendChild(el('div', 'slotLabels', '<span>hundreds</span><span>tens</span><span>ones</span>'));
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
      await showRoll(g, [10], [digit]);
      let where;
      if (d.ai) {
        render(`⚔️ ${esc(d.name)} rolled ${digit}`, di, digit, false);
        await wait(g, DELAY.ai);
        where = W.aiPlace(slots[di], digit, goal);
      } else {
        const btns = render(`⚔️ ${esc(d.name)} rolled ${digit}`, di, digit, true);
        addMsg('Tap where the ' + digit + ' goes.');
        where = await new Promise(res => btns.forEach(b => b.onclick = () => res(+b.dataset.slot)));
        alive(g);
      }
      slots[di][where] = digit;
    }
  }

  const res = W.rwmWinner(slots[0], slots[1], goal);
  const v0 = W.rwmValue(slots[0]), v1 = W.rwmValue(slots[1]);
  render('⚔️ The duel is over!', -1, null, false);
  if (res < 0) {
    addMsg(`Both made <b>${v0}</b>. A tie, no winner this time!`);
    log(`It's a tie: ${v0} and ${v1}.`);
    await choose(g, [{ label: 'Carry on', value: 1 }], p.ai && opp.ai ? 1 : undefined);
    return;
  }
  const winner = duelists[res];
  addMsg(`${esc(winner.name)} wins with <b>${W.rwmValue(slots[res])}</b> against ${W.rwmValue(slots[1 - res])}, and steps forward!`);
  log(`🏅 ${esc(winner.name)} wins the duel (${v0} vs ${v1}) and steps forward.`);
  await choose(g, [{ label: 'Carry on', value: 1 }], p.ai && opp.ai ? 1 : undefined);
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
  setStage(`🏆 ${esc(p.name)} reaches square 100 and wins!`, `Board code: <b>${g.board.code}</b>`);
  const row = el('div', 'actions');
  const again = el('button', 'btn gold', '🔁 Same board again');
  again.onclick = () => startGame(g.board.code, g.players.map(({ pos, ...q }) => q));
  const fresh = el('button', 'btn', '🎲 New board');
  fresh.onclick = () => startGame(W.randomCode(), g.players.map(({ pos, ...q }) => q));
  const back = el('button', 'btn ghost', '↩ Setup');
  back.onclick = () => { G = null; $('#codeInput').value = W.randomCode(); show('setup'); renderSetup(); };
  row.append(again, fresh, back);
  stage().appendChild(row);
}

renderSetup();
// For tests and the browser console
window.WVGame = { get state() { return G; }, DELAY };
})();
