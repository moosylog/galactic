/* © 2026 Moosy Research. All rights reserved. */
"use strict";

const UI = {
    score: document.getElementById('ui-score'), 
    wave: document.getElementById('ui-wave'),
    health: document.getElementById('ui-health'), 
    combo: document.getElementById('ui-combo'),
    wpm: document.getElementById('ui-wpm'), 
    acc: document.getElementById('ui-acc'),
    empFill: document.getElementById('emp-fill'), 
    empContainer: document.getElementById('emp-container'),
    weakTracker: document.getElementById('weakness-tracker'), 
    weakText: document.getElementById('ui-weakness'),
    bossAlert: document.getElementById('boss-alert'), 
    menu: document.getElementById('menu'), 
    endScreen: document.getElementById('end-screen'),
    endScore: document.getElementById('end-score'), 
    endWave: document.getElementById('end-wave'),
    endCombo: document.getElementById('end-combo'), 
    endWpm: document.getElementById('end-wpm'), 
    endAcc: document.getElementById('end-acc'),
    hwSelect: document.getElementById('hwSelect'), 
    layoutSelect: document.getElementById('layoutSelect'), 
    diffSelect: document.getElementById('diffSelect'),
    uploadBtn: document.getElementById('lblUpload'), 
    customLayoutStr: document.getElementById('customLayoutStr'), 
    highScoreList: document.getElementById('highScoreList'),
    hostageCave: document.getElementById('hostage-cave'), 
    hostageKeys: document.getElementById('hostage-keys'), 
    practiceProgress: document.getElementById('practice-progress')
};

const UI_CACHE = { score: -1, wave: -1, hull: -1, combo: -1, wpm: -1, acc: -1 };

const bgCanvas = document.getElementById('bg-canvas'); const bgCtx = bgCanvas.getContext('2d', { alpha: false });
const canvas = document.getElementById('game-canvas'); const ctx = canvas.getContext('2d');

let STATE = {
    active: false, wave: 1, sector: 1, score: 0, combo: 0, maxCombo: 0, hull: 100, emp: 0,
    sf: 1.0, lastFrame: 0, activeKeys: {}, currentTarget: null, bossRef: null,
    bioTracker: {}, bigrams: {}, accWindow: [], suspects: [], isSpawning: false,
    highScores: [], records: { best: null, recent: [] }, kbSize: 'compact', customByHw: {}, mushrooms: [], snakeWave: false, focusKeys: new Set(), stolenKeys: [],
    
    difficulty: 'contender', isHyperspace: false,
    textAssistantEnabled: false, 
    taFadeOutTime: 0, 
    
    startTime: 0, totalKeystrokes: 0, correctKeystrokes: 0, currentWPM: 0, wpmMultiplier: 1.0, targetMultiplier: 1.0,
    scoreMultiplier: 1.0, waveTotal: 0, waveCorrect: 0, recentErrors: [], weaponJamTimer: 0,
    
    hostages: { active: false, keys: [], biogram: '', singleChar: '', progress: 0, required: 5, practiceWords: [] }
};

let enemies = []; let lasers = []; let particles = []; let popTexts = []; let stars = []; let bonusDrones = []; let fallingStar = null;

function updateHostageUI() {
    UI.hostageKeys.innerHTML = '';
    STATE.hostages.keys.forEach(k => {
        UI.hostageKeys.innerHTML += `<div class="hostage-key">${k.toUpperCase()}</div>`;
    });
    UI.practiceProgress.textContent = `PRACTICE: ${STATE.hostages.progress} / ${STATE.hostages.required}`;
}

function loadGameData() {
    try {
        const save = JSON.parse(localStorage.getItem('galactic_keystroke_save'));
        if (save) {
            if (save.version !== CURRENT_VERSION) throw new Error("Outdated cache version");
            if (save.records && Array.isArray(save.records.recent)) STATE.records = { best: save.records.best || null, recent: save.records.recent.slice(0, 10) };
            else if (Array.isArray(save.highScores) && save.highScores.length) STATE.records = { best: save.highScores.slice().sort((a, b) => b.score - a.score)[0], recent: [] };
            if (save.bigrams && typeof save.bigrams === "object") STATE.bigrams = save.bigrams;
            STATE.customByHw = {};
            if (save.customByHw && typeof save.customByHw === 'object') {
                Object.keys(save.customByHw).forEach(h => { const c = save.customByHw[h]; if (validCustom(h, c)) STATE.customByHw[h] = { names: c.names || [], arrays: c.arrays, layerIdx: c.layerIdx | 0 }; });
            } else if (save.isCustom && Array.isArray(save.customArray)) {
                // older save: one custom layout for whichever keyboard was selected. Re-link it to the keyboard its size belongs to.
                const cl = save.customLayers, arrays = (cl && Array.isArray(cl.arrays)) ? cl.arrays : [save.customArray];
                const first = arrays.find(a => Array.isArray(a) && a.length), hw = first ? hwForLength(first.length, save.baseHardware || 'go60') : null;
                if (hw) { STATE.customByHw[hw] = { names: (cl && cl.names) || [], arrays, layerIdx: save.layerIdx | 0 }; save.baseHardware = hw; }
            }
            if (save.baseHardware && DATA.GEO[save.baseHardware]) UI.hwSelect.value = save.baseHardware;
            applyCustomForHw(UI.hwSelect.value);
            const want = save.layout || 'qwerty';
            UI.layoutSelect.value = (want === 'custom' && !customLayoutArray) ? 'qwerty' : want;
            syncCustomOption(); refreshUploadLabel();
            if (UI.layoutSelect.value === 'custom') showLayerSelect(); else hideLayerSelect();
        }
    } catch (e) { 
        localStorage.removeItem('galactic_keystroke_save');
    }
    updateLayoutString();
    renderScoreboard();
}

function saveGameData() {
    try {
        const payload = {
            version: CURRENT_VERSION, records: STATE.records, bigrams: STATE.bigrams,
            baseHardware: UI.hwSelect.value, layout: UI.layoutSelect.value,
            customByHw: STATE.customByHw
        };
        localStorage.setItem('galactic_keystroke_save', JSON.stringify(payload));
    } catch (e) {}
}

