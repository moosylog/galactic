/* © 2026 Moosy Research. All rights reserved. */
"use strict";

const CURRENT_VERSION = "1.5.0"; 

const DATA = {
    DIFFICULTY: {
        academy: { minLen: 3, maxLen: 5, baseSpeed: 0.25, scoreMod: 1.0, grace: 7000, rush: 0.002, missDmg: 5, hold: 120000, rank0: 600, rankStep: 120 },
        contender: { minLen: 4, maxLen: 7, baseSpeed: 0.45, scoreMod: 2.0, grace: 4000, rush: 0.005, missDmg: 8, hold: 10000, rank0: 1500, rankStep: 250 },
        apex: { minLen: 5, maxLen: 8, baseSpeed: 0.65, scoreMod: 3.0, grace: 1500, rush: 0.01, missDmg: 10, hold: 2000, rank0: 3500, rankStep: 400 }
    },
    GEO: {
        go60: [{x:0,y:0.9},{x:1,y:0.9},{x:2,y:0.25},{x:3,y:0},{x:4,y:0.15},{x:5,y:0.25},{x:11,y:0.25},{x:12,y:0.15},{x:13,y:0},{x:14,y:0.25},{x:15,y:0.9},{x:16,y:0.9},{x:0,y:1.9},{x:1,y:1.9},{x:2,y:1.25},{x:3,y:1},{x:4,y:1.15},{x:5,y:1.25},{x:11,y:1.25},{x:12,y:1.15},{x:13,y:1},{x:14,y:1.25},{x:15,y:1.9},{x:16,y:1.9},{x:0,y:2.9},{x:1,y:2.9},{x:2,y:2.25},{x:3,y:2},{x:4,y:2.15},{x:5,y:2.25},{x:11,y:2.25},{x:12,y:2.15},{x:13,y:2},{x:14,y:2.25},{x:15,y:2.9},{x:16,y:2.9},{x:0,y:3.9},{x:1,y:3.9},{x:2,y:3.25},{x:3,y:3},{x:4,y:3.15},{x:5,y:3.25},{x:11,y:3.25},{x:12,y:3.15},{x:13,y:3},{x:14,y:3.25},{x:15,y:3.9},{x:16,y:3.9},{x:2,y:4.25},{x:3,y:4},{x:4,y:4.15},{x:12,y:4.15},{x:13,y:4},{x:14,y:4.25},{x:3,y:5.25,r:15},{x:4,y:5.25,r:30},{x:5,y:5.25,r:45},{x:11,y:5.25,r:-45},{x:12,y:5.25,r:-30},{x:13,y:5.25,r:-15}],
        glove80: [{x:0,y:0.5},{x:1,y:0.5},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:13,y:0},{x:14,y:0},{x:15,y:0},{x:16,y:0.5},{x:17,y:0.5},{x:0,y:1.5},{x:1,y:1.5},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:12,y:1},{x:13,y:1},{x:14,y:1},{x:15,y:1},{x:16,y:1.5},{x:17,y:1.5},{x:0,y:2.5},{x:1,y:2.5},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:12,y:2},{x:13,y:2},{x:14,y:2},{x:15,y:2},{x:16,y:2.5},{x:17,y:2.5},{x:0,y:3.5},{x:1,y:3.5},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:12,y:3},{x:13,y:3},{x:14,y:3},{x:15,y:3},{x:16,y:3.5},{x:17,y:3.5},{x:0,y:4.5},{x:1,y:4.5},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6.4,y:4,r:20},{x:7.8,y:3.3,r:30},{x:10.1,y:1.5,r:45},{x:7,y:1.5,r:-45},{x:9.3,y:3.3,r:-30},{x:10.7,y:4,r:-20},{x:12,y:4},{x:13,y:4},{x:14,y:4},{x:15,y:4},{x:16,y:4.5},{x:17,y:4.5},{x:0,y:5.5},{x:1,y:5.5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5.3,y:5.4,r:15},{x:6.6,y:5,r:25},{x:9,y:3.2,r:45},{x:8,y:3.2,r:-45},{x:10.4,y:5,r:-25},{x:11.7,y:5.4,r:-15},{x:13,y:5},{x:14,y:5},{x:15,y:5},{x:16,y:5.5},{x:17,y:5.5}],
        corne: [{x:0,y:0.375},{x:1,y:0.375},{x:2,y:0.125},{x:3,y:0},{x:4,y:0.125},{x:5,y:0.25},{x:9,y:0.25},{x:10,y:0.125},{x:11,y:0},{x:12,y:0.125},{x:13,y:0.375},{x:14,y:0.375},{x:0,y:1.375},{x:1,y:1.375},{x:2,y:1.125},{x:3,y:1},{x:4,y:1.125},{x:5,y:1.25},{x:9,y:1.25},{x:10,y:1.125},{x:11,y:1},{x:12,y:1.125},{x:13,y:1.375},{x:14,y:1.375},{x:0,y:2.375},{x:1,y:2.375},{x:2,y:2.125},{x:3,y:2},{x:4,y:2.125},{x:5,y:2.25},{x:9,y:2.25},{x:10,y:2.125},{x:11,y:2},{x:12,y:2.125},{x:13,y:2.375},{x:14,y:2.375},{x:3.5,y:3.158,r:1},{x:4.6,y:3.305,r:1},{x:5.77,y:3.255,r:1},{x:8.23,y:3.255,r:1},{x:9.4,y:3.305,r:1},{x:10.5,y:3.158,r:1}],
        voyager: [{x:0,y:0.8},{x:1,y:0.8},{x:2,y:0.6},{x:3,y:0.4},{x:4,y:0.7},{x:5,y:0.9},{x:9.5,y:0.9},{x:10.5,y:0.7},{x:11.5,y:0.4},{x:12.5,y:0.6},{x:13.5,y:0.8},{x:14.5,y:0.8},{x:0,y:1.8},{x:1,y:1.8},{x:2,y:1.6},{x:3,y:1.4},{x:4,y:1.7},{x:5,y:1.9},{x:9.5,y:1.9},{x:10.5,y:1.7},{x:11.5,y:1.4},{x:12.5,y:1.6},{x:13.5,y:1.8},{x:14.5,y:1.8},{x:0,y:2.8},{x:1,y:2.8},{x:2,y:2.6},{x:3,y:2.4},{x:4,y:2.7},{x:5,y:2.9},{x:9.5,y:2.9},{x:10.5,y:2.7},{x:11.5,y:2.4},{x:12.5,y:2.6},{x:13.5,y:2.8},{x:14.5,y:2.8},{x:0,y:3.8},{x:1,y:3.8},{x:2,y:3.6},{x:3,y:3.4},{x:4,y:3.7},{x:5,y:3.9},{x:9.5,y:3.9},{x:10.5,y:3.7},{x:11.5,y:3.4},{x:12.5,y:3.6},{x:13.5,y:3.8},{x:14.5,y:3.8},{x:3.3,y:4.3,r:1},{x:4.3,y:4.3,r:1},{x:10.2,y:4.3,r:1},{x:11.2,y:4.3,r:1}],
        ansi60: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},{x:10,y:0},{x:11,y:0},{x:12,y:0},{x:13,y:0,w:2},{x:0,y:1,w:1.5},{x:1.5,y:1},{x:2.5,y:1},{x:3.5,y:1},{x:4.5,y:1},{x:5.5,y:1},{x:6.5,y:1},{x:7.5,y:1},{x:8.5,y:1},{x:9.5,y:1},{x:10.5,y:1},{x:11.5,y:1},{x:12.5,y:1},{x:13.5,y:1,w:1.5},{x:0,y:2,w:1.75},{x:1.75,y:2},{x:2.75,y:2},{x:3.75,y:2},{x:4.75,y:2},{x:5.75,y:2},{x:6.75,y:2},{x:7.75,y:2},{x:8.75,y:2},{x:9.75,y:2},{x:10.75,y:2},{x:11.75,y:2},{x:12.75,y:2,w:2.25},{x:0,y:3,w:2.25},{x:2.25,y:3},{x:3.25,y:3},{x:4.25,y:3},{x:5.25,y:3},{x:6.25,y:3},{x:7.25,y:3},{x:8.25,y:3},{x:9.25,y:3},{x:10.25,y:3},{x:11.25,y:3},{x:12.25,y:3,w:2.75},{x:0,y:4,w:1.25},{x:1.25,y:4,w:1.25},{x:2.5,y:4,w:1.25},{x:3.75,y:4,w:6.25},{x:10,y:4,w:1.25},{x:11.25,y:4,w:1.25},{x:12.5,y:4,w:1.25},{x:13.75,y:4,w:1.25}]
    },
    HANDS: { glove80: { left: [0, 1, 2, 3, 4, 10, 11, 12, 13, 14, 15, 22, 23, 24, 25, 26, 27, 34, 35, 36, 37, 38, 39, 46, 47, 48, 49, 50, 51, 52, 53, 54, 64, 65, 66, 67, 68, 69, 70, 71] }, go60: { left: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 24, 25, 26, 27, 28, 29, 36, 37, 38, 39, 40, 41, 48, 49, 50, 54, 55, 56] } },
    TEMPLATES: {
        glove80: "F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, EQUAL, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, MINUS, TAB, Q, W, E, R, T, Y, U, I, O, P, BSLH, ESC, A, S, D, F, G, H, J, K, L, SEMI, SQT, GRAVE, Z, X, C, V, B, LSHFT, LCTRL, LOWER, LGUI, RCTRL, RSHFT, N, M, COMMA, DOT, FSLH, PG_UP, MAGIC, HOME, END, LEFT, RIGHT, BSPC, DEL, LALT, RALT, RET, SPC, UP, DOWN, LBKT, RBKT, PG_DN",
        go60: "EQUAL, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, MINUS, TAB, Q, W, E, R, T, Y, U, I, O, P, BSLH, ESC, A, S, D, F, G, H, J, K, L, SEMI, SQT, MAGIC, Z, X, C, V, B, N, M, COMMA, DOT, FSLH, MO1, GRAVE, DEL, BSPC, LGUI, LBKT, RBKT, MO2, LSHFT, LCTRL, LALT, SPC, RET, SCROLL, MOVE",
        corne: "TAB, Q, W, E, R, T, Y, U, I, O, P, BSPC, LCTRL, A, S, D, F, G, H, J, K, L, SEMI, SQT, LSHFT, Z, X, C, V, B, N, M, COMMA, DOT, FSLH, ESC, LGUI, LOWER, SPC, RET, RAISE, RALT",
        voyager: "EQUAL, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, MINUS, TAB, Q, W, E, R, T, Y, U, I, O, P, BSLH, CAPS, A, S, D, F, G, H, J, K, L, SEMI, SQT, LSHFT, Z, X, C, V, B, N, M, COMMA, DOT, FSLH, RSHFT, SPC, BSPC, RET, SPC",
        ansi60: "ESC,1,2,3,4,5,6,7,8,9,0,MINUS,EQUAL,BSPC,TAB,Q,W,E,R,T,Y,U,I,O,P,LBKT,RBKT,BSLH,CAPS,A,S,D,F,G,H,J,K,L,SEMI,SQT,RET,LSHFT,Z,X,C,V,B,N,M,COMMA,DOT,FSLH,RSHFT,LCTRL,LGUI,LALT,SPC,RALT,RGUI,MENU,RCTRL"
    },
    LAYOUTS: {
        qwerty: {},
        colemak_dh: {'E':'F','R':'P','T':'B','Y':'J','U':'L','I':'U','O':'Y','P':'SEMI','S':'R','D':'S','F':'T','H':'M','J':'N','K':'E','L':'I','SEMI':'O','V':'D','B':'V','N':'K','M':'H'},
        dvorak: {'Q':'SQT','W':'COMMA','E':'DOT','R':'P','T':'Y','Y':'F','U':'G','I':'C','O':'R','P':'L','S':'O','D':'E','F':'U','G':'I','H':'D','J':'H','K':'T','L':'N','SEMI':'S','Z':'SEMI','X':'Q','C':'J','V':'K','B':'X','N':'B','COMMA':'W','DOT':'V','FSLH':'Z'}
    },
    SYMBOL_MAP: {
        'SEMI':';','SQT':"'",'COMMA':',','DOT':'.','FSLH':'/','BSLH':'\\','MINUS':'-','EQUAL':'=','LBKT':'[','RBKT':']','SPC':' ', 'SPACE':' ', 'ENTER':'RET', 'BACKSPACE':'BSPC',
        'N1':'1', 'N2':'2', 'N3':'3', 'N4':'4', 'N5':'5', 'N6':'6', 'N7':'7', 'N8':'8', 'N9':'9', 'N0':'0'
    },
    IGN_KEYS: ['ESC','TAB','LSHFT','RSHFT','LCTRL','RCTRL','LALT','RALT','LGUI','RGUI','MO1','MO2','MAGIC','LOWER','RAISE','RET','BSPC','DEL','CAPS','ENTER','BACKSPACE','DELETE'],
    DICTIONARY: []
};

