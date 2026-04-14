const STORAGE_KEY = "token-burner-3000-save-v1";
const SPIN_COST = 10;
const BONUS_AMOUNT = 25;
const BONUS_COOLDOWN_MS = 60 * 1000;
const FEED_LIMIT = 8;

const SYMBOLS = [
  { id: "robot", icon: "🤖", name: "AI Clone", weight: 18, triple: 2 },
  { id: "coin", icon: "🪙", name: "Token", weight: 16, triple: 18 },
  { id: "human", icon: "🧠", name: "Human Brain", weight: 16, triple: 14 },
  { id: "bug", icon: "🐛", name: "Regression Bug", weight: 14, triple: 1 },
  { id: "captcha", icon: "✅", name: "Captcha", weight: 13, triple: 20 },
  { id: "invoice", icon: "🧾", name: "Prompt Invoice", weight: 12, triple: 6 },
  { id: "fire", icon: "🔥", name: "GPU Fire", weight: 11, triple: 4 },
];

const TWO_MATCH_MESSAGES = [
  'Two models agreed. QA still said "needs human review," but you get paid.',
  "Consensus achieved: confidently average output. Partial payout granted.",
  "Two reels aligned like duplicated Stack Overflow answers. Works for now.",
  "The AI almost shipped production-ready code. Almost counts.",
];

const LOSS_MESSAGES = [
  "The model invented facts and burned your budget.",
  "Hallucination complete. Tokens converted into hot GPU air.",
  "AI wrote twelve paragraphs, answered zero questions. No payout.",
  "Great confidence, low accuracy, classic token sink.",
];

const TRIPLE_MESSAGES = {
  robot: "Three bots in sync. Still wrong, but they tipped you anyway.",
  coin: "Token meteor shower. Finance reluctantly approves.",
  human: "Human brains aligned. The algorithm paid reparations.",
  bug: "Three bugs in production. Incident budget becomes your prize.",
  captcha: "You proved you're human repeatedly. Robot tax collected.",
  invoice: 'Triple invoices. Accounting calls it "creative revenue."',
  fire: "The GPUs overheated and insurance finally paid out.",
};

const reels = Array.from(document.querySelectorAll(".reel"));
const tokensValueEl = document.getElementById("tokensValue");
const spentValueEl = document.getElementById("spentValue");
const wonValueEl = document.getElementById("wonValue");
const spinsValueEl = document.getElementById("spinsValue");
const statusEl = document.getElementById("status");
const spinBtn = document.getElementById("spinBtn");
const bonusBtn = document.getElementById("bonusBtn");
const resetBtn = document.getElementById("resetBtn");
const feedEl = document.getElementById("feed");

let state = loadState();
let spinning = false;
let bonusTickerId = null;
let audioContext = null;

function defaultState() {
  return {
    tokens: 120,
    totalSpent: 0,
    totalWon: 0,
    totalSpins: 0,
    lastBonusAt: 0,
    feed: [],
  };
}

function loadState() {
  const fallback = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return {
      tokens: safeNumber(parsed.tokens, fallback.tokens),
      totalSpent: safeNumber(parsed.totalSpent, fallback.totalSpent),
      totalWon: safeNumber(parsed.totalWon, fallback.totalWon),
      totalSpins: safeNumber(parsed.totalSpins, fallback.totalSpins),
      lastBonusAt: safeNumber(parsed.lastBonusAt, fallback.lastBonusAt),
      feed: Array.isArray(parsed.feed) ? parsed.feed.slice(0, FEED_LIMIT) : [],
    };
  } catch (_error) {
    return fallback;
  }
}

function safeNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatTokens(value) {
  return value.toLocaleString("en-US");
}