function fmtWhen(e) {
    if (!e.t) return e.date || '';
    const d = new Date(e.t), p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function scoreRow(e, cls) {
    const mins = e.dur ? Math.floor(e.dur / 60) + ':' + String(e.dur % 60).padStart(2, '0') : '-';
    const keys = (e.keys && e.keys.length) ? e.keys.map(k => k.toUpperCase()).join(' ') : 'NONE YET';
    return `<div class="hof-row ${cls || ''}"><span>${fmtWhen(e)}</span><span>${mins}</span><span>${e.diff ? String(e.diff).toUpperCase() : '-'}</span><span>${e.wave}</span><b>${String(e.score).padStart(6, '0')}</b><span class="hof-keys">${keys}</span></div>`;
}
function renderScoreboard() {
    const r = STATE.records; if (!UI.highScoreList) return;
    const head = '<div class="hof-head"><span>WHEN</span><span>PLAYED</span><span>DIFFICULTY</span><span>WAVE</span><span>SCORE</span><span>TOP 5 PROBLEM KEYS</span></div>';
    let html;
    if (!r.best && r.recent.length === 0) html = '<div class="hof-empty">NO RECORDS YET. PLAY A GAME!</div>';
    else html = '<div class="hof-label gold">ALL-TIME HIGH</div>' + head + (r.best ? scoreRow(r.best, 'best') : '') + '<div class="hof-label">LAST 10 RUNS</div>' + (r.recent.length ? r.recent.map(e => scoreRow(e)).join('') : '<div class="hof-empty">NONE YET</div>');
    UI.highScoreList.innerHTML = html;
}

function resetSettings() {
    if (!confirm('Reset all settings to their defaults? Your records, statistics and saved custom layouts are kept.')) return;
    UI.hwSelect.value = 'go60'; applyCustomForHw('go60'); UI.layoutSelect.value = 'qwerty';
    syncCustomOption(); refreshUploadLabel(); hideLayerSelect(); updateLayoutString();
    setDivision('contender'); setKbSize('compact');
    const k = byId('kbSelect'); if (k) k.value = 'compact';
    const fx = byId('chk-menufx'); if (fx) fx.checked = true; setMenuFx(true);
    saveGameData(); refreshChip(); drawKbPreview();
}
function clearWordCache() {
    try { localStorage.removeItem('galactic-dict-v1'); } catch (e) {}
    alert('Word list cache cleared. It will be downloaded again the next time the page opens.');
}
function factoryReset() {
    if (confirm('WARNING: This deletes ALL saved data: records, typing statistics, saved layouts, settings and the cached word list. This cannot be undone. Proceed?')) {
        ['galactic_keystroke_save', 'galactic_kb_size', 'galactic_prefs', 'galactic-dict-v1'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
        window.location.reload();
    }
}

function toggleAdvanced() {
    const panel = document.getElementById('advanced-panel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function createPopText(text, x, y, color = '#ffea00') { popTexts.push({text, x, y, life: 1.0, color}); }
function createExplosion(x, y, color) { for(let i=0; i<25; i++) particles.push(new Particle(x, y, color)); }

function addEmpCharge(amount) {
    if(STATE.emp >= 100) return;
    STATE.emp = Math.min(100, STATE.emp + amount);
    UI.empFill.style.width = `${STATE.emp}%`;
    if(STATE.emp === 100) UI.empContainer.classList.add('emp-ready');
}

function fireEMP() {
    if(STATE.emp < 100 || STATE.hostages.active || STATE.isHyperspace) return;
    STATE.emp = 0; UI.empContainer.classList.remove('emp-ready'); UI.empFill.style.width = `0%`;
    document.body.classList.add('emp-flash'); setTimeout(()=> document.body.classList.remove('emp-flash'), 800);
    createPopText("EMP DETONATED!", canvas.width/2, canvas.height/2, '#bc13fe');
    
    if (STATE.bossRef && STATE.bossRef.state === 'idle') {
        STATE.bossRef.hp -= 2;
        if(STATE.bossRef.hp <= 0) {
            STATE.bossRef.active = false;
            createExplosion(STATE.bossRef.x, STATE.bossRef.y, STATE.bossRef.color); AudioFX.explode();
            STATE.bossRef = null;
            STATE.currentTarget = null;
        } else {
            createPopText("BOSS DAMAGE!", STATE.bossRef.x, STATE.bossRef.y - 30, '#ff0055');
        }
    }

    for(let i=enemies.length-1; i>=0; i--) {
        if(!enemies[i].isBoss && !enemies[i].isPractice) { createExplosion(enemies[i].x, enemies[i].y, enemies[i].color); STATE.score += 50; enemies.splice(i, 1); }
    }
    
    let targetExists = enemies.some(e => STATE.currentTarget && e.wordId === STATE.currentTarget.wordId);
    if (!targetExists && (!STATE.bossRef || !STATE.bossRef.active)) {
        STATE.currentTarget = null;
    }
    
    AudioFX.explode(); updateUI();
}

let actx;
function initAudio() { if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); } if (actx.state === 'suspended') actx.resume(); }

const AudioFX = {
    laser: (xRatio) => {
        if(!actx) return; let osc = actx.createOscillator(), gain = actx.createGain(); osc.type = 'square';
        const basePitch = 300 + (xRatio * 600) + Math.min(STATE.combo, 40) * 8; osc.frequency.setValueAtTime(basePitch, actx.currentTime); osc.frequency.exponentialRampToValueAtTime(basePitch * 0.2, actx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, actx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
        osc.connect(gain); gain.connect(actx.destination); osc.start(); osc.stop(actx.currentTime + 0.1);
    },
    explode: () => {
        if(!actx) return; let osc = actx.createOscillator(), gain = actx.createGain(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, actx.currentTime); osc.frequency.exponentialRampToValueAtTime(10, actx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, actx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.2);
        osc.connect(gain); gain.connect(actx.destination); osc.start(); osc.stop(actx.currentTime + 0.2);
    },
    error: () => {
        if(!actx) return; let osc = actx.createOscillator(), gain = actx.createGain(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, actx.currentTime); gain.gain.setValueAtTime(0.2, actx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, actx.currentTime + 0.15); osc.connect(gain); gain.connect(actx.destination);
        osc.start(); osc.stop(actx.currentTime + 0.15);
    },
    tractor: () => {
        if(!actx) return; let osc = actx.createOscillator(), gain = actx.createGain(); osc.type = 'sine';
        osc.frequency.setValueAtTime(400, actx.currentTime); osc.frequency.linearRampToValueAtTime(600, actx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, actx.currentTime); gain.gain.linearRampToValueAtTime(0, actx.currentTime + 1.0);
        osc.connect(gain); gain.connect(actx.destination); osc.start(); osc.stop(actx.currentTime + 1.0);
    },
    rescue: () => {
        if(!actx) return; let osc = actx.createOscillator(), gain = actx.createGain(); osc.type = 'sine';
        osc.frequency.setValueAtTime(800, actx.currentTime); osc.frequency.linearRampToValueAtTime(1200, actx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, actx.currentTime); gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.5);
        osc.connect(gain); gain.connect(actx.destination); osc.start(); osc.stop(actx.currentTime + 0.5);
    },
    bonus: () => {
        if(!actx) return; let osc = actx.createOscillator(), gain = actx.createGain(); osc.type = 'sine';
        osc.frequency.setValueAtTime(880, actx.currentTime); osc.frequency.linearRampToValueAtTime(1760, actx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, actx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.3);
        osc.connect(gain); gain.connect(actx.destination); osc.start(); osc.stop(actx.currentTime + 0.3);
    },
    boss: () => {
        if(!actx) return; let osc = actx.createOscillator(), gain = actx.createGain(); osc.type = 'sine';
        osc.frequency.setValueAtTime(400, actx.currentTime); osc.frequency.linearRampToValueAtTime(600, actx.currentTime + 0.4);
        osc.frequency.linearRampToValueAtTime(400, actx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.2, actx.currentTime); gain.gain.linearRampToValueAtTime(0, actx.currentTime + 1.0);
        osc.connect(gain); gain.connect(actx.destination); osc.start(); osc.stop(actx.currentTime + 1.0);
    }
};

function findBindings(node) {
    if (Array.isArray(node)) {
        if (node.length > 0 && (typeof node[0] === 'string' || node[0].value || node[0].behavior || node[0].c)) return node;
        for(let item of node) { let res = findBindings(item); if (res && res.length > 0) return res; }
    } else if (typeof node === 'object' && node !== null) {
        if (node.bindings) return node.bindings;
        if (node.keys) return node.keys;
        if (node.layers) return findBindings(node.layers);
        if (node.keymap) return findBindings(node.keymap);
        for(let key in node) { let res = findBindings(node[key]); if (res && res.length > 0) return res; }
    }
    return [];
}

let uploadedData = null, selectedLayerIdx = 0;
function getLayerBindings(data, idx) {
    const root = data.keymap || data;
    if (Array.isArray(root.layers) && Array.isArray(root.layers[idx])) return root.layers[idx];
    return findBindings(data);
}
function showLayerSelect() {
    const sel = document.getElementById('layerSelect'), cl = STATE.customLayers;
    if (!sel || !cl || !cl.arrays.length || UI.layoutSelect.value !== 'custom') { if (sel) sel.style.display = 'none'; return; }
    sel.innerHTML = '';
    cl.arrays.forEach((_, i) => { const o = document.createElement('option'); o.value = i; o.textContent = (cl.names && cl.names[i]) || ('Layer ' + i); sel.appendChild(o); });
    sel.value = selectedLayerIdx; sel.style.display = 'block';
}
function onLayerChange(v) {
    selectedLayerIdx = +v;
    const own = STATE.customByHw[UI.hwSelect.value]; if (own) own.layerIdx = selectedLayerIdx;
    const cl = STATE.customLayers;
    if (cl && cl.arrays[selectedLayerIdx] && cl.arrays[selectedLayerIdx].length) {
        customLayoutArray = cl.arrays[selectedLayerIdx].slice();
        UI.layoutSelect.value = 'custom'; updateLayoutString(); saveGameData();
    } else if (uploadedData) importLayout(uploadedData);
}
function importLayout(data) {
    uploadedData = data;
            let detectedHw = 'go60';
            let kbStr = (data.keyboard || data.name || "").toLowerCase();
            if(kbStr.includes('glove80')) detectedHw = 'glove80'; 
            else if(kbStr.includes('corne')) detectedHw = 'corne'; 
            else if(kbStr.includes('voyager')) detectedHw = 'voyager'; 
            else if(kbStr.includes('ansi')) detectedHw = 'ansi60';
            UI.hwSelect.value = detectedHw;
            
            let bindings = getLayerBindings(data, selectedLayerIdx) || [];
            const expectedLen = DATA.GEO[detectedHw].length;
            const limit = DATA.GEO[detectedHw].length;
            const rootObj = data.keymap || data;
            STATE.customLayers = (Array.isArray(rootObj.layers) && rootObj.layers.length) ? { names: rootObj.layer_names || [], arrays: rootObj.layers.map(l => Array.isArray(l) ? Array.from({ length: limit }, (_, i) => i < l.length ? parseRawKeyObj(l[i]) : 'NONE') : []) } : null;
            let arr = [];
            for (let i = 0; i < limit; i++) {
                if (i < bindings.length) arr.push(parseRawKeyObj(bindings[i]));
                else arr.push('NONE');
            }
            
            customLayoutArray = arr;
            STATE.customByHw[detectedHw] = STATE.customLayers ? { names: STATE.customLayers.names, arrays: STATE.customLayers.arrays, layerIdx: selectedLayerIdx } : { names: [], arrays: [arr], layerIdx: 0 };
            syncCustomOption(); UI.layoutSelect.value = 'custom';
            UI.uploadBtn.textContent = '✅ MOERGO JSON LOADED';
            if (bindings.length && bindings.length !== expectedLen) UI.uploadBtn.textContent = '⚠️ LAYER HAS ' + bindings.length + ' KEYS (EXPECTED ' + expectedLen + ')';
            setTimeout(refreshUploadLabel, 3000);
            
            updateLayoutString(); saveGameData();
            showLayerSelect();
}
function handleJsonUpload(ev) {
    const file = ev.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { try { selectedLayerIdx = 0; importLayout(JSON.parse(e.target.result)); } catch(err) { alert("Invalid JSON format."); } };
    reader.readAsText(file); ev.target.value = '';
}

function parseRawKeyObj(obj) {
    if (!obj) return 'NONE';
    if (typeof obj === 'string') return extractKeyString(obj);
    let val = obj.c || obj.v || obj.value || obj.behavior || 'NONE';
    val = String(val).replace('&', '').toUpperCase();
    if (['MO', 'TO', 'LAYER', 'TOG', 'SL'].includes(val)) return 'MO';
    
    let target = obj;
    if (obj.params && obj.params.length > 0) { 
        target = obj.params[obj.params.length - 1]; 
        while (target && target.params && target.params.length > 0) target = target.params[target.params.length - 1]; 
    }
    let extracted = target.value || target.c || target.v || val;
    return extractKeyString(String(extracted));
}

function extractKeyString(str) {
    if (!str) return 'NONE';
    let val = str.toUpperCase().replace(/&KP_/g, '').replace(/&KP\s+/g, '').replace(/&/g, '');
    let parts = val.replace(/[(),]/g, ' ').trim().split(/\s+/);
    for (let i = parts.length - 1; i >= 0; i--) { 
        let p = parts[i];
        if (p.length === 1 || DATA.SYMBOL_MAP[p] || DATA.IGN_KEYS.includes(p) || /N[0-9]/.test(p)) return DATA.SYMBOL_MAP[p] || p;
    }
    return parts[parts.length - 1] || 'NONE';
}

function updateLayoutString() {
    const hw = UI.hwSelect.value;
    const layoutType = UI.layoutSelect.value;
    if (layoutType === 'custom' && customLayoutArray) {
        UI.customLayoutStr.value = customLayoutArray.join(', ');
    } else {
        const layoutMap = (DATA.LAYOUTS && DATA.LAYOUTS[layoutType]) ? DATA.LAYOUTS[layoutType] : {};
        let baseKeys = DATA.TEMPLATES[hw].split(',').map(s => s.trim().toUpperCase());
        let finalKeys = baseKeys.map(rawChar => layoutMap[rawChar] !== undefined ? layoutMap[rawChar] : rawChar);
        UI.customLayoutStr.value = finalKeys.join(', ');
    }
}

function buildHUD() {
    STATE.activeKeys = {};
    const hw = UI.hwSelect.value; const layoutType = UI.layoutSelect.value; const geo = DATA.GEO[hw];
    let template = (layoutType === 'custom' && customLayoutArray) ? customLayoutArray : DATA.TEMPLATES[hw].split(',').map(s=>s.trim().toUpperCase());
    const layoutMap = DATA.LAYOUTS[layoutType] || {};

    let maxX = 0, maxY = 0;
    geo.forEach(k => { if(k.x > maxX) maxX = k.x; if(k.y > maxY) maxY = k.y; });

    let maxHudHeight = hudHeight(); 
    const u = Math.min((canvas.width * 0.8) / (maxX + 2), maxHudHeight / (maxY + 2));
    const offsetX = (canvas.width - (maxX * u)) / 2; const offsetY = canvas.height - maxHudHeight + (10 * STATE.sf);

    geo.forEach((k, i) => {
        let rawChar = template[i] || 'NONE'; if (rawChar === 'SPACE') rawChar = 'SPC';
        let mappedChar = layoutMap[rawChar] !== undefined ? layoutMap[rawChar] : rawChar;
        let finalChar = DATA.SYMBOL_MAP[mappedChar] || mappedChar;
        if (DATA.IGN_KEYS.includes(finalChar) || finalChar === 'NONE') return;
        finalChar = finalChar.toLowerCase();
        
        let px = offsetX + (k.x * u) + (u/2); let py = offsetY + (k.y * u) + (u/2);

        if(/^[a-z0-9\s;,.\/'\[\]\-=\\`]$/i.test(finalChar)) {
            STATE.activeKeys[finalChar] = { x: px, y: py, w: Math.max((k.w||1)*u, u*0.8), h: Math.max((k.h||1)*u, u*0.8), char: finalChar, color: (k.x < maxX/2) ? 'var(--neon-blue)' : 'var(--neon-pink)', isDual: false, isAbducted: false };
            if(!STATE.bioTracker[finalChar]) STATE.bioTracker[finalChar] = { presses: 0, misses: 0, latencies: [] };
            tagKey(STATE.activeKeys[finalChar], hw, i, k, maxX);
        }
    });
}

function drawShipHUD(time) {
    ctx.save(); ctx.lineWidth = 2 * STATE.sf; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    
    let maxHudHeight = hudHeight(); 
    let splitLine = canvas.height - maxHudHeight;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)'; ctx.lineWidth = 2 * STATE.sf; 
    ctx.shadowBlur = 20 * STATE.sf; ctx.shadowColor = 'var(--neon-blue)';
    ctx.beginPath(); ctx.moveTo(0, splitLine); ctx.lineTo(canvas.width, splitLine); ctx.stroke();
    
    let gridGrad = ctx.createLinearGradient(0, splitLine, 0, canvas.height);
    gridGrad.addColorStop(0, 'rgba(0, 243, 255, 0.05)'); gridGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gridGrad; ctx.fillRect(0, splitLine, canvas.width, canvas.height - splitLine);

    const guide = new Set();
    if (STATE.bossRef && STATE.bossRef.active && STATE.bossRef.state === 'idle' && STATE.bossRef.word) { const bc = STATE.bossRef.word[STATE.bossRef.typedIndex]; if (bc) guide.add(bc.toLowerCase()); }
    else if (STATE.currentTarget) { const gn = enemies.find(e => e.wordId === STATE.currentTarget.wordId && e.index === STATE.currentTarget.index && e.active && !e.targeted); if (gn) guide.add(gn.char); }
    else enemies.forEach(e => { if (!e.isBoss && e.index === 0 && e.active && !e.targeted && e.state !== 'ufo') guide.add(e.char); });
    ctx.save(); ctx.shadowBlur = 0; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = `${Math.max(11, 12 * STATE.sf)}px 'Share Tech Mono'`;
    ctx.fillText('WHITE GLOW = NEXT KEY    YELLOW DOT = FOCUS KEY', canvas.width - 12 * STATE.sf, splitLine - 12 * STATE.sf); ctx.restore();
    for (let char in STATE.activeKeys) {
        let k = STATE.activeKeys[char];
        if(k.isAbducted) continue; 

        let isBeingTargeted = false;
        for(let i=0; i<enemies.length; i++) { if(!enemies[i].isBoss && enemies[i].char === char && enemies[i].state === 'dive') { isBeingTargeted = true; break; } }
        
        ctx.strokeStyle = k.color; ctx.shadowBlur = 10 * STATE.sf; ctx.shadowColor = k.color;
        
        let keyGrad = ctx.createLinearGradient(k.x, k.y - k.h/2, k.x, k.y + k.h/2);
        if(k.isDual) {
            ctx.strokeStyle = 'var(--neon-yellow)'; ctx.shadowColor = 'var(--neon-yellow)'; 
            keyGrad.addColorStop(0, 'rgba(255, 234, 0, 0.4)'); keyGrad.addColorStop(1, 'rgba(255, 234, 0, 0.1)');
        } else if (isBeingTargeted) {
            ctx.strokeStyle = 'var(--neon-pink)'; ctx.shadowBlur = 30 * STATE.sf; ctx.shadowColor = 'var(--neon-pink)';
            keyGrad.addColorStop(0, 'rgba(255, 0, 85, 0.5)'); keyGrad.addColorStop(1, 'rgba(255, 0, 85, 0.1)');
        } else {
            keyGrad.addColorStop(0, 'rgba(30, 40, 50, 0.85)'); keyGrad.addColorStop(1, 'rgba(5, 10, 15, 0.95)');
        }
        ctx.fillStyle = keyGrad;

        ctx.beginPath(); ctx.roundRect(k.x - k.w/2 + 2, k.y - k.h/2 + 2, k.w - 4, k.h - 4, 6 * STATE.sf); ctx.fill(); ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1 * STATE.sf; ctx.beginPath();
        ctx.moveTo(k.x - k.w/2 + 6, k.y - k.h/2 + 4); ctx.lineTo(k.x + k.w/2 - 6, k.y - k.h/2 + 4); ctx.stroke();

        ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; let fontSize = Math.max(14, k.h * 0.5); ctx.font = `bold ${fontSize}px 'Share Tech Mono'`; ctx.fillText(char.toUpperCase(), k.x, k.y + (2 * STATE.sf));
        if (guide.has(char)) {
            const pulse = 0.6 + 0.4 * Math.sin(time / 180);
            ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 22 * STATE.sf * pulse; ctx.lineWidth = 3 * STATE.sf;
            ctx.beginPath(); ctx.roundRect(k.x - k.w/2 + 1, k.y - k.h/2 + 1, k.w - 2, k.h - 2, 6 * STATE.sf); ctx.stroke(); ctx.restore();
        } else if (STATE.focusKeys && STATE.focusKeys.has(char)) {
            ctx.fillStyle = '#ffea00'; ctx.beginPath(); ctx.arc(k.x + k.w/2 - 7 * STATE.sf, k.y - k.h/2 + 7 * STATE.sf, 3.5 * STATE.sf, 0, 6.283); ctx.fill();
        }
    }
    
    let now = performance.now();
    let taOpacity = 0;
    if (STATE.textAssistantEnabled) {
        taOpacity = 1.0;
    } else {
        let remain = STATE.taFadeOutTime - now;
        if (remain > 0) taOpacity = Math.min(1.0, remain / 1000); 
    }

    if (STATE.currentTarget && enemies.some(e => e.wordId === STATE.currentTarget.wordId && !e.isBoss && !e.isPractice)) taOpacity = 1.0;
    if (taOpacity > 0 && !STATE.hostages.active && !STATE.isHyperspace) {
        ctx.save();
        ctx.globalAlpha = taOpacity;
        let wordsMap = {};
        
        enemies.forEach(e => {
            if (e && !e.isBoss && !e.isPractice && e.word) {
                if (!wordsMap[e.wordId]) {
                    wordsMap[e.wordId] = { id: e.wordId, isBoss: false, word: e.word, typed: 0, y: e.y, index: e.index, slot: e.slot || 0, off: (e.snakeSlot !== undefined ? e.snakeSlot - e.index : 0) };
                } else if (e.index < wordsMap[e.wordId].index) {
                    wordsMap[e.wordId].y = e.y;
                }
            }
        });
        
        if (STATE.currentTarget && wordsMap[STATE.currentTarget.wordId]) {
            wordsMap[STATE.currentTarget.wordId].typed = STATE.currentTarget.index;
        }

        let wordList = Object.values(wordsMap).filter(w => w.id !== STATE.ufoId).sort((a, b) => (a.slot - b.slot) || (a.id < b.id ? -1 : 1));
        if (wordList.length > 0) {
            const rootOf = id => id.replace(/(s\d+)+$/, '');
            const locked = !!(STATE.currentTarget && wordsMap[STATE.currentTarget.wordId]);
            const anchorY = canvas.height - maxHudHeight - (70 * STATE.sf);
            // Fixed layout: each word keeps its place for the whole wave, even after its neighbours are gone or a snake splits.
            const roots = []; wordList.forEach(w => { const r = rootOf(w.id); if (roots.indexOf(r) < 0) roots.push(r); });
            if (!STATE.hLayout || roots.some(r => !STATE.hLayout.rows[r])) {
                const fulls = roots.map(r => wordList.filter(w => rootOf(w.id) === r).sort((a, b) => a.off - b.off)[0].word.toUpperCase());
                let fs = Math.floor(40 * STATE.sf), gp = 44 * STATE.sf;
                const total = () => { ctx.font = `800 ${fs}px 'Oxanium'`; return fulls.reduce((a, f) => a + ctx.measureText(f).width, 0) + gp * (fulls.length - 1); };
                while (fs > 14 && total() > canvas.width * 0.94) { fs -= 2; gp *= 0.95; }
                let lx = canvas.width / 2 - total() / 2; const rows = {};
                roots.forEach((r, i) => { rows[r] = { x: lx, full: fulls[i] }; lx += ctx.measureText(fulls[i]).width + gp; });
                STATE.hLayout = { fs, rows };
            }
            const lay = STATE.hLayout; ctx.font = `800 ${lay.fs}px 'Oxanium'`;
            wordList.forEach(w => {
                const L = lay.rows[rootOf(w.id)]; if (!L) return;
                const mine = locked && w.id === STATE.currentTarget.wordId, gold = rootOf(w.id) === STATE.goldenId;
                const px = k => L.x + ctx.measureText(L.full.slice(0, w.off + k)).width;
                if (mine) { ctx.save(); ctx.strokeStyle = '#00ff66'; ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 14 * STATE.sf; ctx.lineWidth = 2 * STATE.sf; ctx.beginPath(); ctx.roundRect(px(0) - 8 * STATE.sf, anchorY - lay.fs * 0.7, px(w.word.length) - px(0) + 16 * STATE.sf, lay.fs * 1.4, 8 * STATE.sf); ctx.stroke(); ctx.restore(); }
                for (let q = 0; q < w.word.length; q++) {
                    const ch = w.word[q].toUpperCase(), cw = ctx.measureText(ch).width;
                    ctx.shadowBlur = 0;
                    if (mine && q < w.typed) ctx.fillStyle = 'rgba(0,255,102,0.35)';
                    else if (mine && q === w.typed) { ctx.fillStyle = '#00ff66'; ctx.shadowBlur = 18 * STATE.sf; ctx.shadowColor = '#00ff66'; }
                    else if (!locked && q === 0 && w.off === 0) ctx.fillStyle = gold ? '#ffd700' : '#00ff66';
                    else ctx.fillStyle = gold ? '#ffd700' : (locked && !mine ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.92)');
                    ctx.fillText(ch, px(q) + cw / 2, anchorY);
                }
                ctx.shadowBlur = 0;
            });
            if (!locked) {
                ctx.font = `800 ${Math.floor(16 * STATE.sf)}px 'Oxanium'`; ctx.fillStyle = 'rgba(255,255,255,0.45)';
                ctx.fillText('TYPE THE FIRST LETTER OF A WORD', canvas.width / 2, anchorY + 38 * STATE.sf);
            }
        }
        ctx.restore();
    }
    
    ctx.restore();
}

function drawHeatmap() {
    const hmCanvas = document.getElementById('heatmap-canvas');
    if (!hmCanvas) return;
    const hCtx = hmCanvas.getContext('2d');
    hCtx.clearRect(0, 0, hmCanvas.width, hmCanvas.height);

    let maxLat = 1, maxErr = 0.01;
    for (let char in STATE.bioTracker) {
        let b = STATE.bioTracker[char];
        let avgLat = b.latencies.length > 0 ? b.latencies.reduce((a,v)=>a+v,0)/b.latencies.length : 0;
        let errRate = b.misses / Math.max(1, (b.presses + b.misses));
        if (avgLat > maxLat) maxLat = avgLat;
        if (errRate > maxErr) maxErr = errRate;
    }

    const hw = UI.hwSelect.value; const layoutType = UI.layoutSelect.value; const geo = DATA.GEO[hw];
    let template = (layoutType === 'custom' && customLayoutArray) ? customLayoutArray : DATA.TEMPLATES[hw].split(',').map(s=>s.trim().toUpperCase());
    const layoutMap = DATA.LAYOUTS[layoutType] || {};

    let maxX = 0, maxY = 0;
    geo.forEach(k => { if(k.x > maxX) maxX = k.x; if(k.y > maxY) maxY = k.y; });

    const margin = 20;
    const u = Math.min((hmCanvas.width - margin*2) / (maxX + 2), (hmCanvas.height - margin*2) / (maxY + 2));
    const offsetX = (hmCanvas.width - (maxX * u)) / 2; 
    const offsetY = margin;

    hCtx.textAlign = "center"; hCtx.textBaseline = "middle";

    geo.forEach((k, i) => {
        let rawChar = template[i] || 'NONE'; if (rawChar === 'SPACE') rawChar = 'SPC';
        let mappedChar = layoutMap[rawChar] !== undefined ? layoutMap[rawChar] : rawChar;
        let finalChar = DATA.SYMBOL_MAP[mappedChar] || mappedChar;
        if (DATA.IGN_KEYS.includes(finalChar) || finalChar === 'NONE') return;
        finalChar = finalChar.toLowerCase();
        
        let px = offsetX + (k.x * u) + (u/2); let py = offsetY + (k.y * u) + (u/2);
        let kw = Math.max((k.w||1)*u, u*0.8); let kh = Math.max((k.h||1)*u, u*0.8);

        if(/^[a-z0-9\s;,.\/'\[\]\-=\\`]$/i.test(finalChar)) {
            let bio = STATE.bioTracker[finalChar];
            let score = 0; 
            if (bio && (bio.presses > 0 || bio.misses > 0)) {
                let avgLat = bio.latencies.length > 0 ? bio.latencies.reduce((a,v)=>a+v,0)/bio.latencies.length : 0;
                let errRate = bio.misses / Math.max(1, (bio.presses + bio.misses));
                score = Math.min(1.0, ((avgLat / maxLat) * 0.4) + ((errRate / maxErr) * 0.6));
            }

            hCtx.fillStyle = getHeatmapColor(score);
            hCtx.strokeStyle = 'rgba(255,255,255,0.2)'; hCtx.lineWidth = 1;
            hCtx.beginPath(); hCtx.roundRect(px - kw/2 + 1, py - kh/2 + 1, kw - 2, kh - 2, 4); 
            hCtx.fill(); hCtx.stroke();
            
            hCtx.fillStyle = '#fff'; hCtx.font = `bold ${Math.max(10, kh * 0.4)}px 'Share Tech Mono'`; 
            hCtx.fillText(finalChar.toUpperCase(), px, py + 1);
        }
    });
}

function getWordForWave(wave, isBoss = false, forceBigram = null) {
    let diff = DATA.DIFFICULTY[STATE.difficulty];
    let boost = STATE.difficulty === 'apex' ? Math.min(2, Math.floor(((STATE.wave || 1) - 1) / 8)) : 0;
    let minLen = Math.min(8, diff.minLen + boost), maxLen = Math.min(8, diff.maxLen + boost);
    if (isBoss) { minLen = Math.min(8, minLen + 2); maxLen = Math.min(8, maxLen + 2); }
    let len = minLen + Math.floor(wordRand() * (maxLen - minLen + 1));
    let bucket = [];
    for (let d = 0; d < 6 && bucket.length === 0; d++) bucket = DICT_BUCKETS[len - d] || DICT_BUCKETS[len + d] || [];
    const typable = w => [...w].every(ch => STATE.activeKeys[ch]);
    const free = w => typable(w) && !STATE.stolenKeys.some(mk => w.includes(mk));
    const lim = rankLimit(), plain = STATE.difficulty === 'academy' ? (w => !/[qxzj]/.test(w)) : (() => true);
    let pool = bucket.filter(w => free(w) && WORD_RANK[w] < lim && plain(w));
    if (pool.length < 8) pool = bucket.filter(free);
    if (pool.length === 0) pool = DATA.DICTIONARY.filter(typable);
    if (pool.length === 0) return "the";
    if (forceBigram) {
        const f = pool.filter(w => !usedWords.has(w) && w.includes(forceBigram));
        if (f.length) pool = f;
    } else if (!isBoss && !STATE.daily && Math.random() < 0.35) {
        const wb = weakBigrams();
        const hit = pool.filter(w => !usedWords.has(w) && wb.some(b => w.includes(b)));
        if (hit.length) pool = hit;
    }
    let unused = pool.filter(w => !usedWords.has(w));
    if (unused.length === 0) { usedWords.clear(); unused = pool; }
    let word = unused[Math.floor(wordRand() * unused.length)];
    usedWords.add(word);
    return word;
}

function spawnWave() {
    harvestMushrooms();
    if (STATE.hostages.active) return; 
    
    STATE.currentTarget = null; STATE.isSpawning = false;
    let isBossWave = (STATE.wave > 0 && STATE.wave % 5 === 0);
    STATE.challenge = false; STATE.focusBigram = null; STATE.snakeWave = false;
    
    if (isBossWave) {
        AudioFX.boss(); UI.bossAlert.style.display = 'block'; setTimeout(() => UI.bossAlert.style.display = 'none', 3000);
        let word = getWordForWave(STATE.wave, true); 
        let wordId = "B" + Date.now();
        enemies.push(new BossShip(word, wordId));
        createPopText("BOSS INCOMING! DEFEND YOUR KEYS!", canvas.width/2, canvas.height/2, '#ffea00');
        STATE.taFadeOutTime = performance.now() + 5000; 
    } else {
        STATE.challenge = (STATE.wave % 5 === 3); STATE.focusKeys = focusKeySet();
        STATE.snakeWave = (STATE.wave % 4 === 2 && !STATE.challenge);
        if (!STATE.daily && (STATE.challenge || STATE.wave % 3 === 0)) { const wb = weakBigrams(); if (wb.length) STATE.focusBigram = wb[Math.floor(Math.random() * Math.min(3, wb.length))]; }
        createPopText(STATE.challenge ? 'CHALLENGE STAGE: NO DAMAGE, PERFECT = 2x' : `WAVE ${STATE.wave} INITIATED`, canvas.width/2, canvas.height/2, STATE.challenge ? '#bc13fe' : '#00f3ff');
        if (STATE.focusBigram) createPopText('FOCUS: ' + STATE.focusBigram.toUpperCase(), canvas.width/2, canvas.height/2 + 50*STATE.sf, '#ffea00');
        if (STATE.snakeWave) createPopText('CENTIPEDE! TYPE IT FROM THE HEAD', canvas.width/2, canvas.height/2 + 100*STATE.sf, '#7affb0');
        if (STATE.wave === 1) createPopText('TYPE THE LETTERS YOU SEE', canvas.width/2, canvas.height/2 + 100*STATE.sf, '#ffffff');
        
        // TOURNAMENT PACING: Tighter board, less visual clutter
        // Starts at 1 word, adds 1 word every 4 waves. Base maximum of 3 words.
        let baseWords = Math.min(3, 1 + Math.floor((STATE.wave - 1) / 4)); 
        
        // Only give elite typists a maximum of 1 extra word to prevent screen flooding
        let wpmBonus = (STATE.currentWPM >= 90 && !STATE.daily) ? 1 : 0; 
        
        // Absolute hard cap of 4 words on screen at once
        let numWords = Math.min(4, baseWords + wpmBonus); if (STATE.challenge) numWords = Math.min(4, 2 + Math.floor(STATE.wave / 5)); 
        
        STATE.taFadeOutTime = performance.now() + DATA.DIFFICULTY[STATE.difficulty || 'contender'].hold + (numWords * 500);     
        for(let w=0; w<numWords; w++) {
            if (w === 0) STATE.waveFirsts = new Set();
            STATE.slot = w;
            let word = getWordForWave(STATE.wave, false, STATE.focusBigram);
            for (let tries = 0; tries < 12 && STATE.waveFirsts.has(word[0]); tries++) word = getWordForWave(STATE.wave, false, STATE.focusBigram);
            STATE.waveFirsts.add(word[0]);
            let wordId = "W" + Date.now() + w;
            const letters = [];
            for (let i = 0; i < word.length; i++) { const e = new SwarmEnemy(word, i, word.length, wordId); enemies.push(e); letters.push(e); }
            if (STATE.snakeWave) startSnake(letters, w);
            if (w === 0) STATE.goldenId = null;
            if (w === numWords - 1 && STATE.wave >= 4 && !STATE.challenge && !STATE.snakeWave && wordRand() < 0.2) spawnUfo();
            if (STATE.wave >= 3 && !STATE.challenge && w === 0 && wordRand() < 0.6) {
                STATE.goldenId = wordId; enemies.forEach(e => { if (e.wordId === wordId) e.color = '#ffd700'; });
                createPopText('GOLDEN WORD: TYPE IT CLEAN FOR A SHIELD', canvas.width/2, canvas.height/2 + 150*STATE.sf, '#ffd700');
            }
        }
    }
}

function spawnUfo() {
    const pool = (DICT_BUCKETS[3] || []).filter(w => WORD_RANK[w] < 3000 && [...w].every(ch => STATE.activeKeys[ch]) && !(STATE.waveFirsts && STATE.waveFirsts.has(w[0])));
    if (!pool.length) return;
    const word = pool[Math.floor(wordRand() * pool.length)], id = 'U' + Date.now(), right = wordRand() < 0.5, sp = 60 * STATE.sf;
    const base = right ? -60 * STATE.sf - word.length * sp : canvas.width + 60 * STATE.sf;
    for (let i = 0; i < word.length; i++) {
        const e = new SwarmEnemy(word, i, word.length, id);
        e.state = 'ufo'; e.color = '#bc13fe'; e.y = 70 * STATE.sf; e.x = base + i * sp; e.vx = (right ? 1 : -1) * 1.3 * STATE.sf;
        enemies.push(e);
    }
    STATE.ufoId = id;
    createPopText('BONUS UFO (OPTIONAL)', canvas.width / 2, canvas.height / 2 + 190 * STATE.sf, '#c77dff');
}

function updateUI() {
    if (!UI.score) return; 
    if (UI_CACHE.score !== STATE.score) { UI.score.textContent = String(STATE.score).padStart(6, '0'); UI_CACHE.score = STATE.score; }
    if (UI_CACHE.wave !== STATE.wave) { UI.wave.textContent = STATE.wave; UI_CACHE.wave = STATE.wave; }
    
    if (UI_CACHE.hull !== STATE.hull) {
        UI.health.textContent = "\u25B2".repeat(Math.max(0, Math.ceil(STATE.hull / 20))) + " " + STATE.hull + "%"; 
        UI.health.style.color = STATE.hull > 50 ? "var(--neon-green)" : (STATE.hull > 20 ? "var(--neon-yellow)" : "var(--neon-pink)");
        UI_CACHE.hull = STATE.hull;
    }
    
    if (UI_CACHE.combo !== STATE.combo) { UI.combo.textContent = STATE.combo + "x COMBO"; UI_CACHE.combo = STATE.combo; }

    let elapsedMinutes = (performance.now() - STATE.startTime) / 60000;
    if (elapsedMinutes > 0.05) { 
        STATE.currentWPM = Math.floor((STATE.correctKeystrokes / 5) / elapsedMinutes);
    }
    
    if (UI_CACHE.wpm !== STATE.currentWPM) { 
        UI.wpm.textContent = String(STATE.currentWPM).padStart(3, '0'); 
        UI_CACHE.wpm = STATE.currentWPM; 
    }
    
    let accPct = STATE.totalKeystrokes > 0 ? Math.floor((STATE.correctKeystrokes / STATE.totalKeystrokes) * 100) : 100;
    if (UI_CACHE.acc !== accPct) {
        UI.acc.textContent = accPct + "%";
        UI.acc.style.color = accPct >= 95 ? "var(--neon-blue)" : (accPct >= 90 ? "var(--neon-yellow)" : "var(--neon-pink)");
        UI_CACHE.acc = accPct;
    }
}

function damagePlayer(amt) {
    STATE.hull -= amt; STATE.combo = 0; document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 300);
    AudioFX.error(); updateUI();
    if(STATE.hull <= 0) { 
        STATE.active = false; setControls(false);
        recordRun();
        saveGameData(); renderScoreboard();
        
        if (UI.endScore) {
            UI.endScore.textContent = String(STATE.score).padStart(6, '0'); 
            UI.endWave.textContent = `SECTOR ${STATE.sector} (WAVE ${STATE.wave})`;
            if (UI.endCombo) UI.endCombo.textContent = STATE.maxCombo + "x"; 
            if (UI.endWpm) UI.endWpm.textContent = STATE.currentWPM;
            
            let accPct = STATE.totalKeystrokes > 0 ? Math.floor((STATE.correctKeystrokes / STATE.totalKeystrokes) * 100) : 100;
            UI.endAcc.textContent = accPct + "%";
        }
        
        drawHeatmap(); 
        showBigramReport(); if (UI.endScreen) UI.endScreen.style.display = 'flex'; 
    }
}

function resetToMenu() { if(UI.endScreen) UI.endScreen.style.display = 'none'; if(UI.menu) UI.menu.style.display = 'flex'; showScreen('title'); startMenuFx(); }

function resizeCanvas() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight;
    STATE.sf = Math.max(0.4, Math.min(canvas.width / 1280, canvas.height / 800));
    if(STATE.active) buildHUD(); 
}
window.addEventListener('resize', resizeCanvas);

function gameLoop(time) {
    if(!STATE.active) return;
    if (STATE.paused) { STATE.lastFrame = time; requestAnimationFrame(gameLoop); return; }
    
    let dt = time - STATE.lastFrame; STATE.lastFrame = time;

    bgCtx.fillStyle = '#010103'; bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    let spaceGrad = bgCtx.createRadialGradient(bgCanvas.width/2, bgCanvas.height, 0, bgCanvas.width/2, bgCanvas.height, bgCanvas.height);
    spaceGrad.addColorStop(0, SECTOR_BG[(STATE.sector - 1) % SECTOR_BG.length]); spaceGrad.addColorStop(1, '#010103');
    bgCtx.fillStyle = spaceGrad; bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    let depthMod = 1 + (STATE.combo * 0.02);
    let speedMult = STATE.isHyperspace ? 25 : 1; 

    bgCtx.lineCap = 'round'; ctx.shadowBlur = 0;
    for(let s of stars) { 
        let sz = s.speed * STATE.sf * depthMod;
        s.y += s.speed * STATE.sf * speedMult * (dt/16); 
        if(s.y > bgCanvas.height) { s.y = -10; s.x = Math.random() * bgCanvas.width; } 
        
        if (STATE.isHyperspace) {
            bgCtx.beginPath(); bgCtx.moveTo(s.x, s.y); bgCtx.lineTo(s.x, s.y - (s.speed * STATE.sf * 15 * 1.5));
            bgCtx.strokeStyle = s.color || '#fff'; bgCtx.lineWidth = sz; bgCtx.stroke();
        } else {
            bgCtx.fillStyle = s.color || '#fff';
            bgCtx.fillRect(s.x, s.y, sz, sz); 
        }
    }

    if (!fallingStar && !STATE.isHyperspace && Math.random() < 0.003) {
        fallingStar = {
            x: Math.random() * canvas.width, y: -100,
            vx: (Math.random() - 0.2) * 20 * STATE.sf,
            vy: (15 + Math.random() * 10) * STATE.sf,
            lineSize: 1.0, color: Math.random() > 0.5 ? 'var(--neon-blue)' : 'var(--neon-yellow)'
        };
    }
    if (fallingStar) {
        fallingStar.x += fallingStar.vx * (dt/16); fallingStar.y += fallingStar.vy * (dt/16); fallingStar.lineSize -= 0.01 * (dt/16);
        bgCtx.save(); bgCtx.strokeStyle = fallingStar.color; bgCtx.lineWidth = 3 * STATE.sf;
        bgCtx.globalAlpha = Math.max(0, fallingStar.lineSize); bgCtx.shadowBlur = 15 * STATE.sf; bgCtx.shadowColor = fallingStar.color;
        bgCtx.beginPath(); bgCtx.moveTo(fallingStar.x, fallingStar.y); bgCtx.lineTo(fallingStar.x - fallingStar.vx * 3, fallingStar.y - fallingStar.vy * 3);
        bgCtx.stroke(); bgCtx.restore();
        if (fallingStar.lineSize <= 0 || fallingStar.y > canvas.height + 100) fallingStar = null;
    }

    if (bonusDrones.length === 0 && !STATE.isHyperspace && Math.random() < 0.002) {
        bonusDrones.push(new BonusDrone(false)); 
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (STATE.currentTarget) {
        let alive = false;
        for(let e of enemies) { if(!e.isBoss && e.wordId === STATE.currentTarget.wordId && e.index >= STATE.currentTarget.index) { alive = true; break; } }
        if (STATE.bossRef && STATE.bossRef.active && STATE.bossRef.wordId === STATE.currentTarget.wordId) alive = true;
        
        if(!alive) { STATE.currentTarget = null; } 
    }

    if (enemies.every(e => e.state === 'ufo') && !STATE.bossRef && !STATE.isSpawning && !STATE.hostages.active) {
        STATE.currentTarget = null; 
        
        if (STATE.waveTotal > 0 && STATE.waveCorrect === STATE.waveTotal) {
            let diffScoreMod = DATA.DIFFICULTY[STATE.difficulty].scoreMod;
            let bonus = Math.floor(1000 * STATE.wave * diffScoreMod * (STATE.challenge ? 2 : 1));
            STATE.score += bonus; STATE.hull = Math.min(100, STATE.hull + 5);
            createPopText(`PERFECT WAVE! +${bonus}`, canvas.width/2, canvas.height/2 - 50, '#00f3ff');
        }
        STATE.waveTotal = 0; STATE.waveCorrect = 0;
        STATE.isSpawning = true; 
        
        if (STATE.wave > 0 && STATE.wave % 5 === 0 && !STATE.isHyperspace) {
            STATE.sector++;
            STATE.isHyperspace = true;
            AudioFX.rescue(); 
            createPopText(`SECTOR ${STATE.sector - 1} CLEARED!`, canvas.width/2, canvas.height/2, '#00ff66');
            createPopText("HYPERSPACE JUMP INITIATED...", canvas.width/2, canvas.height/2 + 50*STATE.sf, '#00f3ff');
            
            STATE.hull = Math.min(100, STATE.hull + 20); updateUI();

            const rid = STATE.runId;
            setTimeout(() => {
                if (rid !== STATE.runId || !STATE.active) return;
                STATE.isHyperspace = false;
                STATE.wave++;
                spawnWave();
            }, 2500); 
        } else if (!STATE.isHyperspace) {
            STATE.wave++; 
            { const rid = STATE.runId; setTimeout(() => { if (rid === STATE.runId && STATE.active) spawnWave(); }, 1500); }
        }
    }

    if (!STATE.isHyperspace) {
        const wordsMap = {};
        for(let i=0; i<enemies.length; i++) { let e = enemies[i]; if(!e.isBoss) { if(!wordsMap[e.wordId]) wordsMap[e.wordId] = []; wordsMap[e.wordId].push(e); } }
        for(let wId in wordsMap) {
            let wEnemies = wordsMap[wId];
            if(wEnemies.length > 1) {
                wEnemies.sort((a,b) => a.index - b.index);
                ctx.beginPath(); ctx.moveTo(wEnemies[0].x, wEnemies[0].y);
                for(let i=1; i<wEnemies.length; i++) { let xc = (wEnemies[i-1].x + wEnemies[i].x) / 2; let yc = (wEnemies[i-1].y + wEnemies[i].y) / 2 - (20*STATE.sf); ctx.quadraticCurveTo(xc, yc, wEnemies[i].x, wEnemies[i].y); }
                ctx.strokeStyle = (STATE.currentTarget && STATE.currentTarget.wordId === wId) ? 'rgba(0, 243, 255, 0.6)' : 'rgba(0, 243, 255, 0.15)';
                ctx.lineWidth = (STATE.currentTarget && STATE.currentTarget.wordId === wId) ? 3 * STATE.sf : 2 * STATE.sf; 
                ctx.shadowBlur = 10 * STATE.sf; ctx.shadowColor = 'var(--neon-blue)';
                ctx.stroke(); ctx.shadowBlur = 0;
            }
        }

        updateSnakes(dt); drawSnakes(ctx, time); drawMushrooms(ctx);
        for(let i=enemies.length-1; i>=0; i--) { if(!enemies[i].active) enemies.splice(i, 1); else { enemies[i].update(dt, time); enemies[i].draw(ctx, dt); } }
        for(let i=bonusDrones.length-1; i>=0; i--) { if(!bonusDrones[i].active) bonusDrones.splice(i, 1); else { bonusDrones[i].update(dt); bonusDrones[i].draw(ctx); } }
        for(let i=lasers.length-1; i>=0; i--) { if(!lasers[i].active) lasers.splice(i, 1); else { lasers[i].update(dt); lasers[i].draw(ctx); } }
    }
    
    ctx.globalAlpha = 1.0; const pBatches = {};
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i]; p.update(dt);
        if(p.life <= 0) particles.splice(i, 1); else { if(!pBatches[p.color]) pBatches[p.color] = []; pBatches[p.color].push(p); }
    }
    for(let color in pBatches) { 
        ctx.strokeStyle = color; ctx.lineWidth = 3 * STATE.sf; ctx.lineCap = 'round';
        ctx.beginPath(); 
        for(let p of pBatches[color]) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx*1.5, p.y - p.vy*1.5); } 
        ctx.stroke(); 
    }
    ctx.shadowBlur = 0;

    for(let i=popTexts.length-1; i>=0; i--) {
        let pt = popTexts[i]; ctx.fillStyle = pt.color; ctx.globalAlpha = pt.life; ctx.font = `800 ${Math.floor(28 * STATE.sf)}px 'Oxanium'`;
        ctx.textAlign = "center"; ctx.shadowBlur = 10 * STATE.sf; ctx.shadowColor = pt.color; ctx.fillText(pt.text, pt.x, pt.y); 
        pt.y -= 1 * STATE.sf * (dt/16); pt.life -= 0.02 * (dt/16);
        if(pt.life <= 0) popTexts.splice(i, 1);
    }
    ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;

    drawShipHUD(time);
    requestAnimationFrame(gameLoop);
}

