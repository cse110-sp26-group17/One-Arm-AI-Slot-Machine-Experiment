const STORAGE_KEY = "token-grinder-9000-state-v1";

const SYMBOLS = [
  { id: "prompt", label: "PROMPT", name: "Prompt Injection", weight: 18 },
  { id: "hallu", label: "HALLU", name: "Hallucination", weight: 16 },
  { id: "rate", label: "429", name: "Rate Limit", weight: 14 },
  { id: "gpu", label: "GPU", name: "GPU Panic", weight: 12 },
  { id: "align", label: "ALIGN", name: "Alignment Patch", weight: 11 },
  { id: "intern", label: "INTERN", name: "Wildcard Intern", weight: 8, wild: true },
];

const WIN_MULTIPLIERS = {
  prompt: 7,
  hallu: 5,
  rate: 3,
  gpu: 10,
  align: 8,
  intern: 25,
};

const ROASTS_WIN = [
  "A useful answer on first try. Legal says this event is non-repeatable.",
  "Tokens returned. The model accidentally shipped production code.",
  "You prompted with confidence and somehow got a coherent result.",
  "Big win. The AI cited real sources and nobody fainted.",
  "Inference succeeded. Finance approves one additional risky prompt.",
];

const ROASTS_LOSE = [
  "You paid for a confident paragraph that solved nothing.",
  "All tokens consumed for a summary of your own prompt.",
  "The model suggests trying the same query but louder.",
  "No payout. You received twelve bullet points and zero answers.",
  "Another spin, another hallucination with enterprise pricing.",
];

const els = {
  balance: document.getElementById("balance"),
  spent: document.getElementById("spent"),
  won: document.getElementById("won"),
  spins: document.getElementById("spins"),
  status: document.getElementById("status-message"),
  reels: [
    document.getElementById("reel-1"),
    document.getElementById("reel-2"),
    document.getElementById("reel-3"),
  ],
  betSelect: document.getElementById("bet-select"),
  spinBtn: document.getElementById("spin-btn"),
  autoBtn: document.getElementById("auto-btn"),
  resetBtn: document.getElementById("reset-btn"),
  copyBtn: document.getElementById("copy-btn"),
  voiceToggle: document.getElementById("voice-toggle"),
  logList: document.getElementById("log-list"),
};

const state = {
  balance: 1000,
  spent: 0,
  won: 0,
  spins: 0,
  logs: [],
};

let audioContext = null;
let isSpinning = false;

boot();

function boot() {
  hydrateState();
  renderStats();
  writeReels(SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]);
  renderLogs();
  updateButtonState();

  els.spinBtn.addEventListener("click", () => spinOnce());
  els.autoBtn.addEventListener("click", () => autoSpin(5));
  els.resetBtn.addEventListener("click", resetEconomy);
  els.copyBtn.addEventListener("click", copySessionSummary);
  els.betSelect.addEventListener("change", updateButtonState);
}