let DICT_BUCKETS = { 3:[], 4:[], 5:[], 6:[], 7:[], 8:[] };
let usedWords = new Set();
let customLayoutArray = null;

// Built-in fallback list (original, roughly easy -> hard). The online list below replaces it when available.
const OFFLINE_WORDS = `the and you for are not but all can her was one our out day get has him his how man new now old see two way who boy did its let put say she too use dad mom sun run big red top hot cat dog sit cup hat pen map bus car eat fun sky sea tea yes yet ask end eye far few got job key law lot men own pay saw set son try war why win age air arm art bad bed bit box buy cut die dry ear fall farm fast feel fire fish food foot form four free from full game girl give gold good grow hand hard have head hear help here high home hope hour idea into join keep kind king know land last late life like line list live long look love made make many meet mind more most move much name near need next nice note once only open over page park part past plan play read real rest ride ring road room rule safe same seen send show side sing slow some song soon star stay stop such sure take talk team tell than that them then they thing think this time tree true turn used very walk want warm wash wave week well went were what when will wind wish with word work year your
about after again along below black bread break bring build carry catch child clean clear climb clock close cloud count dance dream drink drive early earth empty enjoy equal every field final floor focus force found fresh front fruit glass grass great green group happy heart heavy horse house human juice large laugh learn leave light local lucky magic major maybe money month mouse music never night noise north novel ocean offer order paint paper party peace phone piano place plant point power press price quick quiet radio raise reach river round scale scene score sense serve shape share sharp shirt short sight sleep small smile solid sound south space speak speed spend sport stage stand start state steam still stone story sugar sweet table taste teach thank their there these three throw tiger today touch tower train truck trust truth under until upper usual voice watch water wheel where which while white whole world write young
bridge button camera castle change circle coffee corner cotton danger doctor dollar dragon engine family farmer finger flower forest friend garden gentle ground guitar hammer island jungle kitchen ladder letter little market master memory middle mirror moment mother nature number object orange pencil planet pocket proper rabbit rocket school shadow silver simple spring street summer supper system ticket travel valley window winter wonder yellow
quality mixture explain quickly jacket journey puzzle freeze wizard zipper oxygen excited exercise crystal diamond fantasy general history imagine justice kingdom library machine monster network pattern picture quarter railway science silence stories teacher thunder tonight traffic variety weather whisper blanket captain chicken chimney complex dolphin elegant explore fashion freedom grocery harvest imagine jewelry kettle lantern leopard mystery orchard penguin quartet rainbow squirrel texture unique vacuum walnut zebra
computer birthday children daughter election elephant festival favorite football hospital industry language magazine mountain national painting platform pleasant practice progress question reaction sandwich scissors security shoulder standard strength straight surprise together tomorrow training umbrella vacation wardrobe weekend whenever absolute adventure`.split(/\s+/);
const JUNK_WORDS = new Set(['usb', 'url', 'faq', 'asp', 'cgi', 'gif', 'iso', 'mpeg', 'jpeg', 'isbn']);
// Quality gate for the online list: it contains names, places, brands and abbreviations. 3-letter words must be on this allow-list;
// longer junk goes on the block-list (add words here if you meet one you do not like).
const ALLOW3 = new Set("the and for you not are all new was can has but our one may out use any see his who now get how its top had day two buy her add she set map way off did car own end him per big law art old why low man job too men box air yes hot say tax got let act red key few age pay war yet sun run net put try log fun lot ask due pro ago via bad far oil bit bay bar dog gas six sat zip bid inn win bed sea cut kit boy son max bin van ads pop hit eye fee aid fat saw led fan ten cat die pet guy cup fit met ice bus bag bug mid lab tag mix fix ray dry spa won mom row eat aim tip ski fly hey tea sky toy hip dot cap ink pin raw hat wet ram fox arm pub hop gun kid pan sum oak vat sir spy sit wow fig tab sin leg gap era jet par mad pen joy ran ill lay bet dad ear tie toe lie amp pad rod sad pot egg jam arc app ion ban odd cry zoo tee hub ace flu rap tin rat gym tan alt pie bow cab dam tub ash tap bee pit ton cow bra pig lit fur tar rug ham nut jar wax bye ant apt gem gig fin mud dip lid hay cop dim sip mug wit rim fog duo aye rid rip bat lip sap dig web jaw lap nod nor oar owl peg rag rib rig rob rub sag sew shy sly sob sow tug vet wag wig woe bud cub den dew dug ego gum gut hen hid hug hum jog jug nap nun paw pea pup ode".split(" "));
const BLOCKED_WORDS = new Set("paul mary mike jack eric dave jeff tony matt jean adam gary jose jane alan nick anne ryan alex andy greg lisa sean kent rico phil ross anna rick fred marc kate carl neil brad juan todd doug cole lynn joel luke pete penn dale chad josh ruth joan sara troy karl shaw judy earl beth jill dans hans lucy luis hugh jake dana owen kyle stan erik kurt hugo leon reid rosa asia java iraq ohio iowa utah iran cuba peru rome arab nasa unix xbox ipod ford sony dell kong hong perl euro wiki faqs urls isbn ieee ncaa espn jpeg mpeg midi scsi voip oclc asin pmid mrna cdna gzip href divx msie adsl issn usda usgs usps dept univ misc prev proc spec phys comp comm conf ment biol hist prot incl dist eval chem goto thru alot tion dont cant nike audi benz sims suse treo ipaq zope avon fuji asus acer yale maui oman guam laos mali bali fiji reno paso pdas cnet foto lite para sans ciao mins sept thai jews".split(" "));
let WORD_RANK = {};
// Keeps 3-8 letter real words only, in list order (the online list is sorted by how common a word is).
function buildDictionary(list) {
    const seen = new Set(), out = [];
    list.forEach(w => {
        w = w.toLowerCase().replace(/[^a-z]/g, '');
        if (w.length < 3 || w.length > 8 || seen.has(w) || !/[aeiouy]/.test(w) || JUNK_WORDS.has(w) || BLOCKED_WORDS.has(w) || (w.length === 3 && !ALLOW3.has(w))) return;
        seen.add(w); out.push(w);
    });
    DATA.DICTIONARY = out;
    DICT_BUCKETS = { 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
    WORD_RANK = {};
    out.forEach((w, i) => { DICT_BUCKETS[w.length].push(w); WORD_RANK[w] = i; });
}
function rankLimit() {
    const d = DATA.DIFFICULTY[STATE.difficulty || 'contender'];
    return d.rank0 + Math.max(1, STATE.wave || 1) * d.rankStep;
}
let cachedDict = null;
try { cachedDict = localStorage.getItem('galactic-dict-v1'); } catch (e) {}
buildDictionary(cachedDict ? cachedDict.split('\n') : OFFLINE_WORDS);
if (!cachedDict) {
    fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt')
        .then(res => res.text())
        .then(text => {
            if (text.split('\n').length > 100) {
                buildDictionary(text.split('\n'));
                try { localStorage.setItem('galactic-dict-v1', text); } catch (e) {}
            }
        }).catch(e => console.warn('Network dict failed. Running on offline fallback.'));
}

function getPracticeWords(bigram, single, count = 5) {
    const typable = w => w.length <= 8 && [...w].every(ch => STATE.activeKeys[ch]);
    const lim = rankLimit() * 2, easy = w => WORD_RANK[w] === undefined || WORD_RANK[w] < lim;
    const occ = w => w.split(bigram).length - 1;
    const shuffle = a => a.sort(() => Math.random() - 0.5);
    let res = [];
    const add = pred => {
        if (res.length >= count) return;
        const pool = shuffle(DATA.DICTIONARY.filter(w => typable(w) && pred(w) && !res.includes(w))).sort((a, b) => occ(b) - occ(a)).slice(0, 40);
        res = res.concat(shuffle(pool).slice(0, count - res.length));
    };
    add(w => easy(w) && w.includes(bigram)); add(w => w.includes(bigram));
    add(w => easy(w) && w.includes(single)); add(w => w.includes(single));
    return res;
}

function getHeatmapColor(score) {
    let r = Math.round(0 + (255 - 0) * score);
    let g = Math.round(243 + (0 - 243) * score);
    let b = Math.round(255 + (85 - 255) * score);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
}

// ---- layout-aware helpers (hand/finger from the layout, bigram stats, accuracy window) ----
function tagKey(key, hw, i, k, maxX) {
    const H = DATA.HANDS[hw];
    const left = H ? H.left.includes(i) : k.x < maxX / 2;
    key.hand = left ? 'L' : 'R';
    key.color = left ? 'var(--neon-blue)' : 'var(--neon-pink)';
    if (k.r !== undefined) key.finger = 'T';
    else { const rank = left ? k.x : maxX - k.x; key.finger = rank <= 1 ? 'P' : rank === 2 ? 'R' : rank === 3 ? 'M' : 'I'; }
}
function bigramType(a, b) {
    const A = STATE.activeKeys[a], B = STATE.activeKeys[b];
    if (!A || !B || a === b) return null;
    if (A.finger === 'T' || B.finger === 'T') return 'thumb';
    if (A.hand !== B.hand) return 'alt';
    return A.finger === B.finger ? 'sfb' : 'same-hand';
}
function computeSuspects() {
    const cnt = {};
    DATA.DICTIONARY.forEach(w => { for (let i = 0; i < w.length - 1; i++) { const k = w[i] + w[i + 1]; if (bigramType(w[i], w[i + 1]) === 'sfb') cnt[k] = (cnt[k] || 0) + 1; } });
    STATE.suspects = Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 12).map(e => e[0]);
}
function weakBigrams() {
    if (!STATE.suspects || !STATE.suspects.length) computeSuspects();
    const out = Object.entries(STATE.bigrams).filter(([k, b]) => b.n + b.err >= 3)
        .map(([k, b]) => [k, (b.err / (b.n + b.err)) * 0.6 + Math.min(1, (b.ms / Math.max(1, b.n)) / 800) * 0.4])
        .sort((x, y) => y[1] - x[1]).slice(0, 8).map(e => e[0]);
    return out.length >= 4 ? out : out.concat((STATE.suspects || []).filter(s => !out.includes(s)).slice(0, 8 - out.length));
}
let lastGoodChar = null, lastGoodTime = 0;
function recordBigram(ch, now) {
    if (lastGoodChar && now - lastGoodTime < 2000) {
        const b = STATE.bigrams[lastGoodChar + ch] || (STATE.bigrams[lastGoodChar + ch] = { n: 0, ms: 0, err: 0 });
        b.n++; b.ms += now - lastGoodTime;
        if (b.n > 200) { b.n >>= 1; b.ms /= 2; b.err >>= 1; }
    }
    lastGoodChar = ch; lastGoodTime = now;
}
function recordBigramError(expected) {
    if (!lastGoodChar || !expected) return;
    const b = STATE.bigrams[lastGoodChar + expected] || (STATE.bigrams[lastGoodChar + expected] = { n: 0, ms: 0, err: 0 });
    b.err++;
}
function pushAcc(v) { STATE.accWindow.push(v); if (STATE.accWindow.length > 100) STATE.accWindow.shift(); }
function updateScoreMultiplier() {
    const w = STATE.accWindow; const acc = w.length ? w.reduce((a, v) => a + v, 0) / w.length : 1;
    STATE.scoreMultiplier = acc === 1 ? 2.0 : acc >= 0.98 ? 1.5 : acc >= 0.95 ? 1.0 : acc >= 0.90 ? 0.5 : 0.1;
}
function showBigramReport() {
    const el = document.getElementById('end-bigrams'); if (!el) return;
    const start = STATE.bigramsStart || {}; let best = null; const ups = [];
    Object.entries(STATE.bigrams).forEach(([k, b]) => {
        const s = start[k];
        if (tierOf(b) > tierOf(s)) ups.push(k.toUpperCase() + ' > ' + TIERS[tierOf(b)]);
        if (s && s.n >= 5 && b.n - s.n >= 3 && b.n >= s.n) {
            const d = s.ms / s.n - (b.ms - s.ms) / (b.n - s.n);
            if (d >= 20 && (!best || d > best.d)) best = { k, d };
        }
    });
    const mi = masteryInfo(), wb = weakBigrams().slice(0, 5).map(x => x.toUpperCase());
    el.textContent = (STATE.newBest ? 'NEW HIGH SCORE!  ' : '') + 'RANK: ' + mi.rank + ' (' + mi.pts + ' PTS)  '
        + (ups.length ? 'LEVEL UP: ' + ups.slice(0, 4).join(', ') + '  ' : '')
        + (best ? 'IMPROVED: ' + best.k.toUpperCase() + ' -' + Math.round(best.d) + 'ms  ' : '')
        + (wb.length ? 'FOCUS: ' + wb.join(', ') + '  ' : '') + '[ENTER = PLAY AGAIN]';
    const ek = document.getElementById('end-keys');
    if (ek) ek.innerHTML = 'DIFFICULTY: <b>' + String(STATE.difficulty || '').toUpperCase() + '</b><br>TOP 5 PROBLEM KEYS: <b>' + (problemKeys().map(k => k.toUpperCase()).join(', ') || 'NONE YET') + '</b>';
    STATE.resultText = 'GALACTIC KEYSTROKE' + (STATE.daily ? ' DAILY ' + STATE.dailyDate : '') + ' | SECTOR ' + STATE.wave + ' | ' + STATE.score + ' PTS | ' + mi.rank + ' | DICT ' + DATA.DICTIONARY.length;
}

