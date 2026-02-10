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
    jumpCount: 0,
    isCrouching: false,
    icon: '🦖'
};

let obstacles = [];
let clouds = [];

function resize() {
    canvas.width = Math.min(window.innerWidth - 40, 800);
    canvas.height = 300;
    dino.y = canvas.height - 50; // Ground level
}

function spawnCloud() {
    clouds.push({
        x: canvas.width,
        y: Math.random() * (canvas.height / 2),
        speed: (Math.random() * 0.5 + 0.5) * 0.5, // Slower than game speed
        size: Math.random() * 20 + 20
    });
}

function spawnObstacle() {
    // Prevent spawning too close to the last obstacle
    if (obstacles.length > 0) {
        let lastObs = obstacles[obstacles.length - 1];
        if (canvas.width - lastObs.x < 300) return;
    }

    const isFlying = Math.random() > 0.7; // 30% chance for Pterodactyl
    const type = isFlying ? '🦅' : (Math.random() > 0.5 ? '🌵' : '🌴');

    obstacles.push({
        x: canvas.width,
        y: isFlying ? canvas.height - 90 : canvas.height - 45, // Flying height vs Ground
        w: 30,
        h: isFlying ? 30 : 40,
        type: type,
        isFlying: isFlying,
        passed: false
    });
}

function update() {
    if (!isPlaying) return;
    requestAnimationFrame(update);
    frame++;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Clouds (Background)
    if (frame % 200 === 0 && Math.random() > 0.5) spawnCloud();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = clouds.length - 1; i >= 0; i--) {
        let c = clouds[i];
        c.x -= c.speed;

        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.5, c.y - c.size * 0.2, c.size * 0.8, 0, Math.PI * 2);
        ctx.arc(c.x + c.size, c.y, c.size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        if (c.x < -100) clouds.splice(i, 1);
    }

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
            dino.jumpCount = 0; // Reset jump count
        }
    }

    // Draw Dino (Flipped to face right)
    ctx.save();
    ctx.font = '40px serif';

    if (dino.isCrouching) {
        ctx.translate(dino.x + 40, dino.y + 20); // Lower rendering
        ctx.scale(-1, 0.6); // Squish vertically
        ctx.fillText(dino.icon, 0, 40);
    } else {
        ctx.translate(dino.x + 40, dino.y);
        ctx.scale(-1, 1);
        ctx.fillText(dino.icon, 0, 40);
    }
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
        // Collision (Slightly more forgiving hitboxes)
        // Adjust dino hitbox when crouching
        const dinoH = dino.isCrouching ? 20 : dino.h;
        const dinoY = dino.isCrouching ? dino.y + 20 : dino.y;

        if (
            dino.x + 10 < obs.x + obs.w - 10 &&
            dino.x + dino.w - 15 > obs.x &&
            dinoY + 10 < obs.y + obs.h - 10 &&
            dinoY + dinoH - 10 > obs.y
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
    // Allow jump if grounded OR if jumpCount < 2 (Double jump)
    if (dino.jumpCount < 2) {
        dino.dy = JUMP_FORCE;
        dino.isJumping = true;
        dino.grounded = false;
        dino.jumpCount++;
        audio.jump();
    }
}

function crouch(state) {
    if (!isPlaying) return;
    dino.isCrouching = state;
    // Fast fall if crouching in air
    if (state && !dino.grounded) {
        dino.dy += 5;
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
    clouds = []; // Reset clouds or keep them? Resetting is cleaner
    frame = 0;
    dino.y = canvas.height - 50;
    dino.dy = 0;
    dino.isJumping = false;
    isPlaying = true;
    overlay.classList.add('hidden');
    // Pre-spawn some clouds
    for(let i=0; i<3; i++) {
        clouds.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height / 2),
            speed: (Math.random() * 0.5 + 0.5) * 0.5,
            size: Math.random() * 20 + 20
        });
    }
    update();
}

// Input
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (isPlaying) jump();
        else if (!overlay.classList.contains('hidden')) resetGame();
    }
    if (e.code === 'ArrowDown') {
        crouch(true);
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') {
        crouch(false);
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isPlaying) {
        // Simple touch logic: Top half jump, bottom half crouch (tap to toggle or hold not easy without UI)
        // For now, simple jump on top, crouch on bottom area? 
        // Let's stick to Jump on tap, maybe swipe down later. Simpler: Tap = Jump.
        jump();
    }
});

startBtn.addEventListener('click', resetGame);
window.addEventListener('resize', resize);

// Init
highScoreEl.innerText = highScore;
resize();
