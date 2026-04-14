const STORAGE_KEY = "prompt-and-plunder-state-v1";

const SYMBOLS = [
  "CACHE",
  "TOKEN",
  "LAG",
  "PATCH",
  "SPAM",
  "RETRY",
  "HYPE",
  "JAILBREAK",
  "404"
];

const MESSAGE_BANK = {
  start: [
    "Prompt submitted. Waiting for the model to pretend this is deterministic.",
    "You paid the prompt tax. The reels are consulting a random seed.",
    "Request accepted. A GPU somewhere just sighed."
  ],
  twoMatch: [
    "Two symbols matched. The AI calls this almost accurate.",
    "Near miss. Confidence: 97 percent. Correctness: debatable."
  ],
  win: [
    "Token refund approved. The AI calls this a feature.",
    "Profit detected. Someone put this in the launch blog.",
    "You won tokens. The model now believes in merit."
  ],
  jackpot: [
    "JACKPOT. Three matching outputs and zero apologies.",
    "You broke the benchmark. Tokens are raining in low precision.",
    "Full alignment. Finance team is opening a postmortem."
  ],
  loss: [
    "No payout. The machine marked your request as low priority.",
    "The model is confident you lost.",
    "Inference complete. You funded someone else's hype cycle."
  ],
  broke: [
    "Wallet empty. Time to ask investors for another token round.",
    "No tokens left. Try the reset button and call it seed funding."
  ]
};

const reels = [
  document.getElementById("reel-1"),
  document.getElementById("reel-2"),
  document.getElementById("reel-3")
];

const tokensEl = document.getElementById("tokens");
const spinsEl = document.getElementById("spins");
const bestEl = document.getElementById("best");
const betInput = document.getElementById("bet");
const betValue = document.getElementById("bet-value");
const spinBtn = document.getElementById("spin-btn");
const resetBtn = document.getElementById("reset-btn");
const messageEl = document.getElementById("message");
const historyEl = document.getElementById("history");

const state = {
  tokens: 120,
  spins: 0,
  best: 120,
  spinning: false
};

function choose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSymbol() {
  return choose(SYMBOLS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeVibrate(pattern) {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

function safeSpeak(text) {
  if (!window.speechSynthesis) {
    return;
  }

  const speech = new SpeechSynthesisUtterance(text);
  speech.rate = 1;
  speech.pitch = 1.05;
  speech.volume = 0.7;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(speech);
}

function saveState() {
  try {
    const serializable = {
      tokens: state.tokens,
      spins: state.spins,
      best: state.best
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn("Unable to save state", error);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed.tokens === "number") {
      state.tokens = Math.max(0, Math.floor(parsed.tokens));
    }
    if (typeof parsed.spins === "number") {
      state.spins = Math.max(0, Math.floor(parsed.spins));
    }
    if (typeof parsed.best === "number") {
      state.best = Math.max(120, Math.floor(parsed.best));
    }
  } catch (error) {
    console.warn("Unable to load state", error);
  }
}

function setMessage(text, mode = "") {
  messageEl.textContent = text;
  messageEl.classList.remove("win", "loss");
  if (mode) {
    messageEl.classList.add(mode);
  }
}

function addHistory(text) {
  const item = document.createElement("li");
  item.textContent = text;
  historyEl.prepend(item);
  while (historyEl.children.length > 8) {
    historyEl.removeChild(historyEl.lastChild);
  }
}

function updateStats() {
  tokensEl.textContent = String(state.tokens);
  spinsEl.textContent = String(state.spins);
  bestEl.textContent = String(state.best);
  betValue.textContent = String(betInput.value);
}

function evaluate(result, bet) {
  const count = result.reduce((acc, symbol) => {
    acc[symbol] = (acc[symbol] || 0) + 1;
    return acc;
  }, {});

  const maxMatches = Math.max(...Object.values(count));
  const topSymbol = Object.keys(count).find((symbol) => count[symbol] === maxMatches);

  if (maxMatches === 3) {
    if (topSymbol === "JAILBREAK") {
      return { payout: bet * 12, tier: "jackpot", topSymbol };
    }
    return { payout: bet * 8, tier: "jackpot", topSymbol };
  }

  if (maxMatches === 2) {
    return { payout: bet * 3, tier: "twoMatch", topSymbol };
  }

  if (result.includes("TOKEN")) {
    return { payout: bet, tier: "win", topSymbol: "TOKEN" };
  }

  return { payout: 0, tier: "loss", topSymbol };
}

function setControlsDisabled(disabled) {
  spinBtn.disabled = disabled;
  betInput.disabled = disabled;
  resetBtn.disabled = disabled;
}

async function animateSpin(targetResult) {
  const stopTimes = [700, 1050, 1400];
  const jobs = reels.map((reel, index) => {
    reel.classList.add("spinning");
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        reel.textContent = randomSymbol();
      }, 75 + index * 10);

      setTimeout(() => {
        clearInterval(interval);
        reel.classList.remove("spinning");
        reel.textContent = targetResult[index];
        resolve();
      }, stopTimes[index]);
    });
  });

  await Promise.all(jobs);
  await sleep(120);
}

