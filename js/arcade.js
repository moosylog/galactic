/* © 2026 Moosy Research. All rights reserved. */
// Arcade mode: an optional bonus fight made of two full shoot-'em-up levels.
//
// How it starts: shoot the purple ARCADE drone (type its letter). The game freezes and asks "ARCADE MODE  Y or N".
//   N (or nothing you can do about it later): the drone is gone and the typing game carries on exactly where it was.
//   Y: the keyboard, the letters and the word display disappear and you fly a ship (arrows or WASD, Space fires, Enter = EMP smart bomb).
//
// The typing game is FROZEN the whole time (its wave clock and WPM clock are paused, see gameLoop in main.js), so nothing can hurt your run while you play.
// The price of the gamble: every ship you lose costs a little health (never below 1%). The reward: points, and a heal plus EMP charge if you clear both levels.
//
//   LEVEL 1  SWARM ASSAULT  Enemies swoop in on curved paths and settle into a swaying formation. Then they break off, loop and dive at you
//                           and drop bombs. Commanders take two hits, bring escorts and fire aimed bolts. Killing a diver scores double.
//   LEVEL 2  CRAWLER STRIKE A long crawler snakes down through a field of mushrooms. Every segment you shoot turns into a mushroom and splits the snake.
//                           A spider scuttles through your zone and saucers fly over dropping bombs.
const ARC = {
    INVULN_MS: 2200, RESPAWN_MS: 900,   // safe time after a respawn (ships per flight and health lost per ship depend on the division, see DIFF)
    ASK_GRACE: 700,                // ms before Y or N count, so a letter you were still typing cannot answer the question
    TOP_SPEED: 560, MARGIN: 48, ZONE_TOP: 0.58,   // ship speed (px/s at scale 1), side margin, and how high up the ship may fly (share of the screen height)
    FIRE_COOL: 150, MAX_SHOTS: 12, SHOT_SPEED: 1100,
    CLEAR_BONUS: 1000, PERFECT_BONUS: 1500,       // per level (the clear bonus is multiplied by the level number); perfect = no ship lost in that level
    FINISH_HEAL: 20, FINISH_EMP: 50,              // reward for clearing both levels: health % and EMP charge %
    PTS: { bee: 80, fly: 120, cmd: 250, seg: 50, head: 150, spider: 300, saucer: 200, shroom: 5 },   // before the score multiplier and the difficulty modifier
    DIVE_BONUS: 2,                // a swarm enemy shot while it dives scores this many times its normal points
    LEVELS: 2, NAMES: ['SWARM ASSAULT', 'CRAWLER STRIKE'],
    // how hard each division is: bomb rate, dive/spider rate, speed
    // Academy is the gentle one: slow, few bombs, no aimed bolts, a smaller swarm and a shorter snake, 5 ships, and a lost ship costs only 5% health.
    DIFF: {
        academy: { bomb: 0.4, dive: 0.45, speed: 0.75, lives: 5, hull: 5, aimed: false, rows: 3, segs: 8, shrooms: 10 },
        contender: { bomb: 1, dive: 1, speed: 1, lives: 3, hull: 10, aimed: true, rows: 4, segs: 12, shrooms: 16 },
        apex: { bomb: 1.45, dive: 1.4, speed: 1.15, lives: 3, hull: 10, aimed: true, rows: 4, segs: 12, shrooms: 16 }
    }
};

function freshArcade() {
    return { on: false, asking: false, askAge: 0, phase: 'off', pt: 0, lt: 0, level: 0, keys: {}, fireQueued: false,
        shots: [], foes: [], bombs: [], shrooms: [], form: { sway: 0, breath: 1 }, total: 0,
        x: 0, y: 0, vx: 0, vy: 0, cool: 0, lives: 0, dead: 0, invuln: 0, hurt: 0, totalHurt: 0, kills: 0, earned: 0,
        guarantee: false, wave: 0, age: 0, flash: 0, trail: [], trailT: 0,
        bombT: 0, diveT: 0, spiderT: 0, saucerT: 0, wraps: 0, complete: false, pendingSpawn: false };
}

// true while arcade owns the screen: the question is open or the flight is on. The typing game is frozen then.
function arcadeAsking() { return !!(STATE.arcade && STATE.arcade.asking); }
function arcadeFrozen() { return !!(STATE.arcade && (STATE.arcade.asking || STATE.arcade.on)); }

// bosses, rescues, snake waves and hyperspace do not mix with free flying
function arcadeBlocked() { return !!(STATE.bossRef || (STATE.hostages && STATE.hostages.active) || STATE.snakeWave || STATE.isHyperspace); }

// ---------- small helpers ----------
const arcRand = (a, b) => a + Math.random() * (b - a);
const arcDiff = () => ARC.DIFF[STATE.difficulty || 'contender'] || ARC.DIFF.contender;
function arcF() { const sf = STATE.sf, W = canvas.width, H = canvas.height; return { sf, W, H, zoneTop: H * ARC.ZONE_TOP, yMax: H - 36 * sf }; }
function arcAngDiff(a, b) { const d = b - a; return Math.atan2(Math.sin(d), Math.cos(d)); }
function arcSfx(f0, f1, dur, type, vol) {   // a tiny one-shot blip, silent when audio is not running
    try {
        if (typeof actx === 'undefined' || !actx) return;
        const t0 = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'square';
        o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
        g.gain.setValueAtTime(vol || 0.07, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
}
function arcPoints(base) { return Math.floor(base * STATE.scoreMultiplier * DATA.DIFFICULTY[STATE.difficulty || 'contender'].scoreMod); }

// ---------- the pickup ----------
// the pickup is rare: at most one per wave, roughly once every 40 s of play
function maybeSpawnArcadeDrone(dt) {
    const A = STATE.arcade;
    if (!STATE.active || STATE.wave < 2 || A.on || A.asking || A.wave === STATE.wave || arcadeBlocked()) return;
    if (bonusDrones.some(b => b.kind === 'arcade')) return;
    if (A.guarantee || Math.random() < 0.0004 * (dt / 16)) {
        bonusDrones.push(new BonusDrone(false, 'arcade')); A.wave = STATE.wave; A.guarantee = false;
        AudioFX.arcade(); createPopText('ARCADE DRONE!  TYPE ITS LETTER', canvas.width / 2, canvas.height / 2 - 100 * STATE.sf, '#bc13fe');
    }
}

// the drone was shot: freeze everything and ask
function arcadeCollected() {
    const A = STATE.arcade;
    if (arcadeBlocked() || A.on || A.asking) { createPopText('ARCADE DRONE LOST', canvas.width / 2, canvas.height / 2 - 60 * STATE.sf, '#bc13fe'); return; }
    A.asking = true; A.askAge = 0; A.keys = {}; A.fireQueued = false;
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}   // a focused button would eat Space
    AudioFX.arcade();
}

function answerArcade(yes) {
    const A = STATE.arcade; if (!A.asking) return;
    A.asking = false;
    if (yes) startArcade(); else createPopText('ARCADE SKIPPED', canvas.width / 2, canvas.height / 2 - 60 * STATE.sf, '#bc13fe');
}

function startArcade() {
    const A = STATE.arcade, F = arcF();
    A.on = true; A.asking = false; A.keys = {}; A.fireQueued = false; A.shots = []; A.bombs = []; A.foes = []; A.shrooms = [];
    A.lives = A.maxLives = arcDiff().lives; A.kills = 0; A.earned = 0; A.totalHurt = 0; A.complete = false;
    A.vx = 0; A.vy = 0; A.age = 0; A.flash = 0; A.trail = []; A.trailT = 0; A.dead = 0; A.invuln = 0; A.cool = 0;
    A.x = F.W / 2; A.y = F.yMax;
    bonusDrones = [];                // drones carry a letter, so none stay on screen
    STATE.currentTarget = null;      // no half-typed word while the keyboard is gone
    AudioFX.arcade();
    startIntro(1);
}

function endArcade(why) {
    const A = STATE.arcade; if (!A.on) return;
    A.on = false; A.phase = 'off'; A.keys = {}; A.shots = []; A.bombs = []; A.foes = []; A.shrooms = []; A.fireQueued = false;
    createPopText((why || 'ARCADE OVER') + (A.kills ? '  ' + A.kills + ' HIT' + (A.kills > 1 ? 'S' : '') + '  +' + A.earned : ''), canvas.width / 2, canvas.height / 2 - 60 * STATE.sf, '#00f3ff');
    updateUI();
    if (A.pendingSpawn) { A.pendingSpawn = false; spawnWave(); }   // a wave that came due while we were away starts now
}

// ---------- keyboard ----------
// Returns true when the key press is consumed here. Releases are always processed so a key can never stay stuck.
const ARC_DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
function arcadeKey(e, down) {
    const A = STATE.arcade; if (!A) return false;
    const dir = ARC_DIRS[e.key];
    if (!down) {
        if (dir) { A.keys[dir] = false; if (A.on && e.preventDefault) e.preventDefault(); }
        if (e.code === 'Space') { A.keys.fire = false; if ((A.on || A.asking) && e.preventDefault) e.preventDefault(); }
        return false;
    }
    if (!STATE.active || STATE.paused) return false;
    if (e.key === 'Escape') return false;               // pause still works
    if (A.asking) {                                     // the question: only Y and N do anything, every other key is swallowed
        if (e.preventDefault) e.preventDefault();
        if (!e.repeat && A.askAge >= ARC.ASK_GRACE) {
            const k = String(e.key).toLowerCase();
            if (k === 'y') answerArcade(true); else if (k === 'n') answerArcade(false);
        }
        return true;
    }
    if (!A.on) return false;
    if (dir) { A.keys[dir] = true; e.preventDefault(); return true; }
    if (e.code === 'Space') { A.keys.fire = true; A.fireQueued = true; e.preventDefault(); return true; }
    if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) arcadeEmp(); return true; }   // the EMP charge works as a smart bomb in here
    return true;                                        // the keyboard is removed: letters do nothing
}

