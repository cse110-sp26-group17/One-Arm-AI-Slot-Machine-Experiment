const symbols = [
  {
    icon: "🤖",
    name: "Overconfident Bot",
    weight: 24,
    pairMultiplier: 2,
    tripleMultiplier: 6,
  },
  {
    icon: "🧠",
    name: "Prompt Wizard",
    weight: 20,
    pairMultiplier: 2.5,
    tripleMultiplier: 8,
  },
  {
    icon: "🪙",
    name: "Hype Token",
    weight: 16,
    pairMultiplier: 3,
    tripleMultiplier: 11,
  },
  {
    icon: "🐑",
    name: "Benchmark Sheep",
    weight: 18,
    pairMultiplier: 2,
    tripleMultiplier: 7,
  },
  {
    icon: "📉",
    name: "Burn-Rate Chart",
    weight: 14,
    pairMultiplier: 1.5,
    tripleMultiplier: 5,
  },
  {
    icon: "🧯",
    name: "Safety Pager",
    weight: 8,
    pairMultiplier: 4,
    tripleMultiplier: 16,
  },
];

const roastWin = [
  "The AI guessed confidently and accidentally got it right.",
  "A 300-page prompt worked. The energy bill is your next boss fight.",
  "Your startup pitch was pure buzzword soup. Investors loved it.",
  "Model alignment complete: it aligns with your wallet.",
];

const roastLose = [
  "The model said 'trust me bro' and charged inference fees.",
  "Hallucination tax collected. Thank you for your sacrifice.",
  "The AI wrote 12 paragraphs and answered the wrong question.",
  "You paid tokens to autocomplete optimism.",
  "GPU smoke detected. No payout, only vibes.",
];

const reels = Array.from(document.querySelectorAll(".reel"));
const balanceEl = document.getElementById("balance");
const spinsEl = document.getElementById("spins");
const biggestWinEl = document.getElementById("biggestWin");
const resultTextEl = document.getElementById("resultText");
const betRangeEl = document.getElementById("betRange");
const betTextEl = document.getElementById("betText");
const minusBetEl = document.getElementById("minusBet");
const plusBetEl = document.getElementById("plusBet");
const spinBtnEl = document.getElementById("spinBtn");
const autoSpinEl = document.getElementById("autoSpin");
const dailyBonusEl = document.getElementById("dailyBonus");
const payoutListEl = document.getElementById("payoutList");

const saveKey = "ai-token-grinder-v1";

const state = {
  balance: 120,
  spins: 0,
  biggestWin: 0,
  bet: 5,
  isSpinning: false,
  lastDailyBonus: "",
};

let audioCtx;

init();

function init() {
  loadState();
  renderPayoutTable();
  updateBetLimits();
  syncUI();
  updateDailyBonusAvailability();

  betRangeEl.addEventListener("input", () => {
    state.bet = Number(betRangeEl.value);
    syncUI();
  });

  minusBetEl.addEventListener("click", () => {
    state.bet = Math.max(1, state.bet - 1);
    syncUI();
  });

  plusBetEl.addEventListener("click", () => {
    state.bet = Math.min(Number(betRangeEl.max), state.bet + 1);
    syncUI();
  });

  spinBtnEl.addEventListener("click", spin);

  dailyBonusEl.addEventListener("click", claimDailyBonus);
}

function weightedSymbolPick() {
  const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const symbol of symbols) {
    roll -= symbol.weight;
    if (roll <= 0) {
      return symbol;
    }
  }
  return symbols[symbols.length - 1];
}

function renderPayoutTable() {
  payoutListEl.innerHTML = "";
  for (const symbol of symbols) {
    const item = document.createElement("li");
    item.textContent = `${symbol.icon} ${symbol.name}: pair x${symbol.pairMultiplier}, triple x${symbol.tripleMultiplier}`;
    payoutListEl.appendChild(item);
  }

  const special = document.createElement("li");
  special.textContent = "Special combo (🤖 + 🧠 + 🧯): Panic-to-Product-Market-Fit bonus x10";
  payoutListEl.appendChild(special);
}

function syncUI() {
  balanceEl.textContent = state.balance.toString();
  spinsEl.textContent = state.spins.toString();
  biggestWinEl.textContent = state.biggestWin.toString();
  betTextEl.textContent = state.bet.toString();
  betRangeEl.value = state.bet.toString();
  updateBetLimits();

  spinBtnEl.disabled = state.balance < state.bet || state.isSpinning;
  minusBetEl.disabled = state.isSpinning || state.bet <= 1;
  plusBetEl.disabled = state.isSpinning || state.bet >= Number(betRangeEl.max);

  if (state.balance <= 0) {
    setResult("You're out of tokens. Claim a daily grant or refresh reality.", "lose");
  }
}

function updateBetLimits() {
  const hardCap = 50;
  const maxBet = Math.max(1, Math.min(hardCap, state.balance || hardCap));
  betRangeEl.max = maxBet.toString();
  state.bet = Math.min(state.bet, maxBet);
}

function setResult(message, type) {
  resultTextEl.textContent = message;
  resultTextEl.classList.remove("win", "lose");
  if (type) {
    resultTextEl.classList.add(type);
  }
}

