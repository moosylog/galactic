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
    bioTracker: {}, isSpawning: false,
    highScores: [], stolenKeys: [],
    
    difficulty: 'contender', isHyperspace: false,
    textAssistantEnabled: false, 
    taFadeOutTime: 0, // NEW: Used to fade out the assistant if it's turned off globally
    
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
            if (save.highScores && Array.isArray(save.highScores)) STATE.highScores = save.highScores;
            if (save.isCustom) {
                if (!Array.isArray(save.customArray)) throw new Error("Corrupted custom array");
                UI.hwSelect.value = save.baseHardware || 'go60';
                UI.layoutSelect.value = 'custom';
                customLayoutArray = save.customArray;
                if(!UI.layoutSelect.querySelector('option[value="custom"]')) {
                    let opt = document.createElement('option'); opt.value = 'custom'; opt.textContent = 'Custom JSON Loaded'; UI.layoutSelect.appendChild(opt);
                }
                UI.uploadBtn.textContent = '✅ MOERGO JSON LOADED';
            } else {
                if (save.baseHardware) UI.hwSelect.value = save.baseHardware;
                if (save.layout) UI.layoutSelect.value = save.layout;
            }
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
            version: CURRENT_VERSION, highScores: STATE.highScores,
            baseHardware: UI.hwSelect.value, layout: UI.layoutSelect.value,
            customArray: customLayoutArray, isCustom: UI.layoutSelect.value === 'custom'
        };
        localStorage.setItem('galactic_keystroke_save', JSON.stringify(payload));
    } catch (e) {}
}

function renderScoreboard() {
    UI.highScoreList.innerHTML = '';
    if (STATE.highScores.length === 0) {
        UI.highScoreList.innerHTML = '<div style="color: #4a5c70; font-size: 0.9rem; text-align: center; font-family:\'Share Tech Mono\'">NO RECORDS FOUND IN ARCHIVE</div>';
        return;
    }
    STATE.highScores.forEach((entry) => {
        UI.highScoreList.innerHTML += `<div class="score-item"><div class="score-info">${entry.date} <span class="lvl">(WAVE ${entry.wave})</span></div><div class="score-val">${String(entry.score).padStart(6,'0')}</div></div>`;
    });
}

function factoryReset() {
    if(confirm("WARNING: This will wipe all cached hardware data, settings, and high scores. Proceed?")) {
        localStorage.removeItem('galactic_keystroke_save');
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
        const basePitch = 300 + (xRatio * 600); osc.frequency.setValueAtTime(basePitch, actx.currentTime); osc.frequency.exponentialRampToValueAtTime(basePitch * 0.2, actx.currentTime + 0.1);
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

function handleJsonUpload(ev) {
    const file = ev.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            let detectedHw = 'go60';
            let kbStr = (data.keyboard || data.name || "").toLowerCase();
            if(kbStr.includes('glove80')) detectedHw = 'glove80'; 
            else if(kbStr.includes('corne')) detectedHw = 'corne'; 
            else if(kbStr.includes('voyager')) detectedHw = 'voyager'; 
            else if(kbStr.includes('ansi')) detectedHw = 'ansi60';
            UI.hwSelect.value = detectedHw;
            
            let bindings = findBindings(data) || [];
            const limit = DATA.GEO[detectedHw].length;
            let arr = [];
            for (let i = 0; i < limit; i++) {
                if (i < bindings.length) arr.push(parseRawKeyObj(bindings[i]));
                else arr.push('NONE');
            }
            
            customLayoutArray = arr;
            if(!UI.layoutSelect.querySelector('option[value="custom"]')) {
                let opt = document.createElement('option'); opt.value = 'custom'; opt.textContent = 'Custom JSON Loaded'; UI.layoutSelect.appendChild(opt);
            }
            UI.layoutSelect.value = 'custom';
            UI.uploadBtn.textContent = '✅ MOERGO JSON LOADED';
            setTimeout(() => UI.uploadBtn.textContent = "📁 Upload MoErgo json", 3000);
            
            updateLayoutString(); saveGameData();
        } catch(err) { alert("Invalid JSON format."); }
    }; 
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

    let maxHudHeight = Math.min(canvas.height * 0.40, 400 * STATE.sf); 
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
        }
    });
}

