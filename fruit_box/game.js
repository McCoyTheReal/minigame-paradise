const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best-score');
const timerEl = document.getElementById('timer');
const resetBtn = document.getElementById('reset-btn');
const muteBtn = document.getElementById('mute-btn');
const overlay = document.getElementById('message-overlay');
const overlayTitle = document.getElementById('message-title');
const overlayText = document.getElementById('message-text');
const continueBtn = document.getElementById('continue-btn');

// Constants
const COLS = 17;
const ROWS = 10;
const TILE_SIZE = 40; // Base size, will scale
const FRUITS = ['🍎', '🍏', '🍊', '🍇', '🍓', '🍋', '🍑', '🍒', '🥥'];
const TIME_LIMIT = 100;

// Game State
let grid = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem('fruitBoxBest')) || 0;
let isDragging = false;
let startPos = null; // {col, row}
let currentPos = null; // {col, row}
let selectionBox = null; // {x, y, w, h}
let gameAudio = new GameAudio();

let timeLeft = TIME_LIMIT;
let timerInterval = null;
let isGameOver = false;

// Combo System
let combo = 0;
let lastMatchTime = 0;
let comboTexts = []; // {x, y, text, life}

// Setup
function init() {
    resizeCanvas();
    gameAudio.init(); // Init audio context on first user interaction technically, called here for logic
    updateBestScore();
    startNewGame();

    // Events
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // Touch support
    canvas.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]));
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        onPointerMove(e.touches[0]);
    });
    window.addEventListener('touchend', onPointerUp);

    resetBtn.addEventListener('click', () => {
        gameAudio.playSelect();
        startNewGame();
    });

    continueBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        if (isGameOver) {
            startNewGame();
        } else {
            // Just cleared stage, continue (timer keeps going or resets? usually resets or adds time. Let's reset for now or keep going? 
            // User asked for 100s timer. Let's assume 100s per game/stage.
            initGrid();
        }
    });

    muteBtn.addEventListener('click', () => {
        const muted = gameAudio.toggleMute();
        muteBtn.textContent = muted ? '🔇' : '🔊';
    });
}

function startNewGame() {
    score = 0;
    combo = 0;
    lastMatchTime = 0;
    updateScore(0);
    timeLeft = TIME_LIMIT;
    isGameOver = false;
    updateTimerDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    initGrid();
    overlay.classList.add('hidden');
    requestAnimationFrame(loop);
}

function updateTimer() {
    if (isGameOver) return;
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
        gameOver();
    }
}

function updateTimerDisplay() {
    timerEl.innerText = timeLeft;
    if (timeLeft <= 10) {
        timerEl.style.color = 'red';
    } else {
        timerEl.style.color = '#FF6B6B'; // Primary color
    }
}

function gameOver() {
    isGameOver = true;
    clearInterval(timerInterval);
    gameAudio.playError();
    showOverlay('Game Over', `Time's Up! Final Score: ${score}`);
    continueBtn.innerText = "Try Again";
}

function resizeCanvas() {
    // Attempt to fit screen but maintain aspect roughly or just center
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 200; // Leave room for header/footer

    // We want TILE_SIZE to be as big as possible to fit COLS/ROWS
    const optimalW = maxWidth / COLS;
    const optimalH = maxHeight / ROWS;
    const size = Math.min(optimalW, optimalH, 50); // Max 50px

    canvas.width = COLS * size;
    canvas.height = ROWS * size;

    // Store scale for transforming mouse input
    canvas.scale = size;
}

function initGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            row.push(createFruit());
        }
        grid.push(row);
    }
}

function createFruit() {
    const num = Math.floor(Math.random() * 9) + 1; // 1-9
    return {
        val: num,
        active: true,
        type: FRUITS[Math.floor(Math.random() * FRUITS.length)],
        popping: false // Animation state
    };
}

// Input Handling
function getGridPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / canvas.scale);
    const row = Math.floor(y / canvas.scale);
    return { col, row };
}

function onPointerDown(e) {
    if (isGameOver) return;

    // Audio context resume trick for browsers
    if (gameAudio.ctx && gameAudio.ctx.state === 'suspended') {
        gameAudio.ctx.resume();
    }

    const pos = getGridPos(e);
    if (pos.col >= 0 && pos.col < COLS && pos.row >= 0 && pos.row < ROWS) {
        isDragging = true;
        startPos = pos;
        currentPos = pos;
        gameAudio.playSelect();
    }
}

function onPointerMove(e) {
    if (!isDragging) return;
    const pos = getGridPos(e);
    // Clamp to grid
    pos.col = Math.max(0, Math.min(COLS - 1, pos.col));
    pos.row = Math.max(0, Math.min(ROWS - 1, pos.row));
    currentPos = pos;
}

function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    checkMatch();
    startPos = null;
    currentPos = null;
}

