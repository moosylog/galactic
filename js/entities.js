"use strict";

class BossShip {
    constructor(word, wordId) {
        this.word = word; this.wordId = wordId;
        this.typedIndex = 0; this.hp = word.length;
        this.isBoss = true; this.active = true;
        
        this.x = canvas.width / 2; this.y = -100 * STATE.sf;
        this.targetY = 240 * STATE.sf;
        
        this.state = 'enter'; 
        this.color = '#ffea00';
        STATE.bossRef = this;
        
        this.capturedKeys = [];
        this.keyAnimations = []; 
        this.captureIndex = 0;
        this.releaseIndex = 0;
    }
    
    update(dt, time) {
        if (this.state === 'enter') {
            this.y += (this.targetY - this.y) * 0.05 * (dt/16);
            if (Math.abs(this.targetY - this.y) < 5) this.state = 'idle';
        } 
        else {
            let anchorY = (this.state === 'shielded') ? 140 * STATE.sf : 240 * STATE.sf;
            let hoverY = anchorY + Math.cos(time/400) * (20 * STATE.sf);
            this.y += (hoverY - this.y) * 0.05 * (dt/16);
            this.x = (canvas.width/2) + Math.sin(time/500) * (50 * STATE.sf);
            
            let sizeMod = STATE.sf * 3.2; 

            if (this.state === 'capture_anim') {
                if (this.captureIndex < this.keyAnimations.length) {
                    let anim = this.keyAnimations[this.captureIndex];
                    let dx = this.x - anim.currX;
                    let dy = (this.y + (15 * sizeMod)) - anim.currY; 
                    let dist = Math.hypot(dx, dy);
                    
                    if (dist > 15 * STATE.sf) {
                        anim.currX += dx * 0.05 * (dt/16);
                        anim.currY += dy * 0.05 * (dt/16);
                        anim.rot += 0.15 * (dt/16);
                        anim.scale = Math.max(0.1, anim.scale - 0.015 * (dt/16));
                    } else {
                        this.captureIndex++;
                    }
                } else {
                    this.state = 'shielded';
                    this.spawnNextPracticeWord();
                }
            }
            else if (this.state === 'release_anim') {
                if (this.releaseIndex < this.keyAnimations.length) {
                    let anim = this.keyAnimations[this.releaseIndex];
                    let dx = anim.originX - anim.currX;
                    let dy = anim.originY - anim.currY;
                    let dist = Math.hypot(dx, dy);
                    
                    if (dist > 10 * STATE.sf) {
                        anim.currX += dx * 0.1 * (dt/16);
                        anim.currY += dy * 0.1 * (dt/16);
                        anim.rot -= 0.2 * (dt/16);
                        anim.scale = Math.min(1.0, anim.scale + 0.08 * (dt/16));
                        
                        if (Math.random() < 0.5) {
                            particles.push(new Particle(anim.currX, anim.currY, '#00ff66'));
                        }
                    } else if (!anim.snapped) {
                        anim.snapped = true;
                        anim.currX = anim.originX;
                        anim.currY = anim.originY;
                        anim.rot = 0;
                        anim.scale = 1.0;
                        createExplosion(anim.originX, anim.originY, '#00ff66');
                        AudioFX.bonus(); 
                        this.releaseIndex++; 
                    }
                } else {
                    this.capturedKeys.forEach(char => {
                        if (STATE.activeKeys[char]) STATE.activeKeys[char].isAbducted = false;
                    });
                    this.capturedKeys = [];
                    this.keyAnimations = [];
                    STATE.hostages.active = false;
                    if(UI.hostageCave) UI.hostageCave.style.display = 'none';
                    this.state = 'idle';
                    this.word = this.word.substring(this.typedIndex);
                    this.typedIndex = 0;
                }
            }
        }
    }