// EMP in arcade: wipes every bomb and hits every enemy on screen once
function arcadeEmp() {
    const A = STATE.arcade;
    if (A.phase !== 'play' || A.dead > 0 || STATE.emp < 100) return;
    STATE.emp = 0; UI.empContainer.classList.remove('emp-ready'); UI.empFill.style.width = '0%';
    document.body.classList.add('emp-flash'); setTimeout(() => document.body.classList.remove('emp-flash'), 800);
    createPopText('EMP!', canvas.width / 2, canvas.height / 2, '#bc13fe'); AudioFX.explode();
    A.bombs = [];
    for (const e of A.foes.slice()) if (e.hp > 0 && e.state !== 'wait') arcHit(e);
}

// ---------- levels ----------
function startIntro(n) {
    const A = STATE.arcade;
    A.level = n; A.phase = 'intro'; A.pt = 0; A.foes = []; A.bombs = []; A.shrooms = [];
    arcSfx(300, 900, 0.3, 'square', 0.08);
}

function beginLevel() {
    const A = STATE.arcade, D = arcDiff();
    A.phase = 'play'; A.pt = 0; A.lt = 0; A.hurt = 0; A.foes = []; A.bombs = []; A.shrooms = [];
    A.bombT = 1500; A.diveT = 0; A.spiderT = 6000; A.saucerT = 10000; A.wraps = 0;
    if (A.level === 1) buildSwarm(); else buildCrawler();
    A.total = A.foes.filter(e => e.core).length;
    void D;
}

function levelClear() {
    const A = STATE.arcade;
    for (const e of A.foes) if (e.hp > 0 && !e.core) { createExplosion(e.x, e.y, e.color); e.hp = 0; }   // spiders and saucers leave with the level
    A.foes = []; A.bombs = [];
    const perfect = A.hurt === 0, bonus = arcPoints(ARC.CLEAR_BONUS * A.level), extra = perfect ? arcPoints(ARC.PERFECT_BONUS) : 0;
    STATE.score += bonus + extra; A.earned += bonus + extra; updateUI();
    A.phase = 'clear'; A.pt = 0; A.clearBonus = bonus; A.clearPerfect = perfect ? extra : 0;
    AudioFX.perfect();
}

function finishArcade(complete) {
    const A = STATE.arcade;
    A.complete = complete; A.phase = complete ? 'done' : 'over'; A.pt = 0; A.foes = []; A.bombs = [];
    if (complete) { STATE.hull = Math.min(100, STATE.hull + ARC.FINISH_HEAL); addEmpCharge(ARC.FINISH_EMP); updateUI(); AudioFX.rescue(); }
}

function hurtShip() {
    const A = STATE.arcade, sf = STATE.sf;
    if (A.phase !== 'play' || A.dead > 0 || A.invuln > 0) return;
    A.lives--; A.hurt++; A.totalHurt++;
    createExplosion(A.x, A.y, '#00f3ff'); createExplosion(A.x, A.y, '#ff2f6d'); AudioFX.explode(); AudioFX.error(); shakeBody(260);
    STATE.hull = Math.max(1, STATE.hull - arcDiff().hull); updateUI();
    createPopText('SHIP LOST  -' + arcDiff().hull + '% HEALTH', A.x, A.y - 50 * sf, '#ff0055');
    A.vx = A.vy = 0; A.shots = []; A.keys.fire = false;
    if (A.lives <= 0) { A.dead = 1e9; finishArcade(false); } else A.dead = ARC.RESPAWN_MS;
}

function respawnShip() {
    const A = STATE.arcade, F = arcF();
    A.x = F.W / 2; A.y = F.yMax; A.vx = A.vy = 0; A.age = 0; A.invuln = ARC.INVULN_MS; A.bombs = []; A.trail = [];
}

// ---------- scoring ----------
// one hit on an enemy; at zero hit points it is destroyed
function arcHit(e) {
    e.hp--; e.hitT = 120;
    if (e.hp > 0) { if (e.type === 'cmd') e.color = '#4aa8ff'; arcSfx(500, 250, 0.08, 'square', 0.06); return; }
    const A = STATE.arcade, sf = STATE.sf;
    let base = e.type === 'seg' ? (e.head ? ARC.PTS.head : ARC.PTS.seg) : ARC.PTS[e.type];
    const diving = e.state === 'dive' && e.hold <= 0;
    if (diving) base *= ARC.DIVE_BONUS;
    const pts = arcPoints(base);
    STATE.score += pts; A.earned += pts; A.kills++;
    createExplosion(e.x, e.y, e.color); AudioFX.explode();
    createPopText('+' + pts + (diving ? ' DIVE!' : ''), e.x, e.y - 22 * sf, diving ? '#00f3ff' : '#ffea00');
    if (e.type === 'seg') arcMushroomAt(e);
    updateUI();
}
function arcKillQuiet(e) { e.hp = 0; createExplosion(e.x, e.y, e.color); AudioFX.explode(); }   // rammed the ship: no points