function startGame() {
    initAudio(); resizeCanvas(); buildHUD(); STATE.accWindow = []; lastGoodChar = null; STATE.newBest = false; STATE.bigramsStart = JSON.parse(JSON.stringify(STATE.bigrams)); STATE.suspects = []; computeSuspects(); STATE.focusKeys = focusKeySet();
    STATE.runId = (STATE.runId || 0) + 1; STATE.paused = false; setControls(true); snakes = []; STATE.mushrooms = []; STATE.hLayout = null;
    const ps = document.getElementById('pause-screen'); if (ps) ps.style.display = 'none';
    STATE.active = true; STATE.score = 0; STATE.wave = 1; STATE.sector = 1; STATE.hull = 100; STATE.combo = 0; STATE.maxCombo = 0; STATE.emp = 0; STATE.bossRef = null;
    usedWords.clear(); STATE.bioTracker = {}; lasers = []; particles = []; popTexts = []; bonusDrones = []; STATE.isSpawning = false; STATE.currentTarget = null; STATE.stolenKeys = [];
    
    STATE.difficulty = document.getElementById('diffSelect') ? document.getElementById('diffSelect').value : 'contender';
    STATE.isHyperspace = false;

    STATE.startTime = performance.now();
    STATE.totalKeystrokes = 0; STATE.correctKeystrokes = 0;
    STATE.currentWPM = 0; STATE.wpmMultiplier = 1.0; STATE.targetMultiplier = 1.0;
    STATE.scoreMultiplier = 1.0; STATE.waveTotal = 0; STATE.waveCorrect = 0;
    STATE.recentErrors = []; STATE.weaponJamTimer = 0;
    
    let taCheckbox = document.getElementById('chk-textassistant');
    STATE.textAssistantEnabled = true; STATE.shield = false; STATE.goldenId = null; STATE.ufoId = null;
    let dailyChk = document.getElementById('chk-daily'); STATE.daily = !!(dailyChk && dailyChk.checked); if (STATE.daily) initDaily(); 
    STATE.taFadeOutTime = 0;
    
    STATE.hostages = { active: false, keys: [], biogram: '', singleChar: '', progress: 0, required: 5, practiceWords: [] };
    if (UI.hostageCave) UI.hostageCave.style.display = 'none';

    fallingStar = null;
    
    UI_CACHE.score = -1; UI_CACHE.wave = -1; UI_CACHE.hull = -1; UI_CACHE.combo = -1; UI_CACHE.wpm = -1; UI_CACHE.acc = -1;
    
    if (UI.empFill) UI.empFill.style.width = `0%`; 
    if (UI.empContainer) UI.empContainer.classList.remove('emp-ready');
    if (UI.menu) UI.menu.style.display = 'none'; 
    if (UI.endScreen) UI.endScreen.style.display = 'none'; 
    updateUI();
    
    stars = []; 
    for(let i=0; i<150; i++) stars.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, speed: 0.2 + Math.random()*2, color: Math.random() > 0.9 ? '#bc13fe' : (Math.random() > 0.7 ? '#00f3ff' : '#666666')});
    
    createPopText("SECTOR 1 // SYSTEM ONLINE", canvas.width/2, canvas.height/2, '#00f3ff');
    spawnWave();
    STATE.lastFrame = performance.now(); requestAnimationFrame(gameLoop);
}

