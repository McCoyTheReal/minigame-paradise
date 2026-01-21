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
let SEGMENT_DISTANCE = 10;
let BASE_SPEED = 120; // Pixels per second
let BOOST_SPEED = 240;
let GLOBAL_SCALE = 1;

// State
let isPlaying = false;
let camera = { x: 0, y: 0 };
let mouse = { x: 0, y: 0 };
let foods = [];
let snakes = [];
let player = null;
let lastTime = 0;
let audio = new GameAudio();

// Mobile Control Elements
const joystickContainer = document.getElementById('joystick-container');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const boostBtn = document.getElementById('boost-btn');

let joystickData = { active: false, x: 0, y: 0, angle: 0 };

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

    update(deltaTime) {
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
            let targetAngle;
            if (joystickData.active) {
                targetAngle = joystickData.angle;
            } else {
                targetAngle = Math.atan2(mouse.y - window.innerHeight / 2, mouse.x - window.innerWidth / 2);
            }

            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            this.angle += diff * 0.07 * (60 * deltaTime / 1000);
        } else {
            // AI simple wandering/food targeting
            this.updateAI(deltaTime);
        }

        // Move head (frame rate independent)
        const moveDist = this.speed * (deltaTime / 1000);
        this.x += Math.cos(this.angle) * moveDist;
        this.y += Math.sin(this.angle) * moveDist;

        // Boundary check
        this.x = Math.max(0, Math.min(this.x, WORLD_SIZE));
        this.y = Math.max(0, Math.min(this.y, WORLD_SIZE));

        // Path buffer for trailing
        this.path.unshift({ x: this.x, y: this.y });
        if (this.path.length > this.segments.length * 20) {
            this.path.pop();
        }

        // Update segments positions
        const step = SEGMENT_DISTANCE / (this.speed / 60);
        for (let i = 0; i < this.segments.length; i++) {
            const index = Math.floor(i * step);
            if (this.path[index]) {
                this.segments[i].x = this.path[index].x;
                this.segments[i].y = this.path[index].y;
            }
        }
    }

    updateAI(deltaTime) {
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
            this.angle += diff * 0.05 * (60 * deltaTime / 1000);
        }
    }

    draw() {
        if (this.isDead) return;

        const baseWidth = 15 * GLOBAL_SCALE;
        ctx.lineWidth = baseWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.color;

        // Draw segments as glowing lines
        ctx.shadowBlur = 10 * GLOBAL_SCALE;
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
        const eyeSize = 4 * GLOBAL_SCALE;
        const eyeOffset = 6 * GLOBAL_SCALE;
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
        ctx.font = `${10 * GLOBAL_SCALE}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(this.name, head.x - camera.x, head.y - camera.y - (20 * GLOBAL_SCALE));
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

    // Calculate global scale (Standard is 1920x1080)
    // On mobile, we want things to be slightly larger relative to screen
    const baseDimension = Math.min(window.innerWidth, window.innerHeight);
    if (window.innerWidth < 600) {
        GLOBAL_SCALE = Math.max(0.8, baseDimension / 400);
    } else {
        GLOBAL_SCALE = Math.max(1, window.innerWidth / 1920);
    }

    SEGMENT_DISTANCE = 10 * GLOBAL_SCALE;
    BASE_SPEED = 120 * GLOBAL_SCALE;
    BOOST_SPEED = 240 * GLOBAL_SCALE;
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

    // Show/Hide mobile controls based on touch support
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
        joystickContainer.classList.remove('hidden');
        boostBtn.classList.remove('hidden');
    }

    // Create AI bots
    const names = ["BotMaster", "Slither", "Neon", "FastOne", "Ghost", "Hungry", "Shadow"];
    const colors = ["#00f2ff", "#ff00ff", "#f1c40f", "#e74c3c", "#9b59b6", "#1abc9c"];
    for (let i = 0; i < 10; i++) {
        snakes.push(new Snake(i, names[i % names.length], colors[i % colors.length]));
    }
}

function update(time = 0) {
    if (!isPlaying) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    // Boundary limit for camera
    camera.x = Math.max(0, Math.min(camera.x, WORLD_SIZE - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, WORLD_SIZE - canvas.height));

    snakes.forEach(snake => {
        if (snake.isDead) return;
        snake.update(deltaTime);

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

    // Follow player with camera (use deltaTime)
    camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1 * (60 * deltaTime / 1000);
    camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1 * (60 * deltaTime / 1000);

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
        ctx.shadowBlur = 5 * GLOBAL_SCALE;
        ctx.shadowColor = food.color;
        ctx.beginPath();
        ctx.arc(food.x - camera.x, food.y - camera.y, food.size * GLOBAL_SCALE, 0, Math.PI * 2);
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
    lastTime = performance.now(); // Initialize lastTime here
    update(lastTime);
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

// Joystick Logic
function handleJoystick(e) {
    if (!joystickData.active) return;

    const touch = Array.from(e.touches).find(t => t.target.closest('#joystick-container'));
    if (!touch) return;

    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;

    if (dist > maxDist) {
        dx *= maxDist / dist;
        dy *= maxDist / dist;
    }

    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joystickData.angle = Math.atan2(dy, dx);
}

// Global Touch Listeners
window.addEventListener('touchstart', (e) => {
    // Check for joystick
    if (e.target.closest('#joystick-container')) {
        joystickData.active = true;
        handleJoystick(e);
    }

    // Check for boost button
    if (e.target.closest('#boost-btn')) {
        if (player) player.isBoosting = true;
        boostBtn.style.transform = 'scale(0.9)';
    }

    // Traditional touch-anywhere fallback (optional, but good for UI)
    if (!joystickData.active && !e.target.closest('#boost-btn') && !e.target.closest('button')) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (joystickData.active) {
        handleJoystick(e);
    }

    if (!joystickData.active && !isPlaying && e.target.closest('.overlay')) {
        // Allow scrolling in overlay if not active
    } else {
        if (isPlaying) e.preventDefault();
    }

    if (!joystickData.active && !e.target.closest('#boost-btn')) {
        if (e.touches && e.touches[0]) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    if (joystickData.active) {
        const touch = Array.from(e.touches).find(t => t.target.closest('#joystick-container'));
        if (!touch) {
            joystickData.active = false;
            joystickKnob.style.transform = `translate(0px, 0px)`;
        }
    }

    // Check for boost button end
    // Since touchend doesn't have target easily, we check if player.isBoosting was true
    if (player && player.isBoosting) {
        // Simple logic: if no touches are on the boost btn anymore
        const boostTouch = Array.from(e.touches).find(t => t.target.closest('#boost-btn'));
        if (!boostTouch) {
            player.isBoosting = false;
            boostBtn.style.transform = 'scale(1)';
        }
    }
});

// Initialization
minimap.width = MINIMAP_SIZE;
minimap.height = MINIMAP_SIZE;
resize();
