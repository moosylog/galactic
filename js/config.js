"use strict";

const CURRENT_VERSION = "1.5.0"; 

const DATA = {
    DIFFICULTY: {
        academy: { minLen: 3, maxLen: 5, baseSpeed: 0.25, scoreMod: 1.0 },
        contender: { minLen: 4, maxLen: 7, baseSpeed: 0.45, scoreMod: 2.0 },
        apex: { minLen: 5, maxLen: 8, baseSpeed: 0.65, scoreMod: 3.0 }
    },
    GEO: {
        go60: [{x:0,y:0.9},{x:1,y:0.9},{x:2,y:0.25},{x:3,y:0},{x:4,y:0.15},{x:5,y:0.25},{x:11,y:0.25},{x:12,y:0.15},{x:13,y:0},{x:14,y:0.25},{x:15,y:0.9},{x:16,y:0.9},{x:0,y:1.9},{x:1,y:1.9},{x:2,y:1.25},{x:3,y:1},{x:4,y:1.15},{x:5,y:1.25},{x:11,y:1.25},{x:12,y:1.15},{x:13,y:1},{x:14,y:1.25},{x:15,y:1.9},{x:16,y:1.9},{x:0,y:2.9},{x:1,y:2.9},{x:2,y:2.25},{x:3,y:2},{x:4,y:2.15},{x:5,y:2.25},{x:11,y:2.25},{x:12,y:2.15},{x:13,y:2},{x:14,y:2.25},{x:15,y:2.9},{x:16,y:2.9},{x:0,y:3.9},{x:1,y:3.9},{x:2,y:3.25},{x:3,y:3},{x:4,y:3.15},{x:5,y:3.25},{x:11,y:3.25},{x:12,y:3.15},{x:13,y:3},{x:14,y:3.25},{x:15,y:3.9},{x:16,y:3.9},{x:2,y:4.25},{x:3,y:4},{x:4,y:4.15},{x:12,y:4.15},{x:13,y:4},{x:14,y:4.25},{x:4,y:4.25,r:15},{x:4,y:4.25,r:30},{x:4,y:4.25,r:45},{x:12,y:4.25,r:-45},{x:12,y:4.25,r:-30},{x:12,y:4.25,r:-15}],
        glove80: [{x:0,y:0.5},{x:1,y:0.5},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:13,y:0},{x:14,y:0},{x:15,y:0},{x:16,y:0.5},{x:17,y:0.5},{x:0,y:1.5},{x:1,y:1.5},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:12,y:1},{x:13,y:1},{x:14,y:1},{x:15,y:1},{x:16,y:1.5},{x:17,y:1.5},{x:0,y:2.5},{x:1,y:2.5},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:12,y:2},{x:13,y:2},{x:14,y:2},{x:15,y:2},{x:16,y:2.5},{x:17,y:2.5},{x:0,y:3.5},{x:1,y:3.5},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:12,y:3},{x:13,y:3},{x:14,y:3},{x:15,y:3},{x:16,y:3.5},{x:17,y:3.5},{x:0,y:4.5},{x:1,y:4.5},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6.4,y:4,r:20},{x:7.8,y:3.3,r:30},{x:10.1,y:1.5,r:45},{x:7,y:1.5,r:-45},{x:9.3,y:3.3,r:-30},{x:10.7,y:4,r:-20},{x:12,y:4},{x:13,y:4},{x:14,y:4},{x:15,y:4},{x:16,y:4.5},{x:17,y:4.5},{x:0,y:5.5},{x:1,y:5.5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5.3,y:5.4,r:15},{x:6.6,y:5,r:25},{x:9,y:3.2,r:45},{x:8,y:3.2,r:-45},{x:10.4,y:5,r:-25},{x:11.7,y:5.4,r:-15},{x:13,y:5},{x:14,y:5},{x:15,y:5},{x:16,y:5.5},{x:17,y:5.5}],
        corne: [{x:0,y:0.375},{x:1,y:0.375},{x:2,y:0.125},{x:3,y:0},{x:4,y:0.125},{x:5,y:0.25},{x:9,y:0.25},{x:10,y:0.125},{x:11,y:0},{x:12,y:0.125},{x:13,y:0.375},{x:14,y:0.375},{x:0,y:1.375},{x:1,y:1.375},{x:2,y:1.125},{x:3,y:1},{x:4,y:1.125},{x:5,y:1.25},{x:9,y:1.25},{x:10,y:1.125},{x:11,y:1},{x:12,y:1.125},{x:13,y:1.375},{x:14,y:1.375},{x:0,y:2.375},{x:1,y:2.375},{x:2,y:2.125},{x:3,y:2},{x:4,y:2.125},{x:5,y:2.25},{x:9,y:2.25},{x:10,y:2.125},{x:11,y:2},{x:12,y:2.125},{x:13,y:2.375},{x:14,y:2.375},{x:3.5,y:3.158,r:1},{x:4.6,y:3.305,r:1},{x:5.77,y:3.255,r:1},{x:8.23,y:3.255,r:1},{x:9.4,y:3.305,r:1},{x:10.5,y:3.158,r:1}],
        voyager: [{x:0,y:0.8},{x:1,y:0.8},{x:2,y:0.6},{x:3,y:0.4},{x:4,y:0.7},{x:5,y:0.9},{x:9.5,y:0.9},{x:10.5,y:0.7},{x:11.5,y:0.4},{x:12.5,y:0.6},{x:13.5,y:0.8},{x:14.5,y:0.8},{x:0,y:1.8},{x:1,y:1.8},{x:2,y:1.6},{x:3,y:1.4},{x:4,y:1.7},{x:5,y:1.9},{x:9.5,y:1.9},{x:10.5,y:1.7},{x:11.5,y:1.4},{x:12.5,y:1.6},{x:13.5,y:1.8},{x:14.5,y:1.8},{x:0,y:2.8},{x:1,y:2.8},{x:2,y:2.6},{x:3,y:2.4},{x:4,y:2.7},{x:5,y:2.9},{x:9.5,y:2.9},{x:10.5,y:2.7},{x:11.5,y:2.4},{x:12.5,y:2.6},{x:13.5,y:2.8},{x:14.5,y:2.8},{x:0,y:3.8},{x:1,y:3.8},{x:2,y:3.6},{x:3,y:3.4},{x:4,y:3.7},{x:5,y:3.9},{x:9.5,y:3.9},{x:10.5,y:3.7},{x:11.5,y:3.4},{x:12.5,y:3.6},{x:13.5,y:3.8},{x:14.5,y:3.8},{x:3.3,y:4.3,r:1},{x:4.3,y:4.3,r:1},{x:10.2,y:4.3,r:1},{x:11.2,y:4.3,r:1}],
        ansi60: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0},{x:7,y:0},{x:8,y:0},{x:9,y:0},{x:10,y:0},{x:11,y:0},{x:12,y:0},{x:13,y:0,w:2},{x:0,y:1,w:1.5},{x:1.5,y:1},{x:2.5,y:1},{x:3.5,y:1},{x:4.5,y:1},{x:5.5,y:1},{x:6.5,y:1},{x:7.5,y:1},{x:8.5,y:1},{x:9.5,y:1},{x:10.5,y:1},{x:11.5,y:1},{x:12.5,y:1},{x:13.5,y:1,w:1.5},{x:0,y:2,w:1.75},{x:1.75,y:2},{x:2.75,y:2},{x:3.75,y:2},{x:4.75,y:2},{x:5.75,y:2},{x:6.75,y:2},{x:7.75,y:2},{x:8.75,y:2},{x:9.75,y:2},{x:10.75,y:2},{x:11.75,y:2},{x:12.75,y:2,w:2.25},{x:0,y:3,w:2.25},{x:2.25,y:3},{x:3.25,y:3},{x:4.25,y:3},{x:5.25,y:3},{x:6.25,y:3},{x:7.25,y:3},{x:8.25,y:3},{x:9.25,y:3},{x:10.25,y:3},{x:11.25,y:3},{x:12.25,y:3,w:2.75},{x:0,y:4,w:1.25},{x:1.25,y:4,w:1.25},{x:2.5,y:4,w:1.25},{x:3.75,y:4,w:6.25},{x:10,y:4,w:1.25},{x:11.25,y:4,w:1.25},{x:12.5,y:4,w:1.25},{x:13.75,y:4,w:1.25}]
    },
    TEMPLATES: {
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
    // FIX: Restored IGN_KEYS to prevent startup crash
    IGN_KEYS: ['ESC','TAB','LSHFT','RSHFT','LCTRL','RCTRL','LALT','RALT','LGUI','RGUI','MO1','MO2','MAGIC','LOWER','RAISE','RET','BSPC','DEL','CAPS','ENTER','BACKSPACE','DELETE'],
    DICTIONARY: []
};

