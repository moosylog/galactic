/* (c) 2026 Moosy Research. All rights reserved.
   Headless harness: runs the real game code against stubbed browser APIs (shared by the balance simulation and the tests). */
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const read = f => { let t = fs.readFileSync(path.join(ROOT, f), 'utf8'); if (process.env.NOSNAKE) t = t.replace('STATE.snakeWave = (STATE.wave % 4 === 2 && !STATE.challenge);', 'STATE.snakeWave = false;'); return t; };

function makeEnv(diff, store = {}) {
  let hadDiv = false; try { hadDiv = !!JSON.parse(store.galactic_prefs || '{}').div; } catch (e) {}   // read before the game's own start-up code runs
  let clock = 1000, raf = null, timers = [], listeners = {};
  const mk = (init = {}) => {
    const props = { style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, value: '', checked: false, textContent: '', innerHTML: '', children: [], ...init };
    return new Proxy(function () {}, {
      get: (t, k) => k in props ? props[k] : (k === Symbol.toPrimitive ? () => 0 : mk()),
      set: (t, k, v) => { props[k] = v; return true; }, apply: () => mk(), construct: () => mk()
    });
  };
  const els = {};
  const byId = id => els[id] || (els[id] = mk(
    id === 'game-canvas' || id === 'bg-canvas' ? { width: 1280, height: 800 } :
    id === 'hwSelect' ? { value: 'go60' } : id === 'layoutSelect' ? { value: 'qwerty' } :
    id === 'diffSelect' ? { value: diff } : id === 'chk-textassistant' ? { checked: true } : {}));
  const FakeDate = class extends Date { static now() { return clock; } };
  const win = { location: { reload() { win.reloaded = true; } }, innerWidth: 1280, innerHeight: 800, addEventListener: (t, f) => { (listeners['w' + t] = listeners['w' + t] || []).push(f); }, AudioContext: function () { return mk(); } };
  const ctx = {
    console, Math, JSON, Object, Array, String, Number, Set, Map, Promise, Symbol, Proxy, Date: FakeDate,
    window: win, navigator: { clipboard: null },
    document: { getElementById: byId, querySelector: () => mk(), querySelectorAll: () => [], createElement: () => mk(), body: mk(),
      addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); } },
    performance: { now: () => clock }, requestAnimationFrame: f => { raf = f; },
    setTimeout: (f, ms) => { timers.push({ at: clock + ms, f }); return timers.length; }, clearTimeout() {},
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    fetch: () => Promise.reject(new Error('offline')), alert() {}, confirm: () => true
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  if (process.env.WORDS) store['galactic-dict-v1'] = fs.readFileSync(process.env.WORDS, 'utf8');
  for (const f of ['js/config.js', 'js/entities.js', 'js/main.js']) vm.runInContext(read(f), ctx, { filename: f });
  // the start screen restores the saved division on load; a fresh browser has none, so choose the requested one
  if (diff && !hadDiv) vm.runInContext(`setDivision(${JSON.stringify(diff)})`, ctx);
  vm.runInContext(`function botKey(acc) {
    const W = canvas.width, H = canvas.height; let expected = null, think = 0;
    if (STATE.bossRef && STATE.bossRef.active) {
      if (STATE.bossRef.state === 'idle') expected = STATE.bossRef.word[STATE.bossRef.typedIndex];
      else if (STATE.bossRef.state !== 'shielded') return null;
    }
    if (!expected && STATE.currentTarget) {
      const n = enemies.find(e => e.wordId === STATE.currentTarget.wordId && e.index === STATE.currentTarget.index && e.active && !e.targeted);
      if (n) expected = n.char;
    }
    if (!expected) {
      let starts = enemies.filter(e => !e.isBoss && e.index === 0 && e.active && !e.targeted && e.x > 0 && e.x < W && e.y > 0);
      const plain = starts.filter(e => e.state !== 'ufo'); if (plain.length) starts = plain;
      starts.sort((a, b) => b.y - a.y);
      if (starts[0]) { expected = starts[0].char; think = 350; }
    }
    if (!expected) return null;
    expected = expected.toLowerCase();
    let key = expected;
    if (Math.random() > acc) { const ks = Object.keys(STATE.activeKeys).filter(k => /^[a-z]$/.test(k) && k !== expected); key = ks[Math.floor(Math.random() * ks.length)]; }
    return { key, think };
  }`, ctx);
  const press = key => (listeners.keydown || []).forEach(f => f({ key, code: 'Key' + key.toUpperCase(), repeat: false, preventDefault() {}, ctrlKey: false, target: {} }));
  const step = () => {
    clock += 16;
    timers = timers.filter(t => { if (t.at <= clock) { t.f(); return false; } return true; });
    const cb = raf; raf = null; if (cb) cb(clock);
  };
  return { ctx, step, press, now: () => clock, run: f => vm.runInContext(f, ctx), store };
}


module.exports = { makeEnv };
