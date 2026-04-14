const SYMBOLS = [
  { icon: "🤖", name: "Bot", weight: 22, tripleMultiplier: 5 },
  { icon: "🧠", name: "Prompt", weight: 18, tripleMultiplier: 6 },
  { icon: "🪙", name: "Token", weight: 12, tripleMultiplier: 10 },
  { icon: "💸", name: "Burn", weight: 16, tripleMultiplier: 4 },
  { icon: "🚫", name: "RateLimit", weight: 14, tripleMultiplier: 4 },
  { icon: "🔥", name: "GPU", weight: 9, tripleMultiplier: 7 },
  { icon: "🪄", name: "Hallucination", weight: 9, tripleMultiplier: 0 }
];

const BET_STEPS = [5, 10, 20, 30, 50];
const STORAGE_KEY = "ai-slot-machine-state-v1";

const reelElements = [...document.querySelectorAll(".reel")];
const statusElement = document.getElementById("status");
const historyList = document.getElementById("historyList");
const spinButton = document.getElementById("spinButton");
const grantButton = document.getElementById("grantButton");
const betDownButton = document.getElementById("betDown");
const betUpButton = document.getElementById("betUp");

const tokensValue = document.getElementById("tokensValue");
const spentValue = document.getElementById("spentValue");
const wonValue = document.getElementById("wonValue");
const betValue = document.getElementById("betValue");

const spinQuips = [
  "Inference bill generated. Spinning up very expensive confidence...",
  "Allocating GPUs and pretending this is still pre-revenue R&D.",
  "Prompting the model to output wealth. Temperature set to optimism.",
  "Deploying the one-arm model to production with zero safeguards."
];

const loseQuips = [
  "No payout. Your tokens were transformed into benchmark charts.",
  "The model says this was a strategic burn, not a loss.",
  "Great spin. Shareholders call this \"long-term value creation.\"",
  "Nothing hit. The AI wrote a 30-page postmortem anyway."
];

const pairQuips = [
  "Pair hit. The board approves this as measurable progress.",
  "Two symbols aligned. Please mention this in your next funding deck.",
  "Pair payout earned. You can afford exactly one more hype cycle."
];

const tripleQuips = [
  "Triple match! You have achieved temporary product-market-fit.",
  "Huge hit. Your AI startup now has both traction and vibes.",
  "Jackpot behavior detected. Pretend this is repeatable."
];

const state = loadState();
let spinning = false;
let audioContext;

render();
setStatus("Boot complete. Insert tokens and gaslight probability.", "neutral");

spinButton.addEventListener("click", spin);
grantButton.addEventListener("click", claimDailyFunding);
betDownButton.addEventListener("click", () => shiftBet(-1));
betUpButton.addEventListener("click", () => shiftBet(1));

