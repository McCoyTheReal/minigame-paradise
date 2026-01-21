const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap-canvas');
const mCtx = minimap.getContext('2d');
const scoreEl = document.getElementById('score-val');
const leaderList = document.getElementById('leader-list');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const playerNameInput = document.getElementById('player-name');

// Game Constants
const WORLD_SIZE = 2000;
const MINIMAP_SIZE = 150;
const INITIAL_LENGTH = 10;
const SEGMENT_DISTANCE = 10;
const BASE_SPEED = 3;
const BOOST_SPEED = 6;

// State
let isPlaying = false;
let camera = { x: 0, y: 0 };
let mouse = { x: 0, y: 0 };
let foods = [];
let snakes = [];
let player = null;
let audio = new GameAudio();

class Snake {
    constructor(id, name, color, isPlayer = false) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.isPlayer = isPlayer;

        // Random start position
        this.x = Math.random() * (WORLD_SIZE - 200) + 100;
        this.y = Math.random() * (WORLD_SIZE - 200) + 100;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = BASE_SPEED;
        this.isBoosting = false;

        this.segments = []; // [{x, y}]
        for (let i = 0; i < INITIAL_LENGTH; i++) {
            this.segments.push({ x: this.x, y: this.y });
        }

        this.path = []; // History of head positions for trailing
        this.score = 0;
        this.isDead = false;
    }

    update() {
        if (this.isDead) return;

        // Speed logic
        if (this.isBoosting && this.segments.length > 5) {
            this.speed = BOOST_SPEED;
            if (Date.now() % 5 === 0) {
                this.segments.pop(); // Lose length while boosting
                this.score = Math.max(0, this.score - 1);
                if (this.isPlayer) audio.boost();
            }
        } else {
            this.speed = BASE_SPEED;
        }

        // Direction logic
        if (this.isPlayer) {
            // Follow mouse
            const targetAngle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);
            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.1;
        } else {
            // AI simple wandering/food targeting
            this.updateAI();
        }

        // Move head
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Boundary check
        if (this.x < 0) this.x = 0;
        if (this.x > WORLD_SIZE) this.x = WORLD_SIZE;
        if (this.y < 0) this.y = 0;
        if (this.y > WORLD_SIZE) this.y = WORLD_SIZE;

        // Path buffer for trailing
        this.path.unshift({ x: this.x, y: this.y });
        if (this.path.length > this.segments.length * 10) {
            this.path.pop();
        }

        // Update segments positions
        for (let i = 0; i < this.segments.length; i++) {
            const index = i * Math.floor(SEGMENT_DISTANCE / this.speed);
            if (this.path[index]) {
                this.segments[i].x = this.path[index].x;
                this.segments[i].y = this.path[index].y;
            }
        }
    }

    updateAI() {
        // Occasionally change direction
        if (Math.random() < 0.02) {
            this.targetAngle = Math.random() * Math.PI * 2;
        }

        // Face boundaries
        const margin = 100;
        if (this.x < margin) this.targetAngle = 0;
        else if (this.x > WORLD_SIZE - margin) this.targetAngle = Math.PI;
        else if (this.y < margin) this.targetAngle = Math.PI / 2;
        else if (this.y > WORLD_SIZE - margin) this.targetAngle = -Math.PI / 2;

        if (this.targetAngle !== undefined) {
            let diff = this.targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.05;
        }
    }

    draw() {
        if (this.isDead) return;

        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.color;

        // Draw segments as glowing lines
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.moveTo(this.segments[0].x - camera.x, this.segments[0].y - camera.y);
        for (let i = 1; i < this.segments.length; i++) {
            ctx.lineTo(this.segments[i].x - camera.x, this.segments[i].y - camera.y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw eyes on head
        ctx.fillStyle = '#fff';
        const eyeSize = 4;
        const eyeOffset = 6;
        const head = this.segments[0];

        // Left eye
        ctx.beginPath();
        ctx.arc(
            head.x - camera.x + Math.cos(this.angle - 0.5) * eyeOffset,
            head.y - camera.y + Math.sin(this.angle - 0.5) * eyeOffset,
            eyeSize, 0, Math.PI * 2
        );
        ctx.fill();

        // Right eye
        ctx.beginPath();
        ctx.arc(
            head.x - camera.x + Math.cos(this.angle + 0.5) * eyeOffset,
            head.y - camera.y + Math.sin(this.angle + 0.5) * eyeOffset,
            eyeSize, 0, Math.PI * 2
        );
        ctx.fill();

        // Draw Name
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, head.x - camera.x, head.y - camera.y - 20);
    }
}