// ================= LEVEL 1: SWARM ASSAULT =================
function buildSwarm() {
    const A = STATE.arcade, sf = STATE.sf;
    const group = (row, kind, c0, c1) => { const g = []; for (let c = c0; c <= c1; c++) g.push({ kind, row, col: c }); return g; };
    // seven groups of four fly in from alternating sides; the commanders arrive last
    const groups = [group(1, 'fly', 0, 3), group(1, 'fly', 4, 7), group(2, 'bee', 0, 3), group(2, 'bee', 4, 7), group(3, 'bee', 0, 3), group(3, 'bee', 4, 7), group(0, 'cmd', 2, 5)];
    if (arcDiff().rows < 4) groups.splice(4, 2);   // a smaller swarm: no bottom row of bees
    groups.forEach((g, gi) => g.forEach((m, k) => {
        A.foes.push({ type: m.kind, core: true, row: m.row, col: m.col, hp: m.kind === 'cmd' ? 2 : 1, state: 'wait', delay: 700 + gi * 1450 + k * 170,
            x: -999, y: -999, ang: Math.PI / 2, side: gi % 2 === 0 ? -1 : 1, grp: gi, seed: Math.random() * 6.28, hitT: 0, hold: 0,
            r: (m.kind === 'cmd' ? 24 : m.kind === 'fly' ? 19 : 17) * sf, color: { bee: '#ffea00', fly: '#ff3d9a', cmd: '#00ff66' }[m.kind] });
    }));
    A.form = { sway: 0, breath: 1 };
}

function slotPos(e) {
    const A = STATE.arcade, F = arcF(), cw = 62 * F.sf, ch = 46 * F.sf, b = A.form.breath;
    return { x: F.W / 2 + A.form.sway + (e.col - 3.5) * cw * b, y: 142 * F.sf + e.row * ch * (0.92 + 0.08 * b) };
}

function bezier(S, C1, C2, E, t) {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return { x: a * S.x + b * C1.x + c * C2.x + d * E.x, y: a * S.y + b * C1.y + c * C2.y + d * E.y };
}

function startEnter(e) {
    const F = arcF(), D = arcDiff(), sf = F.sf;
    e.state = 'enter'; e.t = 0; e.dur = 2700 / D.speed;
    e.S = { x: e.side < 0 ? -40 * sf : F.W + 40 * sf, y: e.grp < 4 ? 80 * sf : F.H * 0.5 };
    e.C1 = { x: F.W * (e.side < 0 ? 0.32 : 0.68), y: F.H * 0.98 };
    e.C2 = { x: F.W * (e.side < 0 ? 0.80 : 0.20), y: F.H * 0.22 };
    e.x = e.S.x; e.y = e.S.y;
}

function startDive(e, hold) {
    const F = arcF();
    e.state = 'dive'; e.phase = 'loop'; e.hold = hold || 0; e.turned = 0; e.dir = e.x < F.W / 2 ? 1 : -1;   // loop toward the middle of the screen
    e.ang = -Math.PI / 2; e.bombs = e.type === 'bee' ? 1 : 2; e.bombCool = 0;
    arcSfx(900, 300, 0.25, 'sawtooth', 0.04);
}

function arcBomb(x, y, aimed) {
    const A = STATE.arcade, F = arcF(), D = arcDiff(), sf = F.sf;
    if (A.bombs.length >= 9) return;
    if (aimed && D.aimed) {
        const dx = A.x - x, dy = Math.max(90 * sf, A.y - y), d = Math.hypot(dx, dy), sp = 340 * sf * D.speed;
        A.bombs.push({ x, y, vx: dx / d * sp, vy: dy / d * sp, kind: 'bolt', r: 5 * sf, age: 0, ph: 0 });
        arcSfx(1300, 500, 0.12, 'square', 0.05);
    } else {
        A.bombs.push({ x, y, vx: 0, vy: 215 * sf * D.speed, kind: 'bomb', r: 7 * sf, age: 0, ph: Math.random() * 6.28 });
        arcSfx(500, 200, 0.18, 'triangle', 0.07);
    }
}

function swarmUpdate(dt) {
    const A = STATE.arcade, F = arcF(), D = arcDiff(), sf = F.sf;
    A.form.sway = Math.sin(A.lt / 2300) * Math.min(90 * sf, F.W * 0.1); A.form.breath = 1 + 0.045 * Math.sin(A.lt / 950);
    const alive = A.foes.filter(e => e.core && e.hp > 0), frac = alive.length / Math.max(1, A.total), rush = A.lt > 60000 ? 2.2 : 1;
    for (const e of alive) {
        if (e.hitT > 0) e.hitT -= dt;
        if (e.state === 'wait') { if (A.lt >= e.delay) startEnter(e); continue; }
        const ox = e.x, oy = e.y;
        if (e.state === 'enter') {
            e.t += dt; const t = Math.min(1, e.t / e.dur), s = slotPos(e), p = bezier(e.S, e.C1, e.C2, s, t * t * (3 - 2 * t));
            e.x = p.x; e.y = p.y;
            if (Math.hypot(e.x - ox, e.y - oy) > 0.2) e.ang = Math.atan2(e.y - oy, e.x - ox);
            if (t >= 1) e.state = 'form';
        } else if (e.state === 'form') {
            const s = slotPos(e); e.x = s.x; e.y = s.y; e.ang += arcAngDiff(e.ang, Math.PI / 2) * Math.min(1, dt / 120);
        } else if (e.state === 'dive') {
            if (e.hold > 0) { e.hold -= dt; const s = slotPos(e); e.x = s.x; e.y = s.y; continue; }
            const v = (250 + 60 * (1 - frac)) * sf * D.speed;
            if (e.phase === 'loop') {
                const w = 3.6 * D.speed * dt / 1000; e.ang += e.dir * w; e.turned += w;
                if (e.turned >= Math.PI) { e.phase = 'attack'; e.ang = Math.atan2(Math.sin(e.ang), Math.cos(e.ang)); }
            } else {
                const want = Math.max(0.25 * Math.PI, Math.min(0.75 * Math.PI, A.dead > 0 ? Math.PI / 2 : Math.atan2(A.y - e.y, A.x - e.x)));
                const turn = 1.5 * D.dive * dt / 1000, d = arcAngDiff(e.ang, want); e.ang += Math.max(-turn, Math.min(turn, d));
                e.bombCool -= dt;
                if (e.bombs > 0 && e.bombCool <= 0 && e.y > F.H * 0.12 && e.y < A.y - 140 * sf && Math.abs(e.x - A.x) < 110 * sf) {
                    e.bombs--; e.bombCool = 380; arcBomb(e.x, e.y + 14 * sf, e.type === 'cmd');
                }
            }
            e.x += Math.cos(e.ang) * v * dt / 1000; e.y += Math.sin(e.ang) * v * dt / 1000;
            if (e.y > F.H + 40 * sf || e.x < -90 * sf || e.x > F.W + 90 * sf) { const s = slotPos(e); e.state = 'back'; e.x = s.x; e.y = -40 * sf; e.ang = Math.PI / 2; }
        } else if (e.state === 'back') {   // re-enter from the top and glide home
            const s = slotPos(e), dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy), step = 380 * sf * D.speed * dt / 1000;
            if (d <= step) { e.x = s.x; e.y = s.y; e.state = 'form'; } else { e.x += dx / d * step; e.y += dy / d * step; e.ang = Math.atan2(dy, dx); }
        }
    }
    // dives: fewer at first, more and quicker as the swarm thins out. Commanders take escorts.
    A.diveT -= dt;
    const inForm = alive.filter(e => e.state === 'form'), divers = alive.filter(e => e.state === 'dive').length;
    const cap = Math.max(1, Math.min(5, Math.round((1.5 + (1 - frac) * 3) * D.dive)));
    if (A.diveT <= 0 && A.lt > 7000 && inForm.length && divers < cap) {
        const cmds = inForm.filter(e => e.type === 'cmd');
        const pick = cmds.length && Math.random() < 0.4 ? cmds[Math.floor(Math.random() * cmds.length)] : inForm[Math.floor(Math.random() * inForm.length)];
        startDive(pick, 0);
        if (pick.type === 'cmd') inForm.filter(e => e.type === 'fly' && Math.abs(e.col - pick.col) <= 1 && e.row === 1).slice(0, 2).forEach((e, i) => startDive(e, 260 * (i + 1)));
        A.diveT = ((1100 + 2300 * frac) / D.dive + arcRand(0, 500)) / rush;
    }
    // bombs from the formation and from swarm members still flying in
    A.bombT -= dt;
    if (A.bombT <= 0) {
        const sh = alive.filter(e => (e.state === 'form' || e.state === 'enter') && e.y > 30 * sf && e.y < A.y - 160 * sf);
        if (sh.length) { const e = sh[Math.floor(Math.random() * sh.length)]; arcBomb(e.x, e.y + 14 * sf, e.type === 'cmd' || Math.random() < 0.3); }
        A.bombT = arcRand(1000, 1900) * (0.55 + 0.45 * frac) / (D.bomb * rush);
    }
}

