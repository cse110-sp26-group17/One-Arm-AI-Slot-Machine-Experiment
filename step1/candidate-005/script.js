const STORAGE_KEY = "token-drainer-3000-state-v1";
const STARTING_TOKENS = 40;
const SPIN_COST = 5;
const TOP_UP_AMOUNT = 20;

const SYMBOLS = [
  { id: "stable_model", icon: "🤖", label: "Stable Model", weight: 4 },
  { id: "agi_hype", icon: "🧠", label: "AGI Hype", weight: 6 },
  { id: "token_stash", icon: "🪙", label: "Token Stash", weight: 12 },
  { id: "prompt", icon: "🧾", label: "Prompt Patch", weight: 14 },
  { id: "alignment", icon: "🧯", label: "Alignment Hotfix", weight: 10 },
  { id: "rate_limit", icon: "⏳", label: "Rate Limit", weight: 12 },
  { id: "gpu_fire", icon: "🔥", label: "GPU Fire", weight: 9 },
  { id: "hallucination", icon: "🦄", label: "Hallucination", weight: 11 },
];

const TRIPLE_PAYOUT = new Map([
  ["stable_model", 80],
  ["agi_hype", 50],
  ["token_stash", 30],
  ["prompt", 24],
  ["alignment", 20],
  ["rate_limit", 16],
  ["gpu_fire", 18],
  ["hallucination", -6],
]);

