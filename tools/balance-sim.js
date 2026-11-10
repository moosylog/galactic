/* (c) 2026 Moosy Research. All rights reserved.
   Headless balance simulation: runs the real game code with a scripted typist and reports survival and score.
   Usage: node tools/balance-sim.js [runsPerProfile] [maxSeconds]   (set WORDS=/path/to/list.txt to use a bigger word list) */
const { makeEnv } = require('./harness');
const RUNS = +process.argv[2] || 3, MAX_S = +process.argv[3] || 600;
function play(diff, wpm, acc) {
  const env = makeEnv(diff);
  env.run('startGame()');
  const gap = 60000 / (wpm * 5); let nextKey = env.now() + 500, ticks = 0, minHull = 100, snakeSeen = 0;
  const maxTicks = MAX_S * 1000 / 16;
  while (env.run('STATE.active') && ticks++ < maxTicks) {
    env.step();
    if (ticks % 30 === 0) { minHull = Math.min(minHull, env.run('STATE.hull')); snakeSeen = Math.max(snakeSeen, env.run('snakes.length')); }
    if (env.now() >= nextKey && !env.run('STATE.isHyperspace')) {
      const r = env.run(`botKey(${acc})`);
      if (r) { env.press(r.key); nextKey = env.now() + gap * (0.75 + Math.random() * 0.5) + r.think; }
      else nextKey = env.now() + 80;
    }
  }
  const dead = !env.run('STATE.active');
  const out = env.run('({ wave: STATE.wave, score: STATE.score, maxCombo: STATE.maxCombo, wpm: STATE.currentWPM, hull: STATE.hull, acc: STATE.totalKeystrokes ? Math.round(100 * STATE.correctKeystrokes / STATE.totalKeystrokes) : 100 })');
  return { ...out, snakeSeen, minHull, secs: Math.round((env.now() - 1000) / 1000), dead };
}

const profiles = process.env.WEAK ? [['academy', 10, 0.75, 'weak 10 wpm 75%'], ['apex', 30, 0.85, 'weak 30 wpm 85%'], ['apex', 140, 0.995, 'pro 140 wpm 99.5%']] : [
  ['academy', 15, 0.88, 'beginner 15 wpm 88%'], ['academy', 30, 0.94, 'casual 30 wpm 94%'], ['academy', 50, 0.96, 'good 50 wpm 96%'],
  ['contender', 30, 0.94, 'casual 30 wpm 94%'], ['contender', 50, 0.96, 'good 50 wpm 96%'], ['contender', 80, 0.97, 'fast 80 wpm 97%'],
  ['apex', 50, 0.96, 'good 50 wpm 96%'], ['apex', 80, 0.97, 'fast 80 wpm 97%'], ['apex', 110, 0.98, 'elite 110 wpm 98%'], ['apex', 140, 0.995, 'pro 140 wpm 99.5%']
];
if (!process.env.COUNTS) console.log('level      typist                  survived  wave  score(avg)  combo  minHull  snakes died');
for (const [d, w, a, label] of (process.env.COUNTS ? [] : profiles)) {
  const rs = []; for (let i = 0; i < RUNS; i++) rs.push(play(d, w, a));
  const avg = k => Math.round(rs.reduce((s, r) => s + r[k], 0) / rs.length);
  console.log(d.padEnd(10), label.padEnd(23), (avg('secs') + 's').padEnd(9), String(avg('wave')).padEnd(5), String(avg('score')).padEnd(11), String(avg('maxCombo')).padEnd(6), String(avg('minHull')).padEnd(8), String(avg('snakeSeen')).padEnd(7), rs.filter(r => r.dead).length + '/' + rs.length);
}

// COUNTS=1 node tools/balance-sim.js : peak number of letters on screen per wave for a 50 wpm typist (compare game versions with ROOT=...)
if (process.env.COUNTS) {
  const env = makeEnv('contender'); env.run('startGame()');
  const peak = {}, seen = {}; let shifts = 0, ticks = 0, nextKey = env.now() + 500;
  while (env.run('STATE.active') && ticks++ < 40000) {
    env.step();
    const w = env.run('STATE.wave'); const n = env.run("enemies.filter(e => e.state !== 'ufo' && !e.isBoss).length");
    peak[w] = Math.max(peak[w] || 0, n);
    if (ticks % 5 === 0) { const rows = JSON.parse(env.run('STATE.hLayout ? JSON.stringify(STATE.hLayout.rows) : "{}"')); for (const k in rows) { if (seen[k] === undefined) seen[k] = rows[k].x; else if (Math.abs(seen[k] - rows[k].x) > 0.5) { shifts++; seen[k] = rows[k].x; } } }
    if (env.now() >= nextKey && !env.run('STATE.isHyperspace')) { const r = env.run('botKey(0.96)'); if (r) { env.press(r.key); nextKey = env.now() + 240 * (0.75 + Math.random() * 0.5) + r.think; } else nextKey = env.now() + 80; }
    if (w >= 13) break;
  }
  console.log('word-row position shifts while words were on screen:', shifts);
  console.log('peak letters on screen by wave:', Object.entries(peak).map(([w, n]) => w + ':' + n).join('  '));
}
