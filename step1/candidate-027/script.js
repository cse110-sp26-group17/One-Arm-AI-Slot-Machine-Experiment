const STORAGE_KEY = "ai_slot_machine_state_v1";

const symbols = [
  { icon: "??", name: "Overfit Bot", weight: 3 },
  { icon: "??", name: "Prompt Engineer", weight: 4 },
  { icon: "??", name: "Token Cache", weight: 5 },
  { icon: "??", name: "Hype Chart", weight: 4 },
  { icon: "??", name: "Inference Bill", weight: 2 },
  { icon: "??", name: "Hotfix", weight: 3 }
];

const spinSnark = [
  "Running one more benchmark no one asked for...",
  "Your tokens are being transformed into buzzwords.",
  "Fine-tuning confidence. Accuracy not included.",
  "Allocating GPUs to vibes.",
  "The model says this spin is definitely probabilistic."
];

const lossSnark = [
  "The model used your tokens to generate a 14-paragraph apology.",
  "Output quality: medium. Token bill: premium.",
  "Inference complete. Financial damage detected.",
  "The AI claims this was a strategic loss.",
  "Your wallet has entered a reinforcement learning phase."
];

const winSnark = [
  "Impressive. The model accidentally helped.",
  "Your prompt engineering worked for once.",
  "Token recovery successful. Investor deck updated.",
  "The algorithm calls this a reproducible miracle.",
  "Profit signal detected. Deploying celebratory jargon."
];

const jackpotSnark = [
  "JACKPOT: the AI reached AGI for exactly one frame.",
  "Viral demo energy unlocked. Tokens raining.",
  "Congrats, you monetized a hallucination.",
  "Your startup is now valued at one trillion pretend dollars."
];

const reels = [
  document.getElementById("reel0"),
  document.getElementById("reel1"),
  document.getElementById("reel2")
];

const tokenBalanceEl = document.getElementById("tokenBalance");
const totalSpentEl = document.getElementById("totalSpent");
const totalWonEl = document.getElementById("totalWon");
const spinCountEl = document.getElementById("spinCount");
const betSizeEl = document.getElementById("betSize");
const spinBtn = document.getElementById("spinBtn");
const bailoutBtn = document.getElementById("bailoutBtn");
const logEl = document.getElementById("log");

const defaultState = {
  balance: 120,
  totalSpent: 0,
  totalWon: 0,
  spins: 0
};

let state = loadState();
let isSpinning = false;

renderStats();
addLog("Welcome to Silicon Strip. Spend responsibly (or at least dramatically).");
updateButtons();

