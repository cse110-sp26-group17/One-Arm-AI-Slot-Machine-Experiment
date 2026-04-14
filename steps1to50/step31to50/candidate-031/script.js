const STORAGE_KEY = "ai-slot-machine-state-v1";
const SPIN_COST = 15;
const BOOST_COST = 25;
const MAX_LOG_ENTRIES = 8;

const SYMBOLS = [
  {
    id: "TOKEN",
    label: "TOKEN",
    className: "token",
    weight: 18,
    triplePayout: 120,
    pairPayout: 34,
    description: "Useful output. Investors immediately ask for enterprise pricing.",
  },
  {
    id: "PROMPT",
    label: "PROMPT",
    className: "prompt",
    weight: 17,
    triplePayout: 72,
    pairPayout: 22,
    description: "Four hundred words of instruction to save six words of effort.",
  },
  {
    id: "GPU",
    label: "GPU",
    className: "gpu",
    weight: 14,
    triplePayout: 96,
    pairPayout: 28,
    description: "Thermally impressive. Financially upsetting.",
  },
  {
    id: "VC",
    label: "VC",
    className: "vc",
    weight: 11,
    triplePayout: 84,
    pairPayout: 26,
    description: "Fresh capital for bold claims and expensive snacks.",
  },
  {
    id: "AGI",
    label: "AGI?",
    className: "agi",
    weight: 5,
    triplePayout: 160,
    pairPayout: 40,
    description: "The question mark is doing excellent compliance work.",
  },
  {
    id: "BUG",
    label: "BUG",
    className: "bug",
    weight: 12,
    triplePayout: 18,
    pairPayout: 0,
    description: "A feature if the roadmap still needs more verbs.",
  },
  {
    id: "LAG",
    label: "LAG",
    className: "lag",
    weight: 13,
    triplePayout: 0,
    pairPayout: 0,
    description: "A dramatic pause disguised as inference time.",
  },
  {
    id: "404",
    label: "404",
    className: "missing",
    weight: 10,
    triplePayout: 0,
    pairPayout: 0,
    description: "Source not found. Confidence still at one hundred percent.",
  },
];

const SYMBOL_BY_ID = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]));
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const reelElements = [
  document.getElementById("reel0"),
  document.getElementById("reel1"),
  document.getElementById("reel2"),
];

const walletCard = document.getElementById("walletCard");
const balanceValue = document.getElementById("balanceValue");
const bestWinValue = document.getElementById("bestWinValue");
const spinCostValue = document.getElementById("spinCostValue");
const spinCountValue = document.getElementById("spinCountValue");
const roundDeltaValue = document.getElementById("roundDeltaValue");
const statusLine = document.getElementById("statusLine");
const spinButton = document.getElementById("spinButton");
const boostButton = document.getElementById("boostButton");
const resetButton = document.getElementById("resetButton");
const boostFill = document.getElementById("boostFill");
const boostDescription = document.getElementById("boostDescription");
const legendGrid = document.getElementById("legendGrid");
const messageLog = document.getElementById("messageLog");

let state = loadState();
let spinning = false;
let audioContext = null;

buildLegend();
renderReels([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]);
render();

spinButton.addEventListener("click", handleSpin);
boostButton.addEventListener("click", armBoost);
resetButton.addEventListener("click", resetEconomy);

function createDefaultState() {
  return {
    balance: 125,
    bestWin: 0,
    spinCount: 0,
    roundDelta: 0,
    boostActive: false,
    log: [
      {
        tone: "system",
        text: "Machine initialized. The browser has politely agreed to remember your token habit.",
        time: timestamp(),
      },
    ],
  };
}