const SECTOR_BG = ['#0a0a2a', '#1a0a2e', '#062a2a', '#2a1a06', '#2a0a14'];
function comboMilestone() {
    const n = STATE.combo;
    if (n > 0 && n % 25 === 0) {
        createPopText(n + 'x COMBO!', canvas.width / 2, canvas.height / 2 - 90 * STATE.sf, '#ffea00');
        addEmpCharge(15); if (n % 50 === 0) STATE.hull = Math.min(100, STATE.hull + 5);
        AudioFX.bonus(); updateUI();
    }
}
function wordComplete(t, word, now) {
    if (STATE.ufoId && t.wordId === STATE.ufoId) {
        STATE.ufoId = null; STATE.score += 300; addEmpCharge(30); AudioFX.bonus();
        createPopText('UFO DOWN! +300', canvas.width / 2, canvas.height / 2 + 190 * STATE.sf, '#c77dff');
    }
    if (!t.full || t.dirty) return;
    if (STATE.goldenId && t.wordId === STATE.goldenId) {
        STATE.goldenId = null; STATE.score += 100 * word.length; STATE.shield = true; AudioFX.bonus();
        createPopText('GOLDEN WORD! SHIELD READY', canvas.width / 2, canvas.height / 2 + 150 * STATE.sf, '#ffd700');
    }
    const ms = now - t.t0; if (ms <= 0) return;
    const wpm = (word.length / 5) / (ms / 60000);
    STATE.score += 10 * word.length;
    if (wpm >= Math.max(60, STATE.currentWPM * 1.15)) {
        STATE.score += 25 * word.length; addEmpCharge(5);
        createPopText('BLAZING ' + Math.round(wpm) + ' WPM', canvas.width / 2, canvas.height / 2 + 120 * STATE.sf, '#00ff66');
    } else if (word.length >= 5) createPopText('CLEAN', canvas.width / 2, canvas.height / 2 + 120 * STATE.sf, '#00f3ff');
}

