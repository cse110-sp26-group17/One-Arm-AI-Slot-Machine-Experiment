const STORAGE_KEY = "token-burner-9000-state-v1";
const START_BALANCE = 120;
const MAX_BET = 40;
const BAILOUT_TOKENS = 65;
const BAILOUT_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_LOG_ENTRIES = 7;

const SYMBOLS = [
  { id: "token", label: "TOKEN", weight: 16, payout3: 3, vibe: "good" },
  { id: "prompt", label: "PROMPT", weight: 12, payout3: 4, vibe: "good" },
  { id: "cache", label: "CACHE", weight: 10, payout3: 5, vibe: "good" },
  { id: "agent", label: "AGENT", weight: 8, payout3: 6, vibe: "good" },
  { id: "safety", label: "SAFETY", weight: 7, payout3: 7, vibe: "good" },
  { id: "hallucinate", label: "HALLUCINATE", weight: 7, payout3: 0, vibe: "bad", penalty3: 1 },
  { id: "latency", label: "LATENCY", weight: 6, payout3: 0, vibe: "bad", penalty3: 0 },
  { id: "gpu_fire", label: "GPU_FIRE", weight: 5, payout3: 0, vibe: "bad", penalty3: 2 },
  { id: "unicontext", label: "UNICONTEXT", weight: 2, payout3: 15, vibe: "good" }
];

const HEADLINES = {
  spin: [
    "Calling expensive endpoint...",
    "Streaming probable nonsense...",
    "Sending your wallet into the context window...",
    "Fine-tuning your regret..."
  ],
  win: [
    "The model was accidentally useful.",
    "You shipped to production and nobody noticed.",
    "Somehow that prompt worked. Clip it for later.",
    "The benchmark chart is suspiciously upward."
  ],
  lose: [
    "Another premium token donation.",
    "Your prompt was brave, not effective.",
    "The model feels strongly and incorrectly.",
    "That spin produced only confidence."
  ],
  penalty: [
    "Triple meltdown. Extra burn applied.",
    "GPU fans reached aircraft mode. Billing continued.",
    "Hallucination detected. Wallet correction executed."
  ],
  broke: [
    "Wallet empty. Time to pitch AI-for-AI-as-a-Service.",
    "No tokens left. Consider touching grass APIs.",
    "Bankruptcy achieved with confidence."
  ]
};

const reels = [
  document.querySelector("#reel-0"),
  document.querySelector("#reel-1"),
  document.querySelector("#reel-2")
];
const balanceValue = document.querySelector("#balance-value");
const spentValue = document.querySelector("#spent-value");
const wonValue = document.querySelector("#won-value");
const netValue = document.querySelector("#net-value");
const betRange = document.querySelector("#bet-range");
const betDisplay = document.querySelector("#bet-display");
const headline = document.querySelector("#headline");
const eventLog = document.querySelector("#event-log");
const spinBtn = document.querySelector("#spin-btn");
const maxBtn = document.querySelector("#max-btn");
const bailoutBtn = document.querySelector("#bailout-btn");
const resetBtn = document.querySelector("#reset-btn");

let state = loadState();
let isSpinning = false;
let audioCtx = null;

const weightedSymbolPool = buildWeightedPool(SYMBOLS);

renderAll();
bindEvents();

function bindEvents() {
  betRange.addEventListener("input", () => {
    const nextBet = Number.parseInt(betRange.value, 10);
    state.bet = clamp(nextBet, 1, getMaxAllowedBet());
    persistState();
    renderAll();
  });

  spinBtn.addEventListener("click", () => {
    void spin();
  });

  maxBtn.addEventListener("click", () => {
    state.bet = getMaxAllowedBet();
    persistState();
    renderAll();
  });

  bailoutBtn.addEventListener("click", () => {
    claimBailout();
  });

  resetBtn.addEventListener("click", () => {
    const ok = window.confirm("Reset wallet and stats? This cannot be undone.");
    if (!ok) {
      return;
    }
    state = defaultState();
    persistState();
    reels.forEach((reel) => setReelSymbol(reel, { id: "ready", label: "READY" }));
    addLog("Factory reset complete. New investor deck loaded.");
    setHeadline("Fresh wallet. Same bad decisions.");
    playSound("reset");
    renderAll();
  });
}

