const STORAGE_KEY = "prompt-casino-state-v1";
const STARTING_STATE = {
  tokens: 120,
  totalWon: 0,
  spins: 0,
  bestWin: 0,
  confidence: 97,
};

const SYMBOLS = [
  { id: "token", glyph: "🪙", name: "Token Cache", weight: 22, triple: 7.5, double: 1.8 },
  { id: "robot", glyph: "🤖", name: "Regret Bot", weight: 20, triple: 5.2, double: 1.5 },
  { id: "prompt", glyph: "📝", name: "Prompt Soup", weight: 17, triple: 4.6, double: 1.4 },
  { id: "gpu", glyph: "🔥", name: "GPU Burn", weight: 13, triple: 9.5, double: 2.2 },
  { id: "error404", glyph: "404", name: "Not Found", weight: 11, triple: 12, double: 3 },
  {
    id: "hallucination",
    glyph: "🫠",
    name: "Hallucination",
    weight: 11,
    triple: 0,
    double: 0,
  },
  { id: "lawsuit", glyph: "⚖️", name: "Copyright Alarm", weight: 6, triple: 14, double: 2.8 },
];

const POSITIVE_ROASTS = [
  "The AI guessed correctly on the first try.",
  "For once, confidence matched reality.",
  "A miracle: no made-up API calls this spin.",
  "Your prompt engineering finally frightened the model into accuracy.",
  "The benchmark was cherry-picked, but you still got paid.",
];

const JACKPOT_ROASTS = [
  "The model stopped hallucinating long enough to print money.",
  "Three perfect outputs. Audit this immediately.",
  "You just found the one timeline where the AI is honest.",
  "All green checks, zero disclaimers, absurdly profitable.",
];

const NEGATIVE_ROASTS = [
  "Answer confidence: 99%. Accuracy: not detected.",
  "The model billed you for tokens and vibes.",
  "Your prompt was ignored with great enthusiasm.",
  "The AI wrote a heartfelt apology and still charged full price.",
  "Results may vary, mostly downward.",
];

const reels = [...document.querySelectorAll(".reel")];
const tokenBalanceEl = document.querySelector("#token-balance");
const totalWonEl = document.querySelector("#total-won");
const spinCountEl = document.querySelector("#spin-count");
const bestWinEl = document.querySelector("#best-win");
const confidenceEl = document.querySelector("#confidence-readout");
const betRangeEl = document.querySelector("#bet-range");
const betDisplayEl = document.querySelector("#bet-display");
const spinBtn = document.querySelector("#spin-btn");
const resetBtn = document.querySelector("#reset-btn");
const statusEl = document.querySelector("#status");

const state = loadState();
let spinning = false;
let audioContext = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...STARTING_STATE };
    }
    const parsed = JSON.parse(raw);
    return {
      tokens: Number.isFinite(parsed.tokens) ? parsed.tokens : STARTING_STATE.tokens,
      totalWon: Number.isFinite(parsed.totalWon) ? parsed.totalWon : STARTING_STATE.totalWon,
      spins: Number.isFinite(parsed.spins) ? parsed.spins : STARTING_STATE.spins,
      bestWin: Number.isFinite(parsed.bestWin) ? parsed.bestWin : STARTING_STATE.bestWin,
      confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : STARTING_STATE.confidence,
    };
  } catch {
    return { ...STARTING_STATE };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function weightedPick() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    roll -= symbol.weight;
    if (roll <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[0];
}

function setReel(index, symbol) {
  const reel = reels[index];
  if (!reel) {
    return;
  }

  const symbolEl = reel.querySelector("[data-symbol]");
  const nameEl = reel.querySelector("[data-name]");

  symbolEl.textContent = symbol.glyph;
  nameEl.textContent = symbol.name;
}

function updateBetBounds() {
  const affordableMax = Math.floor(Math.min(40, state.tokens) / 5) * 5;
  const maxBet = Math.max(5, affordableMax || 5);
  betRangeEl.max = String(maxBet);

  const nextBet = clamp(Number(betRangeEl.value), 5, maxBet);
  betRangeEl.value = String(nextBet);
  betDisplayEl.textContent = String(nextBet);
}

function setStatus(message, tone = "") {
  statusEl.textContent = message;
  statusEl.className = "status";
  if (tone) {
    statusEl.classList.add(tone);
  }
}

function render() {
  tokenBalanceEl.textContent = String(state.tokens);
  totalWonEl.textContent = String(state.totalWon);
  spinCountEl.textContent = String(state.spins);
  bestWinEl.textContent = String(state.bestWin);
  confidenceEl.textContent = `AI confidence: ${state.confidence}% sure this will work.`;

  updateBetBounds();

  const bet = Number(betRangeEl.value);
  spinBtn.disabled = spinning || state.tokens < bet;
}

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
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

function playTone(freq, startAt, duration, type, volume) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = freq;
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function playSpinSound() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const start = ctx.currentTime;
  playTone(220, start, 0.08, "square", 0.03);
  playTone(180, start + 0.09, 0.08, "square", 0.028);
  playTone(140, start + 0.18, 0.1, "square", 0.03);
}

function playWinSound(isJackpot) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const start = ctx.currentTime;
  const notes = isJackpot ? [392, 523.25, 659.25, 783.99] : [330, 392, 523.25];
  notes.forEach((note, i) => {
    playTone(note, start + i * 0.08, 0.14, "triangle", isJackpot ? 0.055 : 0.04);
  });
}