    triggerMistake(currChar, prevChar) {
        if (this.state !== 'idle') return;
        this.state = 'capture_anim';
        this.captureIndex = 0;
        this.capturedKeys = prevChar ? [prevChar, currChar] : [currChar];
        
        STATE.hostages.active = true;
        STATE.hostages.biogram = prevChar ? prevChar + currChar : currChar;
        STATE.hostages.singleChar = currChar;
        STATE.hostages.progress = 0;
        STATE.hostages.required = 5;
        STATE.hostages.keys = this.capturedKeys;
        
        this.keyAnimations = [];
        this.capturedKeys.forEach(char => {
            if (STATE.activeKeys[char]) {
                STATE.activeKeys[char].isAbducted = true;
                this.keyAnimations.push({
                    char: char, currX: STATE.activeKeys[char].x, currY: STATE.activeKeys[char].y,
                    originX: STATE.activeKeys[char].x, originY: STATE.activeKeys[char].y,
                    rot: 0, scale: 1.0, snapped: false
                });
            }
        });
        
        STATE.hostages.practiceWords = getPracticeWords(STATE.hostages.biogram, STATE.hostages.singleChar, 5);
        if(UI.hostageCave) UI.hostageCave.style.display = 'block';
        updateHostageUI();
        AudioFX.tractor();
        createPopText("TRACTOR BEAM LOCK!", canvas.width/2, this.y - (90*STATE.sf), '#00f3ff');
    }

    spawnNextPracticeWord() {
        if (STATE.hostages.progress >= STATE.hostages.required) {
            this.state = 'release_anim';
            this.releaseIndex = 0;
            AudioFX.rescue();
            createPopText("SHIELD FRACTURED! RELEASING KEYS!", canvas.width/2, this.y - (90*STATE.sf), '#00ff66');
            return;
        }
        let pWord = STATE.hostages.practiceWords[STATE.hostages.progress];
        let pId = "PRACTICE_" + Date.now();
        STATE.currentTarget = null;
        for(let i=0; i<pWord.length; i++) {
            enemies.push(new PracticeMissile(pWord, i, pWord.length, pId, this.x, this.y));
        }
    }