spinBtn.addEventListener("click", handleSpin);
bailoutBtn.addEventListener("click", handleBailout);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultState };
    }

    const parsed = JSON.parse(raw);
    return {
      balance: Number.isFinite(parsed.balance) ? parsed.balance : defaultState.balance,
      totalSpent: Number.isFinite(parsed.totalSpent) ? parsed.totalSpent : defaultState.totalSpent,
      totalWon: Number.isFinite(parsed.totalWon) ? parsed.totalWon : defaultState.totalWon,
      spins: Number.isFinite(parsed.spins) ? parsed.spins : defaultState.spins
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function weightedPick() {
  const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
  let target = Math.random() * totalWeight;

  for (const symbol of symbols) {
    target -= symbol.weight;
    if (target <= 0) {
      return symbol;
    }
  }

  return symbols[symbols.length - 1];
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addLog(message) {
  const line = document.createElement("li");
  line.textContent = message;
  logEl.prepend(line);

  while (logEl.children.length > 8) {
    logEl.removeChild(logEl.lastElementChild);
  }
}

function renderStats() {
  tokenBalanceEl.textContent = state.balance.toLocaleString();
  totalSpentEl.textContent = state.totalSpent.toLocaleString();
  totalWonEl.textContent = state.totalWon.toLocaleString();
  spinCountEl.textContent = state.spins.toLocaleString();
}

function updateButtons() {
  const bet = Number(betSizeEl.value);
  spinBtn.disabled = isSpinning || state.balance < bet;
  bailoutBtn.hidden = state.balance >= bet;
}

function evaluateSpin(result, bet) {
  const [a, b, c] = result.map((item) => item.icon);

  if (a === "??" && b === "??" && c === "??") {
    return { payout: 0, penalty: 15, type: "meltdown", message: "Triple Inference Bill. Finance is crying." };
  }

  if (a === b && b === c) {
    const multipliers = {
      "??": 12,
      "??": 8,
      "??": 5,
      "??": 4,
      "??": 3,
      "??": 2
    };

    const multiplier = multipliers[a] || 2;
    const type = a === "??" ? "jackpot" : "triple";
    return {
      payout: bet * multiplier,
      penalty: 0,
      type,
      message: `${a}${b}${c} landed. Multiplier ${multiplier}x.`
    };
  }

  const matches = a === b || b === c || a === c;
  if (matches) {
    return {
      payout: bet * 2,
      penalty: 0,
      type: "pair",
      message: "Pair match. The AI calls this statistically elegant."
    };
  }

  return { payout: 0, penalty: 0, type: "loss", message: "No match. The model requests more tokens." };
}

function animateReel(reelEl, finalSymbol, durationMs) {
  return new Promise((resolve) => {
    const spinInterval = setInterval(() => {
      reelEl.textContent = weightedPick().icon;
    }, 80);

    setTimeout(() => {
      clearInterval(spinInterval);
      reelEl.textContent = finalSymbol.icon;
      reelEl.parentElement.classList.add("flash");
      setTimeout(() => reelEl.parentElement.classList.remove("flash"), 260);
      resolve();
    }, durationMs);
  });
}

async function handleSpin() {
  if (isSpinning) {
    return;
  }

  const bet = Number(betSizeEl.value);
  if (state.balance < bet) {
    addLog("Insufficient tokens. Try the VC bailout button.");
    updateButtons();
    return;
  }

  isSpinning = true;
  updateButtons();

  state.balance -= bet;
  state.totalSpent += bet;
  state.spins += 1;
  renderStats();
  saveState();

  addLog(`Spin #${state.spins}: spent ${bet} tokens. ${pickRandom(spinSnark)}`);

  const finalSymbols = [weightedPick(), weightedPick(), weightedPick()];

  await Promise.all([
    animateReel(reels[0], finalSymbols[0], 850),
    animateReel(reels[1], finalSymbols[1], 1100),
    animateReel(reels[2], finalSymbols[2], 1350)
  ]);

  const result = evaluateSpin(finalSymbols, bet);

  if (result.penalty > 0) {
    state.balance = Math.max(0, state.balance - result.penalty);
    addLog(`${result.message} Extra penalty: -${result.penalty} tokens.`);
  }

  if (result.payout > 0) {
    state.balance += result.payout;
    state.totalWon += result.payout;

    if (result.type === "jackpot") {
      addLog(`${pickRandom(jackpotSnark)} (+${result.payout} tokens)`);
      if (navigator.vibrate) {
        navigator.vibrate([40, 30, 40, 30, 80]);
      }
    } else {
      addLog(`${result.message} ${pickRandom(winSnark)} (+${result.payout} tokens)`);
    }
  } else if (result.penalty === 0) {
    addLog(`${result.message} ${pickRandom(lossSnark)}`);
  }

  if (state.balance === 0) {
    addLog("Balance hit 0. Your AI startup pivoted into a podcast.");
  }

  renderStats();
  saveState();

  isSpinning = false;
  updateButtons();
}

function handleBailout() {
  if (isSpinning) {
    return;
  }

  state.balance += 50;
  renderStats();
  saveState();
  addLog("VC bailout approved. +50 tokens in exchange for 38% equity.");
  updateButtons();
}

betSizeEl.addEventListener("change", updateButtons);