function drawShipHUD(time) {
    ctx.save(); ctx.lineWidth = 2 * STATE.sf; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    
    let maxHudHeight = Math.min(canvas.height * 0.40, 400 * STATE.sf); 
    let splitLine = canvas.height - maxHudHeight;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)'; ctx.lineWidth = 2 * STATE.sf; 
    ctx.shadowBlur = 20 * STATE.sf; ctx.shadowColor = 'var(--neon-blue)';
    ctx.beginPath(); ctx.moveTo(0, splitLine); ctx.lineTo(canvas.width, splitLine); ctx.stroke();
    
    let gridGrad = ctx.createLinearGradient(0, splitLine, 0, canvas.height);
    gridGrad.addColorStop(0, 'rgba(0, 243, 255, 0.05)'); gridGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gridGrad; ctx.fillRect(0, splitLine, canvas.width, canvas.height - splitLine);

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
    }
    
    // TEXT ASSISTANT LOGIC (Fade out smoothly if turned off)
    let now = performance.now();
    let taOpacity = 0;
    if (STATE.textAssistantEnabled) {
        taOpacity = 1.0;
    } else {
        let remain = STATE.taFadeOutTime - now;
        if (remain > 0) taOpacity = Math.min(1.0, remain / 1000); // Fades out over the last 1 second of the timer
    }

    if (taOpacity > 0 && !STATE.hostages.active && !STATE.isHyperspace) {
        ctx.save();
        ctx.globalAlpha = taOpacity;
        
        let wordsMap = {};
        
    //    if (STATE.bossRef && STATE.bossRef.active && STATE.bossRef.state === 'idle' && STATE.bossRef.word) {
    //        wordsMap[STATE.bossRef.wordId] = { id: STATE.bossRef.wordId, isBoss: true, word: STATE.bossRef.word, typed: STATE.bossRef.typedIndex, y: STATE.bossRef.y };
   //     }
        
        enemies.forEach(e => {
            if (e && !e.isBoss && !e.isPractice && e.word) {
                if (!wordsMap[e.wordId]) {
                    wordsMap[e.wordId] = { id: e.wordId, isBoss: false, word: e.word, typed: 0, y: e.y, index: e.index };
                } else if (e.index < wordsMap[e.wordId].index) {
                    wordsMap[e.wordId].y = e.y;
                }
            }
        });
        
        if (STATE.currentTarget && wordsMap[STATE.currentTarget.wordId]) {
            wordsMap[STATE.currentTarget.wordId].typed = STATE.currentTarget.index;
        }

        let wordList = Object.values(wordsMap).sort((a,b) => b.y - a.y); 
        
        if (STATE.currentTarget && wordsMap[STATE.currentTarget.wordId]) {
            let activeIdx = wordList.findIndex(w => w.id === STATE.currentTarget.wordId);
            if (activeIdx > 0) {
                let activeObj = wordList.splice(activeIdx, 1)[0];
                wordList.unshift(activeObj);
            }
        }
        
        if (wordList.length > 0) {
            let current = wordList[0];
            let next = wordList[1];

            let anchorY = canvas.height - maxHudHeight - (40 * STATE.sf);
            
            let fSize = Math.floor(45 * STATE.sf); 
            ctx.font = `800 ${fSize}px 'Oxanium'`;
            
            if (current && current.word) {
                let fullW = ctx.measureText(current.word.toUpperCase()).width;
                let startX = (canvas.width / 2) - (fullW / 2);
                
                for(let i=0; i<current.word.length; i++) {
                    let char = current.word[i] ? current.word[i].toUpperCase() : "";
                    let cw = ctx.measureText(char).width;
                    if (i < current.typed) {
                        ctx.fillStyle = 'rgba(0, 255, 102, 0.4)'; 
                        ctx.shadowBlur = 0;
                    } else if (i === current.typed) {
                        ctx.fillStyle = '#00ff66'; 
                        ctx.shadowBlur = 20 * STATE.sf; ctx.shadowColor = '#00ff66';
                    } else {
                        ctx.fillStyle = 'rgba(255,255,255,0.9)'; 
                        ctx.shadowBlur = 0;
                    }
                    ctx.fillText(char, startX + cw/2, anchorY);
                    startX += cw;
                }
            }
            
            if (next && next.word) {
                ctx.shadowBlur = 0;
                let nSize = Math.floor(20 * STATE.sf); 
                ctx.font = `800 ${nSize}px 'Oxanium'`;
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillText(next.word.toUpperCase(), canvas.width / 2, anchorY + 35 * STATE.sf);
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

function getWordForWave(wave, isBoss = false) {
    let diff = DATA.DIFFICULTY[STATE.difficulty];
    let minLen = diff.minLen;
    let maxLen = diff.maxLen;
    if (isBoss) { minLen = Math.min(8, minLen + 2); maxLen = Math.min(8, maxLen + 2); }
    let targetLen = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));

    let bucket = DICT_BUCKETS[targetLen] || DICT_BUCKETS[4]; 
    if (!bucket || bucket.length === 0) bucket = ["error"]; 

    let missingKeys = STATE.stolenKeys;
    let validWords = bucket.filter(w => !missingKeys.some(mk => w.includes(mk)));
    if (validWords.length === 0) validWords = bucket; 
    
    let unused = validWords.filter(w => !usedWords.has(w));
    if (unused.length === 0) { usedWords.clear(); unused = validWords; }
    
    let word = unused[Math.floor(Math.random() * unused.length)];
    usedWords.add(word); 
    return word;
}

function spawnWave() {
    if (STATE.hostages.active) return; 
    
    STATE.currentTarget = null; STATE.isSpawning = false;
    let isBossWave = (STATE.wave > 0 && STATE.wave % 5 === 0);
    
    if (isBossWave) {
        AudioFX.boss(); UI.bossAlert.style.display = 'block'; setTimeout(() => UI.bossAlert.style.display = 'none', 3000);
        let word = getWordForWave(STATE.wave, true); 
        
        let wordId = "B" + Date.now();
        enemies.push(new BossShip(word, wordId));
        
        createPopText("BOSS INCOMING! DEFEND YOUR KEYS!", canvas.width/2, canvas.height/2, '#ffea00');
        STATE.taFadeOutTime = performance.now() + 5000; // Show Text Assistant for 5s on Boss
    } else {
        createPopText(`WAVE ${STATE.wave} INITIATED`, canvas.width/2, canvas.height/2, '#00f3ff');
        
        let baseWords = Math.min(4, 1 + Math.floor(STATE.wave / 4)); 
        let wpmBonus = Math.floor(STATE.currentWPM / 40); 
        let numWords = Math.min(8, baseWords + wpmBonus); 
        
        STATE.taFadeOutTime = performance.now() + 2000 + (numWords * 500); // Dynamically keep UI alive longer for bigger waves
        
        for(let w=0; w<numWords; w++) {
            let word = getWordForWave(STATE.wave, false);
            let wordId = "W" + Date.now() + w;
            for(let i=0; i<word.length; i++) enemies.push(new SwarmEnemy(word, i, word.length, wordId));
        }
    }
}

function updateUI() {
    if (!UI.score) return; 
    if (UI_CACHE.score !== STATE.score) { UI.score.textContent = String(STATE.score).padStart(6, '0'); UI_CACHE.score = STATE.score; }
    if (UI_CACHE.wave !== STATE.wave) { UI.wave.textContent = STATE.wave; UI_CACHE.wave = STATE.wave; }
    
    if (UI_CACHE.hull !== STATE.hull) {
        UI.health.textContent = STATE.hull + "%"; 
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
        STATE.active = false; 
        let d = new Date(); let dateStr = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,'0') + "-" + String(d.getDate()).padStart(2,'0');
        STATE.highScores.push({ score: STATE.score, wave: STATE.wave, date: dateStr });
        STATE.highScores.sort((a,b) => b.score - a.score); STATE.highScores = STATE.highScores.slice(0, 5);
        saveGameData(); renderScoreboard();
        
if (UI.endScore) {
    UI.endScore.textContent = String(STATE.score).padStart(6, '0'); 
    UI.endWave.textContent = `SECTOR ${STATE.sector} (WAVE ${STATE.wave})`;
    
    // CHANGE THIS: Add the check for endCombo
    if (UI.endCombo) {
        UI.endCombo.textContent = STATE.maxCombo + "x"; 
    }
    
    if(UI.endWpm) UI.endWpm.textContent = STATE.currentWPM;
            
            let accPct = STATE.totalKeystrokes > 0 ? Math.floor((STATE.correctKeystrokes / STATE.totalKeystrokes) * 100) : 100;
            UI.endAcc.textContent = accPct + "%";
        }
        
        drawHeatmap(); 
        
        if (UI.endScreen) UI.endScreen.style.display = 'flex'; 
    }
}

