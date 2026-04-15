const symbols = ["BOT", "GPU", "HYPE", "404", "COIN", "LOOP"];

const triplePayouts = {
  BOT: 7,
  GPU: 6,
  HYPE: 4,
  404: 12,
  COIN: 10,
  LOOP: 5
};

const state = {
  balance: 180,
  bet: 10,
  minBet: 5,
  maxBet: 50,
  spins: 0,
  totalSpent: 0,
  totalWon: 0,
  isSpinning: false,
  boosts: {
    payoutBoost: 0,
    guaranteePair: false,
    lossRefund: 0
  }
};

const shopItems = {
  benchmark: {
    cost: 30,
    apply() {
      state.boosts.guaranteePair = true;
      addLog("You bribed the benchmark. Next spin gets at least one pair.", "shop");
    }
  },
  prompt: {
    cost: 20,
    apply() {
      state.boosts.payoutBoost = Math.min(state.boosts.payoutBoost + 0.25, 1);
      addLog("Prompt polished. Next winning spin pays +25%.", "shop");
    }
  },
  intern: {
    cost: 18,
    apply() {
      state.boosts.lossRefund = Math.min(Math.max(state.boosts.lossRefund, 0.5), 1);
      addLog("An intern accepted blame. Next loss refunds 50% of your bet.", "shop");
    }
  }
};

const balanceEl = document.querySelector("#balance");
const totalSpentEl = document.querySelector("#total-spent");
const totalWonEl = document.querySelector("#total-won");
const spinCountEl = document.querySelector("#spin-count");
const netTokensEl = document.querySelector("#net-tokens");
const betValueEl = document.querySelector("#bet-value");
const betDownBtn = document.querySelector("#bet-down");
const betUpBtn = document.querySelector("#bet-up");
const spinButton = document.querySelector("#spin-button");
const logList = document.querySelector("#log-list");
const buffLine = document.querySelector("#buff-line");
const reels = [
  document.querySelector("#reel-0"),
  document.querySelector("#reel-1"),
  document.querySelector("#reel-2")
];
const shopButtons = [...document.querySelectorAll(".shop-item")];

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function getSpinSymbols() {
  const result = [randomSymbol(), randomSymbol(), randomSymbol()];

  if (state.boosts.guaranteePair) {
    const hasPair = new Set(result).size < result.length;
    if (!hasPair) {
      result[2] = result[Math.floor(Math.random() * 2)];
    }
    state.boosts.guaranteePair = false;
  }

  return result;
}

function evaluateSpin(outcome) {
  const counts = {};
  for (const symbol of outcome) {
    counts[symbol] = (counts[symbol] ?? 0) + 1;
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topSymbol, topCount] = entries[0];

  if (topCount === 3) {
    return {
      type: "jackpot",
      multiplier: triplePayouts[topSymbol] ?? 4,
      message: `Triple ${topSymbol}. Your AI just won a benchmark nobody has heard of.`
    };
  }

  if (topCount === 2) {
    return {
      type: "pair",
      multiplier: 2,
      message: `A pair of ${topSymbol}. Your model is confidently half-correct.`
    };
  }

  const lineup = outcome.join("-");
  if (lineup === "BOT-GPU-HYPE" || lineup === "HYPE-GPU-BOT") {
    return {
      type: "demo",
      multiplier: 5,
      message: "Cinematic product demo sequence. Investors are throwing tokens."
    };
  }

  return {
    type: "loss",
    multiplier: 0,
    message: "The model hallucinated compliance. Tokens were consumed for science."
  };
}

function formatTokens(value) {
  return `${value} TOK`;
}

function updateBuffLine() {
  const notes = [];
  if (state.boosts.guaranteePair) {
    notes.push("Benchmark bribe: guaranteed pair on next spin");
  }
  if (state.boosts.payoutBoost > 0) {
    notes.push(`Prompt polish: +${Math.round(state.boosts.payoutBoost * 100)}% next win`);
  }
  if (state.boosts.lossRefund > 0) {
    notes.push(`Intern shield: ${Math.round(state.boosts.lossRefund * 100)}% refund on next loss`);
  }

  buffLine.textContent = notes.length ? notes.join(" | ") : "No active boosts. Raw chaos only.";
}