function spawnFood() {
    foods.push({
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        size: Math.random() * 3 + 2,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
    });
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function init() {
    resize();
    foods = [];
    snakes = [];

    // Spawn foods
    for (let i = 0; i < 300; i++) spawnFood();

    // Create player
    player = new Snake(Date.now(), playerNameInput.value || "Player", "#39d353", true);
    snakes.push(player);

    // Create AI bots
    const names = ["BotMaster", "Slither", "Neon", "FastOne", "Ghost", "Hungry", "Shadow"];
    const colors = ["#00f2ff", "#ff00ff", "#f1c40f", "#e74c3c", "#9b59b6", "#1abc9c"];
    for (let i = 0; i < 10; i++) {
        snakes.push(new Snake(i, names[i % names.length], colors[i % colors.length]));
    }
}

function update() {
    if (!isPlaying) return;

    // Follow player with camera
    camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1;
    camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1;

    // Boundary limit for camera
    camera.x = Math.max(0, Math.min(camera.x, WORLD_SIZE - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, WORLD_SIZE - canvas.height));

    snakes.forEach(snake => {
        if (snake.isDead) return;
        snake.update();

        // Food collision
        for (let i = foods.length - 1; i >= 0; i--) {
            const food = foods[i];
            const dx = snake.x - food.x;
            const dy = snake.y - food.y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) {
                foods.splice(i, 1);
                snake.score += 10;
                snake.segments.push({ ...snake.segments[snake.segments.length - 1] });
                if (snake.isPlayer) {
                    audio.eat();
                    scoreEl.innerText = snake.score;
                }
                // Respawn food
                spawnFood();
            }
        }

        // Snake vs Snake collision
        snakes.forEach(other => {
            if (other.isDead || snake.id === other.id) return;

            // Check if snake's head hits other snake's body
            for (let i = 0; i < other.segments.length; i++) {
                const seg = other.segments[i];
                const dx = snake.x - seg.x;
                const dy = snake.y - seg.y;
                if (Math.sqrt(dx * dx + dy * dy) < 15) {
                    // Collision!
                    snake.isDead = true;
                    if (snake.isPlayer) {
                        gameOver();
                    } else {
                        // Drop food where bot died
                        snake.segments.forEach(s => {
                            if (Math.random() < 0.5) {
                                foods.push({ x: s.x, y: s.y, size: 5, color: snake.color });
                            }
                        });
                    }
                }
            }
        });
    });

    updateLeaderboard();
    draw();
    drawMinimap();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const gridSize = 100;
    const startX = -camera.x % gridSize;
    const startY = -camera.y % gridSize;

    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw foods
    foods.forEach(food => {
        ctx.fillStyle = food.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = food.color;
        ctx.beginPath();
        ctx.arc(food.x - camera.x, food.y - camera.y, food.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw snakes
    snakes.forEach(snake => snake.draw());
}

function drawMinimap() {
    mCtx.clearRect(0, 0, minimap.width, minimap.height);
    const scale = MINIMAP_SIZE / WORLD_SIZE;

    // Player
    mCtx.fillStyle = player.color;
    mCtx.beginPath();
    mCtx.arc(player.x * scale, player.y * scale, 3, 0, Math.PI * 2);
    mCtx.fill();

    // Bots
    snakes.forEach(s => {
        if (s.isPlayer || s.isDead) return;
        mCtx.fillStyle = s.color;
        mCtx.fillRect(s.x * scale - 1, s.y * scale - 1, 2, 2);
    });
}

function updateLeaderboard() {
    const list = [...snakes]
        .filter(s => !s.isDead)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    leaderList.innerHTML = list.map((s, idx) => `
        <li>
            <span>${idx + 1}. ${s.name}</span>
            <span>${s.score}</span>
        </li>
    `).join('');
}

function startGame() {
    overlay.classList.add('hidden');
    isPlaying = true;
    audio.start();
    init();
    update();
}

function gameOver() {
    isPlaying = false;
    audio.die();
    overlay.classList.remove('hidden');
    document.getElementById('title').innerText = "WASTED";
    document.getElementById('start-btn').innerText = "TRY AGAIN";
}

// Input
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mousedown', () => { if (player) player.isBoosting = true; });
window.addEventListener('mouseup', () => { if (player) player.isBoosting = false; });

startBtn.addEventListener('click', startGame);
window.addEventListener('resize', resize);

// Mobile touch handling
canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
    if (player) player.isBoosting = true;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
    e.preventDefault(); // Prevent scrolling while playing
}, { passive: false });

canvas.addEventListener('touchend', () => {
    if (player) player.isBoosting = false;
});

// Initialization
minimap.width = MINIMAP_SIZE;
minimap.height = MINIMAP_SIZE;
resize();