function resetToMenu() { if(UI.endScreen) UI.endScreen.style.display = 'none'; if(UI.menu) UI.menu.style.display = 'flex'; }

function resizeCanvas() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight;
    STATE.sf = Math.max(0.4, Math.min(canvas.width / 1280, canvas.height / 800));
    if(STATE.active) buildHUD(); 
}
window.addEventListener('resize', resizeCanvas);

function gameLoop(time) {
    if(!STATE.active) return;
    let dt = time - STATE.lastFrame; STATE.lastFrame = time;

    bgCtx.fillStyle = '#010103'; bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    let spaceGrad = bgCtx.createRadialGradient(bgCanvas.width/2, bgCanvas.height, 0, bgCanvas.width/2, bgCanvas.height, bgCanvas.height);
    spaceGrad.addColorStop(0, '#0a0a2a'); spaceGrad.addColorStop(1, '#010103');
    bgCtx.fillStyle = spaceGrad; bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    let depthMod = 1 + (STATE.combo * 0.02);
    let speedMult = STATE.isHyperspace ? 15 : 1;

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
            life: 1.0, color: Math.random() > 0.5 ? 'var(--neon-blue)' : 'var(--neon-yellow)'
        };
    }
    if (fallingStar) {
        fallingStar.x += fallingStar.vx * (dt/16); fallingStar.y += fallingStar.vy * (dt/16); fallingStar.life -= 0.01 * (dt/16);
        bgCtx.save(); bgCtx.strokeStyle = fallingStar.color; bgCtx.lineWidth = 3 * STATE.sf;
        bgCtx.globalAlpha = fallingStar.life; bgCtx.shadowBlur = 15 * STATE.sf; bgCtx.shadowColor = fallingStar.color;
        bgCtx.beginPath(); bgCtx.moveTo(fallingStar.x, fallingStar.y); bgCtx.lineTo(fallingStar.x - fallingStar.vx * 3, fallingStar.y - fallingStar.vy * 3);
        bgCtx.stroke(); bgCtx.restore();
        if (fallingStar.life <= 0 || fallingStar.y > canvas.height + 100) fallingStar = null;
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

    if (enemies.length === 0 && !STATE.bossRef && !STATE.isSpawning && !STATE.hostages.active) {
        STATE.currentTarget = null; 
        
        if (STATE.waveTotal > 0 && STATE.waveCorrect === STATE.waveTotal) {
            let diffScoreMod = DATA.DIFFICULTY[STATE.difficulty].scoreMod;
            let bonus = Math.floor(1000 * STATE.wave * diffScoreMod);
            STATE.score += bonus;
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

            setTimeout(() => {
                STATE.isHyperspace = false;
                STATE.wave++;
                spawnWave();
            }, 5000); 
        } else if (!STATE.isHyperspace) {
            STATE.wave++; 
            setTimeout(spawnWave, 1500);
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
    initAudio(); resizeCanvas(); buildHUD();
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
    // Default to false if missing
    STATE.textAssistantEnabled = taCheckbox ? taCheckbox.checked : false; 
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
    if(!STATE.active || e.repeat || STATE.isHyperspace) return; 
    
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

    let targetEnemy = null; let seqMatched = false;
    
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
    
    if(!targetEnemy && (!STATE.bossRef || STATE.bossRef.state === 'shielded')) {
        let matching = enemies.filter(en => !en.isBoss && en.char === inputChar && en.active && !en.targeted);
        if(matching.length > 0) {
            matching.sort((a,b) => b.y - a.y);
            targetEnemy = matching[0]; STATE.currentTarget = { wordId: targetEnemy.wordId, index: targetEnemy.index };
        }
    }

    if(targetEnemy || hitDrone) {
        STATE.correctKeystrokes++; 
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
        
        if (seqMatched || (targetEnemy && targetEnemy.isBoss && targetEnemy.typedIndex > 1) || (targetEnemy && targetEnemy.isPractice) || hitDrone) { 
            STATE.combo++; if(STATE.combo > STATE.maxCombo) STATE.maxCombo = STATE.combo; 
        } else STATE.combo = 0; 
        
        let currentAcc = STATE.totalKeystrokes > 0 ? STATE.correctKeystrokes / STATE.totalKeystrokes : 1;
        if (currentAcc === 1.0) STATE.scoreMultiplier = 2.0;
        else if (currentAcc >= 0.98) STATE.scoreMultiplier = 1.5;
        else if (currentAcc >= 0.95) STATE.scoreMultiplier = 1.0;
        else if (currentAcc >= 0.90) STATE.scoreMultiplier = 0.5;
        else STATE.scoreMultiplier = 0.1;
        
        updateUI();
        AudioFX.laser(keyData.x / canvas.width); 
        
        if(!STATE.bioTracker[inputChar]) STATE.bioTracker[inputChar] = { presses:0, misses:0, latencies:[] };
        STATE.bioTracker[inputChar].presses++;
        if(lastKeyPress > 0 && (now - lastKeyPress) < 2000) { STATE.bioTracker[inputChar].latencies.push(now - lastKeyPress); if(STATE.bioTracker[inputChar].latencies.length > 20) STATE.bioTracker[inputChar].latencies.shift(); }
    
    } else {
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
        
        let currentAcc = STATE.totalKeystrokes > 0 ? STATE.correctKeystrokes / STATE.totalKeystrokes : 1;
        if (currentAcc === 1.0) STATE.scoreMultiplier = 2.0;
        else if (currentAcc >= 0.98) STATE.scoreMultiplier = 1.5;
        else if (currentAcc >= 0.95) STATE.scoreMultiplier = 1.0;
        else if (currentAcc >= 0.90) STATE.scoreMultiplier = 0.5;
        else STATE.scoreMultiplier = 0.1;
        
        updateUI();
        
        if(!STATE.bioTracker[inputChar]) STATE.bioTracker[inputChar] = { presses:0, misses:0, latencies:[] };
        STATE.bioTracker[inputChar].misses++;

        // PRO FIX: Strict null check to prevent toLowerCase crash if boss is animating death
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
                setTimeout(() => { if (STATE.bossRef) STATE.bossRef.spawnNextPracticeWord(); }, 500);
            }
        }
    }
    lastKeyPress = now;
});
