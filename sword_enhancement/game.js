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

// Shop & Items
let protectionScrolls = 0;
let luckyCharms = 0;
let isAuto = false;

// Elements
const autoBtn = document.getElementById('auto-btn');
const scrollCountEl = document.getElementById('scroll-count');
const charmCountEl = document.getElementById('charm-count');
const buyScrollBtn = document.getElementById('buy-scroll-btn');
const buyCharmBtn = document.getElementById('buy-charm-btn');

function updateUI() {
    goldEl.innerText = gold.toLocaleString();
    scrollCountEl.innerText = protectionScrolls;
    charmCountEl.innerText = luckyCharms;

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

        let successProb = getSuccessRate(currentSword.level);
        // Visual indicator for Lucky Charm
        if (luckyCharms > 0) {
            successProb = Math.min(1.0, successProb + 0.1);
            successRateEl.innerHTML = `${Math.round(successProb * 100)}% <span style="color:#f1c40f; font-size:12px;">(+10%)</span>`;
        } else {
            successRateEl.innerText = `${Math.round(successProb * 100)}%`;
        }

        const nextCost = getEnhanceCost(currentSword.level);
        enhanceCostEl.innerText = `(${nextCost.toLocaleString()}G)`;

        const sellPrice = getSellPrice(currentSword.level);
        sellPriceEl.innerText = `${sellPrice.toLocaleString()}G`;

        enhanceBtn.classList.remove('disabled');
        autoBtn.classList.remove('disabled');
        sellBtn.classList.remove('disabled');
        buyBtn.classList.add('disabled');

        if (currentSword.level >= 20) {
            enhanceBtn.classList.add('disabled');
            autoBtn.classList.add('disabled');
            stopAuto();
            enhanceCostEl.innerText = '(MAX)';
            successRateEl.innerText = 'MAX';
        }
    } else {
        stopAuto();
        swordIcon.innerText = '💨';
        swordName.innerText = 'No Equipment';
        swordLevel.innerText = '';
        swordGlow.style.opacity = 0;
        successRateEl.innerText = '-%';
        sellPriceEl.innerText = '0G';
        enhanceBtn.classList.add('disabled');
        autoBtn.classList.add('disabled');
        enhanceCostEl.innerText = '';
        sellBtn.classList.add('disabled');
        buyBtn.classList.remove('disabled');
    }

    // Shop Buttons
    if (gold < 10000) buyScrollBtn.classList.add('disabled');
    else buyScrollBtn.classList.remove('disabled');

    if (gold < 5000) buyCharmBtn.classList.add('disabled');
    else buyCharmBtn.classList.remove('disabled');

    // Check afford buy
    if (gold < 100 && !currentSword) {
        checkGameOver();
    }
}

function enhance() {
    if (!currentSword || isEnhancing || currentSword.level >= 20) return;

    const cost = getEnhanceCost(currentSword.level);
    if (gold < cost) {
        addLog("Not enough gold!", "fail");
        stopAuto();
        return;
    }

    gold -= cost;
    isEnhancing = true;
    enhanceBtn.classList.add('disabled');
    audio.enhance();

    // Consume Charm if available
    let usedCharm = false;
    if (luckyCharms > 0) {
        luckyCharms--;
        usedCharm = true;
    }

    // Animation
    swordIcon.classList.add('shaking');
    addLog(`Enhancing... (-${cost}G)${usedCharm ? ' [Charm Used]' : ''}`);

    setTimeout(() => {
        swordIcon.classList.remove('shaking');
        isEnhancing = false;

        let rate = getSuccessRate(currentSword.level);
        if (usedCharm) rate += 0.1;

        if (Math.random() < rate) {
            // Success
            currentSword.level++;
            addLog(`[Success] Sword is now +${currentSword.level}!`, "success");
            audio.success();
        } else {
            // Failure
            let destroyed = false;
            if (Math.random() < 0.7) destroyed = true; // 70% Destruction chance

            // Check Protection Scroll
            if (destroyed && protectionScrolls > 0) {
                protectionScrolls--;
                destroyed = false;
                addLog(`[DEFEND] Scroll prevented destruction!`, "success");
                audio.success(); // Re-use distinct sound if possible
            }

            if (destroyed) {
                addLog(`[FAIL] The sword was destroyed!`, "fail");
                currentSword = null;
                stopAuto();
                audio.destroy();
            } else {
                addLog(`[FAIL] Enhancement failed.`, "system");
                audio.fail();
            }
        }
        updateUI();
        if (isAuto) {
            setTimeout(enhance, 200);
        }
    }, 800); // 0.8s Enhancement time
}

function toggleAuto() {
    if (isAuto) {
        stopAuto();
    } else {
        if (!currentSword) return;
        isAuto = true;
        autoBtn.classList.add('active');
        autoBtn.innerText = "STOP";
        enhance();
    }
}

function stopAuto() {
    isAuto = false;
    autoBtn.classList.remove('active');
    autoBtn.innerText = "AUTO";
}

function buyItem(type) {
    if (type === 'scroll') {
        if (gold >= 10000) {
            gold -= 10000;
            protectionScrolls++;
            addLog("Bought Protection Scroll!");
        }
    } else if (type === 'charm') {
        if (gold >= 5000) {
            gold -= 5000;
            luckyCharms++;
            addLog("Bought Lucky Charm!");
        }
    }
    audio.money();
    updateUI();
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
    stopAuto();
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
    protectionScrolls = 0;
    luckyCharms = 0;
    stopAuto();
    logList.innerHTML = '<p class="system">Buy a +0 Twig to start!</p>';
    overlay.classList.add('hidden');
    updateUI();
}

// Events
enhanceBtn.addEventListener('click', enhance);
autoBtn.addEventListener('click', toggleAuto);
buyScrollBtn.addEventListener('click', () => buyItem('scroll'));
buyCharmBtn.addEventListener('click', () => buyItem('charm'));
buyBtn.addEventListener('click', buyTwig);
sellBtn.addEventListener('click', sellSword);
restartBtn.addEventListener('click', restart);

updateUI();