    draw(ctx, dt) {
        ctx.save(); ctx.translate(this.x, this.y);
        
        let sizeMod = STATE.sf * 3.2; 
        let now = Date.now();
        
        let activeAnim = null;
        if (this.state === 'capture_anim' && this.captureIndex < this.keyAnimations.length) {
            activeAnim = this.keyAnimations[this.captureIndex];
        } else if (this.state === 'release_anim' && this.releaseIndex < this.keyAnimations.length) {
            activeAnim = this.keyAnimations[this.releaseIndex];
        }

        if (activeAnim) {
            let mx = 0; let my = 15 * sizeMod; 
            let tx = activeAnim.currX - this.x; let ty = activeAnim.currY - this.y; 
            
            let dx = tx - mx; let dy = ty - my;
            let dist = Math.hypot(dx, dy);
            let angle = Math.atan2(dy, dx);
            
            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(angle);
            
            let pulse = 0.6 + 0.4 * Math.sin(now / 80);
            let beamGrad = ctx.createLinearGradient(0, 0, dist, 0);
            beamGrad.addColorStop(0, `rgba(0, 243, 255, ${0.9 * pulse})`);
            beamGrad.addColorStop(1, `rgba(0, 243, 255, 0.0)`);
            
            let endWidth = 40 * STATE.sf; 
            
            ctx.fillStyle = beamGrad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(dist, endWidth);
            ctx.lineTo(dist, -endWidth);
            ctx.closePath();
            ctx.fill();
            
            let numLines = 6;
            ctx.lineWidth = 3 * STATE.sf;
            for (let i = 0; i < numLines; i++) {
                let dir = (this.state === 'capture_anim') ? -1 : 1;
                let speed = 0.6;
                let offset = ((now * speed * dir) + (i * (dist / numLines))) % dist;
                if (offset < 0) offset += dist; 
                
                let scanWidth = (offset / dist) * endWidth; 
                
                ctx.strokeStyle = `rgba(0, 243, 255, ${0.9 * pulse})`;
                ctx.beginPath();
                ctx.moveTo(offset, -scanWidth);
                ctx.lineTo(offset, scanWidth);
                ctx.stroke();
            }
            ctx.restore();
        }
        
        let throb = 0.5 + Math.sin(now/50)*0.5;
        ctx.shadowBlur = 30 * STATE.sf; ctx.shadowColor = 'var(--neon-pink)';
        ctx.fillStyle = `rgba(255, 0, 85, ${throb})`;
        ctx.beginPath(); ctx.arc(-18*sizeMod, -15*sizeMod, 8*sizeMod, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(18*sizeMod, -15*sizeMod, 8*sizeMod, 0, Math.PI*2); ctx.fill();

        ctx.shadowBlur = 20 * STATE.sf; ctx.shadowColor = 'var(--neon-purple)';
        ctx.strokeStyle = 'var(--neon-purple)'; ctx.lineWidth = 3 * STATE.sf;
        
        ctx.beginPath();
        ctx.moveTo(0, -25*sizeMod);           
        ctx.lineTo(25*sizeMod, -12*sizeMod);  
        ctx.lineTo(45*sizeMod, 15*sizeMod);   
        ctx.lineTo(22*sizeMod, 8*sizeMod);    
        ctx.lineTo(30*sizeMod, 30*sizeMod);   
        ctx.lineTo(12*sizeMod, 15*sizeMod);   
        ctx.lineTo(0, 20*sizeMod);            
        ctx.lineTo(-12*sizeMod, 15*sizeMod);  
        ctx.lineTo(-30*sizeMod, 30*sizeMod);  
        ctx.lineTo(-22*sizeMod, 8*sizeMod);   
        ctx.lineTo(-45*sizeMod, 15*sizeMod);  
        ctx.lineTo(-25*sizeMod, -12*sizeMod); 
        ctx.closePath();

        let hullGrad = ctx.createLinearGradient(0, -25*sizeMod, 0, 30*sizeMod);
        hullGrad.addColorStop(0, '#0a0a0f');
        hullGrad.addColorStop(0.5, '#161122');
        hullGrad.addColorStop(1, '#050308');
        ctx.fillStyle = hullGrad; ctx.fill(); ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)'; ctx.lineWidth = 2 * STATE.sf;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, -25*sizeMod);
        ctx.lineTo(15*sizeMod, -5*sizeMod);
        ctx.lineTo(0, 10*sizeMod);
        ctx.lineTo(-15*sizeMod, -5*sizeMod);
        ctx.closePath();
        ctx.fillStyle = '#1e1a2b'; ctx.fill(); ctx.stroke();

        ctx.shadowBlur = 20 * STATE.sf; ctx.shadowColor = 'var(--neon-pink)';
        ctx.fillStyle = 'rgba(255, 0, 85, 0.9)';
        ctx.beginPath(); ctx.ellipse(-15*sizeMod, -2*sizeMod, 4*sizeMod, 12*sizeMod, -Math.PI/8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(15*sizeMod, -2*sizeMod, 4*sizeMod, 12*sizeMod, Math.PI/8, 0, Math.PI*2); ctx.fill();

        ctx.shadowBlur = 25 * STATE.sf; ctx.shadowColor = 'var(--neon-blue)';
        ctx.fillStyle = '#e0ffff';
        ctx.beginPath(); ctx.ellipse(0, 15*sizeMod, 6*sizeMod, 3*sizeMod, 0, 0, Math.PI*2); ctx.fill();

        // ALWAYS draw boss text natively under the shield
        if (this.state === 'idle' || this.state === 'enter') {
            ctx.shadowBlur = 0; 
            let fSize = Math.floor(35 * STATE.sf);
            ctx.font = `800 ${fSize}px 'Oxanium'`; 
            ctx.textAlign = "left"; ctx.textBaseline = "middle";
            let fullWidth = ctx.measureText(this.word.toUpperCase()).width;
            let startX = -fullWidth / 2;
            for(let i=0; i<this.word.length; i++) {
                let char = this.word[i].toUpperCase();
                let cWidth = ctx.measureText(char).width;
                if (i < this.typedIndex) { ctx.fillStyle = 'rgba(0, 255, 102, 0.4)'; } 
                else if (i === this.typedIndex) { ctx.fillStyle = '#fff'; ctx.shadowBlur = 20 * STATE.sf; ctx.shadowColor = '#fff'; } 
                else { ctx.fillStyle = '#ffea00'; ctx.shadowBlur = 0; }
                
                ctx.fillText(char, startX, 55 * sizeMod);
                startX += cWidth;
                ctx.shadowBlur = 0;
            }
        }

        if (this.state === 'shielded' || this.state === 'release_anim') {
            ctx.shadowBlur = 30 * STATE.sf;
            ctx.shadowColor = 'var(--neon-pink)';
            ctx.strokeStyle = `rgba(255, 0, 85, ${0.5 + Math.sin(now/100)*0.3})`;
            ctx.lineWidth = 4 * STATE.sf;
            ctx.beginPath();
            ctx.arc(0, 0, 60*sizeMod, 0, Math.PI*2);
            ctx.stroke();
            
            ctx.strokeStyle = `rgba(0, 243, 255, ${0.2 + Math.cos(now/150)*0.2})`;
            ctx.lineWidth = 2 * STATE.sf;
            ctx.beginPath();
            ctx.arc(0, 0, 50*sizeMod, 0, Math.PI*2);
            ctx.stroke();
        }
        ctx.restore();

        if (this.state === 'capture_anim' || this.state === 'release_anim') {
            this.keyAnimations.forEach(anim => {
                if (anim.snapped) return; 

                ctx.save();
                ctx.translate(anim.currX, anim.currY);
                ctx.rotate(anim.rot);
                ctx.scale(anim.scale, anim.scale);
                
                ctx.lineWidth = 2 * STATE.sf; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.strokeStyle = 'var(--neon-blue)'; ctx.shadowBlur = 30 * STATE.sf; ctx.shadowColor = 'var(--neon-blue)';
                
                let kData = STATE.activeKeys[anim.char];
                let kw = kData ? kData.w : 30 * STATE.sf;
                let kh = kData ? kData.h : 30 * STATE.sf;

                let keyGrad = ctx.createLinearGradient(0, -kh/2, 0, kh/2);
                keyGrad.addColorStop(0, `rgba(0, 243, 255, 0.9)`); 
                keyGrad.addColorStop(1, `rgba(0, 100, 150, 0.5)`);
                ctx.fillStyle = keyGrad;

                ctx.beginPath(); ctx.roundRect(-kw/2, -kh/2, kw, kh, 6 * STATE.sf); ctx.fill(); ctx.stroke();
                ctx.shadowBlur = 10 * STATE.sf; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff'; 
                ctx.font = `800 ${Math.max(14, kh * 0.5)}px 'Oxanium'`; 
                ctx.fillText(anim.char.toUpperCase(), 0, 2 * STATE.sf);
                ctx.restore();
            });
        }
    }
}

class PracticeMissile {
    constructor(word, index, totalInWord, wordId, startX, startY) {
        this.char = word[index].toLowerCase(); this.word = word; this.wordId = wordId; 
        this.index = index; this.isBoss = false; this.isPractice = true;
        this.targetNode = STATE.activeKeys[this.char] || {x: canvas.width/2, y: canvas.height};
        this.x = startX; this.y = startY;
        
        let spacing = 60 * STATE.sf; let wordWidth = totalInWord * spacing;
        this.formX = (canvas.width/2) - (wordWidth/2) + (index * spacing);
        this.formY = 350 * STATE.sf;
        
        this.active = true; this.targeted = false; 
        this.color = '#ffea00'; 
    }

