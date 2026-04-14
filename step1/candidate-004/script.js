const STORAGE_KEY = "token_slot_state_v1";
const REEL_COUNT = 3;
const SPIN_COST = 15;
const AUTO_SPINS = 5;
const VC_FUNDING = 50;
const FUNDING_COOLDOWN_MS = 30_000;
const LOG_LIMIT = 10;

const SYMBOLS = [
  { id: "TOKEN", weight: 24, double: 20, triple: 85 },
  { id: "GPU", weight: 17, double: 40, triple: 135 },
  { id: "PROMPT", weight: 17, double: 30, triple: 100 },
  { id: "CACHE", weight: 14, double: 32, triple: 110 },
  { id: "BENCHMARK", weight: 11, double: 45, triple: 150 },
  { id: "404", weight: 9, double: 55, triple: 190 },
  { id: "HALLUCINATION", weight: 8, double: -15, triple: -35 }
];

const refs = {
  reelNodes: [
    document.getElementById("reelA"),
    document.getElementById("reelB"),
    document.getElementById("reelC")
  ],
  wallet: document.getElementById("wallet"),
  spent: document.getElementById("spent"),
  won: document.getElementById("won"),
  biggest: document.getElementById("biggest"),
  spinCost: document.getElementById("spinCost"),
  outcome: document.getElementById("outcome"),
  eventLog: document.getElementById("eventLog"),
  spinBtn: document.getElementById("spinBtn"),
  autoBtn: document.getElementById("autoBtn"),
  fundBtn: document.getElementById("fundBtn"),
  resetBtn: document.getElementById("resetBtn"),
  voiceToggle: document.getElementById("voiceToggle")
};

let audioContext;
let isSpinning = false;
let autoSpinRemaining = 0;
let state = loadState();

refs.spinCost.textContent = String(SPIN_COST);
refs.voiceToggle.checked = !!state.voiceOn;

refreshStats();
logEvent("Welcome back. The model is statistically overconfident.", "neutral");

refs.spinBtn.addEventListener("click", () => {
  autoSpinRemaining = 0;
  runSpin();
});

refs.autoBtn.addEventListener("click", () => {
  if (isSpinning) {
    return;
  }
  autoSpinRemaining = AUTO_SPINS - 1;
  runSpin();
});

refs.fundBtn.addEventListener("click", requestFunding);
refs.resetBtn.addEventListener("click", resetEconomy);
refs.voiceToggle.addEventListener("change", () => {
  state.voiceOn = refs.voiceToggle.checked;
  persistState();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    refs.spinBtn.click();
  }
});

function defaultState() {
  return {
    tokens: 180,
    spent: 0,
    won: 0,
    spins: 0,
    biggestWin: 0,
    voiceOn: false,
    fundingAvailableAt: 0
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }

    const parsed = JSON.parse(raw);
    const base = defaultState();

    return {
      ...base,
      ...parsed
    };
  } catch {
    return defaultState();
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function refreshStats() {
  refs.wallet.textContent = format(state.tokens);
  refs.spent.textContent = format(state.spent);
  refs.won.textContent = format(state.won);
  refs.biggest.textContent = format(state.biggestWin);
}

function format(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function setControlsDisabled(disabled) {
  refs.spinBtn.disabled = disabled;
  refs.autoBtn.disabled = disabled;
  refs.fundBtn.disabled = disabled;
}

function logEvent(message, tone) {
  const row = document.createElement("li");
  row.textContent = message;
  if (tone === "win" || tone === "loss") {
    row.classList.add(tone);
  }
  refs.eventLog.prepend(row);

  while (refs.eventLog.children.length > LOG_LIMIT) {
    refs.eventLog.lastElementChild.remove();
  }
}

function setOutcome(message, tone = "neutral") {
  refs.outcome.textContent = message;
  refs.outcome.className = "outcome";
  if (tone === "win" || tone === "loss") {
    refs.outcome.classList.add(tone);
  }

  if (state.voiceOn && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.08;
    utterance.pitch = 0.88;
    utterance.volume = 0.7;
    window.speechSynthesis.speak(utterance);
  }
}

function randomSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let threshold = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    threshold -= symbol.weight;
    if (threshold <= 0) {
      return symbol.id;
    }
  }

  return SYMBOLS[0].id;
}

async function runSpin() {
  if (isSpinning) {
    return;
  }

  if (state.tokens < SPIN_COST) {
    autoSpinRemaining = 0;
    setOutcome("Wallet empty. Please acquire venture capital.", "loss");
    logEvent("Spin denied: insufficient tokens.", "loss");
    buzz([80, 40, 80]);
    return;
  }

  isSpinning = true;
  setControlsDisabled(true);

  state.tokens -= SPIN_COST;
  state.spent += SPIN_COST;
  state.spins += 1;
  persistState();
  refreshStats();

  setOutcome("Querying the stochastic oracle...");
  logEvent(`Spin ${state.spins}: burned ${SPIN_COST} tokens on inference.`, "neutral");
  playTone("spin");

  const result = await spinReels();
  const summary = evaluateResult(result);

  state.tokens += summary.delta;
  if (summary.delta > 0) {
    state.won += summary.delta;
  }

  if (summary.delta > state.biggestWin) {
    state.biggestWin = summary.delta;
  }

  persistState();
  refreshStats();
  setOutcome(summary.message, summary.tone);
  logEvent(summary.log, summary.tone);

  if (summary.tone === "win") {
    buzz([30, 40, 30, 40, 80]);
    playTone(summary.delta >= 120 ? "jackpot" : "win");
  } else if (summary.tone === "loss") {
    buzz([120]);
    playTone("loss");
  }

  isSpinning = false;
  setControlsDisabled(false);

  if (autoSpinRemaining > 0) {
    autoSpinRemaining -= 1;
    window.setTimeout(runSpin, 500);
  }
}

