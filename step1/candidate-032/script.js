const SYMBOLS = [
  { icon: "\uD83E\uDD16", label: "Chatbot", vibe: "smug" },
  { icon: "\uD83E\uDE99", label: "Token", vibe: "hungry" },
  { icon: "\uD83E\uDDC3", label: "Prompt Juice", vibe: "sticky" },
  { icon: "\uD83D\uDCC9", label: "Hallucination", vibe: "wobbly" },
  { icon: "\uD83D\uDCBE", label: "GPU Rent", vibe: "expensive" },
  { icon: "\uD83D\uDD76\uFE0F", label: "Vibe Coding", vibe: "reckless" },
  { icon: "\uD83C\uDFAF", label: "Benchmark", vibe: "suspicious" },
  { icon: "\uD83E\uDDE0", label: "Synthetic Genius", vibe: "dramatic" },
];

const STARTING_TOKENS = 30;
const SPIN_COST = 3;
const STORAGE_KEY = "token-tugger-3000-state";

const tokenCountEl = document.getElementById("tokenCount");
const spinCostEl = document.getElementById("spinCost");
const lastPayoutEl = document.getElementById("lastPayout");
const machineMoodEl = document.getElementById("machineMood");
const bestComboEl = document.getElementById("bestCombo");
const messageEl = document.getElementById("message");
const spinButton = document.getElementById("spinButton");
const resetButton = document.getElementById("resetButton");
const reelElements = [...document.querySelectorAll(".reel")];

let audioContext;
let isSpinning = false;
let state = loadState();

spinCostEl.textContent = SPIN_COST;
renderInitialReels();
renderState();

spinButton.addEventListener("click", handleSpin);
resetButton.addEventListener("click", resetState);

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return createFreshState();
    }

    const parsed = JSON.parse(saved);
    return {
      tokens: clampNumber(parsed.tokens, STARTING_TOKENS),
      lastPayout: clampNumber(parsed.lastPayout, 0),
      bestCombo: typeof parsed.bestCombo === "string" ? parsed.bestCombo : "None yet",
      mood: typeof parsed.mood === "string" ? parsed.mood : "Smug",
    };
  } catch {
    return createFreshState();
  }
}

function createFreshState() {
  return {
    tokens: STARTING_TOKENS,
    lastPayout: 0,
    bestCombo: "None yet",
    mood: "Smug",
  };
}

function clampNumber(value, fallback) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderInitialReels() {
  const starterSet = [SYMBOLS[0], SYMBOLS[2], SYMBOLS[5]];
  starterSet.forEach((symbol, index) => updateReel(index, symbol));
}

function renderState() {
  tokenCountEl.textContent = state.tokens;
  lastPayoutEl.textContent = state.lastPayout;
  machineMoodEl.textContent = state.mood;
  bestComboEl.textContent = state.bestCombo;
  spinButton.disabled = state.tokens < SPIN_COST;
  spinButton.textContent =
    state.tokens >= SPIN_COST ? `Spend ${SPIN_COST} Tokens` : "Out of Tokens";

  if (state.tokens < SPIN_COST) {
    messageEl.textContent =
      "You are broke in the exact currency AI companies invented. Reset the wallet or admire the irony.";
  }
}

