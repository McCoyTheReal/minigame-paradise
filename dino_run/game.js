const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('message-overlay');
const startBtn = document.getElementById('start-btn');

// Game Constants
let GRAVITY = 0.5;
let JUMP_FORCE = -12;
let SPEED = 4; // Slower start
let GAME_SPEED_INC = 0.001;

// State
let isPlaying = false;
let score = 0;
let highScore = localStorage.getItem('dinoHighScore') || 0;
let frame = 0;
let gameSpeed = SPEED;
let audio = new GameAudio();

// Objects
let dino = {
    x: 50,
    y: 0,
    w: 40,
    h: 40,
    dy: 0,
    isJumping: false,
    grounded: false,
    icon: '🦖'
};

let obstacles = [];

function resize() {
    canvas.width = Math.min(window.innerWidth - 40, 800);
    canvas.height = 300;
    dino.y = canvas.height - 50; // Ground level
}

function spawnObstacle() {
    // Prevent spawning too close to the last obstacle
    if (obstacles.length > 0) {
        let lastObs = obstacles[obstacles.length - 1];
        if (canvas.width - lastObs.x < 300) return;
    }

    const type = Math.random() > 0.5 ? '🌵' : '🌴';
    obstacles.push({
        x: canvas.width,
        y: canvas.height - 45, // Ground - height
        w: 30,
        h: 40,
        type: type,
        passed: false
    });
}

function update() {
    if (!isPlaying) return;
    requestAnimationFrame(update);
    frame++;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ground Line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 10);
    ctx.lineTo(canvas.width, canvas.height - 10);
    ctx.strokeStyle = '#2c2c54';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dino Physics
    if (dino.isJumping) {
        dino.dy += GRAVITY;
        dino.y += dino.dy;

        // Ground Hit
        if (dino.y > canvas.height - 50) {
            dino.y = canvas.height - 50;
            dino.dy = 0;
            dino.isJumping = false;
            dino.grounded = true;
        }
    }

    // Draw Dino (Flipped to face right)
    ctx.save();
    ctx.font = '40px serif';
    ctx.translate(dino.x + 40, dino.y); // Move to the dino's right edge
    ctx.scale(-1, 1); // Flip horizontally
    ctx.fillText(dino.icon, 0, 40);
    ctx.restore();

    // Obstacles
    // Reduce spawn frequency and add randomness
    if (frame % 80 === 0) {
        if (Math.random() > 0.4) spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        // Draw Obstacle
        ctx.font = '40px serif';
        ctx.fillText(obs.type, obs.x, obs.y + 40);

        // Collision (Slightly more forgiving hitboxes)
        if (
            dino.x + 10 < obs.x + obs.w - 10 &&
            dino.x + dino.w - 15 > obs.x &&
            dino.y + 10 < obs.y + obs.h - 10 &&
            dino.y + dino.h - 10 > obs.y
        ) {
            gameOver();
        }

        // Cleanup
        if (obs.x + obs.w < 0) {
            obstacles.splice(i, 1);
            score++;
            scoreEl.innerText = score;
            if (score % 10 === 0) {
                gameSpeed += 0.2; // Slower speed increase
                audio.score();
            }
        }
    }
}

function jump() {
    if (!isPlaying) return;
    if (!dino.isJumping) {
        dino.dy = JUMP_FORCE;
        dino.isJumping = true;
        dino.grounded = false;
        audio.jump();
    }
}

function gameOver() {
    isPlaying = false;
    audio.die();
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('dinoHighScore', highScore);
        highScoreEl.innerText = highScore;
    }
    overlay.classList.remove('hidden');
    startBtn.innerText = "TRY AGAIN";
    document.querySelector('#message-overlay h2').innerText = "Game Over!";
}

function resetGame() {
    score = 0;
    scoreEl.innerText = 0;
    gameSpeed = SPEED;
    obstacles = [];
    frame = 0;
    dino.y = canvas.height - 50;
    dino.dy = 0;
    dino.isJumping = false;
    isPlaying = true;
    overlay.classList.add('hidden');
    update();
}

// Input
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isPlaying) jump();
        else if (!overlay.classList.contains('hidden')) resetGame(); // Quick restart
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isPlaying) jump();
});

startBtn.addEventListener('click', resetGame);
window.addEventListener('resize', resize);

// Init
highScoreEl.innerText = highScore;
resize();
