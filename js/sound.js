// ---------- Wyrms & Vines: sound effects ----------
// Plays files from the sounds/ folder (see sounds/README.md for the list and names).
// Missing files are simply skipped, so the game works with any number of sounds, or none.
// Up to three takes per sound: name.mp3, name-2.mp3, name-3.mp3; one is picked at random.
(function (root) {
'use strict';

const NAMES = [
  'dice-shake', 'dice-land', 'step', 'game-start', 'game-win',
  'vine-rustle', 'vine-climb', 'vine-snap',
  'wyrm-hiss', 'wyrm-shake-off', 'wyrm-slide',
  'correct', 'wrong',
  'duel-start', 'digit-place', 'duel-win', 'duel-tie', 'peace',
];
const TAKES = ['', '-2', '-3'];
const KEY = 'wyrms-and-vines.sound';

let enabled = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } })();
const AC = root.AudioContext || root.webkitAudioContext;
// Web Audio works best on the iPad (no per-sound unlocking), but needs the game served over http(s).
const webAudio = !!AC && /^https?:/.test(location.protocol);
let ctx = null;
const buffers = {};                 // name -> [AudioBuffer]
const missing = new Set();          // file urls that failed (fallback mode)

function decode(ab) { return new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)); }
function loadAll() {
  NAMES.forEach(name => TAKES.forEach(take => {
    fetch(`sounds/${name}${take}.mp3`)
      .then(r => r.ok ? r.arrayBuffer() : Promise.reject())
      .then(decode)
      .then(buf => { (buffers[name] = buffers[name] || []).push(buf); })
      .catch(() => { /* this take doesn't exist */ });
  }));
}
// Browsers only allow sound after the first tap or key press.
function unlock() {
  if (!webAudio) return;
  if (!ctx) { ctx = new AC(); loadAll(); }
  if (ctx.state === 'suspended') ctx.resume();
}
['pointerdown', 'keydown', 'touchend'].forEach(ev => document.addEventListener(ev, unlock, { passive: true }));

function play(name, volume = 1) {
  if (!enabled) return;
  if (webAudio) {
    const list = ctx && buffers[name];
    if (!list || !list.length) return;
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    const gain = ctx.createGain(); gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    src.start();
    return;
  }
  // Fallback (game opened as a file): plain audio elements, first take only.
  const url = `sounds/${name}.mp3`;
  if (missing.has(url)) return;
  const a = new Audio(url); a.volume = volume;
  a.onerror = () => missing.add(url);
  a.play().catch(() => {});
}

function setEnabled(on) {
  enabled = on;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* storage unavailable */ }
  if (on) unlock();
}

root.WVSound = { NAMES, play, setEnabled, get enabled() { return enabled; }, get loaded() { return Object.keys(buffers); } };
})(window);
