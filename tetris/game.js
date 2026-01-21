const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score-val');
const linesEl = document.getElementById('lines-val');
const levelEl = document.getElementById('level-val');
const overlay = document.getElementById('message-overlay');
const startBtn = document.getElementById('start-btn');

// Constants
const ROWS = 20;
const COLS = 10;
let BLOCK_SIZE = 25;

function resize() {
    const availableHeight = window.innerHeight - 250; // Account for header and controls
    BLOCK_SIZE = Math.min(25, Math.floor(availableHeight / ROWS));

    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    nextCanvas.width = 4 * BLOCK_SIZE;
    nextCanvas.height = 4 * BLOCK_SIZE;
}

resize();

const COLORS = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // I
    '#0DFF72', // S
    '#F538FF', // Z
    '#FF8E0D', // L
    '#FFE138', // J
    '#3877FF', // O
];

const SHAPES = [
    [],
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]], // T
    [[0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0]], // I
    [[0, 3, 3], [3, 3, 0], [0, 0, 0]], // S
    [[4, 4, 0], [0, 4, 4], [0, 0, 0]], // Z
    [[5, 0, 0], [5, 5, 5], [0, 0, 0]], // L
    [[0, 0, 6], [6, 6, 6], [0, 0, 0]], // J
    [[7, 7], [7, 7]], // O
];

// Game State
let board = createMatrix(COLS, ROWS);
let player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    lines: 0,
    level: 1,
    next: null
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isGameOver = false;
let audio = new GameAudio();

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(board, { x: 0, y: 0 }, ctx);
    drawMatrix(player.matrix, player.pos, ctx);
    drawGhost();
}

function drawMatrix(matrix, offset, context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(x + offset.x, y + offset.y, COLORS[value], context);
            }
        });
    });
}

function drawBlock(x, y, color, context) {
    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    // Shine/Border
    context.strokeStyle = 'rgba(255,255,255,0.3)';
    context.lineWidth = 1;
    context.strokeRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
}

function drawGhost() {
    if (!player.matrix) return;
    let ghostPos = { x: player.pos.x, y: player.pos.y };
    while (!collide(board, { pos: { x: ghostPos.x, y: ghostPos.y + 1 }, matrix: player.matrix })) {
        ghostPos.y++;
    }

    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect((x + ghostPos.x) * BLOCK_SIZE + 2, (y + ghostPos.y) * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
            }
        });
    });
}

function drawNext() {
    nCtx.fillStyle = '#000';
    nCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!player.next) return;

    // Centering next piece
    const offset = { x: 1, y: 1 };
    if (player.next.length === 2) { offset.x = 1; offset.y = 1; } // O
    if (player.next.length === 4) { offset.x = 0; offset.y = 0; } // I

    drawMatrix(player.next, offset, nCtx);
}

function collide(board, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(board, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(board, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(board, player);
    playerReset();
    arenaSweep();
    updateScore();
    audio.drop();
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
        player.pos.x -= dir;
    } else {
        audio.move();
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
    audio.rotate();
}

function playerReset() {
    if (!player.next) {
        player.next = SHAPES[Math.floor(Math.random() * (SHAPES.length - 1)) + 1];
    }
    player.matrix = player.next;
    player.next = SHAPES[Math.floor(Math.random() * (SHAPES.length - 1)) + 1];

    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);

    drawNext();

    if (collide(board, player)) {
        board.forEach(row => row.fill(0));
        isGameOver = true;
        audio.gameOver();
        overlay.classList.remove('hidden');
    }
}

function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = ROWS - 1; y > 0; --y) {
        for (let x = 0; x < COLS; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        rowCount++;
    }

    if (rowCount > 0) {
        player.score += rowCount * 10 * player.level;
        player.lines += rowCount;
        player.level = Math.floor(player.lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (player.level - 1) * 100);
        audio.clear(rowCount);
    }
}

function updateScore() {
    scoreEl.innerText = player.score;
    linesEl.innerText = player.lines;
    levelEl.innerText = player.level;
}

function update(time = 0) {
    if (isGameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function startGame() {
    board = createMatrix(COLS, ROWS);
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    player.next = null;
    isGameOver = false;
    dropInterval = 1000;
    lastTime = 0;
    overlay.classList.add('hidden');

    playerReset();
    updateScore();
    update();
}

// Input Handlers
document.addEventListener('keydown', event => {
    if (isGameOver) return;
    if (event.keyCode === 37) playerMove(-1);
    else if (event.keyCode === 39) playerMove(1);
    else if (event.keyCode === 40) playerDrop();
    else if (event.keyCode === 38) playerRotate(1);
    else if (event.keyCode === 32) playerHardDrop();
});

// Mobile Controls
document.getElementById('btn-left').addEventListener('click', () => playerMove(-1));
document.getElementById('btn-right').addEventListener('click', () => playerMove(1));
document.getElementById('btn-down').addEventListener('click', () => playerDrop());
document.getElementById('btn-rotate').addEventListener('click', () => playerRotate(1));
document.getElementById('btn-drop').addEventListener('click', () => playerHardDrop());

startBtn.addEventListener('click', startGame);

// Init
drawNext();
updateScore();