function updateUI() {
  balanceEl.textContent = formatTokens(state.balance);
  totalSpentEl.textContent = String(state.totalSpent);
  totalWonEl.textContent = String(state.totalWon);
  spinCountEl.textContent = String(state.spins);
  netTokensEl.textContent = String(state.totalWon - state.totalSpent);
  betValueEl.textContent = formatTokens(state.bet);
  updateBuffLine();

  const canAdjustBet = !state.isSpinning;
  betDownBtn.disabled = !canAdjustBet || state.bet <= state.minBet;
  betUpBtn.disabled = !canAdjustBet || state.bet >= state.maxBet;
  spinButton.disabled = state.isSpinning || state.balance < state.bet;

  for (const button of shopButtons) {
    const key = button.dataset.item;
    const cost = shopItems[key].cost;
    button.disabled = state.isSpinning || state.balance < cost;
  }
}

function addLog(message, type = "system") {
  const item = document.createElement("li");
  if (type !== "system") {
    item.classList.add(type);
  }
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  item.innerHTML = `<span class="stamp">${stamp}</span>${message}`;
  logList.prepend(item);

  while (logList.children.length > 8) {
    logList.removeChild(logList.lastElementChild);
  }
}

function animateReels(finalSymbols) {
  return new Promise((resolve) => {
    let finished = 0;

    reels.forEach((reelEl, index) => {
      const intervalId = window.setInterval(() => {
        reelEl.textContent = randomSymbol();
      }, 80);

      const stopDelay = 750 + index * 280 + Math.floor(Math.random() * 140);
      window.setTimeout(() => {
        clearInterval(intervalId);
        reelEl.textContent = finalSymbols[index];
        finished += 1;
        if (finished === reels.length) {
          resolve();
        }
      }, stopDelay);
    });
  });
}

async function runSpin() {
  if (state.isSpinning || state.balance < state.bet) {
    return;
  }

  state.isSpinning = true;
  state.balance -= state.bet;
  state.totalSpent += state.bet;
  state.spins += 1;
  updateUI();

  addLog(`Spent ${state.bet} tokens to retrain the vibe model.`, "system");

  const outcome = getSpinSymbols();
  await animateReels(outcome);

  const result = evaluateSpin(outcome);

  if (result.multiplier > 0) {
    let payout = Math.round(state.bet * result.multiplier);
    if (state.boosts.payoutBoost > 0) {
      payout = Math.round(payout * (1 + state.boosts.payoutBoost));
      addLog(`Prompt polish triggered: payout boosted to ${payout} tokens.`, "shop");
      state.boosts.payoutBoost = 0;
    }
    state.balance += payout;
    state.totalWon += payout;
    addLog(`${result.message} You won ${payout} tokens.`, "win");
  } else {
    addLog(result.message, "loss");
    if (state.boosts.lossRefund > 0) {
      const refund = Math.round(state.bet * state.boosts.lossRefund);
      state.balance += refund;
      state.totalWon += refund;
      addLog(`Intern shield activated. ${refund} tokens refunded.`, "shop");
      state.boosts.lossRefund = 0;
    }
  }

  state.isSpinning = false;
  updateUI();
}

function adjustBet(delta) {
  if (state.isSpinning) {
    return;
  }
  state.bet = Math.max(state.minBet, Math.min(state.maxBet, state.bet + delta));
  updateUI();
}

function buyBoost(key) {
  const item = shopItems[key];
  if (!item || state.isSpinning) {
    return;
  }
  if (state.balance < item.cost) {
    addLog("Not enough tokens. Maybe launch another AI startup.", "loss");
    return;
  }

  state.balance -= item.cost;
  state.totalSpent += item.cost;
  item.apply();
  updateUI();
}

betDownBtn.addEventListener("click", () => adjustBet(-5));
betUpBtn.addEventListener("click", () => adjustBet(5));
spinButton.addEventListener("click", runSpin);

for (const button of shopButtons) {
  button.addEventListener("click", () => buyBoost(button.dataset.item));
}

addLog("Casino booted. Please pretend this is responsible AI.", "system");
updateUI();
