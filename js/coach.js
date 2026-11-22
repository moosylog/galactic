/* © 2026 Moosy Research. All rights reserved. */
// Flight training: the first Beginner run opens with a one-minute lesson on the real keyboard (see startGame in main.js).
// It uses the real letters and the real keyboard glow, but the letters wait for you and nothing can hurt you.
//   1  one word:   type the glowing key, then the rest in order      2  two words: pick either one
//   3  mistakes:   press a wrong key on purpose, see that nothing breaks
//   4  and 5       two short cards: health and keys, then the boss and the arcade
// SPACE moves on from a card, TAB skips the whole training. It plays on Beginner runs until it has been finished (or skipped) once.
const COACH = [
    { kind: 'card', title: 'FLIGHT TRAINING', lines: ['Welcome, pilot! This is a one-minute lesson.', 'Nothing can hurt you here. Take your time.', 'Words appear above your keyboard, one letter per ship.'], foot: 'SPACE = START      TAB = SKIP TRAINING' },
    { kind: 'word', words: 1, title: '1 / 5   FIND THE GLOWING KEY' },
    { kind: 'word', words: 2, title: '2 / 5   TWO WORDS' },
    { kind: 'word', words: 1, title: '3 / 5   MISTAKES ARE OK' },
    { kind: 'card', title: '4 / 5   HEALTH AND KEYS', lines: ['In the real game, letters dive at your keyboard.', 'Miss one and you lose a little health (the bar at the top).', 'Beginner is gentle: lots of health, slow letters.', 'You start with the HOME ROW only. Type clean and more keys unlock.'], foot: 'SPACE = CONTINUE' },
    { kind: 'card', title: '5 / 5   BOSSES AND ARCADE', lines: ['Every 5th wave a BOSS may steal the keys you mistype.', 'A stolen key turns GRAY on the keyboard: practice it to win it back.', 'Shoot the purple ARCADE drone for a bonus shoot-out.'], foot: 'SPACE = START WAVE 1' }
];

function coachOn() { return !!STATE.coach; }
function startCoach() {
    enemies.length = 0; STATE.currentTarget = null; STATE.isSpawning = false;
    STATE.coach = { step: 0, t: 0, freeze: true, wrong: false, spawned: false, spawnT: 0, doneAt: 0 };
}
function coachSpawn(n) {
    STATE.waveFirsts = new Set(); STATE.waveLetters = 0; STATE.waveWords = n; STATE.taFadeOutTime = performance.now() + 600000;
    for (let w = 0; w < n; w++) {
        STATE.slot = freeRow();
        let word = getWordForWave(1, false, null);
        for (let tries = 0; tries < 12 && STATE.waveFirsts.has(word[0]); tries++) word = getWordForWave(1, false, null);
        STATE.waveFirsts.add(word[0]);
        const wordId = 'T' + Date.now() + w;
        for (let i = 0; i < word.length; i++) enemies.push(new SwarmEnemy(word, i, word.length, wordId));
    }
}
function coachNext() {
    const c = STATE.coach; if (!c) return;
    c.step++; c.t = 0; c.wrong = false; c.spawned = false; c.doneAt = 0;
    if (c.step >= COACH.length) endCoach();
}
function endCoach() {
    if (!STATE.coach) return;
    STATE.coach = null; enemies.length = 0; STATE.currentTarget = null; STATE.score = 0; STATE.combo = 0; STATE.maxCombo = 0; STATE.waveTotal = 0; STATE.waveCorrect = 0; updateUI();
    savePrefs({ trainingDone: true });
    createPopText('WAVE 1: GO!', canvas.width / 2, canvas.height / 2, '#00f3ff');
    spawnWave();
}
function coachOnWrong() { if (STATE.coach) STATE.coach.wrong = true; }

// returns true when the key press belongs to the training
function coachKey(e) {
    const c = STATE.coach; if (!c || !STATE.active || STATE.paused) return false;
    if (e.key === 'Tab') { if (e.preventDefault) e.preventDefault(); endCoach(); return true; }
    if (COACH[c.step].kind === 'card') {
        if (e.preventDefault) e.preventDefault();
        if (e.code === 'Space' && !e.repeat && c.t > 400) coachNext();
        return true;
    }
    if (e.key === 'Enter') return true;   // no EMP in training
    return false;
}

function coachUpdate(dt) {
    const c = STATE.coach; if (!c) return;
    c.t += dt;
    if (COACH[c.step].kind !== 'word') return;
    if (!c.spawned) { coachSpawn(COACH[c.step].words); c.spawned = true; c.spawnT = c.t; return; }
    if (c.t - c.spawnT > 1000 && enemies.length === 0) { if (!c.doneAt) c.doneAt = c.t; else if (c.t - c.doneAt > 800) coachNext(); }   // all letters typed
}

// what the panel says right now
function coachText() {
    const c = STATE.coach, S = COACH[c.step];
    if (S.kind === 'card') return { title: S.title, lines: S.lines, foot: S.foot };
    const started = !!STATE.currentTarget || enemies.some(e => e.targeted);
    if (c.step === 1) return { title: S.title, lines: started ? ['Nice! Keep going, one letter at a time, in order.'] : ['Type the FIRST letter of the word.', 'The key that glows white on your keyboard shows you which one.'], foot: 'TAB = SKIP TRAINING' };
    if (c.step === 2) return { title: S.title, lines: started ? ['Good. Finish this word, then do the other one.'] : ['Two words now. Pick either one:', 'type its first letter, then finish it.'], foot: 'TAB = SKIP TRAINING' };
    return { title: S.title, lines: c.wrong ? ['See? Nothing bad happened. A wrong key only resets your combo.', 'Now finish the word.'] : ['Press a key that is NOT glowing. Go on, try it!', 'Mistakes never cost you health on Beginner.'], foot: 'TAB = SKIP TRAINING' };
}

function drawCoach(ctx) {
    const c = STATE.coach; if (!c || arcadeOn()) return;
    const sf = STATE.sf, W = canvas.width, H = canvas.height, t = coachText(), pw = Math.min(820 * sf, W * 0.86), ph = (96 + t.lines.length * 30) * sf, px = W / 2 - pw / 2, py = H * 0.42 - ph / 2;
    ctx.save(); ctx.fillStyle = 'rgba(6,10,24,0.88)'; ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2.5 * sf; ctx.shadowBlur = 20 * sf; ctx.shadowColor = '#00f3ff';
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12 * sf); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffea00'; ctx.font = `800 ${Math.floor(22 * sf)}px 'Oxanium'`; ctx.fillText(t.title, W / 2, py + 30 * sf);
    ctx.fillStyle = '#ffffff'; ctx.font = `700 ${Math.floor(18 * sf)}px 'Share Tech Mono', monospace`;
    t.lines.forEach((ln, i) => ctx.fillText(ln, W / 2, py + 66 * sf + i * 28 * sf));
    ctx.fillStyle = 'rgba(207,232,255,' + (0.55 + 0.4 * Math.sin(Date.now() / 300)) + ')'; ctx.font = `700 ${Math.floor(14 * sf)}px 'Share Tech Mono', monospace`;
    ctx.fillText(t.foot, W / 2, py + ph - 20 * sf);
    ctx.restore();
}
