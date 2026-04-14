const SYMBOLS = ["🤖", "🧠", "💸", "🪙", "📉", "🔥", "🛠️", "🧾"];
const WIN_TABLE = {
  "🤖🤖🤖": 220,
  "🧠🧠🧠": 180,
  "💸💸💸": 140,
  "🪙🪙🪙": 100,
  "📉📉📉": 55,
  "🔥🔥🔥": 35,
  "🛠️🛠️🛠️": 80,
  "🧾🧾🧾": 65
};

const START_TOKENS = 500;
const SPIN_COST = 25;
const STORAGE_KEY = "token_tornado_wallet_v1";
const FEED_LINES = [
  "Latency as a service: premium delay package enabled.",
  "Hallucination feature flagged as 'creative mode'.",
  "Prompt detected: sincerity. Response style: marketing deck.",
  "Your context window sent to /dev/null for optimization.",
  "GPU says no. Billing says yes.",
  "Token burn accepted. Wisdom may arrive in 3-5 business days.",
  "Fine-tuned on vibes and quarterly earnings calls."
];

const tokensEl = document.getElementById("tokens");
const costEl = document.getElementById("cost");
const profitEl = document.getElementById("profit");
const resultEl = document.getElementById("result");
const feedListEl = document.getElementById("feedList");
const spinBtn = document.getElementById("spinBtn");
const resetBtn = document.getElementById("resetBtn");
const reels = [...document.querySelectorAll(".reel")];

let state = loadState();
let spinning = false;

costEl.textContent = SPIN_COST.toString();
render();
seedFeed();

spinBtn.addEventListener("click", spin);
resetBtn.addEventListener("click", resetWallet);

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { tokens: START_TOKENS, profit: 0 };
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.tokens === "number" && typeof parsed.profit === "number") {
      return parsed;
    }
  } catch (_) {
    // Fall back to defaults if storage is malformed.
  }
  return { tokens: START_TOKENS, profit: 0 };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  tokensEl.textContent = state.tokens.toString();
  profitEl.textContent = state.profit.toString();
  profitEl.className = state.profit >= 0 ? "win" : "lose";
  spinBtn.disabled = state.tokens < SPIN_COST || spinning;
}

function addFeedLine(text) {
  const li = document.createElement("li");
  li.textContent = text;
  feedListEl.prepend(li);
  while (feedListEl.children.length > 6) {
    feedListEl.removeChild(feedListEl.lastChild);
  }
}

function seedFeed() {
  for (let i = 0; i < 3; i += 1) {
    addFeedLine(FEED_LINES[(i * 2) % FEED_LINES.length]);
  }
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

async function spin() {
  if (spinning || state.tokens < SPIN_COST) {
    return;
  }

  spinning = true;
  state.tokens -= SPIN_COST;
  state.profit -= SPIN_COST;
  render();
  vibrate([20, 20, 20]);
  tone(140, 0.05);

  reels.forEach((reel) => reel.classList.add("spin"));
  spinBtn.disabled = true;
  resultEl.textContent = "Inference running... token meter screaming...";

  const final = [];
  for (let i = 0; i < reels.length; i += 1) {
    await wait(280 + i * 180);
    const symbol = randomSymbol();
    final.push(symbol);
    reels[i].textContent = symbol;
    reels[i].classList.remove("spin");
    tone(220 + i * 60, 0.045);
  }

  const key = final.join("");
  const win = WIN_TABLE[key] || evaluatePartial(final);
  if (win > 0) {
    state.tokens += win;
    state.profit += win;
    resultEl.textContent = `Jackpot-ish: ${key} paid ${win} tokens.`;
    addFeedLine(`Model says: "Great result." Invoice: +${win} tokens.`);
    vibrate([60, 20, 80]);
    tone(520, 0.12);
  } else {
    resultEl.textContent = `${key} produced no value. Confidence remains 99.9%.`;
    addFeedLine(FEED_LINES[Math.floor(Math.random() * FEED_LINES.length)]);
  }

  persist();
  spinning = false;
  render();
}

function evaluatePartial(final) {
  const [a, b, c] = final;
  if (a === b || b === c || a === c) {
    return 20;
  }
  if (final.includes("💸") && final.includes("📉")) {
    return 5;
  }
  return 0;
}

function resetWallet() {
  state = { tokens: START_TOKENS, profit: 0 };
  reels[0].textContent = "🤖";
  reels[1].textContent = "🧠";
  reels[2].textContent = "💸";
  resultEl.textContent = "Wallet reset. VC funding round complete.";
  addFeedLine("Fresh capital deployed. Burn rate fully restored.");
  persist();
  render();
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function tone(freq, duration) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = tone.ctx || (tone.ctx = new AudioCtx());
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.value = 0.02;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
