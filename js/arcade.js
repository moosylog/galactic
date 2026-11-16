/* © 2026 Moosy Research. All rights reserved. */
// Arcade mode: an optional, time-limited power-up.
// Shoot the purple ARCADE drone (type its letter), then press SPACE within a few seconds to launch. The on-screen keyboard is removed
// and you fly a ship with the arrow keys, firing double shots with SPACE. Every letter you hit scores flat points. Combo, accuracy and
// WPM are left alone, and Enter still fires the EMP. It is never offered (and it ends) during bosses, rescues and snake waves.
const ARCADE_SECONDS = 15;        // how long the mode lasts
const ARCADE_OFFER_SECONDS = 8;   // how long you have to press SPACE after collecting the drone
const ARCADE_KILL_POINTS = 100;   // per letter, before the score multiplier and difficulty modifier

function freshArcade() { return { on: false, offerLeft: 0, timeLeft: 0, keys: {}, shots: [], x: 0, y: 0, cool: 0, kills: 0, wave: 0, earned: 0, guarantee: false }; }

// bosses, rescues, snake waves and hyperspace do not mix with free flying
function arcadeBlocked() { return !!(STATE.bossRef || (STATE.hostages && STATE.hostages.active) || STATE.snakeWave || STATE.isHyperspace); }

// the pickup is rare: at most one per wave, roughly once every 40 s of play
function maybeSpawnArcadeDrone(dt) {
    const A = STATE.arcade;
    if (!STATE.active || STATE.wave < 2 || A.on || A.offerLeft > 0 || A.wave === STATE.wave || arcadeBlocked()) return;
    if (bonusDrones.some(b => b.kind === 'arcade')) return;
    if (A.guarantee || Math.random() < 0.0004 * (dt / 16)) { bonusDrones.push(new BonusDrone(false, 'arcade')); A.wave = STATE.wave; A.guarantee = false; }
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
    A.on = true; A.offerLeft = 0; A.timeLeft = ARCADE_SECONDS * 1000; A.kills = 0; A.earned = 0; A.cool = 0; A.shots = []; A.keys = {};
    A.x = canvas.width / 2; A.y = H - 40 * sf;
    STATE.currentTarget = null;   // no half-typed word while the keyboard is gone
    AudioFX.arcade();
    createPopText('ARCADE MODE!  ARROWS + SPACE', canvas.width / 2, canvas.height / 2 - 60 * STATE.sf, '#00f3ff');
    return true;
}

function endArcade(why) {
    const A = STATE.arcade; if (!A.on) return;
    A.on = false; A.keys = {}; A.shots = [];
    createPopText((why || 'ARCADE OVER') + (A.kills ? '  ' + A.kills + ' HIT' + (A.kills > 1 ? 'S' : '') + '  +' + A.earned : ''), canvas.width / 2, canvas.height / 2 - 60 * STATE.sf, '#00f3ff');
}

// Keyboard: returns true when the key press is consumed here. Releases are always processed so a key can never stay stuck.
function arcadeKey(e, down) {
    const A = STATE.arcade; if (!A) return false;
    const dir = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
    if (!down) { if (dir) A.keys[dir] = false; if (e.code === 'Space') A.keys.fire = false; return false; }
    if (!STATE.active || STATE.paused) return false;
    if (A.on) {
        if (dir) { A.keys[dir] = true; e.preventDefault(); return true; }
        if (e.code === 'Space') { A.keys.fire = true; e.preventDefault(); return true; }
        if (e.key === 'Enter') return false;   // the EMP still works
        return true;                           // the keyboard is removed: letters do nothing
    }
    if (e.code === 'Space' && A.offerLeft > 0) { e.preventDefault(); return startArcade(); }   // false when it cannot start (a boss is here)
    return false;
}

