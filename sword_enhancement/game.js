const goldEl = document.getElementById('gold-amount');
const swordIcon = document.getElementById('sword-icon');
const swordName = document.getElementById('sword-name');
const swordLevel = document.getElementById('sword-level');
const swordGlow = document.getElementById('sword-glow');
const successRateEl = document.getElementById('success-rate');
const sellPriceEl = document.getElementById('sell-price');
const logList = document.getElementById('log-list');

const enhanceBtn = document.getElementById('enhance-btn');
const enhanceCostEl = document.getElementById('enhance-cost');
const buyBtn = document.getElementById('buy-btn');
const sellBtn = document.getElementById('sell-btn');
const restartBtn = document.getElementById('restart-btn');
const overlay = document.getElementById('overlay');

// Game State
let gold = 5000; // Increased starting gold
let currentSword = null; // { level: 0, name: 'Twig' }
let isEnhancing = false;
const audio = new GameAudio();

const SWORD_DATA = [
    { level: 0, icon: '🎋', name: 'Twig' },
    { level: 3, icon: '🪵', name: 'Wooden Sword' },
    { level: 6, icon: '🗡️', name: 'Dagger' },
    { level: 9, icon: '⚔️', name: 'Iron Sword' },
    { level: 12, icon: '🤺', name: 'Knight Sword' },
    { level: 15, icon: '🔱', name: 'Greatsword' },
    { level: 18, icon: '🔮', name: 'Magic Blade' },
    { level: 20, icon: '💎', name: 'Godly Blade' }
];

function getSwordInfo(level) {
    let best = SWORD_DATA[0];
    for (let data of SWORD_DATA) {
        if (level >= data.level) best = data;
    }
    return best;
}

function updateUI() {
    goldEl.innerText = gold.toLocaleString();

    if (currentSword) {
        const info = getSwordInfo(currentSword.level);
        swordIcon.innerText = info.icon;
        swordName.innerText = info.name;
        swordLevel.innerText = `+${currentSword.level}`;

        // Show Glow based on level
        if (currentSword.level >= 10) {
            swordGlow.style.opacity = (currentSword.level - 9) / 11;
            const hue = (currentSword.level * 15) % 360;
            swordGlow.style.background = `hsl(${hue}, 80%, 60%)`;
            swordIcon.style.filter = `drop-shadow(0 0 ${currentSword.level}px hsl(${hue}, 80%, 60%))`;
        } else {
            swordGlow.style.opacity = 0;
            swordIcon.style.filter = 'none';
        }

        const successProb = getSuccessRate(currentSword.level);
        successRateEl.innerText = `${Math.round(successProb * 100)}%`;

        const nextCost = getEnhanceCost(currentSword.level);
        enhanceCostEl.innerText = `(${nextCost.toLocaleString()}G)`;

        const sellPrice = getSellPrice(currentSword.level);
        sellPriceEl.innerText = `${sellPrice.toLocaleString()}G`;

        enhanceBtn.classList.remove('disabled');
        sellBtn.classList.remove('disabled');
        buyBtn.classList.add('disabled');

        if (currentSword.level >= 20) {
            enhanceBtn.classList.add('disabled');
            enhanceCostEl.innerText = '(MAX)';
            successRateEl.innerText = 'MAX';
        }
    } else {
        swordIcon.innerText = '💨';
        swordName.innerText = 'No Equipment';
        swordLevel.innerText = '';
        swordGlow.style.opacity = 0;
        successRateEl.innerText = '-%';
        sellPriceEl.innerText = '0G';
        enhanceBtn.classList.add('disabled');
        enhanceCostEl.innerText = '';
        sellBtn.classList.add('disabled');
        buyBtn.classList.remove('disabled');
    }

    // Check afford buy
    if (gold < 100 && !currentSword) {
        checkGameOver();
    }
}

function getSuccessRate(level) {
    // 100% -> 10% decay
    if (level < 3) return 1.0;
    if (level < 7) return 0.8;
    if (level < 12) return 0.5;
    if (level < 16) return 0.3;
    if (level < 19) return 0.15;
    return 0.1; // 10% for the last push
}

function getEnhanceCost(level) {
    return Math.floor(100 * Math.pow(1.5, level));
}

function getSellPrice(level) {
    if (level === 0) return 50;
    // Base 100, but profit kicks in after risks
    return Math.floor(100 * Math.pow(1.8, level));
}

function addLog(msg, type = 'system') {
    const p = document.createElement('p');
    p.className = type;
    p.innerText = msg;
    logList.prepend(p);
    if (logList.children.length > 30) logList.lastChild.remove();
}

function enhance() {
    if (!currentSword || isEnhancing || currentSword.level >= 20) return;

    const cost = getEnhanceCost(currentSword.level);
    if (gold < cost) {
        addLog("Not enough gold!", "fail");
        return;
    }

    gold -= cost;
    isEnhancing = true;
    enhanceBtn.classList.add('disabled');
    audio.enhance();

    // Animation
    swordIcon.classList.add('shaking');
    addLog(`Enhancing... (-${cost}G)`);

    setTimeout(() => {
        swordIcon.classList.remove('shaking');
        isEnhancing = false;

        const rate = getSuccessRate(currentSword.level);
        if (Math.random() < rate) {
            // Success
            currentSword.level++;
            addLog(`[Success] Sword is now +${currentSword.level}!`, "success");
            audio.success();
        } else {
            // Failure
            if (Math.random() < 0.7) { // 70% Destruction
                addLog(`[FAIL] The sword was destroyed!`, "fail");
                currentSword = null;
                audio.destroy();
            } else { // 30% Protection
                addLog(`[FAIL] Enhancement failed, but the item was saved.`, "system");
                audio.fail();
            }
        }
        updateUI();
    }, 800);
}

function buyTwig() {
    if (currentSword || gold < 100) return;
    gold -= 100;
    currentSword = { level: 0 };
    addLog("Bought a new +0 Twig.");
    audio.money();
    updateUI();
}

function sellSword() {
    if (!currentSword || isEnhancing) return;
    const price = getSellPrice(currentSword.level);
    gold += price;
    addLog(`Sold +${currentSword.level} for ${price}G!`, "success");
    currentSword = null;
    audio.money();
    updateUI();
}

function checkGameOver() {
    if (gold < 100 && !currentSword) {
        overlay.classList.remove('hidden');
    }
}

function restart() {
    gold = 5000;
    currentSword = null;
    logList.innerHTML = '<p class="system">Buy a +0 Twig to start!</p>';
    overlay.classList.add('hidden');
    updateUI();
}

// Events
enhanceBtn.addEventListener('click', enhance);
buyBtn.addEventListener('click', buyTwig);
sellBtn.addEventListener('click', sellSword);
restartBtn.addEventListener('click', restart);

updateUI();