function setStatus(text, tone = "info") {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function addFeed(message, tone = "info") {
  state.feed.unshift({
    stamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    message,
    tone,
  });
  state.feed = state.feed.slice(0, FEED_LIMIT);
  renderFeed();
  saveState();
}

function renderFeed() {
  feedEl.innerHTML = "";
  if (!state.feed.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "feed-item";
    emptyItem.textContent = "No incidents yet. Press spin to start burning tokens.";
    feedEl.append(emptyItem);
    return;
  }

  for (const entry of state.feed) {
    const li = document.createElement("li");
    li.className = `feed-item ${entry.tone}`;
    li.innerHTML = `<span class="stamp">${entry.stamp}</span>${entry.message}`;
    feedEl.append(li);
  }
}

function updateStats() {
  tokensValueEl.textContent = formatTokens(state.tokens);
  spentValueEl.textContent = formatTokens(state.totalSpent);
  wonValueEl.textContent = formatTokens(state.totalWon);
  spinsValueEl.textContent = `Spins: ${formatTokens(state.totalSpins)}`;

  spinBtn.disabled = spinning || state.tokens < SPIN_COST;
  if (!spinning && state.tokens < SPIN_COST) {
    setStatus("You are out of tokens. Claim a human bonus or reset the run.", "loss");
  }
}

function pickSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let target = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    target -= symbol.weight;
    if (target <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[0];
}

function setReelSymbol(reelEl, symbol) {
  const symbolEl = reelEl.querySelector(".symbol");
  const labelEl = reelEl.querySelector(".label");
  symbolEl.textContent = symbol.icon;
  labelEl.textContent = symbol.name;
  reelEl.dataset.symbol = symbol.id;
}

function preloadReels() {
  for (const reel of reels) {
    setReelSymbol(reel, pickSymbol());
  }
}

function initAudioContext() {
  if (audioContext) {
    return;
  }

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (_error) {
    audioContext = null;
  }
}

function playTone(freq, duration, type, gainAmount) {
  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = freq;
  gain.gain.value = gainAmount;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function playSpinTick() {
  playTone(260, 0.05, "square", 0.02);
}

function playWinSound() {
  [523, 659, 784].forEach((freq, index) => {
    setTimeout(() => playTone(freq, 0.11, "triangle", 0.045), index * 95);
  });
}

function playLossSound() {
  [220, 170].forEach((freq, index) => {
    setTimeout(() => playTone(freq, 0.1, "sawtooth", 0.025), index * 80);
  });
}

function buzz(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function evaluateReels(resultSymbols) {
  const ids = resultSymbols.map((symbol) => symbol.id);
  const counts = ids.reduce((map, id) => {
    map[id] = (map[id] || 0) + 1;
    return map;
  }, {});
  const topCount = Math.max(...Object.values(counts));
  const sortedCombo = [...ids].sort().join("|");

  if (topCount === 3) {
    const symbol = resultSymbols[0];
    const payout = SPIN_COST * symbol.triple;
    const message = TRIPLE_MESSAGES[symbol.id];
    return { payout, tone: "win", message };
  }

  if (sortedCombo === "captcha|coin|human") {
    return {
      payout: SPIN_COST * 12,
      tone: "win",
      message: "Human + Captcha + Token combo. The anti-bot union funds your victory.",
    };
  }

  if (topCount === 2) {
    return {
      payout: SPIN_COST * 3,
      tone: "win",
      message: randomChoice(TWO_MATCH_MESSAGES),
    };
  }

  return {
    payout: 0,
    tone: "loss",
    message: randomChoice(LOSS_MESSAGES),
  };
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

async function spinReels() {
  const finalSymbols = new Array(reels.length);

  const stopPromises = reels.map((reel, index) => {
    return new Promise((resolve) => {
      reel.classList.add("spinning");
      const tickId = window.setInterval(() => {
        setReelSymbol(reel, pickSymbol());
      }, 85 - index * 8);

      const stopDelay = 920 + index * 280;
      window.setTimeout(() => {
        window.clearInterval(tickId);
        const finalSymbol = pickSymbol();
        finalSymbols[index] = finalSymbol;
        setReelSymbol(reel, finalSymbol);
        reel.classList.remove("spinning");
        playSpinTick();
        resolve();
      }, stopDelay);
    });
  });

  await Promise.all(stopPromises);
  return finalSymbols;
}

async function handleSpin() {
  if (spinning) {
    return;
  }

  if (state.tokens < SPIN_COST) {
    setStatus("Not enough tokens. AI still accepts your money, but physics does not.", "loss");
    return;
  }

  initAudioContext();
  if (audioContext && audioContext.state === "suspended") {
    await audioContext.resume();
  }

  spinning = true;
  state.tokens -= SPIN_COST;
  state.totalSpent += SPIN_COST;
  state.totalSpins += 1;
  saveState();
  updateStats();
  setStatus(`You spent ${SPIN_COST} tokens to ask AI if it read the docs.`, "info");

  const resultSymbols = await spinReels();
  const result = evaluateReels(resultSymbols);
  const renderedSymbols = resultSymbols.map((symbol) => symbol.icon).join(" ");

  if (result.payout > 0) {
    state.tokens += result.payout;
    state.totalWon += result.payout;
    playWinSound();
    buzz([70, 40, 120]);
  } else {
    playLossSound();
    buzz(35);
  }

  const payoutSuffix = result.payout ? ` You won ${result.payout} tokens.` : "";
  const finalMessage = `${renderedSymbols} ${result.message}${payoutSuffix}`;
  setStatus(finalMessage, result.tone);
  addFeed(finalMessage, result.tone);

  spinning = false;
  saveState();
  updateStats();
}

function formatRemainingTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function updateBonusButton() {
  const elapsed = Date.now() - state.lastBonusAt;
  const remaining = BONUS_COOLDOWN_MS - elapsed;

  if (remaining <= 0) {
    bonusBtn.disabled = false;
    bonusBtn.textContent = `Claim Human Bonus (+${BONUS_AMOUNT})`;
    return;
  }

  bonusBtn.disabled = true;
  bonusBtn.textContent = `Human Bonus in ${formatRemainingTime(remaining)}`;
}

function handleBonusClaim() {
  const elapsed = Date.now() - state.lastBonusAt;
  if (elapsed < BONUS_COOLDOWN_MS) {
    const remaining = BONUS_COOLDOWN_MS - elapsed;
    setStatus(`Bonus cooling down. Wait ${formatRemainingTime(remaining)}.`, "info");
    return;
  }

  initAudioContext();
  state.lastBonusAt = Date.now();
  state.tokens += BONUS_AMOUNT;
  state.totalWon += BONUS_AMOUNT;
  saveState();
  updateStats();
  updateBonusButton();
  playWinSound();
  buzz([40, 20, 60]);

  const message = `Human intervention grant received: +${BONUS_AMOUNT} tokens.`;
  setStatus(message, "win");
  addFeed(message, "win");
}

function handleReset() {
  const shouldReset = window.confirm("Reset tokens, totals, and audit log?");
  if (!shouldReset) {
    return;
  }

  state = defaultState();
  saveState();
  preloadReels();
  renderFeed();
  updateStats();
  updateBonusButton();
  setStatus("Fresh run started. AI confidence restored to dangerous levels.", "info");
  addFeed("Run reset by human operator.", "info");
}

function init() {
  preloadReels();
  renderFeed();
  updateStats();
  updateBonusButton();

  if (!state.feed.length) {
    addFeed("Machine booted. AI confidence set to 1000%.", "info");
  }

  spinBtn.addEventListener("click", handleSpin);
  bonusBtn.addEventListener("click", handleBonusClaim);
  resetBtn.addEventListener("click", handleReset);

  bonusTickerId = window.setInterval(updateBonusButton, 1000);
  window.addEventListener("beforeunload", () => {
    if (bonusTickerId) {
      window.clearInterval(bonusTickerId);
    }
  });
}

init();