async function spin() {
  if (isSpinning) {
    return;
  }

  if (state.balance <= 0) {
    setHeadline(randomFrom(HEADLINES.broke));
    playSound("blocked");
    return;
  }

  if (state.balance < state.bet) {
    setHeadline("Not enough tokens for that bet. Lower it or ask VC.");
    playSound("blocked");
    return;
  }

  initAudio();
  isSpinning = true;
  state.balance -= state.bet;
  state.spent += state.bet;
  state.spins += 1;
  setHeadline(randomFrom(HEADLINES.spin));
  addLog(`Spent ${state.bet} tokens to query the machine.`);
  playSound("spin");
  renderAll();
  persistState();

  const resultSymbols = await Promise.all([
    spinReel(reels[0], 780),
    spinReel(reels[1], 1170),
    spinReel(reels[2], 1530)
  ]);

  const outcome = evaluateOutcome(resultSymbols, state.bet);
  if (outcome.payout > 0) {
    state.balance += outcome.payout;
    state.won += outcome.payout;
    setHeadline(`${randomFrom(HEADLINES.win)} +${outcome.payout} tokens.`);
    addLog(`${outcome.reason} Won ${outcome.payout} tokens.`);
    playSound("win");
    vibrate([20, 40, 20]);
  } else if (outcome.penalty > 0) {
    const burned = Math.min(state.balance, outcome.penalty);
    state.balance -= burned;
    state.spent += burned;
    setHeadline(`${randomFrom(HEADLINES.penalty)} Burned ${burned} extra tokens.`);
    addLog(`${outcome.reason} Burned ${burned} extra tokens.`);
    playSound("penalty");
    vibrate([80, 40, 110]);
  } else {
    setHeadline(randomFrom(HEADLINES.lose));
    addLog(`${outcome.reason} No payout.`);
    playSound("lose");
    vibrate(40);
  }

  persistState();
  isSpinning = false;
  renderAll();

  if (state.balance <= 0) {
    setHeadline(randomFrom(HEADLINES.broke));
    addLog("Wallet reached zero. Please monetize a newsletter.");
  }
}

function evaluateOutcome(resultSymbols, bet) {
  const ids = resultSymbols.map((symbol) => symbol.id);
  const counts = ids.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topId, topCount] = entries[0];
  const topSymbol = SYMBOLS.find((symbol) => symbol.id === topId);
  const hasPromptCacheToken =
    ids.includes("prompt") && ids.includes("cache") && ids.includes("token");

  if (hasPromptCacheToken) {
    return {
      payout: Math.round(bet * 9),
      penalty: 0,
      reason: "Prompt + cache + token combo hit"
    };
  }

  if (topCount === 3) {
    if (topSymbol.vibe === "bad") {
      return {
        payout: 0,
        penalty: Math.round(bet * (topSymbol.penalty3 || 1)),
        reason: `Triple ${topSymbol.label}`
      };
    }

    return {
      payout: Math.round(bet * topSymbol.payout3),
      penalty: 0,
      reason: `Triple ${topSymbol.label}`
    };
  }

  if (topCount === 2 && topSymbol.vibe === "good") {
    return {
      payout: Math.round(bet * 1.6),
      penalty: 0,
      reason: `Pair of ${topSymbol.label}`
    };
  }

  return {
    payout: 0,
    penalty: 0,
    reason: `${ids.join(" / ")}`
  };
}

function claimBailout() {
  if (isSpinning) {
    return;
  }

  const now = Date.now();
  const elapsed = now - state.lastBailoutAt;
  if (elapsed < BAILOUT_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((BAILOUT_COOLDOWN_MS - elapsed) / 1000);
    setHeadline(`VC said "circle back." Retry in ${secondsLeft}s.`);
    playSound("blocked");
    return;
  }

  state.balance += BAILOUT_TOKENS;
  state.lastBailoutAt = now;
  persistState();
  setHeadline(`Seed round closed. +${BAILOUT_TOKENS} pity tokens.`);
  addLog(`VC bailout: +${BAILOUT_TOKENS} tokens.`);
  playSound("bailout");
  vibrate([30, 20, 30]);
  renderAll();
}

function spinReel(reelElement, durationMs) {
  return new Promise((resolve) => {
    reelElement.classList.add("spinning");

    const ticker = window.setInterval(() => {
      const teaseSymbol = randomFrom(SYMBOLS);
      setReelSymbol(reelElement, teaseSymbol);
    }, 70);

    window.setTimeout(() => {
      window.clearInterval(ticker);
      const finalSymbol = weightedPick(weightedSymbolPool);
      setReelSymbol(reelElement, finalSymbol);
      reelElement.classList.remove("spinning");
      resolve(finalSymbol);
    }, durationMs);
  });
}

function setReelSymbol(reelElement, symbol) {
  reelElement.dataset.symbol = symbol.id;
  const span = reelElement.querySelector("span");
  span.textContent = symbol.label;
}