let lastKeyPress = 0;
document.addEventListener('keydown', (e) => {
    if(!STATE.active || STATE.paused || e.repeat || STATE.isHyperspace) return; 
    
    let now = performance.now();
    if (now < STATE.weaponJamTimer) return; 
    
    if(['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape', 'Backspace'].includes(e.key)) return;
    if(e.key === 'Enter') { fireEMP(); return; }

    let inputChar = e.key.toLowerCase(); 
    if(e.code === 'Space') inputChar = 'spc';
    if(inputChar === 'spc' || inputChar === ' ') return;

    let keyData = STATE.activeKeys[inputChar];
    
    if(!keyData || (keyData.isAbducted && !STATE.hostages.active)) { 
        if(keyData && keyData.isAbducted) AudioFX.error(); 
        return; 
    }

    STATE.totalKeystrokes++;
    STATE.waveTotal++;

    if (STATE.currentTarget && !enemies.some(en => en.wordId === STATE.currentTarget.wordId && en.index === STATE.currentTarget.index && en.active && !en.targeted)) STATE.currentTarget = null;
    let targetEnemy = null; let seqMatched = false; let startsWord = false;
    let hitDrone = bonusDrones.find(b => b.char === inputChar && b.active && !b.targeted);
    
    if (STATE.bossRef && STATE.bossRef.active && STATE.bossRef.state === 'idle') {
        let bossChar = STATE.bossRef.word[STATE.bossRef.typedIndex];
        if (bossChar && inputChar === bossChar.toLowerCase()) {
            targetEnemy = STATE.bossRef; seqMatched = true;
        }
    }
    
    if(!targetEnemy && STATE.currentTarget) {
        let nextInSeq = enemies.find(en => en.wordId === STATE.currentTarget.wordId && en.index === STATE.currentTarget.index && en.active && !en.targeted);
        if(nextInSeq && nextInSeq.char === inputChar) { targetEnemy = nextInSeq; seqMatched = true; }
    }
    
    if(!targetEnemy && !STATE.currentTarget && (!STATE.bossRef || STATE.bossRef.state === 'shielded')) {
        let matching = enemies.filter(en => !en.isBoss && en.index === 0 && en.char === inputChar && en.active && !en.targeted);
        if(matching.length > 0) {
            matching.sort((a,b) => b.y - a.y);
            targetEnemy = matching[0]; STATE.currentTarget = { wordId: targetEnemy.wordId, index: targetEnemy.index, t0: now, full: targetEnemy.index === 0, dirty: false }; startsWord = (targetEnemy.index === 0);
        }
    }

    if(targetEnemy || hitDrone) {
        STATE.correctKeystrokes++; pushAcc(1); recordBigram(inputChar, now);
        STATE.waveCorrect++;

        if (hitDrone) {
            hitDrone.targeted = true;
            if(keyData.isDual) { 
                lasers.push(new Laser(keyData.x - 10*STATE.sf, keyData.y - keyData.h/2, hitDrone, STATE.combo, -10)); 
                lasers.push(new Laser(keyData.x + 10*STATE.sf, keyData.y - keyData.h/2, hitDrone, STATE.combo, 10)); 
            } else { 
                lasers.push(new Laser(keyData.x, keyData.y - keyData.h/2, hitDrone, STATE.combo, 0)); 
            }
        }

        if (targetEnemy) {
            if(targetEnemy.isBoss) { 
                targetEnemy.typedIndex++; 
            }
            else { 
                targetEnemy.targeted = true; 
                STATE.currentTarget.index = targetEnemy.index + 1;
                if (!targetEnemy.isPractice && STATE.currentTarget.index >= targetEnemy.word.length) wordComplete(STATE.currentTarget, targetEnemy.word, now); 
                if (targetEnemy.isPractice && STATE.currentTarget.index >= targetEnemy.word.length) {
                    STATE.hostages.progress++;
                    updateHostageUI();
                    if(STATE.bossRef) STATE.bossRef.spawnNextPracticeWord();
                }
            }
            
            if(keyData.isDual) { 
                lasers.push(new Laser(keyData.x - 10*STATE.sf, keyData.y - keyData.h/2, targetEnemy, STATE.combo, -10)); 
                lasers.push(new Laser(keyData.x + 10*STATE.sf, keyData.y - keyData.h/2, targetEnemy, STATE.combo, 10)); 
            } else { 
                lasers.push(new Laser(keyData.x, keyData.y - keyData.h/2, targetEnemy, STATE.combo, 0)); 
            }
        }
        
        if (seqMatched || startsWord || (targetEnemy && targetEnemy.isBoss && targetEnemy.typedIndex > 1) || (targetEnemy && targetEnemy.isPractice) || hitDrone) { 
            STATE.combo++; if(STATE.combo > STATE.maxCombo) STATE.maxCombo = STATE.combo; comboMilestone(); 
        } else STATE.combo = 0; 
        
        updateScoreMultiplier();
        
        updateUI();
        AudioFX.laser(keyData.x / canvas.width); 
        
        if(!STATE.bioTracker[inputChar]) STATE.bioTracker[inputChar] = { presses:0, misses:0, latencies:[] };
        STATE.bioTracker[inputChar].presses++;
        if(lastKeyPress > 0 && (now - lastKeyPress) < 2000) { STATE.bioTracker[inputChar].latencies.push(now - lastKeyPress); if(STATE.bioTracker[inputChar].latencies.length > 20) STATE.bioTracker[inputChar].latencies.shift(); }
    
    } else {
        pushAcc(0); if (STATE.currentTarget) { STATE.currentTarget.dirty = true; splitSnake(STATE.currentTarget.wordId); } if (!STATE.bossRef && !STATE.challenge && !STATE.hostages.active) STATE.hull = Math.max(1, STATE.hull - 1);
        STATE.recentErrors.push(now);
        STATE.recentErrors = STATE.recentErrors.filter(t => now - t < 100);
        
        if (STATE.recentErrors.length >= 3) {
            STATE.weaponJamTimer = now + 500; 
            STATE.recentErrors = [];
            createPopText("WEAPON JAMMED!", canvas.width/2, canvas.height/2 + (50*STATE.sf), '#ff0055');
            document.body.classList.add('emp-flash'); setTimeout(()=> document.body.classList.remove('emp-flash'), 200);
        } else {
            document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 200);
        }

        AudioFX.error(); STATE.combo = 0; 
        
        updateScoreMultiplier();
        
        updateUI();
        
        if(!STATE.bioTracker[inputChar]) STATE.bioTracker[inputChar] = { presses:0, misses:0, latencies:[] };
        STATE.bioTracker[inputChar].misses++;
        {
            let exp = STATE.currentTarget && enemies.find(en => en.wordId === STATE.currentTarget.wordId && en.index === STATE.currentTarget.index);
            let bw = STATE.bossRef && STATE.bossRef.state === 'idle' && STATE.bossRef.word ? STATE.bossRef.word[STATE.bossRef.typedIndex] : null;
            recordBigramError(exp && exp.char ? exp.char : (bw ? bw.toLowerCase() : null));
        }

        if (STATE.bossRef && STATE.bossRef.state === 'idle' && STATE.bossRef.word) {
            let bossWord = STATE.bossRef.word;
            let typedIx = STATE.bossRef.typedIndex;
            if (typedIx < bossWord.length) {
                let currChar = bossWord[typedIx].toLowerCase();
                let prevChar = typedIx > 0 ? bossWord[typedIx - 1].toLowerCase() : null;
                STATE.bossRef.triggerMistake(currChar, prevChar);
            }
        }
        
        if (STATE.currentTarget) {
            let activeTarget = enemies.find(en => en.wordId === STATE.currentTarget.wordId);
            if (activeTarget && activeTarget.isPractice) {
                enemies = enemies.filter(en => en.wordId !== STATE.currentTarget.wordId);
                STATE.currentTarget = null;
                damagePlayer(2);
                createPopText("PRACTICE RESET!", canvas.width/2, canvas.height/2, '#ff0055');
                if (!STATE.practiceRespawn) { STATE.practiceRespawn = true; setTimeout(() => { STATE.practiceRespawn = false; if (STATE.bossRef && STATE.hostages.active) STATE.bossRef.spawnNextPracticeWord(); }, 500); }
            }
        }
    }
    lastKeyPress = now;
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !STATE.active && UI.endScreen && UI.endScreen.style.display === 'flex') { e.preventDefault(); insertCoin(); }
});