function playLoseSound() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const start = ctx.currentTime;
  playTone(130, start, 0.18, "sawtooth", 0.03);
  playTone(92, start + 0.1, 0.24, "sawtooth", 0.026);
}

function buzz(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function scoreSpin(results, bet) {
  const ids = results.map((symbol) => symbol.id);
  const countById = {};
  ids.forEach((id) => {
    countById[id] = (countById[id] || 0) + 1;
  });

  const topEntry = Object.entries(countById).sort((a, b) => b[1] - a[1])[0];
  const [topId, topCount] = topEntry;
  let payout = 0;
  let penalty = 0;
  let tone = "lose";
  let reelIndexes = [];
  let message = pickRandom(NEGATIVE_ROASTS);

  if (topCount === 3) {
    reelIndexes = [0, 1, 2];

    if (topId === "hallucination") {
      penalty = Math.ceil(bet * 0.7);
      message = `Triple Hallucination. The AI charged a fantasy fee of ${penalty} tokens.`;
      tone = "lose";
      return { payout, penalty, tone, reelIndexes, message };
    }

    const symbol = results[0];
    payout = Math.round(bet * symbol.triple);
    tone = payout >= bet * 10 ? "jackpot" : "win";
    const roast = tone === "jackpot" ? pickRandom(JACKPOT_ROASTS) : pickRandom(POSITIVE_ROASTS);
    message = `${roast} +${payout} tokens.`;
    return { payout, penalty, tone, reelIndexes, message };
  }

  if (topCount === 2) {
    reelIndexes = ids
      .map((id, index) => (id === topId ? index : null))
      .filter((index) => index !== null);

    if (topId === "hallucination") {
      penalty = Math.ceil(bet * 0.45);
      message = `Double Hallucination. Context-window cleanup cost ${penalty} tokens.`;
      tone = "lose";
      return { payout, penalty, tone, reelIndexes, message };
    }

    const pairSymbol = results.find((symbol) => symbol.id === topId);
    payout = Math.round(bet * pairSymbol.double);
    tone = payout >= bet * 2.5 ? "win" : "win";
    message = `${pickRandom(POSITIVE_ROASTS)} +${payout} tokens.`;
    return { payout, penalty, tone, reelIndexes, message };
  }

  if (ids.includes("hallucination")) {
    penalty = Math.ceil(bet * 0.2);
    message = `No match. Hallucination tax: ${penalty} tokens.`;
  }

  return { payout, penalty, tone, reelIndexes, message };
}

function clearReelHighlights() {
  reels.forEach((reel) => reel.classList.remove("win"));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function spin() {
  if (spinning) {
    return;
  }

  const bet = Number(betRangeEl.value);
  if (state.tokens < bet) {
    setStatus("You are out of tokens. The AI recommends a paid upgrade.", "lose");
    playLoseSound();
    buzz([60, 40, 60]);
    return;
  }

  spinning = true;
  clearReelHighlights();
  spinBtn.disabled = true;
  resetBtn.disabled = true;
  betRangeEl.disabled = true;

  state.tokens -= bet;
  state.spins += 1;
  state.confidence = Math.floor(Math.random() * 25) + 75;
  render();

  setStatus(`Generating answer with ${bet} tokens...`, "");
  playSpinSound();

  const finalResults = [weightedPick(), weightedPick(), weightedPick()];
  const spinDurations = [880, 1180, 1480];

  reels.forEach((reel, index) => {
    reel.classList.add("spinning");
    const ticker = setInterval(() => {
      const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      setReel(index, randomSymbol);
    }, 85 + index * 12);

    setTimeout(() => {
      clearInterval(ticker);
      reel.classList.remove("spinning");
      setReel(index, finalResults[index]);
    }, spinDurations[index]);
  });

  await wait(Math.max(...spinDurations) + 70);

  const result = scoreSpin(finalResults, bet);

  if (result.reelIndexes.length > 0 && result.payout > 0) {
    result.reelIndexes.forEach((idx) => reels[idx].classList.add("win"));
  }

  state.tokens = Math.max(0, state.tokens + result.payout - result.penalty);
  state.totalWon += result.payout;
  state.bestWin = Math.max(state.bestWin, result.payout);

  if (result.tone === "jackpot") {
    playWinSound(true);
    buzz([120, 50, 120, 50, 120]);
  } else if (result.tone === "win") {
    playWinSound(false);
    buzz([70, 40, 70]);
  } else {
    playLoseSound();
    buzz([45]);
  }

  setStatus(result.message, result.tone);

  if (state.tokens === 0) {
    setStatus(`${result.message} Wallet empty. The AI says "try vibes".`, "lose");
  }

  saveState();
  render();

  spinning = false;
  spinBtn.disabled = state.tokens < Number(betRangeEl.value);
  resetBtn.disabled = false;
  betRangeEl.disabled = false;

  await wait(720);
  clearReelHighlights();
}

function resetState() {
  if (!window.confirm("Reset your wallet and all stats?")) {
    return;
  }

  Object.assign(state, STARTING_STATE);
  saveState();
  clearReelHighlights();
  setStatus("Wallet reset. The AI swears this time it has learned.", "");
  reels.forEach((_, idx) => setReel(idx, weightedPick()));
  render();
}

betRangeEl.addEventListener("input", () => {
  betDisplayEl.textContent = betRangeEl.value;
  render();
});

spinBtn.addEventListener("click", spin);
resetBtn.addEventListener("click", resetState);

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space") {
    return;
  }

  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "BUTTON") {
    return;
  }

  event.preventDefault();
  spin();
});

reels.forEach((_, idx) => setReel(idx, weightedPick()));
render();
saveState();
