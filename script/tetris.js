'use strict'; // no funny business.

/* constants */
const COLS = 10, ROWS = 20, CS = 30; // board cell size px

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
  "I'll watch the Tetris movie one of these days is2g",
  "Stack wisely",
  "Gravity ftw",
  "Tu eri per meeee il pezzo del tetris longilineooooo",
  "There Are Many Benefits To Being A Programmer"
];

/* function to pick a quote, putting it here for... topic affinity*/
function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/* Canvas Setup */
// the three boards where the pieces are shown
// main board, the 'hold' board, and the 'next piece' board
const bCanvas = document.getElementById('board');
const bCtx    = bCanvas.getContext('2d');
const hCanvas = document.getElementById('c-hold');
const hCtx    = hCanvas.getContext('2d');
const nCanvas = document.getElementById('c-next');
const nCtx    = nCanvas.getContext('2d');

/* States */
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

//Draw / update interface elements and scores
const uiScore = document.getElementById('ui-score');
const uiLevel = document.getElementById('ui-level');
const uiLines = document.getElementById('ui-lines');
const uiBest = document.getElementById('ui-best'); 

/* local browser storage */ 

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
        for (const [k,v] of Object.entries(DEF_CTRL)){
            if (typeof controls[k] === 'string' && controls[k].length <64 && VALID_KEYS.has(controls[k])){
                toSave[k] = controls[k];
            }else{
                //if invalid, use default controls
                toSave[k] = DEF_CTRL[k];
            }
        }
        localStorage.setItem('tet_ctrl', JSON.stringify(toSave));
    }catch (e) {
        console.error('Failed to save controls:',e);
    }
}