// ---- pause / exit (exiting forfeits the run: no resume, so settings cannot be changed mid-run) ----
function setControls(show) { const g = document.getElementById('game-controls'); if (g) g.style.display = show ? 'flex' : 'none'; }
function pauseGame() {
    if (!STATE.active || STATE.paused) return;
    STATE.paused = true; STATE.pausedAt = performance.now();
    const p = document.getElementById('pause-screen'); if (p) p.style.display = 'flex';
}
function resumeGame() {
    if (!STATE.paused) return;
    const ms = performance.now() - STATE.pausedAt;
    STATE.startTime += ms; STATE.taFadeOutTime += ms;
    lastKeyPress = performance.now(); lastGoodChar = null;
    STATE.paused = false; STATE.lastFrame = performance.now();
    const p = document.getElementById('pause-screen'); if (p) p.style.display = 'none';
}
function exitToMenu() {
    if (!STATE.active) return;
    const wasPaused = STATE.paused;
    if (!wasPaused) pauseGame();
    if (!confirm('Exit to the main screen? This run ends without a score and cannot be resumed.')) { if (!wasPaused) resumeGame(); return; }
    STATE.active = false; STATE.paused = false; STATE.runId = (STATE.runId || 0) + 1;
    enemies = []; snakes = []; STATE.mushrooms = []; STATE.bossRef = null; STATE.currentTarget = null;
    setControls(false);
    const p = document.getElementById('pause-screen'); if (p) p.style.display = 'none';
    if (UI.hostageCave) UI.hostageCave.style.display = 'none';
    if (UI.bossAlert) UI.bossAlert.style.display = 'none';
    saveGameData(); renderScoreboard(); resetToMenu();
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && STATE.active) { e.preventDefault(); STATE.paused ? resumeGame() : pauseGame(); }
});
window.addEventListener('blur', () => { if (STATE.active && !STATE.paused) pauseGame(); });