async function spin() {
  if (state.isSpinning || state.balance < state.bet) {
    return;
  }

  state.isSpinning = true;
  state.balance -= state.bet;
  state.spins += 1;
  setResult("Training model... burning tokens...", "");
  playTone(170, 0.06, "triangle");
  if (navigator.vibrate) {
    navigator.vibrate(22);
  }
  syncUI();

  const outcomes = [weightedSymbolPick(), weightedSymbolPick(), weightedSymbolPick()];
  await Promise.all(outcomes.map((symbol, idx) => animateReel(reels[idx], symbol.icon, idx)));

  const payout = calculatePayout(outcomes, state.bet);
  if (payout > 0) {
    state.balance += payout;
    state.biggestWin = Math.max(state.biggestWin, payout);
    const randomLine = roastWin[Math.floor(Math.random() * roastWin.length)];
    setResult(`${randomLine} You won ${payout} tokens.`, "win");
    celebrate();
    playWinSound(payout);
  } else {
    const randomLine = roastLose[Math.floor(Math.random() * roastLose.length)];
    setResult(`${randomLine} You lost ${state.bet} tokens.`, "lose");
    playTone(120, 0.11, "sawtooth");
  }

  state.isSpinning = false;
  saveState();
  syncUI();

  if (autoSpinEl.checked && state.balance >= state.bet) {
    setTimeout(() => {
      if (!state.isSpinning && autoSpinEl.checked) {
        spin();
      }
    }, 520);
  }
}

function calculatePayout(outcomes, bet) {
  const counts = new Map();
  for (const symbol of outcomes) {
    counts.set(symbol.icon, (counts.get(symbol.icon) || 0) + 1);
  }

  if (hasSpecialCombo(outcomes)) {
    return bet * 10;
  }

  for (const symbol of outcomes) {
    const count = counts.get(symbol.icon);
    if (count === 3) {
      return Math.round(bet * symbol.tripleMultiplier);
    }
  }

  for (const symbol of outcomes) {
    const count = counts.get(symbol.icon);
    if (count === 2) {
      return Math.round(bet * symbol.pairMultiplier);
    }
  }

  if (outcomes.some((symbol) => symbol.icon === "🧯")) {
    return 1;
  }

  return 0;
}

function hasSpecialCombo(outcomes) {
  const icons = outcomes.map((symbol) => symbol.icon);
  return icons.includes("🤖") && icons.includes("🧠") && icons.includes("🧯");
}

function animateReel(reel, finalIcon, idx) {
  return new Promise((resolve) => {
    reel.classList.add("spinning");
    const delay = 650 + idx * 220;
    const intervalMs = 70;
    const start = Date.now();

    const interval = setInterval(() => {
      const random = symbols[Math.floor(Math.random() * symbols.length)];
      reel.textContent = random.icon;
      reel.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(2px)" },
          { transform: "translateY(0)" },
        ],
        { duration: 90, easing: "ease-out" }
      );
      if (Date.now() - start >= delay) {
        clearInterval(interval);
        reel.textContent = finalIcon;
        reel.classList.remove("spinning");
        playTone(300 + idx * 55, 0.05, "square");
        resolve();
      }
    }, intervalMs);
  });
}

function claimDailyBonus() {
  const today = new Date().toDateString();
  if (state.lastDailyBonus === today) {
    setResult("No second VC grant today. Come back tomorrow for more fake runway.", "lose");
    return;
  }

  state.balance += 30;
  state.lastDailyBonus = today;
  setResult("Daily VC grant received: +30 tokens. Spend recklessly.", "win");
  saveState();
  syncUI();
  updateDailyBonusAvailability();
  playTone(420, 0.1, "triangle");
}

function updateDailyBonusAvailability() {
  const today = new Date().toDateString();
  dailyBonusEl.disabled = state.lastDailyBonus === today;
}

function loadState() {
  try {
    const raw = localStorage.getItem(saveKey);
    if (!raw) {
      return;
    }
    const saved = JSON.parse(raw);
    if (typeof saved !== "object" || saved === null) {
      return;
    }
    state.balance = asNumber(saved.balance, state.balance);
    state.spins = asNumber(saved.spins, state.spins);
    state.biggestWin = asNumber(saved.biggestWin, state.biggestWin);
    state.bet = asNumber(saved.bet, state.bet);
    state.lastDailyBonus = typeof saved.lastDailyBonus === "string" ? saved.lastDailyBonus : "";
  } catch (error) {
    console.warn("Could not load save state", error);
  }
}

function saveState() {
  const payload = {
    balance: state.balance,
    spins: state.spins,
    biggestWin: state.biggestWin,
    bet: state.bet,
    lastDailyBonus: state.lastDailyBonus,
  };
  localStorage.setItem(saveKey, JSON.stringify(payload));
}

function asNumber(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function playTone(frequency, seconds, type = "sine") {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.07;
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + seconds);
  } catch (error) {
    // Audio is optional and can fail on strict autoplay/mobile policies.
  }
}

function playWinSound(payout) {
  if (payout >= 30) {
    playTone(370, 0.08, "triangle");
    setTimeout(() => playTone(520, 0.08, "triangle"), 85);
    setTimeout(() => playTone(700, 0.09, "triangle"), 170);
    return;
  }
  playTone(420, 0.1, "sine");
}

function celebrate() {
  document.body.animate(
    [
      { transform: "translateY(0)" },
      { transform: "translateY(-2px)" },
      { transform: "translateY(0)" },
    ],
    { duration: 220, easing: "ease-out" }
  );
}
