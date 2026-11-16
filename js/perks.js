/* © 2026 Moosy Research. All rights reserved. */
// Perks: after every sector clear (during the hyperspace jump) you pick 1 of 3 small upgrades that last for the rest of the run.
// Press 1, 2 or 3, or click a card. In a daily run the offers depend only on the date and the sector, so they never disturb the shared word sequence.

function freshPerks() { return { counts: {}, list: [], diveMul: 1, empMul: 1, clockMul: 1, steady: false, aegis: false }; }

function dualCandidates() { return Object.keys(STATE.activeKeys).filter(k => /^[a-z]$/.test(k) && !STATE.activeKeys[k].isDual && !STATE.activeKeys[k].isAbducted); }

const PERKS = [
    { id: 'repair', name: 'REPAIR',       max: 99, desc: 'Restore 30% health now.', ok: () => STATE.hull < 100,
      apply() { STATE.hull = Math.min(100, STATE.hull + 30); updateUI(); } },
    { id: 'aegis',  name: 'AEGIS',        max: 1,  desc: 'A shield now, and a fresh one at the start of every sector.',
      apply(P) { P.aegis = true; STATE.shield = true; } },
    { id: 'dives',  name: 'SLOW DIVES',   max: 2,  desc: 'Diving letters fall 15% slower. Stacks twice.',
      apply(P) { P.diveMul *= 0.85; } },
    { id: 'cap',    name: 'CAPACITOR',    max: 2,  desc: 'The EMP charges 30% faster. Stacks twice.',
      apply(P) { P.empMul *= 1.3; } },
    { id: 'steady', name: 'STEADY HANDS', max: 1,  desc: 'A typo keeps half your combo instead of wiping it.',
      apply(P) { P.steady = true; } },
    { id: 'twin',   name: 'TWIN LASERS',  max: 3,  desc: 'Two random keys fire double shots (+10% score on them).', ok: () => dualCandidates().length >= 2,
      apply() { const c = dualCandidates(); for (let n = 0; n < 2; n++) { const k = c.splice(Math.floor(Math.random() * c.length), 1)[0]; STATE.activeKeys[k].isDual = true; STATE.dualChars[k] = true; } } },
    { id: 'clock',  name: 'LONG CLOCK',   max: 1,  desc: 'The wave clock gives you 25% more time.',
      apply(P) { P.clockMul = 1.25; } },
    { id: 'link',   name: 'ARCADE LINK',  max: 99, desc: 'An arcade drone is guaranteed on the next wave that can have one.',
      apply() { STATE.arcade.guarantee = true; } }
];

// a typo keeps half the combo with STEADY HANDS
function typoCombo(c) { return STATE.perk && STATE.perk.steady ? Math.floor(c / 2) : 0; }

function perkRng() {
    if (!STATE.daily) return Math.random;
    let h = 0; for (const ch of (STATE.dailyDate || '') + ':' + STATE.sector) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function perkOffers(rand) {
    rand = rand || perkRng();
    const P = STATE.perk, pool = PERKS.filter(p => (P.counts[p.id] || 0) < p.max && (!p.ok || p.ok())), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    return out;
}

function perkScreen() { return document.getElementById('perk-screen'); }

function openPerkPicker(done) {
    if (STATE.perk.aegis) STATE.shield = true;   // AEGIS: a fresh shield for the new sector
    const offers = perkOffers();
    if (!offers.length) { done(); return; }
    STATE.perkOpen = { offers, done };
    if (typeof window !== 'undefined' && window.AUTO_PERK) { choosePerk(0); return; }   // test and simulation hook: take the first offer
    const el = perkScreen(), cards = document.getElementById('perk-cards'), title = document.getElementById('perk-title');
    if (title) title.textContent = 'SECTOR ' + (STATE.sector - 1) + ' CLEARED: CHOOSE A PERK';
    if (cards) {
        cards.textContent = '';
        offers.forEach((p, i) => {
            const b = document.createElement('button'), n = document.createElement('div'), d = document.createElement('div');
            b.className = 'btn-action perk-card'; n.className = 'perk-name'; d.className = 'perk-desc';
            n.textContent = (i + 1) + '  ' + p.name; d.textContent = p.desc;
            b.onclick = () => choosePerk(i); b.appendChild(n); b.appendChild(d); cards.appendChild(b);
        });
    }
    if (el) el.style.display = 'flex';
}

function choosePerk(i) {
    const po = STATE.perkOpen; if (!po || !po.offers[i]) return;
    STATE.perkOpen = null;
    const el = perkScreen(); if (el) el.style.display = 'none';
    const p = po.offers[i], P = STATE.perk;
    p.apply(P); P.counts[p.id] = (P.counts[p.id] || 0) + 1; P.list.push(p.name);
    AudioFX.bonus();
    createPopText('PERK: ' + p.name, canvas.width / 2, canvas.height / 2, '#ffea00');
    po.done();
}

function closePerkPicker() { STATE.perkOpen = null; const el = perkScreen(); if (el) el.style.display = 'none'; }

// keys 1, 2, 3 choose while the picker is open
function perkKey(e) {
    const po = STATE.perkOpen; if (!po) return false;
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i < 0 || i >= po.offers.length) return false;
    if (e.preventDefault) e.preventDefault();
    choosePerk(i); return true;
}