    update(dt, time) {
        let dx = this.formX - this.x; let dy = this.formY - this.y;
        let speed = 0.05; 
        this.x += dx * speed * (dt/16); this.y += dy * speed * (dt/16);
        this.x += Math.sin(time/200 + this.index) * (2 * STATE.sf);
        
        let splitLine = canvas.height - Math.min(canvas.height * 0.40, 400 * STATE.sf);
        if(this.y > splitLine) { 
            this.active = false; damagePlayer(5); createExplosion(this.x, this.y, this.color); 
            if(STATE.bossRef) STATE.bossRef.spawnNextPracticeWord();
        }
    }

    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        let sizeMod = STATE.sf * 1.5;
        ctx.shadowBlur = 15 * STATE.sf; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color; ctx.lineWidth = 2 * STATE.sf;
        ctx.beginPath();
        ctx.moveTo(0, -15 * sizeMod); ctx.lineTo(10 * sizeMod, 0); ctx.lineTo(0, 15 * sizeMod); ctx.lineTo(-10 * sizeMod, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 234, 0, 0.2)'; ctx.fill(); ctx.stroke();

        if(STATE.currentTarget && STATE.currentTarget.wordId === this.wordId && STATE.currentTarget.index === this.index) {
            ctx.shadowColor = '#fff'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1 * STATE.sf;
            ctx.beginPath(); ctx.arc(0, 0, 25 * sizeMod, 0, Math.PI*2); ctx.stroke();
        }