// ---- mastery tiers and ranks (shown on the end screen only) ----
const TIERS = ['', 'BRONZE', 'SILVER', 'GOLD'];
const RANKS = [[150, 'ADMIRAL'], [70, 'COMMANDER'], [30, 'ACE'], [10, 'PILOT'], [0, 'CADET']];
function tierOf(b) {
    if (!b) return 0;
    const tot = b.n + b.err, e = tot ? b.err / tot : 1, a = b.n ? b.ms / b.n : 9999;
    if (b.n >= 20 && e <= 0.05 && a <= 450) return 3;
    if (b.n >= 10 && e <= 0.10 && a <= 700) return 2;
    return (b.n >= 5 && e <= 0.20) ? 1 : 0;
}
function masteryInfo() {
    let pts = 0; Object.values(STATE.bigrams).forEach(b => { pts += tierOf(b); });
    return { pts, rank: RANKS.find(r => pts >= r[0])[1] };
}
// ---- daily challenge: same word sequence for everyone on a given UTC date ----
let dailyRand = null;
function initDaily() {
    const s = new Date().toISOString().slice(0, 10); let h = 0;
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    dailyRand = () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    STATE.dailyDate = s;
}
function wordRand() { return (STATE.daily && dailyRand) ? dailyRand() : Math.random(); }