function loadState() {
  const fallback = {
    tokens: 120,
    spent: 0,
    won: 0,
    betIndex: 1,
    lastGrantDate: "",
    history: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return {
      tokens: Number.isFinite(parsed.tokens) ? parsed.tokens : fallback.tokens,
      spent: Number.isFinite(parsed.spent) ? parsed.spent : fallback.spent,
      won: Number.isFinite(parsed.won) ? parsed.won : fallback.won,
      betIndex: Number.isFinite(parsed.betIndex)
        ? clamp(parsed.betIndex, 0, BET_STEPS.length - 1)
        : fallback.betIndex,
      lastGrantDate:
        typeof parsed.lastGrantDate === "string"
          ? parsed.lastGrantDate
          : fallback.lastGrantDate,
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 7) : []
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  tokensValue.textContent = formatTokens(state.tokens);
  spentValue.textContent = formatTokens(state.spent);
  wonValue.textContent = formatTokens(state.won);
  betValue.textContent = String(currentBet());
  spinButton.disabled = spinning || state.tokens < currentBet();

  const canClaim = canClaimFunding();
  grantButton.disabled = !canClaim;
  grantButton.textContent = canClaim
    ? "Collect Daily VC Funding (+25)"
    : "VC Funding Already Claimed Today";

  renderHistory();
  saveState();
}

function renderHistory() {
  historyList.innerHTML = "";
  if (!state.history.length) {
    const li = document.createElement("li");
    li.textContent = "No updates yet. Investors remain cautiously delusional.";
    historyList.append(li);
    return;
  }

  for (const line of state.history) {
    const li = document.createElement("li");
    li.textContent = line;
    historyList.append(li);
  }
}

async function spin() {
  if (spinning) {
    return;
  }

  const bet = currentBet();
  if (state.tokens < bet) {
    setStatus(
      "Wallet empty. Buy more pretend compute credits or claim funding.",
      "bad"
    );
    pulseVibrate([80, 40, 80]);
    return;
  }

  spinning = true;
  state.tokens -= bet;
  state.spent += bet;
  render();

  setStatus(randomPick(spinQuips), "neutral");
  playTone(220, 0.08, "square");

  const results = await Promise.all(
    reelElements.map((reel, index) => spinOneReel(reel, index))
  );

  const outcome = calculateOutcome(results, bet);

  if (outcome.payout > 0) {
    state.tokens += outcome.payout;
    state.won += outcome.payout;
  }

  const logLine = `${new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}: ${results.map((r) => r.icon).join(" ")} -> ${outcome.copy}`;

  state.history.unshift(logLine);
  state.history = state.history.slice(0, 8);

  setStatus(outcome.copy, outcome.payout > 0 ? "good" : "bad");

  if (outcome.payout > 0) {
    celebrate(outcome.payout >= bet * 5);
  } else {
    playTone(170, 0.11, "sawtooth");
  }

  spinning = false;
  render();
}

function spinOneReel(reel, index) {
  const icon = reel.querySelector(".icon");
  reel.classList.add("spinning");

  return new Promise((resolve) => {
    const ticker = setInterval(() => {
      const randomSymbol = randomPick(SYMBOLS);
      icon.textContent = randomSymbol.icon;
      reel.dataset.symbol = randomSymbol.name;
    }, 70);

    const stopAfter = 700 + index * 280 + Math.floor(Math.random() * 120);

    setTimeout(() => {
      clearInterval(ticker);
      const landed = weightedSymbolPick();
      icon.textContent = landed.icon;
      reel.dataset.symbol = landed.name;
      reel.classList.remove("spinning");
      reel.classList.add("stop-flash");
      setTimeout(() => reel.classList.remove("stop-flash"), 200);

      pulseVibrate(30);
      playTone(290 + index * 25, 0.04, "triangle");
      resolve(landed);
    }, stopAfter);
  });
}

function calculateOutcome(results, bet) {
  const icons = results.map((item) => item.icon);
  const allSame = icons.every((icon) => icon === icons[0]);
  const exactSynergy = icons.join("") === "🤖🧠🪙";

  if (allSame) {
    if (icons[0] === "🪄") {
      return {
        payout: 0,
        copy:
          "Triple hallucination. Incredible narrative, zero revenue, full confidence."
      };
    }

    const multiplier = results[0].tripleMultiplier;
    const payout = bet * multiplier;

    return {
      payout,
      copy: `${randomPick(tripleQuips)} ${results[0].icon}${results[0].icon}${results[0].icon} pays ${multiplier}x = +${payout} tokens.`
    };
  }

  if (exactSynergy) {
    const payout = bet * 4;
    return {
      payout,
      copy: `Synergy combo unlocked (${icons.join(" ")}). +${payout} tokens in strategic value.`
    };
  }

  const frequency = new Map();
  for (const icon of icons) {
    frequency.set(icon, (frequency.get(icon) || 0) + 1);
  }

  const hasPair = [...frequency.values()].some((count) => count >= 2);
  if (hasPair) {
    const payout = bet * 2;
    return {
      payout,
      copy: `${randomPick(pairQuips)} Pair bonus: +${payout} tokens.`
    };
  }

  return {
    payout: 0,
    copy: randomPick(loseQuips)
  };
}

function shiftBet(direction) {
  if (spinning) {
    return;
  }

  state.betIndex = clamp(
    state.betIndex + direction,
    0,
    BET_STEPS.length - 1
  );

  render();
}

function claimDailyFunding() {
  if (!canClaimFunding()) {
    setStatus("Funding round already closed for today.", "bad");
    return;
  }

  state.tokens += 25;
  state.lastGrantDate = todayKey();
  state.history.unshift(
    `${new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    })}: VC wired +25 tokens. Burn rate extended by minutes.`
  );
  state.history = state.history.slice(0, 8);

  setStatus(
    "VC funding received. Congratulations on another runway extension.",
    "good"
  );
  playTone(540, 0.07, "triangle");
  pulseVibrate([40, 60, 40]);
  render();
}

function setStatus(text, tone) {
  statusElement.textContent = text;
  statusElement.classList.remove("good", "bad");

  if (tone === "good") {
    statusElement.classList.add("good");
  }
  if (tone === "bad") {
    statusElement.classList.add("bad");
  }
}

function celebrate(largeWin) {
  playTone(620, 0.08, "triangle");
  setTimeout(() => playTone(740, 0.08, "triangle"), 80);
  setTimeout(() => playTone(880, 0.12, "triangle"), 160);
  pulseVibrate(largeWin ? [60, 30, 80, 30, 120] : [60, 20, 60]);
}

function playTone(frequency, durationSeconds, type) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + durationSeconds + 0.02);
}

function pulseVibrate(pattern) {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

function weightedSymbolPick() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let value = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    value -= symbol.weight;
    if (value <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[0];
}

function randomPick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function currentBet() {
  return BET_STEPS[state.betIndex];
}

function canClaimFunding() {
  return state.lastGrantDate !== todayKey();
}

function todayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTokens(value) {
  return `${Math.max(0, Math.floor(value)).toLocaleString()} tk`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