        // ALWAYS draw text natively
        ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
        let fSize = Math.max(16, Math.floor(22 * STATE.sf));
        ctx.font = `800 ${fSize}px 'Oxanium'`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(this.char.toUpperCase(), 0, -25 * sizeMod);
        ctx.restore();
    }
}

class SwarmEnemy {
    constructor(word, index, totalInWord, wordId = null) {
        this.char = word[index].toLowerCase(); this.word = word; this.wordId = wordId || word; 
        this.index = index; this.isBoss = false;
        this.targetNode = STATE.activeKeys[this.char] || {x: canvas.width/2, y: canvas.height};
        this.state = 'enter'; 
        this.x = (canvas.width / 2) + (Math.random() * 400 - 200) * STATE.sf; this.y = -50 * STATE.sf;
        
        let spacing = 70 * STATE.sf; let wordWidth = totalInWord * spacing;
        this.formX = (canvas.width/2) - (wordWidth/2) + (index * spacing);
        this.formY = (160 + (Math.random() * 100)) * STATE.sf;
        
        this.active = true; this.targeted = false; 
        this.color = (this.targetNode.color === 'var(--neon-blue)') ? '#00f3ff' : '#ff0055';
    }

    update(dt, time) {
        let diff = DATA.DIFFICULTY[STATE.difficulty || 'contender'];
        let waveScale = Math.min(0.4, STATE.wave * 0.02); 
        let baseSpeed = diff.baseSpeed + waveScale;

        if(this.state === 'enter') {
            let dx = this.formX - this.x; let dy = this.formY - this.y;
            let swoopSpeed = baseSpeed * 0.15;
            this.x += dx * swoopSpeed * (dt/16); this.y += dy * swoopSpeed * (dt/16);
            this.x += Math.sin(time/200 + this.index) * (2 * STATE.sf);
            if(Math.abs(dx) < 5 && Math.abs(dy) < 5) this.state = 'hover';
        }
        else if (this.state === 'hover') {
            this.x = this.formX + Math.sin(time/500 + this.index) * (20 * STATE.sf);
            this.y = this.formY + Math.cos(time/400 + this.index) * (10 * STATE.sf);
            let diveChance = 0.0005 + (STATE.wave * 0.0002);
            if(Math.random() < diveChance) this.state = 'dive';
        }
        else if (this.state === 'dive') {
            let dx = this.targetNode.x - this.x; this.x += dx * 0.02 * (dt/16);
            this.y += baseSpeed * STATE.sf * (dt/16); 
            this.x += Math.sin(time/100) * (5 * STATE.sf);
        }

        let splitLine = canvas.height - Math.min(canvas.height * 0.40, 400 * STATE.sf);
        if(this.y > splitLine) { this.active = false; damagePlayer(10); createExplosion(this.x, this.y, this.color); }
    }

    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        let sizeMod = STATE.sf * 1.5;
        let now = Date.now();
        