// ---- run records: all-time high + last 10 runs, each with its 5 problem keys ----
function problemKeys() {
    return Object.entries(STATE.bioTracker || {}).map(([k, b]) => {
        const tot = b.presses + b.misses; if (tot < 3) return null;
        const lat = b.latencies && b.latencies.length ? b.latencies.reduce((a, v) => a + v, 0) / b.latencies.length : 0;
        return [k, (b.misses / tot) * 0.6 + Math.min(1, lat / 800) * 0.4];
    }).filter(Boolean).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
}
function recordRun() {
    const entry = { t: Date.now(), score: STATE.score, wave: STATE.wave, diff: STATE.difficulty, daily: !!STATE.daily,
        dur: Math.round((performance.now() - STATE.startTime) / 1000), keys: problemKeys() };
    STATE.newBest = entry.score > 0 && (!STATE.records.best || entry.score > STATE.records.best.score);
    if (STATE.newBest) STATE.records.best = entry;
    STATE.records.recent.unshift(entry);
    STATE.records.recent.length = Math.min(STATE.records.recent.length, 10);
}

// ---- keyboard panel size (share of the screen height) ----
const HUD_FRACS = { small: 0.20, compact: 0.28, large: 0.40 };
function hudHeight() { return Math.min(canvas.height * (HUD_FRACS[STATE.kbSize] || 0.28), 400 * STATE.sf); }
function focusKeySet() { return new Set(weakBigrams().slice(0, 4).join('').split('')); }