// Visuals
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const size = canvas.scale;

    // Draw Grid
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = grid[r][c];
            if (!cell.active) continue;

            const x = c * size;
            const y = r * size;

            // Background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

            // Text
            ctx.fillStyle = '#2C3E50';
            ctx.font = `bold ${size * 0.5}px 'Fredoka One'`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw Number
            ctx.fillText(cell.val, x + size / 2, y + size / 2 + size * 0.1);

            // Draw little tiny fruit icon in corner or behind? 
            // Let's draw fruit emoji
            ctx.font = `${size * 0.3}px sans-serif`;
            ctx.fillText(cell.type, x + size * 0.8, y + size * 0.25);
        }
    }

    // Draw Selection
    if (isDragging && startPos && currentPos) {
        const minCol = Math.min(startPos.col, currentPos.col);
        const maxCol = Math.max(startPos.col, currentPos.col);
        const minRow = Math.min(startPos.row, currentPos.row);
        const maxRow = Math.max(startPos.row, currentPos.row);

        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 3;

        // Calculate screen rect
        const x = minCol * size;
        const y = minRow * size;
        const w = (maxCol - minCol + 1) * size;
        const h = (maxRow - minRow + 1) * size;

        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        // Dynamic Sum Indicator (Optional, but helpful)
        const sum = calculateAreaSum(minCol, maxCol, minRow, maxRow);

        ctx.fillStyle = '#FFF';
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = sum === 10 ? '#2ecc71' : '#e74c3c';

        // Tooltip near mouse
        const tipX = currentPos.col * size + size;
        const tipY = currentPos.row * size;
        // ctx.fillText(sum, tipX, tipY); // Might be cluttered, leave out for now
        ctx.globalAlpha = 1.0;
    }

    // Draw Combo Texts
    if (comboTexts) {
        for (let i = comboTexts.length - 1; i >= 0; i--) {
            const ct = comboTexts[i];
            ctx.fillStyle = `rgba(255, 215, 0, ${ct.life})`;
            ctx.font = `bold ${size * 0.8}px 'Fredoka One'`;
            ctx.textAlign = 'center';
            ctx.fillText(ct.text, ct.x, ct.y);
            ct.y -= 2; // Float up
            ct.life -= 0.02;
            if (ct.life <= 0) comboTexts.splice(i, 1);
        }
    }

    requestAnimationFrame(loop);
}

// Logic
function calculateAreaSum(minC, maxC, minR, maxR) {
    let sum = 0;
    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            if (grid[r][c].active) {
                sum += grid[r][c].val;
            }
        }
    }
    return sum;
}

function checkMatch() {
    const minCol = Math.min(startPos.col, currentPos.col);
    const maxCol = Math.max(startPos.col, currentPos.col);
    const minRow = Math.min(startPos.row, currentPos.row);
    const maxRow = Math.max(startPos.row, currentPos.row);

    const sum = calculateAreaSum(minCol, maxCol, minRow, maxRow);

    if (sum === 10) {
        // Success
        let count = 0;
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (grid[r][c].active) {
                    grid[r][c].active = false;
                    count++;
                }
            }
        }
        if (count > 0) {
            // Combo Logic
            const now = Date.now();
            if (now - lastMatchTime < 2500) { // 2.5 seconds window
                combo++;
            } else {
                combo = 1;
            }
            lastMatchTime = now;

            // Score Calculation
            const basePoints = count;
            const comboBonus = (combo - 1) * 5;
            const points = basePoints + comboBonus;

            updateScore(score + points);
            gameAudio.playMatch();

            // Floating Text
            if (combo > 1) {
                const rect = canvas.getBoundingClientRect();
                const x = (minCol * canvas.scale + (maxCol - minCol + 1) * canvas.scale / 2);
                const y = (minRow * canvas.scale);
                comboTexts.push({
                    x: x,
                    y: y,
                    text: `${combo} COMBO!`,
                    life: 1.0
                });
            }

            checkClear();
        }
    } else {
        combo = 0; // Reset combo on mistake
        gameAudio.playError();
    }
}

function updateScore(newScore) {
    score = newScore;
    scoreEl.innerText = score;
    if (score > bestScore) {
        bestScore = score;
        bestEl.innerText = bestScore;
        localStorage.setItem('fruitBoxBest', bestScore);
    }
}

function updateBestScore() {
    bestEl.innerText = bestScore;
}

function checkClear() {
    let remaining = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c].active) remaining++;
        }
    }

    if (remaining === 0) {
        gameAudio.playClear();
        // Bonus time for clearing stage?
        timeLeft += 20; // Add 20 seconds bonus
        updateTimerDisplay();

        showOverlay('Stage Clear!', 'Bonus: +100pts & +20s');
        updateScore(score + 100);
        continueBtn.innerText = "Next Stage";
    }
}

function showOverlay(title, text) {
    overlayTitle.innerText = title;
    overlayText.innerText = text;
    overlay.classList.remove('hidden');
}

window.addEventListener('resize', resizeCanvas);
init();