        let enginePulse = Math.sin(now/50 + this.index) * 2;
        ctx.shadowBlur = 15 * STATE.sf; ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(-5*sizeMod, 12*sizeMod, 3*sizeMod + enginePulse, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(5*sizeMod, 12*sizeMod, 3*sizeMod + enginePulse, 0, Math.PI*2); ctx.fill();

        ctx.strokeStyle = this.color; ctx.lineWidth = 2 * STATE.sf;
        ctx.beginPath();
        ctx.moveTo(-4 * sizeMod, -16 * sizeMod); ctx.lineTo(-2 * sizeMod, -22 * sizeMod);
        ctx.lineTo(0, -16 * sizeMod); ctx.lineTo(2 * sizeMod, -22 * sizeMod);
        ctx.lineTo(4 * sizeMod, -16 * sizeMod);
        ctx.bezierCurveTo(18 * sizeMod, -16 * sizeMod, 22 * sizeMod, 0, 16 * sizeMod, 10 * sizeMod);
        ctx.lineTo(6 * sizeMod, 8 * sizeMod); ctx.lineTo(0, 12 * sizeMod);
        ctx.lineTo(-6 * sizeMod, 8 * sizeMod); ctx.lineTo(-16 * sizeMod, 10 * sizeMod);
        ctx.bezierCurveTo(-22 * sizeMod, 0, -18 * sizeMod, -16 * sizeMod, -4 * sizeMod, -16 * sizeMod);
        ctx.closePath(); 
        
        let hullGrad = ctx.createLinearGradient(0, -22*sizeMod, 0, 12*sizeMod);
        hullGrad.addColorStop(0, '#111'); hullGrad.addColorStop(0.5, '#223'); hullGrad.addColorStop(1, '#050505');
        ctx.fillStyle = hullGrad; ctx.fill(); ctx.stroke();
        
        ctx.beginPath(); ctx.moveTo(0, -10*sizeMod); ctx.lineTo(12*sizeMod, 0); ctx.moveTo(0, -10*sizeMod); ctx.lineTo(-12*sizeMod, 0);
        ctx.strokeStyle = `rgba(255,255,255,0.2)`; ctx.stroke();

        ctx.shadowBlur = 15 * STATE.sf; ctx.shadowColor = this.color;
        ctx.fillStyle = this.color; ctx.beginPath(); ctx.ellipse(0, -6*sizeMod, 4*sizeMod, 6*sizeMod, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.ellipse(0, -7*sizeMod, 1.5*sizeMod, 3*sizeMod, 0, 0, Math.PI*2); ctx.fill();

        if(STATE.currentTarget && STATE.currentTarget.wordId === this.wordId && STATE.currentTarget.index === this.index) {
            ctx.shadowColor = '#fff'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1 * STATE.sf;
            ctx.beginPath(); ctx.arc(0, 0, 25 * sizeMod, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-30*sizeMod, 0); ctx.lineTo(-20*sizeMod, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(30*sizeMod, 0); ctx.lineTo(20*sizeMod, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -30*sizeMod); ctx.lineTo(0, -20*sizeMod); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 30*sizeMod); ctx.lineTo(0, 20*sizeMod); ctx.stroke();
        }

        // ALWAYS draw text natively
        ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
        let fSize = Math.max(16, Math.floor(22 * STATE.sf));
        ctx.font = `800 ${fSize}px 'Oxanium'`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(this.char.toUpperCase(), 0, -35 * sizeMod);
        
        ctx.restore();
    }
}

class BonusDrone {
    constructor(isRescue = false) {
        this.isRescue = isRescue; this.color = isRescue ? '#ffea00' : '#00ff66'; 
        let keys = Object.keys(STATE.activeKeys).filter(k => /[a-z]/.test(k) && !STATE.activeKeys[k].isAbducted);
        this.char = keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : 'a';
        this.y = (100 + Math.random() * 200) * STATE.sf;
        this.dir = Math.random() > 0.5 ? 1 : -1; 
        this.x = this.dir === 1 ? -50 : canvas.width + 50;
        this.speed = (150 + Math.random() * 100) * STATE.sf; 
        this.active = true; this.targeted = false;
    }
    update(dt) { 
        this.x += this.dir * this.speed * (dt/1000); 
        this.y += Math.sin(Date.now() / 300) * 0.5 * STATE.sf;
        if ((this.dir === 1 && this.x > canvas.width + 50) || (this.dir === -1 && this.x < -50)) { this.active = false; }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        let sizeMod = STATE.sf * 1.5; let now = Date.now();
        ctx.shadowBlur = 25 * STATE.sf; ctx.shadowColor = this.color; 
        let pulse = 0.6 + Math.sin(now / 100) * 0.4;
        ctx.strokeStyle = `rgba(${this.isRescue ? '255,234,0' : '0,255,102'}, ${pulse})`; ctx.lineWidth = 2 * STATE.sf;
        ctx.beginPath(); ctx.ellipse(0, 0, 24*sizeMod, 12*sizeMod, 0, 0, Math.PI*2); ctx.stroke();
        ctx.shadowBlur = 10 * STATE.sf; ctx.beginPath();
        ctx.moveTo(-18*sizeMod, 0); ctx.lineTo(-10*sizeMod, -8*sizeMod); ctx.lineTo(10*sizeMod, -8*sizeMod);
        ctx.lineTo(18*sizeMod, 0); ctx.lineTo(10*sizeMod, 8*sizeMod); ctx.lineTo(-10*sizeMod, 8*sizeMod); ctx.closePath();
        let hullGrad = ctx.createLinearGradient(0, -8*sizeMod, 0, 8*sizeMod);
        hullGrad.addColorStop(0, '#333'); hullGrad.addColorStop(0.5, '#111'); hullGrad.addColorStop(1, '#000');
        ctx.fillStyle = hullGrad; ctx.fill(); ctx.strokeStyle = this.color; ctx.lineWidth = 2 * STATE.sf; ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = this.color; ctx.lineWidth = 2 * STATE.sf;
        ctx.beginPath(); ctx.arc(0, 0, 16*sizeMod, now/200, Math.PI/2 + now/200); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 16*sizeMod, Math.PI + now/200, Math.PI*1.5 + now/200); ctx.stroke();
        ctx.fillStyle = `rgba(${this.isRescue ? '255,234,0' : '0,255,102'}, 0.15)`;
        ctx.beginPath(); ctx.arc(0, 0, 12*sizeMod, 0, Math.PI*2); ctx.fill();
        
