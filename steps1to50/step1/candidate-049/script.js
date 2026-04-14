const STARTING_BALANCE = 1000;
const STORAGE_KEY = "ai-token-slots-v1";

const SYMBOLS = [
  { icon: "🤖", name: "ChatBot", weight: 14, triple: 9 },
  { icon: "🧠", name: "GPU Brain", weight: 12, triple: 11 },
  { icon: "🪙", name: "Token", weight: 20, triple: 7 },
  { icon: "📉", name: "Model Drift", weight: 18, triple: 6 },
  { icon: "💸", name: "Burn Rate", weight: 16, triple: 8 },
  { icon: "🧾", name: "API Bill", weight: 13, triple: 10 },
  { icon: "👀", name: "Hallucination", weight: 7, triple: 16 }
];

const balanceEl = document.getElementById("balance");
const spentEl = document.getElementById("spent");
const wonEl = document.getElementById("won");
const highBalanceEl = document.getElementById("high-balance");
const betInput = document.getElementById("bet");
const betOutput = document.getElementById("bet-output");
const messageEl = document.getElementById("message");
const boostPillEl = document.getElementById("boost-pill");
const spinBtn = document.getElementById("spin-btn");
const maxBtn = document.getElementById("max-btn");
const resetBtn = document.getElementById("reset-btn");
const shareBtn = document.getElementById("share-btn");
const shopButtons = [...document.querySelectorAll(".shop-item[data-cost]")];
const reels = [
  document.getElementById("reel-1"),
  document.getElementById("reel-2"),
  document.getElementById("reel-3")
];

let state = loadState();
let isSpinning = false;
let audioCtx = null;

render();

betInput.addEventListener("input", () => {
  betOutput.value = betInput.value;
});

spinBtn.addEventListener("click", () => spin(Number(betInput.value)));
maxBtn.addEventListener("click", () => spin(Number(betInput.max)));

resetBtn.addEventListener("click", () => {
  state = freshState();
  saveState();
  render();
  setMessage("System reset complete. Your model forgot everything.", "loss");
});

shareBtn.addEventListener("click", async () => {
  const text = `I have ${state.balance} AI tokens, spent ${state.spent}, won ${state.won}, and still no AGI.`;
  try {
    await navigator.clipboard.writeText(text);
    setMessage("Copied brag text. Post it before the benchmark gets debunked.", "win");
  } catch {
    setMessage("Clipboard blocked. Even your browser is skeptical.", "loss");
  }
});

shopButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const cost = Number(button.dataset.cost);
    const boost = Number(button.dataset.boost);
    if (state.balance < cost) {
      shakeLoss();
      setMessage(`Need ${cost} tokens. You currently have startup energy and no budget.`, "loss");
      return;
    }

    state.balance -= cost;
    state.spent += cost;
    state.luckySpins += boost;
    state.highBalance = Math.max(state.highBalance, state.balance);
    saveState();
    render();
    chirp(620, 0.06, "square");
    setMessage(
      `Purchased premium AI vibes for ${cost} tokens. Lucky spins +${boost}.`,
      "win"
    );
  });
});

async function spin(bet) {
  if (isSpinning) return;
  if (!Number.isFinite(bet) || bet < Number(betInput.min)) return;

  if (state.balance < bet) {
    shakeLoss();
    setMessage("Insufficient tokens. Try selling your unused side project.", "loss");
    return;
  }

  isSpinning = true;
  toggleButtons(true);

  state.balance -= bet;
  state.spent += bet;
  state.spins += 1;
  render();

  const result = pickResult(state.luckySpins > 0);
  if (state.luckySpins > 0) state.luckySpins -= 1;

  const reveal = await animateReels(result.icons);
  if (!reveal) return;

  const payout = computePayout(result.names, bet);
  state.balance += payout;
  state.won += payout;
  state.highBalance = Math.max(state.highBalance, state.balance);

  if (payout > bet) {
    chirp(880, 0.08, "triangle");
    chirp(1200, 0.08, "triangle", 0.09);
    vibrate([45, 20, 45]);
    setMessage(winMessage(result.names, bet, payout), "win");
  } else if (payout > 0) {
    chirp(720, 0.06, "sine");
    vibrate([20]);
    setMessage(`You recovered ${payout} tokens. Break-even is still a myth.`, "win");
  } else {
    chirp(180, 0.1, "sawtooth");
    shakeLoss();
    setMessage(lossMessage(result.names, bet), "loss");
  }

  if (state.balance <= 0) {
    setMessage("Bankrupt. The house says: please upgrade to AI Enterprise.", "loss");
  }

  saveState();
  render();

  isSpinning = false;
  toggleButtons(false);
}

