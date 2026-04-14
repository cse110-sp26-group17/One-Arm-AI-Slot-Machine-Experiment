const SYMBOLS = [
  "Token Printer",
  "Hotfix Friday",
  "Hallucination",
  "Prompt Leak",
  "GPU Meltdown",
  "Captcha Wall",
];

const PAYOUTS = {
  "Token Printer": 8,
  "Hotfix Friday": 6,
  Hallucination: 5,
};

const STORAGE_KEY = "ai-slot-machine-v1";
const STARTING_TOKENS = 120;
const FEED_LIMIT = 7;

const state = {
  tokens: STARTING_TOKENS,
  totalSpins: 0,
  totalWins: 0,
  biggestWin: 0,
  selectedBet: 10,
  isMuted: false,
  isSpinning: false,
  feed: [],
};

const refs = {
  tokenBalance: document.getElementById("tokenBalance"),
  totalSpins: document.getElementById("totalSpins"),
  totalWins: document.getElementById("totalWins"),
  biggestWin: document.getElementById("biggestWin"),
  spinButton: document.getElementById("spinButton"),
  muteButton: document.getElementById("muteButton"),
  resetButton: document.getElementById("resetButton"),
  resultLine: document.getElementById("resultLine"),
  feedList: document.getElementById("feedList"),
  betButtons: document.getElementById("betButtons"),
  reels: [...document.querySelectorAll(".reel-window")],
  symbols: [...document.querySelectorAll(".reel-symbol")],
};

let audioContext = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return;

    state.tokens = Number.isFinite(data.tokens) ? Math.max(0, data.tokens) : STARTING_TOKENS;
    state.totalSpins = Number.isFinite(data.totalSpins) ? Math.max(0, data.totalSpins) : 0;
    state.totalWins = Number.isFinite(data.totalWins) ? Math.max(0, data.totalWins) : 0;
    state.biggestWin = Number.isFinite(data.biggestWin) ? Math.max(0, data.biggestWin) : 0;
    state.selectedBet = [5, 10, 25].includes(data.selectedBet) ? data.selectedBet : 10;
    state.isMuted = Boolean(data.isMuted);
    state.feed = Array.isArray(data.feed) ? data.feed.slice(0, FEED_LIMIT) : [];
  } catch (error) {
    console.warn("Could not restore game state.", error);
  }
}

function saveState() {
  const persistable = {
    tokens: state.tokens,
    totalSpins: state.totalSpins,
    totalWins: state.totalWins,
    biggestWin: state.biggestWin,
    selectedBet: state.selectedBet,
    isMuted: state.isMuted,
    feed: state.feed.slice(0, FEED_LIMIT),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch (error) {
    console.warn("Could not save game state.", error);
  }
}

function renderStats() {
  refs.tokenBalance.textContent = `${state.tokens}`;
  refs.totalSpins.textContent = `${state.totalSpins}`;
  refs.totalWins.textContent = `${state.totalWins}`;
  refs.biggestWin.textContent = `${state.biggestWin}`;

  refs.spinButton.disabled = state.isSpinning || state.tokens < state.selectedBet;
  refs.spinButton.textContent = `Spin and Spend ${state.selectedBet}`;
  refs.muteButton.textContent = state.isMuted ? "Sound Off" : "Sound On";

  [...refs.betButtons.querySelectorAll("button")].forEach((button) => {
    const isActive = Number(button.dataset.bet) === state.selectedBet;
    button.classList.toggle("is-active", isActive);
    button.disabled = state.isSpinning;
  });
}

function renderFeed() {
  refs.feedList.innerHTML = "";
  const lines = state.feed.length ? state.feed : ["No spins yet. The model is warming up and pretending to know probability."];

  lines.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    refs.feedList.appendChild(li);
  });
}

function setResult(text, mood = "neutral") {
  refs.resultLine.textContent = text;
  refs.resultLine.classList.remove("good", "bad");

  if (mood === "good") refs.resultLine.classList.add("good");
  if (mood === "bad") refs.resultLine.classList.add("bad");
}

function addFeedLine(text) {
  state.feed.unshift(text);
  if (state.feed.length > FEED_LIMIT) state.feed.length = FEED_LIMIT;
  renderFeed();
}