function setKbSize(v) { if (!HUD_FRACS[v]) return; STATE.kbSize = v; try { localStorage.setItem('galactic_kb_size', v); } catch (e) {} }
(function () {
    try { const v = localStorage.getItem('galactic_kb_size'); if (v && HUD_FRACS[v]) STATE.kbSize = v; } catch (e) {}
    const s = document.getElementById('kbSelect'); if (s) s.value = STATE.kbSize;
})();

// ================= start screen: title, hall of fame, setup, how to play =================
const DIV_NAMES = { academy: 'ACADEMY', contender: 'CONTENDER', apex: 'APEX' };
const HW_NAMES = { go60: 'Go60', glove80: 'Glove80', corne: 'Corne', voyager: 'Voyager', ansi60: 'ANSI 60%' };
const LAYOUT_NAMES = { qwerty: 'QWERTY', colemak_dh: 'Colemak-DH', dvorak: 'Dvorak', custom: 'Custom layout' };
function byId(id) { return document.getElementById(id); }
function prefs() { try { return JSON.parse(localStorage.getItem('galactic_prefs')) || {}; } catch (e) { return {}; } }
function savePrefs(p) { try { localStorage.setItem('galactic_prefs', JSON.stringify(Object.assign(prefs(), p))); } catch (e) {} }
function showScreen(name) {
    ['title', 'hall', 'setup', 'howto'].forEach(s => { const e = byId('scr-' + s); if (e) e.style.display = (s === name) ? 'block' : 'none'; });
    const box = byId('menu-box'); if (box && box.classList) box.classList.toggle('compact', name !== 'title');
    STATE.screen = name;
    if (name === 'title') refreshChip();
    if (name === 'hall') { renderScoreboard(); renderProgress(); }
    if (name === 'setup') { setupTab(STATE.setupTab || 'keyboard'); drawKbPreview(); }
}
function setupTab(t) {
    STATE.setupTab = t;
    ['keyboard', 'display', 'data'].forEach(n => { const p = byId('tab-' + n); if (p) p.style.display = (n === t) ? 'block' : 'none'; });
    document.querySelectorAll('.tab[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
}
function setDivision(v) {
    if (!DIV_NAMES[v]) return;
    UI.diffSelect.value = v; savePrefs({ div: v });
    document.querySelectorAll('.div-btn').forEach(b => b.classList.toggle('active', b.dataset.div === v));
    refreshChip();
}
function refreshChip() {
    const c = byId('setup-chip'); if (!c) return;
    c.textContent = (HW_NAMES[UI.hwSelect.value] || UI.hwSelect.value) + '  \u00B7  ' + (LAYOUT_NAMES[UI.layoutSelect.value] || UI.layoutSelect.value) + '  \u00B7  ' + (DIV_NAMES[UI.diffSelect.value] || '') + '   [ CHANGE ]';
}
function finishHowTo() { savePrefs({ seenHowTo: true }); showScreen('title'); }
function renderProgress() {
    const el = byId('progress-panel'); if (!el) return;
    const mi = masteryInfo(), t = [0, 0, 0, 0];
    Object.values(STATE.bigrams).forEach(b => { t[tierOf(b)]++; });
    const next = RANKS.slice().reverse().find(r => r[0] > mi.pts);
    const focus = Array.from(new Set(weakBigrams().slice(0, 4).join('').split(''))).map(c => c.toUpperCase()).join(' ');
    el.innerHTML = `<div class="progress-card"><div class="pc-title">YOUR PROGRESS</div><div class="pc-rank">${mi.rank}</div><div class="pc-sub">${mi.pts} POINTS${next ? ' &middot; ' + (next[0] - mi.pts) + ' TO ' + next[1] : ' &middot; TOP RANK'}</div><div class="pc-row"><span>GOLD PAIRS</span><b>${t[3]}</b></div><div class="pc-row"><span>SILVER PAIRS</span><b>${t[2]}</b></div><div class="pc-row"><span>BRONZE PAIRS</span><b>${t[1]}</b></div><div class="pc-row"><span>FOCUS KEYS</span><b>${focus || '-'}</b></div></div>`;
}
function drawKbPreview() {
    const cv = byId('kb-preview'); if (!cv || !cv.getContext || !UI.customLayoutStr) return;
    const geo = DATA.GEO[UI.hwSelect.value]; if (!geo) return;
    const keys = String(UI.customLayoutStr.value || '').split(',').map(s => s.trim().toLowerCase());
    const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    let maxX = 0, maxY = 0; geo.forEach(k => { maxX = Math.max(maxX, k.x); maxY = Math.max(maxY, k.y); });
    const u = Math.min((cv.width - 24) / (maxX + 1.2), (cv.height - 24) / (maxY + 1.2));
    const ox = (cv.width - maxX * u) / 2, oy = (cv.height - maxY * u) / 2;
    geo.forEach((k, i) => {
        const ch = keys[i], letter = !!ch && ch.length === 1 && /[a-z;,.\/']/.test(ch), s = u * 0.88;
        g.save(); g.translate(ox + k.x * u, oy + k.y * u); g.rotate((k.r || 0) * Math.PI / 180);
        g.fillStyle = letter ? 'rgba(0,243,255,0.16)' : 'rgba(255,255,255,0.05)'; g.strokeStyle = letter ? '#00f3ff' : 'rgba(255,255,255,0.15)'; g.lineWidth = 1;
        g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, 4); g.fill(); g.stroke();
        if (letter) { g.fillStyle = '#fff'; g.font = Math.floor(s * 0.5) + "px 'Share Tech Mono'"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch.toUpperCase(), 0, 0); }
        g.restore();
    });
}
const _updateLayoutString = updateLayoutString;
updateLayoutString = function () { _updateLayoutString.apply(this, arguments); drawKbPreview(); refreshChip(); };
// coin: flavour only. Pressing Enter (or PLAY) drops a coin and starts the game 0.4 s later.
let coinPending = false;
function coinSound() {
    try {
        initAudio(); const t = actx.currentTime;
        [[988, 0], [1319, 0.09]].forEach(([f, d]) => {
            const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
            o.connect(g); g.connect(actx.destination); o.start(t + d); o.stop(t + d + 0.18);
        });
    } catch (e) {}
}
function insertCoin() {
    if (STATE.active || coinPending) return;
    coinPending = true; coinSound();
    const c = byId('coin-line'); if (c) c.textContent = 'CREDIT 01';
    setTimeout(() => { coinPending = false; if (c) c.innerHTML = 'INSERT COIN <small>PRESS ENTER</small>'; if (!STATE.active) startGame(); }, 380);
}
document.addEventListener('keydown', (e) => {
    const m = UI.menu; if (!m || m.style.display === 'none' || STATE.active) return;
    const tag = (e.target && e.target.tagName) || '', s = STATE.screen || 'title';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Escape' && s !== 'title') { e.preventDefault(); showScreen('title'); return; }
    if (s !== 'title') return;
    if (e.key === 'Enter') { if (tag === 'BUTTON' && e.target.id !== 'btn-start') return; e.preventDefault(); insertCoin(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const order = ['academy', 'contender', 'apex']; let i = order.indexOf(UI.diffSelect.value);
        setDivision(order[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]); e.preventDefault();
    }
    else if (e.key === 'h' || e.key === 'H') showScreen('hall');
    else if (e.key === 's' || e.key === 'S') showScreen('setup');
    else if (e.key === '?' || e.key === '/') showScreen('howto');
});
// progress backup
function exportProgress() {
    saveGameData();
    const out = { app: 'galactic-keystroke', v: 1, save: localStorage.getItem('galactic_keystroke_save'), kb: localStorage.getItem('galactic_kb_size'), prefs: localStorage.getItem('galactic_prefs') };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })); a.download = 'galactic-progress.json';
    document.body.appendChild(a); a.click(); a.remove();
}
function applyProgress(text) {
    try {
        const o = JSON.parse(text); if (!o || o.app !== 'galactic-keystroke' || typeof o.save !== 'string') return false;
        const s = JSON.parse(o.save); if (!s || typeof s !== 'object') return false;
        localStorage.setItem('galactic_keystroke_save', o.save);
        if (o.kb) localStorage.setItem('galactic_kb_size', o.kb);
        if (o.prefs) localStorage.setItem('galactic_prefs', o.prefs);
        return true;
    } catch (e) { return false; }
}
function importProgress(ev) {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { if (applyProgress(r.result)) { alert('Progress imported. The game will reload.'); location.reload(); } else alert('That is not a Galactic Keystroke progress file.'); };
    r.readAsText(f); ev.target.value = '';
}
// attract-mode background: drifting stars, falling letters and a little ship that shoots them
let menuFxRunning = false, menuFxOn = true;
function setMenuFx(on) { menuFxOn = !!on; savePrefs({ menuFx: !!on }); if (on) startMenuFx(); }
function startMenuFx() {
    const cv = byId('menu-fx');
    if (!cv || menuFxRunning || !menuFxOn || !window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    menuFxRunning = true;
    const g = cv.getContext('2d'); let stars = null, letters = [], ship = { x: 0.5, cd: 0 }, bolt = null, last = performance.now();
    const loop = (t) => {
        if (!UI.menu || UI.menu.style.display === 'none' || !menuFxOn) { menuFxRunning = false; return; }
        const W = cv.clientWidth, H = cv.clientHeight, dt = Math.min(50, t - last) / 1000; last = t;
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; stars = null; }
        if (!stars) stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() }));
        g.clearRect(0, 0, W, H);
        stars.forEach(s => { s.y += 30 * s.z * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } g.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.4 * s.z) + ')'; g.fillRect(s.x, s.y, 1.5 * s.z + 0.5, 1.5 * s.z + 0.5); });
        while (letters.length < 9) letters.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, v: 22 + Math.random() * 28, ph: Math.random() * 6, ch: String.fromCharCode(65 + Math.floor(Math.random() * 26)), c: Math.random() < 0.5 ? '#00f3ff' : '#ff0055' });
        letters.forEach(l => { l.y += l.v * dt; l.x += Math.sin(t / 700 + l.ph) * 14 * dt; });
        letters = letters.filter(l => l.y < H + 30);
        g.font = "700 22px 'Oxanium'"; g.textAlign = 'center'; g.textBaseline = 'middle';
        letters.forEach(l => { g.globalAlpha = 0.35; g.fillStyle = l.c; g.fillText(l.ch, l.x, l.y); }); g.globalAlpha = 1;
        const tgt = letters.filter(l => l.y > H * 0.25 && l.y < H * 0.8).sort((a, b) => b.y - a.y)[0];
        if (tgt) ship.x += ((tgt.x / W) - ship.x) * Math.min(1, 3 * dt);
        ship.cd -= dt;
        if (tgt && ship.cd <= 0 && Math.abs(tgt.x / W - ship.x) < 0.03) { bolt = { x: tgt.x, y: tgt.y, life: 0.15 }; letters.splice(letters.indexOf(tgt), 1); ship.cd = 1.4; }
        if (bolt) { g.strokeStyle = '#00ff66'; g.globalAlpha = 0.6; g.lineWidth = 2; g.beginPath(); g.moveTo(ship.x * W, H - 28); g.lineTo(bolt.x, bolt.y); g.stroke(); g.globalAlpha = 1; bolt.life -= dt; if (bolt.life <= 0) bolt = null; }
        g.fillStyle = 'rgba(0,243,255,0.55)'; g.beginPath(); g.moveTo(ship.x * W, H - 40); g.lineTo(ship.x * W - 12, H - 16); g.lineTo(ship.x * W + 12, H - 16); g.closePath(); g.fill();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}