function pickResult(isLucky) {
  const icons = [];
  const names = [];
  for (let i = 0; i < 3; i += 1) {
    const picked = weightedPick(isLucky ? 0.15 : 0);
    icons.push(picked.icon);
    names.push(picked.name);
  }
  return { icons, names };
}

function weightedPick(luckyFactor = 0) {
  const boosted = SYMBOLS.map((s) => {
    const jackpotBoost = s.name === "Hallucination" || s.name === "GPU Brain" ? 1 + luckyFactor : 1;
    return { ...s, adjusted: s.weight * jackpotBoost };
  });
  const total = boosted.reduce((sum, s) => sum + s.adjusted, 0);
  let r = Math.random() * total;
  for (const symbol of boosted) {
    r -= symbol.adjusted;
    if (r <= 0) return symbol;
  }
  return boosted[boosted.length - 1];
}

function computePayout(names, bet) {
  const counts = names.reduce((acc, n) => {
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topName, topCount] = entries[0];

  if (topCount === 3) {
    const symbol = SYMBOLS.find((s) => s.name === topName);
    return Math.round(bet * (symbol?.triple ?? 5));
  }

  if (topCount === 2) {
    return Math.round(bet * 1.7);
  }

  if (names.includes("Token") && names.includes("API Bill") && names.includes("Burn Rate")) {
    return Math.round(bet * 3.2);
  }

  return 0;
}

function winMessage(names, bet, payout) {
  const unique = new Set(names).size;
  if (unique === 1) {
    return `JACKPOT: ${names[0]} x3. Bet ${bet}, won ${payout}. AI hype cycle approved this spin.`;
  }
  return `Nice win: bet ${bet}, won ${payout}. You escaped token poverty for one minute.`;
}

function lossMessage(names, bet) {
  const combo = names.join(" + ");
  const roasts = [
    `No payout. ${combo}. Your prompt was "please work?"`,
    `Lost ${bet} tokens. ${combo}. This model needs more "thinking budget."`,
    `Spin failed profit test. ${combo}. Investors now requesting a pivot.`,
    `You burned ${bet} tokens. ${combo}. Welcome to normal AI operations.`
  ];
  return roasts[Math.floor(Math.random() * roasts.length)];
}

async function animateReels(finalIcons) {
  const spins = reels.map((reel, idx) => animateOneReel(reel, finalIcons[idx], 520 + idx * 210));
  await Promise.all(spins);
  return true;
}

function animateOneReel(el, finalIcon, duration) {
  return new Promise((resolve) => {
    el.classList.add("spinning");
    const ticker = window.setInterval(() => {
      el.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon;
    }, 70);

    window.setTimeout(() => {
      clearInterval(ticker);
      el.textContent = finalIcon;
      el.classList.remove("spinning");
      resolve();
    }, duration);
  });
}

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.classList.remove("win", "loss");
  if (type) messageEl.classList.add(type);
}

function freshState() {
  return {
    balance: STARTING_BALANCE,
    spent: 0,
    won: 0,
    spins: 0,
    highBalance: STARTING_BALANCE,
    luckySpins: 0
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return freshState();
    return {
      balance: Number(parsed.balance) || STARTING_BALANCE,
      spent: Number(parsed.spent) || 0,
      won: Number(parsed.won) || 0,
      spins: Number(parsed.spins) || 0,
      highBalance: Number(parsed.highBalance) || STARTING_BALANCE,
      luckySpins: Number(parsed.luckySpins) || 0
    };
  } catch {
    return freshState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  balanceEl.textContent = String(state.balance);
  spentEl.textContent = String(state.spent);
  wonEl.textContent = String(state.won);
  highBalanceEl.textContent = String(state.highBalance);
  boostPillEl.textContent = `Lucky Spins: ${state.luckySpins}`;

  const affordable = Math.min(Math.max(10, state.balance), 250);
  betInput.max = String(Math.max(10, affordable));
  if (Number(betInput.value) > Number(betInput.max)) betInput.value = betInput.max;
  betOutput.value = betInput.value;
}

function toggleButtons(disabled) {
  [spinBtn, maxBtn, resetBtn, shareBtn, ...shopButtons].forEach((btn) => {
    btn.disabled = disabled;
  });
}

function chirp(freq, duration, type = "sine", delay = 0) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  } catch {
    // Audio API unavailable or blocked; silently continue.
  }
}

function getAudioContext() {
  if (!audioCtx) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error("No Web Audio API");
    audioCtx = new Context();
  }
  return audioCtx;
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
