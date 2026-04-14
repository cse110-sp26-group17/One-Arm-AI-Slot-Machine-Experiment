const reels = [
  document.getElementById("reel1"),
  document.getElementById("reel2"),
  document.getElementById("reel3"),
];

const tokenEl = document.getElementById("tokens");
const betValueEl = document.getElementById("betValue");
const lastPayoutEl = document.getElementById("lastPayout");
const betRange = document.getElementById("betRange");
const spinButton = document.getElementById("spinButton");
const resetButton = document.getElementById("resetButton");
const messageEl = document.getElementById("message");

const symbols = ["🤖", "🧠", "💸", "🔥", "⚡", "🎯"];
const winLines = [
  "Model converged. Tokens emitted.",
  "Prompt jackpot. You accidentally did AI alignment.",
  "VC funding detected. Infinite runway for 3 seconds.",
  "Benchmark score up, ethics score pending.",
];
const loseLines = [
  "The model used your bet to generate a shrug.",
  "Inference fees ate your lunch money.",
  "You got rate-limited by destiny.",
  "Your prompt was 'be rich'. The model refused.",
];

const STORAGE_KEY = "ai_slot_state_v1";

let state = {
  tokens: 100,
  bet: 10,
  lastPayout: 0,
};

function randomSymbol() {
  const idx = Math.floor(Math.random() * symbols.length);
  return symbols[idx];
}

function pickLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.tokens === "number" && typeof parsed.bet === "number") {
      state = {
        ...state,
        ...parsed,
      };
    }
  } catch {
    // Ignore corrupted local state and continue with defaults.
  }
}

function setMessage(text, tone = "") {
  messageEl.textContent = text;
  messageEl.classList.remove("good", "bad");
  if (tone) {
    messageEl.classList.add(tone);
  }
}

function render() {
  tokenEl.textContent = state.tokens.toString();
  betValueEl.textContent = state.bet.toString();
  lastPayoutEl.textContent = state.lastPayout.toString();

  betRange.max = Math.max(1, Math.min(25, state.tokens || 1)).toString();
  betRange.value = Math.min(state.bet, Number(betRange.max)).toString();

  spinButton.disabled = state.tokens <= 0 || state.bet > state.tokens;
}

function scoreSpin(results, bet) {
  const counts = new Map();
  for (const symbol of results) {
    counts.set(symbol, (counts.get(symbol) || 0) + 1);
  }

  const highest = Math.max(...counts.values());

  let payout = 0;
  if (highest === 3) {
    payout = bet * 8;
  } else if (highest === 2) {
    payout = bet * 2;
  }

  if (results.includes("🎯")) {
    payout += 1;
  }

  return payout;
}

function animateSpin(finalSymbols) {
  return new Promise((resolve) => {
    let ticks = 0;
    const maxTicks = 13;

    reels.forEach((reel) => reel.classList.add("spinning"));

    const interval = setInterval(() => {
      ticks += 1;
      reels.forEach((reel) => {
        reel.textContent = randomSymbol();
      });

      if (ticks >= maxTicks) {
        clearInterval(interval);
        finalSymbols.forEach((symbol, i) => {
          reels[i].textContent = symbol;
          reels[i].classList.remove("spinning");
        });
        resolve();
      }
    }, 75);
  });
}

async function spin() {
  if (state.bet > state.tokens || state.tokens <= 0) {
    setMessage("You are out of tokens. Reset to keep losing efficiently.", "bad");
    return;
  }

  spinButton.disabled = true;

  const bet = state.bet;
  state.tokens -= bet;

  const results = [randomSymbol(), randomSymbol(), randomSymbol()];
  await animateSpin(results);

  const payout = scoreSpin(results, bet);
  state.tokens += payout;
  state.lastPayout = payout;

  if (payout > bet) {
    setMessage(`${pickLine(winLines)} +${payout} tokens`, "good");
  } else if (payout > 0) {
    setMessage(`Partial win. Model confidence: medium. +${payout} tokens`, "good");
  } else {
    setMessage(`${pickLine(loseLines)} -${bet} tokens`, "bad");
  }

  if (state.tokens === 0) {
    setMessage("Bankrupt. The AI has consumed all tokens. Press reset for another training round.", "bad");
  }

  saveState();
  render();
}

function resetGame() {
  state.tokens = 100;
  state.bet = 10;
  state.lastPayout = 0;
  reels[0].textContent = "🤖";
  reels[1].textContent = "⚡";
  reels[2].textContent = "🧠";
  setMessage("Bankroll reset. New quarter, same bad product metrics.");
  saveState();
  render();
}

betRange.addEventListener("input", () => {
  state.bet = Number(betRange.value);
  render();
  saveState();
});

spinButton.addEventListener("click", spin);
resetButton.addEventListener("click", resetGame);

loadState();
render();