async function handleSpin() {
  if (isSpinning) {
    return;
  }

  if (state.tokens < SPIN_COST) {
    pulsePanel(false);
    buzz([80, 50, 80]);
    return;
  }

  isSpinning = true;
  state.tokens -= SPIN_COST;
  state.lastPayout = 0;
  state.mood = "Calculating";
  saveState();
  renderState();
  playToneSequence([
    { frequency: 220, duration: 0.05, type: "triangle", gain: 0.03 },
    { frequency: 260, duration: 0.06, type: "triangle", gain: 0.03 },
  ]);

  spinButton.disabled = true;
  resetButton.disabled = true;
  messageEl.textContent =
    "The machine is scraping every buzzword it has ever heard. Standards are slipping.";

  try {
    const results = await animateSpin();
    const outcome = evaluateSpin(results);

    state.tokens += outcome.payout;
    state.lastPayout = outcome.payout;
    state.mood = outcome.mood;

    if (outcome.comboLabel !== "No useful alignment") {
      state.bestCombo = outcome.comboLabel;
    }

    messageEl.textContent = outcome.message;
    renderState();
    saveState();
    pulsePanel(outcome.payout > 0);

    if (outcome.payout > 0) {
      buzz([120, 40, 120]);
      playToneSequence([
        { frequency: 440, duration: 0.08, type: "sine", gain: 0.035 },
        { frequency: 660, duration: 0.08, type: "sine", gain: 0.04 },
        { frequency: 880, duration: 0.14, type: "triangle", gain: 0.045 },
      ]);
    } else {
      buzz(90);
      playToneSequence([
        { frequency: 180, duration: 0.1, type: "sawtooth", gain: 0.03 },
        { frequency: 130, duration: 0.15, type: "sawtooth", gain: 0.025 },
      ]);
    }
  } catch {
    state.mood = "Embarrassed";
    messageEl.textContent =
      "The machine crashed into its own hype cycle. Your tokens are still saved.";
    renderState();
    saveState();
    pulsePanel(false);
  } finally {
    reelElements.forEach((reel) => reel.classList.remove("spinning"));
    resetButton.disabled = false;
    isSpinning = false;
    renderState();
  }
}

function resetState() {
  if (isSpinning) {
    return;
  }

  state = createFreshState();
  saveState();
  renderInitialReels();
  messageEl.textContent =
    "Wallet reset. Fresh tokens have been printed from pure confidence.";
  renderState();
  pulsePanel(true);
}

async function animateSpin() {
  const results = [];

  for (const [index, reel] of reelElements.entries()) {
    reel.classList.add("spinning");

    for (let step = 0; step < 9 + index * 2; step += 1) {
      const symbol = randomSymbol();
      updateReel(index, symbol);
      await wait(70 + index * 15);
    }

    const finalSymbol = randomSymbol();
    updateReel(index, finalSymbol);
    results.push(finalSymbol);
    reel.classList.remove("spinning");
  }

  return results;
}

function updateReel(index, symbol) {
  const iconEl = document.getElementById(`reelIcon${index}`);
  const labelEl = document.getElementById(`reelLabel${index}`);

  iconEl.textContent = symbol.icon;
  labelEl.textContent = symbol.label;
}

function randomSymbol() {
  const index = Math.floor(Math.random() * SYMBOLS.length);
  return SYMBOLS[index];
}

function evaluateSpin(results) {
  const labels = results.map((symbol) => symbol.label);
  const uniqueLabels = new Set(labels);

  if (uniqueLabels.size === 1) {
    return {
      payout: 27,
      mood: "Insufferable",
      comboLabel: `Triple ${labels[0]}`,
      message: `Three ${labels[0]}s. The machine declares this "general intelligence" and throws 27 tokens at you.`,
    };
  }

  if (uniqueLabels.size === 2) {
    const repeatedLabel = findRepeatedLabel(labels);
    return {
      payout: 9,
      mood: "Pleased",
      comboLabel: `Pair of ${repeatedLabel}`,
      message: `Pair of ${repeatedLabel}. A VC somewhere mistakes it for traction. You win 9 tokens.`,
    };
  }

  const roast = pickOne([
    "Three different ideas and somehow all of them are still overfunded. No payout.",
    "The reels produced diversified nonsense. The machine keeps your tokens for research.",
    "Impressive spread of jargon. Financially, though, this is just a hallucination.",
    "No match. The model calls it a learning experience and invoices you anyway.",
  ]);

  return {
    payout: 0,
    mood: "Smug",
    comboLabel: "No useful alignment",
    message: roast,
  };
}

function findRepeatedLabel(labels) {
  for (const label of labels) {
    if (labels.filter((item) => item === label).length > 1) {
      return label;
    }
  }

  return labels[0];
}

function pulsePanel(isWin) {
  const panel = document.querySelector(".machine-panel");
  panel.classList.remove("flash-win", "flash-loss");

  void panel.offsetWidth;
  panel.classList.add(isWin ? "flash-win" : "flash-loss");
}

function buzz(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playToneSequence(notes) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  let startTime = context.currentTime;

  notes.forEach((note) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = note.type;
    oscillator.frequency.value = note.frequency;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(note.gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + note.duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + note.duration);
    startTime += note.duration * 0.82;
  });
}

function pickOne(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
