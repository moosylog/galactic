/* © 2026 Moosy Research. All rights reserved. */
// Combo-driven music: a loop in A minor. Layers join as your streak grows (10, 25, 50) and drop out the moment you slip.
const Music = {
    on: true, running: false, paused: false, level: 0, step: 0, nextTime: 0, tempo: 112, cut: 6000, timer: null,
    master: null, filter: null, layers: null,
    CHORDS: [
        { bass: 110.00, tri: [440.00, 523.25, 659.25] },   // Am
        { bass: 87.31,  tri: [349.23, 440.00, 523.25] },   // F
        { bass: 130.81, tri: [523.25, 659.25, 783.99] },   // C
        { bass: 98.00,  tri: [392.00, 493.88, 587.33] }    // G
    ],
    ARP: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 2, 1, 0, 1],
    start() {
        if (!this.on || this.running) return;
        initAudio(); if (!actx) return;
        const mk = v => { const g = actx.createGain(); g.gain.value = v; return g; };
        this.filter = actx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 6000;
        this.master = mk(0.0001); this.master.gain.setTargetAtTime(0.11, actx.currentTime, 0.3);
        this.filter.connect(this.master); this.master.connect(actx.destination);
        this.layers = { pulse: mk(1), bass: mk(0.0001), arp: mk(0.0001), lead: mk(0.0001) };
        Object.values(this.layers).forEach(g => g.connect(this.filter));
        this.running = true; this.paused = false; this.level = 0; this.step = 0; this.cut = 6000; this.tempo = 112;
        this.nextTime = actx.currentTime + 0.15;
        this.tick();
    },
    stop() {
        if (!this.running) return;
        this.running = false; clearTimeout(this.timer);
        try { this.master.gain.setTargetAtTime(0.0001, actx.currentTime, 0.12); } catch (e) {}
    },
    duck(on) {   // pause and resume
        if (!this.running) return;
        this.paused = on; this.master.gain.setTargetAtTime(on ? 0.0001 : 0.11, actx.currentTime, 0.05);
        if (!on) this.nextTime = actx.currentTime + 0.1;
    },
    tick() {
        if (!this.running) return;
        if (this.paused) this.nextTime = actx.currentTime + 0.1;
        else while (this.nextTime < actx.currentTime + 0.25) { this.playStep(this.step, this.nextTime); this.nextTime += 60 / this.tempo / 4; this.step = (this.step + 1) % 64; }
        this.timer = setTimeout(() => this.tick(), 60);
    },
    playStep(s, t) {
        const chord = this.CHORDS[Math.floor(s / 16) % 4], i = s % 16;
        if (i % 4 === 0) this.kick(t);
        if (i % 4 === 2) this.hat(t, 0.5); else if (i % 2 === 1) this.hat(t, 0.2);
        if (this.level >= 1 && i % 2 === 0) this.note('bass', chord.bass * ((i === 6 || i === 14) ? 2 : 1), t, 0.2, 'sawtooth', 0.5);
        if (this.level >= 2) this.note('arp', chord.tri[this.ARP[i]], t, 0.11, 'square', 0.22);
        if (this.level >= 3 && (i === 0 || i === 6 || i === 10 || i === 14)) this.note('lead', chord.tri[[0, 2, 1, 2][[0, 6, 10, 14].indexOf(i)]] * 2, t, 0.35, 'triangle', 0.5);
    },
    setLevel(n) {
        this.level = n; const now = actx.currentTime;
        [['bass', 1], ['arp', 2], ['lead', 3]].forEach(([k, need]) => this.layers[k].gain.setTargetAtTime(n >= need ? 1 : 0.0001, now, n >= need ? 0.12 : 0.04));
    },
    // called every frame: reads the combo, the wave, bosses and last stand
    update() {
        if (!this.running || this.paused) return;
        const c = STATE.combo | 0, lvl = c >= 50 ? 3 : c >= 25 ? 2 : c >= 10 ? 1 : 0;
        if (lvl !== this.level) this.setLevel(lvl);
        const boss = !!(STATE.bossRef && STATE.bossRef.active);
        this.tempo = 112 + Math.min(28, (STATE.wave || 1) * 0.7) + (boss ? 8 : 0) + (STATE.lastStand ? 6 : 0);
        const cut = STATE.lastStand ? 700 : boss ? 2600 : 6000;
        if (cut !== this.cut) { this.cut = cut; this.filter.frequency.setTargetAtTime(cut, actx.currentTime, 0.25); }
    },
    kick(t) {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g); g.connect(this.layers.pulse); o.start(t); o.stop(t + 0.18);
    },
    hat(t, v) {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = 9000;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        o.connect(g); g.connect(this.layers.pulse); o.start(t); o.stop(t + 0.05);
    },
    note(layer, f, t, d, type, v) {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(this.layers[layer]); o.start(t); o.stop(t + d + 0.02);
    }
};
