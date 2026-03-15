'use strict'; // no funny business.

/* CONSTANTS */
const COLS = 10, ROWS = 20, CS = 30; // board cell size px

const TYPES = ['I','O','T','S','Z','J','L'];

/*colors of the pieces*/
const COLORS = {
  I:'#00e5e5', O:'#e5e500', T:'#9900e5',
  S:'#00cc00', Z:'#e50000', J:'#2244ee', L:'#ee7700'
}; 

/* 4×4 rotation matrices for each piece (1=filled)*/
const MATS = {
  I:[
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O:[
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  T:[
    [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  S:[
    [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  Z:[
    [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
  ],
  J:[
    [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
  ],
  L:[
    [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
    [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
};

/* SRS wall kick data (row_offset, col_offset) 
  adjusts for rotation near wall*/

const KICKS_JLSTZ = {
  '0->1':[[0,0],[0,-1],[-1,-1],[2,0],[2,-1]],
  '1->0':[[0,0],[0,1],[1,1],[-2,0],[-2,1]],
  '1->2':[[0,0],[0,1],[1,1],[-2,0],[-2,1]],
  '2->1':[[0,0],[0,-1],[-1,-1],[2,0],[2,-1]],
  '2->3':[[0,0],[0,1],[-1,1],[2,0],[2,1]],
  '3->2':[[0,0],[0,-1],[1,-1],[-2,0],[-2,-1]],
  '3->0':[[0,0],[0,-1],[1,-1],[-2,0],[-2,-1]],
  '0->3':[[0,0],[0,1],[-1,1],[2,0],[2,1]],
};
const KICKS_I = {
  '0->1':[[0,0],[0,-2],[0,1],[1,-2],[-2,1]],
  '1->0':[[0,0],[0,2],[0,-1],[-1,2],[2,-1]],
  '1->2':[[0,0],[0,-1],[0,2],[-2,-1],[1,2]],
  '2->1':[[0,0],[0,1],[0,-2],[2,1],[-1,-2]],
  '2->3':[[0,0],[0,2],[0,-1],[-1,2],[2,-1]],
  '3->2':[[0,0],[0,-2],[0,1],[1,-2],[-2,1]],
  '3->0':[[0,0],[0,-1],[0,2],[-2,-1],[1,2]],
  '0->3':[[0,0],[0,1],[0,-2],[2,1],[-1,-2]],
};

// N-e-s-inspired speed table per level 
// (ms per row drop)
// each level uses the corresponding speed in ms 
const SPEEDS = [800,717,633,550,467,383,300,217,133,100,83,83,83,67,67,67,50,50,50,33];

// Scoring (ntndo style)
const LINE_PTS = [0,40,100,300,1200];

// DAS / ARR (ms)
// controls Delayed Auto Shift, Auto Repeat Rate,
// and the grace period after it touches the ground.
// max rotating lock allowed is 15 times
const DAS_MS = 170, ARR_MS = 50, LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;

const SOFTDROP_DIVISOR = 20;
const SOFTDROP_FLOOR_MS = 50;

const WATCHDOG_TIMEOUT_MS = 2000;

// Default controls (changeable in the menu)
const DEF_CTRL = {
  moveLeft:'ArrowLeft', moveRight:'ArrowRight',
  softDrop:'ArrowDown', hardDrop:'Space',
  rotateCW:'ArrowUp',  rotateCCW:'KeyZ',
  hold:'KeyC',         pause:'Escape',
};

const CTRL_LABELS = {
  moveLeft:'MOVE LEFT', moveRight:'MOVE RIGHT',
  softDrop:'SOFT DROP', hardDrop:'HARD DROP',
  rotateCW:'ROTATE CW', rotateCCW:'ROTATE CCW',
  hold:'HOLD',          pause:'PAUSE',
};

/* Valid Keys */
const VALID_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 
    'Space', 'Enter', 'Escape', 'Backspace',
    'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
    'AltLeft', 'AltRight',
    ...Array.from({length:26}, (_,i) => 'Key' + String.fromCharCode(65+i)),
    ...Array.from({length:10}, (_,i) => 'Digit' + i),
    ...Array.from({length:10}, (_,i) => 'Numpad' +i),
]);

/* Pool of random quotes */
const QUOTES = [
  "The one game you cannot win!",
  "Extra awesome for organization skills!",
  "Watch out for those empty block spaces",
  "Sound will be added, eventually...",
  "1988 edition... -ish...",
  "I'll watch the Totros movie one of these days is2g",
  "Stack wisely",
  "god i hope i won't get sued for this",
  "Tu eri per meeee il pezzo del totros longilineooooo woo-ooh",
  "There Are Many Benefits To Being A Programmer",
  "The soft drop mechanics are still a work in progress",
];

/* function to pick a quote, putting it here for... topic affinity*/
function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/* CANVAS SETUP */

// the three boards where the pieces are shown
// main board, the 'hold' board, and the 'next piece' board
const bCanvas = document.getElementById('board');
const bCtx    = bCanvas.getContext('2d');
const hCanvas = document.getElementById('c-hold');
const hCtx    = hCanvas.getContext('2d');
const nCanvas = document.getElementById('c-next');
const nCtx    = nCanvas.getContext('2d');

/* STATES */

let board, cur, nextType, holdType, canHold;
let score, lines, level;
let bag, bagNext;
let state; //States: menu, playing, paused, gameover
let dropAcc, lockAcc, lockResets;
let lockActive;
let flashRows, flashTimer, pendingClearCount;
let clearing; //true during line-clear animation
let raf; //calls browser 'drawing function'

//Delayed Auto Shift tracking
let keysHeld = {}; //action → {t0, lastRep}
let keysDown = {}; //keyCode -> bool

let controls, highScores;
let newHSIdx = -1;
let ctrlListening = null; //action being rebound

//UI elements - Draw / update interface elements and scores
const uiScore = document.getElementById('ui-score');
const uiLevel = document.getElementById('ui-level');
const uiLines = document.getElementById('ui-lines');
const uiBest = document.getElementById('ui-best'); 

/* LOCAL BROWSER STORAGE FUNCTIONS - hardened */ 

//hardened load controls function
function loadControls(){
    try{
        const s = localStorage.getItem('tet_ctrl');
        const parsed = s ? JSON.parse(s): {}; //checking if keys commands have already been stored, translates into JS object. The browser stores in JSON.
        //validation
        if (typeof parsed !== 'object' || parsed ===null || Array.isArray(parsed)){
            throw new Error('Invalid format');
        }

        const safe = Object.create(null);

        for (const [k,v] of Object.entries(DEF_CTRL)){
            //checks if the object to parse is valid, 
            //and if it is contained in the valid keys whitelist 
            const isValid = 
                typeof parsed[k] === 'string' &&
                parsed[k].length >0 &&
                parsed[k].length <64 &&
                VALID_KEYS.has(parsed[k]);
            safe[k] = isValid ? parsed[k] : v; 
        }
        controls = Object.assign({}, DEF_CTRL, safe);
    } catch (e){
        console.error('Failed to load controls:', e);
        controls = {... DEF_CTRL};
    }
}

//hardened save controls function
function saveControls(){
    try{
        //validate if object to save is clean
        //if not, log error and then create new
        if(typeof controls !== 'object' || controls === null){
            console.error('Control object is invalid');
            return;
        }
        //create clean object
        const toSave = {};
        for (const [k] of Object.entries(DEF_CTRL)){
            if (typeof controls[k] === 'string' && controls[k].length <64 && VALID_KEYS.has(controls[k])){
                toSave[k] = controls[k];
            }else{
                //if invalid, use default controls
                toSave[k] = DEF_CTRL[k];
            }
        }
        localStorage.setItem('tet_ctrl', JSON.stringify(toSave));
    }catch (e) {
        console.error('Failed to save controls:', e);
    }
}

//hardened load highscores function

function loadHS(){
    try{
        const s = localStorage.getItem('tet_hs');
        const parsed = s ? JSON.parse(s) : [];

        //validate if it's an array
        if (!Array.isArray(parsed)){
            highScores = [];
            return;
        }
        //stream-like syntax to parse
        //the filtering and mapping checks for unwanted input
        highScores = parsed
        .slice(0,10)
        .filter(entry => (
                entry &&
                typeof entry === 'object' &&
                !Array.isArray(entry) &&
                typeof entry.name === 'string' &&
                entry.name.length >0 &&
                entry.name.length <=10 &&
                typeof entry.score === 'number' &&
                isFinite(entry.score) &&
                entry.score >=0 &&
                Number.isInteger(entry.score) &&
                typeof entry.level === 'number' &&
                isFinite(entry.level) &&
                entry.level >= 1 &&
                Number.isInteger(entry.level) &&
                typeof entry.lines === 'number' &&
                isFinite(entry.lines) &&
                entry.lines >=0 &&
                Number.isInteger(entry.lines) 
            ))
            .map(
                entry=> ({
                    name: entry.name
                    .substring(0,10)
                    .replace(/[<>"'&]/g, '')
                    .trim(),
                    score: Math.max(0, Math.floor(entry.score)),
                    level: Math.max(1, Math.floor(entry.level)),
                    lines: Math.max(0, Math.floor(entry.lines)),
            }));
    } catch (e){
        console.error('Failed to load high scores:', e);
        highScores = [];
    }
}

//hardened save highscores function
function saveHS(){
    try {
        if(!Array.isArray(highScores)){
            console.error('High scores is not an array');
            return;
        }
        const toSave = highScores
            .slice(0,10)
            .filter( entry=> (
                    entry &&
                    typeof entry === 'object' &&
                    typeof entry.name === 'string' &&
                    entry.name.length >0 &&
                    entry.name.length <=10 &&
                    typeof entry.score === 'number' &&
                    isFinite(entry.score) &&
                    entry.score >=0 &&
                    Number.isInteger(entry.score) &&
                    typeof entry.level === 'number' &&
                    isFinite(entry.level) &&
                    entry.level >=1 &&
                    Number.isInteger(entry.level) &&
                    typeof entry.lines === 'number' &&
                    isFinite(entry.lines) &&
                    entry.lines >= 0 &&
                    Number.isInteger(entry.lines)
            ))
            .map( entry => ({
                name: entry.name
                    .substring(0,10)
                    .replace(/[<>"'&]/g, '')
                    .trim(),
                score: Math.floor(entry.score),
                level: Math.floor(entry.level),
                lines: Math.floor(entry.lines),
            })
        );
        localStorage.setItem('tet_hs', JSON.stringify(toSave));
    } catch (e){
        console.error('Failed to save high scores:', e);
    }
}

//hardened add highscores function
function addHS(name, sc, lv, ln){
    try{
        //validation for the inserted values
        const validName = (
            typeof name === 'string' &&
            name.length <=10
        ) ? name.toUpperCase().trim() || 'PLAYER' : 'PLAYER';

        const validScore = (
            typeof sc === 'number' &&
            isFinite(sc) &&
            sc >= 0 &&
            Number.isInteger(sc)
        ) ? sc : 0;

        const validLevel = (
            typeof lv === 'number' &&
            isFinite(lv) &&
            lv >=1 &&
            Number.isInteger(lv)
        ) ? lv : 1;

        const validLines = (
            typeof ln === 'number' &&
            isFinite(ln) &&
            ln >=0 &&
            Number.isInteger(ln)
        ) ? ln : 0;

        const entry = {
            name: validName.substring(0,10),
            score: validScore,
            level: validLevel,
            lines: validLines,
        };

        highScores.push(entry);
        highScores.sort((a,b) => b.score - a.score);
        highScores = highScores.slice(0,10);
        newHSIdx = highScores.indexOf(entry);
        saveHS();
    }catch(e){
        console.error('Failed to add highscore:', e);
    }
}

function isNewHS(score){
    try {
        //false if it's not a number. something went wrong
        if(typeof score !== 'number' || !isFinite(score)){
            return false;
        }

        // if it's the first score
        if(!Array.isArray(highScores)){
            return true;
        }

        //there are less than 10 highscores
        if(highScores.length <10){
            return true;
        }
        
        const lastScore = highScores[highScores.length -1]?.score;
        
        if(typeof lastScore !== 'number' || !isFinite(lastScore)){
            return true;
        }

        return score>lastScore;
    }catch(e){
        console.error('Failed check if new highscore:', e);
        return false;
    }
}

function bestScore(){
    try{
        if(!Array.isArray(highScores) || highScores.length === 0){
            return 0;
        }
        const firstScore = highScores[0]?.score; //optional chaining

        if(typeof firstScore === 'number' && isFinite(firstScore)){
            return Math.max(0, Math.floor(firstScore));
        }
        return 0;
    }catch(e){
        console.error('Failed getting best score:', e);
        return 0;
    }
}

/* UTILITIES */
//rotation checker
function matCells(type, rot, row, col){
    const m = MATS[type][rot], cells = [];
    for (let r = 0; r<4; r++)
        for(let c=0; c<4; c++)
            if (m[r][c]) cells.push([row+r, col+c]);
    return cells;
}

//makes prettier the interface labels
function keyLabel(code){
    const map = {
        ArrowLeft:'← LEFT',
        ArrowRight: '→ RIGHT',
        ArrowUp:'↑ UP',
        ArrowDown:'↓ DOWN',
        Space:'SPACE',
        Enter:'ENTER', 
        Escape:'ESC',
        Backspace:'BKSP',
        ShiftLeft:'L.SHIFT', ShiftRight:'R.SHIFT',
        ControlLeft:'L.CTRL', ControlRight:'R.CTRL',
        AltLeft:'L.ALT', AltRight:'R.ALT',
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'NUM'+code.slice(6);
    return code;
}

//calculates dropspeed adjusting for current level
function dropSpeed(lv){
    return SPEEDS[Math.min(lv-1, SPEEDS.length -1)];
}

/* BAG RANDOMIZER  */
function shuffle(arr){
    try {
        //validate inputs
        if(!Array.isArray(arr)){
            console.error('Shuffle: argument should be an array');
            return [];
        }
        
        //handles empty array
        if (arr.length === 0){
            return [];
        }

        //create a copy to avoid mutating the original
        const copy = [...arr];

        // used the Fisher-Yates shuffle algorithm
        for (let i = copy.length -1; i>0; i--){
            const j = Math.floor(Math.random() * (i+1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }catch(e){
        console.error('Failed shuffle, error:', e);
        return [];
    }
}

const FALLBACK_BAG = shuffle([...TYPES]);

function newBag(){
    try{
        const shuffled = shuffle([...TYPES]);

        if(!Array.isArray(shuffled) ||shuffled.length === 0){
            console.error('newBag: shuffled failed, using fallback');
            return [...FALLBACK_BAG];
        }
        return shuffled
    } catch(e){
        console.error('Failed newBag function:', e);
        return [...FALLBACK_BAG]; //fallback?
    }
}

function popBag(){
    try{
        if (!Array.isArray(bag)||bag.length ===0){
            if (!Array.isArray(bagNext)){
                bagNext = newBag();
            }
            bag = bagNext;
            bagNext = newBag();
        }
        const piece = bag.shift();
        if (typeof piece !== 'string' || !TYPES.includes(piece)) {
            console.error(`popBag: invalid piece: ${piece}`);
            return TYPES[Math.floor(Math.random() * TYPES.length)];  //random fallback if pop fails
        }
        return piece;
    } catch (e){
        console.error('Failed popBag function: ',e);
        return TYPES[Math.floor(Math.random() * TYPES.length)];
    }
}

/* BOARD */
function makeBoard(){
    return Array.from({length: ROWS}, () =>new Array(COLS).fill(0));
}

function isValid(type, rot, row, col) {
  for (const [r, c] of matCells(type, rot, row, col)) {
    if (c < 0 || c >= COLS || r >= ROWS) return false;
    if (r >= 0 && board[r][c]) return false;
    //if (r >=0 && board[r] != null && board[r][c]) return false; //redundant
  }
  return true;
}

/* PIECE MANAGEMENT */

function mkPiece(type) {
  return { type, rot:0, row:-1, col:3 };
}

let justSpawned =false;

function spawnCur(type){
    cur = mkPiece(type);
    lockActive = false;
    lockAcc=0;
    lockResets=0;
    dropAcc=0;
    delete keysHeld['softDrop']; //keysHeld = {};
    justSpawned = true; // ' '
    if(!isValid(cur.type, cur.rot, cur.row, cur.col)){
        //gameover
        state = 'gameover';
        endGame();
    }
}

function ghostRow(){
    let gr = cur.row;
    while(isValid(cur.type, cur.rot, gr+1, cur.col)) gr++;
    return gr;
}

function tryMove(dr, dc){
    if (!cur) return false;
    if (isValid(cur.type, cur.rot, cur.row + dr, cur.col + dc)){
        cur.row += dr;
        cur.col += dc;
        if(dc !== 0) resetLock();
        return true; //correctly moved
    }
    return false;
}

//1= Clockwise(CW), -1= Counterclockwise(CCW)
function tryRotate(dir){                                     
    if (!cur) return false;
    if (dir !== 1 && dir !== -1) return false;
    const nr = (cur.rot + (dir === 1 ? 1 : 3)) & 3;
    const key = `${cur.rot}->${nr}`;
    const kicks = cur.type === 'I' ? KICKS_I[key] : KICKS_JLSTZ[key];
    if (!kicks) return false;
    for(const [dr, dc] of kicks){
        if(isValid(cur.type, nr, cur.row +dr, cur.col +dc)){
            cur.rot =  nr;
            cur.row += dr;
            cur.col += dc;
            resetLock();
            return true; //correctly rotated
        }
    }
    return false;
}

function resetLock(){
    if (lockActive && lockResets < MAX_LOCK_RESETS){
        lockAcc = 0;
        lockResets++;
    }
}

function hardDrop(){
    const gr = ghostRow();
    score +=(gr-cur.row) *2;
    cur.row = gr;
    lock();
}

function holdPiece(){
    if(!canHold) return;
    canHold = false;  //voids holding privilege
    if(holdType ===null){
        holdType = cur.type;
        spawnCur(nextType);
        nextType = popBag();
    }else{
        const tmp = holdType;
        holdType = cur.type;
        spawnCur(tmp);
    }
}

/* Lock and line-clearing behaviour */

function lock(){
    if (!cur) return;
    const cells = matCells(cur.type, cur.rot, cur.row, cur.col);
    //check top-out for game over 
    const topOut = cells.every(([r])=> r<0); // could be 'some' if the logic was even one part out = gameover
    if (topOut) {
        state = 'gameover'; 
        endGame();
        return;
    }
    for(const [r,c] of cells){
        if (r>=0 && r < ROWS && c>=0 && c < COLS){
            board[r][c] = COLORS[cur.type];
        }
    }
    cur = null; // prevents further interaction with place stuck on board 
    //find full rows
    const full = [];
    for (let r=0; r < ROWS; r++){
        if (board[r].every(c => c !== 0)) full.push(r);
    }

    if(full.length >0){
        clearing = true;
        flashRows = full;
        pendingClearCount = full.length;
        flashTimer = 0;
        lockActive = false; 
        lockAcc=0; //prevents a pending lock mid-flash
    }else{
        afterClear(0);
    }
}

function afterClear(n){
    const rowsToRemove = flashRows.slice();
    clearing = false;
    flashRows = [];
    if (n >0){
        //remove all full rows bottom to top
        for(const r of rowsToRemove.slice().reverse()){
            board.splice(r,1);
        }
        //add exactly n empty rows at the top
        for(let i =0; i<n;i++){
            board.unshift(new Array(COLS).fill(0));
        }
        lines += n;
        score += (LINE_PTS[Math.min(n, 4)] ??0) * level;
        level = Math.floor(lines/10) + 1;
    }
    canHold = true;
    lastT = null; 
    spawnCur(nextType);
    nextType = popBag();
    updateUI();

    scheduleLoop(); //ensures loop is alive, recovery point in case something goes wrong
}


/* LOOP WATCHDOG (woof)*/

let loopGeneration = 0;
let watchdogTimer = null;

function armWatchdog(){
    if(watchdogTimer !== null){
        clearTimeout(watchdogTimer);
    }
    const gen = loopGeneration;
    watchdogTimer = setTimeout(() =>{
        watchdogTimer = null;
        if (state !== 'playing'){ //not currently playing
            return;
        }
        if(loopGeneration!== gen){ //frame already fired, all good
            return;
        }
        //if we get here the game is stalled. CPR NEEDED
        console.warn('Totros loop watchdog triggered - 1 2 3 !CLEAR! revive raf chain');
        lastT = null;
        raf = requestAnimationFrame(loop);
    }, WATCHDOG_TIMEOUT_MS);
}

function disarmWatchdog(){
    if(watchdogTimer !== null){
        clearTimeout(watchdogTimer);
    }
    watchdogTimer = null;
}

//scheduler, piece which schedules the next frame. 
//ok if called more than once, cancelAnimationFrame() handles it
function scheduleLoop(){
    if(state !== 'playing'){
        return;
    }
    if(raf){
        cancelAnimationFrame(raf);
    }
    raf = requestAnimationFrame(loop);
    armWatchdog();
}


/* GAME CYCLE */

function startGame(){
    board = makeBoard();
    bag = newBag();
    bagNext = newBag();
    score = 0;
    lines = 0;
    level = 1;
    holdType = null;
    canHold = true;
    flashRows = [];
    flashTimer = 0;
    pendingClearCount = 0;
    clearing = false;
    keysHeld = {};
    dropAcc = 0;
    lockAcc = 0;
    lockActive = false;
    lockResets = 0;
    loopGeneration = 0;
    lastT = null;

    spawnCur(popBag());
    nextType = popBag();

    state = 'playing';
    updateUI();
    showOnly(null);
    disarmWatchdog();
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    armWatchdog();
}

function pauseGame(){
    if (state!== 'playing') return;
    state = 'paused';
    disarmWatchdog();
    showOnly('ov-pause');
}

function resumeGame(){
    if(state !== 'paused') return;
    state = 'playing';
    lastT=null;
    showOnly(null);
    disarmWatchdog();
    raf = requestAnimationFrame(loop);
    armWatchdog();
}

function endGame(){
    disarmWatchdog();
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    state = 'gameover';

    document.getElementById('go-score').textContent = score;
    document.getElementById('go-lv').textContent = level;
    document.getElementById('go-ln').textContent = lines;

    const entry = document.getElementById('hs-entry');
    if(isNewHS(score) && score>0){
        entry.style.display = '';
        document.getElementById('name-inp').value = '';
        document.getElementById('name-inp').focus();
    }else{
        entry.style.display = 'none';
    }
    showOnly('ov-gameover');
}

/* Main Loop */ 
let lastT = null;

function loop(t){
    raf = null;
    if (state !== 'playing') return;

    loopGeneration++; //notifies the watchdog that the game is live

    if (lastT === null) lastT = t;
    const dt = Math.min(t - lastT, 100);
    lastT = t;

    if(!clearing){
        // one-frame spawn grace period

        if (justSpawned) { 
            justSpawned = false; 
            render(); 
            scheduleLoop();
            return; 
        }

        //delay and pressdown for held keys (DAS / ARR)
        processDAS(t);

        /* GRAVITY handler */ 
        //Softdrop
        if (keysHeld['softDrop']){
            const sdt = Math.max(dropSpeed(level) / SOFTDROP_DIVISOR, SOFTDROP_FLOOR_MS); //dropSpeed(level) /3;
            dropAcc += dt;
            let softRows = 0;
            while (dropAcc >= sdt){
                dropAcc -= sdt;
                if(tryMove (1,0)) {
                    softRows++;
                }
                else{
                    if(!lockActive && cur.row >=0 ){
                        lockActive =true;
                        lockAcc = 0;
                    } 
                    break;
                }
            }
            score += softRows;
        }else{

        //normal gravity
            dropAcc +=dt;
            const spd = dropSpeed(level);
            while (dropAcc >=spd){
                dropAcc -= spd;
                if (!tryMove(1,0)){
                    if(!lockActive && cur.row >=0){
                        lockActive=true;
                        lockAcc=0;
                    }
                    break;
                }
            }
        }

        //lock delay
        if (lockActive){
            lockAcc += dt;
            if (lockAcc >= LOCK_DELAY_MS) {
                lock();
                if (!clearing) {return;}
                
            return;
            }
        }
    } else {
        // line clear flash animation
        flashTimer += dt;
        if (flashTimer >=200) {
            afterClear(pendingClearCount);
            return;
        }
    }
    render();
    scheduleLoop();
}

/* Visibility Change - prevents dt spike on tab restore */

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden'){
        disarmWatchdog();
    }else{
        lastT = null;
        if(state === 'playing'){
            if(!raf){
                raf = requestAnimationFrame(loop);
            }
            armWatchdog();
        }
    }
});





function processDAS(now){
    for(const [action, st] of Object.entries(keysHeld)) {
        if (action === 'softDrop') continue; //never handled separetely! Check! TODO! 
        const elapsed = now - st.t0; 
        if(elapsed >= DAS_MS){
            if(st.lastRep === null || now - st.lastRep>= ARR_MS){
                st.lastRep = now;
                doAction(action);
            } 
        }
    }
}

function doAction(action){
    if(clearing || state !== 'playing') return;
    switch(action){
        case 'moveLeft' : tryMove(0,-1); break;
        case 'moveRight': tryMove(0,1); break;
        case 'softDrop': if (tryMove(1,0)) score +=1; break;
        case 'rotateCW': tryRotate(1); break;
        case 'rotateCCW': tryRotate(-1); break; 
    }
}

/* INPUT */

document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') {
        return;
    }
    if (ctrlListening){
        bindKey(e.code);
        return;
    }
    e.preventDefault && e.preventDefault();

    const action = codeToAction(e.code);
    if(!action) {
        return;
    }

    if (action ==='pause'){
        if (state ==='playing'){
            pauseGame();
        }else if(state === 'paused'){
            resumeGame();
        }
        return;
    }
    if (action === 'hardDrop' && state ==='playing' && !clearing){
        hardDrop();
        updateUI();
        return;
    }
    if (action ==='hold' && state ==='playing' && !clearing){
        holdPiece();
        updateUI();
        return;
    }

    const das = ['moveLeft', 'moveRight', 'softDrop', 'rotateCW', 'rotateCCW'];
    if (das.includes(action) && state === 'playing'){
        if(!keysHeld[action]){
            keysHeld[action] = {t0:performance.now(), lastRep: null};
            doAction(action);
        }
    }
});

document.addEventListener('keyup', e =>{
    const action = codeToAction(e.code);
    if (action) delete keysHeld[action];
});

function codeToAction(code){
    for (const [a,k] of Object.entries(controls)){
        if (k=== code) return a;
    }
    return null;
}

/* RENDERING */
function render(){
    const c = bCtx;
    c.clearRect(0, 0, COLS * CS, ROWS * CS);

    //grid
    c.fillStyle = '#010601';
    c.fillRect(0,0, COLS * CS, ROWS * CS);
    c.strokeStyle = '#0a1e0a';
    c.lineWidth = 0.5;
    for(let r = 0; r <ROWS; r++){
        for(let col = 0; col < COLS; col++){
            c.strokeRect(col * CS, r*CS, CS, CS);
        }
    }

    //board cells
    for(let r = 0; r<ROWS; r++){
        for(let col = 0; col < COLS; col++){
            if (board[r][col]) {
                drawCell(c, col * CS, r * CS, board[r][col], 1);
            }
        }
    }

    //flash animation
    if (clearing && flashRows.length){
        const alpha = flashTimer < 100 ? flashTimer / 100 : 1 - (flashTimer - 100) / 100;
        c.fillStyle = `rgba(255,255,255,${Math.max(0, alpha * 0.85)})`;
        for(const r of flashRows){
            c.fillRect(0, r * CS, COLS * CS, CS);
        }
    }

    if(state === 'playing' || state === 'paused'){
        if(!clearing && cur){
            //ghost piece
            const gr = ghostRow();
            const gcells = matCells(cur.type, cur.rot, gr, cur.col);
            for(const [r, c2] of gcells){
                if (r>=0){
                    drawGhost(c, c2 * CS, r*CS, COLORS[cur.type]);
                }
            }
            //current piece
            const cells = matCells(cur.type, cur.rot, cur.row, cur.col);
            for(const [r, c2] of cells){
                if(r>=0){
                    drawCell(c, c2 * CS, r * CS, COLORS[cur.type], 1);
                }
            }
        }
    }
    renderPreview(hCtx, holdType, 80, 64);
    renderPreview(nCtx, nextType, 80, 64);
}

function drawCell(c, x, y, color, alpha){
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillRect(x+1, y+1, CS-2, CS-2);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(x+1, y+1, CS-2, 4);
    c.fillRect(x+1, y+1, 4, CS-2);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(x+1, y+CS-5, CS-2, 4);
    c.fillRect(x+CS-5, y+1, 4, CS-2);
    c.globalAlpha =1;
}

function drawGhost(c, x, y, color){
    c.globalAlpha = 0.22;
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.strokeRect(x+2, y+2, CS-4, CS-4);
    c.globalAlpha = 1;
}

function renderPreview(ctx, type, w, h){
    ctx.fillStyle = '#01060';
    ctx.fillRect(0,0,w,h);
    if(!type) {
        return;
    }
    const cells = matCells(type, 0, 0, 0);

    let minR = 4;
    let maxR = 0;
    let minC = 4;
    let maxC = 0;
    
    for(const [r, col] of cells){
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, col);
        maxC = Math.max(maxC, col);
    }

    const pw = (maxC - minC + 1), ph = (maxR - minR +1); 
    const cs = Math.min(Math.floor(w/5), Math.floor(h/5), 18);
    const ox = Math.floor((w -pw *cs)/2) - minC * cs;
    const oy = Math.floor((h - ph * cs)/2) - minR * cs;

    for (const [r, col] of cells){
        const x = ox + col * cs, y = oy + r *cs;
        ctx.fillStyle = COLORS[type];
        ctx.fillRect(x+1, y+1, cs-2, cs-2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x+1, y+1, cs-2, 3);
        ctx.fillRect(x+1, y+1, 3, cs-2);
        ctx.fillStyle = 'rgba(0, 0, 0,0.3)';
        ctx.fillRect(x+1, y+cs-4, cs-2, 3);
        ctx.fillRect(x+cs-4, y+1,3, cs-2);
    }
}

//DOM update
function updateUI(){
    uiScore.textContent = score;
    uiLevel.textContent = level;
    uiLines.textContent = lines;
    uiBest.textContent = Math.max(score, bestScore());
}

/* OVERLAY MANAGEMENT */ 

const OVS = ['ov-menu', 'ov-pause', 'ov-gameover', 'ov-hs', 'ov-ctrl']

function showOnly(id){
    OVS.forEach( o => {
        const el = document.getElementById(o);
        if(el){
            el.classList.toggle('hidden', o !== id);
        }
    });
}

/* HIGHSCORES */
function renderHSTable(highlightIdx = -1){
    const tb = document.getElementById('hs-body');
    tb.innerHTML = '';
    if (highScores.length ===0){
        tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#1a7a1a;padding:12px 0">NO SCORES YET</td></tr>';
        return;
    }
    highScores.forEach((e,i) =>{
        const tr = document.createElement('tr');
        if(i === highlightIdx){
            tr.classList.add('new-entry');
        }
        [i+1, e.name, e.score, e.level, e.lines].forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            tr.appendChild(td);
        });
        tb.appendChild(tr);
    });
}

/* CONTROLS */
function renderCtrlTable(){
    const tbl = document.getElementById('ctrl-tbl');
    tbl.innerHTML = '';
    for(const [action, label] of Object.entries(CTRL_LABELS)){
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = label;
        const td2 = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'keybtn';
        btn.id = 'kb-' + action;
        btn.textContent = keyLabel(controls[action]);
        btn.onclick = () => startListening(action);
        td2.appendChild(btn);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbl.appendChild(tr);
    }
}

function startListening(action){
    if (ctrlListening) {
        stopListening();
    }
    ctrlListening = action;
    const btn = document.getElementById('kb-'+action);
    if(btn){
        btn.classList.add('listening');
        btn.textContent = 'PRESS KEY...';
    }
}

function stopListening(){
    if(!ctrlListening){
        return;
    }
    const btn = document.getElementById('kb-'+ctrlListening);
    if (btn){
        btn.classList.remove('listening');
        btn.textContent = keyLabel(controls[ctrlListening]);
    }
    ctrlListening = null;
}

function bindKey(code){
    if(!ctrlListening){
        return;
    }
    for(const [a,k] of Object.entries(controls)){
        if(k=== code && a !== ctrlListening){
            controls[a] = controls[ctrlListening];
            const ob = document.getElementById('kb-' + a);
            if (ob) {
                ob.textContent = keyLabel(controls[a]);
            }
        }
    }
    controls[ctrlListening] = code;
    stopListening();
}

/* BUTTON WIRING */

function wire(id, fn){
    const el = document.getElementById(id);
    if (el) {
        el.onclick = fn;
    }
}

//starts the game
wire('b-start', () => {
    lastT = null;
    startGame();
});

//highscores menu
wire('b-hs', () => {
    renderHSTable();
    showOnly('ov-hs');
});

//control menu
wire('b-ctrl', () => {
    renderCtrlTable();
    showOnly('ov-ctrl');
});

//resume game from paused
wire('b-resume', () =>{
    lastT = null;
    resumeGame();
});

//control menu and pause
wire('b-ctrl2', () =>{
    renderCtrlTable();
    document.getElementById('b-ctrl-back').onclick = () => {
        saveControls();
        showOnly('ov-pause');
    };
    showOnly('ov-ctrl');
});

//quit the game
wire('b-quit', () => {
    state = 'menu';
    disarmWatchdog();
    showOnly('ov-menu');
    render();
});

//game over
wire('b-submit', () => {
    const name = document.getElementById('name-inp').value;
    addHS(name, score, level, lines);
    document.getElementById('hs-entry').style.display = 'none';
    uiBest.textContent = bestScore();
});

//restart game - retry
wire('b-retry', () =>{
    lastT = null;
    startGame();
});

//main menu again
wire('b-gomenu', () => {
    state = 'menu';
    disarmWatchdog();
    showOnly('ov-menu');
});

//clear all highscores
wire('b-hs-clear', ()=>{
    if(confirm('Clear all high scores?')){
        highScores = [];
        saveHS();
        renderHSTable();
        uiBest.textContent = 0;
    }
});

//back to menu from highscores
wire('b-hs-back', () => showOnly('ov-menu'));