function ensureAudioContext() {
  if (!audioContext) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    audioContext = new Context();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function chirp({ frequency, duration, type = "square", gain = 0.04 }) {
  if (state.isMuted) return;
  const context = ensureAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const amplifier = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  amplifier.gain.value = gain;
  oscillator.connect(amplifier);
  amplifier.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function vibrate(pattern) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function scoreSpin(results, bet) {
  const counts = new Map();
  results.forEach((symbol) => {
    counts.set(symbol, (counts.get(symbol) || 0) + 1);
  });

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topSymbol, topCount] = entries[0];

  if (topCount === 3) {
    const multiplier = PAYOUTS[topSymbol] ?? 3;
    return {
      win: bet * multiplier,
      mood: "jackpot",
      label: `Three ${topSymbol}`,
    };
  }

  if (topCount === 2) {
    return {
      win: bet * 2,
      mood: "nice",
      label: `Two ${topSymbol}`,
    };
  }

  if (results.includes("Token Printer")) {
    return {
      win: bet + 1,
      mood: "save",
      label: "Token Printer saved your spin",
    };
  }

  return {
    win: 0,
    mood: "miss",
    label: "No match",
  };
}

function generateRoast(results, score, bet) {
  const resultText = results.join(" | ");

  if (score.win === 0) {
    return `Spent ${bet} tokens on ${resultText}. The AI says "trust the process" and asks for more compute.`;
  }

  if (score.mood === "jackpot") {
    return `Huge hit: ${score.label}. You won ${score.win} tokens, and the AI immediately claims it predicted this.`;
  }

  if (score.mood === "save") {
    return `Lucky rescue from ${resultText}. You got ${score.win} tokens back before the model could hallucinate a receipt.`;
  }

  return `Solid spin: ${score.label}. You won ${score.win} tokens while the AI rewrites its confidence report.`;
}

async function spinReel(index) {
  const reel = refs.reels[index];
  const symbolElement = refs.symbols[index];
  const duration = 700 + index * 280;
  const interval = 90;

  reel.classList.add("is-spinning");
  const started = Date.now();

  while (Date.now() - started < duration) {
    symbolElement.textContent = randomSymbol();
    await wait(interval);
  }

  const finalSymbol = randomSymbol();
  symbolElement.textContent = finalSymbol;
  reel.classList.remove("is-spinning");
  chirp({ frequency: 250 + index * 60, duration: 0.06 });
  return finalSymbol;
}

async function handleSpin() {
  if (state.isSpinning) return;
  if (state.tokens < state.selectedBet) {
    setResult("Not enough tokens. Ask your nearest venture capitalist for runway.", "bad");
    addFeedLine("Spin blocked: token balance too low.");
    renderFeed();
    return;
  }

  state.isSpinning = true;
  state.tokens -= state.selectedBet;
  state.totalSpins += 1;
  setResult(`Spinning... spent ${state.selectedBet} tokens to rent an LLM for six seconds.`);
  renderStats();
  saveState();
  vibrate(20);
  chirp({ frequency: 170, duration: 0.12, type: "sawtooth" });

  const [a, b, c] = await Promise.all([spinReel(0), spinReel(1), spinReel(2)]);
  const results = [a, b, c];
  const score = scoreSpin(results, state.selectedBet);

  state.tokens += score.win;
  state.biggestWin = Math.max(state.biggestWin, score.win);
  if (score.win > 0) state.totalWins += 1;

  const roast = generateRoast(results, score, state.selectedBet);
  addFeedLine(roast);

  if (score.win > 0) {
    setResult(`+${score.win} tokens. ${score.label}.`, "good");
    chirp({ frequency: 600, duration: 0.09, type: "triangle", gain: 0.05 });
    await wait(80);
    chirp({ frequency: 760, duration: 0.12, type: "triangle", gain: 0.05 });
    vibrate([30, 40, 55]);
  } else {
    setResult("No payout. The AI recommends trying exactly the same thing again.", "bad");
    chirp({ frequency: 125, duration: 0.1, type: "square", gain: 0.035 });
  }

  state.isSpinning = false;
  renderStats();
  saveState();
}

function handleBetChange(event) {
  const button = event.target.closest("button[data-bet]");
  if (!button) return;
  const bet = Number(button.dataset.bet);
  if (![5, 10, 25].includes(bet)) return;
  state.selectedBet = bet;
  renderStats();
  saveState();
}

function handleMuteToggle() {
  state.isMuted = !state.isMuted;
  renderStats();
  saveState();
}

function handleReset() {
  const accepted = window.confirm("Reset tokens and history? Even the AI cannot undo this.");
  if (!accepted) return;

  state.tokens = STARTING_TOKENS;
  state.totalSpins = 0;
  state.totalWins = 0;
  state.biggestWin = 0;
  state.selectedBet = 10;
  state.feed = [];
  state.isSpinning = false;
  setResult("Progress reset. Fresh tokens loaded and the AI has learned nothing.");
  refs.symbols.forEach((symbol) => {
    symbol.textContent = randomSymbol();
  });
  renderStats();
  renderFeed();
  saveState();
}

function boot() {
  loadState();
  refs.symbols.forEach((symbol) => {
    symbol.textContent = randomSymbol();
  });

  refs.spinButton.addEventListener("click", handleSpin);
  refs.betButtons.addEventListener("click", handleBetChange);
  refs.muteButton.addEventListener("click", handleMuteToggle);
  refs.resetButton.addEventListener("click", handleReset);

  renderStats();
  renderFeed();
  saveState();
}

boot();
