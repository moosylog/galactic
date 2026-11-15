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

// Start-screen tune: an original arcade-style loop in A minor (8 bars, about 13 s): urgent and sparse, with a fast pulsing arpeggio,
// blunt square-wave stabs for the lead, a driving bass, a hard beat and falling siren dives. It follows the same Music setting as the in-game music.
const MenuMusic = {
    running: false, paused: false, step: 0, nextTime: 0, tempo: 148, timer: null, master: null,
    // one entry per bar: the lead melody (one token per eighth note: a note name, '-' for a rest, '=' to hold the last note), bass root and fifth, chord tones for the arpeggio
    BARS: [
        { lead: 'A5 - A5 - A5 C6 B5 A5',     root: 'A2', fifth: 'E3', tri: ['A3', 'C4', 'E4'] },
        { lead: 'E6 - E6 - E6 D6 C6 B5',     root: 'A2', fifth: 'E3', tri: ['A3', 'C4', 'E4'] },
        { lead: 'F5 - F5 - F5 A5 G5 F5',     root: 'F2', fifth: 'C3', tri: ['F3', 'A3', 'C4'] },
        { lead: 'G5 - B5 - D6 = B5 G5',      root: 'G2', fifth: 'D3', tri: ['G3', 'B3', 'D4'] },
        { lead: 'A5 C6 E6 A6 = E6 C6 A5',    root: 'A2', fifth: 'E3', tri: ['A3', 'C4', 'E4'] },
        { lead: 'B5 D6 E6 B5 C6 = A5 -',     root: 'A2', fifth: 'E3', tri: ['A3', 'C4', 'E4'] },
        { lead: 'D6 - D6 - F6 E6 D6 A5',     root: 'D3', fifth: 'A3', tri: ['D4', 'F4', 'A4'] },
        { lead: 'E6 D6 B5 G#5 E5 - E5 -',    root: 'E2', fifth: 'B2', tri: ['E3', 'G#3', 'B3'] }
    ],
    SEMI: { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 },
    ARPPAT: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 3],   // 0-2 = chord tones, 3 = the root an octave up
    freq(name) {   // 'C5' -> Hz (A4 = 440)
        const m = /^([A-G])(#|b)?(\d)$/.exec(name); if (!m) return 0;
        const semi = (+m[3]) * 12 + this.SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
        return 440 * Math.pow(2, (semi - 57) / 12);
    },
    start() {
        if (!Music.on || this.running) return;
        initAudio(); if (!actx) return;
        this.master = actx.createGain(); this.master.gain.value = 0.0001; this.master.gain.setTargetAtTime(0.1, actx.currentTime, 0.2);
        this.master.connect(actx.destination);
        this.running = true; this.paused = false; this.step = 0; this.nextTime = actx.currentTime + 0.1;
        this.tick();
    },
    stop() {
        if (!this.running) return;
        this.running = false; clearTimeout(this.timer);
        try { this.master.gain.setTargetAtTime(0.0001, actx.currentTime, 0.06); } catch (e) {}
    },
    duck(on) {   // hidden tab: silence it, and pick the beat up again on return
        if (!this.running) return;
        this.paused = !!on; this.master.gain.setTargetAtTime(on ? 0.0001 : 0.1, actx.currentTime, 0.05);
        if (!on) this.nextTime = actx.currentTime + 0.1;
    },
    tick() {
        if (!this.running) return;
        if (this.paused) this.nextTime = actx.currentTime + 0.1;
        else while (this.nextTime < actx.currentTime + 0.25) { this.playStep(this.step, this.nextTime); this.nextTime += 60 / this.tempo / 4; this.step = (this.step + 1) % (this.BARS.length * 16); }
        this.timer = setTimeout(() => this.tick(), 60);
    },
    playStep(s, t) {
        const bar = Math.floor(s / 16), i = s % 16, b = this.BARS[bar], eighth = i >> 1, dur = 60 / this.tempo / 2;
        // beat: hard kick on 1 and 3 (plus a pickup on odd bars), snare on 2 and 4, hats on the eighths, a snare roll to close the loop
        if (i === 0 || i === 8 || (i === 14 && bar % 2 === 1)) this.kick(t);
        if (i === 4 || i === 12) this.snare(t, 1);
        if (bar === 7 && i >= 14) this.snare(t, 0.6);
        if (i % 4 === 2) this.hat(t, 0.5); else if (i % 2 === 0 && i % 4 !== 0) this.hat(t, 0.2);
        // falling siren dives, like attackers swooping down: end of bars 4 and 8
        if ((bar === 3 || bar === 7) && i === 12) this.dive(t);
        // bass: root, octave, fifth, octave on the eighths
        if (i % 2 === 0) {
            const f = [b.root, 'oct', b.fifth, 'oct', b.root, 'oct', b.fifth, 'oct'][eighth];
            this.voice(f === 'oct' ? this.freq(b.root) * 2 : this.freq(f), t, dur * 0.85, 'triangle', 0.6, 0);
        }
        // the pulsing arpeggio runs all the way through, sixteenth notes
        const ai = this.ARPPAT[i]; this.voice(ai === 3 ? this.freq(b.tri[0]) * 2 : this.freq(b.tri[ai]), t, 0.07, 'square', 0.085, 0);
        // lead: blunt, short stabs; a held token ('=') just lengthens the note before it
        if (i % 2 === 0) {
            const toks = b.lead.split(' '), tok = toks[eighth];
            if (tok !== '-' && tok !== '=') { let len = 1; while (toks[eighth + len] === '=') len++; this.voice(this.freq(tok), t, dur * (len > 1 ? len * 0.9 : 0.65), 'square', 0.28, 0); }
        }
    },
    voice(f, t, d, type, v, vib) {   // one note; vib = vibrato depth in cents (fades in after the attack)
        if (!f) return;
        const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01);
        g.gain.setValueAtTime(v, t + Math.max(0.012, d * 0.55)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        if (vib && o.detune) {
            const l = actx.createOscillator(), lg = actx.createGain(); l.frequency.value = 5.5;
            lg.gain.setValueAtTime(0.0001, t); lg.gain.linearRampToValueAtTime(vib, t + 0.16);
            l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + d + 0.02);
        }
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.02);
    },
    dive(t) {   // a falling siren sweep
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square';
        o.frequency.setValueAtTime(1700, t); o.frequency.exponentialRampToValueAtTime(240, t + 0.42);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.46);
    },
    kick(t) {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.11);
        g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.17);
    },
    snare(t, v) {   // a short square "snap" plus a high rattle (no noise buffer needed)
        [[190, 0.5], [331, 0.35], [6200, 0.12]].forEach(([f, a]) => {
            const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
            o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.1);
        });
    },
    hat(t, v) {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = 9000;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.05);
    }
};