// ================= LEVEL 2: CRAWLER STRIKE =================
function crawlerGeom() {
    const F = arcF(), cell = 38 * F.sf, n = Math.max(8, Math.floor((F.W - 56 * F.sf) / cell)), gx0 = (F.W - n * cell) / 2, gy0 = 112 * F.sf;
    return { cell, n, gx0, gy0, rows: Math.max(6, Math.floor((F.yMax - gy0) / cell)), mushRows: Math.max(4, Math.floor((F.zoneTop - gy0) / cell) - 1), rowY: r => gy0 + (r + 0.5) * cell };
}

function buildCrawler() {
    const A = STATE.arcade, G = crawlerGeom();
    let tries = 0;
    while (A.shrooms.length < arcDiff().shrooms && tries++ < 300) {   // a field of mushrooms; never in row 0 (the snake comes in there), never two side by side
        const c = Math.floor(Math.random() * G.n), r = 1 + Math.floor(Math.random() * (G.mushRows - 1));
        if (A.shrooms.some(m => m.r === r && Math.abs(m.c - c) <= 1)) continue;
        A.shrooms.push({ c, r, hp: 4 });
    }
    for (let i = 0; i < arcDiff().segs; i++) {
        A.foes.push({ type: 'seg', core: true, hp: 1, order: i, head: i === 0, x: G.gx0 - (i + 0.5) * G.cell, y: G.rowY(0), row: 0, dir: 1, mode: 'h', ty: 0,
            r: G.cell * 0.46, seed: Math.random() * 6.28, hitT: 0, hold: 0, state: 'crawl', color: '#7dff3a', shootT: arcRand(2500, 5000) });
    }
}

// the mushroom a destroyed segment leaves behind
function arcMushroomAt(e) {
    const A = STATE.arcade, G = crawlerGeom();
    const c = Math.floor((e.x - G.gx0) / G.cell), r = Math.round((e.y - G.gy0) / G.cell - 0.5);
    if (c < 0 || c >= G.n || r < 0 || r > G.mushRows) return;
    if (!A.shrooms.some(m => m.c === c && m.r === r)) A.shrooms.push({ c, r, hp: 4 });
}

function segStep(s, dt, v, G) {
    const A = STATE.arcade, step = v * dt / 1000;
    if (s.mode === 'drop') { s.y += step; if (s.y >= s.ty) { s.y = s.ty; s.mode = 'h'; } return; }
    s.x += s.dir * step;
    const front = s.x + s.dir * G.cell * 0.5, right = G.gx0 + G.n * G.cell;
    let turn = (s.dir > 0 && front > right) || (s.dir < 0 && front < G.gx0);
    if (!turn && front > G.gx0 && front < right) { const col = Math.floor((front - G.gx0) / G.cell); turn = A.shrooms.some(m => m.c === col && m.r === s.row); }
    if (turn) {
        s.dir = -s.dir; s.row++;
        if (s.row >= G.rows) { s.row = 0; s.y = G.rowY(0); s.mode = 'h'; A.wrapNow = true; }   // off the bottom: back in at the top, a little faster
        else { s.mode = 'drop'; s.ty = G.rowY(s.row); }
    }
}

function crawlerUpdate(dt) {
    const A = STATE.arcade, F = arcF(), D = arcDiff(), sf = F.sf, G = crawlerGeom(), rush = A.lt > 60000 ? 1.6 : 1;
    const segs = A.foes.filter(e => e.type === 'seg' && e.hp > 0), orders = new Set(segs.map(s => s.order));
    const v = 290 * sf * D.speed * (1 + 0.18 * A.wraps) * (segs.length <= 3 ? 1.35 : 1) * rush;
    A.wrapNow = false;
    for (const s of segs) {
        if (s.hitT > 0) s.hitT -= dt;
        s.head = !orders.has(s.order - 1);
        segStep(s, dt, v, G);
        if (s.head && s.y > 0) {   // heads drop a bomb when they pass over the ship
            s.shootT -= dt;
            if (s.shootT <= 0) { if (Math.abs(s.x - A.x) < 150 * sf && s.y < A.y - 120 * sf) { arcBomb(s.x, s.y + 14 * sf, false); s.shootT = arcRand(2200, 4200) / D.bomb; } else s.shootT = 250; }
        }
    }
    if (A.wrapNow) A.wraps++;
    // a spider through the ship's zone, and saucers over the mushrooms
    A.spiderT -= dt; A.saucerT -= dt;
    if (A.spiderT <= 0 && segs.length && !A.foes.some(e => e.type === 'spider')) {
        const side = Math.random() < 0.5 ? -1 : 1;
        A.foes.push({ type: 'spider', core: false, hp: 1, state: 'crawl', hold: 0, x: side < 0 ? -40 * sf : F.W + 40 * sf, y: arcRand(F.zoneTop + 30 * sf, F.yMax - 20 * sf),
            vx: -side * arcRand(170, 240) * sf * D.speed, vy: arcRand(110, 200) * sf, turnT: 400, r: 20 * sf, seed: Math.random() * 6.28, hitT: 0, color: '#ff0055' });
        A.spiderT = arcRand(9000, 14000) / D.dive;
    }
    if (A.saucerT <= 0 && segs.length && !A.foes.some(e => e.type === 'saucer')) {
        const side = Math.random() < 0.5 ? -1 : 1;
        A.foes.push({ type: 'saucer', core: false, hp: 1, state: 'crawl', hold: 0, x: side < 0 ? -50 * sf : F.W + 50 * sf, y: F.zoneTop - 30 * sf, base: F.zoneTop - 30 * sf, dir: -side,
            sp: arcRand(170, 220) * sf * D.speed, bombT: 600, r: 24 * sf, seed: Math.random() * 6.28, hitT: 0, color: '#ff7a00' });
        A.saucerT = arcRand(8000, 13000) / D.bomb;
    }
    for (const e of A.foes) {
        if (e.hp <= 0) continue;
        if (e.type === 'spider') {
            if (e.hitT > 0) e.hitT -= dt;
            e.x += e.vx * dt / 1000; e.y += e.vy * dt / 1000; e.turnT -= dt;
            if (e.turnT <= 0) { e.turnT = arcRand(350, 900); e.vy = (Math.random() < 0.5 ? -1 : 1) * arcRand(110, 200) * sf; }
            if (e.y < F.zoneTop + 10 * sf) { e.y = F.zoneTop + 10 * sf; e.vy = Math.abs(e.vy); } else if (e.y > F.yMax - 10 * sf) { e.y = F.yMax - 10 * sf; e.vy = -Math.abs(e.vy); }
            if ((e.vx > 0 && e.x > F.W + 60 * sf) || (e.vx < 0 && e.x < -60 * sf)) e.gone = true;
        } else if (e.type === 'saucer') {
            if (e.hitT > 0) e.hitT -= dt;
            e.x += e.dir * e.sp * dt / 1000; e.y = e.base + Math.sin(A.lt / 400 + e.seed) * 26 * sf; e.bombT -= dt;
            if (e.bombT <= 0 && e.x > F.W * 0.08 && e.x < F.W * 0.92) { arcBomb(e.x, e.y + 12 * sf, false); e.bombT = arcRand(550, 900) / D.bomb; }
            if ((e.dir > 0 && e.x > F.W + 70 * sf) || (e.dir < 0 && e.x < -70 * sf)) e.gone = true;
        }
    }
}