const DOM = {
  reels: [...document.querySelectorAll(".reel")],
  tokens: document.getElementById("tokens"),
  spent: document.getElementById("spent"),
  won: document.getElementById("won"),
  spins: document.getElementById("spins"),
  spinCost: document.getElementById("spinCost"),
  status: document.getElementById("status"),
  spinBtn: document.getElementById("spinBtn"),
  topUpBtn: document.getElementById("topUpBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

let state = loadState();
let isSpinning = false;
let audioCtx = null;

function defaultState() {
  return {
    tokens: STARTING_TOKENS,
    totalSpent: 0,
    totalWon: 0,
    spins: 0,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    const safeTokens = toFiniteNumber(parsed.tokens, STARTING_TOKENS);
    return {
      tokens: Math.max(0, Math.round(safeTokens)),
      totalSpent: Math.max(0, Math.round(toFiniteNumber(parsed.totalSpent, 0))),
      totalWon: Math.max(0, Math.round(toFiniteNumber(parsed.totalWon, 0))),
      spins: Math.max(0, Math.round(toFiniteNumber(parsed.spins, 0))),
    };
  } catch (_err) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function weightedSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const symbol of SYMBOLS) {
    cursor -= symbol.weight;
    if (cursor <= 0) {
      return symbol;
    }
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function applySymbol(reelEl, symbol) {
  reelEl.textContent = symbol.icon;
  reelEl.dataset.symbolId = symbol.id;
  reelEl.setAttribute("aria-label", symbol.label);
  reelEl.title = symbol.label;
}

function setStatus(message, tone = "neutral") {
  DOM.status.textContent = message;
  DOM.status.dataset.tone = tone;
}

function render() {
  DOM.tokens.textContent = state.tokens;
  DOM.spent.textContent = state.totalSpent;
  DOM.won.textContent = state.totalWon;
  DOM.spins.textContent = state.spins;
  DOM.spinCost.textContent = SPIN_COST;
  DOM.spinBtn.disabled = isSpinning || state.tokens < SPIN_COST;
}

function ensureAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtor();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playSound(pattern) {
  const ctx = ensureAudio();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  let offset = 0;
  for (const note of pattern) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type || "triangle";
    osc.frequency.value = note.freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(
      note.vol || 0.08,
      now + offset + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + offset + note.duration
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + note.duration + 0.04);
    offset += note.gap || note.duration * 0.7;
  }
}

function buzz(pattern) {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

function clearReelHighlights() {
  for (const reel of DOM.reels) {
    reel.classList.remove("win", "loss");
  }
}

function animateSpin(reelEl, durationMs) {
  return new Promise((resolve) => {
    const intervalId = setInterval(() => {
      applySymbol(reelEl, randomSymbol());
    }, 75);

    reelEl.animate(
      [
        { transform: "translateY(0) scale(1)", filter: "blur(0)" },
        { transform: "translateY(4px) scale(1.03)", filter: "blur(1px)" },
        { transform: "translateY(0) scale(1)", filter: "blur(0)" },
      ],
      { duration: durationMs, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );

    setTimeout(() => {
      clearInterval(intervalId);
      const finalSymbol = weightedSymbol();
      applySymbol(reelEl, finalSymbol);
      reelEl.animate(
        [
          { transform: "scale(1.12)" },
          { transform: "scale(0.96)" },
          { transform: "scale(1)" },
        ],
        { duration: 240, easing: "ease-out" }
      );
      resolve(finalSymbol);
    }, durationMs);
  });
}

function formatPairMessage(symbolId, payout) {
  const symbol = SYMBOLS.find((item) => item.id === symbolId);
  const label = symbol ? symbol.label : "Model Noise";
  return `Pair of ${label}. Barely shippable demo. +${payout} tokens.`;
}

function evaluateOutcome(spinSymbols) {
  const ids = spinSymbols.map((symbol) => symbol.id);
  const counts = new Map();
  for (const id of ids) {
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  if (counts.size === 1) {
    const id = ids[0];
    const delta = TRIPLE_PAYOUT.get(id) || 0;
    if (delta > 0) {
      const label = spinSymbols[0].label;
      return {
        delta,
        tone: "win",
        message: `Triple ${label}. The pitch deck printed money: +${delta} tokens.`,
      };
    }
    return {
      delta,
      tone: "loss",
      message: `Triple Hallucination. You cited fake papers: ${delta} tokens.`,
    };
  }

  const pair = [...counts.entries()].find((entry) => entry[1] === 2);
  if (pair) {
    const [id] = pair;
    const payout = id === "stable_model" ? 15 : 8;
    return {
      delta: payout,
      tone: "win",
      message: formatPairMessage(id, payout),
    };
  }

  if (ids.includes("prompt") && ids.includes("token_stash") && ids.includes("alignment")) {
    return {
      delta: 22,
      tone: "win",
      message: "Prompt + Token + Alignment combo. Enterprise pilot unlocked: +22 tokens.",
    };
  }

  if (ids.includes("rate_limit") && ids.includes("gpu_fire")) {
    return {
      delta: -4,
      tone: "loss",
      message: "Rate limit during a GPU fire. Cloud invoice attack: -4 tokens.",
    };
  }

  if (ids.includes("hallucination")) {
    return {
      delta: -2,
      tone: "loss",
      message: "Confidently wrong answer in production. Refunds issued: -2 tokens.",
    };
  }

  return {
    delta: 0,
    tone: "warn",
    message: "No payout. Try adding more buzzwords next spin.",
  };
}

async function spin() {
  if (isSpinning) {
    return;
  }
  if (state.tokens < SPIN_COST) {
    setStatus("Out of tokens. Pitch VCs or reset your startup.", "warn");
    DOM.spinBtn.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-5px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 280 }
    );
    return;
  }

  clearReelHighlights();
  isSpinning = true;
  state.tokens -= SPIN_COST;
  state.totalSpent += SPIN_COST;
  state.spins += 1;
  saveState();
  render();

  setStatus("Running inference... and burning investor cash.", "warn");
  playSound([
    { freq: 220, duration: 0.11, gap: 0.08 },
    { freq: 280, duration: 0.11, gap: 0.08 },
    { freq: 340, duration: 0.12, gap: 0.1 },
  ]);
  buzz([10, 30, 10]);

  const stopDurations = [620, 860, 1110];
  const results = await Promise.all(
    DOM.reels.map((reel, index) => animateSpin(reel, stopDurations[index]))
  );

  const outcome = evaluateOutcome(results);
  state.tokens = Math.max(0, state.tokens + outcome.delta);
  if (outcome.delta > 0) {
    state.totalWon += outcome.delta;
  }
  saveState();

  if (outcome.delta > 0) {
    for (const reel of DOM.reels) {
      reel.classList.add("win");
    }
  } else if (outcome.delta < 0) {
    for (const reel of DOM.reels) {
      reel.classList.add("loss");
    }
  }

  if (outcome.delta > 0) {
    playSound([
      { freq: 523, duration: 0.14, gap: 0.09, type: "square" },
      { freq: 659, duration: 0.14, gap: 0.09, type: "square" },
      { freq: 784, duration: 0.2, gap: 0.16, type: "square", vol: 0.1 },
    ]);
    buzz([25, 35, 25, 60, 45]);
  } else if (outcome.delta < 0) {
    playSound([
      { freq: 240, duration: 0.17, gap: 0.12, type: "sawtooth", vol: 0.06 },
      { freq: 180, duration: 0.2, gap: 0.12, type: "sawtooth", vol: 0.06 },
    ]);
    buzz([60]);
  }

  setStatus(outcome.message, outcome.tone);
  isSpinning = false;
  render();
}

function topUpTokens() {
  state.tokens += TOP_UP_AMOUNT;
  saveState();
  render();
  setStatus(
    `You said "AI + blockchain + vibes" and raised ${TOP_UP_AMOUNT} tokens.`,
    "win"
  );
  playSound([
    { freq: 440, duration: 0.1, gap: 0.08, type: "triangle" },
    { freq: 554, duration: 0.1, gap: 0.08, type: "triangle" },
    { freq: 659, duration: 0.15, gap: 0.09, type: "triangle" },
  ]);
}

function resetGame() {
  const ok = window.confirm("Reset wallet and stats? Your fake startup history will be deleted.");
  if (!ok) {
    return;
  }
  state = defaultState();
  saveState();
  for (const reel of DOM.reels) {
    applySymbol(reel, randomSymbol());
  }
  clearReelHighlights();
  setStatus("Hard reset complete. New quarter, same AI hype cycle.", "warn");
  render();
}

function init() {
  for (const reel of DOM.reels) {
    applySymbol(reel, randomSymbol());
  }
  render();
  DOM.spinBtn.addEventListener("click", spin);
  DOM.topUpBtn.addEventListener("click", topUpTokens);
  DOM.resetBtn.addEventListener("click", resetGame);
}

init();
