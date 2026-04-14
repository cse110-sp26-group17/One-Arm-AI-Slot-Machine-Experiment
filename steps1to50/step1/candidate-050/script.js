const SYMBOLS = ["🤖", "🧠", "🪙", "🔥", "🐞", "📉"];
const DEFAULT_STATE = {
  tokens: 120,
  bet: 10,
  inventory: {
    polisher: 0,
    insurance: 0,
    multiplier: 0,
  },
};
const STORAGE_KEY = "prompt-pray-slot-state-v1";

const reels = [
  document.getElementById("reel-1"),
  document.getElementById("reel-2"),
  document.getElementById("reel-3"),
];
const tokenBalanceEl = document.getElementById("token-balance");
const betAmountEl = document.getElementById("bet-amount");
const messageEl = document.getElementById("message");
const spinBtn = document.getElementById("spin-btn");
const betUpBtn = document.getElementById("bet-up");
const betDownBtn = document.getElementById("bet-down");
const shopButtons = document.querySelectorAll(".shop-btn");
const polisherCountEl = document.getElementById("polisher-count");
const insuranceCountEl = document.getElementById("insurance-count");
const multiplierCountEl = document.getElementById("multiplier-count");
const machineEl = document.querySelector(".machine");

let state = loadState();
let spinning = false;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      inventory: {
        ...DEFAULT_STATE.inventory,
        ...(parsed.inventory || {}),
      },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function spinNoise(type = "spin") {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === "win") {
    osc.frequency.value = 700;
    gain.gain.value = 0.06;
    osc.type = "triangle";
  } else if (type === "loss") {
    osc.frequency.value = 180;
    gain.gain.value = 0.05;
    osc.type = "sawtooth";
  } else {
    osc.frequency.value = 280;
    gain.gain.value = 0.03;
    osc.type = "square";
  }

  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
  osc.stop(ctx.currentTime + 0.2);
}

function render() {
  tokenBalanceEl.textContent = String(state.tokens);
  betAmountEl.textContent = String(state.bet);
  polisherCountEl.textContent = `Owned: ${state.inventory.polisher}`;
  insuranceCountEl.textContent = `Owned: ${state.inventory.insurance}`;
  multiplierCountEl.textContent = `Owned: ${state.inventory.multiplier}`;
  spinBtn.disabled = spinning;
}

function setMessage(text) {
  messageEl.textContent = text;
}

function flashResult(type) {
  machineEl.classList.remove("flash-win", "flash-loss");
  if (type === "win") machineEl.classList.add("flash-win");
  if (type === "loss") machineEl.classList.add("flash-loss");
  setTimeout(() => {
    machineEl.classList.remove("flash-win", "flash-loss");
  }, 650);
}

function getMultiplier(symbol) {
  switch (symbol) {
    case "🤖":
      return 8;
    case "🧠":
      return 6;
    case "🪙":
      return 5;
    case "🔥":
      return 4;
    case "🐞":
      return 3;
    default:
      return 2;
  }
}

function buildResult() {
  const boostedWinChance = state.inventory.polisher > 0 ? 0.36 : 0.24;
  const isWin = Math.random() < boostedWinChance;

  if (state.inventory.polisher > 0) {
    state.inventory.polisher -= 1;
  }

  if (isWin) {
    const symbol = randomSymbol();
    return {
      reels: [symbol, symbol, symbol],
      won: true,
      multiplier: getMultiplier(symbol),
    };
  }

  const a = randomSymbol();
  const b = randomSymbol();
  let c = randomSymbol();
  while (c === a && a === b) {
    c = randomSymbol();
  }

  // Force a loss but keep near-miss vibes.
  if (Math.random() < 0.65) {
    return { reels: [a, a, c], won: false, multiplier: 0 };
  }
  return { reels: [a, b, c], won: false, multiplier: 0 };
}

function roastLoss() {
  const lines = [
    "The AI said this spin was guaranteed. It also thinks 9 > 12.",
    "Your prompt lacked synergy and buzzwords. Try adding 'agentic'.",
    "The model is 92% confident you meant to lose that one.",
    "Your tokens were reallocated to cloud costs. Great innovation.",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function flexWin(payout) {
  const lines = [
    `The model hallucinated profits and accidentally manifested ${payout} tokens.`,
    `VCs are nodding politely. You won ${payout} tokens.`,
    `Congrats. Your vague prompt somehow yielded ${payout} tokens.`,
    `For one brief moment, AI delivered value: +${payout} tokens.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function animateReels(finalSymbols) {
  return Promise.all(
    reels.map((reel, index) => {
      reel.classList.add("spinning");
      const interval = setInterval(() => {
        reel.textContent = randomSymbol();
      }, 85);

      return new Promise((resolve) => {
        setTimeout(() => {
          clearInterval(interval);
          reel.classList.remove("spinning");
          reel.textContent = finalSymbols[index];
          resolve();
        }, 820 + index * 260);
      });
    })
  );
}

function triggerHaptics(type) {
  if (!navigator.vibrate) return;
  if (type === "win") navigator.vibrate([20, 40, 60]);
  if (type === "loss") navigator.vibrate(80);
}

async function handleSpin() {
  if (spinning) return;
  if (state.tokens < state.bet) {
    setMessage("You need more tokens. Sell a startup pitch deck and come back.");
    return;
  }

  spinning = true;
  state.tokens -= state.bet;
  render();
  setMessage("Computing destiny with seven layers of unnecessary abstraction...");
  spinNoise("spin");

  const result = buildResult();
  await animateReels(result.reels);

  let payout = 0;
  if (result.won) {
    payout = state.bet * result.multiplier;
    if (state.inventory.multiplier > 0) {
      payout *= 2;
      state.inventory.multiplier -= 1;
      setMessage(`Hype Multiplier activated. The bubble expands: +${payout} tokens.`);
    } else {
      setMessage(flexWin(payout));
    }
    state.tokens += payout;
    flashResult("win");
    spinNoise("win");
    triggerHaptics("win");
  } else {
    if (state.inventory.insurance > 0) {
      const refund = Math.floor(state.bet / 2);
      state.tokens += refund;
      state.inventory.insurance -= 1;
      setMessage(`${roastLoss()} Insurance refunded ${refund} tokens.`);
    } else {
      setMessage(roastLoss());
    }
    flashResult("loss");
    spinNoise("loss");
    triggerHaptics("loss");
  }

  saveState();
  spinning = false;
  render();
}

function buyItem(item) {
  const costs = {
    polisher: 15,
    insurance: 30,
    multiplier: 50,
  };

  const names = {
    polisher: "Prompt Polisher",
    insurance: "Hallucination Insurance",
    multiplier: "Hype Multiplier",
  };

  const cost = costs[item];
  if (!cost) return;

  if (state.tokens < cost) {
    setMessage(`Not enough tokens for ${names[item]}. Try spinning or tweeting a thread.`);
    return;
  }

  state.tokens -= cost;
  state.inventory[item] += 1;
  saveState();
  render();
  setMessage(`Purchased ${names[item]}. Absolutely not financial advice.`);
}

function adjustBet(delta) {
  if (spinning) return;
  const next = Math.max(5, Math.min(100, state.bet + delta));
  state.bet = next;
  saveState();
  render();
}

spinBtn.addEventListener("click", handleSpin);
betUpBtn.addEventListener("click", () => adjustBet(5));
betDownBtn.addEventListener("click", () => adjustBet(-5));

shopButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.dataset.item;
    buyItem(item);
  });
});

render();