// ================= shared: bombs, shots, contact =================
function bombsUpdate(dt) {
    const A = STATE.arcade, F = arcF();
    for (const b of A.bombs) { b.x += b.vx * dt / 1000; b.y += b.vy * dt / 1000; b.age += dt; if (b.y > F.H + 30 || b.x < -30 || b.x > F.W + 30) b.dead = true; }
}

function arcShots(dt) {
    const A = STATE.arcade, F = arcF(), sf = F.sf, G = A.on && A.level === 2 && A.phase === 'play' ? crawlerGeom() : null;
    for (const s of A.shots) {
        s.py = s.y; s.y -= ARC.SHOT_SPEED * sf * dt / 1000;
        if (s.y < -20 * sf) { s.active = false; continue; }
        if (A.phase !== 'play') continue;
        let best = null, bestY = -1e9;   // the thing the shot meets first, going up: the lowest one on screen
        if (G) for (const m of A.shrooms) {
            const mx = G.gx0 + (m.c + 0.5) * G.cell, my = G.rowY(m.r), h = G.cell * 0.5;
            if (Math.abs(s.x - mx) < h * 0.8 && s.y <= my + h && s.py >= my - h && my > bestY) { best = { shroom: m }; bestY = my; }
        }
        for (const e of A.foes) {
            if (e.hp <= 0 || e.state === 'wait' || e.gone) continue;
            if (Math.abs(e.x - s.x) < e.r && s.y <= e.y + e.r && s.py >= e.y - e.r && e.y > bestY) { best = { foe: e }; bestY = e.y; }
        }
        if (!best) continue;
        s.active = false;
        if (best.foe) arcHit(best.foe);
        else {
            const m = best.shroom; m.hp--; arcSfx(700, 400, 0.05, 'square', 0.04);
            if (m.hp <= 0) { A.shrooms.splice(A.shrooms.indexOf(m), 1); const pts = arcPoints(ARC.PTS.shroom); STATE.score += pts; A.earned += pts; updateUI(); }
        }
    }
    A.shots = A.shots.filter(s => s.active);
}

function arcContacts() {
    const A = STATE.arcade, sf = STATE.sf, hr = 13 * sf;
    if (A.dead > 0 || A.invuln > 0) return;
    for (const b of A.bombs) if (Math.hypot(b.x - A.x, b.y - A.y) < b.r + hr) { b.dead = true; hurtShip(); return; }
    for (const e of A.foes) {
        if (e.hp <= 0 || e.state === 'wait' || e.gone) continue;
        if (Math.hypot(e.x - A.x, e.y - A.y) < e.r * 0.75 + hr) { if (e.core && e.type !== 'seg') arcKillQuiet(e); hurtShip(); return; }
    }
}

// ================= the ship, and the frame loop =================
function moveShip(dt) {
    const A = STATE.arcade, F = arcF(), sf = F.sf;
    A.flash = Math.max(0, A.flash - dt); A.invuln = Math.max(0, A.invuln - dt);
    if (A.dead > 0) { A.dead -= dt; if (A.dead <= 0 && A.lives > 0) respawnShip(); return; }
    // the ship flies in the lower part of the screen, with a little inertia so it banks and glides
    const yMin = F.H * ARC.ZONE_TOP, top = ARC.TOP_SPEED * sf, k = Math.min(1, dt / 70);
    A.vx += (((A.keys.right ? 1 : 0) - (A.keys.left ? 1 : 0)) * top - A.vx) * k;
    A.vy += (((A.keys.down ? 1 : 0) - (A.keys.up ? 1 : 0)) * top * 0.8 - A.vy) * k;
    A.x += A.vx * dt / 1000; A.y += A.vy * dt / 1000;
    if (A.x < ARC.MARGIN * sf) { A.x = ARC.MARGIN * sf; A.vx = 0; } else if (A.x > F.W - ARC.MARGIN * sf) { A.x = F.W - ARC.MARGIN * sf; A.vx = 0; }
    if (A.y < yMin) { A.y = yMin; A.vy = 0; } else if (A.y > F.yMax) { A.y = F.yMax; A.vy = 0; }
    A.age += dt;
    A.trailT -= dt; if (A.trailT <= 0) { A.trailT = 30; for (const sx of [-1, 1]) A.trail.push({ x: A.x + sx * 13 * sf, y: A.y + 26 * sf, life: 380 }); }
    for (const p of A.trail) { p.life -= dt; p.y += 110 * sf * dt / 1000; }
    A.trail = A.trail.filter(p => p.life > 0).slice(-70);
    A.cool -= dt;
    if ((A.keys.fire || A.fireQueued) && A.cool <= 0 && A.shots.length < ARC.MAX_SHOTS && A.phase !== 'done' && A.phase !== 'over') {
        A.fireQueued = false;   // a double shot from the two cannons
        A.shots.push({ x: A.x - 18 * sf, y: A.y - 34 * sf, py: A.y - 34 * sf, active: true }, { x: A.x + 18 * sf, y: A.y - 34 * sf, py: A.y - 34 * sf, active: true });
        A.cool = ARC.FIRE_COOL; A.flash = 70; AudioFX.laser(A.x / F.W);
    }
}

// per frame: the question, the ship, the level and the hits
function arcadeUpdate(dt) {
    const A = STATE.arcade; if (!A) return;
    dt = Math.min(dt, 50);
    if (A.asking) { A.askAge += dt; return; }
    if (!A.on) return;
    if (arcadeBlocked()) { endArcade('ARCADE ENDS'); return; }
    A.pt += dt;
    moveShip(dt);
    if (A.phase === 'intro') { if (A.pt >= 2000) beginLevel(); }
    else if (A.phase === 'play') {
        A.lt += dt;
        if (A.level === 1) swarmUpdate(dt); else crawlerUpdate(dt);
        bombsUpdate(dt); arcContacts();
    }
    arcShots(dt);
    if (A.phase === 'play') {
        A.bombs = A.bombs.filter(b => !b.dead); A.foes = A.foes.filter(e => e.hp > 0 && !e.gone);
        if (A.total > 0 && !A.foes.some(e => e.core)) levelClear();
    } else if (A.phase === 'clear') { if (A.pt >= 2600) { if (A.level < ARC.LEVELS) startIntro(A.level + 1); else finishArcade(true); } }
    else if (A.phase === 'done') { if (A.pt >= 3000) endArcade('ARCADE COMPLETE'); }
    else if (A.phase === 'over') { if (A.pt >= 2400) endArcade('ARCADE OVER'); }
}