        // ALWAYS draw text natively
        ctx.shadowBlur = 15 * STATE.sf; ctx.shadowColor = this.color; ctx.fillStyle = '#fff'; 
        ctx.font = `800 ${Math.floor(18 * sizeMod)}px 'Oxanium'`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; 
        ctx.fillText(this.char.toUpperCase(), 0, 2*STATE.sf);
        
        ctx.shadowBlur = 15 * STATE.sf; ctx.fillStyle = this.color;
        let trailPulse = Math.random() * 6 * sizeMod;
        if(this.dir === 1) { ctx.beginPath(); ctx.ellipse(-18*sizeMod - trailPulse/2, 0, 4*sizeMod + trailPulse, 2*sizeMod, 0, 0, Math.PI*2); ctx.fill(); } 
        else { ctx.beginPath(); ctx.ellipse(18*sizeMod + trailPulse/2, 0, 4*sizeMod + trailPulse, 2*sizeMod, 0, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
    }
}

class Laser {
    constructor(x, y, targetEnemy, hitCombo, isDualOffset = 0) {
        this.x = x + isDualOffset; this.y = y; this.target = targetEnemy; this.hitCombo = hitCombo; 
        this.speed = 45 * STATE.sf; this.active = true; this.color = (x < canvas.width/2) ? '#00f3ff' : '#ff0055';
    }
    update(dt) {
        if(!this.target.active) { this.active = false; return; }
        let dx = this.target.x - this.x; let dy = this.target.y - this.y; let dist = Math.hypot(dx, dy);
        
        if (dist < this.speed * (dt/16)) {
            this.active = false; 
            if(this.target instanceof BonusDrone) {
                this.target.active = false; createExplosion(this.target.x, this.target.y, this.target.color); AudioFX.bonus();
                if (this.target.isRescue && STATE.stolenKeys.length > 0) {
                    let tk = STATE.stolenKeys.shift();
                    if(STATE.activeKeys[tk]) {
                        STATE.activeKeys[tk].isAbducted = false; STATE.activeKeys[tk].isDual = true; AudioFX.rescue();
                        createPopText(`[${tk.toUpperCase()}] RESCUED! DUAL FIRE UNLOCKED!`, canvas.width/2, this.target.y, '#00ff66');
                        particles.push(new RescueParticle(this.target.x, this.target.y, STATE.activeKeys[tk].x, STATE.activeKeys[tk].y, '#00ff66'));
                    }
                } else {
                    let diffScoreMod = DATA.DIFFICULTY[STATE.difficulty || 'contender'].scoreMod;
                    addEmpCharge(25); STATE.score += Math.floor(500 * STATE.scoreMultiplier * diffScoreMod); 
                    createPopText("+25% EMP INSTALLED!", this.target.x, this.target.y - 30, '#00ff66');
                }
                updateUI(); return;
            }
            if(this.target.isBoss) {
                createExplosion(this.x, this.y, '#fff'); 
                if (this.target.state === 'idle' || this.target.state === 'enter') {
                    this.target.hp--; 
                    if (this.target.hp <= 0) {
                        this.target.active = false; STATE.bossRef = null;
                        createExplosion(this.target.x, this.target.y, this.target.color); AudioFX.explode();
                    }
                }
            } else {
                this.target.active = false; createExplosion(this.target.x, this.target.y, this.target.color); AudioFX.explode();
            }
            
            let diffScoreMod = DATA.DIFFICULTY[STATE.difficulty || 'contender'].scoreMod;
            STATE.score += Math.floor((100 + this.hitCombo * 10) * STATE.scoreMultiplier * diffScoreMod); 
            addEmpCharge(5 + this.hitCombo); updateUI(); return;
        }
        this.x += (dx/dist) * this.speed * (dt/16); this.y += (dy/dist) * this.speed * (dt/16);
    }
    draw(ctx) {
        ctx.save(); ctx.shadowBlur = 20 * STATE.sf; ctx.shadowColor = this.color; 
        ctx.fillStyle = this.color; ctx.beginPath(); ctx.ellipse(this.x, this.y, 4 * STATE.sf, 16 * STATE.sf, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.ellipse(this.x, this.y, 1.5 * STATE.sf, 10 * STATE.sf, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.vx = (Math.random() - 0.5) * 20 * STATE.sf; this.vy = (Math.random() - 0.5) * 20 * STATE.sf; this.life = 1.0; }
    update(dt) { this.x += this.vx * (dt/16); this.y += this.vy * (dt/16); this.life -= 0.04 * (dt/16); }
}

class RescueParticle {
    constructor(sx, sy, tx, ty, color) { this.x = sx; this.y = sy; this.tx = tx; this.ty = ty; this.color = color; this.life = 1.0; this.speed = 15 * STATE.sf; }
    update(dt) {
        let dx = this.tx - this.x; let dy = this.ty - this.y; let dist = Math.hypot(dx, dy);
        if (dist < this.speed * (dt/16)) { this.life = 0; createExplosion(this.tx, this.ty, this.color); return; }
        this.x += (dx/dist) * this.speed * (dt/16); this.y += (dy/dist) * this.speed * (dt/16);
    }
    draw(ctx) { ctx.save(); ctx.fillStyle = this.color; ctx.shadowBlur = 30 * STATE.sf; ctx.shadowColor = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, 10 * STATE.sf, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
}
