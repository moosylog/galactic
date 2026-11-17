/* © 2026 Moosy Research. All rights reserved. */
// Arcade mode: an optional, time-limited power-up.
// Shoot the purple ARCADE drone (type its letter), then press SPACE within a few seconds to launch. The keyboard, the letters and the word
// display all disappear, and you fly a ship with the arrow keys (left and right, and up into the lower part of the screen), firing double
// shots with SPACE. Every enemy you hit scores flat points. Combo, accuracy and WPM are left alone, and Enter still fires the EMP.
// It is never offered (and it ends) during bosses, rescues and snake waves.
const ARCADE_SECONDS = 30;        // how long the mode lasts
const ARCADE_OFFER_SECONDS = 8;   // how long you have to press SPACE after collecting the drone
const ARCADE_KILL_POINTS = 100;   // per enemy, before the score multiplier and difficulty modifier
const ARCADE_TOP_SPEED = 560;     // ship speed in pixels per second at scale 1
const ARCADE_MARGIN = 48;         // the ship stays this far from the side edges
const ARCADE_BONUS_EVERY = 8;      // every this many hits the timer gets a little longer
const ARCADE_BONUS_MS = 1500;      // how much longer
const ARCADE_BONUS_CAP_MS = 6000;  // at most this much extra time in one flight
const ARCADE_ZONE_TOP = 0.58;     // the ship can fly up to this share of the screen height (from the top)

function freshArcade() { return { on: false, offerLeft: 0, timeLeft: 0, keys: {}, fireQueued: false, shots: [], x: 0, y: 0, vx: 0, vy: 0, cool: 0, kills: 0, wave: 0, earned: 0, guarantee: false, age: 0, flash: 0, trail: [], trailT: 0, streak: 0, bonusMs: 0 }; }

// bosses, rescues, snake waves and hyperspace do not mix with free flying
function arcadeBlocked() { return !!(STATE.bossRef || (STATE.hostages && STATE.hostages.active) || STATE.snakeWave || STATE.isHyperspace); }

// the pickup is rare: at most one per wave, roughly once every 40 s of play
function maybeSpawnArcadeDrone(dt) {
    const A = STATE.arcade;
    if (!STATE.active || STATE.wave < 2 || A.on || A.offerLeft > 0 || A.wave === STATE.wave || arcadeBlocked()) return;
    if (bonusDrones.some(b => b.kind === 'arcade')) return;
    if (A.guarantee || Math.random() < 0.0004 * (dt / 16)) {
        bonusDrones.push(new BonusDrone(false, 'arcade')); A.wave = STATE.wave; A.guarantee = false;
        AudioFX.arcade(); createPopText('ARCADE DRONE!  TYPE ITS LETTER', canvas.width / 2, canvas.height / 2 - 100 * STATE.sf, '#bc13fe');
    }
}

function arcadeCollected() {
    const A = STATE.arcade;
    if (arcadeBlocked() || A.on) { createPopText('ARCADE DRONE LOST', canvas.width / 2, canvas.height / 2 - 60 * STATE.sf, '#bc13fe'); return; }
    A.offerLeft = ARCADE_OFFER_SECONDS * 1000;
    AudioFX.arcade();
    createPopText('ARCADE MODE READY!  PRESS SPACE', canvas.width / 2, canvas.height / 2 - 60 * STATE.sf, '#bc13fe');
}

function startArcade() {
    const A = STATE.arcade;
    if (A.on || A.offerLeft <= 0 || arcadeBlocked()) return false;
    const H = canvas.height, sf = STATE.sf;
    A.on = true; A.offerLeft = 0; A.timeLeft = ARCADE_SECONDS * 1000; A.kills = 0; A.earned = 0; A.cool = 0; A.shots = []; A.keys = {}; A.fireQueued = false;
    A.vx = 0; A.vy = 0; A.age = 0; A.flash = 0; A.trail = []; A.trailT = 0; A.streak = 0; A.bonusMs = 0; bonusDrones = [];   // drones carry a letter, so none stay on screen
    A.x = canvas.width / 2; A.y = H - 36 * sf;
    STATE.currentTarget = null;   // no half-typed word while the keyboard is gone
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}   // a focused button would eat Space
    AudioFX.arcade();
    createPopText('ARCADE MODE!  ARROWS + SPACE', canvas.width / 2, canvas.height / 2 - 60 * STATE.sf, '#00f3ff');
    return true;
}