// per frame: the offer countdown, the ship, the shots and the hits
function arcadeUpdate(dt) {
    const A = STATE.arcade, W = canvas.width, H = canvas.height, sf = STATE.sf;
    if (A.offerLeft > 0) { A.offerLeft -= dt; if (arcadeBlocked()) A.offerLeft = 0; }
    if (!A.on) return;
    if (arcadeBlocked()) { endArcade('ARCADE ENDS'); return; }
    A.timeLeft -= dt; if (A.timeLeft <= 0) { endArcade('ARCADE OVER'); return; }

    // the ship lives in the band the keyboard used to fill
    const yMax = H - 30 * sf, yMin = Math.max(Math.min(H - hudHeight() + 20 * sf, yMax), H * 0.6), speed = 620 * sf * dt / 1000;
    A.x = Math.max(30 * sf, Math.min(W - 30 * sf, A.x + ((A.keys.right ? 1 : 0) - (A.keys.left ? 1 : 0)) * speed));
    A.y = Math.max(yMin, Math.min(yMax, A.y + ((A.keys.down ? 1 : 0) - (A.keys.up ? 1 : 0)) * speed * 0.7));

    A.cool -= dt;
    if (A.keys.fire && A.cool <= 0 && A.shots.length < 12) {   // a double shot
        A.shots.push({ x: A.x - 11 * sf, y: A.y - 24 * sf, active: true }, { x: A.x + 11 * sf, y: A.y - 24 * sf, active: true });
        A.cool = 150; AudioFX.laser(A.x / W);
    }

    const diffScoreMod = DATA.DIFFICULTY[STATE.difficulty || 'contender'].scoreMod, r = 28 * sf;
    for (const s of A.shots) {
        s.y -= 1100 * sf * dt / 1000; if (s.y < -20 * sf) { s.active = false; continue; }
        for (const e of enemies) {
            if (!e.active || e.targeted || e.isBoss || e.isPractice || e.state === 'ufo' || e.state === 'snake') continue;
            if (Math.abs(e.x - s.x) < r && Math.abs(e.y - s.y) < r) {
                e.active = false; s.active = false; createExplosion(e.x, e.y, e.color); AudioFX.explode();
                const pts = Math.floor(ARCADE_KILL_POINTS * STATE.scoreMultiplier * diffScoreMod);
                STATE.score += pts; A.earned += pts; A.kills++;
                if (STATE.challenge) STATE.challengeHit = (STATE.challengeHit || 0) + 1;
                updateUI(); break;
            }
        }
    }
    A.shots = A.shots.filter(s => s.active);
}

function drawArcade(ctx) {
    const A = STATE.arcade, W = canvas.width, sf = STATE.sf;
    ctx.save(); ctx.textAlign = 'center'; ctx.font = `800 ${Math.floor(16 * sf)}px 'Oxanium'`;
    if (A.offerLeft > 0 && !A.on) {
        ctx.fillStyle = '#bc13fe'; ctx.shadowBlur = 12 * sf; ctx.shadowColor = '#bc13fe';
        if (Math.floor(Date.now() / 300) % 2 === 0) ctx.fillText('ARCADE MODE READY: PRESS SPACE (' + Math.ceil(A.offerLeft / 1000) + ')', W / 2, 74 * sf);
    }
    if (A.on) {
        const bw = 260 * sf, bx = W / 2 - bw / 2, by = 52 * sf, f = Math.max(0, A.timeLeft / (ARCADE_SECONDS * 1000));
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(bx, by, bw, 6 * sf);
        ctx.fillStyle = f > 0.3 ? '#00f3ff' : '#ff0055'; ctx.fillRect(bx, by, bw * f, 6 * sf);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 8 * sf; ctx.shadowColor = '#00f3ff';
        ctx.fillText('ARCADE  ' + Math.ceil(A.timeLeft / 1000) + 's   HITS ' + A.kills, W / 2, by + 28 * sf);
        // shots: a pair of short beams
        ctx.shadowBlur = 14 * sf; ctx.shadowColor = '#ffea00'; ctx.fillStyle = '#ffea00';
        for (const s of A.shots) ctx.fillRect(s.x - 2 * sf, s.y - 12 * sf, 4 * sf, 24 * sf);
        // ship: a slim delta with two forward cannons
        ctx.translate(A.x, A.y); ctx.shadowBlur = 18 * sf; ctx.shadowColor = '#00f3ff';
        ctx.fillStyle = '#0b1a24'; ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2 * sf;
        ctx.beginPath();
        [[0, -26], [9, -6], [30, 14], [30, 22], [12, 16], [0, 22], [-12, 16], [-30, 22], [-30, 14], [-9, -6]].forEach(([x, y], i) => i ? ctx.lineTo(x * sf, y * sf) : ctx.moveTo(x * sf, y * sf));
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 3 * sf; ctx.beginPath();
        ctx.moveTo(-11 * sf, -2 * sf); ctx.lineTo(-11 * sf, -22 * sf); ctx.moveTo(11 * sf, -2 * sf); ctx.lineTo(11 * sf, -22 * sf); ctx.stroke();
        ctx.fillStyle = '#ffea00'; ctx.shadowColor = '#ffea00'; ctx.beginPath();
        ctx.moveTo(-5 * sf, 22 * sf); ctx.lineTo(0, (30 + Math.random() * 8) * sf); ctx.lineTo(5 * sf, 22 * sf); ctx.fill();
    }
    ctx.restore();
}