// ================= drawing =================
// The ship: a swept-wing fighter with twin cannons, a glass canopy and two engines. It banks as it moves, its flames follow the throttle,
// the cannons flash when they fire, and it warps in when it appears.
function drawArcadeShip(ctx, A, sf) {
    const u = sf * 1.2, t = Date.now(), bank = Math.max(-1, Math.min(1, A.vx / (ARC.TOP_SPEED * sf)));
    const k = Math.min(1, A.age / 450), grow = 0.35 + 0.65 * k;
    const poly = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x * u, y * u)); ctx.closePath(); };
    const flip = pts => pts.map(([x, y]) => [-x, y]);
    ctx.save(); ctx.translate(A.x, A.y); ctx.rotate(bank * 0.26); ctx.scale((1 - Math.abs(bank) * 0.1) * grow, grow); ctx.globalAlpha = 0.3 + 0.7 * k;
    const thrust = A.keys.up ? 1 : A.keys.down ? 0.25 : 0.55;
    for (const sx of [-1, 1]) {   // engine flames, behind the hull
        const len = (14 + thrust * 20 + Math.sin(t / 40 + sx) * 3 + Math.random() * 3) * u, fx = sx * 11 * u, fy = 22 * u;
        const g = ctx.createLinearGradient(0, fy, 0, fy + len);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(0,243,255,0.8)'); g.addColorStop(1, 'rgba(0,80,255,0)');
        ctx.fillStyle = g; ctx.shadowBlur = 18 * sf; ctx.shadowColor = '#00f3ff';
        ctx.beginPath(); ctx.moveTo(fx - 4.5 * u, fy); ctx.lineTo(fx, fy + len); ctx.lineTo(fx + 4.5 * u, fy); ctx.closePath(); ctx.fill();
    }
    const hull = ctx.createLinearGradient(-40 * u, 0, 40 * u, 0);
    hull.addColorStop(0, '#08111a'); hull.addColorStop(0.35, '#1f3a52'); hull.addColorStop(0.5, '#2c5070'); hull.addColorStop(0.65, '#1f3a52'); hull.addColorStop(1, '#08111a');
    ctx.fillStyle = hull; ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.6 * sf; ctx.lineJoin = 'round'; ctx.shadowBlur = 14 * sf; ctx.shadowColor = '#00f3ff';
    const wing = [[8, -8], [36, 12], [41, 25], [30, 25], [14, 17], [8, 19]];
    for (const w of [wing, flip(wing)]) { poly(w); ctx.fill(); ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ff2f6d'; ctx.lineWidth = 2.2 * sf;   // wing stripes
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 14 * u, 4 * u); ctx.lineTo(sx * 33 * u, 17 * u); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1 * sf;   // panel lines
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 12 * u, 8 * u); ctx.lineTo(sx * 28 * u, 22 * u); ctx.moveTo(sx * 10 * u, -2 * u); ctx.lineTo(sx * 22 * u, 10 * u); ctx.stroke(); }
    for (const sx of [-1, 1]) {   // cannon pods and barrels
        ctx.fillStyle = '#10202e'; ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.4 * sf; ctx.shadowBlur = 8 * sf; ctx.shadowColor = '#00f3ff';
        ctx.beginPath(); ctx.roundRect(sx * 18 * u - 3.5 * u, -8 * u, 7 * u, 24 * u, 3 * u); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#ff3d6e'; ctx.lineWidth = 3 * sf; ctx.beginPath(); ctx.moveTo(sx * 18 * u, -8 * u); ctx.lineTo(sx * 18 * u, -26 * u); ctx.stroke();
    }
    const body = [[0, -36], [6, -22], [9, -4], [8, 14], [0, 22], [-8, 14], [-9, -4], [-6, -22]];
    ctx.fillStyle = hull; ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.6 * sf; ctx.shadowBlur = 14 * sf; ctx.shadowColor = '#00f3ff';
    poly(body); ctx.fill(); ctx.stroke();
    for (const sx of [-1, 1]) { ctx.shadowBlur = 0; ctx.fillStyle = '#142230'; ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.2 * sf; ctx.beginPath(); ctx.roundRect(sx * 11 * u - 4 * u, 12 * u, 8 * u, 11 * u, 2 * u); ctx.fill(); ctx.stroke(); }   // engine nacelles
    const glass = ctx.createLinearGradient(0, -22 * u, 0, 2 * u);   // canopy
    glass.addColorStop(0, '#e6fbff'); glass.addColorStop(0.45, '#2a9bff'); glass.addColorStop(1, '#04203d');
    ctx.fillStyle = glass; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1 * sf; ctx.shadowBlur = 8 * sf; ctx.shadowColor = '#7fd8ff';
    ctx.beginPath(); ctx.ellipse(0, -10 * u, 4.6 * u, 10.5 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(-1.4 * u, -14 * u, 1.3 * u, 4 * u, 0, 0, Math.PI * 2); ctx.fill();
    const blink = Math.floor(t / 400) % 2;   // wingtip lights
    ctx.fillStyle = blink ? '#ff2f6d' : '#3a0c18'; ctx.beginPath(); ctx.arc(-40 * u, 24 * u, 1.8 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = blink ? '#0b3a1c' : '#3dff8a'; ctx.beginPath(); ctx.arc(40 * u, 24 * u, 1.8 * u, 0, Math.PI * 2); ctx.fill();
    if (A.flash > 0) {   // muzzle flash
        const r = (6 + 7 * A.flash / 70) * u;
        for (const sx of [-1, 1]) {
            const g = ctx.createRadialGradient(sx * 18 * u, -28 * u, 0, sx * 18 * u, -28 * u, r);
            g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,234,0,0.9)'); g.addColorStop(1, 'rgba(255,120,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx * 18 * u, -28 * u, r, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.restore();
}

// ---- enemy sprites. Every swarm sprite is drawn facing DOWN (+y) and rotated to its heading. ----
function arcGlow(ctx, e, u) { ctx.fillStyle = '#10141c'; ctx.strokeStyle = e.hitT > 0 ? '#ffffff' : e.color; ctx.lineWidth = 1.8 * u; ctx.shadowBlur = 10 * u; ctx.shadowColor = e.color; ctx.lineJoin = 'round'; }

function drawBee(ctx, e, u, t) {
    const flap = Math.sin(t / 70 + e.seed); arcGlow(ctx, e, u);
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 12 * u, -2 * u, 9 * u, (4.5 + flap * 2.6) * u, sx * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, 0, 7 * u, 11 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(-6 * u, -3 * u); ctx.lineTo(6 * u, -3 * u); ctx.moveTo(-6.4 * u, 2 * u); ctx.lineTo(6.4 * u, 2 * u); ctx.stroke();
    ctx.fillStyle = '#ff2f6d'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 3 * u, 7 * u, 1.9 * u, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = e.color; ctx.beginPath(); ctx.moveTo(-2.5 * u, 11 * u); ctx.lineTo(0, 17 * u); ctx.lineTo(2.5 * u, 11 * u); ctx.closePath(); ctx.fill();
}

function drawFly(ctx, e, u, t) {
    const flap = 0.78 + 0.22 * Math.sin(t / 90 + e.seed); arcGlow(ctx, e, u);
    for (const sx of [-1, 1]) {
        ctx.save(); ctx.scale(sx * flap, 1);
        ctx.beginPath(); ctx.moveTo(2 * u, -3 * u); ctx.lineTo(17 * u, -13 * u); ctx.lineTo(21 * u, -2 * u); ctx.lineTo(8 * u, 4 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2 * u, 2 * u); ctx.lineTo(14 * u, 8 * u); ctx.lineTo(10 * u, 16 * u); ctx.lineTo(2 * u, 9 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(0, 1 * u, 3.8 * u, 10 * u, 0, 0, Math.PI * 2); ctx.fillStyle = e.color; ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 2 * u, 8 * u, 1.3 * u, 0, Math.PI * 2); ctx.fill(); }
}

function drawCmd(ctx, e, u, t) {
    arcGlow(ctx, e, u);
    ctx.beginPath(); [[-18, -4], [-10, -14], [10, -14], [18, -4], [12, 12], [0, 19], [-12, 12]].forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x * u, y * u)); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const sx of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo((sx * 7 - 3) * u, -14 * u); ctx.lineTo(sx * 7 * u, -22 * u); ctx.lineTo((sx * 7 + 3) * u, -14 * u); ctx.stroke(); }   // crown
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 18 * u, 8 * u, 7 * u, sx > 0 ? -1.2 : Math.PI - 1.2 + 1.2, sx > 0 ? 1.8 : Math.PI + 1.2); ctx.stroke(); }   // claws
    ctx.fillStyle = e.hitT > 0 ? '#fff' : e.color; ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t / 160 + e.seed); ctx.beginPath(); ctx.arc(0, 0, 5 * u, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.shadowBlur = 0; ctx.fillStyle = '#ff2f6d'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 6.5 * u, 8 * u, 2.2 * u, 0, Math.PI * 2); ctx.fill(); }
}