function endArcade(why) {
    const A = STATE.arcade; if (!A.on) return;
    A.on = false; A.keys = {}; A.shots = []; A.fireQueued = false;
    createPopText((why || 'ARCADE OVER') + (A.kills ? '  ' + A.kills + ' HIT' + (A.kills > 1 ? 'S' : '') + '  +' + A.earned : ''), canvas.width / 2, canvas.height / 2 - 60 * STATE.sf, '#00f3ff');
}

// Keyboard: returns true when the key press is consumed here. Releases are always processed so a key can never stay stuck.
function arcadeKey(e, down) {
    const A = STATE.arcade; if (!A) return false;
    const dir = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
    if (!down) {
        if (dir) { A.keys[dir] = false; if (A.on && e.preventDefault) e.preventDefault(); }
        if (e.code === 'Space') { A.keys.fire = false; if ((A.on || A.offerLeft > 0) && e.preventDefault) e.preventDefault(); }
        return false;
    }
    if (!STATE.active || STATE.paused) return false;
    if (A.on) {
        if (dir) { A.keys[dir] = true; e.preventDefault(); return true; }
        if (e.code === 'Space') { A.keys.fire = true; A.fireQueued = true; e.preventDefault(); return true; }
        if (e.key === 'Enter') return false;   // the EMP still works
        return true;                           // the keyboard is removed: letters do nothing
    }
    if (e.code === 'Space' && A.offerLeft > 0) { e.preventDefault(); return startArcade(); }   // false when it cannot start (a boss is here)
    return false;
}

// one enemy destroyed: flat points with a +points pop-up, and every 8th hit in a row of the flight adds a little time (up to 6 s)
function arcadeKill(e) {
    const A = STATE.arcade, sf = STATE.sf, diffScoreMod = DATA.DIFFICULTY[STATE.difficulty || 'contender'].scoreMod;
    e.active = false; createExplosion(e.x, e.y, e.color); AudioFX.explode();
    const pts = Math.floor(ARCADE_KILL_POINTS * STATE.scoreMultiplier * diffScoreMod);
    STATE.score += pts; A.earned += pts; A.kills++;
    createPopText('+' + pts, e.x, e.y - 22 * sf, '#ffea00');
    if (++A.streak >= ARCADE_BONUS_EVERY) {
        A.streak = 0;
        if (A.bonusMs < ARCADE_BONUS_CAP_MS) { A.timeLeft += ARCADE_BONUS_MS; A.bonusMs += ARCADE_BONUS_MS; createPopText('+' + (ARCADE_BONUS_MS / 1000) + 's', A.x, A.y - 64 * sf, '#00f3ff'); }
    }
    if (STATE.challenge) STATE.challengeHit = (STATE.challengeHit || 0) + 1;
    updateUI();
}