function hydrateState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return;
    }

    state.balance = normalizeNumber(parsed.balance, 1000);
    state.spent = normalizeNumber(parsed.spent, 0);
    state.won = normalizeNumber(parsed.won, 0);
    state.spins = normalizeNumber(parsed.spins, 0);
    state.logs = Array.isArray(parsed.logs) ? parsed.logs.slice(0, 20) : [];
  } catch (_error) {
    setStatus("State file was nonsense. Starting with fresh tokens.");
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeNumber(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

async function spinOnce() {
  const bet = Number(els.betSelect.value);
  if (isSpinning || !Number.isFinite(bet) || bet <= 0) {
    return;
  }

  if (state.balance < bet) {
    setStatus("Insufficient tokens. The model requests more funding.");
    maybeVibrate([100, 50, 100]);
    playTones("loss");
    return;
  }

  isSpinning = true;
  updateButtonState();
  setStatus(`Spending ${bet} TOK on vibes and plausible syntax...`);
  playTones("spin");
  maybeVibrate(40);

  state.balance -= bet;
  state.spent += bet;
  state.spins += 1;
  renderStats();

  const finalSymbols = [pickWeightedSymbol(), pickWeightedSymbol(), pickWeightedSymbol()];
  await Promise.all([
    animateReel(els.reels[0], finalSymbols[0], 650),
    animateReel(els.reels[1], finalSymbols[1], 900),
    animateReel(els.reels[2], finalSymbols[2], 1150),
  ]);

  const outcome = evaluateOutcome(finalSymbols, bet);

  if (outcome.payout > 0) {
    state.balance += outcome.payout;
    state.won += outcome.payout;
    playTones("win");
    maybeVibrate([60, 45, 60]);
  } else {
    playTones("loss");
  }

  renderStats();
  updateButtonState();

  const symbolNames = finalSymbols.map((item) => item.name).join(" | ");
  const roast = randomPick(outcome.payout > 0 ? ROASTS_WIN : ROASTS_LOSE);
  const detail = `${symbolNames} -> ${outcome.message} ${roast}`;
  appendLog(detail);
  setStatus(`${outcome.message} ${roast}`);
  maybeSpeak(outcome.message);

  persistState();
  isSpinning = false;
  updateButtonState();
}

async function autoSpin(count) {
  if (isSpinning) {
    return;
  }

  const spinsToRun = Number.isInteger(count) ? count : 0;
  for (let step = 0; step < spinsToRun; step += 1) {
    const bet = Number(els.betSelect.value);
    if (state.balance < bet) {
      setStatus("Auto-spin stopped. Your token runway has ended.");
      break;
    }
    await spinOnce();
    await wait(140);
  }
}

function evaluateOutcome(reels, bet) {
  const ids = reels.map((item) => item.id);
  const counts = new Map();

  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  const wildCount = counts.get("intern") ?? 0;
  let payout = 0;
  let message = "No payout. Tokens gone to the cloud.";

  if (wildCount === 3) {
    payout = Math.floor(bet * WIN_MULTIPLIERS.intern);
    message = `Wild INTERN jackpot. You win ${payout} TOK.`;
    return { payout, message };
  }

  if (maxCount === 3) {
    const key = ids[0];
    payout = Math.floor(bet * (WIN_MULTIPLIERS[key] ?? 4));
    message = `Triple ${reels[0].label}. You win ${payout} TOK.`;
    return { payout, message };
  }

  if (wildCount === 1) {
    const nonWild = ids.filter((id) => id !== "intern");
    if (nonWild[0] === nonWild[1]) {
      payout = Math.floor(bet * 6);
      message = `Wildcard assist. You win ${payout} TOK.`;
      return { payout, message };
    }

    payout = Math.floor(bet * 2);
    message = `Intern improvised a patch. You win ${payout} TOK.`;
    return { payout, message };
  }

  if (maxCount === 2) {
    payout = Math.floor(bet * 1.5);
    message = `Pair landed. Partial refund: ${payout} TOK.`;
    return { payout, message };
  }

  if (ids.includes("rate")) {
    message = "429 landed. Request denied. Try again with more budget.";
  }

  return { payout, message };
}

function pickWeightedSymbol() {
  const total = SYMBOLS.reduce((sum, entry) => sum + entry.weight, 0);
  let marker = Math.random() * total;

  for (const symbol of SYMBOLS) {
    marker -= symbol.weight;
    if (marker <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[0];
}

function randomPick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function writeReels(...symbols) {
  symbols.forEach((symbol, index) => {
    els.reels[index].textContent = symbol.label;
    els.reels[index].title = symbol.name;
  });
}

function animateReel(reelEl, finalSymbol, durationMs) {
  const start = performance.now();
  reelEl.classList.add("spinning");

  return new Promise((resolve) => {
    function frame(now) {
      const elapsed = now - start;
      if (elapsed >= durationMs) {
        reelEl.classList.remove("spinning");
        reelEl.textContent = finalSymbol.label;
        reelEl.title = finalSymbol.name;
        resolve();
        return;
      }

      reelEl.textContent = randomPick(SYMBOLS).label;
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}

function appendLog(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 12);
  renderLogs();
}

function renderLogs() {
  els.logList.innerHTML = "";
  if (state.logs.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No spins yet. Confidence remains untested.";
    els.logList.appendChild(li);
    return;
  }

  for (const line of state.logs) {
    const li = document.createElement("li");
    li.textContent = line;
    els.logList.appendChild(li);
  }
}

function renderStats() {
  els.balance.textContent = state.balance.toLocaleString();
  els.spent.textContent = state.spent.toLocaleString();
  els.won.textContent = state.won.toLocaleString();
  els.spins.textContent = state.spins.toLocaleString();
}

function updateButtonState() {
  const bet = Number(els.betSelect.value);
  const canAfford = state.balance >= bet;
  const locked = isSpinning;

  els.spinBtn.disabled = locked || !canAfford;
  els.autoBtn.disabled = locked || !canAfford;
  els.betSelect.disabled = locked;
}

function setStatus(message) {
  els.status.textContent = message;
}

function resetEconomy() {
  const yes = window.confirm("Reset all balances, logs, and spin history?");
  if (!yes) {
    return;
  }

  state.balance = 1000;
  state.spent = 0;
  state.won = 0;
  state.spins = 0;
  state.logs = [];
  writeReels(SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]);
  renderLogs();
  renderStats();
  updateButtonState();
  setStatus("Economy reset. Fresh tokens loaded.");
  persistState();
}

async function copySessionSummary() {
  const summary = [
    "Token Grinder 9000 Session",
    `Balance: ${state.balance} TOK`,
    `Spent: ${state.spent} TOK`,
    `Won: ${state.won} TOK`,
    `Spins: ${state.spins}`,
    "",
    "Recent roasts:",
    ...state.logs.slice(0, 5).map((line, index) => `${index + 1}. ${line}`),
  ].join("\n");

  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    setStatus("Clipboard API unavailable in this browser.");
    return;
  }

  try {
    await navigator.clipboard.writeText(summary);
    setStatus("Session copied to clipboard. Show this to your CFO.");
  } catch (_error) {
    setStatus("Clipboard write failed. Browser declined the request.");
  }
}

function ensureAudioContext() {
  if (!("AudioContext" in window || "webkitAudioContext" in window)) {
    return null;
  }

  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctx();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTones(type) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  const now = ctx.currentTime;
  const patterns = {
    spin: [240, 280, 320],
    win: [420, 560, 730],
    loss: [260, 190],
  };

  const frequencies = patterns[type] ?? [];
  frequencies.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, now + index * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.065, now + index * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + index * 0.08);
    osc.stop(now + index * 0.08 + 0.12);
  });
}

function maybeSpeak(text) {
  if (!els.voiceToggle.checked || !("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.03;
  utterance.pitch = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function maybeVibrate(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