function loadState() {
  const defaults = createDefaultState();

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return defaults;
    }

    const parsed = JSON.parse(rawValue);

    return {
      balance: Number.isFinite(parsed.balance) ? parsed.balance : defaults.balance,
      bestWin: Number.isFinite(parsed.bestWin) ? parsed.bestWin : defaults.bestWin,
      spinCount: Number.isFinite(parsed.spinCount) ? parsed.spinCount : defaults.spinCount,
      roundDelta: Number.isFinite(parsed.roundDelta) ? parsed.roundDelta : defaults.roundDelta,
      boostActive: Boolean(parsed.boostActive),
      log: Array.isArray(parsed.log) && parsed.log.length ? parsed.log.slice(0, MAX_LOG_ENTRIES) : defaults.log,
    };
  } catch (error) {
    return defaults;
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildLegend() {
  const fragment = document.createDocumentFragment();

  SYMBOLS.forEach((symbol) => {
    const card = document.createElement("article");
    card.className = "legend-card";

    const payout = document.createElement("span");
    payout.className = "legend-payout";
    payout.textContent = `Triple pays ${symbol.triplePayout} tokens`;

    const title = document.createElement("h3");
    title.textContent = symbol.label;
    title.className = `symbol-chip ${symbol.className}`;

    const copy = document.createElement("p");
    copy.textContent = symbol.description;

    card.append(payout, title, copy);
    fragment.append(card);
  });

  legendGrid.replaceChildren(fragment);
}

function render() {
  balanceValue.textContent = formatTokens(state.balance);
  bestWinValue.textContent = formatTokens(state.bestWin);
  spinCostValue.textContent = formatTokens(SPIN_COST);
  spinCountValue.textContent = formatTokens(state.spinCount);
  roundDeltaValue.textContent = formatSigned(state.roundDelta);

  boostFill.style.width = state.boostActive ? "100%" : "0%";
  boostButton.dataset.armed = String(state.boostActive);
  boostButton.textContent = state.boostActive ? "Buzzword Boost Armed" : `Buy Buzzword Boost (${BOOST_COST})`;
  boostDescription.textContent = state.boostActive
    ? "Loaded. Your next winning spin gets doubled, because narrative is a business model."
    : "Spend 25 tokens now. Your next winning spin gets doubled because pricing pages still run the world.";

  spinButton.textContent = spinning ? "Spinning..." : `Spend ${SPIN_COST} tokens`;
  spinButton.disabled = spinning || state.balance < SPIN_COST;
  boostButton.disabled = spinning || state.boostActive || state.balance < BOOST_COST;
  resetButton.disabled = spinning;

  renderLog();
}

function renderLog() {
  const fragment = document.createDocumentFragment();

  state.log.forEach((entry) => {
    const item = document.createElement("li");
    item.className = `log-entry ${entry.tone}`;

    const header = document.createElement("header");
    const tone = document.createElement("span");
    const time = document.createElement("time");
    const body = document.createElement("p");

    tone.className = "log-time";
    tone.textContent = entry.tone;
    time.className = "log-time";
    time.textContent = entry.time;
    body.className = "log-text";
    body.textContent = entry.text;

    header.append(tone, time);
    item.append(header, body);
    fragment.append(item);
  });

  messageLog.replaceChildren(fragment);
}

function renderReels(symbols) {
  symbols.forEach((symbol, index) => {
    renderOneReel(reelElements[index], symbol);
  });
}

function handleSpin() {
  if (spinning) {
    return;
  }

  if (state.balance < SPIN_COST) {
    setStatus("Wallet too low. You need more tokens before the machine can disappoint you again.");
    pulseWallet("loss");
    return;
  }

  spinRound();
}

async function spinRound() {
  spinning = true;
  state.balance -= SPIN_COST;
  state.spinCount += 1;
  state.roundDelta = -SPIN_COST;
  setStatus(`Burned ${SPIN_COST} tokens on inference. The reels are pretending to think.`);
  saveState();
  render();

  vibrate([25, 35, 25]);
  playSpinSound();

  const finalSymbols = [pickWeightedSymbol(), pickWeightedSymbol(), pickWeightedSymbol()];
  await animateReels(finalSymbols);

  const outcome = evaluateOutcome(finalSymbols);
  let payout = outcome.payout;

  if (state.boostActive && payout > 0) {
    payout *= 2;
    outcome.message = `${outcome.message} Buzzword Boost doubled the payout, which is how jargon becomes revenue.`;
  }

  state.boostActive = false;
  state.balance = Math.max(0, state.balance + payout - outcome.penalty);
  state.bestWin = Math.max(state.bestWin, payout);
  state.roundDelta = payout - outcome.penalty - SPIN_COST;

  const tone = determineTone(payout, outcome.penalty);
  const summary = summarizeRound(finalSymbols, payout, outcome.penalty, state.roundDelta, outcome.message);

  setStatus(summary);
  appendLog(summary, tone);
  pulseWallet(tone);

  if (tone === "win") {
    playWinSound(payout);
    vibrate([40, 25, 70]);
  } else if (tone === "loss") {
    playLossSound();
  }

  saveState();
  spinning = false;
  render();
}

function armBoost() {
  if (spinning || state.boostActive) {
    return;
  }

  if (state.balance < BOOST_COST) {
    setStatus("Not enough tokens for Buzzword Boost. Apparently even nonsense has overhead.");
    pulseWallet("loss");
    return;
  }

  state.balance -= BOOST_COST;
  state.boostActive = true;
  state.roundDelta = -BOOST_COST;
  setStatus("Buzzword Boost loaded. The next winning spin gets doubled by premium marketing energy.");
  appendLog(
    `Spent ${BOOST_COST} tokens on Buzzword Boost. Your next winning spin now comes with managed-service margins.`,
    "system"
  );
  pulseWallet("system");
  playSystemSound();
  saveState();
  render();
}

function resetEconomy() {
  if (spinning) {
    return;
  }

  state = createDefaultState();
  renderReels([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]);
  setStatus("Economy reset. New fake startup, same old token cravings.");
  saveState();
  render();
}

function evaluateOutcome(symbols) {
  const ids = symbols.map((symbol) => symbol.id);
  const counts = new Map();

  ids.forEach((id) => {
    counts.set(id, (counts.get(id) || 0) + 1);
  });

  const sortedCounts = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  const topMatch = sortedCounts[0];
  const has = (id) => ids.includes(id);

  if (topMatch[1] === 3) {
    const symbol = SYMBOL_BY_ID.get(topMatch[0]);

    if (symbol.id === "AGI") {
      return {
        payout: symbol.triplePayout,
        penalty: 0,
        message: "Triple AGI?. Congratulations on benchmarking a chatbot into a religion.",
      };
    }

    if (symbol.id === "LAG") {
      return {
        payout: 0,
        penalty: 8,
        message: "Triple LAG. You paid extra for suspense, not performance.",
      };
    }

    if (symbol.id === "404") {
      return {
        payout: 0,
        penalty: 10,
        message: "Triple 404. The model cited a source from another timeline, so legal billed you for cleanup.",
      };
    }

    if (symbol.id === "BUG") {
      return {
        payout: symbol.triplePayout,
        penalty: 0,
        message: "Triple BUG. Production survived because nobody opened the issue tracker.",
      };
    }

    return {
      payout: symbol.triplePayout,
      penalty: 0,
      message: `Triple ${symbol.label}. Somehow the machine calls this a strategic win.`,
    };
  }

  if (has("TOKEN") && has("GPU") && has("PROMPT")) {
    return {
      payout: 58,
      penalty: 0,
      message: "TOKEN, GPU, and PROMPT. You accidentally built something useful before the demo deck ruined it.",
    };
  }

  if (has("AGI") && has("VC") && has("PROMPT")) {
    return {
      payout: 46,
      penalty: 0,
      message: "AGI?, VC, and PROMPT. Enough jargon to close a seed round on vibes alone.",
    };
  }

  if (has("404") && has("BUG") && has("LAG")) {
    return {
      payout: 0,
      penalty: 14,
      message: "404, BUG, and LAG. That is not a product. That is a keynote with a support queue.",
    };
  }

  if (has("404") && has("BUG")) {
    return {
      payout: 0,
      penalty: 10,
      message: "404 and BUG together triggered a hallucination fine. The apology blog post writes itself.",
    };
  }

  if (topMatch[1] === 2) {
    const symbol = SYMBOL_BY_ID.get(topMatch[0]);

    if (symbol.pairPayout > 0) {
      return {
        payout: symbol.pairPayout,
        penalty: 0,
        message: `Pair of ${symbol.label}. Not exactly AGI, but it still fooled the dashboard.`,
      };
    }
  }

  return {
    payout: 0,
    penalty: 0,
    message: randomLossLine(),
  };
}

function determineTone(payout, penalty) {
  if (payout > penalty) {
    return "win";
  }

  if (penalty > 0 || payout === 0) {
    return "loss";
  }

  return "system";
}

function summarizeRound(symbols, payout, penalty, roundDelta, message) {
  const labels = symbols.map((symbol) => symbol.label).join(" / ");
  const parts = [`${labels}. ${message}`];

  if (payout > 0) {
    parts.push(`Won ${payout} tokens.`);
  }

  if (penalty > 0) {
    parts.push(`Penalty ${penalty} tokens.`);
  }

  parts.push(`Round delta ${formatSigned(roundDelta)}.`);
  return parts.join(" ");
}

function appendLog(text, tone) {
  state.log.unshift({
    tone,
    text,
    time: timestamp(),
  });

  state.log = state.log.slice(0, MAX_LOG_ENTRIES);
}

function pickWeightedSymbol() {
  const randomValue = getRandomInt(TOTAL_WEIGHT);
  let cursor = 0;

  for (const symbol of SYMBOLS) {
    cursor += symbol.weight;

    if (randomValue < cursor) {
      return symbol;
    }
  }

  return SYMBOLS[0];
}

function getRandomInt(max) {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % max;
}

async function animateReels(finalSymbols) {
  const reelPromises = finalSymbols.map((symbol, index) => spinSingleReel(index, symbol, 8 + index * 4));
  await Promise.all(reelPromises);
}

function spinSingleReel(index, finalSymbol, steps) {
  return new Promise((resolve) => {
    let iterations = 0;

    const timer = window.setInterval(() => {
      const isFinal = iterations >= steps;
      const symbol = isFinal ? finalSymbol : pickWeightedSymbol();
      const reel = reelElements[index];

      renderOneReel(reel, symbol);
      animateReel(reel, isFinal);

      if (isFinal) {
        window.clearInterval(timer);
        resolve();
      }

      iterations += 1;
    }, prefersReducedMotion.matches ? 20 : 90);
  });
}

function renderOneReel(reel, symbol) {
  reel.className = `symbol-chip ${symbol.className}`;
  reel.textContent = symbol.label;
}

function animateReel(reel, isFinal) {
  if (prefersReducedMotion.matches || typeof reel.animate !== "function") {
    return;
  }

  reel.animate(
    [
      { transform: "translateY(-18px) scale(0.96)", opacity: 0.25, filter: "blur(4px)" },
      { transform: "translateY(0) scale(1)", opacity: 1, filter: "blur(0px)" },
    ],
    {
      duration: isFinal ? 230 : 140,
      easing: isFinal ? "cubic-bezier(0.2, 0.9, 0.2, 1)" : "ease-out",
      fill: "none",
    }
  );
}

function pulseWallet(tone) {
  if (prefersReducedMotion.matches || typeof walletCard.animate !== "function") {
    return;
  }

  const glow = tone === "win" ? "rgba(127, 240, 182, 0.55)" : tone === "loss" ? "rgba(255, 127, 107, 0.48)" : "rgba(255, 203, 86, 0.44)";

  walletCard.animate(
    [
      { transform: "translateY(0)", boxShadow: "0 0 0 rgba(0, 0, 0, 0)" },
      { transform: "translateY(-4px)", boxShadow: `0 0 32px ${glow}` },
      { transform: "translateY(0)", boxShadow: "0 0 0 rgba(0, 0, 0, 0)" },
    ],
    {
      duration: 420,
      easing: "ease-out",
    }
  );
}

function setStatus(text) {
  statusLine.textContent = text;
}

function formatTokens(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatSigned(value) {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : ""}${formatTokens(value)}`;
}

function timestamp() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function randomLossLine() {
  const lines = [
    "Nothing lined up. The machine generated confidence, not value.",
    "Miss. Your tokens have been reclassified as compute burn.",
    "No payout. Somewhere a founder still calls this traction.",
    "Bust. The reels pivoted to enterprise before shipping anything.",
  ];

  return lines[getRandomInt(lines.length)];
}

function getAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, duration, type, gainValue) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playSpinSound() {
  window.setTimeout(() => playTone(220, 0.08, "square", 0.018), 0);
  window.setTimeout(() => playTone(330, 0.08, "square", 0.018), 110);
  window.setTimeout(() => playTone(440, 0.12, "square", 0.018), 240);
}

function playWinSound(payout) {
  const base = payout >= 100 ? 720 : 560;
  window.setTimeout(() => playTone(base, 0.12, "triangle", 0.03), 0);
  window.setTimeout(() => playTone(base * 1.25, 0.14, "triangle", 0.03), 130);
  window.setTimeout(() => playTone(base * 1.5, 0.24, "triangle", 0.03), 290);
}

function playLossSound() {
  window.setTimeout(() => playTone(180, 0.16, "sawtooth", 0.015), 0);
  window.setTimeout(() => playTone(120, 0.2, "sawtooth", 0.012), 120);
}

function playSystemSound() {
  window.setTimeout(() => playTone(420, 0.08, "sine", 0.02), 0);
  window.setTimeout(() => playTone(580, 0.14, "sine", 0.02), 90);
}

function vibrate(pattern) {
  if (prefersReducedMotion.matches) {
    return;
  }

  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}