let DICT_BUCKETS = { 3:[], 4:[], 5:[], 6:[], 7:[], 8:[] };
let usedWords = new Set();
let customLayoutArray = null;

let offlineDict = ["the","and","you","that","was","for","are","with","his","they","this","have","from","one","had","word","but","not","what","all","were","when","your","can","said","there","use","each","which","she","how","their","will","other","about","out","many","then","them","these","some","her","would","make","like","him","into","time","has","look","two","more","write","see","number","way","could","people","than","first","water","been","call","who","oil","its","now","find","long","down","day","did","get","come","made","may","part"];
offlineDict.forEach(w => {
    w = w.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length < 3) return;
    DATA.DICTIONARY.push(w);
    let len = w.length; if(len > 6) len = 6;
    DICT_BUCKETS[len].push(w);
});

fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt')
    .then(res => res.text())
    .then(text => {
        let words = text.split('\n');
        if (words.length > 100) {
            DATA.DICTIONARY = []; 
            DICT_BUCKETS = { 3:[], 4:[], 5:[], 6:[], 7:[], 8:[] };
            words.forEach(w => {
                w = w.toLowerCase().replace(/[^a-z]/g, '');
                if (w.length < 3) return;
                DATA.DICTIONARY.push(w);
                let len = w.length;
                if(len > 8) len = 8;
                if(!DICT_BUCKETS[len]) DICT_BUCKETS[len] = [];
                DICT_BUCKETS[len].push(w);
            });
        }
    }).catch(e => console.warn("Network dict failed. Running on offline fallback."));

function getPracticeWords(biogram, singleChar, count = 5) {
    let pool = DATA.DICTIONARY.filter(w => w.includes(biogram));
    pool.sort((a, b) => a.length - b.length);
    let shortPool = pool.slice(0, 30).sort(() => 0.5 - Math.random());
    let results = shortPool.slice(0, count);
    
    if (results.length < count) {
        let fallbackPool = DATA.DICTIONARY.filter(w => w.includes(singleChar) && !results.includes(w));
        fallbackPool.sort((a, b) => a.length - b.length);
        let shortFallback = fallbackPool.slice(0, 30).sort(() => 0.5 - Math.random());
        let needed = count - results.length;
        results = results.concat(shortFallback.slice(0, needed));
    }
    return results;
}

function getHeatmapColor(score) {
    let r = Math.round(0 + (255 - 0) * score);
    let g = Math.round(243 + (0 - 243) * score);
    let b = Math.round(255 + (85 - 255) * score);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
}