function spinReels() {
  const tasks = refs.reelNodes.map((node, index) =>
    new Promise((resolve) => {
      node.classList.add("spinning");

      const tickMs = 75;
      const durationMs = 760 + index * 250 + Math.random() * 180;
      const ticker = window.setInterval(() => {
        node.textContent = randomSymbol();
      }, tickMs);

      window.setTimeout(() => {
        window.clearInterval(ticker);
        const finalSymbol = randomSymbol();
        node.textContent = finalSymbol;
        node.classList.remove("spinning");
        resolve(finalSymbol);
      }, durationMs);
    })
  );

  return Promise.all(tasks);
}

function evaluateResult(symbolIds) {
  const counts = {};
  for (const id of symbolIds) {
    counts[id] = (counts[id] || 0) + 1;
  }

  let dominantId = symbolIds[0];
  let dominantCount = counts[dominantId];
  for (const [id, count] of Object.entries(counts)) {
    if (count > dominantCount) {
      dominantId = id;
      dominantCount = count;
    }
  }

  const symbolsText = symbolIds.join(" | ");
  const data = SYMBOLS.find((entry) => entry.id === dominantId) || SYMBOLS[0];

  if (dominantCount === 3) {
    if (dominantId === "HALLUCINATION") {
      return {
        delta: data.triple,
        tone: "loss",
        message: `TRIPLE ${dominantId}. The model sounded certain and billed you extra ${Math.abs(data.triple)} tokens.`,
        log: `${symbolsText}: confidence score 100%, accuracy undefined.`
      };
    }

    return {
      delta: data.triple,
      tone: "win",
      message: `Triple ${dominantId}. You profit ${data.triple} tokens from statistical luck.`,
      log: `${symbolsText}: jackpot-ish behavior detected.`
    };
  }

  if (dominantCount === 2) {
    if (dominantId === "HALLUCINATION") {
      return {
        delta: data.double,
        tone: "loss",
        message: `Double ${dominantId}. You just funded two paragraphs of wrong certainty (-${Math.abs(data.double)}).`,
        log: `${symbolsText}: premium nonsense package delivered.`
      };
    }

    if (data.double > 0) {
      return {
        delta: data.double,
        tone: "win",
        message: `Pair of ${dominantId}. You reclaim ${data.double} tokens.`,
        log: `${symbolsText}: mild reward for model compliance.`
      };
    }
  }

  if (symbolIds.includes("PROMPT") && symbolIds.includes("GPU") && symbolIds.includes("TOKEN")) {
    return {
      delta: 30,
      tone: "win",
      message: "Prompt + GPU + Token synergy. Congrats, you accidentally made a business model (+30).",
      log: `${symbolsText}: founders are now speaking at a conference.`
    };
  }

  if (symbolIds.includes("HALLUCINATION")) {
    return {
      delta: -8,
      tone: "loss",
      message: "Hallucination slipped in. You pay 8 cleanup tokens for fact-checking.",
      log: `${symbolsText}: ops team manually reviewed the output.`
    };
  }

  return {
    delta: 0,
    tone: "neutral",
    message: `No payout. The model generated vibes and consumed ${SPIN_COST} tokens.`,
    log: `${symbolsText}: benchmark unchanged.`
  };
}

function requestFunding() {
  if (isSpinning) {
    return;
  }

  const now = Date.now();
  const remainingMs = state.fundingAvailableAt - now;

  if (remainingMs > 0) {
    const seconds = Math.ceil(remainingMs / 1000);
    setOutcome(`VC says "circle back". Retry in ${seconds}s.`, "loss");
    logEvent("Funding request rejected: asked too soon.", "loss");
    return;
  }

  state.tokens += VC_FUNDING;
  state.fundingAvailableAt = now + FUNDING_COOLDOWN_MS;
  persistState();
  refreshStats();

  setOutcome(`A16Z intern liked your demo. Wallet +${VC_FUNDING} tokens.`, "win");
  logEvent(`Funding round closed at ${VC_FUNDING} tokens and one meme deck.`, "win");
  playTone("win");
}

function resetEconomy() {
  if (isSpinning) {
    return;
  }

  const shouldReset = window.confirm("Reset wallet, stats, and cooldowns?");
  if (!shouldReset) {
    return;
  }

  state = defaultState();
  refs.voiceToggle.checked = false;
  refs.eventLog.innerHTML = "";
  persistState();
  refreshStats();

  setOutcome("Economy reset. Fresh wallet, same bad decisions.");
  logEvent("Ledger wiped. New token cycle initiated.", "neutral");
}

function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(kind) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, now);

  const oscillator = context.createOscillator();
  oscillator.type = "triangle";
  oscillator.connect(gain);

  const profiles = {
    spin: { frequency: 280, duration: 0.09, peak: 0.03 },
    win: { frequency: 520, duration: 0.16, peak: 0.05 },
    jackpot: { frequency: 760, duration: 0.22, peak: 0.07 },
    loss: { frequency: 170, duration: 0.18, peak: 0.045 }
  };

  const profile = profiles[kind] || profiles.spin;

  oscillator.frequency.setValueAtTime(profile.frequency, now);
  gain.gain.exponentialRampToValueAtTime(profile.peak, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

  oscillator.start(now);
  oscillator.stop(now + profile.duration + 0.02);
}

function buzz(pattern) {
  if (typeof navigator.vibrate !== "function") {
    return;
  }
  navigator.vibrate(pattern);
}
