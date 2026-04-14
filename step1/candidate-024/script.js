const SYMBOLS = [
  { icon: "??", label: "Autocomplete" },
  { icon: "??", label: "Synthetic Insight" },
  { icon: "??", label: "Benchmark Drop" },
  { icon: "??", label: "Token Refund" },
  { icon: "??", label: "Prompt Invoice" },
  { icon: "??", label: "GPU Burn" },
  { icon: "??", label: "Guardrail" },
  { icon: "??", label: "Parrot Mode" },
  { icon: "??", label: "Hallucination" }
];

const STORAGE_KEY = "aiSlotStateV1";
const DAILY_CLAIM_KEY = "aiSlotDailyClaim";

const defaultState = {
  wallet: 1000,
  spinCost: 25,
  bestWin: 0,
  totalSpins: 0,
  totalSpent: 0,
  totalWon: 0
};

let state = loadState();
let spinning = false;

const ui = {
  wallet: document.getElementById("wallet"),
  spinCost: document.getElementById("spinCost"),
  bestWin: document.getElementById("bestWin"),
  totalSpins: document.getElementById("totalSpins"),
  totalSpent: document.getElementById("totalSpent"),
  totalWon: document.getElementById("totalWon"),
  egoScore: document.getElementById("egoScore"),
  resultLine: document.getElementById("resultLine"),
  bet: document.getElementById("bet"),
  betDown: document.getElementById("betDown"),
  betUp: document.getElementById("betUp"),
  spinBtn: document.getElementById("spinBtn"),
  dailyBtn: document.getElementById("dailyBtn"),
  resetBtn: document.getElementById("resetBtn"),
  reels: Array.from(document.querySelectorAll(".reel"))
};

const audioCtx = window.AudioContext ? new AudioContext() : null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clampCost(value) {
  return Math.max(10, Math.min(150, value));
}

function updateUI() {
  ui.wallet.textContent = state.wallet.toLocaleString();
  ui.spinCost.textContent = state.spinCost.toLocaleString();
  ui.bestWin.textContent = state.bestWin.toLocaleString();
  ui.totalSpins.textContent = state.totalSpins.toLocaleString();
  ui.totalSpent.textContent = state.totalSpent.toLocaleString();
  ui.totalWon.textContent = state.totalWon.toLocaleString();

  const ego = Math.min(100, Math.round((state.totalWon / Math.max(1, state.totalSpent)) * 100));
  ui.egoScore.textContent = ego;

  ui.bet.value = String(state.spinCost);
  ui.spinBtn.disabled = spinning || state.wallet < state.spinCost;
}

function setResult(text, mode = "") {
  ui.resultLine.textContent = text;
  ui.resultLine.classList.remove("win", "loss");
  if (mode) ui.resultLine.classList.add(mode);
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function playTone(freq, duration = 0.1, type = "triangle", gain = 0.06) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.stop(now + duration);
}

function buzz(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function jokeForWin(win, combo) {
  if (combo.every((x) => x.label === "Token Refund")) {
    return `Jackpot: ${win} tokens refunded. Finance says it was a rounding error.`;
  }
  if (combo.some((x) => x.label === "Hallucination")) {
    return `You won ${win} tokens for confidently citing a paper that does not exist.`;
  }
  return `Nice. +${win} tokens. The model now claims it planned this outcome.`;
}

function jokeForLoss(combo, cost) {
  if (combo.some((x) => x.label === "Prompt Invoice")) {
    return `-${cost} tokens. You were billed for "advanced reasoning vibes".`;
  }
  if (combo.every((x) => x.label === "Parrot Mode")) {
    return `-${cost} tokens. You paid to hear your own prompt rephrased.`;
  }
  return `-${cost} tokens. Training complete: your wallet learned a lesson.`;
}

function computePayout(combo, cost) {
  const labels = combo.map((s) => s.label);
  const counts = labels.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const maxMatch = Math.max(...Object.values(counts));

  if (maxMatch === 3) return Math.floor(cost * 4.5);
  if (maxMatch === 2) return Math.floor(cost * 1.8);
  if (labels.includes("Token Refund") && labels.includes("Guardrail")) return Math.floor(cost * 1.2);
  return 0;
}

function spinAnimation() {
  return new Promise((resolve) => {
    ui.reels.forEach((reel) => reel.classList.add("spinning"));

    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      ui.reels.forEach((reel) => {
        reel.textContent = randomSymbol().icon;
      });
      playTone(240 + (tick % 6) * 40, 0.05, "square", 0.03);

      if (tick > 14) {
        clearInterval(timer);
        ui.reels.forEach((reel) => reel.classList.remove("spinning"));
        resolve();
      }
    }, 70);
  });
}

async function spin() {
  if (spinning) return;
  if (state.wallet < state.spinCost) {
    setResult("Not enough tokens. Even AI cannot infer money from nothing.", "loss");
    playTone(140, 0.18, "sawtooth", 0.05);
    return;
  }

  spinning = true;
  updateUI();

  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  state.wallet -= state.spinCost;
  state.totalSpent += state.spinCost;
  state.totalSpins += 1;

  await spinAnimation();

  const combo = [randomSymbol(), randomSymbol(), randomSymbol()];
  combo.forEach((symbol, idx) => {
    ui.reels[idx].textContent = symbol.icon;
  });

  const payout = computePayout(combo, state.spinCost);
  if (payout > 0) {
    state.wallet += payout;
    state.totalWon += payout;
    state.bestWin = Math.max(state.bestWin, payout);
    setResult(jokeForWin(payout, combo), "win");
    playTone(520, 0.08, "triangle", 0.07);
    setTimeout(() => playTone(720, 0.1, "triangle", 0.07), 90);
    buzz(35);
  } else {
    setResult(jokeForLoss(combo, state.spinCost), "loss");
    playTone(120, 0.2, "sawtooth", 0.05);
    buzz([20, 30, 20]);
  }

  spinning = false;
  saveState();
  updateUI();
}

function claimDaily() {
  const today = new Date().toISOString().slice(0, 10);
  const claimed = localStorage.getItem(DAILY_CLAIM_KEY);
  if (claimed === today) {
    setResult("Daily pack already claimed. Come back when the model forgets.", "loss");
    return;
  }

  const grant = 200;
  state.wallet += grant;
  state.totalWon += grant;
  localStorage.setItem(DAILY_CLAIM_KEY, today);
  saveState();
  updateUI();
  setResult(`Daily prompt pack unlocked: +${grant} tokens.`, "win");
  playTone(620, 0.12, "triangle", 0.06);
}

function resetWallet() {
  state = { ...defaultState, spinCost: state.spinCost };
  localStorage.removeItem(DAILY_CLAIM_KEY);
  saveState();
  updateUI();
  setResult("Wallet reset. Your financial model was overfit anyway.");
}

function changeBet(delta) {
  state.spinCost = clampCost(state.spinCost + delta);
  saveState();
  updateUI();
}

ui.bet.addEventListener("input", (event) => {
  state.spinCost = clampCost(Number(event.target.value));
  saveState();
  updateUI();
});
ui.betDown.addEventListener("click", () => changeBet(-5));
ui.betUp.addEventListener("click", () => changeBet(5));
ui.spinBtn.addEventListener("click", spin);
ui.dailyBtn.addEventListener("click", claimDaily);
ui.resetBtn.addEventListener("click", resetWallet);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    spin();
  }
});

updateUI();