function drawSeg(ctx, e, t) {
    const r = e.r, u = r / 17; ctx.save(); ctx.translate(e.x, e.y); ctx.lineJoin = 'round';
    const col = e.head ? '#ffea00' : e.color; ctx.strokeStyle = e.hitT > 0 ? '#fff' : col; ctx.shadowBlur = 8 * u; ctx.shadowColor = col; ctx.lineWidth = 2 * u;
    const sw = Math.sin(t / 70 + e.order * 1.3) * 5 * u;   // legs
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 8 * u, -3 * u); ctx.lineTo(sx * 18 * u, -8 * u + sw); ctx.moveTo(sx * 8 * u, 5 * u); ctx.lineTo(sx * 18 * u, 10 * u - sw); ctx.stroke(); }
    ctx.fillStyle = e.head ? '#3a3200' : '#142a10'; ctx.beginPath(); ctx.arc(0, 0, r * (e.head ? 1.0 : 0.92), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (e.head) {
        ctx.shadowBlur = 0; ctx.fillStyle = '#ff2f6d'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 6 * u, -3 * u, 3.2 * u, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(-5 * u, -14 * u); ctx.lineTo(-9 * u, -22 * u); ctx.moveTo(5 * u, -14 * u); ctx.lineTo(9 * u, -22 * u); ctx.stroke();
    } else { ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
}

function drawSpider(ctx, e, t) {
    const u = e.r / 20; ctx.save(); ctx.translate(e.x, e.y); ctx.strokeStyle = e.hitT > 0 ? '#fff' : e.color; ctx.shadowBlur = 10 * u; ctx.shadowColor = e.color; ctx.lineWidth = 2.2 * u; ctx.lineJoin = 'round';
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
        const y0 = (i - 1.5) * 5 * u, sw = Math.sin(t / 60 + i * 1.7 + (sx > 0 ? 1 : 0)) * 4 * u;
        ctx.beginPath(); ctx.moveTo(sx * 8 * u, y0); ctx.lineTo(sx * 22 * u, y0 * 1.6 - 9 * u + sw); ctx.lineTo(sx * 31 * u, y0 * 2.2 + 4 * u - sw); ctx.stroke();
    }
    ctx.fillStyle = '#1a0610'; ctx.beginPath(); ctx.arc(0, 0, 12 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffea00'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 4.5 * u, -3 * u, 2.6 * u, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
}

function drawSaucer(ctx, e, t) {
    const u = e.r / 24; ctx.save(); ctx.translate(e.x, e.y); ctx.strokeStyle = e.hitT > 0 ? '#fff' : e.color; ctx.shadowBlur = 12 * u; ctx.shadowColor = e.color; ctx.lineWidth = 2 * u;
    ctx.fillStyle = '#1b0d02'; ctx.beginPath(); ctx.ellipse(0, 0, 24 * u, 8 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -3 * u, 11 * u, Math.PI, Math.PI * 2); ctx.fillStyle = 'rgba(255,160,60,0.25)'; ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; for (let i = -2; i <= 2; i++) { ctx.fillStyle = Math.floor(t / 150 + i) % 2 ? '#ffea00' : '#5a3a00'; ctx.beginPath(); ctx.arc(i * 8 * u, 1.5 * u, 1.9 * u, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
}

function drawShroom(ctx, m, G, sf) {
    const x = G.gx0 + (m.c + 0.5) * G.cell, y = G.rowY(m.r), c = G.cell, col = ['', '#ff4040', '#ffb000', '#a0e000', '#00ff9c'][m.hp] || '#00ff9c';
    ctx.save(); ctx.translate(x, y); ctx.shadowBlur = 8 * sf; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.lineWidth = 1.8 * sf; ctx.fillStyle = '#0c1a14';
    ctx.fillRect(-c * 0.13, c * 0.02, c * 0.26, c * 0.3); ctx.strokeRect(-c * 0.13, c * 0.02, c * 0.26, c * 0.3);
    const rr = c * (0.26 + 0.05 * m.hp); ctx.beginPath(); ctx.arc(0, c * 0.04, rr, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(-rr * 0.4, -rr * 0.35, c * 0.05, 0, Math.PI * 2); ctx.arc(rr * 0.35, -rr * 0.5, c * 0.04, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
}

function drawBomb(ctx, b, sf) {
    ctx.save();
    if (b.kind === 'bolt') {
        ctx.strokeStyle = '#ff2f6d'; ctx.shadowBlur = 12 * sf; ctx.shadowColor = '#ff2f6d'; ctx.lineWidth = 4.5 * sf; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.045, b.y - b.vy * 0.045); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6 * sf; ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.lineTo(b.x, b.y); ctx.stroke();
    } else {
        const wob = Math.sin(b.age / 120 + b.ph) * 2.5 * sf, x = b.x + wob;
        ctx.shadowBlur = 14 * sf; ctx.shadowColor = '#ff7a00'; ctx.fillStyle = '#ff7a00'; ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff7a00'; ctx.lineWidth = 1.5 * sf; for (let i = 0; i < 4; i++) { const a = b.age / 200 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r); ctx.lineTo(x + Math.cos(a) * b.r * 1.6, b.y + Math.sin(a) * b.r * 1.6); ctx.stroke(); }
    }
    ctx.restore();
}

function drawArcadeAsk(ctx, A, W, H, sf) {
    const ready = A.askAge >= ARC.ASK_GRACE, t = Date.now();
    ctx.save(); ctx.fillStyle = 'rgba(2,0,12,0.66)'; ctx.fillRect(0, 0, W, H);
    const pw = 620 * sf, ph = 346 * sf, px = W / 2 - pw / 2, py = H / 2 - ph / 2 - 20 * sf;
    ctx.fillStyle = 'rgba(14,6,34,0.95)'; ctx.strokeStyle = '#bc13fe'; ctx.lineWidth = 2.5 * sf; ctx.shadowBlur = 26 * sf; ctx.shadowColor = '#bc13fe';
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14 * sf); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#bc13fe'; ctx.font = `800 ${Math.floor(16 * sf)}px 'Oxanium'`; ctx.fillText('ARCADE DRONE SHOT DOWN', W / 2, py + 34 * sf);
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 14 * sf; ctx.shadowColor = '#bc13fe'; ctx.font = `800 ${Math.floor(44 * sf)}px 'Oxanium'`; ctx.fillText('ARCADE MODE   Y or N', W / 2, py + 84 * sf); ctx.shadowBlur = 0;
    ctx.fillStyle = '#cfe8ff'; ctx.font = `700 ${Math.floor(15 * sf)}px 'Share Tech Mono', monospace`;
    ctx.fillText('Two shoot-out levels. The enemies move, dive and drop bombs.', W / 2, py + 130 * sf);
    ctx.fillText('Arrow keys = MOVE,  Space = SHOOT.  Typing is paused while you fly.', W / 2, py + 154 * sf);
    ctx.fillText('Lose a ship: -' + arcDiff().hull + '% health (never below 1%).', W / 2, py + 178 * sf);
    ctx.fillText('Clear both levels: +' + ARC.FINISH_HEAL + '% health and +' + ARC.FINISH_EMP + '% EMP.', W / 2, py + 202 * sf);
    ctx.globalAlpha = ready ? 1 : 0.35;
    const kw = 190 * sf, kh = 58 * sf, ky = py + 244 * sf, pulse = ready ? 0.7 + 0.3 * Math.sin(t / 220) : 0.5;
    [['Y', 'FLY', W / 2 - kw - 14 * sf, '0,255,102'], ['N', 'SKIP', W / 2 + 14 * sf, '255,0,85']].forEach(([k, label, kx, rgb]) => {
        ctx.fillStyle = `rgba(${rgb},0.14)`; ctx.strokeStyle = `rgba(${rgb},${pulse})`; ctx.lineWidth = 2.5 * sf; ctx.beginPath(); ctx.roundRect(kx, ky, kw, kh, 10 * sf); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgb(${rgb})`; ctx.font = `800 ${Math.floor(30 * sf)}px 'Oxanium'`; ctx.textAlign = 'right'; ctx.fillText(k, kx + 62 * sf, ky + kh / 2 + 1 * sf);
        ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.floor(20 * sf)}px 'Oxanium'`; ctx.textAlign = 'left'; ctx.fillText(label, kx + 80 * sf, ky + kh / 2 + 1 * sf);
    });
    ctx.restore();
}

function drawArcadeBanner(ctx, A, W, H, sf) {
    let title = '', sub = '', sub2 = '', k = 1;
    if (A.phase === 'intro') { title = 'LEVEL ' + A.level; sub = ARC.NAMES[A.level - 1]; sub2 = ''; k = Math.min(1, A.pt / 300, (2000 - A.pt) / 400); }
    else if (A.phase === 'clear') { title = 'LEVEL ' + A.level + ' CLEAR'; sub = '+' + A.clearBonus + (A.clearPerfect ? '   PERFECT +' + A.clearPerfect : ''); sub2 = A.level < ARC.LEVELS ? 'GET READY' : ''; k = Math.min(1, A.pt / 250, (2600 - A.pt) / 400); }
    else if (A.phase === 'done') { title = 'ARCADE COMPLETE'; sub = A.kills + ' HITS   +' + A.earned; sub2 = '+' + ARC.FINISH_HEAL + '% HEALTH   +' + ARC.FINISH_EMP + '% EMP'; k = Math.min(1, A.pt / 250, (3000 - A.pt) / 400); }
    else if (A.phase === 'over') { title = 'OUT OF SHIPS'; sub = A.kills + ' HITS   +' + A.earned; k = Math.min(1, A.pt / 250, (2400 - A.pt) / 400); }
    else return;
    ctx.save(); ctx.globalAlpha = Math.max(0, k); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 18 * sf; ctx.shadowColor = '#00f3ff';
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.floor(56 * sf)}px 'Oxanium'`; ctx.fillText(title, W / 2, H * 0.36);
    ctx.fillStyle = '#ffea00'; ctx.shadowColor = '#ffea00'; ctx.font = `800 ${Math.floor(24 * sf)}px 'Oxanium'`; ctx.fillText(sub, W / 2, H * 0.36 + 50 * sf);
    ctx.shadowBlur = 0; ctx.fillStyle = '#cfe8ff'; ctx.font = `700 ${Math.floor(14 * sf)}px 'Share Tech Mono', monospace`; ctx.fillText(sub2, W / 2, H * 0.36 + 82 * sf);
    ctx.restore();
}

// the controls, in plain words, on screen all the time (big during the intro, a quiet strip afterwards)
function drawArcadeControls(ctx, A, W, H, sf) {
    const big = A.phase === 'intro', y = big ? H * 0.36 + 100 * sf : H - 14 * sf;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (big) { ctx.globalAlpha = Math.max(0, Math.min(1, A.pt / 300, (2000 - A.pt) / 400)); ctx.fillStyle = '#00f3ff'; ctx.shadowBlur = 12 * sf; ctx.shadowColor = '#00f3ff'; ctx.font = `800 ${Math.floor(26 * sf)}px 'Oxanium'`; ctx.fillText('ARROW KEYS = MOVE        SPACE = SHOOT', W / 2, y); ctx.shadowBlur = 0; ctx.fillStyle = '#cfe8ff'; ctx.font = `700 ${Math.floor(14 * sf)}px 'Share Tech Mono', monospace`; ctx.fillText('(WASD works too)   Enter = EMP bomb when your EMP bar is full', W / 2, y + 30 * sf); }
    else { ctx.fillStyle = 'rgba(207,232,255,0.7)'; ctx.font = `700 ${Math.floor(14 * sf)}px 'Share Tech Mono', monospace`; ctx.fillText('ARROW KEYS = MOVE     SPACE = SHOOT', W / 2, y); }
    ctx.restore();
}

function drawArcadeHud(ctx, A, W, sf) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 8 * sf; ctx.shadowColor = '#00f3ff';
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.floor(16 * sf)}px 'Oxanium'`;
    ctx.fillText('ARCADE   LEVEL ' + A.level + '/' + ARC.LEVELS + '   ' + ARC.NAMES[Math.max(0, A.level - 1)], W / 2, 72 * sf);
    ctx.shadowBlur = 0;
    for (let i = 0; i < A.maxLives; i++) {   // ships left
        const x = W / 2 - 132 * sf + i * 22 * sf, y = 96 * sf, on = i < A.lives;
        ctx.fillStyle = on ? '#00f3ff' : 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.moveTo(x, y - 8 * sf); ctx.lineTo(x + 8 * sf, y + 7 * sf); ctx.lineTo(x, y + 3 * sf); ctx.lineTo(x - 8 * sf, y + 7 * sf); ctx.closePath(); ctx.fill();
    }
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffea00'; ctx.font = `800 ${Math.floor(15 * sf)}px 'Oxanium'`; ctx.fillText('HITS ' + A.kills + '   +' + A.earned, W / 2 - 52 * sf, 96 * sf);
    ctx.restore();
}

function drawArcade(ctx) {
    const A = STATE.arcade, W = canvas.width, H = canvas.height, sf = STATE.sf, t = Date.now();
    if (A.asking) { drawArcadeAsk(ctx, A, W, H, sf); return; }
    if (!A.on) return;
    ctx.save();
    if (A.level === 2 && A.phase === 'play') { const G = crawlerGeom(); for (const m of A.shrooms) drawShroom(ctx, m, G, sf); }
    for (const e of A.foes) {
        if (e.hp <= 0 || e.state === 'wait') continue;
        if (e.type === 'seg') { drawSeg(ctx, e, t); continue; }
        if (e.type === 'spider') { drawSpider(ctx, e, t); continue; }
        if (e.type === 'saucer') { drawSaucer(ctx, e, t); continue; }
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang - Math.PI / 2);
        (e.type === 'bee' ? drawBee : e.type === 'fly' ? drawFly : drawCmd)(ctx, e, sf, t);
        ctx.restore();
    }
    for (const b of A.bombs) drawBomb(ctx, b, sf);
    for (const p of A.trail) {   // engine glow trail
        const a = p.life / 380; ctx.fillStyle = `rgba(0,200,255,${(a * 0.55).toFixed(3)})`; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, (2 + (1 - a) * 4) * sf, 0, Math.PI * 2); ctx.fill();
    }
    for (const s of A.shots) {   // plasma bolts with a fading tail
        const g = ctx.createLinearGradient(0, s.y - 14 * sf, 0, s.y + 28 * sf);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, '#ffea00'); g.addColorStop(1, 'rgba(255,110,0,0)');
        ctx.fillStyle = g; ctx.shadowBlur = 14 * sf; ctx.shadowColor = '#ffea00';
        ctx.beginPath(); ctx.roundRect(s.x - 2.5 * sf, s.y - 14 * sf, 5 * sf, 42 * sf, 2.5 * sf); ctx.fill();
    }
    if (A.dead <= 0 && !(A.invuln > 0 && Math.floor(t / 90) % 2)) drawArcadeShip(ctx, A, sf);   // blinks while it is safe after a respawn
    ctx.restore();
    drawArcadeHud(ctx, A, W, sf); drawArcadeBanner(ctx, A, W, H, sf); drawArcadeControls(ctx, A, W, H, sf);
}