// per frame: the offer countdown, the ship, the shots and the hits
function arcadeUpdate(dt) {
    const A = STATE.arcade, W = canvas.width, H = canvas.height, sf = STATE.sf;
    if (A.offerLeft > 0) { A.offerLeft -= dt; if (arcadeBlocked()) A.offerLeft = 0; }
    if (!A.on) return;
    if (arcadeBlocked()) { endArcade('ARCADE ENDS'); return; }
    A.timeLeft -= dt; if (A.timeLeft <= 0) { endArcade('ARCADE OVER'); return; }

    // the ship flies in the lower part of the screen, with a little inertia so it banks and glides
    const yMax = H - 36 * sf, yMin = H * ARCADE_ZONE_TOP, top = ARCADE_TOP_SPEED * sf, k = Math.min(1, dt / 70);
    A.vx += (((A.keys.right ? 1 : 0) - (A.keys.left ? 1 : 0)) * top - A.vx) * k;
    A.vy += (((A.keys.down ? 1 : 0) - (A.keys.up ? 1 : 0)) * top * 0.8 - A.vy) * k;
    A.x += A.vx * dt / 1000; A.y += A.vy * dt / 1000;
    if (A.x < ARCADE_MARGIN * sf) { A.x = ARCADE_MARGIN * sf; A.vx = 0; } else if (A.x > W - ARCADE_MARGIN * sf) { A.x = W - ARCADE_MARGIN * sf; A.vx = 0; }
    if (A.y < yMin) { A.y = yMin; A.vy = 0; } else if (A.y > yMax) { A.y = yMax; A.vy = 0; }
    A.age += dt; A.flash = Math.max(0, A.flash - dt);
    A.trailT -= dt; if (A.trailT <= 0) { A.trailT = 30; for (const sx of [-1, 1]) A.trail.push({ x: A.x + sx * 13 * sf, y: A.y + 26 * sf, life: 380 }); }
    for (const p of A.trail) { p.life -= dt; p.y += 110 * sf * dt / 1000; }
    A.trail = A.trail.filter(p => p.life > 0).slice(-70);

    A.cool -= dt;
    if ((A.keys.fire || A.fireQueued) && A.cool <= 0 && A.shots.length < 12) {
        A.fireQueued = false;   // a double shot from the two cannons
        A.shots.push({ x: A.x - 18 * sf, y: A.y - 34 * sf, active: true }, { x: A.x + 18 * sf, y: A.y - 34 * sf, active: true });
        A.cool = 150; A.flash = 70; AudioFX.laser(A.x / W);
    }

    const r = 28 * sf;
    for (const s of A.shots) {
        s.y -= 1100 * sf * dt / 1000; if (s.y < -20 * sf) { s.active = false; continue; }
        for (const e of enemies) {
            if (!e.active || e.targeted || e.isBoss || e.isPractice || e.state === 'ufo' || e.state === 'snake') continue;
            if (Math.abs(e.x - s.x) < r && Math.abs(e.y - s.y) < r) {
                s.active = false; arcadeKill(e); break;
            }
        }
    }
    A.shots = A.shots.filter(s => s.active);
}

// The ship: a swept-wing fighter with twin cannons, a glass canopy and two engines. It banks as it moves, its flames follow the throttle,
// the cannons flash when they fire, and it warps in when the mode starts.
function drawArcadeShip(ctx, A, sf) {
    const u = sf * 1.2, t = Date.now(), bank = Math.max(-1, Math.min(1, A.vx / (ARCADE_TOP_SPEED * sf)));
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

function drawArcade(ctx) {
    const A = STATE.arcade, W = canvas.width, sf = STATE.sf;
    ctx.save(); ctx.textAlign = 'center'; ctx.font = `800 ${Math.floor(16 * sf)}px 'Oxanium'`;
    if (A.offerLeft > 0 && !A.on) {
        ctx.fillStyle = '#bc13fe'; ctx.shadowBlur = 12 * sf; ctx.shadowColor = '#bc13fe';
        if (Math.floor(Date.now() / 300) % 2 === 0) ctx.fillText('ARCADE MODE READY: PRESS SPACE (' + Math.ceil(A.offerLeft / 1000) + ')', W / 2, 74 * sf);
    }
    if (A.on) {
        const bw = 260 * sf, bx = W / 2 - bw / 2, by = 52 * sf, f = Math.max(0, Math.min(1, A.timeLeft / (ARCADE_SECONDS * 1000)));
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(bx, by, bw, 6 * sf);
        ctx.fillStyle = f > 0.3 ? '#00f3ff' : '#ff0055'; ctx.fillRect(bx, by, bw * f, 6 * sf);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 8 * sf; ctx.shadowColor = '#00f3ff';
        ctx.fillText('ARCADE  ' + Math.ceil(A.timeLeft / 1000) + 's   HITS ' + A.kills, W / 2, by + 28 * sf);
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
        drawArcadeShip(ctx, A, sf);
    }
    ctx.restore();
}