async function spin() {
  if (state.spinning) {
    return;
  }

  const bet = Number(betInput.value);
  if (state.tokens < bet) {
    setMessage(choose(MESSAGE_BANK.broke), "loss");
    addHistory("Spin denied. Not enough tokens to place the bet.");
    safeVibrate([120, 70, 120]);
    return;
  }

  state.spinning = true;
  setControlsDisabled(true);
  state.tokens -= bet;
  state.spins += 1;
  updateStats();
  setMessage(choose(MESSAGE_BANK.start));

  const result = [randomSymbol(), randomSymbol(), randomSymbol()];
  await animateSpin(result);

  const verdict = evaluate(result, bet);
  state.tokens += verdict.payout;
  state.best = Math.max(state.best, state.tokens);

  const symbolsText = result.join(" | ");
  if (verdict.tier === "jackpot") {
    setMessage(`${choose(MESSAGE_BANK.jackpot)} (+${verdict.payout} tokens)`, "win");
    addHistory(`${symbolsText} -> JACKPOT +${verdict.payout}`);
    safeVibrate([80, 60, 80, 60, 160]);
    safeSpeak("Jackpot. Tokens restored.");
  } else if (verdict.tier === "twoMatch") {
    setMessage(`${choose(MESSAGE_BANK.twoMatch)} (+${verdict.payout} tokens)`, "win");
    addHistory(`${symbolsText} -> Pair +${verdict.payout}`);
    safeVibrate([70, 40, 70]);
  } else if (verdict.tier === "win") {
    setMessage(`${choose(MESSAGE_BANK.win)} (+${verdict.payout} tokens)`, "win");
    addHistory(`${symbolsText} -> Refund +${verdict.payout}`);
    safeVibrate(90);
  } else {
    setMessage(`${choose(MESSAGE_BANK.loss)} (-${bet} tokens)`, "loss");
    addHistory(`${symbolsText} -> Lost ${bet}`);
    safeVibrate([130, 40, 130]);
  }

  updateStats();
  saveState();
  state.spinning = false;
  setControlsDisabled(false);
}

function resetGame() {
  if (state.spinning) {
    return;
  }

  const confirmed = window.confirm("Reset your wallet and stats to the initial values?");
  if (!confirmed) {
    return;
  }

  state.tokens = 120;
  state.spins = 0;
  state.best = 120;
  saveState();
  updateStats();
  historyEl.innerHTML = "";
  reels.forEach((reel) => {
    reel.textContent = randomSymbol();
  });
  setMessage("Fresh start deployed. Spend responsibly, or at least creatively.");
}

function init() {
  loadState();
  state.best = Math.max(state.best, state.tokens);
  updateStats();
  reels.forEach((reel) => {
    reel.textContent = randomSymbol();
  });

  betInput.addEventListener("input", updateStats);
  spinBtn.addEventListener("click", spin);
  resetBtn.addEventListener("click", resetGame);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      spin();
    }
  });
}

init();