function initMenu() {
    const p = prefs(); menuFxOn = p.menuFx !== false;
    const fx = byId('chk-menufx'); if (fx) fx.checked = menuFxOn;
    setDivision(DIV_NAMES[p.div] ? p.div : 'contender');
    showScreen(p.seenHowTo ? 'title' : 'howto');
    startMenuFx();
}

// ---- a custom layout belongs to the keyboard it was made for ----
function hwForLength(len, prefer) {
    if (DATA.GEO[prefer] && DATA.GEO[prefer].length === len) return prefer;
    return Object.keys(DATA.GEO).find(k => DATA.GEO[k].length === len) || null;
}
function validCustom(hw, c) {
    return !!(DATA.GEO[hw] && c && Array.isArray(c.arrays) && c.arrays.some(a => Array.isArray(a) && a.length === DATA.GEO[hw].length));
}
function applyCustomForHw(hw) {
    const c = STATE.customByHw[hw];
    if (validCustom(hw, c)) {
        const n = DATA.GEO[hw].length; let i = c.layerIdx | 0;
        if (!c.arrays[i] || c.arrays[i].length !== n) i = c.arrays.findIndex(a => Array.isArray(a) && a.length === n);
        c.layerIdx = i; selectedLayerIdx = i; STATE.customLayers = { names: c.names || [], arrays: c.arrays }; customLayoutArray = c.arrays[i].slice();
    } else { STATE.customLayers = null; customLayoutArray = null; selectedLayerIdx = 0; }
}
function syncCustomOption() {
    const hw = UI.hwSelect.value, has = validCustom(hw, STATE.customByHw[hw]);
    let opt = UI.layoutSelect.querySelector('option[value="custom"]');
    if (!opt && has) { opt = document.createElement('option'); opt.value = 'custom'; UI.layoutSelect.appendChild(opt); }
    if (opt) { opt.disabled = !has; opt.hidden = !has; opt.textContent = 'Custom JSON (' + (HW_NAMES[hw] || hw) + ')'; }
}
function refreshUploadLabel() {
    const hw = UI.hwSelect.value;
    UI.uploadBtn.textContent = UI.layoutSelect.value === 'custom' ? '\u2705 ' + (HW_NAMES[hw] || hw).toUpperCase() + ' JSON LOADED' : '\uD83D\uDCC1 Upload MoErgo json';
}
function hideLayerSelect() { const s = document.getElementById('layerSelect'); if (s) s.style.display = 'none'; }
function onHardwareChange() {
    applyCustomForHw(UI.hwSelect.value);
    UI.layoutSelect.value = 'qwerty';            // a different keyboard always starts on the default layout
    syncCustomOption(); refreshUploadLabel(); hideLayerSelect(); updateLayoutString(); saveGameData();
}
function onLayoutChange() {
    if (UI.layoutSelect.value === 'custom') { applyCustomForHw(UI.hwSelect.value); if (customLayoutArray) showLayerSelect(); else UI.layoutSelect.value = 'qwerty'; }
    else hideLayerSelect();
    refreshUploadLabel(); updateLayoutString(); saveGameData();
}

// Restore saved layout, records and typing statistics when the page opens.
loadGameData();
initMenu();