function renderAll() {
  const maxAllowed = getMaxAllowedBet();
  if (state.bet > maxAllowed) {
    state.bet = maxAllowed;
  }

  betRange.max = String(maxAllowed);
  betRange.value = String(state.bet);
  betRange.disabled = isSpinning || state.balance <= 0;

  betDisplay.textContent = String(state.bet);
  balanceValue.textContent = formatTokens(state.balance);
  spentValue.textContent = formatTokens(state.spent);
  wonValue.textContent = formatTokens(state.won);

  const net = state.won - state.spent;
  netValue.textContent = `${net > 0 ? "+" : ""}${formatTokens(net)}`;
  netValue.classList.toggle("positive", net > 0);
  netValue.classList.toggle("negative", net < 0);

  spinBtn.disabled = isSpinning || state.balance < state.bet || state.balance <= 0;
  maxBtn.disabled = isSpinning || state.balance <= 0;
  bailoutBtn.disabled = isSpinning;
  resetBtn.disabled = isSpinning;
}

function setHeadline(text) {
  headline.textContent = text;
}

function addLog(text) {
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const li = document.createElement("li");
  li.innerHTML = `<time>${time}</time>${escapeHtml(text)}`;
  eventLog.prepend(li);
  while (eventLog.children.length > MAX_LOG_ENTRIES) {
    eventLog.lastElementChild.remove();
  }
}

function formatTokens(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getMaxAllowedBet() {
  return Math.max(1, Math.min(MAX_BET, state.balance));
}

function defaultState() {
  return {
    balance: START_BALANCE,
    spent: 0,
    won: 0,
    bet: 10,
    spins: 0,
    lastBailoutAt: 0
  };
}

function loadState() {
  const fallback = defaultState();
  let parsed = null;

  try {
    parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return fallback;
  }

  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }

  return {
    balance: asFiniteNumber(parsed.balance, fallback.balance),
    spent: asFiniteNumber(parsed.spent, fallback.spent),
    won: asFiniteNumber(parsed.won, fallback.won),
    bet: clamp(asFiniteNumber(parsed.bet, fallback.bet), 1, MAX_BET),
    spins: asFiniteNumber(parsed.spins, fallback.spins),
    lastBailoutAt: asFiniteNumber(parsed.lastBailoutAt, fallback.lastBailoutAt)
  };
}

function persistState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function asFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function buildWeightedPool(symbols) {
  const pool = [];
  for (const symbol of symbols) {
    pool.push({
      cumulativeWeight: (pool.at(-1)?.cumulativeWeight || 0) + symbol.weight,
      symbol
    });
  }
  return pool;
}

function weightedPick(pool) {
  const maxWeight = pool.at(-1).cumulativeWeight;
  const point = Math.random() * maxWeight;
  for (const entry of pool) {
    if (point <= entry.cumulativeWeight) {
      return entry.symbol;
    }
  }
  return pool.at(-1).symbol;
}

function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return;
  }

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) {
    return;
  }

  audioCtx = new Ctx();
}

function tone(freq, duration, type = "square", gainValue = 0.04) {
  if (!audioCtx) {
    return;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playSound(kind) {
  initAudio();
  switch (kind) {
    case "spin":
      tone(140, 0.06, "square", 0.03);
      window.setTimeout(() => tone(170, 0.06, "square", 0.03), 70);
      break;
    case "win":
      tone(440, 0.08, "triangle", 0.05);
      window.setTimeout(() => tone(660, 0.1, "triangle", 0.05), 95);
      window.setTimeout(() => tone(880, 0.12, "triangle", 0.05), 200);
      break;
    case "penalty":
      tone(120, 0.1, "sawtooth", 0.05);
      window.setTimeout(() => tone(80, 0.12, "sawtooth", 0.05), 120);
      break;
    case "lose":
      tone(220, 0.08, "sine", 0.03);
      window.setTimeout(() => tone(150, 0.1, "sine", 0.03), 80);
      break;
    case "bailout":
      tone(360, 0.09, "triangle", 0.04);
      window.setTimeout(() => tone(540, 0.09, "triangle", 0.04), 110);
      break;
    case "blocked":
      tone(130, 0.08, "square", 0.025);
      break;
    case "reset":
      tone(300, 0.05, "triangle", 0.03);
      window.setTimeout(() => tone(250, 0.05, "triangle", 0.03), 70);
      break;
    default:
      break;
  }
}

function vibrate(pattern) {
  if (typeof navigator.vibrate !== "function") {
    return;
  }
  navigator.vibrate(pattern);
}

function escapeHtml(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span.innerHTML;
}
