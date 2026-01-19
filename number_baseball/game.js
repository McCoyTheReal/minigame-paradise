const guessInput = document.getElementById('guess-input');
const historyList = document.getElementById('history-list');
const messageBoard = document.getElementById('game-message');
const currentInningEl = document.getElementById('current-inning');
const overlayHelp = document.getElementById('help-overlay');
const overlayEnd = document.getElementById('end-overlay');
const endTitle = document.getElementById('end-title');
const endAnswer = document.getElementById('end-answer');

// Buttons
document.getElementById('help-btn').addEventListener('click', () => overlayHelp.classList.remove('hidden'));
document.getElementById('close-help-btn').addEventListener('click', () => overlayHelp.classList.add('hidden'));
document.getElementById('restart-btn').addEventListener('click', initGame);

// Audio
const audio = new GameAudio();

// State
let secret = [];
let inning = 1;
let maxInnings = 9;
let isGameOver = false;
let currentGuess = "";

function initGame() {
    secret = generateSecret();
    inning = 1;
    isGameOver = false;
    currentGuess = "";

    // UI Reset
    guessInput.value = "";
    historyList.innerHTML = "";
    currentInningEl.innerText = inning;
    messageBoard.innerText = "PLAY BALL!";
    messageBoard.style.color = "var(--led-green)";
    overlayEnd.classList.add('hidden');

    console.log("Secret (Cheating?):", secret.join(''));
}

function generateSecret() {
    const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const result = [];

    // First digit cannot be 0? Usually allowed in num baseball unless specified. 
    // User said "3 digit number", usually implies 100-999, but in this game 012 is often valid. 
    // Let's allow 0 at start to make it full 0-9.

    for (let i = 0; i < 3; i++) {
        const index = Math.floor(Math.random() * nums.length);
        result.push(nums[index]);
        nums.splice(index, 1); // Remove to avoid using same number twice
    }
    return result;
}

// Keypad Support
document.querySelectorAll('.key').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (isGameOver) return;

        const val = btn.innerText;

        if (val === 'C') {
            currentGuess = "";
            audio.playInput();
        } else if (val === '↵') {
            submitGuess();
        } else {
            if (currentGuess.length < 3) {
                if (!currentGuess.includes(val)) {
                    currentGuess += val;
                    audio.playInput();
                } else {
                    // Prevent duplicate inputs in guess
                    // audio.playError(); // Maybe subtle shake?
                }
            }
        }
        updateInputDisplay();
    });
});

function updateInputDisplay() {
    guessInput.value = currentGuess;
}

function submitGuess() {
    if (currentGuess.length !== 3) {
        showMessage("Enter 3 Digits!");
        return;
    }

    const guessArr = currentGuess.split('').map(Number);
    const result = checkGuess(guessArr);

    // Log History
    addHistory(currentGuess, result);

    // Audio Feedback
    if (result.strikes === 3) {
        audio.playWin();
        gameOver(true);
    } else if (result.strikes === 0 && result.balls === 0) {
        audio.playOut();
        showMessage("OUT!");
        nextInning();
    } else {
        // Mix sound?
        if (result.strikes > 0) audio.playStrike();
        else audio.playBall();

        showMessage(`${result.strikes}S ${result.balls}B`);
        nextInning();
    }

    currentGuess = "";
    updateInputDisplay();
}

function checkGuess(guessArr) {
    let strikes = 0;
    let balls = 0;

    for (let i = 0; i < 3; i++) {
        if (guessArr[i] === secret[i]) {
            strikes++;
        } else if (secret.includes(guessArr[i])) {
            balls++;
        }
    }
    return { strikes, balls };
}

function addHistory(guess, result) {
    const item = document.createElement('div');
    item.className = 'history-item';

    // Determine Out
    const isOut = result.strikes === 0 && result.balls === 0;

    // Create LED HTML
    // Strike LEDs (up to 3 slots?) usually history just shows count. 
    // User asked for "lights turning on". 
    // Let's make 3 dots for S, 3 dots for B, 1 dot for O.
    // Fill them based on count.

    const getLeds = (count, max, cls) => {
        let html = '';
        for (let i = 0; i < max; i++) {
            const on = i < count ? 'on' : '';
            html += `<span class="${cls} ${on}"></span>`;
        }
        return html;
    };

    const sLeds = getLeds(result.strikes, 3, 's');
    const bLeds = getLeds(result.balls, 3, 'b'); // Max 3 balls visible usually sufficient
    const oLed = `<span class="o ${isOut ? 'on' : ''}"></span>`;

    item.innerHTML = `
        <span>${guess}</span>
        <div style="display:flex; gap:2px; justify-content:center;">${sLeds}</div>
        <div style="display:flex; gap:2px; justify-content:center;">${bLeds}</div>
        <div style="display:flex; justify-content:center;">${oLed}</div>
    `;

    historyList.prepend(item);
}

function showMessage(msg) {
    messageBoard.innerText = msg;
    // Animation effect could go here
}

function nextInning() {
    inning++;
    if (inning > maxInnings) {
        gameOver(false);
    } else {
        currentInningEl.innerText = inning;
    }
}

function gameOver(win) {
    isGameOver = true;
    setTimeout(() => {
        overlayEnd.classList.remove('hidden');
        if (win) {
            endTitle.innerText = "HOME RUN!";
            endTitle.style.color = "var(--led-green)";
            endAnswer.innerText = `You found ${secret.join('')} in ${inning} innings!`;
        } else {
            audio.playLose();
            endTitle.innerText = "GAME OVER";
            endTitle.style.color = "var(--led-red)";
            endAnswer.innerText = `Correct Answer: ${secret.join('')}`;
        }
    }, 1000);
}

// Keyboard Support
window.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    const key = e.key;
    if (key >= '0' && key <= '9') {
        if (currentGuess.length < 3 && !currentGuess.includes(key)) {
            currentGuess += key;
            audio.playInput();
            updateInputDisplay();
        }
    } else if (key === 'Backspace') {
        currentGuess = currentGuess.slice(0, -1);
        audio.playInput();
        updateInputDisplay();
    } else if (key === 'Enter') {
        submitGuess();
    }
});

// Start
initGame();
